import { describe, it, expect } from "vitest";
import { anchorSpan, extractClaims, findHeuristicClaims } from "../src/extract.js";
import { Span } from "../src/contract/schemas.js";

describe("Claim Extraction & Span Anchoring Tests", () => {
  it("anchors exact substrings accurately", () => {
    const text = "Next.js 14 is the latest version. Next.js 15 was released recently.";
    const claimed: Span[] = [];

    const span1 = anchorSpan(text, "Next.js 14 is the latest version", claimed);
    expect(span1).not.toBeNull();
    expect(span1?.start).toBe(0);
    expect(span1?.end).toBe(32);
    claimed.push(span1!);

    // Test repeated phrase disambiguation
    const span2 = anchorSpan(text, "Next.js", claimed);
    expect(span2).not.toBeNull();
    expect(span2?.start).toBe(34); // Must choose second occurrence because first is inside span1!
  });

  it("handles unicode, emoji, and markdown in span anchoring", () => {
    const text = "🚀 Next.js 14 costs $0 (free tier) & ChatGPT Plus costs $20/mo! ✨";
    const claimed: Span[] = [];

    const span = anchorSpan(text, "ChatGPT Plus costs $20/mo!", claimed);
    expect(span).not.toBeNull();
    const extractedSubstring = text.slice(span!.start, span!.end);
    expect(extractedSubstring).toBe("ChatGPT Plus costs $20/mo!");
  });

  it("runs >= 25 table-driven test cases through heuristic extraction", () => {
    const tableCases = [
      { text: "ChatGPT Plus costs $20 per month.", cat: "pricing" },
      { text: "Anthropic Claude Pro costs $20/month subscription.", cat: "pricing" },
      { text: "GitHub Copilot pricing is $10 per month.", cat: "pricing" },
      { text: "Vercel Pro tier costs $20 per user.", cat: "pricing" },
      { text: "Midjourney plan costs $30 a month.", cat: "pricing" },
      { text: "Next.js 15 is the latest release.", cat: "version_release" },
      { text: "Python 3.13 was recently released.", cat: "version_release" },
      { text: "Node.js v22 is currently available.", cat: "version_release" },
      { text: "Go 1.24 version was announced.", cat: "version_release" },
      { text: "React 19 release is out.", cat: "version_release" },
      { text: "Tim Cook is the CEO of Apple.", cat: "leadership_role" },
      { text: "Satya Nadella is the chairman and CEO of Microsoft.", cat: "leadership_role" },
      { text: "Sundar Pichai leads Google as CEO.", cat: "leadership_role" },
      { text: "Sam Altman is the CEO of OpenAI.", cat: "leadership_role" },
      { text: "Dario Amodei is the CEO and founder of Anthropic.", cat: "leadership_role" },
      { text: "Corporate tax rate is 21% under current law.", cat: "law_policy" },
      { text: "The new EU AI Act regulation mandates compliance.", cat: "law_policy" },
      { text: "Capital gains tax policy applies to digital assets.", cat: "law_policy" },
      { text: "Data privacy policy under GDPR requires consent.", cat: "law_policy" },
      { text: "Federal minimum wage law sets the baseline.", cat: "law_policy" },
      { text: "The service is currently operating normally as of today.", cat: "other_volatile" },
      { text: "GitHub status shows an active outage right now.", cat: "other_volatile" },
      { text: "Latest updates show system availability.", cat: "other_volatile" },
      { text: "Recent announcements confirm feature rollout.", cat: "other_volatile" },
      { text: "New features are in place currently.", cat: "other_volatile" },
    ];

    expect(tableCases.length).toBe(25);

    for (const testCase of tableCases) {
      const claims = findHeuristicClaims(testCase.text);
      expect(claims.length).toBeGreaterThanOrEqual(1);
      expect(claims[0].category).toBe(testCase.cat);
    }
  });

  it("extracts and anchors claims in mock mode without external network", async () => {
    const text =
      "Next.js 14 is the latest version and ChatGPT Plus costs $20 per month. Tim Cook is the CEO of Apple.";
    const result = await extractClaims(text, undefined, { max_claims: 5 });

    expect(result.claims.length).toBeGreaterThanOrEqual(3);
    for (const c of result.claims) {
      expect(c.span).not.toBeNull();
      if (c.span) {
        expect(text.slice(c.span.start, c.span.end)).toBe(c.text);
      }
      expect(c.prior).toBeGreaterThanOrEqual(0);
      expect(c.prior).toBeLessThanOrEqual(1);
    }
  });
});
