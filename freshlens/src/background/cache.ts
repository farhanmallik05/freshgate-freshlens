import { type VerifyResponse } from "../shared/contract";

interface CacheEntry {
  hash: string;
  response: VerifyResponse;
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 100;
const SESSION_CACHE_KEY = "freshlens_session_cache";

// In-memory fallback if chrome.storage.session is unavailable
const memoryCache = new Map<string, CacheEntry>();

export async function computeHash(text: string, depth: string = "fast"): Promise<string> {
  const input = `${text.trim()}::${depth}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Simple non-crypto fallback for test runners without subtle crypto
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

async function loadEntries(): Promise<CacheEntry[]> {
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      const data = await chrome.storage.session.get(SESSION_CACHE_KEY);
      return data[SESSION_CACHE_KEY] || [];
    } catch {
      // Fallback to memory
    }
  }
  return Array.from(memoryCache.values());
}

async function saveEntries(entries: CacheEntry[]): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      await chrome.storage.session.set({ [SESSION_CACHE_KEY]: entries });
      return;
    } catch {
      // Fallback
    }
  }
  memoryCache.clear();
  for (const entry of entries) {
    memoryCache.set(entry.hash, entry);
  }
}

export async function getCachedResponse(
  hash: string,
  bypass = false
): Promise<VerifyResponse | null> {
  if (bypass) return null;

  const entries = await loadEntries();
  const index = entries.findIndex((e) => e.hash === hash);
  if (index === -1) return null;

  const entry = entries[index];
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    // Expired
    entries.splice(index, 1);
    await saveEntries(entries);
    return null;
  }

  // LRU bump to end
  entries.splice(index, 1);
  entries.push({ ...entry, timestamp: Date.now() });
  await saveEntries(entries);

  return entry.response;
}

export async function setCachedResponse(
  hash: string,
  response: VerifyResponse
): Promise<void> {
  let entries = await loadEntries();

  // Remove existing if present
  entries = entries.filter((e) => e.hash !== hash);

  // Evict oldest if exceeding max entries
  while (entries.length >= MAX_CACHE_ENTRIES) {
    entries.shift();
  }

  entries.push({
    hash,
    response,
    timestamp: Date.now(),
  });

  await saveEntries(entries);
}

export async function clearCache(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      await chrome.storage.session.remove(SESSION_CACHE_KEY);
    } catch {
      // Ignore
    }
  }
  memoryCache.clear();
}
