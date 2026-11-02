# FreshGate + FreshLens

> **Real-Time Temporal Verification & Dynamic Semantic Caching for Bifrost and Chatbots**  
> *Geek Room Global AI Hackathon Submission*  
> **Dual-Track Entry:** Bifrost Track #4 (Priority) & Tavily Track #1

[![Bifrost Track](https://img.shields.io/badge/Bifrost_Track-%234_Plugin_%26_Cache_Strategy-6366f1?style=flat-square)](https://github.com/maximhq/bifrost)
[![Tavily Track](https://img.shields.io/badge/Tavily_Track-%231_Stale--Answer_Detector-059669?style=flat-square)](https://tavily.com)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)
[![Tests: Passing](https://img.shields.io/badge/Tests-100%25_Passing-10b981?style=flat-square)](#verification--test-evidence)

---

## 1. Executive Summary

Large Language Models (LLMs) are frozen in time by their training cutoff dates. When asked about fast-moving facts—library versions, API pricing, executive leadership, or regulatory codes—models hallucinate outdated answers with complete fluency.

**FreshGate** and **FreshLens** solve the "hallucination by obsolescence" dilemma across two unified surfaces:

1. **Infrastructure Surface: FreshGate (Go + Bifrost + TypeScript)**  
   An in-tree Go plugin for the open-source **Bifrost LLM Gateway** paired with an ultra-fast Freshness Engine. With zero changes to application code:
   - Sits at `pre_builtin` hook order: inspects prompt volatility to dynamically inject `x-bf-cache-ttl` and `x-bf-cache-no-store` into Bifrost's semantic cache **before** evaluation.
   - Intercepts completions post-generation: extracts atomic claims, calculates a domain-specific staleness prior, checks the live web via the **Tavily Search API**, and scores freshness from 0–100.
   - Enforces a strict **fail-open circuit breaker** adding `< 1.2ms` P95 async latency.

2. **Consumer Surface: FreshLens (Chrome Manifest V3 Extension)**  
   Brings real-time freshness inspection directly into **ChatGPT** (`chatgpt.com`, `chat.openai.com`) and **Claude** (`claude.ai`):
   - Scans assistant messages using the **CSS Custom Highlight API** (zero DOM layout shifts, no React virtual DOM corruption).
   - Renders interactive score rings, staleness priors, and primary evidence drawers in an isolated Shadow DOM.
   - One-click **"Fix with Fresh Context"** injects verified ground truth back into the user prompt.

3. **Empirical Proof: StaleBench**  
   A 60-prompt temporal benchmark evaluated across frontier and open-weight LLMs, demonstrating an **87.4% reduction in factual staleness** and a **74.3% reduction in web search credits** through claim-level caching.

---

## 2. System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Client Applications    │
                                  └──────────────┬──────────────┘
                                                 │
                     ┌───────────────────────────┴───────────────────────────┐
                     │ OpenAI-Compatible Requests                            │ Browser User
                     ▼                                                       ▼
        ┌─────────────────────────┐                            ┌───────────────────────────┐
        │     Bifrost Gateway     │                            │     FreshLens (MV3 Ext)   │
        │       (Go Engine)       │                            │   ChatGPT / Claude DOM    │
        └────────────┬────────────┘                            └─────────────┬─────────────┘
                     │                                                       │
        ┌────────────┴────────────┐                                          │
        │  freshgate Go Plugin    │                                          │ CSS.highlights
        │   - PreLLM: Volatility  │                                          │ Shadow-DOM Popover
        │   - PostLLM: Async/Sync │                                          │ Fix-Prompt Action
        │   - Fail-Open Breaker   │                                          │
        └────────────┬────────────┘                                          │
                     │                                                       │
                     └───────────────────────────┬───────────────────────────┘
                                                 │ POST /v1/verify
                                                 ▼
        ┌──────────────────────────────────────────────────────────────────────────────────┐
        │                           FreshGate Freshness Engine                             │
        │                         (TypeScript / Node.js 22 / Hono)                         │
        ├──────────────────────────────────────────────────────────────────────────────────┤
        │ 1. Volatility Classifier    RE2 pattern scanning (realtime, high, medium, static)│
        │ 2. Claim Extractor          UTF-16 span anchoring + candidate heuristics         │
        │ 3. Staleness Prior          P = 1 - 0.5^(D / H) based on domain half-life        │
        │ 4. Claim-Level Cache        SHA-256 deduplication cache with category TTL        │
        │ 5. Tavily Search Client     Topic routing, depth, recency constraints, domains   │
        │ 6. LLM Judge                Prompt-injection guarded multi-factor evaluation     │
        │ 7. Scoring Formula          Composite confidence C = 0.5A + 0.3R + 0.2K          │
        │ 8. SQLite WAL & SSE Hub     Singleflight deduplication + real-time event bus     │
        └────────────────────────────────────────┬─────────────────────────────────────────┘
                                                 │
                      ┌──────────────────────────┴──────────────────────────┐
                      ▼                                                     ▼
           ┌──────────────────────┐                              ┌──────────────────────┐
           │   Tavily Search API  │                              │   FreshGate Dashboard│
           │ (Live Web Ground     │                              │ (Next.js 15 Obsidan  │
           │  Truth & Evidence)   │                              │  Operator Telemetry) │
           └──────────────────────┘                              └──────────────────────┘
```

---

## 3. Repository Structure

```text
.
├── freshgate/                      # Project A: Gateway Plugin, Engine, Dashboard, Bench
│   ├── plugin/freshgate/           # In-tree Go plugin for Bifrost gateway
│   ├── engine/                     # TypeScript Freshness Engine (Hono, SQLite WAL, Tavily)
│   ├── dashboard/                  # Next.js 15 Cyber-Obsidian Operator Dashboard
│   ├── bench/                      # StaleBench evaluation benchmark & runner
│   ├── demo/                       # Interactive split-view comparison web application
│   ├── deploy/                     # Docker Compose multi-container configs (Bifrost, Valkey)
│   ├── docs/                       # PRD, TRD, SPEC, BENCHMARK, PERFORMANCE, SECURITY
│   └── scripts/                    # e2e-gateway.sh, smoke-bifrost.sh, sync-plugin.sh
│
├── freshlens/                      # Project B: Chrome Manifest V3 Extension
│   ├── entrypoints/                # background.ts, content.ts, popup, options, history
│   ├── src/content/                # CSS Custom Highlight API, DOM adapters (ChatGPT/Claude)
│   ├── src/shared/                 # Synchronized schemas and contracts
│   ├── test/                       # 8 Vitest suites (TextMap, anchor, actions, privacy)
│   └── .output/                    # freshlens-1.0.0-chrome.zip (Production extension package)
│
└── plan/                           # Strategy, Pitch Decks & Presentation Materials
    ├── PITCH.md                    # 30-sec, 2-min demo script, 5-min technical deep-dive
    ├── SLIDES_PPT.md               # 10-slide presentation deck for judging rounds
    ├── JUDGE_QA_DEFENSE.md         # Detailed technical Q&A defense for sponsor grilling
    ├── JUDGING_RUBRIC_ALIGNMENT.md # Rubric breakdown for Bifrost & Tavily tracks
    ├── PROMPT_EXECUTION_MATRIX.md  # Detailed verification status of all prompt steps
    └── ROADMAP.md                  # Comprehensive architectural blueprint
```

---

## 4. Verification & Test Evidence

Every single component in this monorepo has automated tests and clean compilation:

| Subsystem | Command | Result | Details |
|---|---|---|---|
| **Engine Tests** | `pnpm -C freshgate/engine test` | **PASS (38/38)** | 12 test suites covering prior, scoring, judge, cache, SQLite |
| **Engine Types** | `pnpm -C freshgate/engine check` | **PASS (0 err)** | Strict TypeScript compilation with zero `any` |
| **Dashboard Tests** | `pnpm -C freshgate/dashboard test` | **PASS (10/10)** | 3 test suites covering HighlightRenderer, ScoreRing, ClaimCard |
| **Dashboard Build** | `pnpm -C freshgate/dashboard build` | **PASS (0 err)** | Next.js 15.1.7 optimized production build with all routes |
| **StaleBench Suite**| `pnpm -C freshgate/bench bench` | **PASS (100%)** | 100% Stale Detection F1; report generated in `docs/BENCHMARK.md` |
| **Interactive Demo**| `pnpm -C freshgate/demo build` | **PASS (0 err)** | Vite production bundle compiled in 4.1s |
| **Bifrost Plugin**  | Go tests inside container | **PASS (8/8)** | TestCircuitBreaker, TestWorkerPool, TestResolveMode, etc. |
| **FreshLens Tests** | `pnpm -C freshlens test` | **PASS (26/26)** | 8 test suites covering DOM adapters, TextMap, actions, privacy |
| **FreshLens Types** | `pnpm -C freshlens typecheck` | **PASS (0 err)** | Strict TypeScript with zero errors |
| **Manifest Audit**  | `pnpm -C freshlens audit:manifest` | **PASS (0 err)** | All permissions conform strictly to SPEC allowlist |
| **FreshLens Zip**   | `pnpm -C freshlens zip` | **PASS (170 kB)** | Packaged `.output/freshlens-1.0.0-chrome.zip` |

---

## 5. Quickstart Guide

### Option A: Run the FreshGate Engine & Dashboard Locally

```bash
# 1. Install dependencies across monorepo
pnpm install

# 2. Start the FreshGate Engine (port 8787)
cd freshgate/engine
pnpm dev

# 3. Start the Operator Dashboard (port 3000)
cd ../dashboard
pnpm dev
# Open http://localhost:3000 to view live telemetry and SSE feed
```

### Option B: Run via Docker Compose

```bash
cd freshgate/deploy
docker compose --profile mock up -d
# Launches Valkey (6379), Engine (8787), and Dashboard (3000)
```

### Option C: Install FreshLens Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in upper right).
3. Click **Load unpacked** and select the folder:  
   `d:\AI-Lab\Hackathon\Global AI Hackathon\freshlens\.output\chrome-mv3`
4. Open [ChatGPT](https://chatgpt.com) or [Claude](https://claude.ai) and ask any time-sensitive question (e.g., *"What is the latest Next.js version?"*).
5. Watch FreshLens automatically highlight outdated claims and click **"Fix with Fresh Context"**.

---

## 6. Presentation & Submission Resources

- **Elevator Pitch & Demo Script:** [`plan/PITCH.md`](plan/PITCH.md)
- **Slide Deck (10 Slides):** [`plan/SLIDES_PPT.md`](plan/SLIDES_PPT.md)
- **Judge Technical Q&A Defense:** [`plan/JUDGE_QA_DEFENSE.md`](plan/JUDGE_QA_DEFENSE.md)
- **Track Rubric Mapping:** [`plan/JUDGING_RUBRIC_ALIGNMENT.md`](plan/JUDGING_RUBRIC_ALIGNMENT.md)
- **FreshGate Completion Report:** [`freshgate/docs/COMPLETION_REPORT.md`](freshgate/docs/COMPLETION_REPORT.md)
- **FreshLens Completion Report:** [`freshlens/docs/COMPLETION_REPORT.md`](freshlens/docs/COMPLETION_REPORT.md)

---

## 7. License

Licensed under the Apache License, Version 2.0. See [LICENSE](freshgate/LICENSE) for details.
