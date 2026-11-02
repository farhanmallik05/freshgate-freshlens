import { describe, it, expect } from "vitest";
import { DEMO_FIXTURES, getFixtureForText } from "../src/demo/fixtures";
import { VerifyResponseSchema } from "../src/shared/contract";

describe("Deterministic Demo Fixtures", () => {
  it("validates all 8 demo fixtures strictly against VerifyResponseSchema", () => {
    const fixtureKeys = Object.keys(DEMO_FIXTURES);
    expect(fixtureKeys.length).toBeGreaterThanOrEqual(8);

    for (const key of fixtureKeys) {
      const fixture = DEMO_FIXTURES[key];
      const parsed = VerifyResponseSchema.safeParse(fixture);
      if (!parsed.success) {
        console.error(`Fixture validation failed for key "${key}":`, parsed.error);
      }
      expect(parsed.success).toBe(true);
      expect(fixture.overall.score).toBeGreaterThanOrEqual(0);
      expect(fixture.overall.score).toBeLessThanOrEqual(100);
    }
  });

  it("returns targeted fixture based on keyword recognition", () => {
    const nextFixture = getFixtureForText("Can you tell me if Next.js 14 is still good?");
    expect(nextFixture.id.toLowerCase()).toContain("nextjs");
    expect(nextFixture.overall.band).toBe("stale");

    const ceoFixture = getFixtureForText("Who is the CEO of Twitter right now?");
    expect(ceoFixture.id.toLowerCase()).toContain("ceo");
    expect(ceoFixture.overall.stale_count).toBeGreaterThan(0);
  });

  it("returns safe fallback fixture for novel text", () => {
    const novelFixture = getFixtureForText("Some random philosophical essay without named entities.");
    expect(novelFixture.status).toBe("completed");
    expect(novelFixture.claims.length).toBeGreaterThanOrEqual(1);
  });
});
