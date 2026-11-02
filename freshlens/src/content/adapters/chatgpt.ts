import { type SiteAdapter } from "./types";
import { SELECTORS } from "./selectors";

export class ChatGPTAdapter implements SiteAdapter {
  id = "chatgpt";
  name = "ChatGPT";

  matches(url: string): boolean {
    return url.includes("chatgpt.com") || url.includes("chat.openai.com");
  }

  findAssistantMessages(root: ParentNode): HTMLElement[] {
    for (const selector of SELECTORS.chatgpt.messages) {
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
      if (nodes.length > 0) {
        return nodes;
      }
    }
    return [];
  }

  messageId(el: HTMLElement): string {
    const turnEl = el.closest('[data-testid^="conversation-turn"]');
    if (turnEl) {
      const testId = turnEl.getAttribute("data-testid");
      if (testId) return testId;
    }
    const msgId = el.getAttribute("data-message-id");
    if (msgId) return msgId;

    // Stable hash fallback from element text position
    return `cg_${el.innerText.slice(0, 30).replace(/\s+/g, "_")}`;
  }

  isStreaming(el: HTMLElement): boolean {
    for (const selector of SELECTORS.chatgpt.streaming) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    return el.classList.contains("result-streaming");
  }

  getInputBox(): HTMLElement | null {
    for (const selector of SELECTORS.chatgpt.inputBox) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) return el;
    }
    return null;
  }

  insertPrompt(text: string): boolean {
    const input = this.getInputBox();
    if (!input) return false;

    input.focus();

    if (input instanceof HTMLTextAreaElement) {
      const prev = input.value;
      input.value = prev ? `${prev}\n\n${text}` : text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    // Contenteditable / ProseMirror element
    try {
      // Modern beforeinput / execCommand insertion
      const inserted = document.execCommand("insertText", false, text);
      if (!inserted) {
        input.innerText = text;
      }
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return true;
    } catch {
      input.innerText = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
  }

  getAnchorForOverlay(el: HTMLElement): HTMLElement {
    // Look for button action bar at bottom of turn
    const turn = el.closest("article") || el;
    const actions = turn.querySelector<HTMLElement>(".flex.justify-between, .flex.items-center");
    return actions || el;
  }
}
