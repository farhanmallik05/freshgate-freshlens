import { ExtensionSettingsSchema, type ExtensionSettings } from "./types";

export const DEFAULT_SETTINGS: ExtensionSettings = ExtensionSettingsSchema.parse({});

const STORAGE_KEY = "freshlens_settings";

export async function getSettings(): Promise<ExtensionSettings> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return DEFAULT_SETTINGS;
  }
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    if (!data[STORAGE_KEY]) {
      await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
      return DEFAULT_SETTINGS;
    }
    const result = ExtensionSettingsSchema.safeParse(data[STORAGE_KEY]);
    if (result.success) {
      return result.data;
    }
    // Migration: merge with defaults
    const migrated = ExtensionSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      ...data[STORAGE_KEY],
    });
    await chrome.storage.local.set({ [STORAGE_KEY]: migrated });
    return migrated;
  } catch (err) {
    console.warn("Failed to load settings from storage, using defaults:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(
  settings: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  const validated = ExtensionSettingsSchema.parse(merged);

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: validated });
    // Broadcast change
    try {
      chrome.runtime?.sendMessage?.({
        type: "SETTINGS_CHANGED",
        payload: validated,
      });
    } catch {
      // Background or popup may not be listening
    }
  }

  return validated;
}

export function subscribeSettings(
  callback: (settings: ExtensionSettings) => void
): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
    return () => {};
  }
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === "local" && changes[STORAGE_KEY]?.newValue) {
      const parsed = ExtensionSettingsSchema.safeParse(
        changes[STORAGE_KEY].newValue
      );
      if (parsed.success) {
        callback(parsed.data);
      }
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
