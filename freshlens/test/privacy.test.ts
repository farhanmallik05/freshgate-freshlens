import { describe, it, expect, vi } from "vitest";
import { verifyTextWithEngine } from "../src/background/engineClient";
import { DEFAULT_SETTINGS } from "../src/shared/settings";
import { DEMO_FIXTURES } from "../src/demo/fixtures";

describe("Privacy & Data Safety Protocol", () => {
  it("ensures default verification requests strip user prompt, URL, and page title", async () => {
    let capturedBody: any = null;
    let capturedUrl = "";

    // Mock global fetch
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => DEMO_FIXTURES.nextjs,
      };
    });

    const settings = {
      ...DEFAULT_SETTINGS,
      includePrompt: false, // Default
    };

    const textToVerify = "Next.js 14 was released in late 2023.";
    const context = {
      model: "gpt-4o",
      prompt: "This is a private user secret query that must NOT leave the machine!",
    };

    await verifyTextWithEngine(textToVerify, settings, context);

    expect(capturedUrl).toContain("http://localhost:3001/v1/verify");
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.text).toBe(textToVerify);

    // Assert that prompt was completely omitted
    expect(capturedBody.context?.prompt).toBeUndefined();

    // Assert that no URL or page metadata fields exist in request
    expect(capturedBody.url).toBeUndefined();
    expect(capturedBody.page_url).toBeUndefined();
    expect(capturedBody.conversation_id).toBeUndefined();

    global.fetch = originalFetch;
  });

  it("attaches prompt only when includePrompt is explicitly enabled", async () => {
    let capturedBody: any = null;

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => DEMO_FIXTURES.nextjs,
      };
    });

    const settings = {
      ...DEFAULT_SETTINGS,
      includePrompt: true, // User opt-in
    };

    const textToVerify = "Next.js 14 was released in late 2023.";
    const context = {
      model: "gpt-4o",
      prompt: "Explicitly shared prompt context",
    };

    await verifyTextWithEngine(textToVerify, settings, context);
    expect(capturedBody.context?.prompt).toBe("Explicitly shared prompt context");

    global.fetch = originalFetch;
  });
});
