import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.resolve(__dirname, "../.output");
const distDir = path.resolve(__dirname, "../dist");
const siteDownloadsDir = path.resolve(__dirname, "../site/public/downloads");

fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(siteDownloadsDir, { recursive: true });

// Locate zip in .output
const files = fs.readdirSync(outputDir);
const zipFile = files.find((f) => f.endsWith(".zip"));

if (!zipFile) {
  console.error("No zip file found in .output. Run pnpm zip first.");
  process.exit(1);
}

const srcZip = path.join(outputDir, zipFile);
const targetDist = path.join(distDir, "freshlens-mv3.zip");
const targetSite = path.join(siteDownloadsDir, "freshlens-latest.zip");

fs.copyFileSync(srcZip, targetDist);
fs.copyFileSync(srcZip, targetSite);

console.log(`Copied extension zip to:`);
console.log(` - ${targetDist}`);
console.log(` - ${targetSite}`);
