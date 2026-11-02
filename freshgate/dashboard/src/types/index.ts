export type Band = "fresh" | "aging" | "stale";
export type Verdict = "current" | "stale" | "unverifiable";
export type Authority = "official" | "reputable" | "community" | "unknown";
export type ClaimStatus =
  | "ok"
  | "skipped_evergreen"
  | "skipped_limit"
  | "budget_exhausted"
  | "search_failed"
  | "judge_failed";

export interface Evidence {
  id: string;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  published_date: string | null;
  retrieved_at: string;
  authority: Authority;
  score: number;
}

export interface Span {
  start: number;
  end: number;
}

export interface Claim {
  id: string;
  text: string;
  normalized: string;
  category: string;
  span: Span | null;
  salience?: "core" | "secondary" | "incidental";
  claimed_as_of?: string | null;
  entities?: string[];
  official_domains?: string[];
  query?: string;
}

export interface ClaimResult {
  claim: Claim;
  verdict: Verdict;
  freshness: number;
  band: Band;
  correction: string | null;
  evidence: Evidence[];
  supporting_evidence_ids: string[];
  judge_confidence: number;
  reasoning: string;
  cache: {
    hit: boolean;
    age_s: number | null;
  };
  status: ClaimStatus;
}

export interface VerifyResponse {
  id: string;
  status: "completed" | "partial" | "failed";
  created_at: string;
  latency_ms: number;
  overall: {
    score: number;
    band: Band;
    claims_total: number;
    claims_checked: number;
    stale_count: number;
    unverifiable_count: number;
  };
  claims: ClaimResult[];
  corrected_text: string | null;
  usage: {
    tavily_credits: number;
    llm_tokens: { in: number; out: number };
    cache_hits: number;
  };
  context?: {
    request_id?: string;
    prompt?: string;
    model?: string;
    provider?: string;
    answered_at?: string;
    knowledge_cutoff?: string;
    source?: string;
  };
}

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
