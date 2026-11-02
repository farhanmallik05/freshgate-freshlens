import { type VerifyResponse } from "../shared/contract";
import { type HistoryItem } from "../shared/types";
import { getSettings } from "../shared/settings";

const HISTORY_KEY = "freshlens_history";

export async function getHistory(): Promise<HistoryItem[]> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return [];
  }
  try {
    const data = await chrome.storage.local.get(HISTORY_KEY);
    return data[HISTORY_KEY] || [];
  } catch (err) {
    console.warn("Failed to load history:", err);
    return [];
  }
}

export async function addHistoryItem(
  site: string,
  fullText: string,
  response: VerifyResponse
): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return;
  }
  const settings = await getSettings();
  let history = await getHistory();

  const item: HistoryItem = {
    id: response.id || `hist_${Date.now()}`,
    timestamp: response.created_at || new Date().toISOString(),
    site,
    sampleText: fullText.length > 500 ? `${fullText.slice(0, 497)}...` : fullText,
    overall: {
      score: response.overall.score,
      band: response.overall.band,
      staleCount: response.overall.stale_count,
      totalClaims: response.overall.claims_total,
    },
    claims: response.claims,
  };

  history.unshift(item);

  if (history.length > settings.historySize) {
    history = history.slice(0, settings.historySize);
  }

  await chrome.storage.local.set({ [HISTORY_KEY]: history });
}

export async function clearHistory(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.remove(HISTORY_KEY);
  }
}

export async function removeHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [HISTORY_KEY]: filtered });
  }
}
