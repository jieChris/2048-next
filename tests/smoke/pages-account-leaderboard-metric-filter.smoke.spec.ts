import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("account leaderboard only exposes score metric and ignores removed min-step filters", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__accountMetricCalls = [];
      (window as any).__accountLeaderboardRequests = [];

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const rawUrl = typeof input === "string" ? input : String((input as Request).url || input);
        if (rawUrl.includes("/leaderboard")) {
          const parsed = new URL(rawUrl, window.location.origin);
          const metric = parsed.searchParams.get("metric") || "score";
          ((window as any).__accountMetricCalls as string[]).push(metric);
          ((window as any).__accountLeaderboardRequests as Array<{ page: string | null; limit: string | null }>).push({
            page: parsed.searchParams.get("page"),
            limit: parsed.searchParams.get("limit")
          });

          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  user_id: 1,
                  nickname: "Alice",
                  score: 4096,
                  game_date: "2026-03-25T10:00:00Z"
                }
              ]
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        if (rawUrl.includes("/user/me") || rawUrl.endsWith("/api/me")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: 19, nickname: "SmokeUser", email: "smoke@example.com" }
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
      const date = (document.querySelector("#account-board-list .account-date") as HTMLElement | null)?.textContent || "";
      const options = Array.from(document.querySelectorAll("#account-board-metric option")).map((option) =>
        (option as HTMLOptionElement).value
      );
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      const requests = ((window as any).__accountLeaderboardRequests as Array<{ page: string | null; limit: string | null }>) || [];
      const title = (document.querySelector("#account-title") as HTMLElement | null)?.textContent || "";
      const navIds = Array.from(document.querySelectorAll(".palette-nav a")).map((node) => (node as HTMLElement).id);
      const summaryMode = (document.querySelector("#account-summary-mode") as HTMLElement | null)?.textContent || "";
      const summaryRefresh = (document.querySelector("#account-summary-refresh") as HTMLElement | null)?.textContent || "";
      return { value, date, options, calls, requests, title, navIds, summaryMode, summaryRefresh };
    });

    expect(initialSnapshot.value).toBe("4096");
    expect(initialSnapshot.date).toBe("2026-03-25 18:00:00");
    expect(initialSnapshot.date).not.toContain("T");
    expect(initialSnapshot.date).not.toContain("Z");
    expect(initialSnapshot.options).toEqual(["score"]);
    expect(initialSnapshot.calls.length).toBeGreaterThan(0);
    expect(initialSnapshot.calls[0]).toBe("score");
    expect(initialSnapshot.requests[0]).toEqual({ page: "1", limit: "500" });
    expect(initialSnapshot.title).toBe("排行榜");
    expect(initialSnapshot.navIds).toEqual(["account-nav-user", "account-nav-settings", "account-nav-home"]);
    await expect(page.locator("#account-nav-user")).toBeHidden();
    expect(initialSnapshot.summaryMode).toContain("4x4");
    expect(initialSnapshot.summaryRefresh).not.toBe("--");
    await expect(page.locator("#account-board-prev")).toHaveCount(0);
    await expect(page.locator("#account-board-page")).toHaveCount(0);
    await expect(page.locator("#account-board-next")).toHaveCount(0);
    await expect(page.locator(".account-auth-card")).toHaveCount(0);
    await expect(page.locator("#account-login-btn")).toHaveCount(0);

    await page.evaluate(() => {
      window.localStorage.setItem("2048_auth_token_v1", "account-nav-token");
      window.dispatchEvent(new StorageEvent("storage", { key: "2048_auth_token_v1" }));
    });
    await expect(page.locator("#account-nav-user")).toBeVisible();
    await expect(page.locator("#account-nav-user")).toHaveAttribute("href", "user.html");
    await expect(page.locator("#account-nav-user")).toHaveText("用户中心");

    await page.evaluate(() => {
      const metricSelect = document.querySelector("#account-board-metric") as HTMLSelectElement | null;
      if (!metricSelect) return;
      const injectedOption = document.createElement("option");
      injectedOption.value = "min_steps_2048";
      injectedOption.textContent = "Injected";
      metricSelect.appendChild(injectedOption);
      metricSelect.value = "min_steps_2048";
      metricSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await page.waitForFunction(() => {
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      return calls.length >= 2;
    });

    const metricSnapshot = await page.evaluate(() => {
      const value = (document.querySelector("#account-board-list .account-score") as HTMLElement | null)?.textContent || "";
      const header = (document.querySelector("#account-col-score") as HTMLElement | null)?.textContent || "";
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      return { value, header, calls };
    });

    expect(metricSnapshot.value).toBe("4096");
    expect(metricSnapshot.header.length).toBeGreaterThan(0);
    expect(metricSnapshot.calls.every((item) => item === "score")).toBeTruthy();
  });
});
