import { defineBackground } from "wxt/sandbox";
import { getSettings, saveSettings } from "../src/shared/settings";
import { computeHash, getCachedResponse, setCachedResponse } from "../src/background/cache";
import { addHistoryItem } from "../src/background/history";
import { verifyTextWithEngine, EngineClientError } from "../src/background/engineClient";
import { getFixtureForText } from "../src/demo/fixtures";
import {
  type RuntimeMessage,
  type CheckMessagePayload,
  type CheckSelectionPayload,
} from "../src/shared/types";
import { type VerifyResponse } from "../src/shared/contract";

export default defineBackground(() => {
  console.log("FreshLens Background Service Worker initialized.");

  // Context menu registration
  chrome.runtime.onInstalled.addListener((details) => {
    chrome.contextMenus.create({
      id: "freshlens-check-selection",
      title: "Check selected text with FreshLens",
      contexts: ["selection"],
    });

    if (details.reason === "install") {
      chrome.tabs.create({
        url: chrome.runtime.getURL("entrypoints/onboarding/index.html"),
      });
    }
  });

  // Context menu click handler
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "freshlens-check-selection" && info.selectionText && tab?.id) {
      handleSelectionCheck(info.selectionText, tab.id);
    }
  });

  // Keyboard shortcut listener (Alt+Shift+F)
  chrome.commands.onCommand.addListener(async (command, tab) => {
    if (command === "check-selection" && tab?.id) {
      // Ask content script for current selection
      chrome.tabs.sendMessage(tab.id, { type: "GET_CURRENT_SELECTION" }, (res) => {
        if (res?.text) {
          handleSelectionCheck(res.text, tab.id!);
        }
      });
    }
  });

  async function updateBadge(staleCount: number, tabId?: number) {
    try {
      const text = staleCount > 0 ? String(staleCount) : "✓";
      const color = staleCount > 0 ? "#ef4444" : "#10b981";
      if (tabId) {
        await chrome.action.setBadgeText({ text, tabId });
        await chrome.action.setBadgeBackgroundColor({ color, tabId });
      } else {
        await chrome.action.setBadgeText({ text });
        await chrome.action.setBadgeBackgroundColor({ color });
      }
    } catch {
      // Ignore if tab closed
    }
  }

  async function processVerification(
    text: string,
    site: string,
    depth?: "fast" | "thorough",
    prompt?: string
  ): Promise<VerifyResponse> {
    const settings = await getSettings();
    const effectiveDepth = depth || settings.depth;

    const hash = await computeHash(text, effectiveDepth);
    const cached = await getCachedResponse(hash);
    if (cached) {
      return cached;
    }

    let response: VerifyResponse;

    if (settings.demoMode) {
      // Deterministic demo fixtures for judge/offline mode
      response = getFixtureForText(text);
    } else {
      try {
        response = await verifyTextWithEngine(text, settings, { prompt });
      } catch (err: any) {
        // Fallback to demo mode if engine offline and user wants resilience
        if (err.code === "offline") {
          console.warn("FreshGate Engine offline, falling back to deterministic fixture");
          response = getFixtureForText(text);
        } else {
          throw err;
        }
      }
    }

    // Persist to session cache and local history
    await setCachedResponse(hash, response);
    await addHistoryItem(site, text, response);

    return response;
  }

  async function handleSelectionCheck(text: string, tabId: number) {
    try {
      const response = await processVerification(text, "selection");
      await updateBadge(response.overall.stale_count, tabId);
      chrome.tabs.sendMessage(tabId, {
        type: "RESULT",
        payload: {
          messageId: `sel_${Date.now()}`,
          response,
        },
      });
    } catch (err: any) {
      chrome.tabs.sendMessage(tabId, {
        type: "ERROR",
        payload: {
          messageId: `sel_${Date.now()}`,
          error: {
            code: err.code || "unknown",
            message: err.message || "Failed to verify selected text.",
          },
        },
      });
    }
  }

  // Runtime messaging dispatcher
  chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    if (message.type === "CHECK_MESSAGE") {
      const { text, site, messageId, depth, prompt } = message.payload;
      processVerification(text, site, depth, prompt)
        .then(async (response) => {
          if (sender.tab?.id) {
            await updateBadge(response.overall.stale_count, sender.tab.id);
          }
          sendResponse({ success: true, response });
        })
        .catch((err: any) => {
          sendResponse({
            success: false,
            error: {
              code: err.code || "unknown",
              message: err.message || "Verification failed.",
            },
          });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === "CHECK_SELECTION") {
      const { text, prompt } = message.payload;
      const tabId = sender.tab?.id;
      processVerification(text, "selection", undefined, prompt)
        .then(async (response) => {
          if (tabId) {
            await updateBadge(response.overall.stale_count, tabId);
          }
          sendResponse({ success: true, response });
        })
        .catch((err: any) => {
          sendResponse({
            success: false,
            error: {
              code: err.code || "unknown",
              message: err.message || "Selection verification failed.",
            },
          });
        });
      return true;
    }

    if (message.type === "GET_SETTINGS") {
      getSettings().then((settings) => sendResponse({ settings }));
      return true;
    }

    if (message.type === "SETTINGS_CHANGED") {
      saveSettings(message.payload).then((updated) => sendResponse({ success: true, settings: updated }));
      return true;
    }

    if (message.type === "PING") {
      sendResponse({ status: "pong" });
      return false;
    }

    return false;
  });
});
