import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CategorySchema, VolatilityClassSchema } from "../src/contract/schemas.js";

const CategoryRuleSchema = z.object({
  half_life_days: z.number().int().positive().nullable(),
  claim_cache_ttl_s: z.number().int().positive(),
  tavily_topic: z.string().nullable(),
  time_range: z.string().nullable(),
  max_age_hours: z.number().int().positive().nullable(),
  regex: z.string(),
  meaning: z.string(),
});

const VolatilityClassRuleSchema = z.object({
  suggested_cache_ttl_s: z.number().int().positive().nullable(),
  no_store: z.boolean(),
  weight: z.number(),
  cues_regex: z.string(),
});

const VolatilityRulesSchema = z.object({
  categories: z.record(CategorySchema, CategoryRuleSchema),
  prompt_volatility_classes: z.record(VolatilityClassSchema, VolatilityClassRuleSchema),
});

const VectorSchema = z.array(
  z.object({
    id: z.string(),
    prompt: z.string(),
    expected: VolatilityClassSchema,
  })
);

describe("Shared Rules and Fixtures Validation", () => {
  const root = join(__dirname, "../..");

  it("validates shared/volatility-rules.json structure and regexes", () => {
    const raw = readFileSync(join(root, "shared/volatility-rules.json"), "utf-8");
    const json = JSON.parse(raw);
    const parsed = VolatilityRulesSchema.safeParse(json);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      // Validate all regexes compile without errors in JavaScript (and are RE2 safe)
      for (const [cat, rule] of Object.entries(parsed.data.categories)) {
        expect(() => new RegExp(rule.regex)).not.toThrow();
        // Disallow lookaround (?=, (?!, (?<=, (?<!
        expect(rule.regex).not.toMatch(/\(\?[=!<]/);
      }
      for (const [cls, rule] of Object.entries(parsed.data.prompt_volatility_classes)) {
        expect(() => new RegExp(rule.cues_regex)).not.toThrow();
        expect(rule.cues_regex).not.toMatch(/\(\?[=!<]/);
      }
    }
  });

  it("validates shared/fixtures/classify-vectors.json has exactly 40 valid vectors", () => {
    const raw = readFileSync(join(root, "shared/fixtures/classify-vectors.json"), "utf-8");
    const json = JSON.parse(raw);
    const parsed = VectorSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.length).toBe(40);
      const classes = new Set(parsed.data.map((v) => v.expected));
      expect(classes.has("realtime")).toBe(true);
      expect(classes.has("high")).toBe(true);
      expect(classes.has("medium")).toBe(true);
      expect(classes.has("low")).toBe(true);
      expect(classes.has("static")).toBe(true);
    }
  });
});
