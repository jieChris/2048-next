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
  externalPreviewBodies: string[];
  externalCommitBodies: string[];
}> {
  const paths: string[] = [];
  const previewBodies: Record<string, unknown>[] = [];
  const importBodies: Record<string, unknown>[] = [];
  const externalPreviewBodies: string[] = [];
  const externalCommitBodies: string[] = [];

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
    if (path === "/api/admin/users/42/third-party-record-import/preview") {
      externalPreviewBodies.push(request.postData() || "");
      await route.fulfill({
        json: {
          success: true,
          data: {
            user_id: 42,
            commit: false,
            container: "zip",
            archive_entry_count: 2,
            total: 2,
            valid: 1,
            would_insert: 1,
            inserted: 0,
            skipped_duplicates: 0,
            rejected: 1,
            batch_id: null,
            batch_audit_recorded: null,
            items: [
              {
                index: 0,
                status: "would_insert",
                source_filename: "verse-replay.txt",
                source_platform_id: "2048verse",
                source_platform_name: "2048Verse",
                source_adapter_version: "1",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 16384
              },
              {
                index: 1,
                status: "rejected",
                source_filename: "summary.txt",
                error: "unsupported_format"
              }
            ]
          }
        }
      });
      return;
    }
    if (path === "/api/admin/users/42/third-party-record-import/commit") {
      externalCommitBodies.push(request.postData() || "");
      await route.fulfill({
        json: {
          success: true,
          data: {
            user_id: 42,
            commit: true,
            container: "zip",
            archive_entry_count: 2,
            total: 2,
            valid: 1,
            would_insert: 0,
            inserted: 1,
            skipped_duplicates: 0,
            rejected: 1,
            batch_id: "import_smoke",
            batch_audit_recorded: false,
            items: [
              {
                index: 0,
                status: "inserted",
                record_id: "third-party-record-42",
                source_filename: "verse-replay.txt",
                source_platform_id: "2048verse",
                source_platform_name: "2048Verse",
                source_adapter_version: "1",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 16384
              },
              {
                index: 1,
                status: "rejected",
                source_filename: "summary.txt",
                error: "unsupported_format"
              }
            ]
          }
        }
      });
      return;
    }
    if (path === "/api/admin/records") {
      await route.fulfill({
        json: {
          success: true,
          data: [{
            id: "third-party-record-42",
            user_id: 42,
            user_name: "玩家一号",
            email: "player42@example.com",
            mode_key: "standard_4x4_pow2_no_undo",
            score: 16384,
            best_tile: 2048,
            duration_ms: 120000,
            source: "normal",
            source_platform_name: "2048Verse",
            status: "verified",
            ended_at: "2026-08-01T10:00:00.000Z"
          }],
          page: 1,
          limit: 50,
          total: 1
        }
      });
      return;
    }

    await route.fulfill({ status: 404, json: { success: false, error: `unexpected_admin_smoke_path:${path}` } });
  });

  return { paths, previewBodies, importBodies, externalPreviewBodies, externalCommitBodies };
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

  test("searches users and imports a replay through the independent module", async ({ page }) => {
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
    await expect(dialog.locator("#dialog-import-user")).toHaveValue("42");
    await dialog.getByRole("button", { name: "取消" }).click();

    await page.locator("#admin-sidebar").getByRole("button", { name: "成绩补录" }).click();
    await expect(page).toHaveURL(/view=imports/u);
    await expect(page.getByRole("heading", { name: "成绩补录", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "补录对局" }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#dialog-import-score, #dialog-import-duration, [name=score], [name=steps]")).toHaveCount(0);
    await dialog.getByLabel("目标用户 ID").fill("42");
    await dialog.getByLabel("或粘贴回放字符串").fill("replay:complete-terminal-game");
    await dialog.getByLabel("原因").fill("客户端离线导致终局记录未上传");
    await dialog.getByRole("button", { name: "预校验" }).click();

    await expect(dialog.getByText("服务端预校验结果")).toBeVisible();
    await expect(dialog.getByText("32768", { exact: true })).toBeVisible();
    expect(requests.importBodies).toHaveLength(0);
    await dialog.getByRole("button", { name: "确认执行" }).click();

    await expect(page.locator("#admin-toast")).toContainText("admin-record-42");
    expect(requests.previewBodies).toEqual([{ replay_string: "replay:complete-terminal-game", reason: "客户端离线导致终局记录未上传" }]);
    expect(requests.importBodies).toEqual(requests.previewBodies);
    expect(requests.paths.some((path) => path.includes("beta-access/allowlist"))).toBe(false);
    await expect(page.getByText("内测资格", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("previews and commits a third-party batch without changing the official import flow", async ({ page }) => {
    const requests = await installAdminApiMocks(page);
    const reason = "导入玩家从第三方平台导出的完整回放";

    await page.goto("/admin.html?view=external-import&user_id=42", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "第三方记录导入", level: 1 })).toBeVisible();
    await expect(page.getByText("不计入排行榜、Rating、正式统计或正式成绩成就")).toBeVisible();

    const form = page.locator("[data-external-import-form]");
    const fileInput = form.locator("#external-import-file");
    const commitButton = form.locator("[data-external-commit]");
    await fileInput.setInputFiles({ name: "third-party.zip", mimeType: "application/zip", buffer: Buffer.from("zip-smoke") });
    await form.getByLabel("原因").fill(reason);
    await form.getByRole("button", { name: "预览导入" }).click();

    await expect(page.getByRole("heading", { name: "导入预览", level: 2 })).toBeVisible();
    await expect(page.getByText("第三方 · 2048Verse", { exact: true })).toBeVisible();
    await expect(page.getByText("summary.txt", { exact: true })).toBeVisible();
    const previewRows = page.locator("[data-external-result] tbody tr");
    await expect(previewRows.nth(0).locator("td").first()).toHaveText("1");
    await expect(previewRows.nth(1).locator("td").first()).toHaveText("2");
    await expect(commitButton).toBeEnabled();

    await fileInput.setInputFiles({ name: "third-party-updated.zip", mimeType: "application/zip", buffer: Buffer.from("zip-smoke-updated") });
    await expect(page.getByRole("heading", { name: "导入预览", level: 2 })).toHaveCount(0);
    await expect(commitButton).toBeDisabled();

    await form.getByRole("button", { name: "预览导入" }).click();
    await expect(page.getByRole("heading", { name: "导入预览", level: 2 })).toBeVisible();
    await form.getByLabel("目标用户 ID").fill("43");
    await expect(commitButton).toBeDisabled();
    await expect(page.getByRole("heading", { name: "导入预览", level: 2 })).toHaveCount(0);
    await form.getByLabel("目标用户 ID").fill("42");
    await form.getByRole("button", { name: "预览导入" }).click();
    await expect(commitButton).toBeEnabled();

    await commitButton.click();
    const dialog = page.locator("#admin-dialog");
    await expect(dialog.getByText("提交时服务端会重新解析、验证并去重")).toBeVisible();
    await dialog.getByRole("button", { name: "确认导入" }).click();

    await expect(page.getByRole("heading", { name: "导入结果", level: 2 })).toBeVisible();
    await expect(page.locator("[data-external-result] .alert-danger")).toContainText("批次汇总审计写入失败");
    await expect(page.locator("#admin-toast")).toContainText("批次汇总审计写入失败");
    expect(requests.externalPreviewBodies).toHaveLength(3);
    expect(requests.externalCommitBodies).toHaveLength(1);
    for (const body of [...requests.externalPreviewBodies, ...requests.externalCommitBodies]) {
      expect(body).toContain('name="file"');
      expect(body).toContain('name="reason"');
      expect(body).toContain(reason);
      expect(body).not.toContain('name="user_id"');
    }

    await page.locator("#admin-sidebar").getByRole("button", { name: "游戏记录" }).click();
    await expect(page.getByText("第三方 · 2048Verse", { exact: true })).toBeVisible();
    expect(requests.paths.some((path) => path.endsWith("/record-import"))).toBe(false);
  });

  test("uses a drawer navigation without page-level overflow on narrow screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installAdminApiMocks(page);

    await page.goto("/admin.html?view=dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "仪表盘", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "打开导航" }).click();
    await expect(page.locator("#admin-sidebar")).toHaveClass(/is-open/u);
    await expect(page.locator("#admin-sidebar-backdrop")).toBeVisible();

    await page.locator("#admin-sidebar").getByRole("button", { name: "成绩补录" }).click();
    await expect(page.getByRole("heading", { name: "成绩补录", level: 1 })).toBeVisible();
    await expect(page.locator("#admin-sidebar")).not.toHaveClass(/is-open/u);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
