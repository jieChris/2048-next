import { expect, test } from "@playwright/test";

import { mockAcceptedBetaAccess } from "./support/beta-access";

const achievementCatalog = [
  {
    id: "ach_first_2048",
    name: "首次 2048",
    description: "第一次合成 2048 方块。",
    name_i18n: { "zh-CN": "首次 2048", en: "First 2048" },
    description_i18n: {
      "zh-CN": "第一次合成 2048 方块。",
      en: "Reach 2048 for the first time."
    },
    icon_url: "/meta/apple-touch-icon.png",
    status: "active",
    level: 1,
    series_id: "tile-2048",
    rules: [{ type: "max_tile_reached", params: { tile: 2048, count: 1 } }]
  },
  {
    id: "ach_event_champion",
    name: "活动冠军",
    description: "在指定活动中获得第一名。",
    name_i18n: { "zh-CN": "活动冠军", en: "Event Champion" },
    description_i18n: {
      "zh-CN": "在指定活动中获得第一名。",
      en: "Finish first in a specified event."
    },
    icon_url: "",
    status: "active",
    level: 3,
    series_id: "event-rank",
    rules: [{ type: "event_rank", params: { event_id: "event_2026", rank: 1 } }]
  },
  {
    id: "ach_200th_2048",
    name: "第 200 次 2048",
    description: "累计第 200 次合成 2048。",
    name_i18n: { "zh-CN": "第 200 次 2048", en: "200th 2048" },
    description_i18n: {
      "zh-CN": "累计第 200 次合成 2048。",
      en: "Reach 2048 for the 200th time."
    },
    icon_url: "",
    status: "active",
    level: 2,
    series_id: "tile-2048",
    rules: [{ type: "nth_max_tile_reached", params: { tile: 2048, count: 200 } }]
  },
  {
    id: "speed_2048_under_300s",
    name: "5 分钟内 2048",
    description: "在合法 ranked 对局中用 5 分钟内达到 2048。",
    name_i18n: { "zh-CN": "5 分钟内 2048", en: "2048 in 5 minutes" },
    description_i18n: {
      "zh-CN": "在合法 ranked 对局中用 5 分钟内达到 2048。",
      en: "Reach 2048 within 5 minutes in a valid ranked game."
    },
    icon_url: "",
    status: "active",
    level: 1,
    series_id: "speed-2048",
    rules: [{ type: "max_tile_within_duration", params: { tile: 2048, duration_ms: 300000 } }]
  },
  {
    id: "beta_pioneer",
    name: "内测先锋",
    description: "感谢参与 2048next.cn 内测并帮助打磨早期体验的玩家。",
    name_i18n: { "zh-CN": "内测先锋", en: "Beta Pioneer" },
    description_i18n: {
      "zh-CN": "感谢参与 2048next.cn 内测并帮助打磨早期体验的玩家。",
      en: "For players who joined the 2048next.cn beta and helped shape the early experience."
    },
    icon_url: "",
    status: "active",
    level: 1,
    series_id: "community-beta",
    rules: [{ type: "manual_grant", params: {} }]
  }
];

const acceptedAccessPayload = {
  success: true,
  data: {
    authenticated: true,
    userId: 42,
    email: "smoke@example.com",
    role: "player",
    superAdmin: false,
    allowlisted: true,
    noticeAccepted: true,
    noticeVersion: "beta_notice_2026_06_26_v1",
    canAccessProduct: true
  }
};

test.describe("Achievements pages", () => {
  test.beforeEach(async ({ page }) => {
    await mockAcceptedBetaAccess(page);
  });

  test("renders the user achievement collection and saves showcase selections", async ({ page }) => {
    const showcaseRequests: unknown[] = [];

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_userId_v1", "19");
      window.localStorage.setItem("2048_auth_nickname_v1", "Jay");
    });

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path === "/api/access/me") {
        await route.fulfill({ json: acceptedAccessPayload });
        return;
      }
      if (path === "/api/achievements") {
        await route.fulfill({ json: { success: true, data: achievementCatalog } });
        return;
      }
      if (path === "/api/user/me/achievements") {
        await route.fulfill({
          json: {
            success: true,
            data: [
              { achievement: achievementCatalog[0], earned_at: "2026-06-26T08:30:00.000Z", source: "ranked" },
              { achievement: achievementCatalog[1], earned_at: "2026-06-26T09:00:00.000Z", source: "event" }
            ]
          }
        });
        return;
      }
      if (path === "/api/user/me/achievement-showcase" && route.request().method() === "GET") {
        await route.fulfill({
          json: {
            success: true,
            data: [{ achievement: achievementCatalog[0], earned_at: "2026-06-26T08:30:00.000Z", source: "ranked" }]
          }
        });
        return;
      }
      if (path === "/api/user/me/achievement-showcase" && route.request().method() === "PUT") {
        showcaseRequests.push(route.request().postDataJSON());
        await route.fulfill({ json: { success: true } });
        return;
      }
      await route.fulfill({ status: 404, json: { success: false, error: "not_found" } });
    });

    const response = await page.goto("/medal-wall.html", { waitUntil: "domcontentloaded" });
    expect(response, "Achievements response should exist").not.toBeNull();
    expect(response?.ok(), "Achievements response should be 2xx").toBeTruthy();

    await expect(page.getByRole("heading", { name: "成就", exact: true })).toBeVisible();
    await expect(page.locator("#home-user-display")).toHaveCount(0);
    await expect(page.locator("#achievements-user-name")).toHaveText("Jay");
    await expect(page.locator("a#achievements-user-link")).toHaveCount(0);
    await expect(page.locator("#achievements-user-name")).not.toHaveAttribute("href", /.*/u);
    await expect(page.getByRole("heading", { name: "成就勋章墙" })).toBeVisible();
    await expect(page.locator("#achievements-status")).toHaveText("已加载");
    await expect(page.locator("#achievements-summary-copy")).toHaveText("已收集 2 / 5 个成就。");
    await expect(page.getByRole("button", { name: /首次 2048/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /活动冠军/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /第 200 次 2048/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /5 分钟内 2048/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /内测先锋/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /首次 2048/ }).locator(".achievement-badge svg")).toBeVisible();
    await expect(page.getByRole("button", { name: /5 分钟内 2048/ }).locator(".achievement-badge svg")).toBeVisible();
    await expect(page.locator("#achievements-list .achievement-card").first()).toContainText("已点亮");
    await expect(page.locator("#achievements-list .achievement-card").last()).toContainText("未点亮");

    await page.getByRole("button", { name: /首次 2048/ }).click();
    await expect(page.locator("#achievements-unlock-toast-host .unlock-toast--codepen-milestone")).toBeVisible();
    await expect(page.locator("#achievements-unlock-toast-host")).toContainText("Milestone Progress");

    await page.getByRole("button", { name: "里程碑" }).click();
    await expect(page.getByRole("button", { name: /首次 2048/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /第 200 次 2048/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /5 分钟内 2048/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /活动冠军/ })).toHaveCount(0);
    await page.getByRole("button", { name: "竞速" }).click();
    await expect(page.getByRole("button", { name: /5 分钟内 2048/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /首次 2048/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /活动冠军/ })).toHaveCount(0);
    await page.getByRole("button", { name: "活动" }).click();
    await expect(page.getByRole("button", { name: /活动冠军/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /内测先锋/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /5 分钟内 2048/ })).toHaveCount(0);
    await page.getByRole("button", { name: "全部" }).click();

    await page.getByRole("button", { name: "编辑展示" }).click();
    await page.getByRole("button", { name: /活动冠军/ }).click();
    await page.getByRole("button", { name: "保存展示" }).click();

    await expect(page.locator("#achievements-tip")).toHaveText("展示成就已保存。");
    expect(showcaseRequests).toEqual([{ achievement_ids: ["ach_first_2048", "ach_event_champion"] }]);
  });

  test("renders achievement names and static page copy in English", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("ui_language_v1", "en");
      window.localStorage.setItem("2048_auth_userId_v1", "19");
      window.localStorage.setItem("2048_auth_nickname_v1", "Jay");
    });

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path === "/api/access/me") {
        await route.fulfill({ json: acceptedAccessPayload });
        return;
      }
      if (path === "/api/achievements") {
        await route.fulfill({ json: { success: true, data: achievementCatalog } });
        return;
      }
      if (path === "/api/user/me/achievements") {
        await route.fulfill({
          json: {
            success: true,
            data: [
              { achievement: achievementCatalog[0], earned_at: "2026-06-26T08:30:00.000Z", source: "ranked" }
            ]
          }
        });
        return;
      }
      if (path === "/api/user/me/achievement-showcase") {
        await route.fulfill({
          json: {
            success: true,
            data: [{ achievement: achievementCatalog[0], earned_at: "2026-06-26T08:30:00.000Z", source: "ranked" }]
          }
        });
        return;
      }
      await route.fulfill({ status: 404, json: { success: false, error: "not_found" } });
    });

    const response = await page.goto("/medal-wall.html", { waitUntil: "domcontentloaded" });
    expect(response, "Achievements response should exist").not.toBeNull();
    expect(response?.ok(), "Achievements response should be 2xx").toBeTruthy();

    await expect(page).toHaveTitle("2048 Achievements");
    await expect(page.getByRole("heading", { name: "Achievements", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Medal Wall" })).toBeVisible();
    await expect(page.locator("#achievements-status")).toHaveText("Loaded");
    await expect(page.locator("#achievements-summary-copy")).toHaveText("Collected 1 / 5 achievements.");
    await expect(page.getByRole("button", { name: /First 2048/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Event Champion/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /200th 2048/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /2048 in 5 minutes/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Beta Pioneer/ })).toBeVisible();
    await expect(page.locator("#achievements-list .achievement-card").first()).toContainText("Unlocked");
    await expect(page.locator("#achievements-list .achievement-card").last()).toContainText("Locked");
  });

  test("keeps super-admin achievement management on the admin page", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke-admin-token");
    });

    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/access/me") {
        await route.fulfill({ json: acceptedAccessPayload });
        return;
      }
      if (path === "/api/admin/me") {
        await route.fulfill({ json: { success: true, admin: true, user: { id: 1, nickname: "Admin" } } });
        return;
      }
      if (path === "/api/admin/achievements") {
        await route.fulfill({ json: { success: true, data: achievementCatalog } });
        return;
      }
      await route.fulfill({ status: 404, json: { success: false, error: "not_found" } });
    });

    const response = await page.goto("/admin.html", { waitUntil: "domcontentloaded" });
    expect(response, "Admin response should exist").not.toBeNull();
    expect(response?.ok(), "Admin response should be 2xx").toBeTruthy();

    await expect(page).toHaveURL(/\/admin\.html$/u);
    await expect(page.getByRole("heading", { name: "成就管理" })).toBeVisible();
    await expect(page.locator("#admin-achievement-list")).toContainText("首次 2048");

    await page.getByRole("button", { name: /活动冠军/ }).click();
    await expect(page.locator("#admin-achievement-name")).toHaveValue("活动冠军");
    await expect(page.locator("#admin-achievement-grant-id")).toHaveValue("ach_event_champion");
  });
});
