import { expect, test } from "@playwright/test";

test("practice guide opens once for a new player", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("guide_seen_v1:practice-board-v1");
  });

  await page.goto("/Practice_board.html", { waitUntil: "domcontentloaded" });

  const guide = page.locator(
    '.contextual-guide-root[data-contextual-guide-id="practice-board-v1"]',
  );
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "跳过" }).click();
  await expect(guide).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("guide_seen_v1:practice-board-v1")))
    .toBe("1");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(guide).toHaveCount(0);
});
