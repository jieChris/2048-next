import type { Page } from "@playwright/test";

export async function waitForWindowCondition(
  page: Page,
  predicate: () => boolean,
  timeout = 10_000
): Promise<void> {
  await page.waitForFunction(predicate, null, { timeout });
}
