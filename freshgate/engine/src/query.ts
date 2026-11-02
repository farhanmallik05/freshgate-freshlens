import { Category, Claim } from "./contract/schemas.js";

const CategoryModifiers: Record<Category, string> = {
  pricing: "pricing official page",
  version_release: "latest release version changelog",
  leadership_role: "current",
  event_status: "latest news",
  law_policy: "current regulation official",
  statistic_metric: "latest statistics metric",
  record_ranking: "current record ranking",
  other_volatile: "current status",
  evergreen: "",
};

export function buildSearchQuery(claim: Pick<Claim, "normalized" | "category" | "entities">): string {
  let cleaned = claim.normalized.trim();

  // Strip hedges
  cleaned = cleaned.replace(/\b(I think|I believe|maybe|probably|as far as I know|in my opinion)\b/gi, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const modifier = CategoryModifiers[claim.category] || "";
  const combined = modifier ? `${cleaned} ${modifier}` : cleaned;

  // Bound to maximum 25 words
  const words = combined.split(/\s+/).filter(Boolean);
  if (words.length > 25) {
    return words.slice(0, 25).join(" ");
  }

  return words.join(" ");
}
