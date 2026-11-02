import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Category, VolatilityClass } from "./contract/schemas.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export interface CategoryRule {
  half_life_days: number | null;
  claim_cache_ttl_s: number;
  tavily_topic: string | null;
  time_range: string | null;
  max_age_hours: number | null;
  regex: string;
  compiledRegex: RegExp;
  meaning: string;
}

export interface VolatilityClassRule {
  suggested_cache_ttl_s: number | null;
  no_store: boolean;
  weight: number;
  cues_regex: string;
  compiledRegex: RegExp;
}

export interface VolatilityRules {
  categories: Record<Category, CategoryRule>;
  prompt_volatility_classes: Record<VolatilityClass, VolatilityClassRule>;
}

let cachedRules: VolatilityRules | null = null;

export function loadVolatilityRules(forceReload = false): VolatilityRules {
  if (cachedRules && !forceReload) {
    return cachedRules;
  }

  // Find shared/volatility-rules.json relative to cwd or module
  const possiblePaths = [
    join(process.cwd(), "shared/volatility-rules.json"),
    join(process.cwd(), "../shared/volatility-rules.json"),
    join(__dirname, "../../shared/volatility-rules.json"),
  ];

  let raw = "";
  for (const p of possiblePaths) {
    try {
      raw = readFileSync(p, "utf-8");
      break;
    } catch {
      // try next
    }
  }

  if (!raw) {
    throw new Error("Could not locate shared/volatility-rules.json");
  }

  const parsed = JSON.parse(raw);

  const categories: Record<string, CategoryRule> = {};
  for (const [key, val] of Object.entries(parsed.categories)) {
    const v = val as any;
    categories[key] = {
      ...v,
      compiledRegex: new RegExp(v.regex, "i"),
    };
  }

  const promptClasses: Record<string, VolatilityClassRule> = {};
  for (const [key, val] of Object.entries(parsed.prompt_volatility_classes)) {
    const v = val as any;
    promptClasses[key] = {
      ...v,
      compiledRegex: new RegExp(v.cues_regex, "i"),
    };
  }

  cachedRules = {
    categories: categories as Record<Category, CategoryRule>,
    prompt_volatility_classes: promptClasses as Record<VolatilityClass, VolatilityClassRule>,
  };

  return cachedRules;
}
