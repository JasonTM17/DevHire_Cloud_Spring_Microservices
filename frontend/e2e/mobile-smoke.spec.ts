import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);
}

test.describe("Mobile recruiter demo smoke", () => {
  test("jobs workspace remains usable on a phone viewport", async ({ page }) => {
    await page.goto("/jobs");

    await expect(page.getByTestId("jobs-page")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
    await expect(page.getByPlaceholder("Keyword")).toBeVisible();
    await expect(page.getByTestId("job-grid")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("assistant workspace shows safety and citation affordances on mobile", async ({ page }) => {
    await page.goto("/assistant");

    await expect(page.getByTestId("assistant-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portfolio assistant for recruiters and engineering reviewers" }))
      .toBeVisible();
    await expect(page.getByText("Safety guard")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
