import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("account leaderboard recovers when first request times out", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 80;
      (window as any).__accountLeaderboardCalls = 0;

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        if (url.includes("/leaderboard")) {
          (window as any).__accountLeaderboardCalls =
            Number((window as any).__accountLeaderboardCalls || 0) + 1;
          const callIndex = Number((window as any).__accountLeaderboardCalls || 0);

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

          return new Response(
            JSON.stringify({
              success: true,
              data: [{ user_id: 1, nickname: "Alice", score: 4096, game_date: "2026-03-14 10:00:00" }]
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/account.html", { waitUntil: "domcontentloaded" });
    expect(response, "Account response should exist").not.toBeNull();
    expect(response?.ok(), "Account response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const rows = document.querySelectorAll("#account-board-list .account-board-row");
      return rows.length > 0;
    });

    const snapshot = await page.evaluate(() => {
      const tip = (document.getElementById("account-board-tip") as HTMLElement | null)?.textContent || "";
      return {
        calls: Number((window as any).__accountLeaderboardCalls || 0),
        tip,
        rowCount: document.querySelectorAll("#account-board-list .account-board-row").length
      };
    });

    expect(snapshot.calls).toBeGreaterThan(1);
    expect(snapshot.rowCount).toBeGreaterThan(0);
    expect(snapshot.tip.includes("Loading")).toBeFalsy();
    expect(snapshot.tip.length).toBeGreaterThan(0);
  });
});
