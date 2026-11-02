import { type VerifyResponse } from "../../shared/contract";
import { type SiteAdapter } from "../adapters/types";

export function buildFixPrompt(response: VerifyResponse): string {
  const staleOrAging = response.claims.filter(
    (c) => (c.band === "stale" || c.band === "aging") && c.correction
  );

  if (staleOrAging.length === 0) {
    return "";
  }

  const lines = [
    "Some facts in your previous answer may be outdated. Using ONLY the verified information below, rewrite your answer, keeping its structure and tone, and cite the sources:",
    "",
  ];

  for (const item of staleOrAging) {
    const topSource = item.evidence[0];
    const sourceStr = topSource
      ? `${topSource.url}${topSource.published_date ? ` (${topSource.published_date.slice(0, 10)})` : ""}`
      : "Live web documentation";

    lines.push(
      `- Claim: "${item.claim.text}" | Updated: ${item.correction} | Source: ${sourceStr}`
    );
  }

  return lines.join("\n");
}

export function executeFixWithFreshContext(
  adapter: SiteAdapter,
  response: VerifyResponse
): { success: boolean; prompt: string } {
  const prompt = buildFixPrompt(response);
  if (!prompt) {
    return { success: false, prompt: "" };
  }
  const success = adapter.insertPrompt(prompt);
  return { success, prompt };
}
