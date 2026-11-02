package freshgate

import (
	"strings"
)

type FreshGateMode string

const (
	ModeOff     FreshGateMode = "off"
	ModeAsync   FreshGateMode = "async"
	ModeSync    FreshGateMode = "sync"
	ModeCorrect FreshGateMode = "correct"
)

type SkipReason string

const (
	ReasonNone       SkipReason = ""
	ReasonModeOff    SkipReason = "mode_off"
	ReasonTooShort   SkipReason = "too_short"
	ReasonEmpty      SkipReason = "empty_response"
	ReasonNonText    SkipReason = "non_text"
	ReasonToolCalls  SkipReason = "tool_calls_only"
	ReasonRecursive  SkipReason = "recursive_call"
)

func ResolveMode(headerVal string, defaultMode string) FreshGateMode {
	cleaned := strings.ToLower(strings.TrimSpace(headerVal))
	switch cleaned {
	case "off":
		return ModeOff
	case "async":
		return ModeAsync
	case "sync":
		return ModeSync
	case "correct":
		return ModeCorrect
	default:
		switch strings.ToLower(strings.TrimSpace(defaultMode)) {
		case "sync":
			return ModeSync
		case "correct":
			return ModeCorrect
		case "off":
			return ModeOff
		default:
			return ModeAsync
		}
	}
}

func ShouldSkip(mode FreshGateMode, headerMode string, textLen int, minChars int, isToolCall bool) (bool, SkipReason) {
	if strings.ToLower(strings.TrimSpace(headerMode)) == "off" {
		return true, ReasonRecursive
	}
	if mode == ModeOff {
		return true, ReasonModeOff
	}
	if isToolCall && textLen == 0 {
		return true, ReasonToolCalls
	}
	if textLen == 0 {
		return true, ReasonEmpty
	}
	if minChars > 0 && textLen < minChars {
		return true, ReasonTooShort
	}
	return false, ReasonNone
}
