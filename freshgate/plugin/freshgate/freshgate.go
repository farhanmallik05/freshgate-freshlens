package freshgate

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/oklog/ulid/v2"
)

type FreshGatePlugin struct {
	mu            sync.RWMutex
	cfg           Config
	classifier    *Classifier
	client        *EngineClient
	breaker       *CircuitBreaker
	workerPool    *WorkerPool
	streamBuffers sync.Map // map[string]*StreamAccumulator
}

type StreamAccumulator struct {
	mu        sync.Mutex
	buf       bytes.Buffer
	model     string
	provider  string
	requestID string
	prompt    string
}

func NewFreshGatePlugin() *FreshGatePlugin {
	return &FreshGatePlugin{}
}

func (p *FreshGatePlugin) GetName() string {
	return "freshgate"
}

func (p *FreshGatePlugin) Init(rawConfig []byte) error {
	cfg, err := ParseConfig(rawConfig)
	if err != nil {
		return fmt.Errorf("freshgate plugin init failed: %w", err)
	}

	p.cfg = cfg

	// Initialize classifier
	classifier, err := LoadRules(cfg.RulesPath)
	if err != nil {
		// Log warning and fallback to default classifier rules if file path is relative/missing
		log.Printf("[freshgate] warning loading rules file %s: %v. Using fallback classifier.", cfg.RulesPath, err)
		classifier = &Classifier{
			compiledClass: make(map[string]*regexp.Regexp),
			compiledCat:   make(map[string]*regexp.Regexp),
		}
	}
	p.classifier = classifier

	// Circuit breaker and client
	p.breaker = NewCircuitBreaker(cfg.Breaker.Failures, cfg.Breaker.OpenS)
	p.client = NewEngineClient(cfg.EngineURL, cfg.EngineAPIKey, p.breaker)

	// Bounded async worker pool
	p.workerPool = NewWorkerPool(cfg.WorkerPool, cfg.QueueSize, p.client)

	log.Printf("[freshgate] initialized with config: %s", p.cfg.Masked())
	return nil
}

type regexpWrapper = struct{}

func GenerateULID() string {
	t := time.Now()
	entropy := ulid.Monotonic(rand.Reader, 0)
	id := ulid.MustNew(ulid.Timestamp(t), entropy)
	return fmt.Sprintf("fg_%s", strings.ToLower(id.String()))
}

// PreHook handles request inspection, volatility classification, and semantic cache TTL injection
func (p *FreshGatePlugin) ProcessPreRequest(
	headers map[string]string,
	body []byte,
) (modifiedHeaders map[string]string, fgID string, mode FreshGateMode, decision CacheDecision) {
	fgID = GenerateULID()
	modeHeader := headers["x-freshgate-mode"]
	mode = ResolveMode(modeHeader, p.cfg.DefaultMode)

	resHeaders := make(map[string]string)
	for k, v := range headers {
		resHeaders[strings.ToLower(k)] = v
	}
	resHeaders["x-freshgate-id"] = fgID

	if mode == ModeOff {
		resHeaders["x-freshgate-status"] = "off"
		return resHeaders, fgID, mode, decision
	}

	// Classify prompt volatility
	prompt := ExtractPrompt(body)
	var classification PromptClassification
	if p.classifier != nil {
		classification = p.classifier.Classify(prompt)
	} else {
		classification = PromptClassification{
			Volatility: "medium",
		}
	}

	cacheKey := resHeaders["x-bf-cache-key"]
	_, hasClientTTL := resHeaders["x-bf-cache-ttl"]

	decision = EvaluateCacheControl(cacheKey != "", cacheKey, hasClientTTL, classification)
	for k, v := range decision.Headers() {
		resHeaders[k] = v
	}

	return resHeaders, fgID, mode, decision
}

type VerificationResult struct {
	ResponseHeaders map[string]string
	ModifiedBody    []byte
	Status          string
}

// ProcessPostResponse handles response verification, scoring, and correction
func (p *FreshGatePlugin) ProcessPostResponse(
	ctx context.Context,
	reqHeaders map[string]string,
	reqBody []byte,
	respHeaders map[string]string,
	respBody []byte,
	model string,
	provider string,
) VerificationResult {
	outHeaders := make(map[string]string)
	for k, v := range respHeaders {
		outHeaders[k] = v
	}

	fgID := reqHeaders["x-freshgate-id"]
	if fgID == "" {
		fgID = GenerateULID()
	}
	outHeaders["x-freshgate-id"] = fgID

	mode := ResolveMode(reqHeaders["x-freshgate-mode"], p.cfg.DefaultMode)

	assistantText, isToolCall := ExtractAssistantText(respBody)
	skip, reason := ShouldSkip(
		mode,
		reqHeaders["x-freshgate-mode"],
		len(assistantText),
		p.cfg.MinChars,
		isToolCall,
	)

	if skip {
		outHeaders["x-freshgate-status"] = "skipped"
		if reason == ReasonRecursive || reason == ReasonModeOff {
			outHeaders["x-freshgate-status"] = "off"
		}
		return VerificationResult{
			ResponseHeaders: outHeaders,
			ModifiedBody:    respBody,
			Status:          outHeaders["x-freshgate-status"],
		}
	}

	// Prepare payload for engine
	prompt := ""
	if p.cfg.IncludePrompt {
		prompt = ExtractPrompt(reqBody)
	}

	contextMap := map[string]interface{}{
		"request_id":  fgID,
		"model":       model,
		"provider":    provider,
		"answered_at": time.Now().UTC().Format(time.RFC3339),
		"source":      "bifrost",
	}
	if prompt != "" {
		contextMap["prompt"] = prompt
	}
	if cutoff, ok := p.cfg.ModelCutoffs[model]; ok {
		contextMap["knowledge_cutoff"] = cutoff
	}

	optionsMap := map[string]interface{}{
		"max_claims": p.cfg.MaxClaims,
		"depth":      "fast",
	}
	if d := reqHeaders["x-freshgate-depth"]; d == "thorough" || d == "fast" {
		optionsMap["depth"] = d
	}
	if mc := reqHeaders["x-freshgate-max-claims"]; mc != "" {
		if val, err := strconv.Atoi(mc); err == nil && val > 0 && val <= 10 {
			optionsMap["max_claims"] = val
		}
	}

	payload := VerifyPayload{
		Text:    assistantText,
		Context: contextMap,
		Options: optionsMap,
	}

	// Mode execution
	switch mode {
	case ModeAsync:
		job := AsyncVerificationJob{
			Payload: payload,
			ID:      fgID,
		}
		p.workerPool.Enqueue(job)
		outHeaders["x-freshgate-status"] = "queued"
		return VerificationResult{
			ResponseHeaders: outHeaders,
			ModifiedBody:    respBody,
			Status:          "queued",
		}

	case ModeSync:
		timeout := time.Duration(p.cfg.TimeoutMS) * time.Millisecond
		data, err := p.client.VerifySync(ctx, payload, timeout)
		if err != nil {
			if errors.Is(err, ErrCircuitOpen) {
				outHeaders["x-freshgate-status"] = "breaker_open"
			} else if strings.Contains(err.Error(), "context deadline exceeded") {
				outHeaders["x-freshgate-status"] = "timeout"
				// Degrade to async queue
				p.workerPool.Enqueue(AsyncVerificationJob{Payload: payload, ID: fgID})
			} else {
				outHeaders["x-freshgate-status"] = "error"
			}
			return VerificationResult{
				ResponseHeaders: outHeaders,
				ModifiedBody:    respBody,
				Status:          outHeaders["x-freshgate-status"],
			}
		}

		outHeaders["x-freshgate-status"] = "completed"
		outHeaders["x-freshgate-score"] = strconv.Itoa(data.Overall.Score)
		outHeaders["x-freshgate-band"] = data.Overall.Band
		outHeaders["x-freshgate-stale-claims"] = strconv.Itoa(data.Overall.StaleCount)

		return VerificationResult{
			ResponseHeaders: outHeaders,
			ModifiedBody:    respBody,
			Status:          "completed",
		}

	case ModeCorrect:
		timeout := time.Duration(p.cfg.TimeoutMS) * time.Millisecond
		data, err := p.client.VerifySync(ctx, payload, timeout)
		if err != nil {
			if errors.Is(err, ErrCircuitOpen) {
				outHeaders["x-freshgate-status"] = "breaker_open"
			} else {
				outHeaders["x-freshgate-status"] = "error"
			}
			return VerificationResult{
				ResponseHeaders: outHeaders,
				ModifiedBody:    respBody,
				Status:          outHeaders["x-freshgate-status"],
			}
		}

		outHeaders["x-freshgate-status"] = "completed"
		outHeaders["x-freshgate-score"] = strconv.Itoa(data.Overall.Score)
		outHeaders["x-freshgate-band"] = data.Overall.Band
		outHeaders["x-freshgate-stale-claims"] = strconv.Itoa(data.Overall.StaleCount)

		// If no stale claims or no corrected text, return untouched copy
		if data.Overall.StaleCount == 0 || data.CorrectedText == "" {
			return VerificationResult{
				ResponseHeaders: outHeaders,
				ModifiedBody:    respBody,
				Status:          "completed",
			}
		}

		// Deep copy response body before mutating assistant content
		modifiedBody, err := ApplyCorrectionToResponseBody(respBody, data.CorrectedText)
		if err != nil {
			log.Printf("[freshgate] failed to apply correction to response: %v", err)
			return VerificationResult{
				ResponseHeaders: outHeaders,
				ModifiedBody:    respBody,
				Status:          "completed",
			}
		}

		return VerificationResult{
			ResponseHeaders: outHeaders,
			ModifiedBody:    modifiedBody,
			Status:          "completed",
		}

	default:
		outHeaders["x-freshgate-status"] = "skipped"
		return VerificationResult{
			ResponseHeaders: outHeaders,
			ModifiedBody:    respBody,
			Status:          "skipped",
		}
	}
}

// ApplyCorrectionToResponseBody deep-copies the response and replaces choice[0].message.content
func ApplyCorrectionToResponseBody(rawResp []byte, correctedText string) ([]byte, error) {
	var respMap map[string]interface{}
	if err := json.Unmarshal(rawResp, &respMap); err != nil {
		return nil, err
	}

	choices, ok := respMap["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		return rawResp, nil
	}

	choice0, ok := choices[0].(map[string]interface{})
	if !ok {
		return rawResp, nil
	}

	if msg, ok := choice0["message"].(map[string]interface{}); ok {
		msg["content"] = correctedText
	} else if _, ok := choice0["text"]; ok {
		choice0["text"] = correctedText
	}

	return json.Marshal(respMap)
}

func (p *FreshGatePlugin) Cleanup() {
	if p.workerPool != nil {
		p.workerPool.Close()
	}
}
