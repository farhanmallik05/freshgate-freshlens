import { describe, it, expect } from "vitest";
import {
  computeClaimFreshness,
  computeOverallScore,
  getBand,
  computeCompositeConfidence,
} from "../src/score.js";
import { ClaimResult } from "../src/contract/schemas.js";

describe("Scoring Mathematical Golden Tests", () => {
  // Hand-computed golden cases across current / stale / unverifiable
  // Formulas:
  // current: round(100*(0.6 + 0.4*C) - 10*P)
  // stale: round(30*(1 - C))
  // unverifiable: round(55*(1 - P))
  // band: fresh >= 75, aging 45..74, stale < 45

  const goldenCases = [
    // Case 1: current, P = 0, C = 1.0 -> 100*(0.6 + 0.4) - 0 = 100 (fresh)
    { verdict: "current" as const, P: 0, C: 1.0, expectedScore: 100, expectedBand: "fresh" },
    // Case 2: current, P = 0.5, C = 0.5 -> 100*(0.6 + 0.2) - 5 = 75 (fresh edge)
    { verdict: "current" as const, P: 0.5, C: 0.5, expectedScore: 75, expectedBand: "fresh" },
    // Case 3: current, P = 0.8, C = 0.4 -> 100*(0.6 + 0.16) - 8 = 68 (aging)
    { verdict: "current" as const, P: 0.8, C: 0.4, expectedScore: 68, expectedBand: "aging" },
    // Case 4: current, P = 1.0, C = 0.0 -> 100*(0.6) - 10 = 50 (aging)
    { verdict: "current" as const, P: 1.0, C: 0.0, expectedScore: 50, expectedBand: "aging" },

    // Case 5: stale, C = 0.0 -> 30*(1 - 0) = 30 (stale)
    { verdict: "stale" as const, P: 0.2, C: 0.0, expectedScore: 30, expectedBand: "stale" },
    // Case 6: stale, C = 0.5 -> 30*(1 - 0.5) = 15 (stale)
    { verdict: "stale" as const, P: 0.7, C: 0.5, expectedScore: 15, expectedBand: "stale" },
    // Case 7: stale, C = 1.0 -> 30*(1 - 1.0) = 0 (stale)
    { verdict: "stale" as const, P: 0.9, C: 1.0, expectedScore: 0, expectedBand: "stale" },
    // Case 8: stale, C = 0.33 -> 30*(0.67) = 20 (stale)
    { verdict: "stale" as const, P: 0.5, C: 0.33, expectedScore: 20, expectedBand: "stale" },

    // Case 9: unverifiable, P = 0.0 -> 55*(1 - 0) = 55 (aging)
    { verdict: "unverifiable" as const, P: 0.0, C: 0.5, expectedScore: 55, expectedBand: "aging" },
    // Case 10: unverifiable, P = 0.2 -> 55*(0.8) = 44 (stale edge!)
    { verdict: "unverifiable" as const, P: 0.2, C: 0.5, expectedScore: 44, expectedBand: "stale" },
    // Case 11: unverifiable, P = 0.5 -> 55*(0.5) = 28 (stale)
    { verdict: "unverifiable" as const, P: 0.5, C: 0.5, expectedScore: 28, expectedBand: "stale" },
    // Case 12: unverifiable, P = 1.0 -> 55*(0) = 0 (stale)
    { verdict: "unverifiable" as const, P: 1.0, C: 0.5, expectedScore: 0, expectedBand: "stale" },
  ];

  it("verifies >= 12 golden cases with exact formula adherence", () => {
    expect(goldenCases.length).toBe(12);
    for (const gc of goldenCases) {
      const res = computeClaimFreshness(gc.verdict, gc.P, gc.C);
      expect(res.freshness).toBe(gc.expectedScore);
      expect(res.band).toBe(gc.expectedBand);
    }
  });

  it("tests band boundary edges strictly (44/45 and 74/75)", () => {
    expect(getBand(44)).toBe("stale");
    expect(getBand(45)).toBe("aging");
    expect(getBand(74)).toBe("aging");
    expect(getBand(75)).toBe("fresh");
  });

  it("computes overall score over checked claims only", () => {
    // If no claims checked, returns 100 fresh
    const emptyOverall = computeOverallScore([]);
    expect(emptyOverall.score).toBe(100);
    expect(emptyOverall.band).toBe("fresh");
    expect(emptyOverall.claims_checked).toBe(0);

    // Checked claims: [90, 70]
    // min = 70, mean = 80 -> round(0.5*70 + 0.5*80) = 75 (fresh)
    const mockResults: ClaimResult[] = [
      {
        claim: {
          id: "c1",
          text: "Fact A",
          span: null,
          normalized: "Fact A",
          category: "pricing",
          claimed_as_of: null,
          entities: [],
          query: "q",
          official_domains: [],
          prior: 0.2,
        },
        verdict: "current",
        freshness: 90,
        band: "fresh",
        correction: null,
        evidence: [],
        supporting_evidence_ids: [],
        judge_confidence: 0.9,
        reasoning: "",
        cache: { hit: false, age_s: null },
        status: "ok",
      },
      {
        claim: {
          id: "c2",
          text: "Fact B",
          span: null,
          normalized: "Fact B",
          category: "version_release",
          claimed_as_of: null,
          entities: [],
          query: "q",
          official_domains: [],
          prior: 0.5,
        },
        verdict: "current",
        freshness: 70,
        band: "aging",
        correction: null,
        evidence: [],
        supporting_evidence_ids: [],
        judge_confidence: 0.8,
        reasoning: "",
        cache: { hit: false, age_s: null },
        status: "ok",
      },
      {
        claim: {
          id: "c3",
          text: "Skipped",
          span: null,
          normalized: "Skipped",
          category: "law_policy",
          claimed_as_of: null,
          entities: [],
          query: "q",
          official_domains: [],
          prior: 0.5,
        },
        verdict: "unverifiable",
        freshness: 20,
        band: "stale",
        correction: null,
        evidence: [],
        supporting_evidence_ids: [],
        judge_confidence: 0.5,
        reasoning: "",
        cache: { hit: false, age_s: null },
        status: "skipped_limit", // Should not count towards min/mean!
      },
    ];

    const overall = computeOverallScore(mockResults);
    expect(overall.claims_checked).toBe(2);
    expect(overall.claims_total).toBe(3);
    expect(overall.score).toBe(75);
    expect(overall.band).toBe("fresh");
  });
});
