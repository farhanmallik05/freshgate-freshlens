import { app } from "../src/server.js";

async function run() {
  const sample = "Next.js 14 is the latest version and ChatGPT Plus costs $20 per month. Tim Cook is the CEO of Apple.";
  const res = await app.request("/v1/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: sample,
      options: { max_claims: 5 },
    }),
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Claims extracted:", data.claims?.length);
  console.log(JSON.stringify(data, null, 2));

  if (!data.claims || data.claims.length < 3) {
    console.error("FAIL: Expected >= 3 claims");
    process.exit(1);
  }

  const categories = data.claims.map((c: any) => c.category);
  const hasPricing = categories.includes("pricing");
  const hasVersion = categories.includes("version_release");
  const hasLeader = categories.includes("leadership_role");

  if (!hasPricing || !hasVersion || !hasLeader) {
    console.error("FAIL: Missing expected categories", categories);
    process.exit(1);
  }

  const allHaveSpans = data.claims.every((c: any) => c.span !== null);
  if (!allHaveSpans) {
    console.error("FAIL: Some claims have null spans");
    process.exit(1);
  }

  console.log("SUCCESS: Step A2 verification passed with 100% assertions.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
