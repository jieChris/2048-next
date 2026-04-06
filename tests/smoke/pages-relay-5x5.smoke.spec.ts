import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("modes page exposes relay 5x5 entry and opens relay page", async ({ page }) => {
    await page.route("**/api/relay/**", async (route) => {
      if (route.request().method() === "GET" && route.request().url().includes("/relay/cases")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            cases: [
              {
                case_id: "case-001",
                board: "5x5",
                holder_user_id: "42",
                state_version: 3,
                lease_expires_at: "2026-04-04T12:00:00.000Z",
                updated_at: "2026-04-04T11:58:00.000Z"
              }
            ]
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    const modesResponse = await page.goto("/modes.html", { waitUntil: "domcontentloaded" });
    expect(modesResponse, "Modes response should exist").not.toBeNull();
    expect(modesResponse?.ok(), "Modes response should be 2xx").toBeTruthy();

    const relayLink = page.locator("a[data-mode-relay='5x5']");
    await expect(relayLink).toBeVisible();
    await expect(relayLink).toHaveAttribute("href", "relay_5x5.html");

    const relayResponse = await page.goto("/relay_5x5.html", { waitUntil: "domcontentloaded" });
    expect(relayResponse).not.toBeNull();
    expect(relayResponse?.ok()).toBeTruthy();

    await expect(page.locator("#relay-title")).toBeVisible();
    await expect(page.locator("#relay-nav-pku")).toHaveCount(0);
    await expect(page.locator("#relay-replay-copy-full-btn")).toBeVisible();
    await expect(page.locator("#relay-replay-copy-segment-btn")).toBeVisible();
    await expect(page.locator("#relay-case-table-body tr")).toHaveCount(1);
    await expect(page.locator("#relay-case-table-body")).toContainText("case-001");
  });

  test("relay load does not show delete confirmation dialog", async ({ page }) => {
    await page.route("**/api/relay/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (method === "GET" && url.includes("/relay/cases?board=5x5")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            cases: [
              {
                case_id: "case-001",
                board: "5x5",
                holder_user_id: null,
                state_version: 1,
                updated_at: "2026-04-05T12:00:00.000Z"
              }
            ]
          })
        });
        return;
      }
      if (method === "GET" && url.includes("/relay/cases/case-001/snapshot")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            case: {
              case_id: "case-001",
              snapshot: { invalid: true }
            }
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    let dialogCount = 0;
    page.on("dialog", async (dialog) => {
      dialogCount += 1;
      await dialog.dismiss();
    });

    const response = await page.goto("/relay_5x5.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.fill("#relay-case-id", "case-001");
    await page.click("#relay-load-btn");

    await expect(page.locator("#relay-note")).toContainText("档案快照格式无效");
    expect(dialogCount).toBe(0);
  });
});
