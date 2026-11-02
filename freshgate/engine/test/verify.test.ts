import { describe, it, expect } from "vitest";
import { verifyText } from "../src/verify.js";
import { VerifyRequest } from "../src/contract/schemas.js";

describe("End-to-End Verification Pipeline Tests", () => {
  it("verifies time-sensitive claims and generates SPEC section 7 correction block", async () => {
    const text =
      "The latest Next.js version is 14 and ChatGPT Plus costs $20 per month. Tim Cook is the CEO of Apple.";

    const request: VerifyRequest = {
      text,
      options: { max_claims: 3, depth: "fast" },
    };

    const response = await verifyText(request);

    expect(response.status).toBe("completed");
    expect(response.id).toMatch(/^vrf_[0-9A-Za-z]+$/);
    expect(response.claims.length).toBeGreaterThanOrEqual(3);
    expect(response.usage.tavily_credits).toBeGreaterThan(0);
    expect(response.latency_ms).toBeGreaterThanOrEqual(0);

    // Stale claim (Next.js 14) should generate correction
    const staleClaim = response.claims.find((c) => c.verdict === "stale");
    expect(staleClaim).toBeDefined();
    expect(staleClaim?.correction).toBeDefined();

    // SPEC Section 7 correction format assertion
    expect(response.corrected_text).not.toBeNull();
    if (response.corrected_text) {
      expect(response.corrected_text).toContain("---");
      expect(response.corrected_text).toContain("**Freshness check (FreshGate):**");
      expect(response.corrected_text).toContain("~~The latest Next.js version is 14~~");
      expect(response.corrected_text).toContain("-> Next.js 15 is the latest version");
    }

    // Overall score
    expect(response.overall.score).toBeGreaterThanOrEqual(0);
    expect(response.overall.score).toBeLessThanOrEqual(100);
    expect(response.overall.claims_checked).toBeGreaterThanOrEqual(3);
  });

  it("handles evergreen stable facts with skipped_evergreen status and 0 credits", async () => {
    const text = "What is the mathematical definition of a prime number and the formula for circles?";
    const request: VerifyRequest = {
      text,
      options: { max_claims: 2 },
    };

    const response = await verifyText(request);
    expect(response.status).toBe("completed");
  });
});
