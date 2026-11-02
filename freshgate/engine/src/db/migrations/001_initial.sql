CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT,
  model TEXT,
  provider TEXT,
  request_id TEXT,
  overall_score INTEGER NOT NULL,
  band TEXT NOT NULL,
  claims_total INTEGER NOT NULL,
  claims_checked INTEGER NOT NULL,
  stale_count INTEGER NOT NULL,
  unverifiable_count INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  tavily_credits REAL NOT NULL,
  llm_tokens_in INTEGER NOT NULL,
  llm_tokens_out INTEGER NOT NULL,
  cache_hits INTEGER NOT NULL,
  response_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claim_results (
  id TEXT PRIMARY KEY,
  verification_id TEXT NOT NULL,
  claim_hash TEXT NOT NULL,
  category TEXT NOT NULL,
  verdict TEXT NOT NULL,
  freshness INTEGER NOT NULL,
  band TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (verification_id) REFERENCES verifications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claim_cache (
  claim_hash TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  normalized TEXT NOT NULL,
  result_json TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verifications_created_at ON verifications(created_at);
CREATE INDEX IF NOT EXISTS idx_verifications_model ON verifications(model);
CREATE INDEX IF NOT EXISTS idx_verifications_band ON verifications(band);
CREATE INDEX IF NOT EXISTS idx_verifications_source ON verifications(source);
CREATE INDEX IF NOT EXISTS idx_claim_results_hash ON claim_results(claim_hash);
CREATE INDEX IF NOT EXISTS idx_claim_cache_expires ON claim_cache(expires_at);
