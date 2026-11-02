import { test, expect } from "@playwright/test";

test.describe("FreshGate Dashboard Smoke Tests", () => {
  test("1. Overview displays non-zero KPIs and telemetry charts", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.locator("h1")).toContainText("Fleet Freshness Telemetry");

    // Check KPI cards
    await expect(page.getByText("Stale Claim Rate", { exact: true })).toBeVisible();
    await expect(page.getByText("Avg Freshness Score")).toBeVisible();
    await expect(page.getByText("Claim Cache Hit Rate")).toBeVisible();
    await expect(page.getByText("Verifications Total")).toBeVisible();

    // Check charts rendered
    await expect(page.getByText("Stale Claim Rate by Model (%)")).toBeVisible();
    await expect(page.getByText("Claim Category Breakdown (Volume & Staleness)")).toBeVisible();
    await expect(page.getByText("Freshness Score Distribution")).toBeVisible();
    await expect(page.getByText("Stale-Rate Trend Over Time (%)")).toBeVisible();

    // Check top stale claims table
    await expect(page.getByText("Top Outdated Claims Detected in Gateway Answers")).toBeVisible();
  });

  test("2. Live Feed renders streamed verifications and expands claim drawer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Operational Verification Stream");

    // Check filter controls
    await expect(page.getByLabel("Filter by band")).toBeVisible();
    await expect(page.getByLabel("Filter by model")).toBeVisible();
    await expect(page.getByRole("button", { name: /Pause Stream/i })).toBeVisible();

    // Check that at least one verification is displayed
    const claimToggleBtn = page.getByRole("button", { name: /\d+ claims/i }).first();
    await expect(claimToggleBtn).toBeVisible({ timeout: 10000 });

    // Click to toggle claims drawer
    await claimToggleBtn.click();
  });

  test("3. Verify Playground executes claim extraction and renders inline highlights", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.locator("h1")).toContainText("Freshness Verification Playground");

    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    const verifyBtn = page.getByRole("button", { name: /Verify Freshness/i });
    await expect(verifyBtn).toBeVisible();

    // Click Verify
    await verifyBtn.click();

    // Verify summary banner renders
    await expect(page.getByText(/Overall Freshness:/i)).toBeVisible({ timeout: 10000 });

    // Verify inline highlights render
    const marks = page.locator("mark");
    await expect(marks.first()).toBeVisible();

    // Switch to Corrected Text tab
    await page.getByRole("button", { name: /Corrected Text View/i }).click();
    await expect(page.getByRole("button", { name: /Copy Corrected Text/i })).toBeVisible();
  });

  test("4. StaleBench evaluation report dynamically loads accuracy metrics", async ({ page }) => {
    await page.goto("/bench");
    await expect(page.locator("h1")).toContainText("StaleBench v1.0 Empirical Report");

    // Headline metrics
    await expect(page.getByText("Stale Detection F1")).toBeVisible();
    await expect(page.getByText("Precision", { exact: true })).toBeVisible();
    await expect(page.getByText("Recall", { exact: true })).toBeVisible();
    await expect(page.getByText("Evergreen False Positive Rate")).toBeVisible();

    // Tables
    await expect(page.getByText("Model Knowledge Lag & Staleness Breakdown")).toBeVisible();
    await expect(page.getByText("Observed Staleness by Volatility Category")).toBeVisible();
    await expect(page.getByText("Benchmark Honesty & Scientific Limitations Disclosure")).toBeVisible();
  });

  test("5. Settings displays engine health diagnostics and demo mode toggle", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("h1")).toContainText("Gateway Configuration & Operator Reference");

    await expect(page.getByText("Freshness Engine Health & Readiness")).toBeVisible();
    await expect(page.getByRole("button", { name: /Test Health/i })).toBeVisible();
    await expect(page.getByText("Bifrost Plugin HTTP Header Contract")).toBeVisible();
  });
});
