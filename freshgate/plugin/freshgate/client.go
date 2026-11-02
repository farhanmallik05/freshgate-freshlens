package freshgate

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

var (
	ErrCircuitOpen = errors.New("freshgate engine circuit breaker is open")
)

type CircuitState int

const (
	StateClosed CircuitState = iota
	StateHalfOpen
	StateOpen
)

type CircuitBreaker struct {
	mu           sync.Mutex
	failures     int
	threshold    int
	openDuration time.Duration
	state        CircuitState
	openedAt     time.Time
}

func NewCircuitBreaker(threshold int, openSeconds int) *CircuitBreaker {
	return &CircuitBreaker{
		threshold:    threshold,
		openDuration: time.Duration(openSeconds) * time.Second,
		state:        StateClosed,
	}
}

func (cb *CircuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	now := time.Now()
	if cb.state == StateOpen {
		if now.Sub(cb.openedAt) > cb.openDuration {
			cb.state = StateHalfOpen
			return true
		}
		return false
	}
	return true
}

func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failures = 0
	cb.state = StateClosed
}

func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failures++
	if cb.failures >= cb.threshold {
		cb.state = StateOpen
		cb.openedAt = time.Now()
	}
}

type EngineClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	breaker    *CircuitBreaker
}

func NewEngineClient(baseURL string, apiKey string, breaker *CircuitBreaker) *EngineClient {
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
	}

	return &EngineClient{
		baseURL: stringsTrimSlash(baseURL),
		apiKey:  apiKey,
		httpClient: &http.Client{
			Transport: transport,
		},
		breaker: breaker,
	}
}

func stringsTrimSlash(s string) string {
	for len(s) > 0 && s[len(s)-1] == '/' {
		s = s[:len(s)-1]
	}
	return s
}

type VerifyPayload struct {
	Text    string                 `json:"text"`
	Context map[string]interface{} `json:"context,omitempty"`
	Options map[string]interface{} `json:"options,omitempty"`
}

type ClaimItem struct {
	Claim struct {
		ID   string `json:"id"`
		Text string `json:"text"`
	} `json:"claim"`
	Verdict    string `json:"verdict"`
	Freshness  int    `json:"freshness"`
	Band       string `json:"band"`
	Correction string `json:"correction"`
}

type VerifyResponseData struct {
	ID            string      `json:"id"`
	Status        string      `json:"status"`
	CreatedAt     string      `json:"created_at"`
	LatencyMS     int         `json:"latency_ms"`
	CorrectedText string      `json:"corrected_text"`
	Overall       struct {
		Score             int    `json:"score"`
		Band              string `json:"band"`
		ClaimsTotal       int    `json:"claims_total"`
		ClaimsChecked     int    `json:"claims_checked"`
		StaleCount        int    `json:"stale_count"`
		UnverifiableCount int    `json:"unverifiable_count"`
	} `json:"overall"`
	Claims []ClaimItem `json:"claims"`
}

func (c *EngineClient) VerifySync(
	ctx context.Context,
	payload VerifyPayload,
	timeout time.Duration,
) (*VerifyResponseData, error) {
	if !c.breaker.Allow() {
		return nil, ErrCircuitOpen
	}

	reqBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(
		callCtx,
		http.MethodPost,
		c.baseURL+"/v1/verify",
		bytes.NewReader(reqBytes),
	)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.breaker.RecordFailure()
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		c.breaker.RecordFailure()
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("engine returned http %d: %s", resp.StatusCode, string(body))
	}

	var data VerifyResponseData
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		c.breaker.RecordFailure()
		return nil, err
	}

	c.breaker.RecordSuccess()
	return &data, nil
}

func (c *EngineClient) VerifyAsync(
	ctx context.Context,
	payload VerifyPayload,
) error {
	if !c.breaker.Allow() {
		return ErrCircuitOpen
	}

	reqBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	callCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(
		callCtx,
		http.MethodPost,
		c.baseURL+"/v1/verify/async",
		bytes.NewReader(reqBytes),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.breaker.RecordFailure()
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		c.breaker.RecordFailure()
		return fmt.Errorf("engine async returned http %d", resp.StatusCode)
	}

	c.breaker.RecordSuccess()
	return nil
}
