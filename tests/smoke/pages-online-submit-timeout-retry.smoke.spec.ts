import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("online score submit retries after timeout instead of locking forever", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("token", "smoke_token");
      window.localStorage.setItem("userId", "42");
      window.localStorage.setItem("nickname", "Smoke");
      window.localStorage.removeItem("online_last_submit_signature_v1");

      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 80;
      (window as any).__scoreSubmitCalls = 0;

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        if (url.includes("/score")) {
          (window as any).__scoreSubmitCalls = Number((window as any).__scoreSubmitCalls || 0) + 1;
          const callIndex = Number((window as any).__scoreSubmitCalls || 0);

          if (callIndex === 1) {
            return await new Promise<Response>((_resolve, reject) => {
              const signal = init && init.signal;
              if (signal && typeof signal.addEventListener === "function") {
                signal.addEventListener(
                  "abort",
                  () => {
                    reject(new DOMException("Request aborted", "AbortError"));
                  },
                  { once: true }
                );
              }
            });
          }

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
      manager.score = Math.max(256, Number(manager.score || 0));
    });

    await page.waitForFunction(() => Number((window as any).__scoreSubmitCalls || 0) >= 2, null, {
      timeout: 12_000
    });

    const snapshot = await page.evaluate(() => ({
      calls: Number((window as any).__scoreSubmitCalls || 0),
      lastSignature: String(window.localStorage.getItem("online_last_submit_signature_v1") || "")
    }));

    expect(snapshot.calls).toBeGreaterThanOrEqual(2);
    expect(snapshot.lastSignature.length).toBeGreaterThan(0);
  });
});
