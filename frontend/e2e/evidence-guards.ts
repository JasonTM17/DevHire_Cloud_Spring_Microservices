import { expect, type Page } from "@playwright/test";

const forbiddenPrimaryEvidencePatterns = [
  /\bUNKNOWN\b/i,
  /\bLoading\b/i,
  /Pending job ID/i,
  /Job ID/i,
  /Live API Gateway is offline/i,
  /Fallback disabled/i,
  /local-deterministic-fallback/i,
  /Reviewer demo mode/i,
  /\bfallback\b/i,
  /\boffline\b/i,
  /\bsmoke\b/i,
  /preview-[a-z0-9-]+/i,
  /\b(?:AUTO_REVIEWED|EMPLOYER_REVIEWED|PENDING_REVIEW|REVIEW_QUEUE|PROVIDER_READY|SAFE_PREVIEW|REVIEWER_SAFE|CIRCUIT_OPEN_SAFE_MODE)\b/,
  /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
  /[\u00c3\u00a2\u00ef\u00bf\u00bd]/
];

export async function assertPrimaryEvidenceReady(page: Page) {
  const bodyText = await page.locator("body").innerText();
  for (const pattern of forbiddenPrimaryEvidencePatterns) {
    expect(bodyText, `Primary evidence must not contain rough term: ${pattern}`).not.toMatch(pattern);
  }
}

export async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);
}
