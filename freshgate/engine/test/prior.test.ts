import { describe, it, expect } from "vitest";
import { computeStalenessPrior } from "../src/prior.js";
import { Category } from "../src/contract/schemas.js";

describe("Staleness Prior Golden Value Tests", () => {
  const categories: Category[] = [
    "pricing",
    "version_release",
    "leadership_role",
    "law_policy",
    "statistic_metric",
    "event_status",
    "record_ranking",
    "other_volatile",
    "evergreen",
  ];

  it("returns P = 0 for evergreen regardless of D", () => {
    const fixedNow = new Date("2024-10-01T00:00:00Z");
    const d0 = computeStalenessPrior({
      category: "evergreen",
      claimed_as_of: "2024-10-01",
      now: fixedNow,
    });
    const d1000 = computeStalenessPrior({
      category: "evergreen",
      claimed_as_of: "2021-01-01",
      now: fixedNow,
    });
    expect(d0).toBe(0);
    expect(d1000).toBe(0);
  });

  it("handles knowledge_cutoff correctly", () => {
    const now = new Date("2024-10-01T00:00:00Z");
    // 2024-04-01 knowledge cutoff (6 months ago, ~183 days)
    const pCutoff = computeStalenessPrior({
      category: "pricing",
      knowledge_cutoff: "2024-04",
      now,
    });
    // 1 - 0.5^(183/45) = 1 - 0.5^4.06 = ~0.94
    expect(pCutoff).toBeGreaterThan(0.9);
  });

  it("picks the later of knowledge_cutoff and claimed_as_of", () => {
    const now = new Date("2024-10-01T00:00:00Z");
    const pBoth = computeStalenessPrior({
      category: "pricing",
      knowledge_cutoff: "2023-01",
      claimed_as_of: "2024-09-01", // later date
      now,
    });
    // Days from 2024-09-01 = 30 days
    expect(pBoth).toBeCloseTo(0.37, 2);
  });

  it("computes exact golden values for pricing (H=45)", () => {
    const now = new Date("2024-10-01T00:00:00Z");

    // D = 0 days
    const p0 = computeStalenessPrior({
      category: "pricing",
      claimed_as_of: "2024-10-01",
      now,
    });
    expect(p0).toBe(0);

    // D = 30 days (claimed 2024-09-01)
    const p30 = computeStalenessPrior({
      category: "pricing",
      claimed_as_of: "2024-09-01",
      now,
    });
    // 1 - 0.5^(30/45) = 1 - 0.62996 = 0.3700
    expect(p30).toBeCloseTo(0.37, 2);

    // D = 270 days (default when neither date is provided)
    const pDefault = computeStalenessPrior({
      category: "pricing",
      now,
    });
    // 1 - 0.5^(270/45) = 1 - 0.5^6 = 1 - 0.015625 = 0.9844
    expect(pDefault).toBeCloseTo(0.9844, 3);
  });

  it("computes exact golden values for event_status (H=14)", () => {
    const now = new Date("2024-10-01T00:00:00Z");

    const p0 = computeStalenessPrior({
      category: "event_status",
      claimed_as_of: "2024-10-01",
      now,
    });
    expect(p0).toBe(0);

    const p14 = computeStalenessPrior({
      category: "event_status",
      claimed_as_of: "2024-09-17",
      now,
    });
    // 1 - 0.5^1 = 0.5
    expect(p14).toBeCloseTo(0.5, 2);
  });

  it("evaluates all categories across D = 0, 30, 270, 1000 days monotonically", () => {
    const now = new Date("2024-10-01T00:00:00Z");

    for (const cat of categories) {
      if (cat === "evergreen") continue;

      const p0 = computeStalenessPrior({ category: cat, claimed_as_of: "2024-10-01", now });
      const p30 = computeStalenessPrior({ category: cat, claimed_as_of: "2024-09-01", now });
      const p270 = computeStalenessPrior({ category: cat, now }); // default D=270
      const p1000 = computeStalenessPrior({ category: cat, claimed_as_of: "2021-12-01", now });

      expect(p0).toBe(0);
      expect(p30).toBeGreaterThanOrEqual(p0);
      expect(p270).toBeGreaterThanOrEqual(p30);
      expect(p1000).toBeGreaterThanOrEqual(p270);
      expect(p1000).toBeLessThanOrEqual(1.0);
    }
  });
});
