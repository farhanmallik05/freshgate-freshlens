import { describe, it, expect } from "vitest";
import { buildFixPrompt, executeFixWithFreshContext } from "../src/content/actions/fixPrompt";
import { generateMarkdownReport } from "../src/content/actions/copyReport";
import { DEMO_FIXTURES } from "../src/demo/fixtures";
import { type SiteAdapter } from "../src/content/adapters/types";

describe("Remediation Actions", () => {
  it("builds a structured fix prompt with citations for stale claims", () => {
    const fixture = DEMO_FIXTURES.nextjs;
    const prompt = buildFixPrompt(fixture);

    expect(prompt).toContain("Some facts in your previous answer may be outdated");
    expect(prompt).toContain("Next.js 14 is the latest stable release");
    expect(prompt).toContain("Updated: Next.js 15 is the latest stable version");
    expect(prompt).toContain("https://nextjs.org/blog/next-15");
  });

  it("returns empty prompt when no claims require remediation", () => {
    const evergreenFixture = DEMO_FIXTURES.evergreen;
    const prompt = buildFixPrompt(evergreenFixture);
    expect(prompt).toBe("");
  });

  it("generates markdown audit report with tables and latency", () => {
    const fixture = DEMO_FIXTURES.pricing;
    const report = generateMarkdownReport(fixture);

    expect(report).toContain("### FreshLens Verification Report");
    expect(report).toContain("| Claim | Verdict | Score | Correction / Ground Truth | Top Source |");
    expect(report).toContain("anthropic.com");
    expect(report).toContain("Latency: 310ms");
  });

  it("executes prompt insertion via adapter without auto-submitting", () => {
    let insertedText = "";
    const mockAdapter: SiteAdapter = {
      id: "mock",
      name: "Mock",
      matches: () => true,
      findAssistantMessages: () => [],
      messageId: () => "m1",
      isStreaming: () => false,
      getInputBox: () => document.createElement("textarea"),
      insertPrompt: (t: string) => {
        insertedText = t;
        return true;
      },
      getAnchorForOverlay: (el) => el,
    };

    const res = executeFixWithFreshContext(mockAdapter, DEMO_FIXTURES.ceo);
    expect(res.success).toBe(true);
    expect(insertedText).toContain("Linda Yaccarino is the CEO of X");
  });
});
