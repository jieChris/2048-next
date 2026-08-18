import { expect, test, type Page } from "@playwright/test";

const adminUser = {
  id: 42,
  email: "player42@example.com",
  nickname: "玩家一号",
  display_name: "玩家一号",
  role: "player",
  is_active: true,
  created_at: "2026-07-20T08:00:00.000Z",
  last_login_at: "2026-08-01T09:00:00.000Z",
  last_seen_at: "2026-08-02T09:00:00.000Z",
  record_count: 3
};

async function installAdminApiMocks(page: Page): Promise<{
  paths: string[];
  previewBodies: Record<string, unknown>[];
  importBodies: Record<string, unknown>[];
}> {
  const paths: string[] = [];
  const previewBodies: Record<string, unknown>[] = [];
  const importBodies: Record<string, unknown>[] = [];

  await page.addInitScript(() => {
    localStorage.setItem("2048_auth_token_v1", "admin-smoke-token");
    localStorage.setItem("ui_language_v1", "zh");
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    paths.push(path);

    if (path === "/api/admin/me") {
      await route.fulfill({ json: { success: true, data: { user_id: 0, admin: true, rootAdmin: true, canManageSuperAdmins: true } } });
      return;
    }
    if (path === "/api/admin/dashboard") {
      await route.fulfill({
        json: {
          success: true,
          data: {
            metrics: { total_users: 128, active_users: 120, inactive_users: 8, new_users_7d: 9, active_users_7d: 64, pending_rescue_offers: 2 },
            recent_users: [adminUser],
            recent_audit: [],
            recent_events: []
          }
        }
      });
      return;
    }
    if (path === "/api/admin/users") {
      await route.fulfill({ json: { success: true, data: [adminUser], page: 1, limit: 50, total: 1 } });
      return;
    }
    if (path === "/api/admin/users/42") {
      await route.fulfill({
        json: {
          success: true,
          data: {
            user: adminUser,
            stats: { total_records: 3, best_score: 32768, best_tile: 2048, latest_record_at: "2026-08-01T10:00:00.000Z" },
            leaderboard: [],
            achievements: [],
            rescue_offers: [],
            audit: []
          }
        }
      });
      return;
    }
    if (path === "/api/admin/users/42/record-import/preview") {
      previewBodies.push(request.postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        json: {
          success: true,
          data: {
            mode_key: "standard-4x4",
            score: 32768,
            best_tile: 2048,
            steps: 914,
            duration_ms: 185000,
            ended_at: "2026-08-01T10:00:00.000Z",
            replay_fingerprint: "sha256:admin-smoke"
          }
        }
      });
      return;
    }
    if (path === "/api/admin/users/42/record-import") {
      importBodies.push(request.postDataJSON() as Record<string, unknown>);
      await route.fulfill({ json: { success: true, data: { record_id: "admin-record-42", record_era: "official_v1", source: "admin" } } });
      return;
    }

    await route.fulfill({ status: 404, json: { success: false, error: `unexpected_admin_smoke_path:${path}` } });
  });

  return { paths, previewBodies, importBodies };
}

test.describe("Next admin console", () => {
  test("shows the 404 page when the browser has no authenticated admin session", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("2048_auth_token_v1");
      localStorage.removeItem("2048_auth_userId_v1");
      localStorage.removeItem("2048_auth_nickname_v1");
    });

    await page.goto("/admin.html?view=dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/404\.html$/u);
    await expect(page.locator("body")).toBeVisible();
  });

  test("searches users and imports a replay through server preview", async ({ page }) => {
    const requests = await installAdminApiMocks(page);

    await page.goto("/admin.html?view=dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "仪表盘", level: 1 })).toBeVisible();
    await expect(page.getByText("128", { exact: true })).toBeVisible();

    await page.getByRole("searchbox", { name: "搜索用户 ID、邮箱或昵称" }).fill("玩家一号");
    await page.locator("[data-global-search]").getByRole("button", { name: "搜索" }).click();
    await expect(page).toHaveURL(/view=users.*q=/u);
    await expect(page.getByRole("button", { name: /玩家一号/u }).first()).toBeVisible();

    await page.getByRole("button", { name: /玩家一号/u }).first().click();
    await expect(page).toHaveURL(/view=users.*user=42/u);
    await expect(page.getByRole("heading", { name: "玩家一号", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "补录对局" }).click();
    const dialog = page.locator("#admin-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#dialog-import-score, #dialog-import-duration, [name=score], [name=steps]")).toHaveCount(0);
    await dialog.locator("#dialog-import-replay").fill("replay:complete-terminal-game");
    await dialog.locator("#dialog-import-reason").fill("客户端离线导致终局记录未上传");
    await dialog.getByRole("button", { name: "预校验" }).click();

    await expect(dialog.getByText("服务端预校验结果")).toBeVisible();
    await expect(dialog.getByText("32768", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "确认执行" }).click();

    await expect(page.locator("#admin-toast")).toContainText("admin-record-42");
    expect(requests.previewBodies).toEqual([{ replay_string: "replay:complete-terminal-game", reason: "客户端离线导致终局记录未上传" }]);
    expect(requests.importBodies).toEqual(requests.previewBodies);
    expect(requests.paths.some((path) => path.includes("beta-access/allowlist"))).toBe(false);
    await expect(page.getByText("内测资格", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("uses a drawer navigation without page-level overflow on narrow screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installAdminApiMocks(page);

    await page.goto("/admin.html?view=dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "仪表盘", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "打开导航" }).click();
    await expect(page.locator("#admin-sidebar")).toHaveClass(/is-open/u);
    await expect(page.locator("#admin-sidebar-backdrop")).toBeVisible();

    await page.locator("#admin-sidebar").getByRole("button", { name: "用户中心" }).click();
    await expect(page.getByRole("heading", { name: "用户中心", level: 1 })).toBeVisible();
    await expect(page.locator("#admin-sidebar")).not.toHaveClass(/is-open/u);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
