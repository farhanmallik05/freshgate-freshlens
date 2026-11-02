import { ClassifyPromptResponse, VolatilityClass } from "./contract/schemas.js";
import { loadVolatilityRules } from "./rules.js";

export function classifyPrompt(prompt: string): ClassifyPromptResponse {
  const rules = loadVolatilityRules();
  const text = prompt.trim();

  // 1. Identify matched categories
  const matchedCategories: string[] = [];
  for (const [catName, catRule] of Object.entries(rules.categories)) {
    if (catName !== "evergreen" && catRule.compiledRegex.test(text)) {
      matchedCategories.push(catName);
    }
  }

  // 2. Identify prompt volatility class by weighted cue matching
  // Absolute rule: realtime matches always take immediate precedence
  if (rules.prompt_volatility_classes.realtime.compiledRegex.test(text)) {
    const rule = rules.prompt_volatility_classes.realtime;
    return {
      volatility: "realtime",
      suggested_cache_ttl_s: rule.suggested_cache_ttl_s,
      no_store: rule.no_store,
      categories: matchedCategories,
    };
  }

  // Check static cues (math, definition, proof, history, algorithm)
  const isStatic = rules.prompt_volatility_classes.static.compiledRegex.test(text);
  const isHigh = rules.prompt_volatility_classes.high.compiledRegex.test(text);
  const isMedium = rules.prompt_volatility_classes.medium.compiledRegex.test(text);
  const isLow = rules.prompt_volatility_classes.low.compiledRegex.test(text);

  let selectedClass: VolatilityClass = "medium";

  if (isHigh && !isMedium) {
    selectedClass = "high";
  } else if (isMedium && !isHigh) {
    selectedClass = "medium";
  } else if (isHigh && isMedium) {
    // If both match, count occurrences
    const highMatches = (text.match(new RegExp(rules.prompt_volatility_classes.high.cues_regex, "gi")) || []).length;
    const medMatches = (text.match(new RegExp(rules.prompt_volatility_classes.medium.cues_regex, "gi")) || []).length;
    selectedClass = medMatches >= highMatches ? "medium" : "high";
  } else if (isLow && !isStatic) {
    selectedClass = "low";
  } else if (isStatic && !isLow && !isHigh && !isMedium) {
    selectedClass = "static";
  } else if (isLow && isStatic) {
    selectedClass = "low";
  } else if (isStatic) {
    selectedClass = "static";
  }

  const selectedRule = rules.prompt_volatility_classes[selectedClass];

  return {
    volatility: selectedClass,
    suggested_cache_ttl_s: selectedRule.suggested_cache_ttl_s,
    no_store: selectedRule.no_store,
    categories: matchedCategories,
  };
}
