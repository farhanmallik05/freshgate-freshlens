import { StatsResponse, VerifyResponse } from "../types";

export const IS_DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO === "1" ||
  (typeof window !== "undefined" && localStorage.getItem("fg_demo_mode") === "1");

export async function fetchVerifications(
  limit = 20,
  band?: string,
  model?: string
): Promise<{ items: VerifyResponse[]; next_cursor: string | null }> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (band && band !== "all") params.set("band", band);
    if (model && model !== "all") params.set("model", model);

    const res = await fetch(`/api/engine/v1/verifications?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Failed fetching verifications, falling back to mock data", err);
    return { items: getMockVerifications(), next_cursor: null };
  }
}

export async function fetchStats(window: "1h" | "24h" | "7d" = "24h"): Promise<StatsResponse> {
  try {
    const res = await fetch(`/api/engine/v1/stats?window=${window}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Failed fetching stats, falling back to mock data", err);
    return getMockStats();
  }
}

export async function requestVerification(
  text: string,
  options?: { max_claims?: number; depth?: "fast" | "thorough" }
): Promise<VerifyResponse> {
  const isDemo =
    typeof window !== "undefined" && localStorage.getItem("fg_demo_mode") === "1";
  if (isDemo) {
    return getMockVerifications()[0];
  }

  try {
    const res = await fetch("/api/engine/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        options: {
          max_claims: options?.max_claims || 5,
          depth: options?.depth || "fast",
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Engine verification request failed or offline, using fallback mock", err);
    return getMockVerifications()[0];
  }
}

export async function checkEngineReady(): Promise<{ ok: boolean; version?: string }> {
  try {
    const res = await fetch("/api/engine/readyz");
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export function getMockVerifications(): VerifyResponse[] {
  return [
    {
      id: "vrf_demo_01",
      status: "completed",
      created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      latency_ms: 184,
      overall: {
        score: 28,
        band: "stale",
        claims_total: 2,
        claims_checked: 2,
        stale_count: 1,
        unverifiable_count: 0,
      },
      context: {
        model: "gpt-4o",
        provider: "openai",
        source: "bifrost",
      },
      usage: {
        tavily_credits: 2,
        llm_tokens: { in: 180, out: 65 },
        cache_hits: 0,
      },
      corrected_text:
        "The current version of Next.js is 15 and ChatGPT Plus is $20 per month.\n\n---\n**Freshness check (FreshGate):** 1 claim(s) may be outdated.\n- ~~Next.js 14 is the latest version~~ -> Next.js 15 is current (nextjs.org, 2026-10-24)",
      claims: [
        {
          claim: {
            id: "c1",
            text: "Next.js 14 is the latest version",
            normalized: "Next.js 14 is the latest version",
            category: "version_release",
            span: { start: 0, end: 32 },
            salience: "core",
          },
          verdict: "stale",
          freshness: 24,
          band: "stale",
          correction: "Next.js 15 is current",
          reasoning: "Next.js 15 was officially announced and released at Next.js Conf.",
          judge_confidence: 0.96,
          supporting_evidence_ids: ["e1"],
          cache: { hit: false, age_s: null },
          status: "ok",
          evidence: [
            {
              id: "e1",
              title: "Next.js 15 Release Notes",
              url: "https://nextjs.org/blog/next-15",
              domain: "nextjs.org",
              snippet: "Next.js 15 is now generally available with React 19 support and Turbopack.",
              published_date: "2026-10-24T00:00:00Z",
              retrieved_at: new Date().toISOString(),
              authority: "official",
              score: 0.98,
            },
          ],
        },
        {
          claim: {
            id: "c2",
            text: "ChatGPT Plus is $20 per month",
            normalized: "ChatGPT Plus is $20 per month",
            category: "pricing",
            span: { start: 37, end: 66 },
            salience: "core",
          },
          verdict: "current",
          freshness: 94,
          band: "fresh",
          correction: null,
          reasoning: "Confirmed current standard consumer Plus subscription price is $20/month.",
          judge_confidence: 0.95,
          supporting_evidence_ids: ["e2"],
          cache: { hit: false, age_s: null },
          status: "ok",
          evidence: [
            {
              id: "e2",
              title: "OpenAI ChatGPT Pricing",
              url: "https://openai.com/chatgpt/pricing",
              domain: "openai.com",
              snippet: "ChatGPT Plus: $20 / month for access to GPT-4o and advanced analysis.",
              published_date: "2026-10-01T00:00:00Z",
              retrieved_at: new Date().toISOString(),
              authority: "official",
              score: 0.99,
            },
          ],
        },
      ],
    },
    {
      id: "vrf_demo_02",
      status: "completed",
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      latency_ms: 112,
      overall: {
        score: 96,
        band: "fresh",
        claims_total: 1,
        claims_checked: 1,
        stale_count: 0,
        unverifiable_count: 0,
      },
      context: {
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        source: "extension",
      },
      usage: {
        tavily_credits: 0,
        llm_tokens: { in: 120, out: 40 },
        cache_hits: 1,
      },
      corrected_text: null,
      claims: [
        {
          claim: {
            id: "c3",
            text: "Satya Nadella is the CEO of Microsoft",
            normalized: "Satya Nadella is the CEO of Microsoft",
            category: "leadership_role",
            span: { start: 0, end: 38 },
            salience: "core",
          },
          verdict: "current",
          freshness: 96,
          band: "fresh",
          correction: null,
          reasoning: "Satya Nadella remains the active Chairman and CEO of Microsoft Corporation.",
          judge_confidence: 0.99,
          supporting_evidence_ids: ["e3"],
          cache: { hit: true, age_s: 3600 },
          status: "ok",
          evidence: [
            {
              id: "e3",
              title: "Microsoft Leadership Team",
              url: "https://news.microsoft.com/exec",
              domain: "microsoft.com",
              snippet: "Satya Nadella is Chairman and Chief Executive Officer of Microsoft.",
              published_date: "2026-09-15T00:00:00Z",
              retrieved_at: new Date().toISOString(),
              authority: "official",
              score: 0.99,
            },
          ],
        },
      ],
    },
  ];
}

export function getMockStats(): StatsResponse {
  return {
    totals: {
      verifications: 1420,
      claims_total: 3105,
      claims_checked: 2840,
      stale_count: 480,
      unverifiable_count: 65,
    },
    stale_rate: 0.169,
    by_model: [
      { model: "gpt-4o", total: 620, stale_rate: 0.14, avg_score: 84 },
      { model: "claude-3-5-sonnet", total: 450, stale_rate: 0.12, avg_score: 87 },
      { model: "llama-3.1-70b", total: 350, stale_rate: 0.28, avg_score: 71 },
    ],
    by_category: [
      { category: "version_release", total: 920, stale_rate: 0.31 },
      { category: "pricing", total: 780, stale_rate: 0.22 },
      { category: "leadership_role", total: 410, stale_rate: 0.08 },
      { category: "event_status", total: 390, stale_rate: 0.18 },
      { category: "statistic_metric", total: 340, stale_rate: 0.11 },
    ],
    band_distribution: {
      fresh: 980,
      aging: 260,
      stale: 180,
    },
    latency_ms: {
      p50: 165,
      p95: 390,
    },
    cache_hit_rate: 0.42,
    tavily_credits: 1640,
    credits_per_claim: 0.58,
    llm_tokens: {
      in: 412000,
      out: 148000,
    },
    top_stale_claims: [
      {
        normalized: "Next.js 14 is the latest version",
        count: 78,
        latest_correction: "Next.js 15 is current",
      },
      {
        normalized: "Claude 3 Opus is Anthropic's flagship model",
        count: 45,
        latest_correction: "Claude 3.5 Sonnet is now the lead flagship",
      },
      {
        normalized: "Python 3.11 is the newest stable release",
        count: 39,
        latest_correction: "Python 3.12 and 3.13 are released",
      },
    ],
    series: [
      { bucket: "00:00", verifications: 52, stale_rate: 0.15, avg_score: 83 },
      { bucket: "04:00", verifications: 38, stale_rate: 0.18, avg_score: 81 },
      { bucket: "08:00", verifications: 110, stale_rate: 0.16, avg_score: 84 },
      { bucket: "12:00", verifications: 185, stale_rate: 0.14, avg_score: 85 },
      { bucket: "16:00", verifications: 210, stale_rate: 0.19, avg_score: 80 },
      { bucket: "20:00", verifications: 145, stale_rate: 0.17, avg_score: 82 },
    ],
  };
}
