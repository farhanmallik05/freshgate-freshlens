import {
  VerifyRequestSchema,
  VerifyResponseSchema,
  type VerifyRequest,
  type VerifyResponse,
} from "../shared/contract";
import { type ExtensionError, type ExtensionErrorCode, type ExtensionSettings } from "../shared/types";

export class EngineClientError extends Error {
  code: ExtensionErrorCode;
  details?: string;

  constructor(code: ExtensionErrorCode, message: string, details?: string) {
    super(message);
    this.name = "EngineClientError";
    this.code = code;
    this.details = details;
  }
}

export async function requestEnginePermission(engineUrl: string): Promise<boolean> {
  if (typeof chrome === "undefined" || !chrome.permissions) {
    return true;
  }
  try {
    const url = new URL(engineUrl);
    const originPattern = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}/*`;
    const hasPermission = await chrome.permissions.contains({
      origins: [originPattern],
    });
    if (hasPermission) return true;

    return await chrome.permissions.request({
      origins: [originPattern],
    });
  } catch (err) {
    console.warn("Permission request failed:", err);
    return false;
  }
}

export async function checkHealth(
  engineUrl: string,
  apiKey?: string
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  const url = `${engineUrl.replace(/\/+$/, "")}/healthz`;

  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        ok: false,
        latencyMs,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    return { ok: true, latencyMs };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      error: err.name === "AbortError" ? "Connection timed out" : err.message,
    };
  }
}

export async function verifyTextWithEngine(
  text: string,
  settings: ExtensionSettings,
  context?: { model?: string; prompt?: string }
): Promise<VerifyResponse> {
  const timeoutMs = settings.depth === "thorough" ? 60000 : 30000;
  const baseUrl = settings.engineUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/v1/verify`;

  const requestBody: VerifyRequest = {
    text,
    context: {
      source: "extension",
      model: context?.model,
      prompt: settings.includePrompt ? context?.prompt : undefined,
    },
    options: {
      max_claims: settings.maxClaims,
      depth: settings.depth,
      include_evidence: true,
      nocache: false,
    },
  };

  // Validate payload before sending
  const validatedPayload = VerifyRequestSchema.parse(requestBody);

  async function attemptFetch(isRetry = false): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (settings.apiKey) {
      headers["Authorization"] = `Bearer ${settings.apiKey}`;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(validatedPayload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new EngineClientError("timeout", "Verification request timed out. Please try again.");
      }
      if (!isRetry) {
        // One retry with 1000ms jitter
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
        return attemptFetch(true);
      }
      throw new EngineClientError("offline", "Cannot reach the FreshGate Engine. Is the server running?", err.message);
    }
  }

  const response = await attemptFetch();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new EngineClientError("unauthorized", "Invalid or missing API key. Please update FreshLens settings.");
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "30";
      throw new EngineClientError("rate_limited", `Rate limit exceeded. Please wait ${retryAfter}s.`);
    }
    if (response.status === 432 || response.status === 433) {
      throw new EngineClientError("budget_exhausted", "Tavily credit budget exhausted for this plan.");
    }
    if (response.status === 400) {
      const errText = await response.text().catch(() => "");
      throw new EngineClientError("invalid_request", "Engine rejected request format.", errText);
    }
    if (response.status >= 500) {
      throw new EngineClientError("upstream_failed", "Engine encountered an internal error during verification.");
    }
    throw new EngineClientError("unknown", `Unexpected response: HTTP ${response.status}`);
  }

  const json = await response.json();
  const parsed = VerifyResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("Engine response failed contract validation:", parsed.error);
    throw new EngineClientError("invalid_request", "Engine returned non-standard schema payload.");
  }

  return parsed.data;
}
