import { defineContentScript } from "wxt/sandbox";
import { resolveAdapter } from "../src/content/adapters";
import { ConversationObserver } from "../src/content/observer";
import { buildTextMap } from "../src/content/textmap";
import { anchorClaim } from "../src/content/anchor";
import { Highlighter } from "../src/content/highlighter";
import { mountOverlay, type MountHandle } from "../src/content/overlay/mount";
import { getSettings } from "../src/shared/settings";
import { type VerifyResponse } from "../src/shared/contract";
import { type ExtensionSettings } from "../src/shared/types";

export default defineContentScript({
  matches: [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "http://localhost:*/*",
    "http://127.0.0.1:*/*",
  ],
  runAt: "document_idle",
  main() {
    console.log("FreshLens Content Script active on:", window.location.href);

    const adapter = resolveAdapter(window.location.href);
    const trackedMessages = new Map<
      string,
      {
        highlighter: Highlighter;
        mountHandle: MountHandle;
        plainText: string;
      }
    >();

    async function shouldAutoCheck(settings: ExtensionSettings, siteId: string): Promise<boolean> {
      if (siteId === "chatgpt") return settings.autoCheck.chatgpt;
      if (siteId === "claude") return settings.autoCheck.claude;
      if (siteId === "demo") return settings.autoCheck.demo;
      return true;
    }

    async function executeVerification(
      msgEl: HTMLElement,
      msgId: string,
      plainText: string,
      mountHandle: MountHandle,
      highlighter: Highlighter
    ) {
      mountHandle.setState("checking");

      chrome.runtime.sendMessage(
        {
          type: "CHECK_MESSAGE",
          payload: {
            id: `req_${Date.now()}`,
            text: plainText,
            site: adapter.id,
            messageId: msgId,
          },
        },
        async (res) => {
          if (res?.success && res.response) {
            const response: VerifyResponse = res.response;
            mountHandle.setResult(response);

            // Re-extract fresh text map for anchoring
            const settings = await getSettings();
            const { textMap } = buildTextMap(msgEl, settings.ignoreCodeBlocks);

            // Anchor claims to DOM ranges
            const anchors = response.claims.map((cr) =>
              anchorClaim(cr.claim, plainText, textMap)
            );

            // Apply highlights
            highlighter.applyHighlights(anchors, response.claims);

            // Wire hover and click events
            highlighter.onHover((detail) => {
              mountHandle.setPopover(detail);
            });
          } else {
            mountHandle.setError(
              res?.error || {
                code: "unknown",
                message: "Verification failed.",
              }
            );
          }
        }
      );
    }

    const observer = new ConversationObserver(
      adapter,
      async (msgEl, msgId, plainText) => {
        if (trackedMessages.has(msgId)) return;

        const anchorEl = adapter.getAnchorForOverlay(msgEl);
        const highlighter = new Highlighter(msgEl);
        const settings = await getSettings();
        const auto = await shouldAutoCheck(settings, adapter.id);

        let handle: MountHandle;

        handle = mountOverlay(
          anchorEl,
          adapter,
          msgId,
          auto ? "checking" : "idle",
          () => executeVerification(msgEl, msgId, plainText, handle, highlighter),
          (claimId) => highlighter.scrollToClaim(claimId)
        );

        trackedMessages.set(msgId, {
          highlighter,
          mountHandle: handle,
          plainText,
        });

        if (auto) {
          executeVerification(msgEl, msgId, plainText, handle, highlighter);
        }
      }
    );

    observer.start();

    // Listen for requests from background/popup
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === "GET_CURRENT_SELECTION") {
        const text = window.getSelection()?.toString() || "";
        sendResponse({ text });
        return false;
      }
      return false;
    });
  },
});
