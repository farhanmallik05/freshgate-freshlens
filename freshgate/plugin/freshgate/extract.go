package freshgate

import (
	"encoding/json"
	"strings"
)

type ChatMessagePart struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

type ChatMessage struct {
	Role    string          `json:"role"`
	Content json.RawMessage `json:"content"`
}

type ChatRequestBody struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Prompt   string        `json:"prompt"`
}

type ChatChoiceMessage struct {
	Role      string `json:"role"`
	Content   string `json:"content"`
	ToolCalls []any  `json:"tool_calls,omitempty"`
}

type ChatChoice struct {
	Index        int               `json:"index"`
	Message      ChatChoiceMessage `json:"message"`
	Text         string            `json:"text,omitempty"`
	FinishReason string            `json:"finish_reason"`
}

type ChatResponseBody struct {
	ID      string       `json:"id"`
	Model   string       `json:"model"`
	Choices []ChatChoice `json:"choices"`
}

// ExtractPrompt extracts the last user text from the request body
func ExtractPrompt(body []byte) string {
	if len(body) == 0 {
		return ""
	}

	var req ChatRequestBody
	if err := json.Unmarshal(body, &req); err != nil {
		return ""
	}

	if req.Prompt != "" {
		return strings.TrimSpace(req.Prompt)
	}

	for i := len(req.Messages) - 1; i >= 0; i-- {
		msg := req.Messages[i]
		if strings.ToLower(msg.Role) == "user" {
			// Try string content first
			var strContent string
			if err := json.Unmarshal(msg.Content, &strContent); err == nil {
				return strings.TrimSpace(strContent)
			}

			// Try array of content parts
			var parts []ChatMessagePart
			if err := json.Unmarshal(msg.Content, &parts); err == nil {
				var sb strings.Builder
				for _, p := range parts {
					if p.Type == "text" && p.Text != "" {
						if sb.Len() > 0 {
							sb.WriteString("\n")
						}
						sb.WriteString(p.Text)
					}
				}
				if sb.Len() > 0 {
					return strings.TrimSpace(sb.String())
				}
			}
		}
	}

	return ""
}

// ExtractAssistantText extracts the assistant message content from the response
func ExtractAssistantText(body []byte) (string, bool) {
	if len(body) == 0 {
		return "", false
	}

	var resp ChatResponseBody
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", false
	}

	if len(resp.Choices) == 0 {
		return "", false
	}

	choice := resp.Choices[0]
	isToolCall := len(choice.Message.ToolCalls) > 0

	if choice.Message.Content != "" {
		return choice.Message.Content, isToolCall
	}
	if choice.Text != "" {
		return choice.Text, isToolCall
	}

	return "", isToolCall
}
