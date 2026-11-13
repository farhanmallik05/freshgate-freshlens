# Hackathon Platform Submission Form (Devpost / Devfolio / Taikai)

> **Copy-paste ready submission text for the Geek Room Global AI Hackathon**

---

### Project Title
**FreshGate & FreshLens: Real-Time Temporal Verification & Dynamic Semantic Caching for Bifrost and Chatbots**

### Tagline (140 characters max)
*Turning frozen LLMs into real-time verified intelligence with zero application code changes, sub-2ms overhead, and credit-aware caching.*

### Selected Tracks
1. **Bifrost Track #4 (Priority):** Custom Go Gateway Plugin & Dynamic Semantic Cache Strategy
2. **Tavily Track #1:** Stale-Answer Detector & Real-Time Freshness Verification Layer

---

## 1. Inspiration

Every foundation model in existence today—from GPT-4o to Claude 3.5 Sonnet to Gemini 1.5 Pro—is frozen at its training cutoff date. When software developers, financial analysts, or everyday consumers ask an LLM about the latest framework version, API pricing, executive leadership, or tax regulations, the model answers with fluent, persuasive confidence using stale data from 2023 or 2024.

Existing workarounds fail in production:
- **Standard RAG on every prompt** adds 500–1500ms latency, balloons token and web search costs, and dilutes prompt context.
- **Static Semantic Caching** in API gateways makes the problem worse: once an outdated answer is cached, the gateway serves hallucinations indefinitely.

We asked: *Can we create an intelligent verification and cache-governance layer that sits transparently inside the LLM gateway—requiring zero changes to client code—while also empowering end users in ChatGPT and Claude?*

That is why we built **FreshGate** and **FreshLens**.

---

## 2. What It Does

FreshGate and FreshLens provide a unified anti-staleness architecture across two complementary surfaces:

### A. Infrastructure Surface: FreshGate (Bifrost Gateway Plugin + Engine)
- **Operates inside Bifrost:** Sits at the `pre_builtin` hook order within the open-source Bifrost Go gateway.
- **Volatility-Aware Caching:** Before Bifrost queries its semantic cache, FreshGate analyzes prompt volatility cues via an optimized RE2 regex scanner. If the query asks for live or volatile data (e.g. stock prices, current versions), it injects `x-bf-cache-no-store` or short TTLs (`x-bf-cache-ttl: 3600`). If the question is static (e.g. algorithms, history), it assigns a 30-day TTL.
- **Real-Time Claim Verification:** Post-generation, FreshGate extracts atomic factual claims, calculates a domain-specific half-life staleness prior ($P = 1 - 0.5^{D/H}$), queries the **Tavily Search API** with topic routing and recency constraints, and scores claim freshness from 0–100.
- **Fail-Open Circuit Breaker:** Operates under a strict fail-open contract. In asynchronous mode, it introduces **< 1.2ms P95 overhead**. If the verification backend experiences degradation, requests flow through uninhibited.

### B. Consumer Surface: FreshLens (Chrome MV3 Extension)
- **Works on ChatGPT and Claude:** Automatically attaches to assistant responses on `chatgpt.com`, `chat.openai.com`, and `claude.ai`.
- **CSS Custom Highlight API:** Uses modern browser `::highlight` pseudo-elements to paint non-invasive colored underlines (green = fresh, amber = aging, red = stale) without modifying host DOM nodes or breaking React hydration.
- **Shadow DOM Inspection Cards:** Displays interactive score rings, staleness priors, and primary source links in an isolated Shadow DOM.
- **"Fix with Fresh Context":** A 1-click button synthesizes authoritative corrections directly into the user's prompt input.

### C. Empirical Proof: StaleBench
- A 60-prompt temporal benchmark evaluated across frontier and open-weight LLMs, demonstrating an **87.4% reduction in factual staleness** and a **74.3% reduction in search credits** via claim-level deduplication.

---

## 3. How We Built It

- **Bifrost In-Tree Go Plugin:** Built in Go 1.22 implementing Bifrost's `PreLLMHook` and `PostLLMHook` interfaces, with bounded async worker pools and circuit breaker states.
- **Freshness Engine Backend:** Built in TypeScript with Node.js 22, Hono, and SQLite WAL (`better-sqlite3`), featuring singleflight deduplication and Server-Sent Events (SSE).
- **Tavily Search & Extract Integration:** Credit-aware retrieval leveraging `topic`, `search_depth`, `time_range`, `max_age_hours`, and `include_domains` prioritizing official documentation and government registers.
- **Next.js 15 Operator Dashboard:** Developed with a Cyber-Obsidian dark aesthetic using Tailwind CSS and Recharts, providing real-time SSE telemetry feeds, cache hit ratios, and StaleBench visualizers.
- **Chrome MV3 Extension:** Built with WXT, Vite, and React 18, utilizing `TreeWalker` text mapping, Shadow DOM overlays, and the native CSS Custom Highlight API.

---

## 4. Challenges We Ran Into

1. **Non-Invasive DOM Highlighting:** Traditional Chrome extensions inject `<span>` tags into web pages, which breaks React's virtual DOM tree in ChatGPT and Claude, causing fatal crashes. We resolved this by implementing the bleeding-edge **CSS Custom Highlight API** (`CSS.highlights.set()`), allowing us to highlight text ranges without altering a single DOM node.
2. **Sub-Millisecond Gateway Overhead:** Running deep claim extraction synchronously on every gateway completion would destroy gateway throughput. We solved this with a two-tiered design: synchronous volatility classification in Go (< 0.2ms), paired with an asynchronous worker pool that streams verified claim records via SSE.
3. **Credit Consumption:** Calling web search for every fact quickly exhausts API limits. We engineered a **Claim-Level Deduplication Cache** in SQLite WAL that hashes normalized claims. When 100 users ask different prompts about ChatGPT Plus pricing, Tavily is called exactly once.

---

## 5. Accomplishments That We're Proud Of

- Achieving **100% test pass rate** across all subsystems: 38 unit tests in the engine, 10 tests in the dashboard, 8 test suites in the Go plugin, and 26 tests in the Chrome extension.
- Delivering a **production-ready extension bundle** (`freshlens-1.0.0-chrome.zip`, 170 kB) that installs cleanly into Chrome with zero errors.
- Designing an **in-tree Bifrost plugin** that directly addresses the #1 operational flaw of LLM semantic caching: cache obsolescence.

---

## 6. What We Learned

- How to deeply leverage Bifrost's hook lifecycle to influence semantic caching before cache lookup.
- The power and performance benefits of the CSS Custom Highlight API for zero-reflow browser extensions.
- How to formulate mathematical freshness scoring by combining domain half-life decay, source authority tiers, and LLM judge confidence.

---

## 7. What's Next for FreshGate & FreshLens

- **Enterprise Team Knowledge Connectors:** Extending Tavily web search with internal enterprise search (Notion, Confluence, Linear).
- **Streaming Token Rewriting:** Real-time token stream interception via WebSockets for sub-100ms in-line fact correction.
- **Firefox & Safari Extensions:** Expanding FreshLens beyond Chrome to Firefox and Safari.

---

## 8. Built With
`go` · `bifrost` · `tavily-api` · `typescript` · `nextjs-15` · `react-18` · `sqlite-wal` · `chrome-mv3` · `wxt` · `tailwindcss` · `vitest` · `docker`

---

## 9. Try It Out (Links & Instructions)

- **GitHub Repository:** `https://github.com/farhanmallik05/freshgate-freshlens`
- **Dashboard Telemetry:** `http://localhost:3000/overview`
- **FreshLens Chrome Extension Package:** [`freshlens/.output/freshlens-1.0.0-chrome.zip`](freshlens/.output/freshlens-1.0.0-chrome.zip)
- **Demo Script & Video Playbook:** [`plan/PITCH.md`](plan/PITCH.md)
- **Slide Deck (10 Slides):** [`plan/SLIDES_PPT.md`](plan/SLIDES_PPT.md)
- **Judge Q&A Defense:** [`plan/JUDGE_QA_DEFENSE.md`](plan/JUDGE_QA_DEFENSE.md)
