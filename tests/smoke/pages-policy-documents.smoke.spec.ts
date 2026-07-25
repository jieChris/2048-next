import { expect, test } from "@playwright/test";

test("public privacy and terms pages render the same unapproved policy bundle", async ({
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
  await expect(page.locator("[data-policy-version]")).toHaveText("unapproved-draft");
  await expect(page.locator("[data-policy-date]")).toHaveText("尚未生效");
  await expect(page.locator("[data-policy-status]")).toContainText("运营主体");
  await expect(page.locator("[data-policy-status]")).toContainText("生产托管信息");
  await expect(page.locator("[data-policy-content]")).toContainText("INTERNET");
  await expect(page.locator("[data-policy-content]")).toContainText("Resend");
  await expect(page.getByRole("link", { name: "账号删除" })).toHaveAttribute(
    "href",
    "account-deletion.html",
  );

  await page.locator("[data-policy-language]").selectOption("en");
  await expect(page.getByRole("heading", { name: "2048 NEXT Privacy Policy" })).toBeVisible();
  await expect(page.locator("[data-policy-date]")).toHaveText("Not effective");

  await page.getByRole("link", { name: "Terms of Service" }).click();
  await expect(page).toHaveURL(/terms\.html$/u);
  await expect(page.getByRole("heading", { name: "2048 NEXT Terms of Service" })).toBeVisible();
  await expect(page.locator("[data-policy-content]")).toContainText("72-hour cooling-off period");
});
