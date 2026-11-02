import { getDb } from "./db/repo.js";

export interface StatsResponse {
  totals: {
    verifications: number;
    claims_total: number;
    claims_checked: number;
    stale_count: number;
    unverifiable_count: number;
  };
  stale_rate: number;
  by_model: { model: string; total: number; stale_rate: number; avg_score: number }[];
  by_category: { category: string; total: number; stale_rate: number }[];
  band_distribution: { fresh: number; aging: number; stale: number };
  latency_ms: { p50: number; p95: number };
  cache_hit_rate: number;
  tavily_credits: number;
  credits_per_claim: number;
  llm_tokens: { in: number; out: number };
  top_stale_claims: { normalized: string; count: number; latest_correction: string | null }[];
  series: { bucket: string; verifications: number; stale_rate: number; avg_score: number }[];
}

export function computeStats(window: "1h" | "24h" | "7d" = "24h"): StatsResponse {
  const db = getDb();
  const now = Date.now();
  const windowMs =
    window === "1h" ? 3600000 : window === "7d" ? 7 * 86400000 : 86400000;
  const sinceISO = new Date(now - windowMs).toISOString();

  // 1. Fetch matching verifications
  const verifications = db
    .prepare("SELECT * FROM verifications WHERE created_at >= ? ORDER BY created_at ASC")
    .all(sinceISO) as any[];

  // 2. Fetch matching claim results
  const claims = db
    .prepare("SELECT * FROM claim_results WHERE created_at >= ?")
    .all(sinceISO) as any[];

  const totalVerifs = verifications.length;
  let totalClaims = 0;
  let totalChecked = 0;
  let totalStale = 0;
  let totalUnverifiable = 0;
  let totalTavilyCredits = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCacheHits = 0;

  const latencies: number[] = [];
  const bandDist = { fresh: 0, aging: 0, stale: 0 };
  const modelStats: Record<string, { total: number; stale: number; scores: number[] }> = {};
  const catStats: Record<string, { total: number; stale: number }> = {};

  for (const v of verifications) {
    totalClaims += v.claims_total;
    totalChecked += v.claims_checked;
    totalStale += v.stale_count;
    totalUnverifiable += v.unverifiable_count;
    totalTavilyCredits += v.tavily_credits;
    totalTokensIn += v.llm_tokens_in;
    totalTokensOut += v.llm_tokens_out;
    totalCacheHits += v.cache_hits;

    latencies.push(v.latency_ms);
    const b = v.band as keyof typeof bandDist;
    if (bandDist[b] !== undefined) bandDist[b]++;

    const m = v.model || "unknown";
    if (!modelStats[m]) modelStats[m] = { total: 0, stale: 0, scores: [] };
    modelStats[m].total += v.claims_checked;
    modelStats[m].stale += v.stale_count;
    modelStats[m].scores.push(v.overall_score);
  }

  for (const c of claims) {
    const cat = c.category || "other_volatile";
    if (!catStats[cat]) catStats[cat] = { total: 0, stale: 0 };
    catStats[cat].total++;
    if (c.verdict === "stale") catStats[cat].stale++;
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

  const staleRate = totalChecked > 0 ? Number((totalStale / totalChecked).toFixed(4)) : 0;
  const cacheHitRate = totalChecked > 0 ? Number((totalCacheHits / totalChecked).toFixed(4)) : 0;
  const creditsPerClaim =
    totalChecked > 0 ? Number((totalTavilyCredits / totalChecked).toFixed(4)) : 0;

  const byModel = Object.entries(modelStats).map(([model, data]) => ({
    model,
    total: data.total,
    stale_rate: data.total > 0 ? Number((data.stale / data.total).toFixed(4)) : 0,
    avg_score:
      data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 100,
  }));

  const byCategory = Object.entries(catStats).map(([category, data]) => ({
    category,
    total: data.total,
    stale_rate: data.total > 0 ? Number((data.stale / data.total).toFixed(4)) : 0,
  }));

  // Top stale claims
  const topStale = db
    .prepare(`
      SELECT normalized, COUNT(*) as count
      FROM claim_cache
      GROUP BY normalized
      ORDER BY count DESC
      LIMIT 5
    `)
    .all() as any[];

  // Time series generation
  const bucketMs =
    window === "1h" ? 5 * 60000 : window === "7d" ? 6 * 3600000 : 3600000;
  const seriesBuckets = new Map<string, { count: number; scores: number[]; stale: number; checked: number }>();

  for (const v of verifications) {
    const time = new Date(v.created_at).getTime();
    const bucketTime = Math.floor(time / bucketMs) * bucketMs;
    const bucketKey = new Date(bucketTime).toISOString();

    if (!seriesBuckets.has(bucketKey)) {
      seriesBuckets.set(bucketKey, { count: 0, scores: [], stale: 0, checked: 0 });
    }
    const b = seriesBuckets.get(bucketKey)!;
    b.count++;
    b.scores.push(v.overall_score);
    b.stale += v.stale_count;
    b.checked += v.claims_checked;
  }

  const series = Array.from(seriesBuckets.entries()).map(([bucket, data]) => ({
    bucket,
    verifications: data.count,
    stale_rate: data.checked > 0 ? Number((data.stale / data.checked).toFixed(4)) : 0,
    avg_score:
      data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 100,
  }));

  return {
    totals: {
      verifications: totalVerifs,
      claims_total: totalClaims,
      claims_checked: totalChecked,
      stale_count: totalStale,
      unverifiable_count: totalUnverifiable,
    },
    stale_rate: staleRate,
    by_model: byModel,
    by_category: byCategory,
    band_distribution: bandDist,
    latency_ms: { p50, p95 },
    cache_hit_rate: cacheHitRate,
    tavily_credits: totalTavilyCredits,
    credits_per_claim: creditsPerClaim,
    llm_tokens: { in: totalTokensIn, out: totalTokensOut },
    top_stale_claims: topStale.map((r) => ({
      normalized: r.normalized,
      count: r.count,
      latest_correction: null,
    })),
    series,
  };
}
