import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("palette page uses the unified direct-page bootstrap", async ({ page }) => {
    const response = await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("body")).toBeVisible();

    const snapshot = await page.evaluate(() => ({
      htmlPageId: document.documentElement.getAttribute("data-page-id"),
      htmlArchitecture: document.documentElement.getAttribute("data-page-entry-architecture"),
      htmlSystem: document.documentElement.getAttribute("data-page-system"),
      bodyManifest: document.body?.getAttribute("data-page-manifest-id"),
      bodyFamily: document.body?.getAttribute("data-page-family")
    }));

    expect(snapshot).toEqual({
      htmlPageId: "palette",
      htmlArchitecture: "manifest-bootstrap",
      htmlSystem: "unified-page-system",
      bodyManifest: "palette",
      bodyFamily: "palette"
    });
  });
});
