package freshgate

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestResolveMode(t *testing.T) {
	tests := []struct {
		header   string
		def      string
		expected FreshGateMode
	}{
		{"async", "sync", ModeAsync},
		{"sync", "async", ModeSync},
		{"correct", "async", ModeCorrect},
		{"off", "sync", ModeOff},
		{"OFF", "sync", ModeOff},
		{"", "correct", ModeCorrect},
		{"", "", ModeAsync},
		{"invalid", "sync", ModeSync},
	}

	for _, tt := range tests {
		got := ResolveMode(tt.header, tt.def)
		if got != tt.expected {
			t.Errorf("ResolveMode(%q, %q) = %q, want %q", tt.header, tt.def, got, tt.expected)
		}
	}
}

func TestShouldSkip(t *testing.T) {
	// Recursive call
	skip, reason := ShouldSkip(ModeAsync, "off", 200, 100, false)
	if !skip || reason != ReasonRecursive {
		t.Errorf("expected skip recursive call, got %v, %v", skip, reason)
	}

	// Mode off
	skip, reason = ShouldSkip(ModeOff, "", 200, 100, false)
	if !skip || reason != ReasonModeOff {
		t.Errorf("expected skip mode off, got %v, %v", skip, reason)
	}

	// Too short
	skip, reason = ShouldSkip(ModeAsync, "", 50, 100, false)
	if !skip || reason != ReasonTooShort {
		t.Errorf("expected skip too short, got %v, %v", skip, reason)
	}

	// Tool calls only
	skip, reason = ShouldSkip(ModeAsync, "", 0, 100, true)
	if !skip || reason != ReasonToolCalls {
		t.Errorf("expected skip tool calls, got %v, %v", skip, reason)
	}

	// Valid
	skip, reason = ShouldSkip(ModeAsync, "", 250, 100, false)
	if skip || reason != ReasonNone {
		t.Errorf("expected not skip, got %v, %v", skip, reason)
	}
}

func TestCacheControlDecisions(t *testing.T) {
	// Realtime prompt -> no-store
	decision := EvaluateCacheControl(true, "user1:prompt1", false, PromptClassification{
		Volatility: "realtime",
		NoStore:    true,
	})
	if !decision.SetNoStore {
		t.Errorf("expected SetNoStore to be true for realtime volatility")
	}

	// High volatility -> 3600s TTL
	ttl := 3600
	decisionHigh := EvaluateCacheControl(true, "user1:prompt2", false, PromptClassification{
		Volatility:         "high",
		SuggestedCacheTTLS: &ttl,
	})
	if !decisionHigh.ApplyTTL || decisionHigh.TTLSeconds != 3600 {
		t.Errorf("expected 3600s TTL for high volatility, got %v", decisionHigh)
	}

	// Client already sent explicit TTL -> do not override
	decisionClientTTL := EvaluateCacheControl(true, "user1:prompt3", true, PromptClassification{
		Volatility:         "high",
		SuggestedCacheTTLS: &ttl,
	})
	if decisionClientTTL.ApplyTTL {
		t.Errorf("expected client explicit TTL not to be overridden")
	}

	// No cache key -> pass-through
	decisionNoKey := EvaluateCacheControl(false, "", false, PromptClassification{
		Volatility:         "high",
		SuggestedCacheTTLS: &ttl,
	})
	if decisionNoKey.ApplyTTL || decisionNoKey.SetNoStore {
		t.Errorf("expected pass-through when no cache key is set")
	}
}

func TestCircuitBreaker(t *testing.T) {
	cb := NewCircuitBreaker(2, 1)

	if !cb.Allow() {
		t.Fatal("breaker should allow initially")
	}

	cb.RecordFailure()
	if !cb.Allow() {
		t.Fatal("breaker should allow after 1 failure with threshold 2")
	}

	cb.RecordFailure()
	// Now open
	if cb.Allow() {
		t.Fatal("breaker should block when open")
	}

	// Wait for open duration
	time.Sleep(1100 * time.Millisecond)

	// Half open probe
	if !cb.Allow() {
		t.Fatal("breaker should allow single probe after open duration")
	}

	// Probe succeeds
	cb.RecordSuccess()
	if !cb.Allow() {
		t.Fatal("breaker should be closed after success")
	}
}

func TestWorkerPoolDropOldest(t *testing.T) {
	// Fake engine server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	breaker := NewCircuitBreaker(5, 30)
	client := NewEngineClient(ts.URL, "secret", breaker)
	pool := NewWorkerPool(1, 2, client)
	defer pool.Close()

	// Fill queue with 5 jobs
	for i := 0; i < 5; i++ {
		pool.Enqueue(AsyncVerificationJob{
			ID: "job_" + string(rune('a'+i)),
			Payload: VerifyPayload{
				Text: "sample text",
			},
		})
	}

	_, dropped, _, _ := pool.Stats()
	if dropped == 0 {
		t.Errorf("expected some jobs to be dropped when queue capacity is exceeded")
	}
}

func TestApplyCorrectionDeepCopy(t *testing.T) {
	originalJSON := []byte(`{"id":"chatcmpl-123","choices":[{"index":0,"message":{"role":"assistant","content":"Original text without correction"}}]}`)
	correctedText := "Original text without correction\n\n---\n**Freshness check (FreshGate):** 1 claim(s) may be outdated.\n- ~~Original text~~ -> New verified text (docs.com, 2026-11-01)"

	modifiedBytes, err := ApplyCorrectionToResponseBody(originalJSON, correctedText)
	if err != nil {
		t.Fatalf("failed to apply correction: %v", err)
	}

	// Verify modified content
	var modifiedMap map[string]interface{}
	json.Unmarshal(modifiedBytes, &modifiedMap)
	choices := modifiedMap["choices"].([]interface{})
	c0 := choices[0].(map[string]interface{})
	msg := c0["message"].(map[string]interface{})
	if !strings.Contains(msg["content"].(string), "Freshness check (FreshGate)") {
		t.Errorf("modified body did not contain correction block")
	}

	// Verify original bytes remain untouched
	if strings.Contains(string(originalJSON), "Freshness check (FreshGate)") {
		t.Errorf("original json was mutated!")
	}
}

func TestPluginEndToEndSync(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/verify" {
			resp := VerifyResponseData{
				ID:        "vrf_123",
				Status:    "completed",
				LatencyMS: 85,
			}
			resp.Overall.Score = 92
			resp.Overall.Band = "fresh"
			resp.Overall.ClaimsTotal = 1
			resp.Overall.ClaimsChecked = 1
			resp.Overall.StaleCount = 0
			json.NewEncoder(w).Encode(resp)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	cfg := Config{
		EngineURL:   ts.URL,
		DefaultMode: "sync",
		TimeoutMS:   2000,
		MinChars:    20,
	}
	cfgBytes, _ := json.Marshal(cfg)

	plugin := NewFreshGatePlugin()
	if err := plugin.Init(cfgBytes); err != nil {
		t.Fatalf("plugin init failed: %v", err)
	}
	defer plugin.Cleanup()

	reqHeaders := map[string]string{
		"x-freshgate-mode": "sync",
	}
	respBody := []byte(`{"id":"chat-1","choices":[{"index":0,"message":{"role":"assistant","content":"This is a sufficiently long response text containing claims."}}]}`)

	res := plugin.ProcessPostResponse(
		context.Background(),
		reqHeaders,
		nil,
		map[string]string{},
		respBody,
		"gpt-4o",
		"openai",
	)

	if res.Status != "completed" {
		t.Errorf("expected completed status, got %s", res.Status)
	}
	if res.ResponseHeaders["x-freshgate-score"] != "92" {
		t.Errorf("expected score 92, got %s", res.ResponseHeaders["x-freshgate-score"])
	}
	if res.ResponseHeaders["x-freshgate-band"] != "fresh" {
		t.Errorf("expected band fresh, got %s", res.ResponseHeaders["x-freshgate-band"])
	}
}

type ClassifyVector struct {
	ID       string `json:"id"`
	Prompt   string `json:"prompt"`
	Expected string `json:"expected"`
}

func TestClassifyVectors(t *testing.T) {
	rulesPath := "../../shared/volatility-rules.json"
	vectorsPath := "../../shared/fixtures/classify-vectors.json"

	classifier, err := LoadRules(rulesPath)
	if err != nil {
		t.Skipf("skipping vectors test if shared rules not accessible: %v", err)
		return
	}

	data, err := os.ReadFile(vectorsPath)
	if err != nil {
		t.Skipf("skipping vectors test if vectors file not accessible: %v", err)
		return
	}

	var vectors []ClassifyVector
	if err := json.Unmarshal(data, &vectors); err != nil {
		t.Fatalf("failed to parse vectors: %v", err)
	}

	matched := 0
	for _, v := range vectors {
		res := classifier.Classify(v.Prompt)
		if (v.Expected == "realtime" || v.Expected == "static") && res.Volatility != v.Expected {
			t.Errorf("[%s] prompt %q: expected %s, got %s (must be 100%% exact on realtime/static)",
				v.ID, v.Prompt, v.Expected, res.Volatility)
		}
		if res.Volatility == v.Expected {
			matched++
		}
	}

	accuracy := float64(matched) / float64(len(vectors))
	if accuracy < 0.95 {
		t.Errorf("expected >= 95%% accuracy, got %.2f%% (%d/%d)", accuracy*100, matched, len(vectors))
	}
}
