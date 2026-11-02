# FreshLens: Known Limitations & Edge Cases

This document transparently records the architectural constraints, browser platform variations, and edge cases of FreshLens v1.0.0.

---

## 1. Single-Page Application (SPA) DOM Mutation Drift
- **Observation:** ChatGPT and Claude actively iterate their frontend React component trees and CSS class obfuscation schemes (e.g., changing from `[data-message-author-role="assistant"]` to nested `article` turns).
- **Mitigation in Place:**
  1. Multi-strategy selector catalog in `selectors.ts` featuring 3-4 distinct fallback queries per site.
  2. Generic text selection mode (`Alt+Shift+F` or context menu) operates on ANY webpage independently of selector classes.
  3. Stable `data-fl-role="assistant"` integration on the dedicated `/demo-chat` test site for deterministic judging.

---

## 2. CSS Custom Highlight API Browser Support
- **Observation:** `::highlight()` is supported in Chromium 105+ and Safari 17.2+, but may not be available on older browsers or non-standard WebView containers.
- **Mitigation in Place:** Automatic fallback to `<mark data-fl-claim>` text node wrapping with deterministic teardown and normalization upon unmount.

---

## 3. High-Volume Message History Rotation
- **Observation:** To prevent unbounded storage growth in `chrome.storage.local`, inspection history is strictly capped at `settings.historySize` (default 20 records, max 100).
- **Behavior:** Older records are automatically pruned. Users desiring long-term audit storage should use the "Export JSON" button in the History dashboard.

---

## 4. Complex Formatted Tables & Code Blocks
- **Observation:** Claims embedded inside multi-cell HTML tables or markdown code fences might have whitespace differences between raw plain text and visual cells.
- **Mitigation in Place:** Code blocks (`pre`, `code`) are ignored by default. Normalization and fuzzy token fallback (threshold 0.85) recover unanchored table text.
