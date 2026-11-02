import { describe, it, expect, beforeEach } from "vitest";
import { initDatabase, saveVerification } from "../src/db/repo.js";
import { computeStats } from "../src/stats.js";
import { VerifyResponse } from "../src/contract/schemas.js";

describe("Database Repo and Stats", () => {
  beforeEach(() => {
    initDatabase(":memory:");
  });

  const mockResponse: VerifyResponse = {
    id: "vrf_test_1",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 250,
    overall: {
      score: 95,
      band: "fresh",
      claims_total: 1,
      claims_checked: 1,
      stale_count: 0,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "clm_1",
          text: "Python 3.12 is released",
          normalized: "Python 3.12 is released",
          category: "version_release",
          span: [0, 23],
          salience: "core",
        },
        verdict: "current",
        freshness: 95,
        band: "fresh",
        correction: null,
        evidence: [],
        supporting_evidence_ids: [],
        judge_confidence: 0.95,
        reasoning: "Python 3.12 is current",
        cache: { hit: false, age_s: null },
        status: "ok",
      },
    ],
    corrected_text: null,
    usage: {
      tavily_credits: 1,
      llm_tokens: { in: 150, out: 40 },
      cache_hits: 0,
    },
    context: {
      model: "gpt-4o",
      provider: "openai",
    },
  };

  it("calculates metrics from recorded verifications", () => {
    saveVerification(mockResponse);

    const staleResponse: VerifyResponse = {
      ...mockResponse,
      id: "vrf_test_2",
      overall: {
        score: 30,
        band: "stale",
        claims_total: 1,
        claims_checked: 1,
        stale_count: 1,
        unverifiable_count: 0,
      },
      claims: [
        {
          claim: {
            id: "clm_2",
            text: "Python 3.11 is the newest version",
            normalized: "Python 3.11 is the newest version",
            category: "version_release",
            span: [0, 32],
            salience: "core",
          },
          verdict: "stale",
          freshness: 20,
          band: "stale",
          correction: "Python 3.12 is out",
          evidence: [],
          supporting_evidence_ids: [],
          judge_confidence: 0.9,
          reasoning: "Python 3.12 is newer",
          cache: { hit: false, age_s: null },
          status: "ok",
        },
      ],
      latency_ms: 450,
      usage: {
        tavily_credits: 2,
        llm_tokens: { in: 200, out: 50 },
        cache_hits: 0,
      },
      context: {
        model: "claude-3-5-sonnet",
        provider: "anthropic",
      },
    };
    saveVerification(staleResponse);

    const stats = computeStats("24h");
    expect(stats.totals.verifications).toBe(2);
    expect(stats.totals.claims_total).toBe(2);
    expect(stats.totals.stale_count).toBe(1);
    expect(stats.stale_rate).toBe(0.5);
    expect(stats.band_distribution.fresh).toBe(1);
    expect(stats.band_distribution.stale).toBe(1);
    expect(stats.by_model.find((m) => m.model === "gpt-4o")?.total).toBe(1);
    expect(stats.latency_ms.p50).toBeGreaterThanOrEqual(250);
  });
});
