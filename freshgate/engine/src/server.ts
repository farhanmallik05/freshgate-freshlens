import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { ulid } from "ulid";
import { timingSafeEqual } from "node:crypto";
import {
  ClassifyPromptRequestSchema,
  ErrorBody,
  VerifyRequestSchema,
} from "./contract/schemas.js";
import { classifyPrompt } from "./classify.js";
import { extractClaims } from "./extract.js";
import { setClaimVerifier, verifyText, DirectClaimVerifier } from "./verify.js";
import { CachedClaimVerifier } from "./cache.js";
import { getDb, listVerifications, saveVerification } from "./db/repo.js";
import { enqueueVerification, getAsyncJobStatus } from "./queue.js";
import { computeStats } from "./stats.js";
import { subscribeSSE } from "./events.js";
import { getConfig } from "./config.js";

// Initialize caching layer wrapping direct verifier
setClaimVerifier(new CachedClaimVerifier(new DirectClaimVerifier()));

type Env = {
  Variables: {
    requestId: string;
  };
};

export const app = new Hono<Env>();

const config = getConfig();

// 1. CORS Middleware
app.use(
  "*",
  cors({
    origin: config.ENGINE_CORS_ORIGINS === "*" ? "*" : config.ENGINE_CORS_ORIGINS.split(","),
    allowHeaders: ["Content-Type", "Authorization", "x-request-id", "x-freshgate-mode", "x-bf-cache-key"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["x-request-id"],
  })
);

// 2. Request body limit (256 KB)
app.use(
  "*",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: (c) => {
      const errBody: ErrorBody = {
        error: {
          code: "invalid_request",
          message: "Request payload exceeds 256 KB limit",
          request_id: c.get("requestId"),
        },
      };
      return c.json(errBody, 413);
    },
  })
);

// 3. Request ID middleware
app.use("*", async (c, next) => {
  const reqId = c.req.header("x-request-id") || `req_${ulid()}`;
  c.set("requestId", reqId);
  c.header("x-request-id", reqId);
  await next();
});

// 4. Rate Limiting (in-memory token bucket: 60/min per IP/Key)
const rateBuckets = new Map<string, { tokens: number; lastRefill: number }>();
app.use("/v1/*", async (c, next) => {
  const clientKey = c.req.header("authorization") || c.req.header("x-forwarded-for") || "client";
  const now = Date.now();
  let bucket = rateBuckets.get(clientKey);

  if (!bucket) {
    bucket = { tokens: 60, lastRefill: now };
    rateBuckets.set(clientKey, bucket);
  } else {
    // Refill 1 token per second up to 60
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(60, bucket.tokens + elapsedSec);
    bucket.lastRefill = now;
  }

  if (bucket.tokens < 1) {
    const errBody: ErrorBody = {
      error: {
        code: "rate_limited",
        message: "Rate limit exceeded (60 requests/minute). Try again shortly.",
        request_id: c.get("requestId"),
      },
    };
    return c.json(errBody, 429);
  }

  bucket.tokens -= 1;
  await next();
});

// 5. Authentication Middleware (skip if ENGINE_API_KEY is empty)
app.use("/v1/*", async (c, next) => {
  if (!config.ENGINE_API_KEY) {
    return next();
  }

  const authHeader = c.req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  let authorized = false;
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(config.ENGINE_API_KEY);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      authorized = true;
    }
  } catch {
    authorized = false;
  }

  if (!authorized) {
    const errBody: ErrorBody = {
      error: {
        code: "unauthorized",
        message: "Missing or invalid Bearer API token",
        request_id: c.get("requestId"),
      },
    };
    return c.json(errBody, 401);
  }

  await next();
});

// Health & Readiness Endpoints
app.get("/healthz", (c) => {
  return c.json({
    ok: true,
    version: "1.0.0",
  });
});

app.get("/readyz", (c) => {
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    return c.json({
      ok: true,
      db: true,
      config: true,
    });
  } catch (err: any) {
    return c.json(
      {
        ok: false,
        db: false,
        error: err.message,
      },
      503
    );
  }
});

// Prompt volatility classification
app.post("/v1/classify-prompt", async (c) => {
  const reqId = c.get("requestId");
  try {
    const rawBody = await c.req.json();
    const parsed = ClassifyPromptRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errBody: ErrorBody = {
        error: {
          code: "invalid_request",
          message: parsed.error.issues.map((i) => i.message).join("; "),
          request_id: reqId,
        },
      };
      return c.json(errBody, 400);
    }

    const result = classifyPrompt(parsed.data.prompt);
    return c.json(result);
  } catch (err: any) {
    const errBody: ErrorBody = {
      error: {
        code: "invalid_request",
        message: err.message || "Invalid JSON payload",
        request_id: reqId,
      },
    };
    return c.json(errBody, 400);
  }
});

// Claim extraction debug endpoint
app.post("/v1/extract", async (c) => {
  const reqId = c.get("requestId");
  try {
    const rawBody = await c.req.json();
    const parsed = VerifyRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errBody: ErrorBody = {
        error: {
          code: "invalid_request",
          message: parsed.error.issues.map((i) => i.message).join("; "),
          request_id: reqId,
        },
      };
      return c.json(errBody, 400);
    }

    const { text, context, options } = parsed.data;
    const { claims } = await extractClaims(text, context, options);

    return c.json({ claims });
  } catch (err: any) {
    const errBody: ErrorBody = {
      error: {
        code: "internal",
        message: err.message || "Internal server error during extraction",
        request_id: reqId,
      },
    };
    return c.json(errBody, 500);
  }
});

// Synchronous Live Verification
app.post("/v1/verify", async (c) => {
  const reqId = c.get("requestId");
  try {
    const rawBody = await c.req.json();
    const parsed = VerifyRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errBody: ErrorBody = {
        error: {
          code: "invalid_request",
          message: parsed.error.issues.map((i) => i.message).join("; "),
          request_id: reqId,
        },
      };
      return c.json(errBody, 400);
    }

    const result = await verifyText(parsed.data);
    saveVerification(result, reqId);
    return c.json(result);
  } catch (err: any) {
    const errBody: ErrorBody = {
      error: {
        code: "internal",
        message: err.message || "Internal error during verification",
        request_id: reqId,
      },
    };
    return c.json(errBody, 500);
  }
});

// Asynchronous Verification
app.post("/v1/verify/async", async (c) => {
  const reqId = c.get("requestId");
  try {
    const rawBody = await c.req.json();
    const parsed = VerifyRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errBody: ErrorBody = {
        error: {
          code: "invalid_request",
          message: parsed.error.issues.map((i) => i.message).join("; "),
          request_id: reqId,
        },
      };
      return c.json(errBody, 400);
    }

    const accepted = enqueueVerification(parsed.data);
    return c.json(accepted, 202);
  } catch (err: any) {
    const errBody: ErrorBody = {
      error: {
        code: "internal",
        message: err.message || "Internal error enqueuing verification",
        request_id: reqId,
      },
    };
    return c.json(errBody, 500);
  }
});

// Verification by ID
app.get("/v1/verifications/:id", (c) => {
  const id = c.req.param("id");
  const result = getAsyncJobStatus(id);

  if (!result) {
    const errBody: ErrorBody = {
      error: {
        code: "invalid_request",
        message: `Verification with ID ${id} not found`,
        request_id: c.get("requestId"),
      },
    };
    return c.json(errBody, 404);
  }

  return c.json(result);
});

// List verifications with cursor pagination
app.get("/v1/verifications", (c) => {
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!, 10) : 20;
  const cursor = c.req.query("cursor") || undefined;
  const model = c.req.query("model") || undefined;
  const band = c.req.query("band") || undefined;
  const source = c.req.query("source") || undefined;
  const since = c.req.query("since") || undefined;

  const result = listVerifications({ limit, cursor, model, band, source, since });
  return c.json(result);
});

// Stats aggregation
app.get("/v1/stats", (c) => {
  const windowParam = (c.req.query("window") || "24h") as "1h" | "24h" | "7d";
  const stats = computeStats(windowParam);
  return c.json(stats);
});

// Server-Sent Events (SSE) Stream
app.get("/v1/events", (c) => {
  const lastEventIdHeader = c.req.header("last-event-id");
  const lastEventId = lastEventIdHeader ? parseInt(lastEventIdHeader, 10) : null;

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeSSE(lastEventId, (chunk) => {
        try {
          controller.enqueue(new TextEncoder().encode(chunk));
        } catch {
          unsubscribe();
        }
      });

      c.req.raw.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// OpenAPI Spec Endpoint
app.get("/openapi.json", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "FreshGate Engine API",
      version: "1.0.0",
      description: "Real-time temporal claim extraction and verification engine",
    },
    paths: {
      "/healthz": { get: { summary: "Health check" } },
      "/readyz": { get: { summary: "Readiness check" } },
      "/v1/classify-prompt": { post: { summary: "Prompt volatility classification" } },
      "/v1/extract": { post: { summary: "Claim extraction" } },
      "/v1/verify": { post: { summary: "Synchronous verification" } },
      "/v1/verify/async": { post: { summary: "Asynchronous verification queue" } },
      "/v1/verifications/{id}": { get: { summary: "Get verification status or result" } },
      "/v1/verifications": { get: { summary: "List verifications with pagination" } },
      "/v1/stats": { get: { summary: "Aggregated telemetry and KPI statistics" } },
      "/v1/events": { get: { summary: "Server-Sent Events telemetry stream" } },
    },
  });
});

export default app;
