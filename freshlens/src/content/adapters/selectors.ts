export const SELECTORS = {
  chatgpt: {
    // Strategy 1: Data attributes on modern ChatGPT web (2024-2026)
    messages: [
      '[data-message-author-role="assistant"]',
      'article[data-testid^="conversation-turn"] [data-message-author-role="assistant"]',
      'article:has([data-message-author-role="assistant"])',
      'div.agent-turn',
    ],
    streaming: [
      'button[aria-label="Stop streaming"]',
      'button[aria-label="Stop generating"]',
      'button[data-testid="stop-button"]',
      '.result-streaming',
    ],
    inputBox: [
      '#prompt-textarea',
      'div[contenteditable="true"][data-placeholder]',
      'textarea[data-id="root"]',
      'form textarea',
    ],
  },
  claude: {
    // Strategy 1: Claude web interface selectors
    messages: [
      '[data-is-streaming="false"] .font-claude-message',
      '[data-test-render-count] .font-claude-message',
      'div.font-claude-message',
      'div[data-message-author="assistant"]',
      '.group:has(.font-claude-message)',
    ],
    streaming: [
      '[data-is-streaming="true"]',
      'button[aria-label="Stop response"]',
      'button[aria-label="Stop Generating"]',
      '.is-streaming',
    ],
    inputBox: [
      'div[contenteditable="true"][aria-label*="Write your prompt"]',
      'div.ProseMirror[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
      'textarea',
    ],
  },
  demo: {
    messages: ['[data-fl-role="assistant"]', '.fl-demo-assistant-message'],
    streaming: ['[data-fl-streaming="true"]', '.fl-streaming-indicator'],
    inputBox: ['[data-fl-input]', '#fl-demo-input', 'textarea'],
  },
};
