import { z } from "zod";

export const CategorySchema = z.enum([
  "pricing",
  "version_release",
  "leadership_role",
  "law_policy",
  "statistic_metric",
  "event_status",
  "record_ranking",
  "other_volatile",
  "evergreen",
]);
export type Category = z.infer<typeof CategorySchema>;

export const VolatilityClassSchema = z.enum([
  "realtime",
  "high",
  "medium",
  "low",
  "static",
]);
export type VolatilityClass = z.infer<typeof VolatilityClassSchema>;

export const VerdictSchema = z.enum(["current", "stale", "unverifiable"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const BandSchema = z.enum(["fresh", "aging", "stale"]);
export type Band = z.infer<typeof BandSchema>;

export const AuthoritySchema = z.enum([
  "official",
  "reputable",
  "community",
  "unknown",
]);
export type Authority = z.infer<typeof AuthoritySchema>;

export const ClaimStatusSchema = z.enum([
  "ok",
  "skipped_evergreen",
  "skipped_limit",
  "budget_exhausted",
  "search_failed",
  "judge_failed",
]);
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export const VerificationStatusSchema = z.enum([
  "completed",
  "partial",
  "failed",
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const SourceSchema = z.enum([
  "bifrost",
  "extension",
  "api",
  "bench",
  "dashboard",
]);
export type Source = z.infer<typeof SourceSchema>;

export const ErrorCodeSchema = z.enum([
  "invalid_request",
  "unauthorized",
  "rate_limited",
  "budget_exhausted",
  "upstream_failed",
  "internal",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const SpanSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  })
  .refine((data) => data.start <= data.end, {
    message: "span start must be <= end",
  });
export type Span = z.infer<typeof SpanSchema>;

export const ClaimSchema = z.object({
  id: z.string().regex(/^c[0-9]+$/),
  text: z.string().min(1),
  span: SpanSchema.nullable(),
  normalized: z.string().min(1),
  category: CategorySchema,
  claimed_as_of: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  entities: z.array(z.string()),
  query: z.string(),
  official_domains: z.array(z.string()).max(3),
  prior: z.number().min(0).max(1),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const EvidenceSchema = z.object({
  id: z.string().regex(/^e[0-9]+$/),
  url: z.string().url(),
  domain: z.string().min(1),
  title: z.string(),
  snippet: z.string(),
  published_date: z.string().datetime().nullable(),
  retrieved_at: z.string().datetime(),
  authority: AuthoritySchema,
  score: z.number(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const ClaimResultSchema = z.object({
  claim: ClaimSchema,
  verdict: VerdictSchema,
  freshness: z.number().int().min(0).max(100),
  band: BandSchema,
  correction: z.string().nullable(),
  evidence: z.array(EvidenceSchema),
  supporting_evidence_ids: z.array(z.string()),
  judge_confidence: z.number().min(0).max(1),
  reasoning: z.string().max(240),
  cache: z.object({
    hit: z.boolean(),
    age_s: z.number().int().nonnegative().nullable(),
  }),
  status: ClaimStatusSchema,
});
export type ClaimResult = z.infer<typeof ClaimResultSchema>;

export const VerifyRequestContextSchema = z.object({
  request_id: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  answered_at: z.string().datetime().optional(),
  knowledge_cutoff: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  source: SourceSchema.optional(),
});
export type VerifyRequestContext = z.infer<typeof VerifyRequestContextSchema>;

export const VerifyRequestOptionsSchema = z.object({
  max_claims: z.number().int().min(1).max(10).default(5),
  depth: z.enum(["fast", "thorough"]).default("fast"),
  now: z.string().datetime().optional(),
  include_evidence: z.boolean().default(true),
  nocache: z.boolean().default(false),
});
export type VerifyRequestOptions = z.infer<typeof VerifyRequestOptionsSchema>;

export const VerifyRequestSchema = z.object({
  text: z.string().min(1).max(20000),
  context: VerifyRequestContextSchema.optional(),
  options: VerifyRequestOptionsSchema.optional().default({}),
});
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

export const VerifyResponseOverallSchema = z.object({
  score: z.number().int().min(0).max(100),
  band: BandSchema,
  claims_total: z.number().int().nonnegative(),
  claims_checked: z.number().int().nonnegative(),
  stale_count: z.number().int().nonnegative(),
  unverifiable_count: z.number().int().nonnegative(),
});
export type VerifyResponseOverall = z.infer<typeof VerifyResponseOverallSchema>;

export const VerifyResponseUsageSchema = z.object({
  tavily_credits: z.number().nonnegative(),
  llm_tokens: z.object({
    in: z.number().int().nonnegative(),
    out: z.number().int().nonnegative(),
  }),
  cache_hits: z.number().int().nonnegative(),
});
export type VerifyResponseUsage = z.infer<typeof VerifyResponseUsageSchema>;

export const VerifyResponseSchema = z.object({
  id: z.string().regex(/^vrf_[0-9A-Za-z]+$/),
  status: VerificationStatusSchema,
  created_at: z.string().datetime(),
  latency_ms: z.number().int().nonnegative(),
  overall: VerifyResponseOverallSchema,
  claims: z.array(ClaimResultSchema),
  corrected_text: z.string().nullable(),
  usage: VerifyResponseUsageSchema,
  context: VerifyRequestContextSchema.optional(),
});
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

export const AsyncAcceptedSchema = z.object({
  id: z.string(),
  status: z.literal("queued"),
});
export type AsyncAccepted = z.infer<typeof AsyncAcceptedSchema>;

export const AsyncVerificationStatusSchema = z.union([
  VerifyResponseSchema,
  z.object({
    id: z.string(),
    status: z.enum(["queued", "running", "failed"]),
    error: z.string().optional(),
  }),
]);
export type AsyncVerificationStatus = z.infer<typeof AsyncVerificationStatusSchema>;

export const ErrorBodySchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    request_id: z.string().optional(),
  }),
});
export type ErrorBody = z.infer<typeof ErrorBodySchema>;

export const ClassifyPromptRequestSchema = z.object({
  prompt: z.string().min(1),
});
export type ClassifyPromptRequest = z.infer<typeof ClassifyPromptRequestSchema>;

export const ClassifyPromptResponseSchema = z.object({
  volatility: VolatilityClassSchema,
  suggested_cache_ttl_s: z.number().int().positive().nullable(),
  no_store: z.boolean(),
  categories: z.array(z.string()),
});
export type ClassifyPromptResponse = z.infer<typeof ClassifyPromptResponseSchema>;
