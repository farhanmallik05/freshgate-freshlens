# Chrome Web Store Listing Pack: FreshLens

## 1. Product Name
**FreshLens: Live AI Freshness & Anti-Staleness Inspector**

## 2. Short Description (132 chars max)
Inspect ChatGPT & Claude answers for outdated facts. Live web verification with Tavily, instant highlights, freshness scores & sources.

## 3. Detailed Description
LLMs are frozen at their training cutoff dates. When you ask about library versions, API pricing, executive leadership, or regulatory guidelines, their answers are often months or years out of date.

FreshLens is an intelligent browser companion that brings real-time truth verification directly into your AI chat experience.

### Key Features:
- **Instant Inline Highlights:** Highlights factual claims directly inside ChatGPT and Claude without breaking page layout.
- **Accessible Indicators:** Uses distinct visual patterns (solid green for fresh, dashed amber for aging, wavy red for stale) so you never rely on color alone.
- **Evidence-Backed Popovers:** Hover over any claim to inspect the empirical freshness score (0-100), verified correction, and direct source links.
- **One-Click Remediation:** Click "Fix with fresh context" to auto-insert a verified rewrite prompt into your chat window without auto-submitting.
- **Privacy Guaranteed:** Only assistant text is verified. Your prompts, personal conversations, browsing history, and cookies are never accessed.

## 4. Single-Purpose Statement
Inspect and highlight time-sensitive factual claims inside AI assistant responses using live web verification.

## 5. Permission Justifications
- `storage`: Store extension settings, session verification cache, and recent inspection history locally.
- `contextMenus`: Provide a "Check selected text with FreshLens" action on any webpage.
- `activeTab` & `scripting`: Inject the highlight overlay and inspection drawer into supported AI chat interfaces upon user request.
