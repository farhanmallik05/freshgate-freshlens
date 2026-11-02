import { type SiteAdapter } from "./adapters/types";
import { buildTextMap } from "./textmap";
import { getSettings } from "../shared/settings";

export type MessageCompletedCallback = (
  element: HTMLElement,
  messageId: string,
  plainText: string
) => void;

export class ConversationObserver {
  private adapter: SiteAdapter;
  private onMessageCompleted: MessageCompletedCallback;
  private observer: MutationObserver | null = null;
  private debounceTimers: Map<HTMLElement, NodeJS.Timeout> = new Map();
  private processedHashes: Set<string> = new Set();
  private isObserving = false;

  constructor(adapter: SiteAdapter, onMessageCompleted: MessageCompletedCallback) {
    this.adapter = adapter;
    this.onMessageCompleted = onMessageCompleted;
    this.hookNavigation();
  }

  public start(): void {
    if (this.isObserving) return;
    this.isObserving = true;

    this.observer = new MutationObserver(() => {
      this.scanMessages();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial scan
    this.scanMessages();
  }

  public stop(): void {
    this.isObserving = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private scanMessages(): void {
    const messages = this.adapter.findAssistantMessages(document.body);
    for (const msgEl of messages) {
      this.trackMessage(msgEl);
    }
  }

  private trackMessage(msgEl: HTMLElement): void {
    if (this.adapter.isStreaming(msgEl)) {
      // Message is still actively streaming tokens
      const existing = this.debounceTimers.get(msgEl);
      if (existing) {
        clearTimeout(existing);
        this.debounceTimers.delete(msgEl);
      }
      return;
    }

    // Reset debounce timer on new mutations
    const existing = this.debounceTimers.get(msgEl);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(msgEl);

      // Verify streaming didn't resume
      if (this.adapter.isStreaming(msgEl)) {
        return;
      }

      const settings = await getSettings();
      const { plainText } = buildTextMap(msgEl, settings.ignoreCodeBlocks);

      if (plainText.length < settings.minMessageLength) {
        return;
      }

      const msgId = this.adapter.messageId(msgEl);
      const hash = `${msgId}::${plainText.slice(0, 100)}::${plainText.length}`;

      if (this.processedHashes.has(hash)) {
        return; // Already checked this exact text
      }

      this.processedHashes.add(hash);
      this.onMessageCompleted(msgEl, msgId, plainText);
    }, 1200);

    this.debounceTimers.set(msgEl, timer);
  }

  private hookNavigation(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args: any[]) => {
      originalPushState.apply(history, args as any);
      window.dispatchEvent(new Event("freshlens-navigation"));
    };

    history.replaceState = (...args: any[]) => {
      originalReplaceState.apply(history, args as any);
      window.dispatchEvent(new Event("freshlens-navigation"));
    };

    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("freshlens-navigation"));
    });

    window.addEventListener("freshlens-navigation", () => {
      setTimeout(() => {
        this.scanMessages();
      }, 500);
    });
  }
}
