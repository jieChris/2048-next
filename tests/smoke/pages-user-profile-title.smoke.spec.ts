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

  test("current user profile resolves from the authenticated session without query parameters", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-session-only");
      window.localStorage.removeItem("2048_auth_userId_v1");
      window.localStorage.removeItem("2048_auth_nickname_v1");
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/user/me") || url.endsWith("/api/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 27, nickname: "SessionOwner", created_at: "2026-07-11 08:00:00" }
          })
        });
        return;
      }
      if (url.includes("/user/27/records")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], page: 1, limit: 20, total: 0 })
        });
        return;
      }
      if (url.includes("/user/27/stats")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { summary: { total_records: 0 }, by_mode: [] } })
        });
        return;
      }
      if (url.includes("/user/27")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: 27, nickname: "SessionOwner", created_at: "2026-07-11 08:00:00" }
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

    const response = await page.goto("/user.html", { waitUntil: "domcontentloaded" });
    expect(response, "User response should exist").not.toBeNull();
    expect(response?.ok(), "User response should be 2xx").toBeTruthy();

    await expect(page.locator("#user-value-name")).toHaveText("SessionOwner");
    await expect(page).toHaveTitle("用户主页");
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("2048_auth_userId_v1")))
      .toBe("27");
  });

  test("user profile logout button clears current account and opens leaderboard", async ({ page }) => {
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

    await expect(page.locator("#user-nav-account")).toHaveText("排行榜");
    await expect(page.locator("#user-nav-menu")).toBeVisible();

    await page.click("#user-nav-menu");
    await expect(page.locator("#user-nav-logout")).toBeVisible();
    await page.click("#user-record-heading");
    await expect(page.locator("#user-nav-logout")).toBeHidden();

    await page.click("#user-nav-menu");
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

    const recordRequests: string[] = [];
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
        recordRequests.push(url);
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
                board_sum: 126,
                best_tile: 64,
                duration_ms: 6000,
                ended_at: "2026-03-14T10:00:00.000Z",
                created_at: "2026-03-14 10:01:02"
              },
              {
                id: "rec-date-2",
                user_id: 7,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 1024,
                board_sum: 126,
                best_tile: 64,
                duration_ms: 7000,
                ended_at: "2026-03-13T10:00:00.000Z",
                created_at: "2026-03-13 10:01:02"
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

    await expect(page.locator('link[href^="style/user_profile_page.css"]')).toHaveAttribute(
      "href",
      "style/user_profile_page.css?v=20260723-history-fixes-v11"
    );

    await expect(page.locator(".user-record-mode").first()).toHaveText("4x4（不可撤回）");
    await expect(page.locator("#user-col-board-sum")).toHaveText("盘面和");
    await expect(page.locator(".user-record-board-sum").first()).toHaveText("126");
    await expect(page.locator("#user-col-best-tile")).toHaveText("最大方块");
    await expect(page.locator(".user-record-best-tile").first()).toHaveText("64");
    await expect(page.locator("#user-col-duration")).toHaveText("用时");
    await expect(page.locator(".user-record-duration").first()).toHaveText("00:00:06");
    await expect(page.locator("#user-col-date")).toHaveText("上传时间");
    await expect(page.locator(".user-record-date").first()).toHaveText("2026-03-14 18:01:02");
    const recordColumnLayout = await page.locator(
      ".user-record-mode, .user-record-score, .user-record-board-sum, .user-record-best-tile, .user-record-duration, .user-record-date"
    ).evaluateAll((nodes) => nodes.slice(0, 6).map((node) => ({
      align: getComputedStyle(node).textAlign,
      width: node.getBoundingClientRect().width
    })));
    expect(recordColumnLayout.map((column) => column.align)).toEqual(["left", ...Array(4).fill("center"), "right"]);
    await expect(page.locator("#user-col-mode")).toHaveCSS("text-align", "left");
    await expect(page.locator("#user-col-mode")).toHaveCSS("padding-left", "10px");
    await expect(page.locator("#user-col-date")).toHaveCSS("text-align", "right");
    await expect(page.locator("#user-col-date")).toHaveCSS("padding-right", "10px");
    expect(recordColumnLayout[0].width / recordColumnLayout[1].width).toBeCloseTo(1.35, 1);
    expect(recordColumnLayout.slice(2).every((column) => Math.abs(column.width - recordColumnLayout[1].width) < 1)).toBe(true);
    await expect(page.locator("#user-record-page")).toHaveText("第1/3页");
    const labelSizes = await page.locator("#user-undo-label, #user-mode-label, #user-sort-label, #user-order-label")
      .evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return [rect.width, rect.height];
      }));
    expect(labelSizes).toEqual([[1, 1], [1, 1], [1, 1], [1, 1]]);
    const controlWidths = await page.locator("#user-record-undo, #user-record-mode, #user-record-sort, #user-record-order")
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
    expect(controlWidths).toEqual([160, 320, 180, 160]);
    const sortOptions = await page.locator("#user-record-sort option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
    expect(sortOptions).toEqual(["time", "score", "board_sum"]);

    const orderOptions = await page.locator("#user-record-order option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
    expect(orderOptions).toEqual(["desc", "asc"]);

    await page.selectOption("#user-record-sort", "board_sum");
    await expect(page.locator(".user-record-score").first()).toHaveText("1024");
    await page.selectOption("#user-record-order", "asc");
    await expect.poll(() =>
      recordRequests.some((url) => url.includes("sort_by=board_sum") && url.includes("order=asc"))
    ).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileWidth = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      listMaxHeight: getComputedStyle(document.querySelector(".user-record-list")!).maxHeight,
      listOverflowY: getComputedStyle(document.querySelector(".user-record-list")!).overflowY
    }));
    expect(mobileWidth.scroll).toBeLessThanOrEqual(mobileWidth.client);
    expect(mobileWidth.listMaxHeight).toBe("none");
    expect(mobileWidth.listOverflowY).toBe("visible");
  });

  test("user profile supports mode filter and expandable record detail", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-details");
    });

    const recordRequests: string[] = [];
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
      if (url.includes("/user/9/stats")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              summary: {
                total_records: 6,
                best_score: 8192,
                best_tile: 2048,
                latest_record_at: "2026-03-18T08:00:00.000Z"
              },
              by_mode: [
                {
                  mode_bucket: "standard_no_undo",
                  mode_key: "standard_4x4_pow2_no_undo",
                  record_count: 3,
                  best_score: 8192,
                  best_tile: 2048,
                  latest_record_at: "2026-03-17T08:00:00.000Z"
                },
                {
                  mode_bucket: "fib_4x2_undo",
                  mode_key: "fib_4x2_undo",
                  record_count: 3,
                  best_score: 3777,
                  best_tile: 987,
                  latest_record_at: "2026-03-18T08:00:00.000Z"
                }
              ]
            }
          })
        });
        return;
      }
      if (url.includes("/user/9/records")) {
        recordRequests.push(url);
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
    await expect(page.locator("#user-summary-total-label")).toHaveText("记录数");
    await expect(page.locator("#user-summary-total-value")).toHaveText("3");
    await expect(page.locator("#user-summary-best-score-label")).toHaveText("最高分");
    await expect(page.locator("#user-summary-best-score-value")).toHaveText("8192");
    await expect(page.locator("#user-summary-best-tile-label")).toHaveText("最大方块");
    await expect(page.locator("#user-summary-best-tile-value")).toHaveText("2048");

    await expect(page.locator("#user-record-undo")).toHaveValue("no_undo");
    const undoOptionValues = await page.locator("#user-record-undo option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
    expect(undoOptionValues).toEqual(["no_undo", "undo"]);
    const modeOptionValues = await page.locator("#user-record-mode option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
    expect(modeOptionValues).toContain("pow2_5x5");
    expect(modeOptionValues).toContain("capped_4096");
    expect(modeOptionValues).toContain("fib_4x2");
    expect(modeOptionValues).not.toContain("pow2_5x5_undo");
    expect(modeOptionValues).not.toContain("fib_4x2_undo");

    await page.selectOption("#user-record-undo", "undo");
    const undoModeOptionValues = await page.locator("#user-record-mode option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
    expect(undoModeOptionValues).toContain("pow2_5x5_undo");
    expect(undoModeOptionValues).toContain("fib_4x2_undo");
    expect(undoModeOptionValues).not.toContain("pow2_5x5");
    expect(undoModeOptionValues).not.toContain("capped_4096");

    await page.selectOption("#user-record-mode", "fib_4x2_undo");
    await expect.poll(() => recordRequests.some((url) => url.includes("mode=fib_4x2_undo"))).toBe(true);
    await expect(page.locator("#user-summary-total-label")).toHaveText("记录数");
    await expect(page.locator("#user-summary-total-value")).toHaveText("3");
    await expect(page.locator("#user-summary-best-score-label")).toHaveText("最高分");
    await expect(page.locator("#user-summary-best-score-value")).toHaveText("3777");
    await expect(page.locator("#user-summary-best-tile-label")).toHaveText("最大方块");
    await expect(page.locator("#user-summary-best-tile-value")).toHaveText("987");

    const requestsBeforeNoUndo = recordRequests.length;
    await page.selectOption("#user-record-undo", "no_undo");
    await expect(page.locator("#user-record-mode")).toHaveValue("standard_no_undo");
    await expect.poll(() => recordRequests.length).toBeGreaterThan(requestsBeforeNoUndo);
    await expect(page.locator(".user-record-item")).toHaveCount(1);

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

  test("own profile deletes a record without reloading the records list", async ({ page }) => {
    const recordRequests: string[] = [];
    let deleteRequests = 0;

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-delete-record");
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
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "rec-delete-1",
                user_id: 9,
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 2048,
                best_tile: 256,
                duration_ms: 12000,
                ended_at: "2026-03-15T08:00:00.000Z",
                created_at: "2026-03-15 08:00:00",
                replay_string: "replay_(!盲fC"
              }
            ]
          })
        });
        return;
      }
      if (url.includes("/records/rec-delete-1") && route.request().method() === "DELETE") {
        deleteRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true })
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

    await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".user-record-item");
    await expect.poll(() => recordRequests.length).toBeGreaterThanOrEqual(1);
    const recordsBeforeDelete = recordRequests.length;

    await page.locator(".user-record-row").first().click();
    await page.locator(".user-danger-btn").click();
    await expect(page.locator("#game-dialog-overlay.is-open")).toBeVisible();
    await page.locator("#game-dialog-confirm").click();
    await expect(page.locator("#game-dialog-overlay.is-open")).toBeHidden();

    await expect.poll(() => deleteRequests).toBe(1);
    await expect(page.locator(".user-record-item")).toHaveCount(0);
    await expect(page.locator(".user-record-empty")).toBeVisible();
    expect(recordRequests).toHaveLength(recordsBeforeDelete);
  });

  test("own profile status filter requests deleted records and renders restore action", async ({ page }) => {
    const recordRequests: string[] = [];
    let replayRequests = 0;
    let restoreRequests = 0;

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
            data: status === "deleted" || status === "all" ? [
              {
                id: "rec-deleted-1",
                user_id: 9,
                record_era: "beta",
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 8192,
                best_tile: 1024,
                duration_ms: 18000,
                ended_at: "2026-03-15T08:00:00.000Z",
                created_at: "2026-03-15 08:00:00",
                deleted_at: "2026-03-16 08:00:00"
              }
            ] : []
          })
        });
        return;
      }
      if (url.includes("/records/rec-deleted-1/replay")) {
        replayRequests += 1;
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: "record not found" })
        });
        return;
      }
      if (url.includes("/records/rec-deleted-1/restore") && route.request().method() === "POST") {
        restoreRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true })
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
    await expect(page.locator(".user-record-era-badge")).toHaveCount(2);
    await expect(page.locator(".user-record-detail-error")).toHaveText("已删除记录需恢复后才能查看回放");
    await expect(page.locator(".user-record-action-btn")).toHaveText("恢复记录");
    expect(replayRequests).toBe(0);
    expect(recordRequests.some((url) => new URL(url).searchParams.get("status") === "deleted")).toBeTruthy();

    const allRecordsResponse = page.waitForResponse((response) => {
      const url = response.url();
      return url.includes("/user/9/records") && new URL(url).searchParams.get("status") === "all";
    });
    await page.selectOption("#user-record-visibility", "all");
    await allRecordsResponse;
    await expect.poll(() => recordRequests.some((url) => new URL(url).searchParams.get("status") === "all")).toBeTruthy();
    await expect(page.locator(".user-record-item.is-deleted")).toHaveCount(1);
    await page.locator(".user-record-row").click();
    await expect(page.locator(".user-record-action-btn")).toHaveText("恢复记录");
    await page.locator(".user-record-action-btn").click();
    await expect.poll(() => restoreRequests).toBe(1);
    await expect(page.locator(".user-record-item.is-deleted")).toHaveCount(0);
    await expect(page.locator(".user-record-item")).toHaveCount(1);
    await expect(page.locator(".user-record-action-btn")).toHaveCount(0);
  });

  test("user profile distinguishes beta records without mixing them into official rating summary", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "test-token-record-era");
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
      if (url.includes("/user/9/stats")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              summary: {
                record_era: "official_v1",
                total_records: 1,
                best_score: 4096,
                best_tile: 512,
                latest_record_at: "2026-07-20T00:00:00.000Z"
              },
              by_mode: [
                {
                  record_era: "beta",
                  mode_bucket: "standard_no_undo",
                  mode_key: "standard_4x4_pow2_no_undo",
                  record_count: 99,
                  best_score: 8192,
                  best_tile: 1024,
                  latest_record_at: "2026-07-21T00:00:00.000Z"
                },
                {
                  record_era: "official_v1",
                  mode_bucket: "standard_no_undo",
                  mode_key: "standard_4x4_pow2_no_undo",
                  record_count: 1,
                  best_score: 4096,
                  best_tile: 512,
                  latest_record_at: "2026-07-20T00:00:00.000Z"
                }
              ],
              rating: { value: null, status: "insufficient_data" }
            }
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
                id: "rec-beta-1",
                user_id: 9,
                record_era: "beta",
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 8192,
                best_tile: 1024,
                duration_ms: 18000,
                ended_at: "2026-07-21T00:00:00.000Z",
                created_at: "2026-07-21 00:00:00",
                replay_string: "replay_beta",
                final_board: [[2, 4, 8, 16], [32, 64, 128, 1024], [0, 0, 0, 0], [0, 0, 0, 0]]
              },
              {
                id: "rec-official-1",
                user_id: 9,
                record_era: "official_v1",
                mode_bucket: "standard_no_undo",
                mode_key: "standard_4x4_pow2_no_undo",
                score: 4096,
                best_tile: 512,
                duration_ms: 15000,
                ended_at: "2026-07-20T00:00:00.000Z",
                created_at: "2026-07-20 00:00:00",
                replay_string: "replay_official",
                final_board: [[2, 4, 8, 16], [32, 64, 128, 512], [0, 0, 0, 0], [0, 0, 0, 0]]
              }
            ],
            page: 1,
            limit: 20,
            total: 2
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} })
      });
    });

    const response = await page.goto("/user.html?id=9&nickname=Owner", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator(".user-record-item")).toHaveCount(2);
    await expect(page.locator(".user-record-era-badge")).toHaveCount(1);
    await expect(page.locator(".user-record-era-badge")).toHaveText("内测成绩");
    await expect(page.locator("#user-summary-preview")).toHaveText("数据积累中，暂无 Rating");
    await expect(page.locator("#user-summary-total-value")).toHaveText("1");
    await expect(page.locator("#user-summary-best-score-value")).toHaveText("4096");
    await expect(page.locator("#user-summary-last-active-value")).toHaveText("2026-07-20 08:00:00");

    const betaRecord = page.locator(".user-record-item").first();
    await betaRecord.locator(".user-record-row").click();
    await expect(betaRecord.locator(".user-record-detail .user-record-era-badge")).toHaveText("内测成绩");
    await expect(betaRecord.locator(".user-replay-btn")).toBeVisible();
    await expect(betaRecord.locator(".user-replay-export-btn")).toBeVisible();
    await expect(betaRecord.locator(".user-record-action-btn")).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await betaRecord.locator(".user-replay-export-btn").click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const exportedReplay = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    expect(exportedReplay.record_era).toBe("beta");

    const officialRecord = page.locator(".user-record-item").nth(1);
    await officialRecord.locator(".user-record-row").click();
    await expect(officialRecord.locator(".user-record-detail")).toBeVisible();
    await expect(officialRecord.locator(".user-record-era-badge")).toHaveCount(0);
    await expect(officialRecord.locator(".user-record-action-btn")).toHaveCount(1);
  });
});
