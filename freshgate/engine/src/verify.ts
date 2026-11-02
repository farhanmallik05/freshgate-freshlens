import { ulid } from "ulid";
import {
  Claim,
  ClaimResult,
  Evidence,
  VerifyRequest,
  VerifyResponse,
} from "./contract/schemas.js";
import { extractClaims } from "./extract.js";
import { buildSearchQuery } from "./query.js";
import { searchTavily } from "./tavily.js";
import { normalizeEvidenceList } from "./evidence.js";
import { judgeClaim } from "./judge.js";
import {
  computeAuthorityWeight,
  computeCompositeConfidence,
  computeClaimFreshness,
  computeOverallScore,
  computeRecencyFactor,
} from "./score.js";
import { getConfig } from "./config.js";

export interface ClaimVerifier {
  verify(
    claim: Claim,
    depth: "fast" | "thorough",
    nowISO: string
  ): Promise<{ result: ClaimResult; credits: number; tokens: { in: number; out: number } }>;
}

export class DirectClaimVerifier implements ClaimVerifier {
  async verify(
    claim: Claim,
    depth: "fast" | "thorough",
    nowISO: string
  ): Promise<{ result: ClaimResult; credits: number; tokens: { in: number; out: number } }> {
    // 1. Evergreen skip
    if (claim.category === "evergreen") {
      return {
        result: {
          claim,
          verdict: "current",
          freshness: 100,
          band: "fresh",
          correction: null,
          evidence: [],
          supporting_evidence_ids: [],
          judge_confidence: 1.0,
          reasoning: "Evergreen factual claim verified as stable knowledge.",
          cache: { hit: false, age_s: null },
          status: "skipped_evergreen",
        },
        credits: 0,
        tokens: { in: 0, out: 0 },
      };
    }

    // 2. Query construction
    const query = buildSearchQuery(claim);

    // 3. Tavily live search
    const searchRes = await searchTavily(claim, query, { depth, now: nowISO });

    if (searchRes.status === "budget_exhausted") {
      const freshness = Math.round(55 * (1 - claim.prior));
      return {
        result: {
          claim,
          verdict: "unverifiable",
          freshness,
          band: freshness >= 75 ? "fresh" : freshness >= 45 ? "aging" : "stale",
          correction: null,
          evidence: [],
          supporting_evidence_ids: [],
          judge_confidence: 0.5,
          reasoning: "Hourly search credit budget exhausted.",
          cache: { hit: false, age_s: null },
          status: "budget_exhausted",
        },
        credits: 0,
        tokens: { in: 0, out: 0 },
      };
    }

    if (searchRes.status === "failed" || searchRes.results.length === 0) {
      const freshness = Math.round(55 * (1 - claim.prior));
      return {
        result: {
          claim,
          verdict: "unverifiable",
          freshness,
          band: freshness >= 75 ? "fresh" : freshness >= 45 ? "aging" : "stale",
          correction: null,
          evidence: [],
          supporting_evidence_ids: [],
          judge_confidence: 0.5,
          reasoning: "Search retrieval returned no supporting evidence.",
          cache: { hit: false, age_s: null },
          status: "search_failed",
        },
        credits: searchRes.creditsUsed,
        tokens: { in: 0, out: 0 },
      };
    }

    // 4. Normalize evidence
    const evidenceList: Evidence[] = normalizeEvidenceList(
      searchRes.results,
      claim.official_domains,
      nowISO
    );

    // 5. LLM Judge
    const judged = await judgeClaim(claim, evidenceList, nowISO);

    // Filter supporting evidence
    const supporting = evidenceList.filter((e) =>
      judged.supporting_evidence_ids.includes(e.id)
    );

    // 6. Compute scoring components
    const A = computeAuthorityWeight(supporting);
    const R = computeRecencyFactor(supporting, claim.category, nowISO);
    const K = judged.judge_confidence;
    const C = computeCompositeConfidence(A, R, K);
    const { freshness, band } = computeClaimFreshness(judged.verdict, claim.prior, C);

    return {
      result: {
        claim,
        verdict: judged.verdict,
        freshness,
        band,
        correction: judged.correction,
        evidence: evidenceList,
        supporting_evidence_ids: judged.supporting_evidence_ids,
        judge_confidence: judged.judge_confidence,
        reasoning: judged.reasoning,
        cache: { hit: false, age_s: null },
        status: "ok",
      },
      credits: searchRes.creditsUsed,
      tokens: { in: 150, out: 80 },
    };
  }
}

// Global default verifier instance (can be wrapped by cache in Step A4)
let activeVerifier: ClaimVerifier = new DirectClaimVerifier();

export function setClaimVerifier(verifier: ClaimVerifier): void {
  activeVerifier = verifier;
}

export function getClaimVerifier(): ClaimVerifier {
  return activeVerifier;
}

export async function verifyText(
  request: VerifyRequest,
  verifier: ClaimVerifier = activeVerifier
): Promise<VerifyResponse> {
  const startTime = Date.now();
  const config = getConfig();
  const timeoutMs = config.ENGINE_VERIFY_TIMEOUT_MS || 20000;
  const nowISO = request.options?.now || new Date().toISOString();
  const maxClaims = request.options?.max_claims ?? 5;
  const depth = request.options?.depth ?? "fast";

  // 1. Claim extraction
  const { claims: extractedClaims, tokensUsed: extractTokens } = await extractClaims(
    request.text,
    request.context,
    request.options
  );

  let tavilyCredits = 0;
  let tokensIn = extractTokens.in;
  let tokensOut = extractTokens.out;
  let cacheHits = 0;

  const toVerify = extractedClaims.slice(0, maxClaims);
  const overflowClaims = extractedClaims.slice(maxClaims);

  const claimResults: ClaimResult[] = [];
  let isPartial = false;

  // Run claims with bounded concurrency
  const concurrency = 4;
  for (let i = 0; i < toVerify.length; i += concurrency) {
    const batch = toVerify.slice(i, i + concurrency);

    // Check timeout
    if (Date.now() - startTime >= timeoutMs) {
      isPartial = true;
      break;
    }

    const promises = batch.map(async (claim) => {
      try {
        const out = await verifier.verify(claim, depth, nowISO);
        return out;
      } catch (err) {
        console.warn(`Verification threw for claim ${claim.id}:`, err);
        return {
          result: {
            claim,
            verdict: "unverifiable" as const,
            freshness: Math.round(55 * (1 - claim.prior)),
            band: "aging" as const,
            correction: null,
            evidence: [],
            supporting_evidence_ids: [],
            judge_confidence: 0.5,
            reasoning: "Verification threw an internal error.",
            cache: { hit: false, age_s: null },
            status: "judge_failed" as const,
          },
          credits: 0,
          tokens: { in: 0, out: 0 },
        };
      }
    });

    const batchOutputs = await Promise.all(promises);
    for (const out of batchOutputs) {
      claimResults.push(out.result);
      tavilyCredits += out.credits;
      tokensIn += out.tokens.in;
      tokensOut += out.tokens.out;
      if (out.result.cache.hit) {
        cacheHits++;
      }
    }
  }

  // Handle overflow beyond max_claims per SPEC section 6
  for (const c of overflowClaims) {
    claimResults.push({
      claim: c,
      verdict: "unverifiable",
      freshness: Math.round(55 * (1 - c.prior)),
      band: "aging",
      correction: null,
      evidence: [],
      supporting_evidence_ids: [],
      judge_confidence: 0.5,
      reasoning: "Skipped due to max_claims limit.",
      cache: { hit: false, age_s: null },
      status: "skipped_limit",
    });
  }

  // Overall Score
  const overall = computeOverallScore(claimResults);

  // Correction Block per SPEC section 7
  const staleCorrections = claimResults.filter(
    (r) => r.verdict === "stale" && r.correction && r.correction.trim().length > 0
  );

  let correctedText: string | null = null;
  if (staleCorrections.length > 0) {
    const lines = [
      request.text,
      "",
      "---",
      `**Freshness check (FreshGate):** ${staleCorrections.length} claim(s) may be outdated.`,
    ];
    for (const sc of staleCorrections) {
      const topEvidence = sc.evidence[0];
      const domain = topEvidence?.domain || "web";
      const url = topEvidence?.url || "#";
      const dateStr = topEvidence?.published_date
        ? topEvidence.published_date.slice(0, 10)
        : "undated";
      lines.push(`- ~~${sc.claim.text}~~ -> ${sc.correction} ([${domain}](${url}), ${dateStr})`);
    }
    correctedText = lines.join("\n");
  }

  const durationMs = Date.now() - startTime;

  return {
    id: `vrf_${ulid()}`,
    status: isPartial ? "partial" : "completed",
    created_at: new Date().toISOString(),
    latency_ms: durationMs,
    overall,
    claims: claimResults,
    corrected_text: correctedText,
    usage: {
      tavily_credits: tavilyCredits,
      llm_tokens: { in: tokensIn, out: tokensOut },
      cache_hits: cacheHits,
    },
    context: request.context,
  };
}
