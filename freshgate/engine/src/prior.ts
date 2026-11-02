import { Category } from "./contract/schemas.js";
import { loadVolatilityRules } from "./rules.js";

export interface PriorInput {
  category: Category;
  claimed_as_of?: string | null; // "YYYY-MM-DD"
  knowledge_cutoff?: string | null; // "YYYY-MM"
  now?: string | Date;
}

export function computeStalenessPrior(input: PriorInput): number {
  if (input.category === "evergreen") {
    return 0;
  }

  const rules = loadVolatilityRules();
  const catRule = rules.categories[input.category];
  if (!catRule || catRule.half_life_days === null || catRule.half_life_days <= 0) {
    return 0;
  }

  const H = catRule.half_life_days;
  const now = input.now
    ? typeof input.now === "string"
      ? new Date(input.now).getTime()
      : input.now.getTime()
    : Date.now();

  let refTime: number | null = null;

  if (input.claimed_as_of) {
    const t = new Date(input.claimed_as_of + "T00:00:00Z").getTime();
    if (!isNaN(t)) {
      refTime = t;
    }
  }

  if (input.knowledge_cutoff) {
    const t = new Date(input.knowledge_cutoff + "-01T00:00:00Z").getTime();
    if (!isNaN(t)) {
      refTime = refTime !== null ? Math.max(refTime, t) : t;
    }
  }

  let D = 270; // default if neither exists
  if (refTime !== null) {
    const diffMs = now - refTime;
    D = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  }

  // P = 1 - 0.5^(D/H)
  const P = 1 - Math.pow(0.5, D / H);
  return Math.min(1, Math.max(0, Number(P.toFixed(4))));
}
