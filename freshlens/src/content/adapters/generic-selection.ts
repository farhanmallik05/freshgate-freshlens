import { type SiteAdapter } from "./types";

export class GenericSelectionAdapter implements SiteAdapter {
  id = "generic-selection";
  name = "Selection Mode";

  matches(): boolean {
    return true; // Fallback matches any URL
  }

  findAssistantMessages(): HTMLElement[] {
    return [];
  }

  messageId(): string {
    return `sel_${Date.now()}`;
  }

  isStreaming(): boolean {
    return false;
  }

  getInputBox(): HTMLElement | null {
    const active = document.activeElement;
    if (
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLInputElement ||
      active?.getAttribute("contenteditable") === "true"
    ) {
      return active as HTMLElement;
    }
    return document.querySelector<HTMLElement>("textarea, [contenteditable='true']");
  }

  insertPrompt(text: string): boolean {
    const input = this.getInputBox();
    if (!input) return false;
    input.focus();
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      const prev = input.value;
      input.value = prev ? `${prev}\n\n${text}` : text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    input.textContent = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  getAnchorForOverlay(): HTMLElement {
    return document.body;
  }
}
