import {
  AsyncAccepted,
  ClassifyPromptResponse,
  VerifyRequest,
  VerifyResponse,
} from "./contract/schemas.js";
import { StatsResponse } from "./stats.js";

export interface FreshGateClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class FreshGateClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(options: FreshGateClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "http://localhost:8787").replace(/\/$/, "");
    this.apiKey = options.apiKey || "";
    this.timeoutMs = options.timeoutMs || 25000;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FreshGate API error ${response.status}: ${errorText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async healthz(): Promise<{ ok: boolean; version: string }> {
    return this.request("/healthz");
  }

  async readyz(): Promise<{ ok: boolean; db: boolean; config: boolean }> {
    return this.request("/readyz");
  }

  async classifyPrompt(prompt: string): Promise<ClassifyPromptResponse> {
    return this.request("/v1/classify-prompt", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }

  async extract(request: VerifyRequest): Promise<{ claims: any[] }> {
    return this.request("/v1/extract", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    return this.request("/v1/verify", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async verifyAsync(request: VerifyRequest): Promise<AsyncAccepted> {
    return this.request("/v1/verify/async", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getVerification(id: string): Promise<VerifyResponse> {
    return this.request(`/v1/verifications/${id}`);
  }

  async listVerifications(params: {
    limit?: number;
    cursor?: string;
    model?: string;
    band?: string;
    source?: string;
    since?: string;
  } = {}): Promise<{ items: VerifyResponse[]; next_cursor: string | null }> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.cursor) searchParams.set("cursor", params.cursor);
    if (params.model) searchParams.set("model", params.model);
    if (params.band) searchParams.set("band", params.band);
    if (params.source) searchParams.set("source", params.source);
    if (params.since) searchParams.set("since", params.since);

    const qs = searchParams.toString();
    return this.request(`/v1/verifications${qs ? `?${qs}` : ""}`);
  }

  async getStats(window: "1h" | "24h" | "7d" = "24h"): Promise<StatsResponse> {
    return this.request(`/v1/stats?window=${window}`);
  }
}
