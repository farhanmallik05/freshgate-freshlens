# FreshLens: Live AI Truth & Anti-Staleness Inspector

[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-blue?logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Tavily Track #1](https://img.shields.io/badge/Tavily-Problem_Statement_%231-emerald)](https://tavily.com)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-zinc)](LICENSE)

> A Chrome Manifest V3 browser extension that highlights outdated facts inside ChatGPT and Claude in real time, backed by live web verification via the **FreshGate Engine** and **Tavily API**.

---

## ⚡ Try It in 30 Seconds (Hackathon Judge Quickstart)

You can evaluate FreshLens in 30 seconds without installing any backend dependencies or requiring API keys:

1. **Get the Extension:**
   - Unpack the pre-built release package: [`freshlens/dist/freshlens-mv3.zip`](./dist/freshlens-mv3.zip) or use `.output/chrome-mv3`.
2. **Load into Chrome:**
   - Navigate to `chrome://extensions` in Google Chrome.
   - Enable **Developer mode** (toggle in top-right corner).
   - Click **Load unpacked** and select the `.output/chrome-mv3` folder (or extracted zip folder).
3. **Experience the Live Demo:**
   - Open the included demo chat site: [`http://localhost:5173/#demo-chat`](http://localhost:5173/#demo-chat) (or run `pnpm -C site dev`).
   - Click any volatile scenario (e.g. *Next.js 14 release*, *Claude 3.5 pricing*, or *Twitter CEO*).
   - Watch the assistant message generate. As soon as it finishes:
     - FreshLens automatically detects completion.
     - Outdated claims are highlighted with accessible wavy red underlines.
     - Hover over any highlight to inspect the empirical freshness score (0-100), correction, and live Tavily source links.
     - Click **"Fix with fresh context"** to automatically insert a verified remediation prompt into the chat input.

---

## 🌟 Why FreshLens Matters

Frontier LLMs (GPT-4o, Claude 3.5 Sonnet) sound completely authoritative even when their facts are months or years out of date. End users copy code with deprecated APIs, believe stale SaaS pricing, and reference outdated regulatory policies.

FreshLens bridges this gap at the user interface level:
- **Zero Host Contamination:** Uses the modern **CSS Custom Highlight API** (`::highlight(fl-fresh)`, etc.) to paint highlights purely at the rendering engine level without altering the host site's React DOM tree.
- **Shadow DOM Isolation:** Renders the floating status badge, score ring, inspection drawer, and hover popovers inside an isolated Shadow Root (`#freshlens-root`) with total immunity against host CSS conflicts.
- **Credit-Conscious Verification:** Employs a heuristic staleness prior to skip evergreen mathematical and conceptual statements, and caches claim verifications in an LRU session store (30-minute TTL).
- **Strict Privacy-First Architecture:** Strips conversation URLs, page titles, and personal prompt queries by default. Only the assistant message text is verified.

---

## 📐 Architecture Diagram

```text
Host Webpage (ChatGPT / Claude / Demo Chat)
  │
  ├── [Content Script]
  │     ├── MutationObserver (1200ms debounce of DOM silence)
  │     ├── Site Adapters (Multi-tier fallback selector catalog)
  │     ├── TextMap Engine (TreeWalker -> UTF-16 character offset mapping)
  │     ├── Claim Anchor & Highlighter (CSS Custom Highlight API + <mark> fallback)
  │     └── Shadow DOM Host (#freshlens-root)
  │           └── React 18 UI (BadgeChip, ScoreRing, ClaimPanel, Popovers)
  │
  ├── [Chrome Messaging Bus] (Typed Zod Messages)
  │
  └── [Background Service Worker]
        ├── Settings Store (chrome.storage.local)
        ├── Session Cache (chrome.storage.session sha256 LRU)
        ├── Offline Demo Fixtures (Deterministic 8+ scenario mock)
        └── FreshGate Engine Client (POST /v1/verify + Tavily API)
```

---

## 🔍 Scoring & Freshness Bands

| Band | Freshness Score | Visual Indicator | Meaning |
|---|---|---|---|
| **Fresh** | 75 – 100 | Solid green underline (`#10b981`) | Verified current against recent primary sources |
| **Aging** | 45 – 74 | Dashed amber underline (`#f59e0b`) | Still plausible but nearing volatility horizon |
| **Stale** | 0 – 44 | Wavy red underline (`#ef4444`) | Disproven or superseded by verified live facts |

---

## 🔒 Privacy & Permissions Guarantee

FreshLens adheres strictly to the Principle of Least Privilege:
- **Permissions:** `storage`, `contextMenus`, `activeTab`, `scripting`.
- **Zero Third-Party Telemetry:** No analytics scripts, remote fonts, or external tracking pixels.
- **Full Transparency:** The extension Options page includes a live **Privacy Transparency Panel** that renders the exact outgoing JSON payload for user verification.

---

## 🤝 Project Ecosystem

FreshLens is the client-side companion to **[FreshGate](../freshgate/)**, an open-source Go plugin and Freshness Engine for the **Bifrost LLM Gateway** (`maximhq/bifrost`). Together, they provide end-to-end anti-staleness at both the gateway and browser surfaces.
