import { expect, test } from "@playwright/test";

function achievement(
  id: string,
  name: string,
  clients: string[],
  modes: string[],
) {
  return {
    id,
    name,
    description: `${name} description`,
    name_i18n: { "zh-CN": name, en: `${name} EN` },
    description_i18n: {
      "zh-CN": `${name}说明`,
      en: `${name} description`,
    },
    icon_url: "data:image/svg+xml,%3Csvg/%3E",
    status: "active",
    completable_clients: clients,
    required_mode_keys: modes,
    rules: [],
  };
}

test("achievement page resumes after login, filters challenges, and keeps its offline snapshot", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  let failAchievementRefresh = false;
  const earnedSecret = achievement(
    "earned-web-secret",
    "跨端隐藏发现",
    ["web"],
    ["future_mode"],
  );
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (
      failAchievementRefresh &&
      (url.pathname.endsWith("/api/achievements") ||
        url.pathname.endsWith("/api/user/me/achievements"))
    ) {
      await route.abort("internetdisconnected");
      return;
    }
    requests.push(`${route.request().method()} ${url.pathname}`);
    if (url.pathname.endsWith("/api/login")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "achievement-smoke-token",
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
    if (url.pathname.endsWith("/api/achievements")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            achievement(
              "android-standard",
              "稳定发挥",
              ["web", "android"],
              ["standard_4x4_pow2_no_undo"],
            ),
            achievement("web-only", "网页专属挑战", ["web"], []),
            achievement("future-mode", "未移植模式挑战", ["android"], ["future_mode"]),
          ],
        }),
      });
      return;
    }
    if (url.pathname.endsWith("/api/user/me/achievements")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              achievement: earnedSecret,
              earned_at: "2026-07-25T00:00:00.000Z",
              source: "event",
            },
          ],
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
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.locator('[data-action="open-achievements-gate"]').click();

  const login = page.locator('[data-app-view="auth-login"]');
  await expect(login).toBeVisible();
  await login.locator('input[name="email"]').fill("player@example.com");
  await login.locator('input[name="password"]').fill("password-123");
  await login.getByRole("button", { name: "登录并继续" }).click();

  const achievements = page.locator('[data-app-view="achievements"]');
  await expect(achievements).toBeVisible();
  await expect(achievements.locator("[data-achievements-earned]")).toContainText(
    "跨端隐藏发现",
  );
  await expect(achievements.locator("[data-achievements-available]")).toContainText(
    "稳定发挥",
  );
  await expect(achievements).not.toContainText("网页专属挑战");
  await expect(achievements).not.toContainText("未移植模式挑战");
  await expect(page.locator("[data-app-bottom-nav]")).toBeHidden();

  await achievements.getByRole("button", { name: "返回我的" }).click();
  failAchievementRefresh = true;
  await context.setOffline(true);
  await page.locator('[data-action="open-achievements-gate"]').click();
  await expect(achievements.locator("[data-achievements-earned]")).toContainText(
    "跨端隐藏发现",
  );
  await expect(achievements.locator("[data-achievements-status]")).toContainText(
    "网络不可用",
  );
  expect(requests).toEqual([
    "POST /api/login",
    "GET /api/achievements",
    "GET /api/user/me/achievements",
  ]);
});
