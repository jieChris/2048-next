import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("account leaderboard supports min-step metric filters", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__accountMetricCalls = [];

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const rawUrl = typeof input === "string" ? input : String((input as Request).url || input);
        if (rawUrl.includes("/leaderboard")) {
          const parsed = new URL(rawUrl, window.location.origin);
          const metric = parsed.searchParams.get("metric") || "score";
          ((window as any).__accountMetricCalls as string[]).push(metric);

          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  user_id: 1,
                  nickname: "Alice",
                  score: 4096,
                  min_steps_2048: 321,
                  min_steps_4096: 777,
                  min_steps_8192: null,
                  game_date: "2026-03-25 10:00:00"
                }
              ]
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

    await page.goto("/account.html", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#account-board-list .account-board-row");

    const initialSnapshot = await page.evaluate(() => {
      const value = (document.querySelector("#account-board-list .account-score") as HTMLElement | null)?.textContent || "";
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      return { value, calls };
    });
    expect(initialSnapshot.value).toBe("4096");
    expect(initialSnapshot.calls.length).toBeGreaterThan(0);
    expect(initialSnapshot.calls[0]).toBe("score");

    await page.selectOption("#account-board-metric", "min_steps_2048");
    await page.waitForFunction(() => {
      const value = (document.querySelector("#account-board-list .account-score") as HTMLElement | null)?.textContent || "";
      return value === "321";
    });

    const metricSnapshot = await page.evaluate(() => {
      const value = (document.querySelector("#account-board-list .account-score") as HTMLElement | null)?.textContent || "";
      const header = (document.querySelector("#account-col-score") as HTMLElement | null)?.textContent || "";
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      return { value, header, calls };
    });

    expect(metricSnapshot.value).toBe("321");
    expect(metricSnapshot.header).toContain("步");
    expect(metricSnapshot.calls.some((item) => item === "min_steps_2048")).toBeTruthy();
  });
});
