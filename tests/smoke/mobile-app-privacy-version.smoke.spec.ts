import { expect, test, type Page } from "@playwright/test";

const PRIVACY_KEY = "2048-next.app.preview-privacy-v1";

function observeBusinessRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      request.resourceType() === "fetch" ||
      request.resourceType() === "xhr" ||
      request.resourceType() === "websocket" ||
      url.pathname.startsWith("/api/")
    ) {
      requests.push(request.url());
    }
  });
  return requests;
}

test("an offline online-intent can cancel back to its source or accept and resume", async ({
  page,
}) => {
  const requests = observeBusinessRequests(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await page.getByRole("button", { name: "模式", exact: true }).click();
  await page.getByRole("button", { name: /经典 4×4/ }).click();
  await page.getByRole("button", { name: "查看联网说明" }).click();
  await expect(page.getByRole("heading", { name: "开始之前" })).toBeVisible();

  await page.getByRole("button", { name: "仅离线体验" }).click();
  await expect(page.locator('[data-app-view="modes"]')).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  await page.getByRole("button", { name: /经典 4×4/ }).click();
  await page.getByRole("button", { name: "查看联网说明" }).click();
  await page.getByRole("button", { name: "预览联网入口" }).click();
  await expect(page.locator('[data-app-view="auth-login"]')).toBeVisible();
  await expect(
    page.getByText("登录后将继续进入刚才选择的模式。"),
  ).toBeVisible();
  expect(requests).toEqual([]);
});

test("a stale material-consent version reopens privacy before any business request", async ({
  page,
}) => {
  const requests = observeBusinessRequests(page);
  await page.addInitScript(({ key }) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        schema: 1,
        choice: "online",
        policyVersion: "material-v0",
        decidedAt: Date.now(),
      }),
    );
  }, { key: PRIVACY_KEY });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "开始之前" })).toBeVisible();
  await expect(page.locator("[data-app-bottom-nav]")).toBeHidden();
  expect(requests).toEqual([]);
});

test("a document-only revision does not invalidate current consent", async ({ page }) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        schema: 1,
        choice: "offline",
        policyVersion: "unapproved-draft",
        decidedAt: Date.now(),
      }),
    );
  }, { key: PRIVACY_KEY });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-app-view="home"]')).toBeVisible();
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page
    .locator('[data-app-view="me"] [data-action="open-policies"]')
    .click();
  await expect(page.locator("[data-app-view='policies']")).toContainText(
    "unapproved-draft.1",
  );
  await expect(page.getByRole("heading", { name: "开始之前" })).toBeHidden();
});
