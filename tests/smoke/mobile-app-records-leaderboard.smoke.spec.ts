import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page): Promise<void> {
  await page.getByRole("button", { name: "同意并继续" }).click();
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "登录或注册" }).click();
  const login = page.locator('[data-app-view="auth-login"]');
  await login.locator('input[name="email"]').fill("player@example.com");
  await login.locator('input[name="password"]').fill("password-123");
  await login.getByRole("button", { name: "登录并继续" }).click();
  await expect(page.locator("[data-account-title]")).toHaveText("Smoke Player");
}

function historyRow(score: number, deleted: boolean) {
  return {
    id: "cloud-record-1",
    client_record_id: "client-record-1",
    mode_key: "standard_4x4_pow2_no_undo",
    source: "ranked",
    score,
    board_sum: 8192,
    duration_ms: 12_345,
    steps: 42,
    best_tile: 2048,
    ended_at: "2026-07-25T00:00:00.000Z",
    deleted_at: deleted ? "2026-07-25T01:00:00.000Z" : null,
  };
}

test("account cloud history shows cache first and supports active delete restore filters", async ({
  page,
}) => {
  let deleted = false;
  let score = 4_096;
  let delayActiveRefresh = false;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/api/login")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "records-smoke-token",
          expiresAt: 2_000_000_000,
          user: {
            id: 42,
            email: "player@example.com",
            nickname: "Smoke Player",
            role: "player",
          },
        }),
      });
      return;
    }
    if (url.pathname.endsWith("/api/user/42/records")) {
      const status = url.searchParams.get("status");
      if (status === "active" && delayActiveRefresh) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const rows = status === "deleted"
        ? deleted ? [historyRow(score, true)] : []
        : deleted ? [] : [historyRow(score, false)];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: rows,
          page: 1,
          total_pages: rows.length > 0 ? 1 : 0,
          has_next: false,
        }),
      });
      return;
    }
    if (
      url.pathname.endsWith("/api/records/cloud-record-1") &&
      route.request().method() === "DELETE"
    ) {
      deleted = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }
    if (url.pathname.endsWith("/api/records/cloud-record-1/restore")) {
      deleted = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, code: "UNEXPECTED_ROUTE" }),
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await signIn(page);
  await page.locator('[data-app-bottom-nav] [data-nav="records"]').click();
  const list = page.locator("[data-record-list]");
  await expect(list).toContainText("4,096");

  await page.locator('[data-app-bottom-nav] [data-nav="home"]').click();
  score = 8_192;
  delayActiveRefresh = true;
  await page.locator('[data-app-bottom-nav] [data-nav="records"]').click();
  await expect(page.locator("[data-cloud-history-status]")).toContainText(
    "本机缓存",
    { timeout: 300 },
  );
  await expect(list).toContainText("4,096", { timeout: 300 });
  await expect(list).toContainText("8,192");
  delayActiveRefresh = false;

  await page.locator('[data-cloud-record-id="cloud-record-1"]').click();
  await page.getByRole("button", { name: "移到最近删除" }).click();
  await page.locator("[data-delete-dialog]")
    .getByRole("button", { name: "移到最近删除" })
    .click();
  await expect(page.locator('[data-cloud-record-id="cloud-record-1"]'))
    .toHaveCount(0);

  await page.locator("[data-record-owner]").selectOption("account-deleted");
  await expect(page.locator('[data-cloud-record-id="cloud-record-1"]'))
    .toBeVisible();
  await page.locator('[data-cloud-record-id="cloud-record-1"]').click();
  await page.getByRole("button", { name: "恢复记录" }).click();
  await expect(page.locator('[data-cloud-record-id="cloud-record-1"]'))
    .toHaveCount(0);

  await page.locator("[data-record-owner]").selectOption("account-active");
  await expect(page.locator('[data-cloud-record-id="cloud-record-1"]'))
    .toBeVisible();
});

test("leaderboard keeps backend ranks, scope filters, cache refresh, and game input fence", async ({
  page,
}) => {
  let rank = 47;
  let delayRefresh = false;
  const leaderboardRequests: string[] = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/api/leaderboard")) {
      leaderboardRequests.push(url.search);
      if (delayRefresh) await new Promise((resolve) => setTimeout(resolve, 500));
      const speed = url.searchParams.get("metric") === "speed";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{
            rank,
            user_id: 9,
            nickname: "Player Nine",
            score: speed ? null : 65_536,
            speed_ms: speed ? 1_234 : null,
            canonical_ended_at: "2026-07-25T00:00:00.000Z",
          }],
          page: 1,
          has_next: false,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, code: "UNEXPECTED_ROUTE" }),
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "同意并继续" }).click();
  await page.locator('[data-app-bottom-nav] [data-nav="records"]').click();
  await page.locator('[data-app-view="records"] [data-action="open-leaderboard"]')
    .click();
  const dialog = page.locator("[data-leaderboard-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-leaderboard-list]")).toContainText("#47");

  await dialog.getByRole("button", { name: "关闭排行榜" }).click();
  rank = 88;
  delayRefresh = true;
  await page.locator('[data-app-view="records"] [data-action="open-leaderboard"]')
    .click();
  await expect(dialog.locator("[data-leaderboard-status]")).toContainText(
    "本机缓存",
    { timeout: 300 },
  );
  await expect(dialog.locator("[data-leaderboard-list]")).toContainText(
    "#47",
    { timeout: 300 },
  );
  await expect(dialog.locator("[data-leaderboard-list]")).toContainText("#88");
  delayRefresh = false;

  await dialog.locator("[data-leaderboard-period]").selectOption("week");
  await expect.poll(() => leaderboardRequests.at(-1) ?? "")
    .toContain("period=week");
  await dialog.locator("[data-leaderboard-metric]").selectOption("speed");
  await expect.poll(() => leaderboardRequests.at(-1) ?? "")
    .toContain("metric=speed");
  await expect(dialog.locator("[data-leaderboard-list]")).toContainText(
    "00:01.234",
  );
  await dialog.locator("[data-leaderboard-target]").selectOption("4096");
  await expect.poll(() => leaderboardRequests.at(-1) ?? "")
    .toContain("target_tile=4096");
  await dialog.getByRole("button", { name: "关闭排行榜" }).click();

  await page.locator('[data-app-bottom-nav] [data-nav="home"]').click();
  await page.getByRole("button", { name: "开始标准 4×4" }).click();
  await expect(page.locator('[data-app-view="game"]')).toBeVisible();
  const board = page.locator("[data-game-board-root]");
  await expect(board.locator("[data-board-tile]")).toHaveCount(16);
  const initialValues = await board.locator("[data-board-tile]")
    .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute("data-value")));
  let started = false;
  for (const key of ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"]) {
    await board.press(key);
    await page.waitForTimeout(180);
    const values = await board.locator("[data-board-tile]")
      .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute("data-value")));
    if (JSON.stringify(values) !== JSON.stringify(initialValues)) {
      started = true;
      break;
    }
  }
  expect(started).toBe(true);
  await page.waitForTimeout(1_100);
  await expect(page.locator("[data-game-time]")).not.toHaveText("00:00");

  await page.locator('[data-app-view="game"]')
    .getByRole("button", { name: "打开排行榜" })
    .click();
  await expect(dialog).toBeVisible();
  const valuesBefore = await board.locator("[data-board-tile]")
    .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute("data-value")));
  const timeBefore = await page.locator("[data-game-time]").textContent();
  await board.dispatchEvent("keydown", { key: "ArrowDown" });
  await page.waitForTimeout(250);
  expect(await board.locator("[data-board-tile]")
    .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute("data-value"))))
    .toEqual(valuesBefore);
  await expect.poll(() => page.locator("[data-game-time]").textContent(), {
    timeout: 2_500,
  }).not.toBe(timeBefore);

  await dialog.getByRole("button", { name: "关闭排行榜" }).click();
  let changed = false;
  for (const key of ["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight"]) {
    await board.press(key);
    await page.waitForTimeout(150);
    const values = await board.locator("[data-board-tile]")
      .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute("data-value")));
    if (JSON.stringify(values) !== JSON.stringify(valuesBefore)) {
      changed = true;
      break;
    }
  }
  expect(changed).toBe(true);
});
