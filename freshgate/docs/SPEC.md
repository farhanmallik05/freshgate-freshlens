FRESHGATE SPEC v1.0 (source of truth; change only with a CHANGELOG line)

1. PURPOSE
Detect time-sensitive claims in any LLM answer, verify each against the live web with Tavily, return per-claim freshness (0-100), verdict, correction and sources. Surfaces: Bifrost plugin "freshgate", Chrome extension "FreshLens", REST API, dashboard.

2. TERMS
claim = atomic, checkable statement whose truth can change over time. verdict = current | stale | unverifiable. band = fresh (>=75) | aging (45-74) | stale (<45). now = request time in UTC unless options.now is set.

3. CATEGORIES AND VOLATILITY RULES (shared/volatility-rules.json mirrors this; regexes must be RE2-compatible: no lookarounds, no backreferences, so Go and JS agree)
id | half_life_days | claim_cache_ttl_s | tavily topic | time_range | max_age_hours | meaning
pricing | 45 | 21600 | general | none | 24 | prices, plans, quotas, rate limits, free tiers
version_release | 60 | 43200 | general | none | 24 | versions, releases, deprecations, model names, "latest"
leadership_role | 365 | 86400 | news | year | none | CEO, president, officeholder, who leads X
law_policy | 365 | 172800 | general | none | none | laws, regulations, tax rates, eligibility rules
statistic_metric | 180 | 259200 | general (finance for market cap/stock) | none | none | populations, user counts, market caps, benchmark numbers
event_status | 14 | 3600 | news | month | 1 | ongoing events, outages, availability ("still available"), schedules, scores
record_ranking | 365 | 604800 | general | none | none | records, rankings, "largest", "#1"
other_volatile | 120 | 21600 | general | none | none | other time-dependent facts
evergreen | none | 2592000 | n/a | n/a | n/a | stable facts: NOT verified, reported as skipped_evergreen
Prompt volatility classes (decided from the PROMPT text only, no network; drive semantic-cache TTL):
realtime -> no caching (x-bf-cache-no-store: true) | high -> 3600 s | medium -> 86400 s | low -> 604800 s | static -> 2592000 s
Cues: realtime = right now, today, tonight, live, breaking, score, stock price; high = latest, current, currently, price, pricing, cost, version, release, who is the CEO, new, this year; medium = policy, law, rate, statistics, population, ranking; low = general explanations mentioning named entities; static = definitions, math, code without versions, history.

4. DATA CONTRACTS (zod in engine/src/contract/schemas.ts is canonical; JSON fields are snake_case)
Claim { id: "c1"..., text: verbatim substring of the input, span: {start,end} | null (UTF-16 offsets into the input text), normalized: standalone restatement, category, claimed_as_of: "YYYY-MM-DD" | null, entities: string[], query: string, official_domains: string[] (max 3, hints), prior: number 0..1 }
Evidence { id: "e1"..., url, domain, title, snippet, published_date: ISO | null, retrieved_at: ISO, authority: official | reputable | community | unknown, score: number }
ClaimResult { claim, verdict, freshness: int 0..100, band, correction: string | null, evidence: Evidence[], supporting_evidence_ids: string[], judge_confidence: 0..1, reasoning: string (<= 240 chars), cache: { hit: bool, age_s: int | null }, status: ok | skipped_evergreen | skipped_limit | budget_exhausted | search_failed | judge_failed }
VerifyRequest { text: string (1..20000), context?: { request_id?, prompt?, model?, provider?, answered_at?: ISO, knowledge_cutoff?: "YYYY-MM", source?: bifrost | extension | api | bench | dashboard }, options?: { max_claims?: 1..10 (default 5), depth?: fast | thorough (default fast), now?: ISO, include_evidence?: bool (default true), nocache?: bool } }
VerifyResponse { id: "vrf_<ulid>", status: completed | partial | failed, created_at: ISO, latency_ms: int, overall: { score: 0..100, band, claims_total, claims_checked, stale_count, unverifiable_count }, claims: ClaimResult[], corrected_text: string | null, usage: { tavily_credits: number, llm_tokens: { in: int, out: int }, cache_hits: int }, context: echoed }
AsyncAccepted { id, status: "queued" }. GET /v1/verifications/:id returns VerifyResponse or { id, status: queued | running | failed, error? }
ErrorBody { error: { code, message, request_id } }; codes: invalid_request, unauthorized, rate_limited, budget_exhausted, upstream_failed, internal

5. ENGINE API (JSON; Authorization: Bearer <ENGINE_API_KEY> whenever ENGINE_API_KEY is set)
GET /healthz -> {"ok":true,"version":string}; GET /readyz -> checks db + config
POST /v1/verify -> VerifyResponse (sync; honors ENGINE_VERIFY_TIMEOUT_MS; partial results allowed)
POST /v1/verify/async -> 202 AsyncAccepted; GET /v1/verifications/:id
GET /v1/verifications?limit=&cursor=&model=&band=&source=&since= -> { items: VerifyResponse[], next_cursor }
GET /v1/stats?window=1h|24h|7d -> { totals, stale_rate, by_model[], by_category[], band_distribution, latency_ms: {p50,p95}, cache_hit_rate, tavily_credits, credits_per_claim, llm_tokens, top_stale_claims[], series[] }
GET /v1/events -> SSE: verification.started | verification.completed | verification.failed | stats.tick (Last-Event-ID replays the last 50)
POST /v1/classify-prompt { prompt } -> { volatility: realtime | high | medium | low | static, suggested_cache_ttl_s: int | null, no_store: bool, categories: string[] }
POST /v1/extract { text, options? } -> { claims: Claim[] } (debug)
GET /openapi.json

6. SCORING (implement exactly; golden tests required)
prior P = 1 - 0.5^(D/H), H = category half_life_days, D = days from the later of knowledge_cutoff and claimed_as_of (whichever exist) to now; if neither exists D = 270. evergreen -> P = 0.
authority weight A: official 1.0, reputable 0.8, community 0.5, unknown 0.3 (A = max over supporting evidence; 0 if none).
recency R = 0.5^(age_days/H) for the freshest supporting evidence (age from published_date; unknown date -> R = 0.5).
judge confidence K in 0..1 (from the judge).
C = clamp(0.5*A + 0.3*R + 0.2*K, 0, 1).
freshness: current -> round(100*(0.6 + 0.4*C) - 10*P); stale -> round(30*(1 - C)); unverifiable -> round(55*(1 - P)); clamp 0..100.
band: fresh >= 75, aging 45..74, stale < 45.
overall.score = round(0.5*min + 0.5*mean) over CHECKED claims only; if none were checked: score 100, band fresh, claims_checked 0.
Claim selection: skip evergreen (status skipped_evergreen); rank by P descending, then category weight (pricing, version_release, event_status highest); verify the top max_claims; the rest get status skipped_limit.

7. CORRECTION BLOCK (corrected_text, and plugin "correct" mode in append style; exact format, real line breaks)
<original text>
<blank line>
---
**Freshness check (FreshGate):** {n} claim(s) may be outdated.
- ~~{claim.text}~~ -> {correction} ([{domain}]({url}), {YYYY-MM-DD or "undated"})
(repeat the bullet line once per stale claim that has a correction; n = number of such bullets; no trailing newline)

8. BIFROST PLUGIN CONTRACT (plugin name "freshgate")
Request headers: x-freshgate-mode: off | async | sync | correct (default from config); x-freshgate-max-claims; x-freshgate-depth.
Response headers: x-freshgate-id (fg_<ulid>); x-freshgate-status: queued | completed | timeout | skipped | error | off | breaker_open; x-freshgate-score, x-freshgate-band, x-freshgate-stale-claims (sync and correct modes only).
The engine's own LLM calls MUST send x-freshgate-mode: off (prevents recursion). The plugin is fail-open: engine errors never fail the user's request, and async mode adds no network wait.
Cache control: only when the request carries x-bf-cache-key. If the client did not set x-bf-cache-ttl, the plugin sets it from prompt volatility; realtime -> x-bf-cache-no-store: true. The plugin's PreLLMHook must run before Bifrost's semantic cache and its PostLLMHook after it. Never mutate a response object other plugins may cache: copy before correcting.
Plugin config (plugins[] entry, name "freshgate"): engine_url, engine_api_key, default_mode (async), timeout_ms (4000), max_claims (5), min_chars (120), worker_pool (8), queue_size (256), breaker { failures: 5, open_s: 30 }, correction_style (append | inline), model_cutoffs { "<model>": "YYYY-MM" }, rules_path, verify_cache_hits (true).

9. ENV VARS (.env.example)
TAVILY_API_KEY; ENGINE_LLM_BASE_URL (default http://bifrost:8080/v1); ENGINE_LLM_API_KEY; ENGINE_LLM_MODEL_EXTRACT; ENGINE_LLM_MODEL_JUDGE; ENGINE_API_KEY; ENGINE_PORT=8787; ENGINE_DB_PATH=./data/engine.db; ENGINE_MOCK=0|1; ENGINE_VERIFY_TIMEOUT_MS=20000; TAVILY_CREDIT_BUDGET_PER_HOUR=300; ENGINE_CORS_ORIGINS=*; BIFROST_URL=http://localhost:8080; provider keys for Bifrost (OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY as available).

10. REPO LAYOUT
freshgate/{AGENTS.md, GEMINI.md, CLAUDE.md, Makefile, package.json, docs/, shared/{volatility-rules.json, authority.json, fixtures/}, engine/{src/{contract,config,llm,rules,prior,extract,classify,tavily,evidence,query,judge,score,verify,cache,queue,stats,events,server,index,client}.ts, src/db/, test/}, plugin/freshgate/ (Go), dashboard/ (Next.js), bench/, demo/, deploy/{docker-compose.yml, bifrost/config.json}, scripts/}
