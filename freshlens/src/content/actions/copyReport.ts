import { type VerifyResponse } from "../../shared/contract";

export function generateMarkdownReport(response: VerifyResponse): string {
  const { score, band, claims_total, stale_count } = response.overall;

  const lines = [
    `### FreshLens Verification Report`,
    `**Overall Freshness:** ${score}/100 (${band.toUpperCase()}) | **Stale Claims Detected:** ${stale_count}/${claims_total}`,
    `*Verified live via FreshGate & Tavily API at ${response.created_at} (Latency: ${response.latency_ms}ms)*`,
    "",
    "| Claim | Verdict | Score | Correction / Ground Truth | Top Source |",
    "|---|---|---|---|---|",
  ];

  for (const c of response.claims) {
    const claimEscaped = c.claim.text.replace(/\|/g, "\\|");
    const correctionEscaped = (c.correction || "Current / Verified").replace(/\|/g, "\\|");
    const topSource = c.evidence[0];
    const sourceLink = topSource
      ? `[${topSource.domain}](${topSource.url})`
      : "N/A";

    lines.push(
      `| ${claimEscaped} | ${c.verdict} | ${c.freshness} | ${correctionEscaped} | ${sourceLink} |`
    );
  }

  return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
