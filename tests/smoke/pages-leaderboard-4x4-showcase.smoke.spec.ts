import { expect, test } from "@playwright/test";

test.describe("4x4 no-undo leaderboard showcase", () => {
  test("renders the isolated compact ranking from its fixed endpoint", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "mist_cyan");
      window.localStorage.removeItem("settings_night_background_enabled_v1");
      window.localStorage.setItem("2048_auth_userId_v1", "7");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke Beta");
      window.localStorage.setItem("2048_auth_token_v1", "smoke-token");
      (window as any).__showcaseRequests = [];
      (window as any).__showcaseAuthorization = [];
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        if (url.includes("/leaderboard/standard-4x4-no-undo")) {
          ((window as any).__showcaseRequests as string[]).push(new URL(url, window.location.origin).pathname);
          ((window as any).__showcaseAuthorization as Array<string | null>).push(new Headers(init?.headers).get("Authorization"));
          return new Response(JSON.stringify({
            success: true,
            mode_key: "standard_4x4_pow2_no_undo",
            summary: {
              total_records: 1284,
              total_players: 96,
              reached_16384: 83,
              reached_32768: 12
            },
            trend: [68240, 73110, 0, 88420, 90110, 105230, 128000].map((bestScore, index) => ({
              date: `2026-07-${String(index + 17).padStart(2, "0")}`,
              best_score: bestScore
            })),
            achievement_focus: {
              completed_all: false,
              achievement_id: "tile_4096_count_10",
              name: "10 次 4096",
              current: 8,
              target: 10,
              progress_percent: 80
            },
            data: Array.from({ length: 10 }, (_, index) => ({
              rank: index + 1,
              user_id: index === 1 ? 7 : index + 20,
              nickname: index === 1 ? "Smoke Beta" : `玩家${index + 1}`,
              score: 128000 - index * 3141,
              max_tile: index < 3 ? 8192 : 4096,
              board_sum: 32764 - index * 2048,
              duration_ms: 654321 + index * 12345,
              game_date: "2026-07-23T01:02:03.000Z"
            }))
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/leaderboard_4x4.html", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toHaveAttribute("data-leaderboard-state", "ready");

    await expect(page.locator(".showcase-intro")).toHaveCount(0);
    await expect(page.locator(".showcase-podium")).toHaveCount(0);
    await expect(page.locator("#leaderboard-4x4-list .showcase-ranking-row")).toHaveCount(10);
    expect(await page.locator("#leaderboard-4x4-list .showcase-rank").allTextContents()).toEqual(
      ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]
    );
    await expect(page.locator(".showcase-ranking-row.is-rank-top1")).toHaveCount(1);
    await expect(page.locator(".showcase-ranking-row.is-rank-top2")).toHaveClass(/is-self/);
    await expect(page.locator(".showcase-ranking-row.is-rank-top1 .showcase-ranking-score")).toHaveText("128,000");
    await expect(page.locator(".showcase-ranking-row.is-rank-top1")).toContainText("32,764");
    await expect(page.locator(".showcase-ranking-row.is-rank-top1")).toContainText("10:54.321");
    await expect(page.locator(".showcase-board [data-avatar-placeholder='initial']")).toHaveCount(10);
    await expect(page.locator(".showcase-rail [data-avatar-placeholder='initial']")).toHaveCount(3);
    await expect(page.locator(".showcase-board img")).toHaveCount(0);
    await expect(page.locator("#home-user-display")).toHaveText("Smoke Beta");
    await expect(page.locator(".showcase-brand-logo")).toHaveAttribute("src", /meta\/logo-tall\.png/);
    await expect(page.locator(".showcase-brand-mark")).toHaveCount(0);
    await expect(page.locator("#leaderboard-4x4-total-records")).toHaveText("1,284");
    await expect(page.locator("#leaderboard-4x4-total-players")).toHaveText("96");
    await expect(page.locator("#leaderboard-4x4-reached-16384")).toHaveText("83");
    await expect(page.locator("#leaderboard-4x4-rate-16384")).toHaveText("6%");
    await expect(page.locator("#leaderboard-4x4-reached-32768")).toHaveText("12");
    await expect(page.locator("#leaderboard-4x4-rate-32768")).toHaveText("1%");
    await expect(page.locator("#leaderboard-4x4-trend svg")).toHaveCount(1);
    await expect(page.locator("#leaderboard-4x4-trend .showcase-trend-point")).toHaveCount(7);
    await expect(page.locator("#leaderboard-4x4-trend .showcase-trend-reference")).toHaveCount(2);
    await expect(page.locator(".showcase-board-footer select")).toHaveCount(0);
    await expect(page.locator(".showcase-rail")).toHaveCount(1);
    await expect(page.locator(".showcase-milestone-row")).toHaveCount(6);
    await expect(page.locator(".showcase-milestone-list")).toContainText("65536");
    await expect(page.locator("#leaderboard-4x4-podium .showcase-podium-player")).toHaveCount(3);
    await expect(page.locator("#leaderboard-4x4-podium")).toContainText("玩家1");
    await expect(page.locator("#leaderboard-4x4-achievements-link")).toHaveAttribute("href", "medal-wall.html");
    await expect(page.locator("#leaderboard-4x4-progress-title")).toHaveText("10 次 4096");
    await expect(page.locator("#leaderboard-4x4-progress-rate")).toHaveText("80%");
    await expect(page.locator("#leaderboard-4x4-progress-count")).toHaveText("成就进度 8 / 10");
    await expect(page.locator("#leaderboard-4x4-progress")).toHaveAttribute("value", "80");
    const desktopLayout = await page.evaluate(() => {
      const column = (document.querySelector(".showcase-data-column") as HTMLElement).getBoundingClientRect();
      const rail = (document.querySelector(".showcase-rail") as HTMLElement).getBoundingClientRect();
      const shell = (document.querySelector(".showcase-shell") as HTMLElement).getBoundingClientRect();
      return {
        centerOffset: Math.abs(((column.left + rail.right) / 2) - (shell.left + shell.width / 2)),
        columnWidth: Math.round(column.width),
        railWidth: Math.round(rail.width)
      };
    });
    expect(desktopLayout.centerOffset).toBeLessThanOrEqual(1);
    expect(desktopLayout.columnWidth).toBe(570);
    expect(desktopLayout.railWidth).toBe(260);

    expect(await page.evaluate(() => (window as any).__showcaseRequests)).toEqual([
      "/api/leaderboard/standard-4x4-no-undo"
    ]);
    expect(await page.evaluate(() => (window as any).__showcaseAuthorization)).toEqual(["Bearer smoke-token"]);
    expect(await page.locator("body").textContent()).not.toContain("周榜");
    await expect(page.locator("#account-board-undo, #account-board-mode")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-night-background", "1");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(245, 247, 248)");
    await expect(page.locator(".showcase-board")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator(".showcase-kpi-card").first()).toHaveCSS("border-top-color", "rgb(219, 226, 229)");
  });

  test("keeps the standalone layout usable on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.setItem("theme_profile_v1", "mist_cyan");
      window.localStorage.setItem("settings_night_background_enabled_v1", "1");
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        if (url.includes("/leaderboard/standard-4x4-no-undo")) {
          return new Response(JSON.stringify({
            success: true,
            summary: {
              total_records: 320,
              total_players: 44,
              reached_16384: 12,
              reached_32768: 2
            },
            trend: [32000, 0, 44000, 51000, 48000, 70000, 88000].map((bestScore, index) => ({
              date: `2026-07-${String(index + 17).padStart(2, "0")}`,
              best_score: bestScore
            })),
            data: Array.from({ length: 6 }, (_, index) => ({
              rank: index + 1,
              user_id: index + 1,
              nickname: `移动端玩家${index + 1}`,
              score: 88000 - index * 1000,
              max_tile: 4096,
              board_sum: 16380,
              duration_ms: 900000
            }))
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return originalFetch(input, init);
      };
    });

    await page.goto("/leaderboard_4x4.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveAttribute("data-leaderboard-state", "ready");
    await expect(page.locator("html")).toHaveAttribute("data-night-background", "1");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(7, 17, 20)");
    await expect(page.locator(".showcase-board")).toHaveCSS("background-color", "rgb(13, 24, 27)");
    await expect(page.locator(".showcase-kpi-card").first()).toHaveCSS("border-top-color", "rgb(28, 53, 59)");
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      shellWidth: Math.round((document.querySelector(".showcase-shell") as HTMLElement).getBoundingClientRect().width),
      panelWidth: Math.round((document.querySelector(".showcase-board") as HTMLElement).getBoundingClientRect().width),
      overviewWidth: Math.round((document.querySelector(".showcase-overview") as HTMLElement).getBoundingClientRect().width),
      railWidth: Math.round((document.querySelector(".showcase-rail") as HTMLElement).getBoundingClientRect().width)
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport);
    expect(layout.shellWidth).toBeLessThan(layout.viewport);
    expect(layout.panelWidth).toBeLessThanOrEqual(layout.shellWidth);
    expect(layout.overviewWidth).toBeLessThanOrEqual(layout.shellWidth);
    expect(layout.railWidth).toBeLessThanOrEqual(layout.shellWidth);
    await expect(page.locator("#leaderboard-4x4-list .showcase-ranking-row")).toHaveCount(6);
    await expect(page.locator("#leaderboard-4x4-trend .showcase-trend-point")).toHaveCount(7);
    await expect(page.locator("#leaderboard-4x4-progress-title")).toHaveText("32768 全局达成率");
    await expect(page.locator("#leaderboard-4x4-progress-rate")).toHaveText("1%");
    await expect(page.locator("#leaderboard-4x4-progress-count")).toHaveText("2 / 320 局");
  });
});
