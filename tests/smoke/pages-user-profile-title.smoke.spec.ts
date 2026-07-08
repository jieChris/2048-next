import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("home page title stays 2048", async ({ page }) => {
    const response = await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page).toHaveTitle("2048");
  });

  test("own user profile title is 用户主页", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-own");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/9")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    expect(response, "User response should exist").not.toBeNull();
    expect(response?.ok(), "User response should be 2xx").toBeTruthy();
    await page.waitForFunction(() => document.title === "用户主页");
    await expect(page).toHaveTitle("用户主页");
  });

  test("user profile logout button clears current account and opens account center", async ({ page }) => {
    await page.addInitScript(() => {
      if (!window.location.pathname.endsWith("/user.html")) return;
      window.localStorage.setItem("2048_auth_token_v1", "test-token-logout");
      window.localStorage.setItem("2048_auth_userId_v1", "12");
      window.localStorage.setItem("2048_auth_nickname_v1", "Hui");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 12, nickname: "Hui", created_at: "2026-03-21 15:45:05" }
          })
        });
        return;
      }
      if (url.includes("/user/12/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] })
        });
        return;
      }
      if (url.includes("/user/12")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 12, nickname: "Hui", created_at: "2026-03-21 15:45:05" }
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    const response = await page.goto("/user.html?id=12&nickname=Hui", { waitUntil: "domcontentloaded" });
    expect(response, "User response should exist").not.toBeNull();
    expect(response?.ok(), "User response should be 2xx").toBeTruthy();

    await expect(page.locator("#user-nav-account")).toBeVisible();
    await expect(page.locator("#user-nav-logout")).toBeVisible();

    await page.click("#user-nav-logout");
    await page.waitForURL(/account\.html/);

    const authSnapshot = await page.evaluate(() => ({
      token: window.localStorage.getItem("2048_auth_token_v1"),
      userId: window.localStorage.getItem("2048_auth_userId_v1"),
      nickname: window.localStorage.getItem("2048_auth_nickname_v1")
    }));

    expect(authSnapshot).toEqual({
      token: null,
      userId: null,
      nickname: null
    });
  });

  test("user profile summary keeps intrinsic height beside taller record card", async ({ page }) => {
    await page.setViewportSize({ width: 1117, height: 837 });
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-info-card");
      window.localStorage.setItem("2048_auth_userId_v1", "12");
      window.localStorage.setItem("2048_auth_nickname_v1", "Hui");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me") || url.includes("/user/12")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 12, nickname: "Hui", created_at: "2026-03-21 15:45:05" }
          })
        });
        return;
      }
      if (url.includes("/user/12/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              { id: 1, mode: "classic", score: 5012, updated_at: "2026-06-01 10:19:29" }
            ]
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    const response = await page.goto("/user.html?id=12&nickname=Hui", { waitUntil: "domcontentloaded" });
    expect(response, "User response should exist").not.toBeNull();
    expect(response?.ok(), "User response should be 2xx").toBeTruthy();
    await expect(page.locator(".user-profile-inline-info")).toBeVisible();
    await expect(page.locator(".user-record-card")).toBeVisible();

    const heights = await page.evaluate(() => {
      const infoCard = document.querySelector(".user-profile-inline-info");
      const recordCard = document.querySelector(".user-record-card");
      return {
        info: infoCard ? infoCard.getBoundingClientRect().height : 0,
        record: recordCard ? recordCard.getBoundingClientRect().height : 0
      };
    });

    expect(heights.info).toBeLessThan(heights.record - 100);
  });

  test("other user profile title is 用户主页-<用户名>", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-other");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/7")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 7, nickname: "Alice", created_at: "2026-03-14 10:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=7&nickname=Alice", { waitUntil: "domcontentloaded" });
    expect(response, "User response should exist").not.toBeNull();
    expect(response?.ok(), "User response should be 2xx").toBeTruthy();
    await page.waitForFunction(() => document.title === "用户主页-Alice");
    await expect(page).toHaveTitle("用户主页-Alice");
  });

  test("other user profile uses 上传时间 label and yyyy-mm-dd hh:mm:ss format", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-other-date");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/7/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "rec-date-1",
                user_id: 7,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 512,
                best_tile: 64,
                duration_ms: 6000,
                ended_at: "2026-03-14T10:00:00.000Z",
                created_at: "2026-03-14 10:01:02"
              }
            ],
            page: 1,
            limit: 20,
            total: 41
          })
        });
        return;
      }
      if (url.includes("/user/7")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 7, nickname: "Alice", created_at: "2026-03-14 10:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=7&nickname=Alice", { waitUntil: "domcontentloaded" });
    expect(response, "User response should exist").not.toBeNull();
    expect(response?.ok(), "User response should be 2xx").toBeTruthy();
    await page.waitForSelector(".user-record-item");

    await expect(page.locator(".user-record-mode").first()).toHaveText("经典4x4");
    await expect(page.locator("#user-col-date")).toHaveText("上传时间");
    await expect(page.locator(".user-record-date").first()).toHaveText("2026-03-14 18:01:02");
    await expect(page.locator("#user-record-page")).toHaveText("第1/3页");
  });

  test("user profile supports mode filter and expandable record detail", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-details");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/9/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "rec-1",
                user_id: 9,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 2048,
                best_tile: 256,
                duration_ms: 12000,
                ended_at: "2026-03-15T08:00:00.000Z",
                created_at: "2026-03-15 08:00:00"
              }
            ]
          })
        });
        return;
      }
      if (url.includes("/records/rec-1/replay")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              replay_string: "replay_(!盲fC",
              final_board: [
                [2, 4, 8, 16],
                [32, 64, 128, 256],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
              ]
            }
          })
        });
        return;
      }
      if (url.includes("/user/9")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.waitForSelector(".user-record-item");
    await page.selectOption("#user-record-mode", "standard_no_undo");
    await page.locator(".user-record-row").first().click();

    await expect(page.locator(".user-record-detail")).toBeVisible();
    await expect(page.locator(".user-mini-game .grid-cell")).toHaveCount(16);
    await expect(page.locator(".user-replay-btn")).toBeVisible();
  });

  test("user profile can export a historical record replay file", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-export-replay");
      window.localStorage.setItem("2048_auth_userId_v1", "9");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/9/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "rec-export-1",
                user_id: 9,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 4096,
                best_tile: 512,
                duration_ms: 15000,
                ended_at: "2026-03-15T08:00:00.000Z",
                created_at: "2026-03-15 08:00:00"
              }
            ]
          })
        });
        return;
      }
      if (url.includes("/records/rec-export-1/replay")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            mode: "proxy",
            cloud_payload_version: 2,
            replay_file_version: 1,
            data: {
              cloud_payload_version: 2,
              replay_file_version: 1,
              id: "rec-export-1",
              replay_string: "replay_(!盲fC",
              final_board: [
                [2, 4, 8, 16],
                [32, 64, 128, 512],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
              ]
            }
          })
        });
        return;
      }
      if (url.includes("/user/9")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.waitForSelector(".user-record-item");
    await page.locator(".user-record-row").first().click();
    await expect(page.locator(".user-replay-export-btn")).toBeVisible();

    const replayBox = await page.locator(".user-replay-btn").boundingBox();
    const exportReplayBox = await page.locator(".user-replay-export-btn").boundingBox();
    expect(replayBox).not.toBeNull();
    expect(exportReplayBox).not.toBeNull();
    expect(Math.abs((replayBox?.width ?? 0) - (exportReplayBox?.width ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((replayBox?.height ?? 0) - (exportReplayBox?.height ?? 0))).toBeLessThanOrEqual(1);

    const downloadPromise = page.waitForEvent("download");
    await page.locator(".user-replay-export-btn").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^2048-record-rec-export-1-replay\.json$/);
  });

  test("user profile replay detail falls back to signed url when default replay load times out", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-signed-fallback");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/7/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "rec-signed-1",
                user_id: 7,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 1024,
                best_tile: 128,
                duration_ms: 9000,
                ended_at: "2026-03-16T08:00:00.000Z",
                created_at: "2026-03-16 08:00:00"
              }
            ]
          })
        });
        return;
      }
      if (url.includes("/records/rec-signed-1/replay?download=signed_url")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            mode: "signed_url",
            url: "https://2048next.cn/replay-envelope.json"
          })
        });
        return;
      }
      if (url.includes("/records/rec-signed-1/replay")) {
        await route.fulfill({
          status: 504,
          contentType: "application/json",
          body: JSON.stringify({ error: "timeout" })
        });
        return;
      }
      if (url.includes("/user/7")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 7, nickname: "Alice", created_at: "2026-03-14 10:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    await page.route("https://2048next.cn/replay-envelope.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          replay_string: "signed-replay-string",
          final_board: [
            [2, 4, 8, 16],
            [32, 64, 128, 256],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ]
        })
      });
    });

    const response = await page.goto("/user.html?id=7&nickname=Alice", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.waitForSelector(".user-record-item");
    await page.locator(".user-record-row").first().click();

    await expect(page.locator(".user-record-detail")).toBeVisible();
    await expect(page.locator(".user-mini-game .grid-cell")).toHaveCount(16);
    await expect(page.locator(".user-replay-btn")).toBeVisible();
  });

  test("user profile blocks replay when replay contract version mismatches", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-contract-mismatch");
      window.localStorage.setItem("2048_auth_userId_v1", "9");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/replay/version")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            cloud_payload_version: 2,
            replay_file_version: 99
          })
        });
        return;
      }
      if (url.includes("/user/9/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "rec-contract-1",
                user_id: 9,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 512,
                best_tile: 64,
                duration_ms: 7000,
                ended_at: "2026-03-15T08:00:00.000Z",
                created_at: "2026-03-15 08:00:00",
                replay_string: "replay_(!盲fC"
              }
            ]
          })
        });
        return;
      }
      if (url.includes("/user/9")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.waitForSelector(".user-record-item");
    await page.locator(".user-record-row").first().click();
    await page.locator(".user-replay-btn").click();

    await expect(page.locator("#user-record-tip")).toContainText("回放文件版本不匹配");
    await expect(page).toHaveURL(/\/user\.html\?/);
  });

  test("own profile still shows record management actions when ownership resolves slower than records", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-owner-race");
      window.localStorage.setItem("2048_auth_userId_v1", "9");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/9/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "rec-owner-race-1",
                user_id: 9,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 4096,
                best_tile: 512,
                duration_ms: 16000,
                ended_at: "2026-03-15T08:00:00.000Z",
                created_at: "2026-03-15 08:00:00",
                replay_string: "replay_(!盲fC"
              }
            ]
          })
        });
        return;
      }
      if (url.includes("/user/9")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.waitForSelector(".user-record-item");
    await page.locator(".user-record-row").first().click();
    await expect(page.locator(".user-record-action-btn")).toHaveCount(1);
  });

  test("own profile status filter requests deleted records and renders restore action", async ({ page }) => {
    const recordRequests: string[] = [];

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-deleted-records");
      window.localStorage.setItem("2048_auth_userId_v1", "9");
      window.localStorage.setItem("2048_auth_nickname_v1", "Owner");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/9/records")) {
        recordRequests.push(url);
        const status = new URL(url).searchParams.get("status") || "active";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: status === "deleted" ? [
              {
                id: "rec-deleted-1",
                user_id: 9,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 8192,
                best_tile: 1024,
                duration_ms: 18000,
                ended_at: "2026-03-15T08:00:00.000Z",
                created_at: "2026-03-15 08:00:00",
                deleted_at: "2026-03-16 08:00:00",
                replay_string: "replay_(!盲fC"
              }
            ] : []
          })
        });
        return;
      }
      if (url.includes("/user/9")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 9, nickname: "Owner", created_at: "2026-03-15 08:00:00" }
          })
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.waitForSelector("#user-record-visibility");
    await page.selectOption("#user-record-visibility", "deleted");
    await page.waitForSelector(".user-record-item.is-deleted");
    await page.locator(".user-record-row").first().click();

    await expect(page.locator(".user-record-score").first()).toHaveText("8192");
    await expect(page.locator(".user-record-action-btn")).toHaveText("恢复记录");
    expect(recordRequests.some((url) => new URL(url).searchParams.get("status") === "deleted")).toBeTruthy();

    await page.selectOption("#user-record-visibility", "all");
    await expect.poll(() => recordRequests.some((url) => new URL(url).searchParams.get("status") === "all")).toBeTruthy();
  });
});
