import { describe, it, expect } from "vitest";
import {
  VerifyRequestSchema,
  VerifyResponseSchema,
  ClaimSchema,
  EvidenceSchema,
} from "../src/shared/contract";

describe("FreshLens Contract Schemas", () => {
  it("validates a standard VerifyRequest", () => {
    const valid = {
      text: "Next.js 14 was released in late 2023.",
      context: {
        source: "extension",
        model: "gpt-4o",
      },
      options: {
        max_claims: 5,
        depth: "fast",
        include_evidence: true,
        nocache: false,
      },
    };
    const parsed = VerifyRequestSchema.parse(valid);
    expect(parsed.text).toBe(valid.text);
    expect(parsed.context?.source).toBe("extension");
  });

  it("rejects empty text in VerifyRequest", () => {
    expect(() =>
      VerifyRequestSchema.parse({
        text: "",
      })
    ).toThrow();
  });

  it("validates a full Claim object", () => {
    const claim = {
      id: "c1",
      text: "Claude 3.5 Sonnet costs $3/MTok input",
      span: { start: 0, end: 36 },
      normalized: "Claude 3.5 Sonnet pricing is $3 per MTok input",
      category: "pricing",
      claimed_as_of: "2024-06-01",
      entities: ["Claude 3.5 Sonnet"],
      query: "Claude 3.5 Sonnet pricing",
      official_domains: ["anthropic.com"],
      prior: 0.85,
    };
    const parsed = ClaimSchema.parse(claim);
    expect(parsed.id).toBe("c1");
    expect(parsed.prior).toBe(0.85);
  });

  it("validates Evidence schema", () => {
    const evidence = {
      id: "e1",
      url: "https://www.anthropic.com/pricing",
      domain: "anthropic.com",
      title: "Pricing",
      snippet: "Claude 3.5 Sonnet costs $3 per million input tokens.",
      published_date: "2024-10-22T00:00:00.000Z",
      retrieved_at: new Date().toISOString(),
      authority: "official",
      score: 0.99,
    };
    const parsed = EvidenceSchema.parse(evidence);
    expect(parsed.authority).toBe("official");
  });
});
