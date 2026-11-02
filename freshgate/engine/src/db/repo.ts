import Database from "better-sqlite3";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { VerifyResponse, VerifyResponseSchema } from "../contract/schemas.js";
import { getConfig } from "../config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
let dbInstance: Database.Database | null = null;

export function initDatabase(customPath?: string): Database.Database {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }

  const config = getConfig();
  const dbPath = customPath ?? config.ENGINE_DB_PATH;
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");

  runMigrations(dbInstance);
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  return initDatabase();
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationsDir = join(__dirname, "migrations");
  let files: string[] = [];
  try {
    files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    // If not found, skip
    return;
  }

  const checkStmt = db.prepare("SELECT 1 FROM migrations WHERE name = ?");
  const insertStmt = db.prepare("INSERT INTO migrations (name, applied_at) VALUES (?, ?)");

  for (const file of files) {
    const row = checkStmt.get(file);
    if (!row) {
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      db.transaction(() => {
        db.exec(sql);
        insertStmt.run(file, new Date().toISOString());
      })();
    }
  }
}

export function saveVerification(response: VerifyResponse, requestId?: string): void {
  const db = getDb();
  const insertVerif = db.prepare(`
    INSERT OR REPLACE INTO verifications (
      id, created_at, status, source, model, provider, request_id,
      overall_score, band, claims_total, claims_checked, stale_count, unverifiable_count,
      latency_ms, tavily_credits, llm_tokens_in, llm_tokens_out, cache_hits, response_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  const insertClaim = db.prepare(`
    INSERT INTO claim_results (
      id, verification_id, claim_hash, category, verdict, freshness, band, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    insertVerif.run(
      response.id,
      response.created_at,
      response.status,
      response.context?.source || null,
      response.context?.model || null,
      response.context?.provider || null,
      requestId || response.context?.request_id || null,
      response.overall.score,
      response.overall.band,
      response.overall.claims_total,
      response.overall.claims_checked,
      response.overall.stale_count,
      response.overall.unverifiable_count,
      response.latency_ms,
      response.usage.tavily_credits,
      response.usage.llm_tokens.in,
      response.usage.llm_tokens.out,
      response.usage.cache_hits,
      JSON.stringify(response)
    );

    for (const c of response.claims) {
      insertClaim.run(
        `cr_${response.id}_${c.claim.id}`,
        response.id,
        c.claim.id,
        c.claim.category,
        c.verdict,
        c.freshness,
        c.band,
        c.status,
        response.created_at
      );
    }
  })();
}

export function getVerificationById(id: string): VerifyResponse | null {
  const db = getDb();
  const row = db.prepare("SELECT response_json FROM verifications WHERE id = ?").get(id) as any;
  if (!row) return null;
  return JSON.parse(row.response_json);
}

export interface ListVerificationsParams {
  limit?: number;
  cursor?: string;
  model?: string;
  band?: string;
  source?: string;
  since?: string;
}

export function listVerifications(params: ListVerificationsParams): {
  items: VerifyResponse[];
  next_cursor: string | null;
} {
  const db = getDb();
  const limit = Math.min(params.limit || 20, 100);

  const conditions: string[] = [];
  const args: any[] = [];

  if (params.cursor) {
    conditions.push("created_at < (SELECT created_at FROM verifications WHERE id = ?)");
    args.push(params.cursor);
  }
  if (params.model) {
    conditions.push("model = ?");
    args.push(params.model);
  }
  if (params.band) {
    conditions.push("band = ?");
    args.push(params.band);
  }
  if (params.source) {
    conditions.push("source = ?");
    args.push(params.source);
  }
  if (params.since) {
    conditions.push("created_at >= ?");
    args.push(params.since);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `
    SELECT id, response_json FROM verifications
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ?
  `;

  args.push(limit + 1);
  const rows = db.prepare(query).all(...args) as { id: string; response_json: string }[];

  let next_cursor: string | null = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    next_cursor = last.id;
    rows.splice(limit);
  }

  const items = rows.map((r) => JSON.parse(r.response_json) as VerifyResponse);
  return { items, next_cursor };
}

export function getClaimCache(
  hash: string,
  nowMs: number
): { result: any; verified_at: string; age_s: number } | null {
  const db = getDb();
  const row = db.prepare("SELECT result_json, verified_at, expires_at FROM claim_cache WHERE claim_hash = ?").get(hash) as any;
  if (!row) return null;

  const expiresMs = new Date(row.expires_at).getTime();
  if (nowMs >= expiresMs) {
    db.prepare("DELETE FROM claim_cache WHERE claim_hash = ?").run(hash);
    return null;
  }

  const verifiedMs = new Date(row.verified_at).getTime();
  const age_s = Math.max(0, Math.floor((nowMs - verifiedMs) / 1000));
  return {
    result: JSON.parse(row.result_json),
    verified_at: row.verified_at,
    age_s,
  };
}

export function saveClaimCache(
  hash: string,
  category: string,
  normalized: string,
  resultJson: string,
  verifiedAt: string,
  expiresAt: string
): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO claim_cache (claim_hash, category, normalized, result_json, verified_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(hash, category, normalized, resultJson, verifiedAt, expiresAt);
}

export function purgeExpiredCache(nowMs: number): number {
  const db = getDb();
  const iso = new Date(nowMs).toISOString();
  const info = db.prepare("DELETE FROM claim_cache WHERE expires_at <= ?").run(iso);
  return info.changes;
}

export function recordUsage(kind: "tavily" | "llm", amount: number): void {
  const db = getDb();
  db.prepare("INSERT INTO usage_events (ts, kind, amount) VALUES (?, ?, ?)").run(
    new Date().toISOString(),
    kind,
    amount
  );
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
