import { expect, test } from "@playwright/test";

test("public privacy and terms pages render the same approved policy bundle", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("2048-next.policy.locale-v1")) {
      window.localStorage.setItem("2048-next.policy.locale-v1", "zh-CN");
    }
  });

  await page.goto("/privacy.html");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "1");
  await expect(page.getByRole("heading", { name: "2048 NEXT 隐私政策" })).toBeVisible();
  await expect(page.locator("[data-policy-version]")).toHaveText("2026-08-01.1");
  await expect(page.locator("[data-policy-date]")).toHaveText("2026-08-01");
  await expect(page.locator("[data-policy-status]")).toContainText("已批准版本");
  await expect(page.locator("[data-policy-content]")).toContainText("INTERNET");
  await expect(page.locator("[data-policy-content]")).toContainText("Resend");
  await expect(page.locator("[data-policy-content]")).toContainText("华为云中国大陆上海区域");
  await expect(page.locator("[data-policy-content]")).toContainText("Color Cross");
  await expect(page.locator("[data-policy-content]")).toContainText("美国芝加哥");
  await expect(page.locator("[data-policy-content]")).toContainText("个人信息出境");
  await expect(page.locator("[data-policy-content]")).toContainText("1203214493@qq.com");
  await expect(page.getByRole("link", { name: "账号删除" })).toHaveAttribute(
    "href",
    "account-deletion.html",
  );

  await page.locator("[data-policy-language]").selectOption("en");
  await expect(page.getByRole("heading", { name: "2048 NEXT Privacy Policy" })).toBeVisible();
  await expect(page.locator("[data-policy-date]")).toHaveText("2026-08-01");
  await expect(page.locator("[data-policy-status]")).toContainText("Approved version");

  await page.getByRole("link", { name: "Terms of Service" }).click();
  await expect(page).toHaveURL(/terms\.html$/u);
  await expect(page.getByRole("heading", { name: "2048 NEXT Terms of Service" })).toBeVisible();
  await expect(page.locator("[data-policy-content]")).toContainText("72-hour cooling-off period");
});
