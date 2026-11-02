import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const sampleTexts = [
  "Next.js 14 is the latest version and ChatGPT Plus costs $20 per month.",
  "Tim Cook is the current CEO of Apple.",
  "Claude 3.5 Sonnet costs $3 per million input tokens.",
  "Node.js 22 is the current active LTS release.",
  "The current US federal corporate tax rate is 21 percent.",
  "Satya Nadella has been CEO of Microsoft since 2014.",
  "Python 3.13 introduces an experimental JIT compiler.",
  "GitHub Copilot Individual plan costs $10 monthly.",
  "Vercel Pro plan costs $20 per user each month.",
  "The corporate tax rate under the UK Finance Act is 25%.",
  "OpenAI announced ChatGPT Pro for $200 per month.",
  "What is the mathematical definition of a prime number and pi?",
];

async function record() {
  const fixturesDir = join(__dirname, "../test/fixtures");
  const tavilyDir = join(fixturesDir, "tavily");
  const llmDir = join(fixturesDir, "llm");

  mkdirSync(tavilyDir, { recursive: true });
  mkdirSync(llmDir, { recursive: true });

  console.log(`Recording fixture manifest for ${sampleTexts.length} texts...`);
  const manifest = sampleTexts.map((text, idx) => ({
    id: `fix_${idx + 1}`,
    text,
    recorded_at: new Date().toISOString(),
  }));

  writeFileSync(
    join(fixturesDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log("Fixtures recorded successfully.");
}

record().catch((e) => {
  console.error("Recording failed:", e);
  process.exit(1);
});
