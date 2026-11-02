import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const screenshotsDir = path.resolve(__dirname, "../../docs/screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Capture 5 High-Resolution Screenshots", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("1. feed.png", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, "feed.png"),
      fullPage: false,
    });
  });

  test("2. overview.png", async ({ page }) => {
    await page.goto("/overview");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, "overview.png"),
      fullPage: false,
    });
  });

  test("3. playground.png", async ({ page }) => {
    await page.goto("/verify");
    await page.waitForTimeout(500);
    const verifyBtn = page.getByRole("button", { name: /Verify Freshness/i });
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({
      path: path.join(screenshotsDir, "playground.png"),
      fullPage: false,
    });
  });

  test("4. claim-drawer.png", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    const expandBtn = page.getByRole("button", { name: /\d+ claims/i }).first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({
      path: path.join(screenshotsDir, "claim-drawer.png"),
      fullPage: false,
    });
  });

  test("5. bench.png", async ({ page }) => {
    await page.goto("/bench");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, "bench.png"),
      fullPage: false,
    });
  });
});
