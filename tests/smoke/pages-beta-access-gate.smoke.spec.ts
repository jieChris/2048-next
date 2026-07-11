import { expect, test } from "@playwright/test";

import { mockAcceptedBetaAccess, seedBetaAccessToken } from "./support/beta-access";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("2048_beta_access_smoke_bypass_v1");
    window.localStorage.setItem("2048_beta_access_force_gate_local_v1", "1");
  });
});

test("local development opens the game without a beta backend", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("2048_beta_access_force_gate_local_v1");
    window.localStorage.removeItem("2048_auth_token_v1");
  });
  await page.route("**/api/**", (route) => route.abort());

  await page.goto("/2048.html");

  await expect(page).toHaveURL(/\/2048\.html$/);
  await page.waitForFunction(() => Boolean((window as any).game_manager), null, { timeout: 12_000 });

  await page.goto("/beta-login.html?next=%2F2048.html");
  await expect(page).toHaveURL(/\/2048\.html$/);
});

test("direct play URL without token shows login gate and does not initialize game", async ({ page }) => {
  await page.goto("/play.html?mode_key=board_3x3_pow2_no_undo");
  await expect(page).toHaveURL(/\/beta-login\.html\?gate_v=20260627-02&next=/);
  await expect(page.getByRole("heading", { name: "内测访问登录" })).toBeVisible();
  await expect(page.getByText("本项目当前为局部内测")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as any).game_manager))).toBe(false);
});

test("logged-in non-allowlisted user sees blocked state", async ({ page }) => {
  await seedBetaAccessToken(page);
  await page.route("**/api/access/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          authenticated: true,
          userId: 42,
          email: "smoke@example.com",
          role: "player",
          superAdmin: false,
          allowlisted: false,
          noticeAccepted: false,
          noticeVersion: "beta_notice_2026_06_26_v1",
          canAccessProduct: false
        }
      })
    });
  });

  await page.goto("/modes.html");
  await expect(page).toHaveURL(/\/beta-access\.html\?gate_v=20260627-02&next=%2Fmodes\.html&state=blocked/);
  await expect(page.getByRole("heading", { name: "当前账号暂未获得内测资格" })).toBeVisible();
  await expect(page.getByText("请联系管理员将你的邮箱加入内测名单后再访问。")).toBeVisible();
});

test("allowlisted user must accept notice before product page initializes", async ({ page }) => {
  await seedBetaAccessToken(page);
  let noticeAccepted = false;
  await page.route("**/api/access/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          authenticated: true,
          userId: 42,
          email: "smoke@example.com",
          role: "player",
          superAdmin: false,
          allowlisted: true,
          noticeAccepted,
          noticeVersion: "beta_notice_2026_06_26_v1",
          canAccessProduct: noticeAccepted
        }
      })
    });
  });
  await page.route("**/api/access/beta-notice/accept", async (route) => {
    noticeAccepted = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          noticeAccepted: true,
          noticeVersion: "beta_notice_2026_06_26_v1",
          canAccessProduct: true
        }
      })
    });
  });

  await page.goto("/modes.html");
  await expect(page).toHaveURL(/\/beta-access\.html\?gate_v=20260627-02&next=%2Fmodes\.html&state=notice/);
  await expect(page.getByRole("heading", { name: "内测须知与用户协议（Beta Notice）" })).toBeVisible();
  await expect(page.getByRole("button", { name: "同意并继续" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "同意并继续" }).click();
  await expect(page).toHaveURL(/\/modes\.html$/);
  await expect(page.getByRole("heading", { name: "模式选择" })).toBeVisible();
});

test("accepted beta user can initialize play page", async ({ page }) => {
  await mockAcceptedBetaAccess(page);
  await page.route("**/api/leaderboard**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] })
    });
  });

  await page.goto("/play.html?mode_key=board_3x3_pow2_no_undo");
  await page.waitForFunction(() => Boolean((window as any).game_manager), null, { timeout: 12_000 });
  await expect(page).toHaveURL(/\/play\.html\?mode_key=board_3x3_pow2_no_undo$/);
  await expect(page.locator("[data-beta-access-gate]")).toHaveCount(0);
});
