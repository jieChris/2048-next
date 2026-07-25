import { expect, test } from "@playwright/test";

test("mobile settings apply immediately, keep the Me route, and persist without network", async ({
  page,
}) => {
  const requests: string[] = [];
  const musicRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("windows-bgm") && request.url().endsWith(".m4a")) {
      musicRequests.push(request.url());
    }
  });
  await page.route("**/api/**", async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await page.getByRole("button", { name: "我的", exact: true }).click();

  const theme = page.locator("[data-theme-preference]");
  const locale = page.locator("[data-locale-preference]");
  const sound = page.locator("[data-sound-effects-enabled]");
  const haptics = page.locator("[data-haptics-enabled]");
  const bgm = page.locator("[data-bgm-enabled]");
  await expect(sound).toBeChecked();
  await expect(haptics).toBeChecked();
  await expect(bgm).not.toBeChecked();
  expect(musicRequests).toEqual([]);

  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await sound.uncheck();
  await haptics.uncheck();
  await bgm.check();
  await expect.poll(() => musicRequests.length).toBe(1);
  await locale.selectOption("en");

  const me = page.locator('[data-app-view="me"]');
  await expect(me).toBeVisible();
  await expect(me.getByRole("heading", { name: "Me", exact: true })).toBeVisible();
  await expect(page.locator("[data-app-bottom-nav]")).toBeVisible();
  await expect(page.locator("[data-theme-preference]")).toHaveValue("dark");
  await expect(page.locator("[data-sound-effects-enabled]")).not.toBeChecked();
  await expect(page.locator("[data-haptics-enabled]")).not.toBeChecked();
  await expect(page.locator("[data-bgm-enabled]")).toBeChecked();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Continue a game today" }))
    .toBeVisible();
  await page.getByRole("button", { name: "Me", exact: true }).click();
  await expect(page.locator("[data-theme-preference]")).toHaveValue("dark");
  await expect(page.locator("[data-locale-preference]")).toHaveValue("en");
  await expect(page.locator("[data-sound-effects-enabled]")).not.toBeChecked();
  await expect(page.locator("[data-haptics-enabled]")).not.toBeChecked();
  await expect(page.locator("[data-bgm-enabled]")).toBeChecked();
  expect(requests).toEqual([]);
});
