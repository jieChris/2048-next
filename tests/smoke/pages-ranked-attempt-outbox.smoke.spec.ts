import { expect, test } from "@playwright/test";

import { mockAcceptedBetaAccess } from "./support/beta-access";
import { installRankedSessionForMode } from "./support/ranked-session";

test.describe("Ranked attempt outbox smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockAcceptedBetaAccess(page);
  });

  test("retries the persisted first-move begin event after reload", async ({ page }) => {
    const modeKey = "standard_4x4_pow2_no_undo";
    await installRankedSessionForMode(page, modeKey, {
      challengeId: "smoke-attempt-begin",
      clearPrefetch: true,
      clearSavedState: true,
      ownerUserId: "42",
      seed: 202,
      token: "smoke-attempt-token"
    });
    await page.addInitScript(() => {
      if (!window.localStorage.getItem("__smoke_ranked_attempt_seeded__")) {
        window.localStorage.removeItem("ranked_session_attempt_outbox:v1");
        window.localStorage.setItem("__smoke_ranked_attempt_seeded__", "1");
      }
    });

    const attemptBodies: Array<Record<string, unknown>> = [];
    const startBodies: Array<Record<string, unknown>> = [];
    await page.route("**/api/ranked-session/attempt", async (route) => {
      attemptBodies.push(route.request().postDataJSON() as Record<string, unknown>);
      if (attemptBodies.length === 1) {
        await route.abort("failed");
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });
    await page.route("**/api/ranked-session/start", async (route) => {
      startBodies.push(route.request().postDataJSON() as Record<string, unknown>);
      const sequence = startBodies.length;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            mode_key: modeKey,
            challenge_id: `smoke-prefetch-${sequence}`,
            seed: 900 + sequence,
            ranked_session_token: `smoke-prefetch-token-${sequence}`,
            issued_at: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            status: "created",
            record_era: "official_v1"
          }
        })
      });
    });
    await page.route("**/api/ranked-checkpoint**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: null })
      });
    });
    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await page.route("**/api/user/**/records**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Boolean(
        manager?.__onlineImmediateSubmitHooksBound === true &&
        (window as any).RankedSessionRuntime
      );
    });

    const moved = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.rankPolicy = "ranked";
      manager.rankedSessionToken = "smoke-attempt-token";
      manager.challengeId = "smoke-attempt-begin";
      manager.initialSeed = 202;
      manager.seed = 202;
      const startLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
      for (const direction of [0, 1, 2, 3]) {
        manager.move(direction);
        if ((Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0) > startLength) return true;
      }
      return false;
    });
    expect(moved).toBe(true);

    await expect.poll(() => attemptBodies.length, { timeout: 5_000 }).toBeGreaterThanOrEqual(1);
    await expect.poll(
      () => page.evaluate(() => Boolean(window.localStorage.getItem("ranked_session_attempt_outbox:v1"))),
      { timeout: 5_000 }
    ).toBe(true);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => attemptBodies.length, { timeout: 8_000 }).toBeGreaterThanOrEqual(2);
    await expect.poll(
      () => page.evaluate(() => window.localStorage.getItem("ranked_session_attempt_outbox:v1")),
      { timeout: 8_000 }
    ).toBeNull();

    expect(new Set(attemptBodies.map((body) => JSON.stringify(body))).size).toBe(1);
    expect(attemptBodies[0]).toEqual({
      event: "begin",
      mode_key: modeKey,
      ranked_session_token: "smoke-attempt-token",
      replay_string: expect.any(String),
      attempt_schema_version: 1
    });
    expect(String(attemptBodies[0]?.replay_string || "").length).toBeGreaterThan(0);
    expect(startBodies.every((body) => body.attempt_schema_version === 1)).toBe(true);
  });
});
