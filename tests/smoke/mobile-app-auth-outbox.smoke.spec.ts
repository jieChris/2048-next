import { expect, test } from "@playwright/test";

test("account logout cancels safely, then clears only the account owner", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(`${route.request().method()} ${url.pathname}`);
    if (url.pathname.endsWith("/api/login")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "smoke-account-token",
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
    if (url.pathname.endsWith("/api/ranked-session/start")) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false, code: "UNAVAILABLE" }),
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

  await page.getByRole("button", { name: "开始标准 4×4" }).click();
  await page.locator('[data-action="leave-game"]').click();
  await expect(page.locator('[data-app-view="home"]')).toBeVisible();

  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "登录或注册" }).click();
  const login = page.locator('[data-app-view="auth-login"]');
  await login.locator('input[name="email"]').fill("player@example.com");
  await login.locator('input[name="password"]').fill("password-123");
  await login.getByRole("button", { name: "登录并继续" }).click();
  await expect(page.locator("[data-account-title]")).toHaveText("Smoke Player");

  await page.getByRole("button", { name: "模式", exact: true }).click();
  await page.getByRole("button", { name: /经典 4×4/ }).click();
  await expect(page.locator('[data-app-view="game"]')).toBeVisible();
  await expect(page.locator("[data-game-status]")).toHaveText("普通对局");
  await page.locator('[data-action="leave-game"]').click();
  await page.getByRole("button", { name: "我的", exact: true }).click();

  const logout = page.getByRole("button", { name: "退出或切换账号" });
  await logout.click();
  const dialog = page.locator("[data-account-logout-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-account-logout-summary]")).toContainText(
    "未结束模式 1 个",
  );
  await dialog.getByRole("button", { name: "取消退出" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("[data-account-title]")).toHaveText("Smoke Player");

  await logout.click();
  await dialog.getByRole("button", { name: "仍然退出并清除" }).click();
  await expect(page.locator("[data-account-title]")).toHaveText("当前为游客");
  await expect(page.getByRole("button", { name: "登录或注册" })).toBeVisible();

  const owners = await page.evaluate(async () => {
    const request = indexedDB.open("2048_next_app");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(["saves", "outbox"], "readonly");
    const readAll = <T>(storeName: string): Promise<T[]> =>
      new Promise((resolve, reject) => {
        const read = transaction.objectStore(storeName).getAll();
        read.onsuccess = () => resolve(read.result as T[]);
        read.onerror = () => reject(read.error);
      });
    const [saves, outbox] = await Promise.all([
      readAll<{ ownerKey: string }>("saves"),
      readAll<{ ownerKey: string }>("outbox"),
    ]);
    database.close();
    return {
      saveOwners: saves.map((row) => row.ownerKey).sort(),
      outboxOwners: outbox.map((row) => row.ownerKey).sort(),
    };
  });

  expect(owners.saveOwners).toEqual(["guest"]);
  expect(owners.outboxOwners).toEqual([]);
  expect(requests).toEqual([
    "POST /api/login",
    "POST /api/ranked-session/start",
  ]);
});

test("account deletion stores only its receipt and password login cancels within the cooling-off period", async ({
  page,
}) => {
  const requests: string[] = [];
  let loginCount = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(`${route.request().method()} ${url.pathname}`);
    if (url.pathname.endsWith("/api/login")) {
      loginCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: `smoke-account-token-${loginCount}`,
          expiresAt: 2_000_000_000,
          accountDeletionCancelled: loginCount === 2,
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
    if (url.pathname.endsWith("/api/account/deletion/request")) {
      expect(JSON.parse(route.request().postData() ?? "{}"))
        .toEqual({
          email: "player@example.com",
          password: "password-123",
        });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            status: "pending_deletion",
            requestedAt: "2026-07-25T00:00:00.000Z",
            dueAt: "2026-07-28T00:00:00.000Z",
            maskedEmail: "p***@example.com",
          },
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
  await page.getByRole("button", { name: "登录或注册" }).click();
  let login = page.locator('[data-app-view="auth-login"]');
  await login.locator('input[name="email"]').fill("player@example.com");
  await login.locator('input[name="password"]').fill("password-123");
  await login.getByRole("button", { name: "登录并继续" }).click();
  await expect(page.locator("[data-account-title]")).toHaveText("Smoke Player");

  await page.getByRole("button", { name: "申请删除账号" }).click();
  const deletion = page.locator("[data-account-deletion-dialog]");
  await deletion.locator('input[name="password"]').fill("password-123");
  await deletion.getByRole("button", { name: "申请删除并退出" }).click();

  await expect(page.locator("[data-account-title]")).toHaveText("当前为游客");
  const receipt = page.locator("[data-account-deletion-receipt]");
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText("p***@example.com");
  const receiptStorage = await page.evaluate(() =>
    window.localStorage.getItem(
      "2048-next.app.account-deletion-receipt-v1",
    ),
  );
  expect(receiptStorage).not.toContain("player@example.com");
  expect(receiptStorage).not.toContain("token");
  expect(receiptStorage).not.toContain("userId");

  await page.getByRole("button", { name: "登录或注册" }).click();
  login = page.locator('[data-app-view="auth-login"]');
  await login.locator('input[name="email"]').fill("player@example.com");
  await login.locator('input[name="password"]').fill("password-123");
  await login.getByRole("button", { name: "登录并继续" }).click();

  await expect(page.locator("[data-account-title]")).toHaveText("Smoke Player");
  await expect(receipt).toBeHidden();
  await expect(page.locator("[data-app-status]")).toContainText(
    "账号删除已取消",
  );
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem(
        "2048-next.app.account-deletion-receipt-v1",
      ),
    ),
  ).toBeNull();
  expect(requests).toEqual([
    "POST /api/login",
    "POST /api/account/deletion/request",
    "POST /api/login",
  ]);
});
