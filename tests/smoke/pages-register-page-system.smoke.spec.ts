import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("register page uses the unified direct-page bootstrap", async ({ page }) => {
    const response = await page.goto("/register.html", { waitUntil: "domcontentloaded" });
    expect(response, "Register response should exist").not.toBeNull();
    expect(response?.ok(), "Register response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();

    const snapshot = await page.evaluate(() => ({
      htmlPageId: document.documentElement.getAttribute("data-page-id"),
      htmlArchitecture: document.documentElement.getAttribute("data-page-entry-architecture"),
      htmlSystem: document.documentElement.getAttribute("data-page-system"),
      bodyManifest: document.body?.getAttribute("data-page-manifest-id"),
      bodyFamily: document.body?.getAttribute("data-page-family")
    }));

    expect(snapshot).toEqual({
      htmlPageId: "register",
      htmlArchitecture: "manifest-bootstrap",
      htmlSystem: "unified-page-system",
      bodyManifest: "register",
      bodyFamily: "register"
    });
  });
});
