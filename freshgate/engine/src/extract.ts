import { z } from "zod";
import {
  Category,
  CategorySchema,
  Claim,
  Span,
  VerifyRequestContext,
  VerifyRequestOptions,
} from "./contract/schemas.js";
import { computeStalenessPrior } from "./prior.js";
import { callStructuredLLM } from "./llm.js";

const CategoryWeights: Record<Category, number> = {
  pricing: 10,
  version_release: 9,
  event_status: 8,
  leadership_role: 7,
  law_policy: 6,
  statistic_metric: 5,
  record_ranking: 4,
  other_volatile: 3,
  evergreen: 0,
};

const RawExtractedClaimSchema = z.object({
  text: z.string().min(1),
  normalized: z.string().min(1),
  category: CategorySchema,
  claimed_as_of: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  entities: z.array(z.string()),
  query: z.string(),
  official_domains: z.array(z.string()).max(3),
});

const ExtractionOutputSchema = z.object({
  claims: z.array(RawExtractedClaimSchema),
});

export interface ExtractionResult {
  claims: Claim[];
  totalExtracted: number;
  tokensUsed: { in: number; out: number };
}

// 1. Heuristic Candidate Scanner (used as guidance and reliable fallback)
export function findHeuristicClaims(text: string): z.infer<typeof RawExtractedClaimSchema>[] {
  const results: z.infer<typeof RawExtractedClaimSchema>[] = [];

  // Split into sentences only on punctuation followed by whitespace or linebreaks
  // (avoids splitting on Next.js, Node.js, v1.2, or $20.50)
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim().length > 0);
  const segments: string[] = [];

  for (const s of sentences) {
    const trimmed = s.trim().replace(/[.!?]+$/, "");
    if (!trimmed) continue;

    if (/\s+\b(?:and|while|whereas|but)\b\s+|;\s*/i.test(trimmed)) {
      const parts = trimmed.split(/\s+\b(?:and|while|whereas|but)\b\s+|;\s*/i);
      for (const p of parts) {
        const pt = p.trim().replace(/[.!?]+$/, "");
        if (pt.length >= 8) segments.push(pt);
      }
    } else {
      segments.push(trimmed);
    }
  }

  for (const trimmed of segments) {
    if (trimmed.length < 8) continue;

    // Check pricing: $XX, per month, cost
    if (/\$|€|£|\b(price|pricing|costs?|per month|per user|subscription|plan|tier)\b/i.test(trimmed)) {
      results.push({
        text: trimmed,
        normalized: trimmed,
        category: "pricing",
        claimed_as_of: null,
        entities: extractEntities(trimmed),
        query: `${trimmed.slice(0, 60)} pricing official page`,
        official_domains: inferOfficialDomains(trimmed),
      });
      continue;
    }

    // Check version release: v14, version 15, latest version
    if (/\b(version|v\d+(\.\d+)?|latest release|deprecated|update|released?)\b/i.test(trimmed)) {
      results.push({
        text: trimmed,
        normalized: trimmed,
        category: "version_release",
        claimed_as_of: null,
        entities: extractEntities(trimmed),
        query: `${trimmed.slice(0, 60)} latest release changelog`,
        official_domains: inferOfficialDomains(trimmed),
      });
      continue;
    }

    // Check leadership: CEO, CTO, president, leads
    if (/\b(CEO|CTO|president|chairman|founder|leads?|director)\b/i.test(trimmed)) {
      results.push({
        text: trimmed,
        normalized: trimmed,
        category: "leadership_role",
        claimed_as_of: null,
        entities: extractEntities(trimmed),
        query: `${trimmed.slice(0, 60)} current leader news`,
        official_domains: inferOfficialDomains(trimmed),
      });
      continue;
    }

    // Check law/policy: tax, regulation, law, act
    if (/\b(tax|policy|law|act|regulation|compliance|wage|guidelines?)\b/i.test(trimmed)) {
      results.push({
        text: trimmed,
        normalized: trimmed,
        category: "law_policy",
        claimed_as_of: null,
        entities: extractEntities(trimmed),
        query: `${trimmed.slice(0, 60)} official regulation`,
        official_domains: [],
      });
      continue;
    }

    // Check general volatile: currently, right now, as of, announcements
    if (/\b(currently|now|latest|recent|recently|announcements?|as of|today|availability|outage)\b/i.test(trimmed)) {
      results.push({
        text: trimmed,
        normalized: trimmed,
        category: "other_volatile",
        claimed_as_of: null,
        entities: extractEntities(trimmed),
        query: `${trimmed.slice(0, 60)} current status`,
        official_domains: [],
      });
    }
  }

  return results;
}

function extractEntities(str: string): string[] {
  const matches = str.match(/\b([A-Z][a-zA-Z0-9.+]+(?:\s+[A-Z][a-zA-Z0-9.+]+)*)\b/g);
  if (!matches) return [];
  const stopWords = new Set(["The", "A", "An", "What", "Who", "Is", "Are", "In", "On", "Of", "For", "With", "Recent", "Latest", "New"]);
  return Array.from(new Set(matches.filter((m) => !stopWords.has(m)))).slice(0, 3);
}

function inferOfficialDomains(str: string): string[] {
  const lower = str.toLowerCase();
  const domains: string[] = [];
  if (lower.includes("next.js") || lower.includes("nextjs")) domains.push("nextjs.org");
  if (lower.includes("vercel")) domains.push("vercel.com");
  if (lower.includes("chatgpt") || lower.includes("openai")) domains.push("openai.com");
  if (lower.includes("claude") || lower.includes("anthropic")) domains.push("anthropic.com");
  if (lower.includes("apple")) domains.push("apple.com");
  if (lower.includes("microsoft")) domains.push("microsoft.com");
  if (lower.includes("google")) domains.push("google.com");
  return domains.slice(0, 3);
}

// 2. Span Anchoring Algorithm
export function anchorSpan(
  fullText: string,
  claimSubstring: string,
  claimedSpans: Span[]
): Span | null {
  if (!claimSubstring) return null;

  // 1. Exact match search starting after previous claimed spans of identical text
  let startIndex = 0;
  while (startIndex < fullText.length) {
    const idx = fullText.indexOf(claimSubstring, startIndex);
    if (idx === -1) break;
    const end = idx + claimSubstring.length;

    // Check if this range overlaps with an existing claimed span
    const isOverlapping = claimedSpans.some(
      (s) => Math.max(s.start, idx) < Math.min(s.end, end)
    );

    if (!isOverlapping) {
      return { start: idx, end };
    }
    startIndex = idx + 1;
  }

  // 2. Case / whitespace normalized search
  const cleanNeedle = claimSubstring.trim().toLowerCase().replace(/\s+/g, " ");
  const cleanFull = fullText.toLowerCase();
  const normIdx = cleanFull.indexOf(cleanNeedle);
  if (normIdx !== -1) {
    const end = normIdx + cleanNeedle.length;
    const isOverlapping = claimedSpans.some(
      (s) => Math.max(s.start, normIdx) < Math.min(s.end, end)
    );
    if (!isOverlapping) {
      return { start: normIdx, end };
    }
  }

  return null;
}

// 3. Deduplication Helper
function isNearDuplicate(a: string, b: string): boolean {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 && intersection / union > 0.85;
}

// 4. Main Claim Extraction Pipeline
export async function extractClaims(
  text: string,
  context?: VerifyRequestContext,
  options?: VerifyRequestOptions
): Promise<ExtractionResult> {
  const maxClaims = options?.max_claims ?? 5;
  const now = options?.now || new Date().toISOString();

  let rawClaims: z.infer<typeof RawExtractedClaimSchema>[] = [];
  let tokens = { in: 0, out: 0 };

  const prompt = `Extract all atomic, time-sensitive, checkable factual claims from the following assistant text.
Do NOT extract evergreen definitions, mathematical truths, or basic syntax explanations.
For each claim:
- "text" MUST be an exact verbatim substring from the input text.
- "normalized" must be a standalone statement resolving pronouns.
- "category" must be one of: pricing, version_release, leadership_role, law_policy, statistic_metric, event_status, record_ranking, other_volatile, evergreen.
- "claimed_as_of" must be "YYYY-MM-DD" if stated in the text, else null.
- "entities" key entities mentioned.
- "query" concise web search query (<= 25 words).
- "official_domains" up to 3 domain hints (e.g., openai.com).

Text to analyze:
"""
${text}
"""`;

  try {
    const llmResult = await callStructuredLLM({
      prompt,
      schema: ExtractionOutputSchema,
      mockFallback: () => ({ claims: findHeuristicClaims(text) }),
    });
    rawClaims = llmResult.data.claims;
    tokens = llmResult.usage;
  } catch (err) {
    console.warn("LLM extraction failed, using heuristic fallback:", err);
    rawClaims = findHeuristicClaims(text);
  }

  // Deduplicate claims
  const dedupedRaw: z.infer<typeof RawExtractedClaimSchema>[] = [];
  for (const c of rawClaims) {
    const exists = dedupedRaw.some((d) => isNearDuplicate(d.normalized, c.normalized));
    if (!exists) {
      dedupedRaw.push(c);
    }
  }

  // Anchor spans and calculate priors
  const claimedSpans: Span[] = [];
  const processedClaims: Claim[] = [];

  for (let i = 0; i < dedupedRaw.length; i++) {
    const raw = dedupedRaw[i];
    const span = anchorSpan(text, raw.text, claimedSpans);
    if (span) {
      claimedSpans.push(span);
    }

    const prior = computeStalenessPrior({
      category: raw.category,
      claimed_as_of: raw.claimed_as_of,
      knowledge_cutoff: context?.knowledge_cutoff,
      now,
    });

    processedClaims.push({
      id: `c${i + 1}`,
      text: raw.text,
      span,
      normalized: raw.normalized,
      category: raw.category,
      claimed_as_of: raw.claimed_as_of,
      entities: raw.entities,
      query: raw.query.slice(0, 150),
      official_domains: raw.official_domains.slice(0, 3),
      prior,
    });
  }

  // Sort and prioritize per SPEC section 6:
  // rank by prior P descending, then category weight
  processedClaims.sort((a, b) => {
    if (b.prior !== a.prior) {
      return b.prior - a.prior;
    }
    return (CategoryWeights[b.category] || 0) - (CategoryWeights[a.category] || 0);
  });

  return {
    claims: processedClaims.slice(0, maxClaims),
    totalExtracted: processedClaims.length,
    tokensUsed: tokens,
  };
}
