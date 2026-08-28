import { expect, test, type Page, type Route } from "@playwright/test";

const VALUES = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
  65536,
];

function palette(id = "p-cloud", name = "离线色板") {
  const pow2 = Array.from(
    { length: 26 },
    (_, index) => `#${String(index + 1).padStart(6, "0")}`,
  );
  return {
    id,
    name,
    baseSkin: "web",
    colors: Object.fromEntries(
      VALUES.map((value, index) => [String(value), pow2[index]]),
    ),
    pow2,
    fibonacci: pow2.slice(0, 16),
    pow2Text: Array.from({ length: 26 }, () => "#F9F6F2"),
    fibonacciText: Array.from({ length: 16 }, () => "#F9F6F2"),
    pow2Border: Array.from({ length: 26 }, () => "transparent"),
    fibonacciBorder: Array.from({ length: 16 }, () => "transparent"),
    pow2Glow: Array.from({ length: 26 }, () => "transparent"),
    fibonacciGlow: Array.from({ length: 16 }, () => "transparent"),
    glowIntensity: 50,
    glowMultipliers: Array.from({ length: 26 }, () => 100),
  };
}

function record(profile: ReturnType<typeof palette>, revision: number) {
  return {
    paletteId: profile.id,
    revision,
    palette: profile,
    contentHash: "a".repeat(64),
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
  };
}

async function readOutbox(page: Page, accountId: number) {
  return page.evaluate(async (targetAccountId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("account_palette_outbox_v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("operations", "readonly");
    const rows = await new Promise<any[]>((resolve, reject) => {
      const request = transaction
        .objectStore("operations")
        .index("accountId")
        .getAll(targetAccountId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return rows;
  }, accountId);
}

function installRoutes(
  page: Page,
  state: {
    accountId: number;
    online: boolean;
    cloudPalette: ReturnType<typeof palette>;
    revision: number;
    writes: Array<Record<string, unknown>>;
  },
) {
  return page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/api/auth/refresh")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: `palette-token-${state.accountId}`,
          user: {
            id: state.accountId,
            public_profile_id: state.accountId,
            nickname: `Palette${state.accountId}`,
          },
        }),
      });
      return;
    }
    if (path.endsWith("/api/me/palette-sync/bootstrap")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            selection: {
              selection: { kind: "custom", paletteId: state.cloudPalette.id },
              revision: 2,
              updatedAt: null,
            },
            selectedPalette: record(state.cloudPalette, state.revision),
            capabilities: {
              readEnabled: true,
              writeEnabled: true,
              legacyPutEnabled: false,
              maxActivePalettes: 10,
              contractVersion: "account-palette-sync-v2.1",
            },
          },
        }),
      });
      return;
    }
    if (path.endsWith("/api/me/palettes") && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            palettes: [record(state.cloudPalette, state.revision)],
            order: {
              paletteIds: [state.cloudPalette.id],
              revision: 1,
              updatedAt: null,
            },
            selection: {
              selection: { kind: "custom", paletteId: state.cloudPalette.id },
              revision: 2,
              updatedAt: null,
            },
            tombstones: [],
            changes: [],
            nextCursor: String(state.revision),
            hasMore: false,
            resetRequired: false,
            capabilities: {
              readEnabled: true,
              writeEnabled: true,
              legacyPutEnabled: false,
              maxActivePalettes: 10,
              contractVersion: "account-palette-sync-v2.1",
            },
          },
        }),
      });
      return;
    }
    if (
      path.endsWith(`/api/me/palettes/${state.cloudPalette.id}`) &&
      request.method() === "PUT"
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      state.writes.push(body);
      if (!state.online) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            code: "PALETTE_WRITE_TEMPORARY_UNAVAILABLE",
            error: "offline",
          }),
        });
        return;
      }
      state.cloudPalette = body.palette as ReturnType<typeof palette>;
      state.revision += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            status: "merged",
            operationId: body.operationId,
            palette: record(state.cloudPalette, state.revision),
            paletteId: state.cloudPalette.id,
            reason: null,
            existingPaletteId: null,
            conflictCopyId: null,
          },
        }),
      });
      return;
    }
    if (
      path.endsWith("/api/me/palette-selection") &&
      request.method() === "PUT"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            selection: { kind: "custom", paletteId: state.cloudPalette.id },
            revision: 3,
            updatedAt: null,
          },
        }),
      });
      return;
    }
    if (path.endsWith("/api/me/palette-order") && request.method() === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            paletteIds: [state.cloudPalette.id],
            revision: 2,
            updatedAt: null,
          },
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
}

test.describe("Account palette draft outbox", () => {
  test("offline save survives reload and replays the frozen operation", async ({
    page,
  }) => {
    const state = {
      accountId: 42,
      online: false,
      cloudPalette: palette(),
      revision: 3,
      writes: [] as Array<Record<string, unknown>>,
    };
    await page.addInitScript(() => {
      localStorage.setItem("2048_auth_token_v1", "palette-token-42");
      localStorage.setItem("2048_auth_userId_v1", "42");
      localStorage.setItem("theme_profile_v1", "classic");
      localStorage.removeItem("tile_palette_profiles_v1");
      localStorage.removeItem("tile_palette_active_v1");
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("account_palette_session_v2:"))
          localStorage.removeItem(key);
      }
    });
    await installRoutes(page, state);
    await page.goto("/palette.html#appearance-settings", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.locator('.palette-item[data-palette-id="p-cloud"]'),
    ).toBeVisible();
    await page.locator('.color-target[data-index="0"]').click();
    await page.locator("#palette-picker-r").fill("18");
    await page.locator("#palette-picker-g").fill("52");
    await page.locator("#palette-picker-b").fill("86");
    expect(state.writes).toHaveLength(0);

    await page.locator("#palette-save-btn").click();
    await expect(page.locator("#palette-sync-status")).toContainText(
      "等待同步",
    );
    const queued = await readOutbox(page, 42);
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      accountId: 42,
      paletteId: "p-cloud",
      status: "retry_wait",
      requestHash: expect.any(String),
    });
    const frozenOperationId = queued[0].operationId;
    const frozenHash = queued[0].requestHash;

    state.online = true;
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => (await readOutbox(page, 42))[0]?.status)
      .toBe("merged");
    const replayed = await readOutbox(page, 42);
    expect(replayed[0]).toMatchObject({
      operationId: frozenOperationId,
      requestHash: frozenHash,
      status: "merged",
    });
    expect(state.writes.at(-1)).toMatchObject({
      operationId: frozenOperationId,
    });
    expect(
      (state.writes.at(-1)?.palette as { pow2?: string[] })?.pow2?.[0],
    ).toBe("#123456");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const manager = (window as any).ThemeManager;
          return manager
            .getTilePalettes()
            .find((item: any) => item.id === "p-cloud")?.pow2?.[0];
        }),
      )
      .toBe("#123456");
  });

  test("switching accounts pauses the old account queue without migrating it", async ({
    page,
  }) => {
    const state = {
      accountId: 42,
      online: false,
      cloudPalette: palette(),
      revision: 3,
      writes: [] as Array<Record<string, unknown>>,
    };
    await page.addInitScript(() => {
      localStorage.setItem("2048_auth_token_v1", "palette-token-42");
      localStorage.setItem("2048_auth_userId_v1", "42");
      localStorage.removeItem("tile_palette_profiles_v1");
      localStorage.removeItem("tile_palette_active_v1");
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("account_palette_session_v2:"))
          localStorage.removeItem(key);
      }
    });
    await installRoutes(page, state);
    await page.goto("/palette.html#appearance-settings", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#palette-name-input").fill("账号 42 草稿");
    await page.locator("#palette-rename-btn").click();
    await page.locator("#palette-save-btn").click();
    await expect(page.locator("#palette-sync-status")).toContainText(
      "等待同步",
    );

    state.accountId = 7;
    await page.evaluate(() => {
      localStorage.setItem("2048_auth_token_v1", "palette-token-7");
      localStorage.setItem("2048_auth_userId_v1", "7");
      window.dispatchEvent(new Event("auth-session-change"));
    });

    await expect
      .poll(async () => (await readOutbox(page, 42))[0]?.status)
      .toBe("paused_account");
    expect(await readOutbox(page, 7)).toHaveLength(0);
    const oldQueue = await readOutbox(page, 42);
    expect(oldQueue[0]).toMatchObject({
      accountId: 42,
      paletteId: "p-cloud",
      pauseReason: "account_switch",
    });
  });

  test("using an existing duplicate clears the earlier terminal action after reload", async ({
    page,
  }) => {
    let libraryReads = 0;
    const existingProfile = palette("existing-palette", "Existing palette");
    await page.addInitScript(() => {
      localStorage.setItem("2048_auth_token_v1", "palette-token-42");
      localStorage.setItem("2048_auth_userId_v1", "42");
      localStorage.removeItem("tile_palette_profiles_v1");
      localStorage.setItem("ui_language_v1", "zh");
    });
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/api/auth/refresh")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            token: "palette-token-42",
            user: {
              id: 42,
              public_profile_id: 42,
              nickname: "Palette42",
            },
          }),
        });
        return;
      }
      if (path.endsWith("/api/me/palette-sync/bootstrap")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              selection: {
                selection: { kind: "pending", paletteId: null },
                revision: 0,
                updatedAt: null,
              },
              selectedPalette: null,
            },
          }),
        });
        return;
      }
      if (path.endsWith("/api/me/palettes") && request.method() === "GET") {
        libraryReads += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              palettes: [record(existingProfile, 2)],
              order: {
                paletteIds: [existingProfile.id],
                revision: 1,
                updatedAt: null,
              },
              selection: {
                selection: { kind: "pending", paletteId: null },
                revision: 0,
                updatedAt: null,
              },
              tombstones: [],
              changes: [],
              nextCursor: "0",
              hasMore: false,
              resetRequired: false,
            },
          }),
        });
        return;
      }
      if (path.endsWith("/api/me/palettes") && request.method() === "POST") {
        const body = request.postDataJSON() as Record<string, unknown>;
        const requested = body.palette as ReturnType<typeof palette>;
        if (body.allowDuplicate !== true) {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                status: "duplicate_existing",
                operationId: body.operationId,
                paletteId: body.paletteId,
                palette: null,
                reason: "duplicate_content",
                existingPaletteId: "existing-palette",
                conflictCopyId: null,
              },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              status: "saved",
              operationId: body.operationId,
              paletteId: body.paletteId,
              palette: record(requested, 1),
              reason: null,
              existingPaletteId: null,
              conflictCopyId: null,
            },
          }),
        });
        return;
      }
      if (
        (path.endsWith("/api/me/palette-selection") ||
          path.endsWith("/api/me/palette-order")) &&
        request.method() === "PUT"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { revision: 1 } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    await page.goto("/palette.html#appearance-settings", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#palette-create-btn").click();
    await page.locator("#palette-save-btn").click();
    await expect(page.locator("#game-dialog-message")).toContainText(
      "保留为独立色板",
    );
    await page.locator("#game-dialog-cancel").click();
    await expect(page.locator("#game-dialog-message")).toContainText(
      "放弃当前重复身份",
    );
    await page.locator("#game-dialog-confirm").click();
    await expect(page.locator("#palette-sync-status")).toContainText(
      "改用已有色板",
    );
    await expect(
      page.locator(
        '.palette-item.is-active[data-palette-id="existing-palette"]',
      ),
    ).toBeVisible();
    const duplicateRows = await readOutbox(page, 42);
    expect(
      duplicateRows.map((item) => ({
        kind: item.kind,
        status: item.status,
        lastError: item.lastError,
      })),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "duplicate_existing" }),
        expect.objectContaining({ status: "saved" }),
      ]),
    );
    expect(libraryReads).toBe(1);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => libraryReads).toBe(2);
  });

  test("guest leave guard supports cancel and save-and-continue", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("palette_guest_leave_test_ready") === "1")
        return;
      localStorage.removeItem("2048_auth_token_v1");
      localStorage.removeItem("2048_auth_userId_v1");
      localStorage.removeItem("tile_palette_profiles_v1");
      localStorage.setItem("ui_language_v1", "zh");
      sessionStorage.setItem("palette_guest_leave_test_ready", "1");
    });
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          code: "UNAUTHORIZED",
          error: "guest",
        }),
      });
    });
    await page.goto("/palette.html#appearance-settings", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#palette-create-btn").click();

    await page.locator(".page-back-button").click();
    await expect(page.locator("#game-dialog-message")).toContainText(
      "离开前保存",
    );
    await page.locator("#game-dialog-cancel").click();
    await expect(page.locator("#game-dialog-message")).toContainText(
      "放弃当前色板草稿",
    );
    await page.locator("#game-dialog-cancel").click();
    await expect(page).toHaveURL(/palette\.html/u);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).ThemeManager.getTilePaletteDraftState().dirty,
        ),
      )
      .toBe(true);

    await page.evaluate(() => {
      const browserWindow = window as any;
      browserWindow.__paletteLeaveResult = null;
      void browserWindow
        .AccountPalettePageLeaveHandler()
        .then((allowed: boolean) => {
          browserWindow.__paletteLeaveResult = allowed;
        });
    });
    await expect(page.locator("#game-dialog-message")).toContainText(
      "离开前保存",
    );
    await page.locator("#game-dialog-confirm").click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__paletteLeaveResult))
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("tile_palette_profiles_v1") || "[]")
              .length,
        ),
      )
      .toBe(1);
    await page.locator(".page-back-button").click();
    await expect(page).toHaveURL(/\/2048\.html$/u);
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("tile_palette_profiles_v1") || "[]"),
      ),
    ).toHaveLength(1);
  });

  test("guest leave guard discards only after explicit confirmation", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("palette_guest_leave_test_ready") === "1")
        return;
      localStorage.removeItem("2048_auth_token_v1");
      localStorage.removeItem("2048_auth_userId_v1");
      localStorage.removeItem("tile_palette_profiles_v1");
      localStorage.setItem("ui_language_v1", "zh");
      sessionStorage.setItem("palette_guest_leave_test_ready", "1");
    });
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          code: "UNAUTHORIZED",
          error: "guest",
        }),
      });
    });
    await page.goto("/palette.html#appearance-settings", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#palette-create-btn").click();

    await page.locator(".page-back-button").click();
    await page.locator("#game-dialog-cancel").click();
    await page.locator("#game-dialog-confirm").click();
    await expect(page).toHaveURL(/\/2048\.html$/u);
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("tile_palette_profiles_v1") || "[]"),
      ),
    ).toEqual([]);
  });
  test("local persistence failure keeps the dirty draft on the page", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("palette_guest_failure_test_ready") === "1")
        return;
      localStorage.removeItem("2048_auth_token_v1");
      localStorage.removeItem("2048_auth_userId_v1");
      localStorage.removeItem("tile_palette_profiles_v1");
      localStorage.setItem("ui_language_v1", "zh");
      sessionStorage.setItem("palette_guest_failure_test_ready", "1");
    });
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          code: "UNAUTHORIZED",
          error: "guest",
        }),
      });
    });
    await page.goto("/palette.html#appearance-settings", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#palette-create-btn").click();
    expect(
      await page.evaluate(() => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    ).toBe(true);
    await page.evaluate(() => {
      const storage = Object.getPrototypeOf(window.localStorage);
      (window as any).__paletteLeaveSetItem = storage.setItem;
      storage.setItem = () => {
        throw new Error("storage full");
      };
    });

    await page.locator(".page-back-button").click();
    await page.locator("#game-dialog-confirm").click();
    await expect(page).toHaveURL(/palette\.html/u);
    await expect(page.locator("#palette-sync-status")).toContainText(
      "本地保存失败",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).ThemeManager.getTilePaletteDraftState().dirty,
        ),
      )
      .toBe(true);
    await page.evaluate(() => {
      Object.getPrototypeOf(window.localStorage).setItem = (
        window as any
      ).__paletteLeaveSetItem;
    });
  });
});
