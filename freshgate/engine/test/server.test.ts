import { describe, it, expect } from "vitest";
import { app } from "../src/server.js";

describe("Engine Server Endpoints", () => {
  it("GET /healthz returns ok and version", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      version: "1.0.0",
    });
  });

  it("POST /v1/classify-prompt classifies prompt volatility", async () => {
    const res = await app.request("/v1/classify-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "What is the live stock price of NVDA right now?",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.volatility).toBe("realtime");
    expect(body.no_store).toBe(true);
    expect(body.suggested_cache_ttl_s).toBeNull();
  });

  it("POST /v1/classify-prompt returns 400 invalid_request on malformed input", async () => {
    const res = await app.request("/v1/classify-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
    expect(body.error.request_id).toBeDefined();
  });

  it("POST /v1/extract returns extracted claims with non-null spans", async () => {
    const sampleText =
      "Next.js 14 is the latest version and ChatGPT Plus costs $20 per month. Tim Cook is the CEO of Apple.";

    const res = await app.request("/v1/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: sampleText,
        options: { max_claims: 3 },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.claims).toBeDefined();
    expect(body.claims.length).toBeGreaterThanOrEqual(3);

    const categories = body.claims.map((c: any) => c.category);
    expect(categories).toContain("pricing");
    expect(categories).toContain("version_release");
    expect(categories).toContain("leadership_role");

    for (const c of body.claims) {
      expect(c.span).not.toBeNull();
      expect(c.id).toMatch(/^c\d+$/);
    }
  });

  it("POST /v1/verify returns complete VerifyResponse with claims, usage, latency", async () => {
    const sampleText =
      "The latest Next.js version is 14 and ChatGPT Plus costs $20 per month.";

    const res = await app.request("/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: sampleText,
        options: { max_claims: 2, depth: "fast" },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toMatch(/^vrf_[0-9A-Za-z]+$/);
    expect(body.status).toBe("completed");
    expect(body.claims.length).toBeGreaterThanOrEqual(2);
    expect(body.overall).toBeDefined();
    expect(body.overall.score).toBeGreaterThanOrEqual(0);
    expect(body.usage.tavily_credits).toBeGreaterThanOrEqual(0);
    expect(body.latency_ms).toBeGreaterThanOrEqual(0);
  });
});
