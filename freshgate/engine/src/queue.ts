import { ulid } from "ulid";
import { AsyncAccepted, VerifyRequest, VerifyResponse } from "./contract/schemas.js";
import { verifyText } from "./verify.js";
import { getVerificationById, saveVerification } from "./db/repo.js";
import { emitSSEEvent } from "./events.js";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface AsyncJob {
  id: string;
  request: VerifyRequest;
  status: JobStatus;
  result?: VerifyResponse;
  error?: string;
  queuedAt: number;
}

const jobs = new Map<string, AsyncJob>();
const queue: string[] = [];
let activeWorkers = 0;
const CONCURRENCY_LIMIT = 3;

export function enqueueVerification(request: VerifyRequest): AsyncAccepted {
  const id = `vrf_${ulid()}`;
  const job: AsyncJob = {
    id,
    request,
    status: "queued",
    queuedAt: Date.now(),
  };

  jobs.set(id, job);
  queue.push(id);

  emitSSEEvent("verification.started", {
    id,
    status: "queued",
    timestamp: new Date().toISOString(),
  });

  processNext();

  return {
    id,
    status: "queued",
  };
}

export function getAsyncJobStatus(
  id: string
): VerifyResponse | { id: string; status: JobStatus; error?: string } | null {
  // Check memory job
  const job = jobs.get(id);
  if (job) {
    if (job.status === "completed" && job.result) {
      return job.result;
    }
    return {
      id: job.id,
      status: job.status,
      error: job.error,
    };
  }

  // Fallback to SQLite
  const saved = getVerificationById(id);
  if (saved) return saved;

  return null;
}

async function processNext(): Promise<void> {
  if (activeWorkers >= CONCURRENCY_LIMIT || queue.length === 0) {
    return;
  }

  const nextId = queue.shift();
  if (!nextId) return;

  const job = jobs.get(nextId);
  if (!job) return;

  activeWorkers++;
  job.status = "running";

  try {
    const result = await verifyText(job.request);
    // Align response id with job id
    result.id = job.id;
    job.result = result;
    job.status = "completed";

    saveVerification(result, job.request.context?.request_id);

    emitSSEEvent("verification.completed", {
      id: job.id,
      overall_score: result.overall.score,
      band: result.overall.band,
      stale_count: result.overall.stale_count,
      latency_ms: result.latency_ms,
    });
  } catch (err: any) {
    job.status = "failed";
    job.error = err.message || "Async verification execution failed";

    emitSSEEvent("verification.failed", {
      id: job.id,
      error: job.error,
    });
  } finally {
    activeWorkers--;
    processNext();
  }
}
