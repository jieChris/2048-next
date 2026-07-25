import { expect, test } from "@playwright/test";

test("public account deletion verifies credentials and renders the 72-hour receipt", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "2048-next.account-deletion.locale-v1",
      "zh-CN",
    );
  });
  let requestBody: unknown = null;
  let authorization = "missing";
  await page.route("**/api/account/deletion/request", async (route) => {
    requestBody = route.request().postDataJSON();
    authorization = route.request().headers().authorization ?? "";
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
  });

  await page.goto("/account-deletion.html");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "1");
  await page.getByLabel("邮箱").fill(" Player@Example.com ");
  await page.getByLabel("密码").fill("Password123!");
  await page.getByLabel(/我已了解/).check();
  await page.getByRole("button", { name: "申请删除账号" }).click();

  expect(requestBody).toEqual({
    email: "player@example.com",
    password: "Password123!",
  });
  expect(authorization).toBe("");
  await expect(page.locator("[data-deletion-form]")).toBeHidden();
  await expect(page.locator("[data-deletion-receipt]")).toBeVisible();
  await expect(page.locator("[data-receipt-email]")).toHaveText("p***@example.com");
  await expect(page.locator("[data-deletion-status]")).toContainText("现有登录凭据已失效");
  await expect(page.getByLabel("密码")).toHaveValue("");
});

test("public account deletion keeps the form available after invalid credentials", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "2048-next.account-deletion.locale-v1",
      "zh-CN",
    );
  });
  await page.route("**/api/account/deletion/request", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ success: false, code: "INVALID_CREDENTIALS" }),
    }),
  );

  await page.goto("/account-deletion.html");
  await page.getByLabel("邮箱").fill("player@example.com");
  await page.getByLabel("密码").fill("wrong-password");
  await page.getByLabel(/我已了解/).check();
  await page.getByRole("button", { name: "申请删除账号" }).click();

  await expect(page.locator("[data-deletion-form]")).toBeVisible();
  await expect(page.locator("[data-deletion-receipt]")).toBeHidden();
  await expect(page.locator("[data-deletion-status]")).toContainText("邮箱或密码不正确");
});
