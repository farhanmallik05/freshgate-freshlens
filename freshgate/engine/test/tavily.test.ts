import { describe, it, expect, beforeEach } from "vitest";
import { searchTavily, resetHourlyCredits, getHourlyCreditsUsed } from "../src/tavily.js";
import { Claim } from "../src/contract/schemas.js";

describe("Tavily Search Client Tests", () => {
  beforeEach(() => {
    resetHourlyCredits();
  });

  const sampleClaim: Claim = {
    id: "c1",
    text: "Next.js 14 is the latest version",
    span: { start: 0, end: 32 },
    normalized: "Next.js 14 is the latest version",
    category: "version_release",
    claimed_as_of: null,
    entities: ["Next.js"],
    query: "Next.js latest version changelog",
    official_domains: ["nextjs.org"],
    prior: 0.8,
  };

  it("returns mock evidence with proper shape in mock mode", async () => {
    const res = await searchTavily(sampleClaim, sampleClaim.query, { depth: "fast" });
    expect(res.status).toBe("ok");
    expect(res.creditsUsed).toBeGreaterThan(0);
    expect(res.results.length).toBeGreaterThan(0);

    const top = res.results[0];
    expect(top.url).toBeDefined();
    expect(top.title).toBeDefined();
    expect(top.content).toBeDefined();
  });

  it("enforces rolling hourly credit budget and degrades to budget_exhausted", async () => {
    // Repeatedly simulate searches until budget is reached
    // Default budget is 300 credits
    let hitBudget = false;
    for (let i = 0; i < 350; i++) {
      const res = await searchTavily(sampleClaim, "query", { depth: "fast" });
      if (res.status === "budget_exhausted") {
        hitBudget = true;
        break;
      }
    }
    expect(hitBudget).toBe(true);
    expect(getHourlyCreditsUsed()).toBeGreaterThanOrEqual(300);
  });
});
