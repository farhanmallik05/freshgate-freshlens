# FreshGate + FreshLens: Comprehensive Project Roadmap & Execution Plan

## Executive Overview

FreshGate and FreshLens solve the "hallucination by obsolescence" problem in Large Language Models. Foundation models are frozen in time by their training cutoff dates. When asked about fast-moving facts (AI models, library versions, API pricing, leadership, legislation, product status), they produce fluent but dangerously stale answers.

- **FreshGate (Bifrost Gateway Plugin + Engine):** Sits transparently in the Bifrost LLM gateway. It extracts factual claims from LLM completions, assigns volatility priors, verifies them live against the real-time web via the Tavily Search & Extract API, computes mathematically rigorous freshness scores (0–100), sets semantic-cache TTLs dynamically, and corrects or annotates answers fail-open with sub-2ms async overhead.
- **FreshLens (Chrome MV3 Extension + Web Landing):** Brings this freshness protection directly to end-user browsers. In ChatGPT, Claude, or any selected text, FreshLens unobtrusively scans assistant responses, highlights claims using the CSS Custom Highlight API (green = fresh, amber = aging, red = stale), renders an accessible Shadow-DOM inspection panel with verifiable citations, and enables 1-click "Fix with Fresh Context" prompt injection.

---

## 1. System Architecture & Topology

```
                  ┌──────────────────────────────────────────────┐
                  │                 User Clients                 │
                  └───────┬──────────────────────────────┬───────┘
                          │                              │
                          │ OpenAI API calls             │ Web browsing
                          ▼                              ▼
                 ┌──────────────────┐           ┌──────────────────┐
                 │  Bifrost Gateway │           │  Browser Client  │
                 │   (Go / HTTP)    │           │ (ChatGPT/Claude) │
                 └────────┬─────────┘           └────────┬─────────┘
                          │                              │
            ┌─────────────┴─────────────┐                │
            │ freshgate Gateway Plugin  │                │ FreshLens MV3
            │  - PreLLM: Volatility TTL │                │  - Content Adapter
            │  - PostLLM: Async/Sync    │                │  - CSS Highlights
            │  - Fail-Open Breaker      │                │  - Shadow-DOM Panel
            └─────────────┬─────────────┘                │
                          │                              │
                          │  REST API (VerifyRequest)    │
                          ▼                              ▼
                 ┌─────────────────────────────────────────────────┐
                 │         FreshGate Freshness Engine              │
                 │         (TypeScript / Node.js 22 / Hono)        │
                 ├─────────────────────────────────────────────────┤
                 │ 1. Prompt Classifier (RE2 volatility cues)      │
                 │ 2. Claim Extractor (Heuristics + LLM Substring) │
                 │ 3. Staleness Prior Calculator: P = 1-0.5^(D/H)  │
                 │ 4. Claim Cache (SHA-256 + Category TTL)         │
                 │ 5. Tavily Search Client (Topic, Depth, Recency) │
                 │ 6. LLM Judge (Defensive, Anti-Injection)        │
                 │ 7. Scorer (C = 0.5A + 0.3R + 0.2K -> Freshness) │
                 │ 8. SQLite WAL Persistence + SSE Event Hub       │
                 └────────────────────────┬────────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
              ┌──────────────────┐                ┌──────────────────┐
              │    Tavily API    │                │   LLM Upstream   │
              │  Search/Extract  │                │  (Bifrost / OpenAI)│
              └──────────────────┘                └──────────────────┘
```

---

## 2. Directory Structure

```text
Global AI Hackathon/
├── plan/
│   ├── ROADMAP.md                  # This file: complete execution roadmap
│   ├── ARCHITECTURE.md             # In-depth architectural & mathematical design
│   ├── PROMPT_EXECUTION_MATRIX.md  # Status and verification matrix of all prompts
│   ├── PITCH.md                    # 2-minute and 5-minute hackathon pitches & Q&A defense
│   ├── SLIDES_PPT.md               # 10-slide presentation deck for judging rounds
│   ├── JUDGING_RUBRIC_ALIGNMENT.md # Criteria mapping for Bifrost #4 and Tavily #1
│   └── E1_PRE_HACKATHON_REPORT.md  # Official Pre-Hackathon Evaluation & Feasibility
├── freshgate/
│   ├── Makefile                    # Unified automation (setup, check, dev, demo, bench)
│   ├── package.json                # Monorepo root scripts
│   ├── AGENTS.md / GEMINI.md / CLAUDE.md # Autonomous multi-agent contracts
│   ├── docs/
│   │   ├── PRD.md, TRD.md, SPEC.md, PROGRESS.md, DECISIONS.md
│   │   ├── CHANGELOG.md, RISKS.md, DEMO.md, SUBMISSION.md
│   │   ├── BENCHMARK.md, PERFORMANCE.md, SECURITY.md, BIFROST_PR.md
│   │   └── COMPLETION_REPORT.md
│   ├── shared/
│   │   ├── volatility-rules.json   # RE2 regexes, category half-lives, TTLs
│   │   ├── authority.json          # Domain tiers (official, reputable, community)
│   │   ├── fixtures/classify-vectors.json # 40 benchmark vectors
│   │   └── contract/openapi.json   # Generated OpenAPI v3 specification
│   ├── engine/                     # TypeScript Hono Freshness Engine
│   │   ├── src/                    # schemas, prior, extract, tavily, judge, score, db, cache, server
│   │   └── test/                   # Comprehensive Vitest suites & fixtures
│   ├── plugin/freshgate/           # Go Bifrost Gateway Plugin
│   │   ├── freshgate.go, config.go, classifier.go, cachecontrol.go, client.go
│   ├── dashboard/                  # Next.js 15 / Tailwind / Lucide / Recharts Operator Dashboard
│   ├── bench/                      # StaleBench evaluation dataset & runner
│   ├── demo/                       # Interactive split-screen demo application
│   └── deploy/                     # Docker Compose, Bifrost configs, Valkey semantic cache
├── freshlens/                      # Chrome Extension (Manifest V3)
│   ├── wxt.config.ts, package.json
│   ├── src/
│   │   ├── background/             # Service worker, engine client, cache, demo mode
│   │   ├── content/                # Adapters (ChatGPT, Claude, Demo, Selection), TextMap, Anchor
│   │   ├── overlay/                # Shadow-DOM message chips, panels, popovers
│   │   ├── popup/, options/, onboarding/, history/
│   └── site/                       # Next.js Landing Page + Playground + /demo-chat
└── bifrost/                        # Bifrost Gateway integration workspace
```

---

## 3. Step-by-Step Prompt Execution Matrix

| ID | Module | Purpose | Verification Artifacts |
|---|---|---|---|
| **E1** | Plan | Pre-Hackathon evaluation, feasibility, judging alignment | `plan/E1_PRE_HACKATHON_REPORT.md` |
| **A1** | FreshGate | Monorepo scaffolding, contracts, schemas, docs | `freshgate/docs/SPEC.md`, `engine/src/contract/schemas.ts` |
| **A2** | FreshGate | Extraction, prior calculation, prompt classification | Unit tests with 100% coverage on prior & classify |
| **A3** | FreshGate | Tavily search client, evidence scoring, LLM judge | Golden score tests, mock replay verification |
| **A4** | FreshGate | SQLite WAL persistence, singleflight cache, SSE, auth | Cache hit test, SSE replay test, stats aggregation |
| **A5** | FreshGate | Bifrost Go plugin spike, Docker build pipeline | Docker compose bifrost + valkey + plugin |
| **A6** | FreshGate | Bifrost plugin full implementation (fail-open, TTL) | `scripts/e2e-gateway.sh` green |
| **A7** | FreshGate | Next.js Operator Dashboard (high-end visual taste) | Live SSE feed, Overview charts, Playground |
| **A8** | FreshGate | StaleBench 60-prompt dataset & evaluation runner | `docs/BENCHMARK.md`, `bench/results/latest.json` |
| **A9** | FreshGate | Interactive Demo app, demo script, submission assets | `make demo`, `docs/DEMO.md`, `docs/SUBMISSION.md` |
| **A10** | FreshGate | Hardening, chaos testing, security review, load tests | `docs/PERFORMANCE.md`, `docs/SECURITY.md` |
| **A-DONE** | FreshGate | Project A completion audit & verification report | `docs/COMPLETION_REPORT.md` |
| **B1** | FreshLens | WXT MV3 Extension scaffolding & contract sync | Extension builds, contract sync verified |
| **B2** | FreshLens | Background service worker, messaging, offline cache | Offline demo fixtures, test suites pass |
| **B3** | FreshLens | ChatGPT/Claude DOM adapters, TreeWalker TextMap | TextMap round-trip 100% on nested DOM |
| **B4** | FreshLens | CSS Custom Highlight API & range hit testing | CSS.highlights registration, zero layout shift |
| **B5** | FreshLens | Shadow-DOM overlay, status chips, claim popover | Accessibility WCAG AA, dark/light theme |
| **B6** | FreshLens | Extension Popup, Options, Onboarding, History | Privacy panel, settings import/export |
| **B7** | FreshLens | "Fix with Fresh Context", Copy Corrected Answer | DOM input injection without auto-submit |
| **B8** | FreshLens | Next.js Landing site, Playground, `/demo-chat` | Interactive simulation, zero engine required |
| **B9** | FreshLens | Playwright E2E tests, privacy audit, manifest scan | `docs/EVAL.md` with benchmark numbers |
| **B10** | FreshLens | Store assets, packaging, submission documentation | Zip package, promo tiles, submission text |
| **B-DONE** | FreshLens | Project B completion audit & verification report | `freshlens/docs/COMPLETION_REPORT.md` |
| **E2** | Global | Continuous Checkpoint & Regression Protocol | Audit logs in `docs/PROGRESS.md` |

---

## 4. UI Taste Design System Directives

To satisfy `/design-taste-frontend`, `/stitch-design-taste`, `/high-end-visual-design`, and `/gpt-taste`:
- **Palette**: Monochromatic obsidian/zinc dark foundation (`#09090b`, `#18181b`, `#27272a`) with surgical semantic accents:
  - Fresh: Emerald (`#10b981`, `#059669`) with solid micro-border
  - Aging: Amber (`#f59e0b`, `#d97706`) with dashed underline styling
  - Stale: Rose (`#f43f5e`, `#e11d48`) with wavy highlight accent
- **Typography**: Geist Sans + Geist Mono for technical density, high contrast tabular numerals for metrics, relaxed tracking on headers.
- **Micro-interactions**: Subtle CSS transitions (150ms ease-out), no bouncy cartoon animations, glassmorphism restricted to floating popovers with 1px border `border-white/10` and `backdrop-blur-md`.
- **Information Density**: Cockpit-grade density for the FreshGate Operator Dashboard (dial `DENSITY: 7`); editorial clarity for FreshLens Landing and Overlay (dial `DENSITY: 4`).
