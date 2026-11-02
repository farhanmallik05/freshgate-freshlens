# FreshGate 2-Minute Live Demo Script & Video Shot List

## 1. 2-Minute Live Demo Script

| Timestamp | Screen / Action | What the Judge Sees | Voiceover / Talking Point |
|---|---|---|---|
| **0:00 - 0:20** | **Demo App (`localhost:3001`)**<br>Click "Latest Next.js Version" with Split View ON. | Left side shows standard model answering "Next.js 14 is the latest version". Right side shows FreshGate score ring (24/100, Stale) and markdown correction block. | "Every LLM is frozen at its training cutoff. Notice on the left: GPT-4o confidently asserts Next.js 14 is latest. On the right, FreshGate's gateway plugin intercepted the response, queried Tavily in the background, detected the obsolescence, and appended a verified correction pointing to official Next.js 15 release notes." |
| **0:20 - 0:45** | **Cache Demonstration**<br>Click "Ask Again (Test Cache Hit)". | Cache badge instantly updates: "Cache Hit (0 credits)". Response returns in < 15ms. | "Notice what just happened: the second request cost zero Tavily credits. FreshGate's category claim cache stored the verified claim with a category-appropriate TTL. Repeated answers across any user or app behind Bifrost cost nothing." |
| **0:45 - 1:10** | **Fail-Open Demonstration**<br>Click "Simulate Outage" (Engine down). Re-run prompt. | Request succeeds immediately with `x-freshgate-status: breaker_open`. No timeout, no 500 error. | "Gateways must never cause outages. Even if our verification engine or Tavily is completely unreachable, Bifrost's FreshGate plugin trips its circuit breaker in sub-millisecond time and fails open. Your users never experience downtime." |
| **1:10 - 1:40** | **Operator Dashboard (`localhost:3000`)**<br>Switch to Overview tab. | Real-time KPI tiles: Stale Claim Rate (16.9%), Model Staleness comparison, Top Stale Claims table. | "For platform operators, FreshGate provides a central pane of glass into model decay. You can immediately see which models hallucinate or lag on version numbers, pricing tiers, or executive leadership." |
| **1:40 - 2:00** | **Playground (`localhost:3000/verify`)**<br>Inspect inline highlighted text. | Text with green dotted, amber dashed, and rose solid underlines. Click on rose span to view primary evidence. | "In the verification playground, operators can inspect any statement with inline span highlights. Clicking any claim reveals its mathematical freshness decay curve and primary source links." |

---

## 2. Emergency Recovery Plan
- **If upstream network or keys fail:** Click "Demo Mode ON" in the header or set `NEXT_PUBLIC_DEMO=1`. The app and dashboard instantly fall back to seeded replay fixtures, ensuring the demonstration never stumbles during a live presentation.

---

## 3. Video Recording Shot List (2:30 Max)
1. **Scene 1 (0:00 - 0:15):** Problem Hook — Ask ChatGPT a time-sensitive fact, showing confident stale answer.
2. **Scene 2 (0:15 - 0:45):** FreshGate Architecture — Quick 5-second Mermaid diagram showing Bifrost gateway plugin intercepting output.
3. **Scene 3 (0:45 - 1:30):** Live Split-Screen Demo — Demonstrate Next.js 15 correction, API pricing, and cache hit.
4. **Scene 4 (1:30 - 2:00):** Dashboard & Telemetry — Tour of KPIs, model comparison, and StaleBench results.
5. **Scene 5 (2:00 - 2:20):** FreshLens Chrome Extension Preview — Highlighting stale facts directly in ChatGPT/Claude.
6. **Scene 6 (2:20 - 2:30):** Outro & GitHub repository link.
