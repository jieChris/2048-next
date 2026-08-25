import { expect, test } from "@playwright/test";

const tileValues = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
  65536,
];

function palette() {
  const pow2 = Array.from(
    { length: 26 },
    (_, index) => `#${String(index + 1).padStart(6, "0")}`,
  );
  return {
    id: "public",
    name: "public",
    baseSkin: "web",
    colors: Object.fromEntries(
      tileValues.map((value, index) => [String(value), pow2[index]]),
    ),
    pow2,
    fibonacci: pow2.slice(0, 16),
    pow2Text: Array.from({ length: 26 }, () => "#F9F6F2"),
    fibonacciText: Array.from({ length: 16 }, () => "#F9F6F2"),
    pow2Border: Array.from({ length: 26 }, () => "transparent"),
    fibonacciBorder: Array.from({ length: 16 }, () => "transparent"),
    pow2Glow: Array.from({ length: 26 }, () => "#00AAFF"),
    fibonacciGlow: Array.from({ length: 16 }, () => "#00AAFF"),
    glowIntensity: 50,
    glowMultipliers: Array.from({ length: 26 }, () => 100),
  };
}

const capabilities = {
  readEnabled: true,
  writeEnabled: false,
  autoPublishEnabled: false,
  paletteFormat3Enabled: true,
};

const item = {
  id: 7,
  version: {
    id: 12,
    revision: 2,
    title: "青瓷夜色",
    palette: palette(),
    publishedAt: "2026-08-25T00:00:00.000Z",
  },
  author: { nickname: "Jay", publicProfileId: 19 },
  stats: { likes: 8, dislikes: 2, references: 5 },
  viewer: { vote: 0, saved: false, owned: false },
};

test.describe("Theme Plaza", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("2048_auth_token_v1");
      window.localStorage.removeItem("2048_auth_userId_v1");
    });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/api/auth/refresh")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }
      if (url.pathname.endsWith("/api/theme-plaza/capabilities")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: capabilities }),
        });
        return;
      }
      if (url.pathname.endsWith("/api/theme-plaza/7")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: item, capabilities }),
        });
        return;
      }
      if (url.pathname.endsWith("/api/theme-plaza")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [item],
            nextCursor: null,
            capabilities,
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: null }),
      });
    });
  });

  test("renders the public list and keeps save disabled while cross-device compatibility is pending", async ({
    page,
  }) => {
    const response = await page.goto("/theme_plaza.html", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("#theme-plaza-page-title")).toHaveText(
      "主题广场",
    );
    await expect(page.locator(".theme-plaza-card-title")).toHaveText(
      "青瓷夜色",
    );
    await expect(page.locator(".theme-plaza-preview-tile")).toHaveCount(16);
    await expect(page.locator(".theme-plaza-save")).toHaveText("登录后保存");
    await expect(page.locator(".theme-plaza-stats")).toContainText("8赞");
    await expect(page.locator(".theme-plaza-stats")).toContainText("5引用");
  });

  test("renders a shareable detail URL and switches between rule families", async ({
    page,
  }) => {
    await page.goto("/theme_plaza.html?id=7", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator(".theme-plaza-detail-title")).toHaveText(
      "青瓷夜色",
    );
    await expect(page.locator(".theme-plaza-preview-tile")).toHaveCount(16);
    const fibonacci = page.getByRole("button", { name: "Fibonacci" });
    await fibonacci.click();
    await expect(fibonacci).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".theme-plaza-preview")).toHaveAttribute(
      "data-preview-family",
      "fibonacci",
    );
    await expect(page.locator(".theme-plaza-reference-note")).toContainText(
      "按账号去重",
    );
  });

  test("exercises save and vote code paths when server capabilities are explicitly enabled", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "2048_auth_token_v1",
        "theme-plaza-write-token",
      );
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
    });
    const accountDocument = {
      schema: 1,
      format: 3,
      activePaletteId: null,
      palettes: [],
    };
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "theme-plaza-write-token",
          user: { id: 42, nickname: "Writer" },
        }),
      });
    });
    await page.route("**/api/theme-plaza/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { ...capabilities, writeEnabled: true },
        }),
      });
    });
    await page.route("**/api/theme-plaza/7", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: item,
          capabilities: { ...capabilities, writeEnabled: true },
        }),
      });
    });
    await page.route("**/api/me/app-palettes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            document: accountDocument,
            revision: 3,
            updatedAt: null,
            supportedFormats: [2, 3],
          },
        }),
      });
    });
    await page.route("**/api/theme-plaza/versions/12/save", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            document: {
              ...accountDocument,
              palettes: [{ ...palette(), id: "saved-copy", name: "青瓷夜色" }],
            },
            revision: 4,
            updatedAt: null,
            supportedFormats: [2, 3],
            palette_id: "saved-copy",
            copy_created: true,
            first_reference: true,
            current_saved: true,
          },
          capabilities: { ...capabilities, writeEnabled: true },
        }),
      });
    });
    await page.route("**/api/theme-plaza/versions/12/vote", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            version_id: 12,
            vote: 1,
            stats: { likes: 9, dislikes: 2, references: 5 },
          },
          capabilities: { ...capabilities, writeEnabled: true },
        }),
      });
    });

    await page.goto("/theme_plaza.html?id=7", {
      waitUntil: "domcontentloaded",
    });
    const save = page.locator(".theme-plaza-save");
    await expect(save).toHaveText("一键保存");
    await save.click();
    await expect(save).toHaveText("已保存");
    await expect(page.locator("#theme-plaza-status")).toContainText(
      "当前使用色板没有改变",
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("tile_palette_active_v1"),
        ),
      )
      .toBe("follow-theme");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const profiles = JSON.parse(
            window.localStorage.getItem("tile_palette_profiles_v1") || "[]",
          );
          return profiles.some(
            (profile: { id?: string }) => profile.id === "saved-copy",
          );
        }),
      )
      .toBe(true);

    const like = page.getByRole("button", { name: "点赞" });
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
  });

  test("shows a safe maintenance state when public browsing is disabled", async ({
    page,
  }) => {
    await page.route("**/api/theme-plaza/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            ...capabilities,
            readEnabled: false,
            paletteFormat3Enabled: false,
          },
        }),
      });
    });
    await page.goto("/theme_plaza.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".theme-plaza-empty")).toContainText(
      "主题广场正在准备中",
    );
    await expect(page.locator(".theme-plaza-empty")).toContainText(
      "分享和保存功能会保持关闭",
    );
  });
});
