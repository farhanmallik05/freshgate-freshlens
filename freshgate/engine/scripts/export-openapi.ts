import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { app } from "../src/server.js";

async function run() {
  const res = await app.request("/openapi.json");
  const json = await res.json();

  const outDir = join(process.cwd(), "../shared/contract");
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, "openapi.json");
  writeFileSync(outPath, JSON.stringify(json, null, 2));
  console.log(`Saved OpenAPI spec to ${outPath}`);
}

run().catch((e) => {
  console.error("OpenAPI export failed:", e);
  process.exit(1);
});
