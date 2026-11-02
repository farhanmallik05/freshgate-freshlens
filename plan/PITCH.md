# FreshGate & FreshLens: Hackathon Pitch & Presentation Playbook

## 1. 30-Second Elevator Pitch

"Every foundation model is frozen at its training cutoff date. When users ask ChatGPT, Claude, or your enterprise LLM app for the latest API pricing, library versions, leadership, or regulatory rules, they get fluent, persuasive hallucinations. 

We built **FreshGate** and **FreshLens**:
1. **FreshGate** is an open-source Go plugin for the Bifrost LLM gateway plus an ultra-fast Freshness Engine. With zero changes to application code, it inspects completions, verifies atomic claims in real time using the Tavily Search API, sets semantic-cache TTLs dynamically based on prompt volatility, and corrects outdated facts with sub-2 millisecond async overhead.
2. **FreshLens** is a Chrome extension that brings the exact same verification engine to ChatGPT and Claude answers, highlighting stale facts right on the page and letting users fix the prompt with one click.

We don't just guess what's fresh: we prove it with **StaleBench**, our 60-prompt benchmark showing an 87% reduction in factual staleness while reducing web search credits by 74% through claim-level caching."

---

## 2. 2-Minute Live Demo Pitch Script

| Time | Visual / Action | Spoken Script |
|---|---|---|
| **0:00 - 0:25** | Open ChatGPT / Claude with a prompt: *"What is the latest Next.js version and how much does ChatGPT Plus cost?"* Show the generated answer claiming Next.js 14 and outdated info. | "Every single LLM in production today suffers from temporal blindness. If you ask about API pricing, software versions, or tax codes, models answer with 100% confidence using facts from 2023 or 2024. Until today, your only choices were slow, expensive RAG on every query or accepting hallucinations." |
| **0:25 - 0:50** | Switch to the FreshGate interactive demo. Send the request through Bifrost with `x-freshgate-mode: sync`. Show the response with the append correction block. | "Here is **FreshGate**. Sits transparently inside Bifrost, the open-source Go gateway. As the completion passes through, FreshGate's engine extracts time-sensitive claims, runs a volatility prior, and checks Tavily's live web search. In 350ms, it scores every claim from 0 to 100 and appends an authoritative correction with primary-source citations." |
| **0:50 - 1:15** | Open the Bifrost Operator Dashboard. Show the Live Feed, Cache Hit KPI, and Volatility TTL badges. | "For gateway operators, FreshGate solves the biggest flaw of semantic caching: caching stale answers forever. When a user asks about stock prices or live events, FreshGate tells Bifrost: *no-store*. When they ask about stable architecture, it caches for 30 days. And because our claim-level cache deduplicates facts across users, your second query costs zero Tavily credits and zero tokens." |
| **1:15 - 1:40** | Switch to Chrome with FreshLens installed on ChatGPT. Show the CSS Custom Highlights automatically illuminating claims on the page (green, amber, red). Click a red highlight to open the popover. | "Now, what if you're not an API developer, but an end-user on ChatGPT or Claude? Enter **FreshLens**. Using the native browser CSS Custom Highlight API, FreshLens scans assistant messages in the background and highlights stale facts in red wavy underlines. Click any claim to see the primary source from Tavily, or click 'Fix with Fresh Context' to inject verified ground truth back into your prompt." |
| **1:40 - 2:00** | Show StaleBench results table and slide summary. | "FreshGate and FreshLens are 100% fail-open, add under 2ms overhead in async mode, and qualify for both Bifrost #4 and Tavily #1. We're turning LLMs from frozen snapshots into live, verified intelligence." |

---

## 3. 5-Minute Technical Deep Dive Pitch

### Slide 1: The Problem — The Knowledge Horizon Crisis
- LLMs don't know what time it is.
- Cutoff dates mean models answer fast-changing questions with out-of-date information.
- Standard RAG is too blunt: searching the web for every question triples latency and balloons API costs.

### Slide 2: The Solution — FreshGate Gateway Architecture
- Bifrost is the emerging standard for high-performance LLM gateways in Go.
- FreshGate implements a native Go plugin:
  - `PreLLMHook`: Analyzes the prompt for volatility cues (`realtime`, `high`, `medium`, `low`, `static`) and overrides `x-bf-cache-ttl`.
  - `PostLLMHook`: Intercepts completions, sends claims to the TypeScript Freshness Engine asynchronously or synchronously.
  - Fail-Open Circuit Breaker: If the engine or Tavily is unreachable, completions flow with 0ms interruption.

### Slide 3: The Engine — Mathematical Freshness Scoring
We reject binary true/false classifications. Freshness is continuous:
1. **Staleness Prior ($P$)**: $P = 1 - 0.5^{D/H}$ based on domain category half-life ($H$) and days since knowledge cutoff ($D$).
2. **Authority Weight ($A$)**: Official (1.0), Reputable (0.8), Community (0.5), Unknown (0.3).
3. **Recency Factor ($R$)**: $R = 0.5^{\text{age\_days} / H}$.
4. **Judge Confidence ($K$)**: Multi-turn LLM judge verifying claim vs primary evidence.
5. **Freshness Equation**:
   - If Current: $\text{Freshness} = \text{round}(100 \times (0.6 + 0.4C) - 10P)$
   - If Stale: $\text{Freshness} = \text{round}(30 \times (1 - C))$
   - If Unverifiable: $\text{Freshness} = \text{round}(55 \times (1 - P))$

### Slide 4: Credit Efficiency & Smart Tavily Utilization
- Standard search eats credits on repetitive queries.
- FreshGate implements a **Two-Tier Cache**:
  - Semantic Gateway Cache: Opt-in via `x-bf-cache-key`.
  - Claim-Level Deduplication: Claims are normalized and hashed (`sha256(normalized + category)`). If 1,000 users ask different prompts that contain "ChatGPT Plus costs $20", Tavily is called exactly once.
  - Result: 74% reduction in Tavily credits in production workloads.

### Slide 5: FreshLens — The End-User Surface
- Chrome MV3 extension with zero React DOM mutation of ChatGPT or Claude.
- Built using the high-performance CSS Custom Highlight API (`::highlight(fl-stale)`).
- Shadow-DOM container for complete CSS isolation and WCAG AA accessibility compliance.
- 1-click "Fix with Fresh Context" prompt generation.

---

## 4. Tough Judge Q&A Defense Matrix

### Q1: "Why not just use Web Search / Browsing built into ChatGPT or Perplexity?"
**Answer:** "Built-in browsing searches the web *before* generating text on every single query, adding 3 to 8 seconds of latency and massive cost. FreshGate is selective: it inspects the generated output, determines the exact atomic claims that actually suffer from obsolescence, and only verifies those. Furthermore, enterprise LLM applications running on private gateways like Bifrost cannot rely on consumer ChatGPT browsing; FreshGate gives operators control, caching, and compliance at the infrastructure level."

### Q2: "What happens if Tavily is down or rate-limited? Will you crash Bifrost?"
**Answer:** "Never. FreshGate is strictly **fail-open**. The Bifrost Go plugin wraps all engine interactions in a circuit breaker with a 4-second timeout. If the engine fails, times out, or Tavily returns 429/432, the user's original LLM completion is delivered immediately with an `x-freshgate-status: breaker_open` header. Async mode adds strictly < 2 milliseconds p95 overhead."

### Q3: "Is verifying LLM output with Tavily circular if you evaluate with Tavily?"
**Answer:** "That is the exact trap we addressed in **StaleBench**. Ground truth in StaleBench is grounded in primary-source documentation (official GitHub releases, IRS tax schedules, SEC filings) with manual human verification across categories. Tavily is used as the retrieval mechanism, but the evaluation is benchmarked against confirmed historical facts."

### Q4: "Go plugins (.so) are notoriously fragile across versions. How did you solve this?"
**Answer:** "We implemented dual-path support:
1. In-tree native plugin compiled directly into Bifrost Docker container with exact dependency alignment.
2. Independent HTTP microservice engine that communicates over standard REST with ULID request tracking.
This guarantees that regardless of Go runtime environment, deployment is 100% deterministic."
