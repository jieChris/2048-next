import { expect, test, type Page, type Route } from "@playwright/test";

const VALUES = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384,
  32768, 65536,
];

function palette(id: string, name: string) {
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
    createdAt: null,
    updatedAt: null,
  };
}

async function putOutboxOperation(
  page: Page,
  operation: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(async (value) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("account_palette_outbox_v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("operations", "readwrite");
    transaction.objectStore("operations").put(value);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
    window.dispatchEvent(
      new CustomEvent("tile-palette-document-change", {
        detail: { source: "test" },
      }),
    );
  }, operation);
}

test("Theme Plaza share eligibility follows only the active palette", async ({
  page,
}) => {
  const first = palette("p1", "Cloud one");
  const second = palette("p2", "Cloud two");
  const submissions: Array<Record<string, unknown>> = [];
  let capabilityReads = 0;
  let currentRevision = 3;
  await page.addInitScript(() => {
    localStorage.setItem("2048_auth_token_v1", "palette-share-token");
    localStorage.setItem("2048_auth_userId_v1", "42");
    localStorage.setItem("ui_language_v1", "zh");
  });
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/api/auth/refresh")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "palette-share-token",
          user: { id: 42, public_profile_id: 42, nickname: "Share" },
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
              selection: { kind: "custom", paletteId: "p1" },
              revision: 2,
              updatedAt: null,
            },
            selectedPalette: record(first, currentRevision),
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
            palettes: [record(first, currentRevision), record(second, 2)],
            order: { paletteIds: ["p1", "p2"], revision: 2, updatedAt: null },
            selection: {
              selection: { kind: "custom", paletteId: "p1" },
              revision: 2,
              updatedAt: null,
            },
            tombstones: [],
            changes: [],
            nextCursor: "3",
            hasMore: false,
            resetRequired: false,
          },
        }),
      });
      return;
    }
    if (path.endsWith("/api/theme-plaza/capabilities")) {
      capabilityReads += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            readEnabled: true,
            writeEnabled: false,
            reactionEnabled: false,
            saveEnabled: false,
            shareEnabled: true,
            autoPublishEnabled: false,
            paletteFormat3Enabled: true,
          },
        }),
      });
      return;
    }
    if (path.endsWith("/api/me/palettes/p1") && request.method() === "PUT") {
      const body = request.postDataJSON() as Record<string, unknown>;
      currentRevision += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            status: "saved",
            operationId: body.operationId,
            paletteId: "p1",
            palette: record(body.palette as ReturnType<typeof palette>, currentRevision),
            reason: null,
            existingPaletteId: null,
            conflictCopyId: null,
          },
        }),
      });
      return;
    }
    if (path.endsWith("/api/theme-plaza/me/submissions")) {
      submissions.push(request.postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { listing_id: 7, version_id: 12, revision: 1, status: "pending_ai" },
        }),
      });
      return;
    }
    if (
      (path.endsWith("/api/me/palette-order") ||
        path.endsWith("/api/me/palette-selection")) &&
      request.method() === "PUT"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { revision: 3 } }),
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
  const share = page.locator("#palette-share-btn");
  await expect(share).toBeEnabled();
  await expect(share).toHaveText("分享到主题广场");
  const capabilityReadsBeforeEditing = capabilityReads;

  await putOutboxOperation(page, {
    key: "42:p2:create:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    accountId: 42,
    paletteId: "p2",
    kind: "create",
    operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    requestHash: "other-capacity",
    baseRevision: 1,
    payload: { palette: second },
    status: "capacity_full",
    attempts: 1,
    createdAt: 1,
    updatedAt: 2,
    nextAttemptAt: 0,
    sentAt: 1,
    lastError: null,
    result: { status: "capacity_full", paletteId: "p2" },
  });
  await expect(share).toBeEnabled();
  await page.locator('.palette-item[data-palette-id="p2"]').click();
  await expect(share).toBeDisabled();
  await expect(share).toHaveText("当前色板尚未上传");
  await page.locator('.palette-item[data-palette-id="p1"]').click();
  await expect(share).toBeEnabled();

  await page.evaluate(() => {
    (window as any).GameDialog.prompt = async () => "青瓷夜色";
  });
  await share.click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0]).toEqual({
    palette_id: "p1",
    title: "青瓷夜色",
    revision: 3,
  });

  await page.locator('.color-target[data-index="0"]').click();
  await page.locator("#palette-picker-r").fill("18");
  await page.locator("#palette-picker-g").fill("52");
  await page.locator("#palette-picker-b").fill("86");
  await expect(share).toBeDisabled();
  await expect(share).toHaveText("请先保存当前色板");
  expect(capabilityReads).toBe(capabilityReadsBeforeEditing);

  await page.locator("#palette-save-btn").click();
  await expect(share).toBeEnabled();

  await putOutboxOperation(page, {
    key: "42:p1:save:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    accountId: 42,
    paletteId: "p1",
    kind: "save",
    operationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    requestHash: "active-pending",
    baseRevision: currentRevision,
    payload: { palette: first },
    status: "pending",
    attempts: 0,
    createdAt: Date.now() + 10_000,
    updatedAt: Date.now() + 10_000,
    nextAttemptAt: 0,
    sentAt: null,
    lastError: null,
    result: null,
  });
  await expect(share).toBeDisabled();
  await expect(share).toHaveText("当前色板等待同步");
});
