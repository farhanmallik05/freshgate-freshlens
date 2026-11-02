import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedPermissions = new Set(["storage", "contextMenus", "activeTab", "scripting"]);
const allowedHostPatterns = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://claude.ai/*",
  "http://localhost:*/*",
  "http://127.0.0.1:*/*",
];

// Check wxt.config.ts configuration
const wxtConfigFile = path.resolve(__dirname, "../wxt.config.ts");
const wxtConfigText = fs.readFileSync(wxtConfigFile, "utf-8");

// Simple regex extraction of manifest fields from config
const permissionsMatch = wxtConfigText.match(/permissions:\s*\[([^\]]+)\]/);
const hostPermissionsMatch = wxtConfigText.match(/host_permissions:\s*\[([^\]]+)\]/);

if (!permissionsMatch || !hostPermissionsMatch) {
  console.error("Could not parse permissions or host_permissions from wxt.config.ts");
  process.exit(1);
}

const parsedPermissions = permissionsMatch[1]
  .split(",")
  .map((p) => p.trim().replace(/['"]/g, ""))
  .filter(Boolean);

const parsedHostPermissions = hostPermissionsMatch[1]
  .split(",")
  .map((p) => p.trim().replace(/['"]/g, ""))
  .filter(Boolean);

let failed = false;

for (const perm of parsedPermissions) {
  if (!allowedPermissions.has(perm)) {
    console.error(`Disallowed permission detected: ${perm}`);
    failed = true;
  }
}

for (const host of parsedHostPermissions) {
  if (!allowedHostPatterns.includes(host)) {
    console.error(`Disallowed host permission detected: ${host}`);
    failed = true;
  }
}

if (failed) {
  console.error("Manifest audit failed: permissions exceed allowed SPEC.md set.");
  process.exit(1);
}

console.log("Manifest audit passed: all permissions conform strictly to SPEC.md allowlist.");
