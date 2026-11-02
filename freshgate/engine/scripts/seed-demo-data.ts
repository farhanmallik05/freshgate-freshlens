import { ulid } from "ulid";
import { saveVerification, closeDb } from "../src/db/repo.js";
import { VerifyResponse, Band, Category, Verdict } from "../src/contract/schemas.js";

const models = [
  { model: "gpt-4o", provider: "openai" },
  { model: "claude-3-5-sonnet", provider: "anthropic" },
  { model: "gemini-1.5-flash", provider: "google" },
  { model: "meta-llama/llama-3.1-70b", provider: "openrouter" },
];

const categories: Category[] = [
  "pricing",
  "version_release",
  "leadership_role",
  "law_policy",
  "statistic_metric",
  "event_status",
];

const sampleFacts = [
  { text: "ChatGPT Plus subscription costs $20 per month.", norm: "ChatGPT Plus costs $20/month", cat: "pricing" as Category, verdict: "current" as Verdict, score: 92, band: "fresh" as Band, corr: null },
  { text: "Next.js 14 is the latest version available.", norm: "Next.js 14 is the latest version", cat: "version_release" as Category, verdict: "stale" as Verdict, score: 25, band: "stale" as Band, corr: "Next.js 15 is the latest version" },
  { text: "Tim Cook is the CEO of Apple.", norm: "Tim Cook is CEO of Apple", cat: "leadership_role" as Category, verdict: "current" as Verdict, score: 95, band: "fresh" as Band, corr: null },
  { text: "Corporate tax rate is 21% under US law.", norm: "Corporate tax rate is 21%", cat: "law_policy" as Category, verdict: "current" as Verdict, score: 88, band: "fresh" as Band, corr: null },
  { text: "Claude 3 Opus costs $15 per million input tokens.", norm: "Claude 3 Opus input cost is $15/M", cat: "pricing" as Category, verdict: "current" as Verdict, score: 72, band: "aging" as Band, corr: null },
  { text: "Node.js 18 is the current LTS version.", norm: "Node.js 18 is LTS", cat: "version_release" as Category, verdict: "stale" as Verdict, score: 18, band: "stale" as Band, corr: "Node.js 22 is the active LTS release" },
];

async function seed() {
  console.log("Seeding 40 verification records into SQLite database...");
  const now = Date.now();

  for (let i = 0; i < 40; i++) {
    const hoursAgo = Math.floor(Math.random() * 24);
    const timeMs = now - hoursAgo * 3600000 - Math.floor(Math.random() * 1800000);
    const createdAt = new Date(timeMs).toISOString();

    const m = models[i % models.length];
    const fact = sampleFacts[i % sampleFacts.length];

    const vId = `vrf_${ulid()}`;
    const isStale = fact.verdict === "stale";

    const response: VerifyResponse = {
      id: vId,
      status: "completed",
      created_at: createdAt,
      latency_ms: Math.floor(Math.random() * 350 + 150),
      overall: {
        score: fact.score,
        band: fact.band,
        claims_total: 2,
        claims_checked: 2,
        stale_count: isStale ? 1 : 0,
        unverifiable_count: 0,
      },
      claims: [
        {
          claim: {
            id: "c1",
            text: fact.text,
            span: { start: 0, end: fact.text.length },
            normalized: fact.norm,
            category: fact.cat,
            claimed_as_of: null,
            entities: ["Tech Entity"],
            query: `${fact.norm} official`,
            official_domains: [],
            prior: isStale ? 0.8 : 0.2,
          },
          verdict: fact.verdict,
          freshness: fact.score,
          band: fact.band,
          correction: fact.corr,
          evidence: [
            {
              id: "e1",
              url: "https://docs.example.com",
              domain: "example.com",
              title: "Official Documentation",
              snippet: "Verified information from primary source.",
              published_date: "2024-11-01T00:00:00Z",
              retrieved_at: createdAt,
              authority: "official",
              score: 0.95,
            },
          ],
          supporting_evidence_ids: ["e1"],
          judge_confidence: 0.95,
          reasoning: isStale ? "Superseded by recent updates." : "Confirmed current.",
          cache: { hit: i % 3 === 0, age_s: i % 3 === 0 ? 300 : null },
          status: "ok",
        },
      ],
      corrected_text: isStale
        ? `${fact.text}\n\n---\n**Freshness check (FreshGate):** 1 claim(s) may be outdated.\n- ~~${fact.text}~~ -> ${fact.corr} ([example.com](https://docs.example.com), 2024-11-01)`
        : null,
      usage: {
        tavily_credits: i % 3 === 0 ? 0 : 1,
        llm_tokens: { in: 140, out: 85 },
        cache_hits: i % 3 === 0 ? 1 : 0,
      },
      context: {
        model: m.model,
        provider: m.provider,
        source: "bifrost",
        request_id: `req_${ulid()}`,
      },
    };

    saveVerification(response);
  }

  console.log("Seeding complete. 40 verification records saved.");
  closeDb();
}

seed().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
