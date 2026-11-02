import { describe, it, expect, beforeEach } from "vitest";
import {
  computeHash,
  getCachedResponse,
  setCachedResponse,
  clearCache,
} from "../src/background/cache";
import { DEMO_FIXTURES } from "../src/demo/fixtures";

describe("Session Cache", () => {
  beforeEach(async () => {
    await clearCache();
  });

  it("computes deterministic hash for identical text and depth", async () => {
    const h1 = await computeHash("Test query message", "fast");
    const h2 = await computeHash("Test query message", "fast");
    const h3 = await computeHash("Test query message", "thorough");

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("stores and retrieves cached verification responses", async () => {
    const hash = await computeHash("Next.js 14 release", "fast");
    const fixture = DEMO_FIXTURES.nextjs;

    expect(await getCachedResponse(hash)).toBeNull();

    await setCachedResponse(hash, fixture);
    const cached = await getCachedResponse(hash);

    expect(cached).not.toBeNull();
    expect(cached?.id).toBe(fixture.id);
  });

  it("bypasses cache when requested", async () => {
    const hash = await computeHash("Claude pricing", "fast");
    await setCachedResponse(hash, DEMO_FIXTURES.pricing);

    const bypassed = await getCachedResponse(hash, true);
    expect(bypassed).toBeNull();
  });
});
