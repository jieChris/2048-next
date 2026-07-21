import { expect, test } from "@playwright/test";

import { mockAcceptedBetaAccess } from "./support/beta-access";

test("local history keeps export and clear actions without import controls", async ({ page }) => {
  await mockAcceptedBetaAccess(page);
  await page.goto("/history.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#history-import-btn")).toHaveCount(0);
  await expect(page.locator("#history-import-replace-btn")).toHaveCount(0);
  await expect(page.locator("#history-import-file")).toHaveCount(0);
  await expect(page.locator("#history-export-all-btn")).toBeVisible();
  await expect(page.locator("#history-clear-all-btn")).toBeVisible();
});
