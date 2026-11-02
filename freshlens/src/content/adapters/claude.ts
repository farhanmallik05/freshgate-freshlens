import { type SiteAdapter } from "./types";
import { SELECTORS } from "./selectors";

export class ClaudeAdapter implements SiteAdapter {
  id = "claude";
  name = "Claude";

  matches(url: string): boolean {
    return url.includes("claude.ai");
  }

  findAssistantMessages(root: ParentNode): HTMLElement[] {
    for (const selector of SELECTORS.claude.messages) {
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
      if (nodes.length > 0) {
        return nodes;
      }
    }
    return [];
  }

  messageId(el: HTMLElement): string {
    const parentContainer = el.closest("[data-test-render-count]");
    if (parentContainer) {
      const id = parentContainer.getAttribute("data-test-render-count");
      if (id) return `claude_${id}`;
    }
    return `cl_${el.innerText.slice(0, 30).replace(/\s+/g, "_")}`;
  }

  isStreaming(el: HTMLElement): boolean {
    for (const selector of SELECTORS.claude.streaming) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    const container = el.closest('[data-is-streaming="true"]');
    return Boolean(container);
  }

  getInputBox(): HTMLElement | null {
    for (const selector of SELECTORS.claude.inputBox) {
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

    // ProseMirror / contenteditable
    try {
      const success = document.execCommand("insertText", false, text);
      if (!success) {
        input.textContent = text;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    } catch {
      input.textContent = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
  }

  getAnchorForOverlay(el: HTMLElement): HTMLElement {
    return el;
  }
}
