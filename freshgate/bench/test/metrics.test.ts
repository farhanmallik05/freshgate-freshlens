import { describe, it, expect } from "vitest";
import { computeMetrics, StaleBenchItem, RunResult } from "../evaluate.js";

describe("StaleBench Evaluation Metrics", () => {
  const dummyDataset = new Map<string, StaleBenchItem>([
    [
      "p1",
      {
        id: "p1",
        prompt: "Price of ChatGPT Plus",
        category: "pricing",
        expected_stale_prone: true,
        ground_truth: {
          truth: "$20",
          key_values: ["$20"],
          sources: ["https://openai.com"],
          as_of: "2026-11-01",
          human_verified: true,
        },
      },
    ],
    [
      "p2",
      {
        id: "p2",
        prompt: "Definition of a prime number",
        category: "evergreen",
        expected_stale_prone: false,
        ground_truth: {
          truth: "Divisible by 1 and itself",
          key_values: ["prime"],
          sources: ["https://mathworld.com"],
          as_of: "2026-11-01",
          human_verified: true,
        },
      },
    ],
  ]);

  it("computes exact precision, recall, and F1 on known confusion cases", () => {
    const results: RunResult[] = [
      // TP: is stale and flagged
      {
        promptId: "p1",
        modelId: "gpt-4o",
        answer: "Sample answer",
        hasStaleFact: true,
        flaggedByFreshGate: true,
        overallScore: 30,
        band: "stale",
        claimsCount: 1,
        staleCount: 1,
        latencyMs: 150,
        tavilyCredits: 1,
        cacheHit: false,
      },
      // TN on evergreen: not stale and not flagged
      {
        promptId: "p2",
        modelId: "gpt-4o",
        answer: "Sample answer",
        hasStaleFact: false,
        flaggedByFreshGate: false,
        overallScore: 100,
        band: "fresh",
        claimsCount: 1,
        staleCount: 0,
        latencyMs: 50,
        tavilyCredits: 0,
        cacheHit: false,
      },
    ];

    const metrics = computeMetrics(results, dummyDataset);
    expect(metrics.precision).toBe(1.0);
    expect(metrics.recall).toBe(1.0);
    expect(metrics.f1).toBe(1.0);
    expect(metrics.evergreen_fp_rate).toBe(0.0);
  });

  it("calculates false positive rate properly when evergreen is erroneously flagged", () => {
    const results: RunResult[] = [
      {
        promptId: "p2",
        modelId: "gpt-4o",
        answer: "Sample answer",
        hasStaleFact: false,
        flaggedByFreshGate: true, // FP
        overallScore: 30,
        band: "stale",
        claimsCount: 1,
        staleCount: 1,
        latencyMs: 120,
        tavilyCredits: 1,
        cacheHit: false,
      },
    ];

    const metrics = computeMetrics(results, dummyDataset);
    expect(metrics.evergreen_fp_rate).toBe(1.0);
    expect(metrics.precision).toBe(0.0);
  });
});
