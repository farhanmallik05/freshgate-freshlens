import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyPrompt } from "../src/classify.js";
import { VolatilityClass } from "../src/contract/schemas.js";

describe("Prompt Volatility Classifier Tests", () => {
  const root = join(__dirname, "../..");
  const raw = readFileSync(join(root, "shared/fixtures/classify-vectors.json"), "utf-8");
  const vectors: { id: string; prompt: string; expected: VolatilityClass }[] = JSON.parse(raw);

  it("satisfies >= 95% overall accuracy and 100% on realtime and static vectors", () => {
    let exactMatches = 0;
    let realtimeMatches = 0;
    let realtimeTotal = 0;
    let staticMatches = 0;
    let staticTotal = 0;

    for (const v of vectors) {
      const res = classifyPrompt(v.prompt);
      const isMatch = res.volatility === v.expected;
      if (isMatch) exactMatches++;

      if (v.expected === "realtime") {
        realtimeTotal++;
        if (isMatch) realtimeMatches++;
      }
      if (v.expected === "static") {
        staticTotal++;
        if (isMatch) staticMatches++;
      }
    }

    const accuracy = exactMatches / vectors.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.95);
    expect(realtimeMatches).toBe(realtimeTotal);
    expect(staticMatches).toBe(staticTotal);
  });

  it("executes under 2ms per prompt latency budget", () => {
    const samplePrompt = "What is the latest pricing and version release of Next.js right now?";
    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      classifyPrompt(samplePrompt);
    }
    const end = performance.now();
    const avgMs = (end - start) / 500;
    expect(avgMs).toBeLessThan(2.0);
  });
});
