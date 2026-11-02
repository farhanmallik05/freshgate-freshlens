package freshgate

import (
	"fmt"
	"strconv"
)

type CacheDecision struct {
	ApplyTTL     bool
	TTLSeconds   int
	SetNoStore   bool
	CacheKey     string
	Volatility   string
}

// EvaluateCacheControl decides whether to inject x-bf-cache-ttl and x-bf-cache-no-store
func EvaluateCacheControl(
	hasCacheKey bool,
	cacheKey string,
	hasClientTTL bool,
	classification PromptClassification,
) CacheDecision {
	decision := CacheDecision{
		CacheKey:   cacheKey,
		Volatility: classification.Volatility,
	}

	// Only apply if the request has an explicit cache key (opt-in per Bifrost SPEC)
	if !hasCacheKey || cacheKey == "" {
		return decision
	}

	if classification.NoStore || classification.Volatility == "realtime" {
		decision.SetNoStore = true
		return decision
	}

	// Only set TTL if client did not supply one explicitly
	if !hasClientTTL && classification.SuggestedCacheTTLS != nil {
		decision.ApplyTTL = true
		decision.TTLSeconds = *classification.SuggestedCacheTTLS
	}

	return decision
}

func (d CacheDecision) Headers() map[string]string {
	headers := make(map[string]string)
	if d.SetNoStore {
		headers["x-bf-cache-no-store"] = "true"
	} else if d.ApplyTTL && d.TTLSeconds > 0 {
		headers["x-bf-cache-ttl"] = strconv.Itoa(d.TTLSeconds)
	}
	return headers
}

func (d CacheDecision) String() string {
	if d.SetNoStore {
		return fmt.Sprintf("no-store (volatility: %s)", d.Volatility)
	}
	if d.ApplyTTL {
		return fmt.Sprintf("ttl=%ds (volatility: %s)", d.TTLSeconds, d.Volatility)
	}
	return "pass-through"
}
