package freshgate

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
)

type CategoryRule struct {
	HalfLifeDays   *int    `json:"half_life_days"`
	ClaimCacheTTLS int     `json:"claim_cache_ttl_s"`
	TavilyTopic    *string `json:"tavily_topic"`
	TimeRange      *string `json:"time_range"`
	MaxAgeHours    *int    `json:"max_age_hours"`
	Regex          string  `json:"regex"`
	Meaning        string  `json:"meaning"`
}

type PromptVolatilityClass struct {
	SuggestedCacheTTLS *int   `json:"suggested_cache_ttl_s"`
	NoStore            bool   `json:"no_store"`
	Weight             int    `json:"weight"`
	CuesRegex          string `json:"cues_regex"`
}

type VolatilityRules struct {
	Version                 string                           `json:"version"`
	Categories              map[string]CategoryRule          `json:"categories"`
	PromptVolatilityClasses map[string]PromptVolatilityClass `json:"prompt_volatility_classes"`
}

type PromptClassification struct {
	Volatility         string   `json:"volatility"`
	SuggestedCacheTTLS *int     `json:"suggested_cache_ttl_s"`
	NoStore            bool     `json:"no_store"`
	MatchedCategories  []string `json:"matched_categories"`
}

type Classifier struct {
	Rules          VolatilityRules
	compiledClass  map[string]*regexp.Regexp
	compiledCat    map[string]*regexp.Regexp
}

func LoadRules(path string) (*Classifier, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read rules file at %s: %w", path, err)
	}

	var rules VolatilityRules
	if err := json.Unmarshal(data, &rules); err != nil {
		return nil, fmt.Errorf("failed to unmarshal rules: %w", err)
	}

	c := &Classifier{
		Rules:         rules,
		compiledClass: make(map[string]*regexp.Regexp),
		compiledCat:   make(map[string]*regexp.Regexp),
	}

	for class, rule := range rules.PromptVolatilityClasses {
		if rule.CuesRegex != "" {
			cleanPattern := strings.TrimPrefix(rule.CuesRegex, "(?i)")
			re, err := regexp.Compile("(?i)" + cleanPattern)
			if err == nil {
				c.compiledClass[class] = re
			}
		}
	}

	for cat, rule := range rules.Categories {
		if rule.Regex != "" {
			cleanPattern := strings.TrimPrefix(rule.Regex, "(?i)")
			re, err := regexp.Compile("(?i)" + cleanPattern)
			if err == nil {
				c.compiledCat[cat] = re
			}
		}
	}

	return c, nil
}

func (c *Classifier) Classify(prompt string) PromptClassification {
	text := strings.TrimSpace(prompt)

	var matchedCategories []string
	for cat, re := range c.compiledCat {
		if cat != "evergreen" && re.MatchString(text) {
			matchedCategories = append(matchedCategories, cat)
		}
	}

	// 1. Realtime match takes immediate precedence
	if re, ok := c.compiledClass["realtime"]; ok && re.MatchString(text) {
		rule := c.Rules.PromptVolatilityClasses["realtime"]
		return PromptClassification{
			Volatility:         "realtime",
			SuggestedCacheTTLS: rule.SuggestedCacheTTLS,
			NoStore:            rule.NoStore,
			MatchedCategories:  matchedCategories,
		}
	}

	isHigh := c.compiledClass["high"] != nil && c.compiledClass["high"].MatchString(text)
	isMed := c.compiledClass["medium"] != nil && c.compiledClass["medium"].MatchString(text)
	isLow := c.compiledClass["low"] != nil && c.compiledClass["low"].MatchString(text)
	isStatic := c.compiledClass["static"] != nil && c.compiledClass["static"].MatchString(text)

	selectedClass := "medium"

	if isHigh && !isMed {
		selectedClass = "high"
	} else if isMed && !isHigh {
		selectedClass = "medium"
	} else if isHigh && isMed {
		highMatches := len(c.compiledClass["high"].FindAllString(text, -1))
		medMatches := len(c.compiledClass["medium"].FindAllString(text, -1))
		if medMatches >= highMatches {
			selectedClass = "medium"
		} else {
			selectedClass = "high"
		}
	} else if isLow && !isStatic {
		selectedClass = "low"
	} else if isStatic && !isLow && !isHigh && !isMed {
		selectedClass = "static"
	} else if isLow && isStatic {
		selectedClass = "low"
	} else if isStatic {
		selectedClass = "static"
	}

	rule := c.Rules.PromptVolatilityClasses[selectedClass]
	return PromptClassification{
		Volatility:         selectedClass,
		SuggestedCacheTTLS: rule.SuggestedCacheTTLS,
		NoStore:            rule.NoStore,
		MatchedCategories:  matchedCategories,
	}
}
