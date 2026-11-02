# FreshLens: Live Demo Script & Video Storyboard

## 1. 2-Minute Live Judge Demo Script

### 0:00 - 0:25: The Problem (Hook)
- Open ChatGPT or Claude.
- Ask a high-volatility question: *"What is the latest stable release of Next.js, and what is the current API pricing for Claude 3.5 Sonnet?"*
- Observe the model confidently stating Next.js 14 and outdated token prices.
- **Narrator:** *"Frontier LLMs sound completely confident even when their facts are months out of date. Without FreshLens, you wouldn't know which numbers to trust."*

### 0:25 - 0:55: The Inspection (FreshLens in Action)
- As soon as the message finishes generating, FreshLens auto-detects the completion.
- A discreet badge appears next to the response: `Score 38 · 2 Stale Claims`.
- Highlights appear directly over the text:
  - Green solid underline on evergreen facts.
  - Red wavy underline on `"Next.js 14"` and the outdated token pricing.
- Hover over the red highlight: a floating popover displays:
  - **Verdict:** Stale (Score 18)
  - **Correction:** Next.js 15 is generally available as of Oct 2024.
  - **Live Source:** `nextjs.org/blog/next-15` (retrieved live via Tavily).

### 0:55 - 1:25: Remediation ("Fix with Fresh Context")
- Click the FreshLens badge to open the inspection panel.
- Review the evidence drawer with domain authority tags (`official`).
- Click **"Fix with fresh context"**.
- Watch FreshLens automatically construct a targeted remediation prompt and insert it into the chat input:
  *"Some facts in your previous answer may be outdated. Using ONLY the verified information below, rewrite your answer: Next.js 15 is current..."*
- Note that it does not auto-submit, leaving the user in full control.

### 1:25 - 2:00: Architecture & Judge Assurance
- Open the extension popup: show that Demo Mode provides 100% offline reliability, but switching to Live connects directly to the FreshGate Engine + Tavily API.
- Point to the privacy tab: only the assistant message was sent; zero URLs or user prompts leaked.
- **Narrator:** *"FreshLens turns any chatbot interface into a real-time, verified research assistant—powered by Tavily search."*

---

## 2. 90-Second Video Shot List
1. **[00-15s]** Split screen: ChatGPT answering vs reality. Cut to FreshLens title card.
2. **[15-35s]** Screen recording: FreshLens auto-highlighting stale facts on `/demo-chat`.
3. **[35-55s]** Close-up on popover and evidence drawer showing Tavily source metadata.
4. **[55-75s]** Click "Fix with fresh context" inserting prompt into chat box.
5. **[75-90s]** Quick look at the Chrome Extension popup, settings, and GitHub repo.
