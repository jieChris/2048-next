import { expect, test } from "@playwright/test";
import { installRankedSessionForMode } from "./support/ranked-session";

test.describe("Legacy Multi-Page Smoke", () => {
  const modeKey = "standard_4x4_pow2_no_undo";
  const bestScoreKey = `bestScoreByMode:${modeKey}`;

  test("authenticated game page syncs account best score into the visible best tile", async ({ page }) => {
    const bestScoreRequests: string[] = [];
    await installRankedSessionForMode(page, modeKey, {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 604,
      token: "smoke-token-best-sync"
    });

    await page.route("**/api/user/42/records**", async (route) => {
      bestScoreRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { mode_key: "capped_4x4_pow2_no_undo", mode_bucket: "standard_no_undo", score: 8192 },
            { mode_key: modeKey, mode_bucket: "standard_no_undo", score: 4096 }
          ]
        })
      });
    });

    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(
      ({ injectedBestScoreKey }) => {
        window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
        window.localStorage.setItem("2048_auth_userId_v1", "42");
        window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
        window.localStorage.setItem(injectedBestScoreKey, "16");
      },
      { injectedBestScoreKey: bestScoreKey }
    );

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => !!(window as any).game_manager && !!(window as any).OnlineLeaderboardRuntime);

    await expect(page.locator(".best-container")).toHaveText("4096", { timeout: 5000 });
    await expect.poll(() => bestScoreRequests.length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);

    const syncedBest = await page.evaluate((key) => window.localStorage.getItem(key), bestScoreKey);
    expect(syncedBest).toBe("4096");
    expect(bestScoreRequests[0]).toContain("mode=standard_no_undo");
    expect(bestScoreRequests[0]).toContain(`mode_key=${encodeURIComponent(modeKey)}`);
  });

  test("authenticated game page keeps a higher local best score", async ({ page }) => {
    await installRankedSessionForMode(page, modeKey, {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 605,
      token: "smoke-token-best-local"
    });

    await page.route("**/api/user/42/records**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{ mode_key: modeKey, mode_bucket: "standard_no_undo", score: 4096 }]
        })
      });
    });

    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(
      ({ injectedBestScoreKey }) => {
        window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
        window.localStorage.setItem("2048_auth_userId_v1", "42");
        window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
        window.localStorage.setItem(injectedBestScoreKey, "8192");
      },
      { injectedBestScoreKey: bestScoreKey }
    );

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => !!(window as any).game_manager && !!(window as any).OnlineLeaderboardRuntime);

    await expect(page.locator(".best-container")).toHaveText("8192");
    const syncedBest = await page.evaluate((key) => window.localStorage.getItem(key), bestScoreKey);
    expect(syncedBest).toBe("8192");
  });
});
