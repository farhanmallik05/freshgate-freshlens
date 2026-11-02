import { describe, it, expect } from "vitest";
import { buildTextMap, textToRange } from "../src/content/textmap";

describe("TextMap & DOM Range Offset Engine", () => {
  it("builds plainText and textMap from nested DOM nodes", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <p>Hello <strong>world</strong>! Here is an <em>assistant</em> response.</p>
    `;

    const { plainText, textMap } = buildTextMap(container);
    expect(plainText).toContain("Hello world! Here is an assistant response.");
    expect(textMap.length).toBeGreaterThanOrEqual(4);
  });

  it("skips script, style, and code blocks when configured", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <p>Before code.</p>
      <pre><code>const x = 10;</code></pre>
      <script>console.log('secret');</script>
      <p>After code.</p>
    `;

    const { plainText } = buildTextMap(container, true);
    expect(plainText).toContain("Before code.");
    expect(plainText).toContain("After code.");
    expect(plainText).not.toContain("const x = 10;");
    expect(plainText).not.toContain("secret");
  });

  it("maps character offsets cleanly to a DOM Range", () => {
    const container = document.createElement("div");
    container.innerHTML = `<p>Next.js 14 is the latest version.</p>`;

    const { plainText, textMap } = buildTextMap(container);
    const target = "Next.js 14";
    const start = plainText.indexOf(target);
    const end = start + target.length;

    const range = textToRange(textMap, start, end);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe(target);
  });

  it("handles ranges spanning across element boundaries", () => {
    const container = document.createElement("div");
    container.innerHTML = `<p>Hello <span>beautiful <b>world</b></span> of AI!</p>`;

    const { plainText, textMap } = buildTextMap(container);
    const target = "beautiful world of";
    const start = plainText.indexOf(target);
    const end = start + target.length;

    const range = textToRange(textMap, start, end);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe(target);
  });
});
