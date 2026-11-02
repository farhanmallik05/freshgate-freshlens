import { describe, it, expect, vi, beforeEach } from "vitest";
import { CachedClaimVerifier, computeClaimHash } from "../src/cache.js";
import { Claim, ClaimResult } from "../src/contract/schemas.js";
import { ClaimVerifier } from "../src/verify.js";
import { initDatabase } from "../src/db/repo.js";

describe("Claim Cache & Singleflight", () => {
  beforeEach(() => {
    initDatabase(":memory:");
  });

  const sampleClaim: Claim = {
    id: "clm_1",
    text: "ChatGPT Plus is $20/month",
    normalized: "ChatGPT Plus is $20 per month",
    category: "pricing",
    span: [0, 25],
    salience: "core",
  };

  const sampleResult: ClaimResult = {
    claim: sampleClaim,
    verdict: "current",
    freshness: 98,
    band: "fresh",
    correction: null,
    evidence: [],
    supporting_evidence_ids: [],
    judge_confidence: 0.95,
    reasoning: "Confirmed price is $20/month",
    cache: { hit: false, age_s: null },
    status: "ok",
  };

  it("computes deterministic hash for normalized claim + category", () => {
    const h1 = computeClaimHash("ChatGPT Plus is $20/month", "pricing");
    const h2 = computeClaimHash("chatgpt plus is $20/month", "pricing");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("caches delegate verification result and serves on subsequent calls", async () => {
    let callCount = 0;
    const mockVerifier: ClaimVerifier = {
      verify: vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          result: { ...sampleResult },
          credits: 1,
          tokens: { in: 100, out: 50 },
        };
      }),
    };

    const cachedVerifier = new CachedClaimVerifier(mockVerifier);
    const nowISO = new Date().toISOString();

    // Call 1: Miss
    const r1 = await cachedVerifier.verify(sampleClaim, "fast", nowISO);
    expect(r1.result.cache.hit).toBe(false);
    expect(r1.credits).toBe(1);
    expect(callCount).toBe(1);

    // Call 2: Hit
    const r2 = await cachedVerifier.verify(sampleClaim, "fast", nowISO);
    expect(r2.result.cache.hit).toBe(true);
    expect(r2.credits).toBe(0);
    expect(callCount).toBe(1); // not called again

    // Call 3 with nocache: bypass
    const r3 = await cachedVerifier.verify(sampleClaim, "fast", nowISO, true);
    expect(r3.result.cache.hit).toBe(false);
    expect(callCount).toBe(2);
  });

  it("deduplicates concurrent in-flight requests via singleflight", async () => {
    let callCount = 0;
    const mockVerifier: ClaimVerifier = {
      verify: vi.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          result: { ...sampleResult },
          credits: 1,
          tokens: { in: 100, out: 50 },
        };
      }),
    };

    const cachedVerifier = new CachedClaimVerifier(mockVerifier);
    const nowISO = new Date().toISOString();

    const [res1, res2, res3] = await Promise.all([
      cachedVerifier.verify(sampleClaim, "fast", nowISO),
      cachedVerifier.verify(sampleClaim, "fast", nowISO),
      cachedVerifier.verify(sampleClaim, "fast", nowISO),
    ]);

    expect(callCount).toBe(1);
    expect(res1.result.verdict).toBe("current");
    expect(res2.result.verdict).toBe("current");
    expect(res3.result.verdict).toBe("current");
  });
});
