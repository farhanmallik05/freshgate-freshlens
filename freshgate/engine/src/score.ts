import {
  Authority,
  Band,
  Category,
  ClaimResult,
  Evidence,
  Verdict,
} from "./contract/schemas.js";
import { loadVolatilityRules } from "./rules.js";

const AuthorityWeights: Record<Authority, number> = {
  official: 1.0,
  reputable: 0.8,
  community: 0.5,
  unknown: 0.3,
};

export function getBand(score: number): Band {
  if (score >= 75) return "fresh";
  if (score >= 45) return "aging";
  return "stale";
}

export function computeAuthorityWeight(evidenceList: Evidence[]): number {
  if (evidenceList.length === 0) return 0;
  return Math.max(...evidenceList.map((e) => AuthorityWeights[e.authority] ?? 0.3));
}

export function computeRecencyFactor(
  evidenceList: Evidence[],
  category: Category,
  nowISO?: string
): number {
  if (evidenceList.length === 0) return 0.5;

  const rules = loadVolatilityRules();
  const H = rules.categories[category]?.half_life_days;
  if (!H || H <= 0) return 1.0;

  const nowMs = nowISO ? new Date(nowISO).getTime() : Date.now();
  let minAgeDays = Infinity;

  for (const e of evidenceList) {
    if (e.published_date) {
      const pubMs = new Date(e.published_date).getTime();
      if (!isNaN(pubMs)) {
        const ageDays = Math.max(0, (nowMs - pubMs) / (1000 * 60 * 60 * 24));
        if (ageDays < minAgeDays) {
          minAgeDays = ageDays;
        }
      }
    }
  }

  if (minAgeDays === Infinity) {
    return 0.5; // unknown date defaults to R = 0.5
  }

  return Math.pow(0.5, minAgeDays / H);
}

export function computeCompositeConfidence(A: number, R: number, K: number): number {
  const C = 0.5 * A + 0.3 * R + 0.2 * K;
  return Math.min(1, Math.max(0, C));
}

export function computeClaimFreshness(
  verdict: Verdict,
  P: number,
  C: number
): { freshness: number; band: Band } {
  let score: number;

  switch (verdict) {
    case "current":
      score = Math.round(100 * (0.6 + 0.4 * C) - 10 * P);
      break;
    case "stale":
      score = Math.round(30 * (1 - C));
      break;
    case "unverifiable":
      score = Math.round(55 * (1 - P));
      break;
  }

  const clamped = Math.min(100, Math.max(0, score));
  return {
    freshness: clamped,
    band: getBand(clamped),
  };
}

export function computeOverallScore(claimResults: ClaimResult[]): {
  score: number;
  band: Band;
  claims_total: number;
  claims_checked: number;
  stale_count: number;
  unverifiable_count: number;
} {
  const checked = claimResults.filter((r) => r.status === "ok");

  if (checked.length === 0) {
    return {
      score: 100,
      band: "fresh",
      claims_total: claimResults.length,
      claims_checked: 0,
      stale_count: 0,
      unverifiable_count: 0,
    };
  }

  const scores = checked.map((r) => r.freshness);
  const minScore = Math.min(...scores);
  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const overall = Math.round(0.5 * minScore + 0.5 * meanScore);

  const staleCount = checked.filter((r) => r.verdict === "stale").length;
  const unverifiableCount = checked.filter((r) => r.verdict === "unverifiable").length;

  return {
    score: overall,
    band: getBand(overall),
    claims_total: claimResults.length,
    claims_checked: checked.length,
    stale_count: staleCount,
    unverifiable_count: unverifiableCount,
  };
}
