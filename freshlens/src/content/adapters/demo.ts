import { type SiteAdapter } from "./types";
import { SELECTORS } from "./selectors";

export class DemoAdapter implements SiteAdapter {
  id = "demo";
  name = "Demo Chat";

  matches(url: string): boolean {
    return (
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("demo-chat") ||
      url.includes("freshlens") ||
      url.includes("vercel.app")
    );
  }

  findAssistantMessages(root: ParentNode): HTMLElement[] {
    for (const selector of SELECTORS.demo.messages) {
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
      if (nodes.length > 0) {
        return nodes;
      }
    }
    return [];
  }

  messageId(el: HTMLElement): string {
    return (
      el.getAttribute("data-fl-id") ||
      el.getAttribute("id") ||
      `demo_${el.innerText.slice(0, 24).replace(/\s+/g, "_")}`
    );
  }

  isStreaming(el: HTMLElement): boolean {
    if (el.getAttribute("data-fl-streaming") === "true") {
      return true;
    }
    for (const selector of SELECTORS.demo.streaming) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    return false;
  }

  getInputBox(): HTMLElement | null {
    for (const selector of SELECTORS.demo.inputBox) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) return el;
    }
    return null;
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

  getAnchorForOverlay(el: HTMLElement): HTMLElement {
    return el;
  }
}
