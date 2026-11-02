import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, "../../docs/screenshots");

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function capture() {
  console.log("Launching Chromium for screenshot capture...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  try {
    // 1. Live Feed
    console.log("Capturing feed.png...");
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "feed.png"), fullPage: false });

    // 2. Overview
    console.log("Capturing overview.png...");
    await page.goto(`${baseUrl}/overview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "overview.png"), fullPage: false });

    // 3. Verify Playground
    console.log("Capturing playground.png...");
    await page.goto(`${baseUrl}/verify`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    // Click verify to populate results and highlights
    const verifyBtn = page.getByRole("button", { name: /Verify Freshness/i });
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(screenshotsDir, "playground.png"), fullPage: false });

    // 4. Claim Drawer (Feed with item expanded)
    console.log("Capturing claim-drawer.png...");
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const expandBtn = page.getByRole("button", { name: /\d+ claims/i }).first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(screenshotsDir, "claim-drawer.png"), fullPage: false });

    // 5. StaleBench
    console.log("Capturing bench.png...");
    await page.goto(`${baseUrl}/bench`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "bench.png"), fullPage: false });

    console.log("All 5 screenshots captured successfully into freshgate/docs/screenshots/!");
  } catch (err) {
    console.error("Screenshot capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

capture();
