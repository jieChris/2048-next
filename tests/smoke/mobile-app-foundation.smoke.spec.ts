import { expect, test } from "@playwright/test";

test("offline privacy choice opens the empty mobile home without business requests", async ({
  page
}) => {
  const businessRequests: string[] = [];
  const externalRequests: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    const resourceType = request.resourceType();
    if (requestUrl.hostname !== "127.0.0.1") {
      externalRequests.push(request.url());
    }
    if (
      resourceType === "fetch" ||
      resourceType === "xhr" ||
      resourceType === "websocket" ||
      requestUrl.pathname.startsWith("/api/")
    ) {
      businessRequests.push(request.url());
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 320, height: 720 });
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "开始之前" })).toBeVisible();
  await expect(page.locator("[data-app-bottom-nav]")).toBeHidden();
  await expect(page.locator("[data-app-shell]")).toHaveAttribute(
    "data-network-mode",
    "undecided"
  );

  await page.getByRole("button", { name: "仅离线体验" }).click();

  await expect(page.getByRole("heading", { name: "今天继续一局" })).toBeVisible();
  await expect(page.getByText("仅离线", { exact: true })).toBeVisible();
  await expect(page.locator("[data-app-bottom-nav] button")).toHaveCount(4);
  await expect(page.locator("[data-app-shell]")).toHaveAttribute(
    "data-network-mode",
    "offline"
  );

  const previewRecord = await page.evaluate(() => {
    const raw = window.localStorage.getItem("2048-next.app.preview-privacy-v1");
    return raw ? (JSON.parse(raw) as unknown) : null;
  });
  expect(previewRecord).toMatchObject({
    schema: 1,
    choice: "offline",
    policyVersion: "unapproved-draft"
  });
  expect(previewRecord).toHaveProperty("decidedAt", expect.any(Number));
  expect(
    await page.evaluate(() => window.localStorage.getItem("2048-next.app.privacy"))
  ).toBeNull();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
  ).toBe(0);
  expect(businessRequests).toEqual([]);
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "今天继续一局" })).toBeVisible();
  expect(businessRequests).toEqual([]);
  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("system theme follows live light and dark preferences", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const darkBackground = await page.locator("html").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--color-app-background").trim()
  );

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightBackground = await page.locator("html").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--color-app-background").trim()
  );

  expect(darkBackground).not.toBe("");
  expect(lightBackground).not.toBe("");
  expect(darkBackground).not.toBe(lightBackground);
});

test.describe("English system locale", () => {
  test.use({ locale: "en-US" });

  test("renders the centralized English privacy copy", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Before you begin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue offline" })).toBeVisible();
  });
});
