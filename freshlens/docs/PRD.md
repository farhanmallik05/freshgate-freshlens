# FreshLens: Product Requirements Document (PRD)

## 1. Problem Statement
Frontier AI models (ChatGPT, Claude, Gemini) provide fluent, authoritative-sounding answers that silently contain outdated facts, shifted pricing, deprecated APIs, superseded regulations, or changed leadership. End users copy and rely on these statements without knowing which specific sentences have gone stale since the model's knowledge cutoff.

## 2. Product Vision
FreshLens is a zero-friction Chrome Manifest V3 browser extension that brings live truth-checking directly into existing AI chat interfaces. As soon as an assistant completes its answer on ChatGPT, Claude, or a custom LLM portal, FreshLens identifies factual claims, checks them against the live web via the FreshGate Engine / Tavily API, and highlights claims directly in the chat UI with exact freshness scores and source citations.

## 3. Users & Personas
- **Engineers & Architects:** Querying technical documentation, library versions, and cloud provider pricing.
- **Researchers & Analysts:** Checking executive appointments, regulatory updates, statistics, and economic data.
- **Casual Chatbot Users:** Needing immediate confidence that an answer isn't based on outdated training data.

## 4. Key Goals
1. **Live Highlighting:** Zero-click inline highlighting inside ChatGPT and Claude answer bubbles.
2. **Accessible Semantics:** Freshness bands expressed through color AND patterns (solid underline for fresh >=75, dashed underline for aging 45-74, wavy underline for stale <45).
3. **Shadow DOM Isolation:** Floating inspection card and claim popover rendered inside an isolated Shadow DOM (`#freshlens-root`) with zero CSS leakage into host applications.
4. **Actionable Remediation:** One-click "Fix with fresh context" that inserts an evidence-grounded rewrite prompt into the chat input without auto-submitting.
5. **Zero Host Leakage:** Strict privacy: only assistant text is sent to the configured engine; never page URLs, session tokens, or user prompts (unless explicitly toggled).
6. **Instant Offline Demo:** Embedded demo mode with deterministic fixtures for 100% reliable hackathon judging and offline evaluations.

## 5. Non-Goals
- Real-time token-by-token streaming interception (waits for message completion to avoid layout jitter).
- Replacing full chatbot conversations (operates strictly as an auxiliary inspector).
- Supporting unsupported proprietary desktop clients.

## 6. Success Metrics
- Highlight rendering latency < 50ms for 10 claims.
- 0% layout shift or CSS breakage on host websites.
- Zero serious/critical axe accessibility violations.
