import { describe, it, expect } from "vitest";
import { anchorClaim } from "../src/content/anchor";
import { buildTextMap } from "../src/content/textmap";
import { type Claim } from "../src/shared/contract";

describe("Claim Anchoring Engine", () => {
  it("resolves exact span offsets when text aligns perfectly", () => {
    const container = document.createElement("div");
    container.innerHTML = `<p>Next.js 14 is the latest stable release of the framework.</p>`;

    const { plainText, textMap } = buildTextMap(container);
    const claim: Claim = {
      id: "c1",
      text: "Next.js 14 is the latest stable release",
      span: { start: 0, end: 39 },
      normalized: "Next.js 14 is current",
      category: "version_release",
      claimed_as_of: null,
      entities: ["Next.js"],
      query: "Next.js version",
      official_domains: [],
      prior: 0.8,
    };

    const anchor = anchorClaim(claim, plainText, textMap);
    expect(anchor.strategy).toBe("span");
    expect(anchor.range).not.toBeNull();
    expect(anchor.range?.toString()).toBe("Next.js 14 is the latest stable release");
  });

  it("falls back to exact substring search when span is null", () => {
    const container = document.createElement("div");
    container.innerHTML = `<p>According to reports, Elon Musk is the CEO of Twitter currently.</p>`;

    const { plainText, textMap } = buildTextMap(container);
    const claim: Claim = {
      id: "c2",
      text: "Elon Musk is the CEO of Twitter",
      span: null,
      normalized: "Elon Musk is CEO of Twitter",
      category: "leadership_role",
      claimed_as_of: null,
      entities: ["Elon Musk"],
      query: "CEO of Twitter",
      official_domains: [],
      prior: 0.9,
    };

    const anchor = anchorClaim(claim, plainText, textMap);
    expect(anchor.strategy).toBe("exact");
    expect(anchor.range).not.toBeNull();
    expect(anchor.range?.toString()).toBe("Elon Musk is the CEO of Twitter");
  });

  it("handles normalized matching when smart quotes differ", () => {
    const container = document.createElement("div");
    container.innerHTML = `<p>The system said “Python is fast” in tests.</p>`;

    const { plainText, textMap } = buildTextMap(container);
    const claim: Claim = {
      id: "c3",
      text: '"Python is fast"',
      span: null,
      normalized: "Python is fast",
      category: "other_volatile",
      claimed_as_of: null,
      entities: ["Python"],
      query: "Python speed",
      official_domains: [],
      prior: 0.5,
    };

    const anchor = anchorClaim(claim, plainText, textMap);
    expect(anchor.range).not.toBeNull();
  });
});
