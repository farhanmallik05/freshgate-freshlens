# FreshLens: Hackathon Submission (Tavily Track #1)

## Track Alignment: Tavily Problem Statement #1 (Stale-Answer Detector)
> *"Build a stale-answer detector: take any LLM answer, flag claims likely to have gone stale, re-verify against live sources with a freshness score per claim."*

FreshLens addresses this problem statement directly and completely:
1. **Takes ANY LLM Answer:** Operates as a Chrome extension attaching seamlessly to ChatGPT, Claude, custom web chat UIs, or arbitrary selected text on any webpage.
2. **Flags Claims Likely Stale:** Employs a heuristic staleness prior that categorizes volatile claims (versions, pricing, leadership, policy) while ignoring evergreen concepts to preserve credits.
3. **Re-verifies with Live Sources:** Executes real-time Tavily Search & Extract queries with category-aware time filtering (`max_age_hours: 24` for releases/pricing).
4. **Freshness Score per Claim:** Returns an empirical 0-100 score, categorized into fresh/aging/stale bands with rich citations, domain authority ratings, and corrections.

---

## Technical Highlights
- **CSS Custom Highlight API:** Zero DOM mutations inside React host trees; highlights rendered via native browser rendering primitives.
- **Shadow DOM Overlay:** Renders all controls, score rings, and popovers inside `#freshlens-root` to avoid CSS conflicts.
- **Credit-Conscious Tavily Integration:** 30-minute session LRU caching prevents duplicate queries.
- **"Fix with Fresh Context":** Bridges detection with remediation by assembling a context-grounded follow-up prompt.
- **Privacy-First:** Strict data minimization: no user prompts, cookies, or URLs are sent.
