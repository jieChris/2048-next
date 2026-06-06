import { expect, test } from "@playwright/test";

test.describe("Home user display", () => {
  test("shows guest text above the logo when logged out", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("2048_auth_nickname_v1");
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await expect(page.locator("#home-user-display")).toHaveText("游客");
  });

  test("shows stored nickname on the action row and aligns the logo with scores", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();

    await expect(page.locator("#home-user-display")).toHaveText("SmokeUser");

    const alignment = await page.evaluate(() => {
      const label = document.getElementById("home-user-display");
      const logo = document.querySelector(".site-logo");
      const score = document.querySelector(".score-container");
      const topActions = document.querySelector(".top-action-buttons");
      const heading = document.querySelector(".heading");
      const labelRect = label?.getBoundingClientRect();
      const logoRect = logo?.getBoundingClientRect();
      const scoreRect = score?.getBoundingClientRect();
      const topActionsRect = topActions?.getBoundingClientRect();
      const headingRect = heading?.getBoundingClientRect();
      return {
        labelLeft: labelRect?.left ?? null,
        labelTop: labelRect?.top ?? null,
        labelHeight: labelRect?.height ?? null,
        labelWidth: labelRect?.width ?? null,
        topActionsTop: topActionsRect?.top ?? null,
        topActionsHeight: topActionsRect?.height ?? null,
        logoTop: logoRect?.top ?? null,
        logoLeft: logoRect?.left ?? null,
        scoreTop: scoreRect?.top ?? null,
        headingWidth: headingRect?.width ?? null
      };
    });

    expect(alignment.labelLeft).not.toBeNull();
    expect(alignment.logoLeft).not.toBeNull();
    expect(alignment.topActionsTop).not.toBeNull();
    expect(alignment.scoreTop).not.toBeNull();
    expect(Math.abs(Number(alignment.labelLeft) - Number(alignment.logoLeft))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(alignment.labelTop) - Number(alignment.topActionsTop))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(alignment.labelHeight) - Number(alignment.topActionsHeight))).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(alignment.logoTop) - Number(alignment.scoreTop))).toBeLessThanOrEqual(1);
    expect(Number(alignment.labelWidth)).toBeLessThan(Number(alignment.headingWidth) / 2);
  });
});
