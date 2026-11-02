import { createHash } from "node:crypto";
import { Claim, ClaimResult } from "./contract/schemas.js";
import { ClaimVerifier } from "./verify.js";
import { loadVolatilityRules } from "./rules.js";
import { getClaimCache, saveClaimCache } from "./db/repo.js";

export function computeClaimHash(normalized: string, category: string): string {
  const key = `${normalized.trim().toLowerCase()}|${category}`;
  return createHash("sha256").update(key).digest("hex");
}

export class CachedClaimVerifier implements ClaimVerifier {
  private inFlight = new Map<
    string,
    Promise<{ result: ClaimResult; credits: number; tokens: { in: number; out: number } }>
  >();

  constructor(private delegate: ClaimVerifier) {}

  async verify(
    claim: Claim,
    depth: "fast" | "thorough",
    nowISO: string,
    nocache = false
  ): Promise<{ result: ClaimResult; credits: number; tokens: { in: number; out: number } }> {
    const hash = computeClaimHash(claim.normalized, claim.category);
    const nowMs = new Date(nowISO).getTime();

    // 1. Check cache unless nocache is explicitly set
    if (!nocache) {
      const cached = getClaimCache(hash, nowMs);
      if (cached) {
        const storedResult = cached.result as ClaimResult;
        return {
          result: {
            ...storedResult,
            claim: {
              ...claim,
              id: claim.id,
              span: claim.span,
            },
            cache: {
              hit: true,
              age_s: cached.age_s,
            },
          },
          credits: 0,
          tokens: { in: 0, out: 0 },
        };
      }
    }

    // 2. Singleflight: deduplicate in-flight requests for identical claims
    if (this.inFlight.has(hash)) {
      return this.inFlight.get(hash)!;
    }

    const promise = (async () => {
      try {
        const res = await this.delegate.verify(claim, depth, nowISO);

        // Determine TTL from rules
        if (res.result.status === "ok" || res.result.verdict === "unverifiable") {
          const rules = loadVolatilityRules();
          const catRule = rules.categories[claim.category];
          let ttlSeconds = catRule?.claim_cache_ttl_s || 21600;

          // SPEC: cache verdict "unverifiable" for min(TTL, 1800 s)
          if (res.result.verdict === "unverifiable") {
            ttlSeconds = Math.min(ttlSeconds, 1800);
          }

          const expiresMs = nowMs + ttlSeconds * 1000;
          const expiresAt = new Date(expiresMs).toISOString();

          saveClaimCache(
            hash,
            claim.category,
            claim.normalized,
            JSON.stringify(res.result),
            nowISO,
            expiresAt
          );
        }

        return res;
      } finally {
        this.inFlight.delete(hash);
      }
    })();

    this.inFlight.set(hash, promise);
    return promise;
  }
}
