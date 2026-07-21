import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("account leaderboard exposes classic speedrun targets and ignores removed min-step filters", async ({ page }) => {
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
          ((window as any).__accountLeaderboardRequests as Array<{
            page: string | null;
            limit: string | null;
            mode: string | null;
            metric: string;
            targetTile: string | null;
          }>).push({
            page: parsed.searchParams.get("page"),
            limit: parsed.searchParams.get("limit"),
            mode: parsed.searchParams.get("mode"),
            metric,
            targetTile: parsed.searchParams.get("target_tile")
          });

          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  user_id: 1,
                  nickname: "Alice",
                  score: 4096,
                  speed_ms: 75432,
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
      const targetOptions = Array.from(document.querySelectorAll("#account-board-speed-target option")).map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option.textContent || "").trim()
      }));
      const undoOptions = Array.from(document.querySelectorAll("#account-board-undo option")).map((option) =>
        (option as HTMLOptionElement).value
      );
      const modeOptions = Array.from(document.querySelectorAll("#account-board-mode option")).map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option.textContent || "").trim()
      }));
      const calls = ((window as any).__accountMetricCalls as string[]) || [];
      const requests = ((window as any).__accountLeaderboardRequests as Array<{
        page: string | null;
        limit: string | null;
        mode: string | null;
        metric: string;
        targetTile: string | null;
      }>) || [];
      const title = (document.querySelector("#account-title") as HTMLElement | null)?.textContent || "";
      const navIds = Array.from(document.querySelectorAll(".palette-nav a")).map((node) => (node as HTMLElement).id);
      const summaryMode = (document.querySelector("#account-summary-mode") as HTMLElement | null)?.textContent || "";
      const summaryRefresh = (document.querySelector("#account-summary-refresh") as HTMLElement | null)?.textContent || "";
      const card = document.querySelector(".account-board-card");
      const filter = document.querySelector(".account-board-filter-row");
      const tools = document.querySelector(".account-board-tools") as HTMLElement | null;
      const refresh = document.querySelector("#account-board-refresh") as HTMLElement | null;
      return {
        value,
        date,
        options,
        targetOptions,
        targetHidden: (document.querySelector("#account-board-speed-target") as HTMLSelectElement | null)?.hidden,
        undoOptions,
        modeOptions,
        calls,
        requests,
        title,
        navIds,
        summaryMode,
        summaryRefresh,
        cardBackground: card ? getComputedStyle(card).backgroundColor : "",
        filterBackground: filter ? getComputedStyle(filter).backgroundColor : "",
        controlWidths: ["#account-board-undo", "#account-board-mode", "#account-board-metric"].map((selector) =>
          Math.round((document.querySelector(selector) as HTMLElement | null)?.getBoundingClientRect().width || 0)
        ),
        refreshRightGap: tools && refresh
          ? Math.round(tools.getBoundingClientRect().right - refresh.getBoundingClientRect().right)
          : -1
      };
    });

    expect(initialSnapshot.value).toBe("4096");
    expect(initialSnapshot.date).toBe("2026-03-25 18:00:00");
    expect(initialSnapshot.date).not.toContain("T");
    expect(initialSnapshot.date).not.toContain("Z");
    expect(initialSnapshot.options).toEqual(["score", "speed"]);
    expect(initialSnapshot.targetOptions).toEqual([2048, 4096, 8192, 16384, 32768].map((value) => ({
      value: String(value),
      label: String(value)
    })));
    expect(initialSnapshot.targetHidden).toBe(true);
    expect(initialSnapshot.calls.length).toBeGreaterThan(0);
    expect(initialSnapshot.calls[0]).toBe("score");
    expect(initialSnapshot.requests[0]).toEqual({
      page: "1",
      limit: "500",
      mode: "standard_no_undo",
      metric: "score",
      targetTile: null
    });
    expect(initialSnapshot.undoOptions).toEqual(["no_undo", "undo"]);
    expect(initialSnapshot.modeOptions.map((option) => option.value)).toContain("pow2_5x5");
    expect(initialSnapshot.modeOptions.map((option) => option.value)).toContain("fib_4x2");
    expect(initialSnapshot.modeOptions.map((option) => option.value)).not.toContain("pow2_5x5_undo");
    expect(initialSnapshot.modeOptions.map((option) => option.label)).toContain("4x4");
    expect(initialSnapshot.modeOptions.map((option) => option.label)).not.toContain("4x4无撤回");
    expect(initialSnapshot.cardBackground).toBe("rgb(251, 253, 252)");
    expect(initialSnapshot.filterBackground).toBe("rgb(237, 243, 242)");
    expect(initialSnapshot.controlWidths).toEqual([160, 240, 160]);
    expect(initialSnapshot.refreshRightGap).toBe(0);
    expect(initialSnapshot.title).toBe("排行榜");
    expect(initialSnapshot.navIds).toEqual(["account-nav-user", "account-nav-settings"]);
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

    await page.selectOption("#account-board-metric", "speed");
    await expect(page.locator("#account-board-speed-target")).toBeVisible();
    await expect(page.locator("#account-board-speed-target")).toHaveValue("2048");
    await expect.poll(() =>
      page.evaluate(() =>
        (((window as any).__accountLeaderboardRequests as Array<{ metric: string; targetTile: string | null }>) || [])
          .some((request) => request.metric === "speed" && request.targetTile === "2048")
      )
    ).toBe(true);
    await expect(page.locator("#account-col-score")).toHaveText("用时");
    await expect(page.locator("#account-board-list .account-score")).toHaveText("1:15.432");

    await page.selectOption("#account-board-speed-target", "32768");
    await expect.poll(() =>
      page.evaluate(() =>
        (((window as any).__accountLeaderboardRequests as Array<{ metric: string; targetTile: string | null }>) || [])
          .some((request) => request.metric === "speed" && request.targetTile === "32768")
      )
    ).toBe(true);

    await page.selectOption("#account-board-undo", "undo");
    await expect(page.locator("#account-board-mode")).toHaveValue("standard_undo");
    await expect(page.locator("#account-board-metric option")).toHaveCount(1);
    await expect(page.locator("#account-board-metric")).toHaveValue("score");
    await expect(page.locator("#account-board-speed-target")).toBeHidden();
    const undoModeOptionValues = await page.locator("#account-board-mode option").evaluateAll((modeOptions) =>
      modeOptions.map((option) => (option as HTMLOptionElement).value)
    );
    expect(undoModeOptionValues).toContain("pow2_5x5_undo");
    expect(undoModeOptionValues).toContain("fib_4x2_undo");
    expect(undoModeOptionValues).not.toContain("pow2_5x5");
    expect(undoModeOptionValues).not.toContain("capped_4096");

    await page.selectOption("#account-board-mode", "fib_4x2_undo");
    await expect.poll(() =>
      page.evaluate(() =>
        (((window as any).__accountLeaderboardRequests as Array<{ mode: string | null }>) || [])
          .some((request) => request.mode === "fib_4x2_undo")
      )
    ).toBe(true);

    await page.selectOption("#account-board-undo", "no_undo");
    await expect(page.locator("#account-board-mode")).toHaveValue("standard_no_undo");
    await expect(page.locator("#account-board-metric option")).toHaveCount(2);

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
    expect(metricSnapshot.calls[metricSnapshot.calls.length - 1]).toBe("score");

    await page.evaluate(() => document.documentElement.setAttribute("data-night-background", "1"));
    const nightBackgrounds = await page.evaluate(() => ({
      card: getComputedStyle(document.querySelector(".account-board-card") as HTMLElement).backgroundColor,
      filter: getComputedStyle(document.querySelector(".account-board-filter-row") as HTMLElement).backgroundColor
    }));
    expect(nightBackgrounds.card).toBe("rgb(35, 46, 44)");
    expect(nightBackgrounds.filter).toBe("rgb(43, 55, 52)");

    await page.setViewportSize({ width: 390, height: 844 });
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});
