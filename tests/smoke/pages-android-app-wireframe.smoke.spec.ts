import { expect, test } from "@playwright/test";

test("android app wireframe exposes the planned mobile task flow", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  const response = await page.goto("/android-app-wireframe.html", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  const screen = (name: string) => page.locator(`[data-screen="${name}"]`);
  const bottomNav = page.locator("[data-bottom-nav]");
  const classicMode = page.locator('[data-mode-card][data-mode="classic_4x4_pow2_undo"]');

  await expect(screen("privacy")).toBeVisible();
  await expect(bottomNav).toBeHidden();
  await page.getByRole("button", { name: "仅离线体验" }).click();
  await expect(screen("home")).toBeVisible();
  await expect(bottomNav.getByRole("button")).toHaveCount(4);

  await screen("home").locator("[data-open-detail]").click();
  await expect(screen("detail")).toBeVisible();
  await expect(page.locator("[data-detail-back]")).toHaveAttribute("aria-label", "返回首页");
  await page.locator('[data-action="close-detail"]').click();
  await expect(screen("home")).toBeVisible();

  await bottomNav.locator('[data-nav="records"]').click();
  await expect(screen("records")).toBeVisible();
  await expect(screen("records").locator("[data-open-detail]:visible")).toHaveCount(1);
  await expect(page.locator("[data-record-owner]")).toHaveValue("guest");
  await screen("records").locator('[data-action="open-leaderboard"]').click();
  await expect(screen("privacy")).toBeVisible();
  await page.getByRole("button", { name: "暂不联网" }).click();
  await expect(screen("records")).toBeVisible();
  await expect(page.locator("[data-leaderboard-dialog]")).toBeHidden();

  await bottomNav.locator('[data-nav="me"]').click();
  await expect(page.locator("[data-account-setting]")).toBeHidden();
  await page.locator('[data-action="open-achievements"]').click();
  await expect(screen("privacy")).toBeVisible();
  await page.getByRole("button", { name: "暂不联网" }).click();
  await expect(screen("me")).toBeVisible();

  await bottomNav.locator('[data-nav="home"]').click();
  await page.locator('[data-action="continue"]').click();
  await expect(screen("game")).toBeVisible();
  await expect(page.locator("[data-game-title]")).toHaveText("标准 4×4");
  await expect(page.locator("[data-game-entry]")).toHaveText("已恢复本机进度");
  await screen("game").locator('[data-target="home"]').click();

  await bottomNav.locator('[data-nav="modes"]').click();
  await expect(page.locator("[data-mode-card]")).toHaveCount(3);
  await expect(page.locator('[data-mode-card][data-locked="true"]')).toHaveCount(2);
  await expect(page.locator("[data-mode-card] button")).toHaveCount(0);

  await classicMode.click();
  await expect(screen("privacy")).toBeVisible();
  await expect(screen("auth")).toBeHidden();
  await page.getByRole("button", { name: "暂不联网" }).click();
  await expect(screen("modes")).toBeVisible();

  await classicMode.click();
  await page.getByRole("button", { name: "同意并继续" }).click();
  await expect(screen("auth")).toBeVisible();
  await expect(page.locator("[data-auth-back]")).toHaveAttribute("aria-label", "返回模式");
  await page.locator('[data-auth-tab="register"]').click();
  await expect(page.locator("#auth-title")).toHaveText("注册账号");
  await expect(page.locator("[data-auth-password]")).toHaveAttribute("autocomplete", "new-password");
  await expect(page.locator("[data-auth-nickname]")).toHaveJSProperty("required", true);
  await expect(page.locator("[data-auth-code]")).toHaveJSProperty("required", true);
  await page.locator('[data-auth-tab="login"]').click();
  await expect(page.locator("[data-auth-password]")).toHaveAttribute("autocomplete", "current-password");
  await page.locator("[data-auth-form]").getByRole("button", { name: "登录并继续" }).click();
  await expect(screen("game")).toBeVisible();
  await expect(page.locator("[data-game-title]")).toHaveText("经典 4×4");
  await expect(page.locator("[data-undo]")).toBeVisible();

  const timer = page.locator("#game-timer");
  const elapsedBeforeLeaderboard = Number(await timer.getAttribute("data-elapsed-ms"));
  await screen("game").locator('[data-action="open-leaderboard"]').last().click();
  await expect(page.locator("[data-leaderboard-dialog]")).toBeVisible();
  await expect(page.locator("[data-leaderboard-mode]")).toHaveValue("classic_4x4_pow2_undo");
  await expect(page.locator("[data-speed-option]")).toBeDisabled();
  await expect(page.locator("[data-wireframe]")).toHaveAttribute("data-input-locked", "true");
  await expect(bottomNav).toBeHidden();
  await expect.poll(async () => Number(await timer.getAttribute("data-elapsed-ms"))).toBeGreaterThan(elapsedBeforeLeaderboard);
  await page.locator('[data-action="close-leaderboard"]').click();
  await expect(page.locator("[data-wireframe]")).toHaveAttribute("data-input-locked", "false");

  await page.locator('[data-action="restart"]').click();
  await expect(page.locator("[data-restart-dialog]")).toContainText("只清除当前模式");
  await page.locator('[data-action="cancel-restart"]').click();

  await page.locator('[data-review="signed-modes"]').click();
  await expect(page.locator('[data-mode-card][data-locked="false"]')).toHaveCount(3);
  await page.locator('[data-mode-card][data-mode="board_3x3_pow2_no_undo"]').click();
  await expect(page.locator("[data-game-title]")).toHaveText("标准 3×3");
  await expect(page.locator("[data-game-entry]")).toHaveText("已创建新对局");
  await page.locator('[data-action="restart"]').click();
  await expect(page.locator("[data-restart-dialog]")).toBeHidden();
  await expect(page.locator("[data-game-entry]")).toHaveText("已创建新对局 · 其他模式存档不变");

  await page.locator('[data-review="pending"]').click();
  await expect(screen("pending")).toBeVisible();
  await page.locator('[data-action="pending-undo"]').click();
  await expect(screen("game")).toBeVisible();
  await expect(page.locator("[data-game-entry]")).toHaveText("已撤回，继续当前对局");
  await expect.poll(async () => Number(await timer.getAttribute("data-elapsed-ms"))).toBeGreaterThan(768_000);

  await page.locator('[data-review="pending"]').click();
  await page.locator('[data-action="pending-finish"]').click();
  await expect(screen("result")).toBeVisible();
  await page.locator('[data-action="result-replay"]').click();
  await expect(screen("replay")).toBeVisible();
  await expect(page.locator("[data-replay-mode]")).toHaveText("经典 4×4");
  await expect(page.locator("[data-replay-copy]")).toContainText("684");
  await expect(page.locator("[data-replay-back]")).toHaveAttribute("aria-label", "返回结算");
  await page.locator("[data-replay-back]").click();
  await expect(screen("result")).toBeVisible();
  await page.locator('[data-action="result-home"]').click();

  await bottomNav.locator('[data-nav="records"]').click();
  await expect(screen("records").locator("[data-open-detail]:visible")).toHaveCount(2);
  await screen("records").locator("[data-account-record]").click();
  await expect(page.locator("[data-detail-mode]")).toHaveText("经典 4×4");
  await expect(page.locator("[data-detail-delete]")).toContainText("3 天内可恢复");
  await expect(page.locator("[data-detail-back]")).toHaveAttribute("aria-label", "返回记录");
  await page.locator("[data-open-replay]").click();
  await expect(page.locator("[data-replay-copy]")).toContainText("12:48");
  await page.locator("[data-replay-back]").click();
  await page.locator('[data-action="close-detail"]').click();

  await bottomNav.locator('[data-nav="me"]').click();
  await page.locator('[data-action="open-achievements"]').click();
  await expect(screen("achievements")).toBeVisible();
  await screen("achievements").locator('[data-target="me"]').click();
  await page.locator('[data-target="settings"]').click();
  await expect(screen("settings")).toContainText("3 天冷静期");

  const mobileViewports = [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 480, height: 960 },
  ];
  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport);
    await page.locator('[data-review="signed-modes"]').click();
    await page.locator('[data-mode-card][data-mode="standard_4x4_pow2_no_undo"]').click();
    const activeScreen = page.locator('[data-screen="game"]');
    expect(await activeScreen.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
    await activeScreen.locator('[data-action="open-leaderboard"]').last().click();
    const box = await page.locator("[data-leaderboard-dialog]").boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
    await page.locator("[data-leaderboard-mode]").selectOption("standard_4x4_pow2_no_undo");
    await page.locator("[data-leaderboard-metric]").selectOption("speed");
    await expect(page.locator("[data-speed-target]")).toBeVisible();
    await expect(page.locator("[data-speed-target] option")).toHaveCount(5);
    await page.locator('[data-action="close-leaderboard"]').click();
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('[data-review="me"]').click();
  await page.locator('[data-target="settings"]').click();
  expect(await screen("settings").evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  await expect(page.locator("[data-wireframe]")).toHaveCSS("height", "568px");

  await expect(page.locator("[data-tutorial]")).toHaveCount(0);
  expect(apiRequests).toEqual([]);
});
