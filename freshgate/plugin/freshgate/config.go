package freshgate

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
)

type BreakerConfig struct {
	Failures int `json:"failures"`
	OpenS    int `json:"open_s"`
}

type Config struct {
	EngineURL       string            `json:"engine_url"`
	EngineAPIKey    string            `json:"engine_api_key"`
	DefaultMode     string            `json:"default_mode"`
	TimeoutMS       int               `json:"timeout_ms"`
	MaxClaims       int               `json:"max_claims"`
	MinChars        int               `json:"min_chars"`
	WorkerPool      int               `json:"worker_pool"`
	QueueSize       int               `json:"queue_size"`
	Breaker         BreakerConfig     `json:"breaker"`
	CorrectionStyle string            `json:"correction_style"`
	ModelCutoffs    map[string]string `json:"model_cutoffs"`
	RulesPath       string            `json:"rules_path"`
	VerifyCacheHits bool              `json:"verify_cache_hits"`
	IncludePrompt   bool              `json:"include_prompt"`
}

func DefaultConfig() Config {
	return Config{
		EngineURL:       "http://engine:8787",
		DefaultMode:     "async",
		TimeoutMS:       4000,
		MaxClaims:       5,
		MinChars:        120,
		WorkerPool:      8,
		QueueSize:       256,
		Breaker: BreakerConfig{
			Failures: 5,
			OpenS:    30,
		},
		CorrectionStyle: "append",
		ModelCutoffs:    map[string]string{},
		RulesPath:       "shared/volatility-rules.json",
		VerifyCacheHits: true,
		IncludePrompt:   false,
	}
}

// resolveEnv resolves ${VAR_NAME} or $VAR_NAME from environment
func resolveEnv(val string) string {
	if strings.HasPrefix(val, "${") && strings.HasSuffix(val, "}") {
		varName := strings.TrimSuffix(strings.TrimPrefix(val, "${"), "}")
		return os.Getenv(varName)
	}
	if strings.HasPrefix(val, "$") {
		return os.Getenv(strings.TrimPrefix(val, "$"))
	}
	return val
}

func ParseConfig(raw []byte) (Config, error) {
	cfg := DefaultConfig()
	if len(raw) == 0 {
		return cfg, nil
	}

	if err := json.Unmarshal(raw, &cfg); err != nil {
		return cfg, fmt.Errorf("invalid json config: %w", err)
	}

	cfg.EngineURL = resolveEnv(cfg.EngineURL)
	cfg.EngineAPIKey = resolveEnv(cfg.EngineAPIKey)

	if cfg.EngineURL == "" {
		return cfg, errors.New("required field engine_url is empty")
	}

	switch cfg.DefaultMode {
	case "async", "sync", "correct", "off":
		// valid
	case "":
		cfg.DefaultMode = "async"
	default:
		return cfg, fmt.Errorf("invalid default_mode: %s", cfg.DefaultMode)
	}

	if cfg.TimeoutMS <= 0 {
		cfg.TimeoutMS = 4000
	}
	if cfg.MaxClaims <= 0 {
		cfg.MaxClaims = 5
	}
	if cfg.WorkerPool <= 0 {
		cfg.WorkerPool = 8
	}
	if cfg.QueueSize <= 0 {
		cfg.QueueSize = 256
	}
	if cfg.Breaker.Failures <= 0 {
		cfg.Breaker.Failures = 5
	}
	if cfg.Breaker.OpenS <= 0 {
		cfg.Breaker.OpenS = 30
	}

	return cfg, nil
}

func (c Config) Masked() string {
	copyCfg := c
	if copyCfg.EngineAPIKey != "" {
		copyCfg.EngineAPIKey = "******"
	}
	b, _ := json.Marshal(copyCfg)
	return string(b)
}
