import { describe, it, expect } from "vitest";
import {
  ClaimSchema,
  EvidenceSchema,
  ClaimResultSchema,
  VerifyRequestSchema,
  VerifyResponseSchema,
  ErrorBodySchema,
} from "../src/contract/schemas.js";

describe("Schema Validation Tests", () => {
  it("validates a valid Claim", () => {
    const validClaim = {
      id: "c1",
      text: "Next.js 14 is the latest version",
      span: { start: 0, end: 32 },
      normalized: "Next.js 14 is the latest version",
      category: "version_release",
      claimed_as_of: "2024-01-01",
      entities: ["Next.js", "Vercel"],
      query: "Next.js latest version release",
      official_domains: ["nextjs.org", "vercel.com"],
      prior: 0.75,
    };
    const parsed = ClaimSchema.safeParse(validClaim);
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid Claim with improper span or negative prior", () => {
    const invalidClaim = {
      id: "claim_invalid",
      text: "Test",
      span: { start: 50, end: 10 },
      normalized: "Test",
      category: "pricing",
      claimed_as_of: null,
      entities: [],
      query: "Test",
      official_domains: [],
      prior: -0.5,
    };
    const parsed = ClaimSchema.safeParse(invalidClaim);
    expect(parsed.success).toBe(false);
  });

  it("validates a valid Evidence object", () => {
    const validEvidence = {
      id: "e1",
      url: "https://nextjs.org/blog/next-15",
      domain: "nextjs.org",
      title: "Next.js 15 Release Notes",
      snippet: "Next.js 15 is now generally available.",
      published_date: "2024-10-21T00:00:00Z",
      retrieved_at: new Date().toISOString(),
      authority: "official",
      score: 0.95,
    };
    const parsed = EvidenceSchema.safeParse(validEvidence);
    expect(parsed.success).toBe(true);
  });

  it("validates a complete VerifyResponse", () => {
    const response = {
      id: "vrf_01JBMXTEST0001",
      status: "completed",
      created_at: new Date().toISOString(),
      latency_ms: 320,
      overall: {
        score: 85,
        band: "fresh",
        claims_total: 1,
        claims_checked: 1,
        stale_count: 0,
        unverifiable_count: 0,
      },
      claims: [
        {
          claim: {
            id: "c1",
            text: "ChatGPT Plus costs $20/month",
            span: { start: 0, end: 28 },
            normalized: "ChatGPT Plus subscription costs $20 per month",
            category: "pricing",
            claimed_as_of: null,
            entities: ["ChatGPT Plus", "OpenAI"],
            query: "ChatGPT Plus subscription price official",
            official_domains: ["openai.com"],
            prior: 0.4,
          },
          verdict: "current",
          freshness: 90,
          band: "fresh",
          correction: null,
          evidence: [],
          supporting_evidence_ids: [],
          judge_confidence: 0.95,
          reasoning: "Verified on openai.com pricing page.",
          cache: { hit: false, age_s: null },
          status: "ok",
        },
      ],
      corrected_text: null,
      usage: {
        tavily_credits: 1,
        llm_tokens: { in: 120, out: 80 },
        cache_hits: 0,
      },
      context: {
        source: "api",
      },
    };
    const parsed = VerifyResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);
  });

  it("validates ErrorBody schema", () => {
    const err = {
      error: {
        code: "invalid_request",
        message: "text length exceeds 20000 characters",
        request_id: "req_123",
      },
    };
    const parsed = ErrorBodySchema.safeParse(err);
    expect(parsed.success).toBe(true);
  });
});
