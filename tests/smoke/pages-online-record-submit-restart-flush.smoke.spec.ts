import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("online record submit flushes before restart when game is already over", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("token", "smoke_token");
      window.localStorage.setItem("userId", "42");
      window.localStorage.setItem("nickname", "Smoke");
      window.localStorage.removeItem("online_last_submit_signature_v1");
      window.localStorage.removeItem("online_last_record_submit_signature_v1");

      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
      (window as any).__recordSubmitCalls = 0;

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        if (url.includes("/records")) {
          (window as any).__recordSubmitCalls = Number((window as any).__recordSubmitCalls || 0) + 1;
          return new Response(JSON.stringify({ success: true, id: "rec-smoke-1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/score")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/leaderboard")) {
          return new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = Math.max(512, Number(manager.score || 0));

      if (typeof manager.serialize !== "function") {
        manager.serialize = () => '{"v":3,"actions":[0,1,2,3]}';
      }
      if (typeof manager.serializeV3 !== "function") {
        manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2, 3] });
      }

      manager.restart();
    });

    await page.waitForFunction(() => Number((window as any).__recordSubmitCalls || 0) >= 1, null, {
      timeout: 4000
    });

    const snapshot = await page.evaluate(() => ({
      calls: Number((window as any).__recordSubmitCalls || 0),
      lastRecordSignature: String(window.localStorage.getItem("online_last_record_submit_signature_v1") || "")
    }));

    expect(snapshot.calls).toBeGreaterThanOrEqual(1);
    expect(snapshot.lastRecordSignature.length).toBeGreaterThan(0);
  });
});
