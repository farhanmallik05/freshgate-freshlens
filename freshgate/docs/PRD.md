# FreshGate Product Requirements Document (PRD)

## 1. Problem Statement
Foundation models are frozen snapshots of their training data. When queried on dynamic, high-volatility domains (software version releases, API pricing, executive leadership, regulatory policies, service availability), LLMs hallucinate outdated information. Moreover, semantic caches deployed in front of LLMs cache these obsolete completions, compounding the issue by serving stale answers repeatedly for days or weeks.

## 2. Target Users
- **LLM Gateway Operators:** Developers and platform teams routing traffic through the Bifrost LLM gateway who require reliable, up-to-date responses, volatility-aware cache invalidation, and observable freshness metrics without rewriting application code.
- **Chatbot End Users & Analysts:** End-users querying chatbots (ChatGPT, Claude, custom corporate portals) who need real-time verification, confidence scores, and authoritative citations for time-sensitive claims.

## 3. Goals
- Extract atomic, verifiable factual claims from raw LLM outputs.
- Classify prompt volatility in < 2ms without network overhead and set intelligent semantic-cache TTLs.
- Live-verify volatile claims against the web via the Tavily Search API.
- Compute mathematically continuous freshness scores (0–100) per claim and across the completion.
- Fail open: gateway operations must never block, error out, or introduce significant latency (> 2ms async overhead) due to verification failure.
- Provide a developer dashboard and benchmark (StaleBench) to measure detection accuracy and credit savings.

## 4. Non-Goals
- Real-time fact-checking of creative fiction, poetry, or opinion.
- Replacing the LLM's primary knowledge base for evergreen concepts (basic math, history, syntax).
- Arbitrary unconstrained web crawling beyond authoritative search snippets and targeted documentation pages.

## 5. Success Metrics
- **Stale Claim Detection Recall:** $\ge 85\%$ on StaleBench.
- **Evergreen False Positive Rate:** $< 5\%$.
- **Gateway Async P95 Overhead:** $< 2\text{ ms}$.
- **Credit Reduction via Claim Cache:** $\ge 60\%$ on repeated queries.
