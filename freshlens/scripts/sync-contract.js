import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFile = path.resolve(__dirname, "../../freshgate/engine/src/contract/schemas.ts");
const targetFile = path.resolve(__dirname, "../src/shared/contract.ts");

const isCheck = process.argv.includes("--check");

if (!fs.existsSync(sourceFile)) {
  console.error(`Source contract file not found: ${sourceFile}`);
  process.exit(1);
}

const sourceContent = fs.readFileSync(sourceFile, "utf-8");

if (isCheck) {
  if (!fs.existsSync(targetFile)) {
    console.error(`Target contract does not exist: ${targetFile}`);
    process.exit(1);
  }
  const targetContent = fs.readFileSync(targetFile, "utf-8");
  if (sourceContent !== targetContent) {
    console.error("Contract mismatch between FreshGate Engine and FreshLens!");
    console.error(`Source: ${sourceFile}`);
    console.error(`Target: ${targetFile}`);
    process.exit(1);
  }
  console.log("Contract check passed: FreshLens contract matches FreshGate Engine.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(targetFile), { recursive: true });
fs.writeFileSync(targetFile, sourceContent, "utf-8");
console.log(`Synced contract successfully to ${targetFile}`);
