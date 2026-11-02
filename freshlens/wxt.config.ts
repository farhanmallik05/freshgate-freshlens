import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";

// See https://wxt.dev/api/config.html
export default defineConfig({
  entrypointsDir: "entrypoints",
  vite: () => ({
    plugins: [react()],
  }),
  manifest: {
    name: "FreshLens",
    description: "Live Freshness & Anti-Staleness Inspector for ChatGPT and Claude",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "contextMenus", "activeTab", "scripting"],
    host_permissions: [
      "https://chatgpt.com/*",
      "https://chat.openai.com/*",
      "https://claude.ai/*",
      "http://localhost:*/*",
      "http://127.0.0.1:*/*",
    ],
    optional_host_permissions: ["https://*/*", "http://*/*"],
    action: {
      default_title: "FreshLens: Live Freshness Inspector",
      default_popup: "entrypoints/popup/index.html",
    },
    options_ui: {
      page: "entrypoints/options/index.html",
      open_in_tab: true,
    },
    commands: {
      "check-selection": {
        suggested_key: {
          default: "Alt+Shift+F",
          mac: "Alt+Shift+F",
        },
        description: "Check selected text with FreshLens",
      },
    },
    icons: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    },
  },
});
