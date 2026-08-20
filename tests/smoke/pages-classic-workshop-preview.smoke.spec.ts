import { expect, test } from "@playwright/test";

const PREVIEW_PAGES = [
  "game",
  "practice",
  "account",
  "account-settings",
  "achievements",
  "relay"
] as const;

const PREVIEW_VIEWPORTS = {
  "small-mobile": [320, 568],
  mobile: [390, 844],
  tablet: [768, 1024],
  desktop: [1280, 720]
} as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme_profile_v1", "mist_cyan");
    localStorage.setItem("settings_day_theme_profile_v1", "mist_cyan");
    localStorage.setItem("settings_night_theme_profile_v1", "mist_cyan");
  });
});

test("classic workshop preview shows one untransformed candidate safely", async ({ page }) => {
  const response = await page.goto("/visual-preview.html", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  await expect(page.locator("[data-classic-workshop-preview]")).toBeVisible();
  await expect(page.locator("[data-preview-page-key]")).toHaveCount(PREVIEW_PAGES.length);
  await expect(page.locator("[data-preview-device]")).toHaveCount(Object.keys(PREVIEW_VIEWPORTS).length);

  const candidateFrameElement = page.locator('[data-preview-frame="candidate"]');
  await expect(page.locator("[data-preview-frame]")).toHaveCount(1);
  await expect(candidateFrameElement).toHaveAttribute("src", /2048\.html/);
  await expect(candidateFrameElement).toHaveCSS("transform", "none");

  const candidateFrame = page.frameLocator('[data-preview-frame="candidate"]');
  await expect(candidateFrame.locator("body[data-page='game']")).toBeVisible();
  await expect(candidateFrame.locator("html")).not.toHaveAttribute("data-classic-workshop-preview", "1");
  await expect(candidateFrame.locator("link[data-classic-workshop-preview-style]")).toHaveCount(0);
  await expect(candidateFrame.locator(".game-container")).toHaveCSS("background-color", "rgb(184, 201, 199)");
  const candidatePalette = await candidateFrame.locator("body").evaluate(() => {
    const colorOf = (selector: string) => getComputedStyle(document.querySelector<HTMLElement>(selector)!).backgroundColor;
    const timer = document.querySelector<HTMLElement>("#timer")!;
    const timerRect = timer.getBoundingClientRect();
    const scrollControls = document.querySelector<HTMLElement>("#timer-scroll-controls")!;
    scrollControls.style.display = "flex";
    return {
      root: getComputedStyle(document.documentElement).backgroundColor,
      page: getComputedStyle(document.body).backgroundColor,
      board: colorOf(".game-container"),
      gridCell: colorOf(".grid-cell"),
      score: colorOf(".score-container"),
      scoreText: getComputedStyle(document.querySelector<HTMLElement>(".score-container")!).color,
      bestText: getComputedStyle(document.querySelector<HTMLElement>(".best-container")!).color,
      timer: colorOf("#timer"),
      timerText: getComputedStyle(timer).color,
      timerSize: [timerRect.width, timerRect.height],
      timerTrack: colorOf("#timer32"),
      scrollButton: colorOf(".timer-scroll-btn"),
      scrollButtonHeight: document.querySelector<HTMLElement>(".timer-scroll-btn")!.getBoundingClientRect().height,
      scrollButtonStripe: getComputedStyle(document.querySelector<HTMLElement>(".timer-scroll-btn")!, "::before").width,
      button: colorOf("#top-settings-btn")
    };
  });
  expect(candidatePalette).toEqual({
    root: "rgb(243, 246, 245)",
    page: "rgb(243, 246, 245)",
    board: "rgb(184, 201, 199)",
    gridCell: "rgb(220, 231, 229)",
    score: "rgb(251, 253, 252)",
    scoreText: "rgb(61, 79, 82)",
    bestText: "rgb(61, 79, 82)",
    timer: "rgb(251, 253, 252)",
    timerText: "rgb(61, 79, 82)",
    timerSize: [235, 55],
    timerTrack: "rgb(237, 243, 242)",
    scrollButton: "rgb(255, 254, 249)",
    scrollButtonHeight: 32,
    scrollButtonStripe: "auto",
    button: "rgb(255, 254, 249)"
  });

  await page.waitForTimeout(900);
  await expect(candidateFrame.locator("body[data-page='game']")).toBeVisible();
  expect(await candidateFrame.locator(".top-action-buttons").evaluate((node) => node.getBoundingClientRect().top))
    .toBeGreaterThanOrEqual(0);

  await expect(async () => {
    await candidateFrame.locator("#top-settings-btn").click();
    await expect(candidateFrame.locator("#settings-modal")).toBeVisible({ timeout: 750 });
  }).toPass({ timeout: 5000 });
  expect(await candidateFrame.locator(".settings-modal-content").evaluate((node) => getComputedStyle(node).borderRadius))
    .toBe("8px");
  await candidateFrame.locator("body").evaluate(() => {
    (window as any).closeSettingsModal();
  });
  await expect(candidateFrame.locator("#settings-modal")).toBeHidden();

  await page.locator('[data-preview-page-key="account"]').click();
  await expect(candidateFrame.locator("body[data-page='account-hub']")).toBeVisible();
  await expect(candidateFrame.locator(".account-board-row")).toHaveCount(3);

  await page.locator('[data-preview-page-key="account-settings"]').click();
  await expect(candidateFrame.locator("body[data-page='account-settings-hub']")).toBeVisible();
  await expect(candidateFrame.locator("body[data-page='account-settings-hub']")).toHaveAttribute("data-auth-state", "guest");
  await expect(candidateFrame.locator("#account-auth-state-tag")).toHaveText("未登录");
  await expect(candidateFrame.locator("#home-user-display")).toHaveCount(0);
  await expect(candidateFrame.locator(".account-auth-form-surface")).toBeVisible();
  const settingsHeaderGap = await candidateFrame.locator("body").evaluate(() => {
    const badge = document.querySelector<HTMLElement>(".home-user-display--global:not([hidden])");
    const back = document.querySelector<HTMLElement>(".page-back-button");
    if (!badge || !back) return Number.POSITIVE_INFINITY;
    return back.getBoundingClientRect().left - badge.getBoundingClientRect().right;
  });
  expect(settingsHeaderGap).toBeGreaterThanOrEqual(8);

  await page.locator('[data-preview-device="mobile"]').click();
  await expect(page.locator("[data-preview-stage]")).toHaveAttribute("data-active-device", "mobile");
  await expect(page.locator("[data-preview-viewport]")).toHaveCSS("width", "390px");
  await expect(page.locator("[data-preview-viewport]")).toHaveCSS("height", "844px");
  const mobileSettingsLayout = await candidateFrame.locator("body").evaluate(() => {
    const badge = document.querySelector<HTMLElement>(".home-user-display--global:not([hidden])");
    const header = document.querySelector<HTMLElement>(".palette-page-header");
    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      headerGap: badge && header
        ? header.getBoundingClientRect().top - badge.getBoundingClientRect().bottom
        : Number.POSITIVE_INFINITY
    };
  });
  expect(mobileSettingsLayout.horizontalOverflow).toBe(false);
  expect(mobileSettingsLayout.headerGap).toBeGreaterThanOrEqual(8);

  for (const [device, [width, height]] of Object.entries(PREVIEW_VIEWPORTS)) {
    await page.locator(`[data-preview-device="${device}"]`).click();
    await expect(page.locator("[data-preview-stage]")).toHaveAttribute("data-active-device", device);
    await expect(page.locator("[data-preview-viewport]")).toHaveCSS("width", `${width}px`);
    await expect(page.locator("[data-preview-viewport]")).toHaveCSS("height", `${height}px`);
  }

  await page.locator('[data-preview-device="mobile"]').click();

  await page.locator('[data-preview-page-key="practice"]').click();
  await expect(candidateFrame.locator("body[data-page='practice']")).toBeVisible();
  const highTileLabelsFit = await candidateFrame.locator(".selection-tile[data-value='16384'], .selection-tile[data-value='32768']")
    .evaluateAll((nodes) => nodes.every((node) => {
      const label = node.querySelector<HTMLElement>(".tile-inner");
      return !!label && label.scrollWidth <= label.clientWidth;
  }));
  expect(highTileLabelsFit).toBe(true);

  await expect(candidateFrame.locator("#practice-mode-list [data-practice-mode-key]")).not.toHaveCount(0);
  await candidateFrame.locator("#practice-mode-picker-btn").click();
  await expect(candidateFrame.locator("#practice-mode-panel")).toHaveClass(/is-open/);
  await candidateFrame.locator('[data-practice-mode-key="board_5x5_pow2_no_undo"]').click();
  await expect(candidateFrame.locator("#practice-mode-panel")).not.toHaveClass(/is-open/);
  await expect(candidateFrame.locator("#practice-mode-badge")).toHaveText("5×5");
  await expect(candidateFrame.locator("#selection-page-status")).toHaveText("1 / 2");
  await expect(candidateFrame.locator("#selection-grid .selection-tile")).toHaveCount(21);
  const mobilePracticeLayout = await candidateFrame.locator("body").evaluate(() => {
    const score = document.querySelector<HTMLElement>(".score-container")!;
    const scoreRect = score.getBoundingClientRect();
    const scoreLabelStyle = getComputedStyle(score, "::after");
    const scoreText = Array.from(score.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    const scoreTextRange = document.createRange();
    if (scoreText) scoreTextRange.selectNode(scoreText);
    const scoreTextRect = scoreText ? scoreTextRange.getBoundingClientRect() : scoreRect;
    const labelBottom = scoreRect.top + parseFloat(scoreLabelStyle.top) + parseFloat(scoreLabelStyle.lineHeight);
    const logoRect = document.querySelector<HTMLElement>(".site-logo")!.getBoundingClientRect();
    const badgeRect = document.querySelector<HTMLElement>("#practice-mode-badge")!.getBoundingClientRect();
    return {
      scoreGap: scoreTextRect.top - labelBottom,
      logoBadgeGap: badgeRect.top - logoRect.bottom
    };
  });
  expect(mobilePracticeLayout.scoreGap).toBeGreaterThanOrEqual(2);
  expect(mobilePracticeLayout.logoBadgeGap).toBeGreaterThanOrEqual(2);
  await candidateFrame.locator("#selection-page-next").click();
  await expect(candidateFrame.locator("#selection-page-status")).toHaveText("2 / 2");
  await expect(candidateFrame.locator("#selection-grid .selection-tile")).toHaveCount(6);
  await expect(candidateFrame.locator('.selection-tile[data-value="67108864"]')).toBeVisible();
  const overflowedTileLabels = await candidateFrame.locator("#selection-grid .selection-tile").evaluateAll((tiles) => {
    return tiles
      .map((tile) => tile.querySelector<HTMLElement>(".tile-inner"))
      .filter((label): label is HTMLElement => Boolean(label))
      .filter((label) => label.scrollWidth > label.clientWidth)
      .map((label) => label.textContent || "");
  });
  expect(overflowedTileLabels).toEqual([]);

  await candidateFrame.locator("#practice-mode-picker-btn").click();
  await candidateFrame.locator('[data-practice-mode-key="nox_4x4_pow2_no_undo"]').click();
  await expect(candidateFrame.locator("#no-x-selection-overlay")).toBeVisible();
  await candidateFrame.locator('[data-no-x-value="64"]').click();
  await expect(candidateFrame.locator("#no-x-selection-overlay")).toHaveCount(0);
  await expect.poll(async () => candidateFrame.locator("body").evaluate(() =>
    Number((window as any).game_manager?.specialRules?.no_x_target || 0)
  )).toBe(64);

  await page.locator('[data-preview-theme="night"]').click();
  await expect(candidateFrame.locator("html")).toHaveAttribute("data-night-background", "1");

  await page.locator('[data-preview-page-key="game"]').click();
  await page.waitForTimeout(900);
  await expect(candidateFrame.locator("html")).toHaveAttribute("data-night-background", "1");

  await page.locator('[data-preview-page-key="relay"]').click();
  await expect(candidateFrame.locator("body[data-page='relay-5x5']")).toBeVisible();
  await expect(candidateFrame.locator("html")).toHaveAttribute("data-night-background", "1");
  const candidateRootBackground = await candidateFrame.locator("html").evaluate((node) => {
    const style = getComputedStyle(node);
    return { color: style.backgroundColor, image: style.backgroundImage };
  });
  expect(candidateRootBackground).toEqual({ color: "rgb(24, 32, 31)", image: "none" });
  const relayHeaderGap = await candidateFrame.locator("body").evaluate(() => {
    const badge = document.querySelector<HTMLElement>(".home-user-display--global:not([hidden])");
    const header = document.querySelector<HTMLElement>(".relay-head");
    if (!badge || !header) return Number.POSITIVE_INFINITY;
    return header.getBoundingClientRect().top - badge.getBoundingClientRect().bottom;
  });
  expect(relayHeaderGap).toBeGreaterThanOrEqual(8);
});

test("approved workshop theme applies to production pages without changing mode buttons", async ({ page }) => {
  await page.goto("/visual-preview.html", { waitUntil: "domcontentloaded" });
  await page.locator('[data-preview-page-key="achievements"]').click();

  const candidateFrame = page.frameLocator('[data-preview-frame="candidate"]');
  const candidateCard = candidateFrame.locator(".achievements-summary-card");
  await expect(candidateCard).toBeVisible();
  await expect(candidateFrame.locator(".achievement-card")).toHaveCount(4);

  expect(await candidateCard.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("8px");

  await page.goto("/medal-wall.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).not.toHaveAttribute("data-classic-workshop-preview", "1");
  await expect(page.locator("link[data-classic-workshop-preview-style]")).toHaveCount(0);

  await page.goto("/2048.html?visual_preview=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator('link[href^="style/main.css"]')).toHaveAttribute(
    "href",
    /^style\/main\.css\?v=.+$/u
  );
  const productionPalette = await page.locator("body").evaluate(() => ({
    page: getComputedStyle(document.body).backgroundColor,
    board: getComputedStyle(document.querySelector<HTMLElement>(".game-container")!).backgroundColor,
    gridCell: getComputedStyle(document.querySelector<HTMLElement>(".grid-cell")!).backgroundColor,
    score: getComputedStyle(document.querySelector<HTMLElement>(".score-container")!).backgroundColor,
    scoreText: getComputedStyle(document.querySelector<HTMLElement>(".score-container")!).color
  }));
  expect(productionPalette).toEqual({
    page: "rgb(243, 246, 245)",
    board: "rgb(184, 201, 199)",
    gridCell: "rgb(220, 231, 229)",
    score: "rgb(251, 253, 252)",
    scoreText: "rgb(61, 79, 82)"
  });

  await page.goto("/modes.html", { waitUntil: "domcontentloaded" });
  const modeButton = page.locator(".mode-hub-btn").first();
  await expect(modeButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(modeButton).toHaveCSS("border-radius", "10px");
});

test("mist cyan practice controls and overlays use the shared interface color roles", async ({ page }) => {
  await page.goto("/Practice_board.html?practice_fresh=1", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".game-container")).toHaveCSS("background-color", "rgb(184, 201, 199)");
  await expect(page.locator(".dashboard-stats")).toHaveCSS("background-color", "rgb(237, 243, 242)");
  await expect(page.locator(".dashboard-controls")).toHaveCSS("background-color", "rgb(237, 243, 242)");
  await expect(page.locator("#practice-mode-badge")).toHaveCSS("background-color", "rgb(251, 253, 252)");
  await expect(page.locator("#practice-mode-badge")).toHaveCSS("color", "rgb(61, 79, 82)");

  await expect(page.locator("#practice-mode-list [data-practice-mode-key]")).not.toHaveCount(0);
  await page.locator("#practice-mode-picker-btn").click();
  await expect(page.locator("#practice-mode-panel")).toHaveClass(/is-open/);
  await expect(page.locator(".practice-mode-dialog")).toHaveCSS("background-color", "rgb(251, 253, 252)");
  await expect(page.locator(".practice-mode-option:not(.is-active)").first()).toHaveCSS("background-color", "rgb(255, 254, 249)");
  await expect(page.locator(".practice-mode-option").first()).toHaveCSS("color", "rgb(61, 79, 82)");
  await page.locator('[data-practice-mode-key="nox_4x4_pow2_no_undo"]').click();

  const noXOverlay = page.locator("#no-x-selection-overlay");
  await expect(noXOverlay).toBeVisible();
  await expect(noXOverlay.locator(".no-x-selection-panel")).toHaveCSS("background-color", "rgb(251, 253, 252)");
  await expect(noXOverlay.locator(".no-x-selection-title")).toHaveCSS("color", "rgb(61, 79, 82)");
  await expect(noXOverlay.locator(".no-x-selection-option.is-selected")).toHaveCSS("background-color", "rgb(237, 243, 242)");
  await expect(noXOverlay.locator(".no-x-selection-option:not(.is-selected)").first()).toHaveCSS("background-color", "rgb(255, 254, 249)");

  await page.evaluate(() => document.documentElement.setAttribute("data-night-background", "1"));
  await expect(page.locator(".dashboard-stats")).toHaveCSS("background-color", "rgb(43, 55, 52)");
  await expect(page.locator("#practice-mode-badge")).toHaveCSS("background-color", "rgb(35, 46, 44)");
  await expect(noXOverlay.locator(".no-x-selection-panel")).toHaveCSS("background-color", "rgb(35, 46, 44)");
  await expect(noXOverlay.locator(".no-x-selection-option.is-selected")).toHaveCSS("background-color", "rgb(43, 55, 52)");
  await expect(noXOverlay.locator(".no-x-selection-option:not(.is-selected)").first()).toHaveCSS("background-color", "rgb(32, 43, 48)");

  await page.goto("/2048.html?visual_preview=1", { waitUntil: "domcontentloaded" });
  await page.locator(".game-message").evaluate((node) => node.classList.add("game-over"));
  await expect(page.locator(".game-message .retry-button")).toHaveCSS("background-color", "rgb(32, 56, 61)");
});

test("native selects use the workshop dropdown design", async ({ page }) => {
  await page.goto("/stone_2k_monitor.html", { waitUntil: "domcontentloaded" });
  const select = page.locator("#stone-sort-by");
  await expect(select).toBeVisible();
  const style = await select.evaluate((node) => {
    const computed = getComputedStyle(node);
    const picker = getComputedStyle(node, "::picker(select)");
    const pickerIcon = getComputedStyle(node, "::picker-icon");
    return {
      appearance: computed.appearance,
      alignItems: computed.alignItems,
      backgroundImage: computed.backgroundImage,
      borderRadius: computed.borderRadius,
      minHeight: computed.minHeight,
      paddingRight: computed.paddingRight,
      pickerBackground: picker.backgroundColor,
      pickerBorderRadius: picker.borderRadius,
      pickerIconContent: pickerIcon.content,
      pickerIconHeight: pickerIcon.height,
      pickerIconMarginLeft: pickerIcon.marginLeft,
      pickerIconWidth: pickerIcon.width
    };
  });
  expect(style).toMatchObject({
    appearance: "base-select",
    alignItems: "center",
    borderRadius: "7px",
    minHeight: "38px",
    pickerBackground: "rgb(251, 253, 252)",
    pickerBorderRadius: "8px",
    pickerIconContent: '""',
    pickerIconHeight: "8px",
    pickerIconWidth: "8px"
  });
  expect(Number.parseFloat(style.pickerIconMarginLeft)).toBeGreaterThan(20);
  expect(style.backgroundImage).toBe("none");
});

test("mist cyan color roles stay consistent across pages and control states", async ({ page }) => {
  const pages = [
    ["/history.html", ".portal-card"],
    ["/account.html", ".account-summary-card"],
    ["/palette.html", ".card-surface"],
    ["/touch_sensitivity.html", ".touch-card"]
  ] as const;

  for (const [path, panelSelector] of pages) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 246, 245)");
    await expect(page.locator("h1").first()).toHaveCSS("color", "rgb(61, 79, 82)");
    await expect(page.locator(panelSelector).first()).toHaveCSS("background-color", "rgb(251, 253, 252)");
  }

  await page.goto("/modes.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 246, 245)");
  await expect(page.locator(".mode-select-body")).toHaveCSS("background-color", "rgb(251, 253, 252)");
  await expect(page.locator(".mode-tab-button.is-active")).toHaveCSS("color", "rgb(37, 107, 125)");

  await page.evaluate(() => document.documentElement.setAttribute("data-night-background", "1"));
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(24, 32, 31)");
  await expect(page.locator(".mode-select-body")).toHaveCSS("background-color", "rgb(35, 46, 44)");

  await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
  await page.locator("#top-settings-btn").click();
  const checkedSwitch = page.locator(".settings-switch input:checked + .settings-switch-slider").first();
  await expect(checkedSwitch).toHaveCSS("background-color", "rgb(47, 134, 160)");

  await page.evaluate(() => document.documentElement.setAttribute("data-night-background", "1"));
  await expect(checkedSwitch).toHaveCSS("background-color", "rgb(99, 170, 166)");
});

test("mist cyan night runtime and mobile utility pages keep the shared visual system", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("2048_beta_access_smoke_bypass_v1", "1");
    localStorage.setItem("theme_profile_v1", "mist_cyan");
    localStorage.setItem("settings_day_theme_profile_v1", "mist_cyan");
    localStorage.setItem("settings_night_theme_profile_v1", "mist_cyan");
    localStorage.setItem("settings_night_background_enabled_v1", "1");
  });

  await page.goto("/modes.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-night-background", "1");
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(24, 32, 31)");
  await expect(page.locator("html")).toHaveCSS("background-image", "none");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(24, 32, 31)");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(237, 242, 237)");

  await page.goto("/2048.html?visual_preview=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-night-background", "1");
  await expect(page.locator(".game-container")).toHaveCSS("background-color", "rgb(67, 84, 80)");
  await expect(page.locator(".score-container")).toHaveCSS("background-color", "rgb(53, 73, 70)");

  await page.goto("/relay_5x5.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".relay-panel").first()).toHaveCSS("background-color", "rgb(35, 46, 44)");
  await expect(page.locator(".relay-panel").first()).toHaveCSS("color", "rgb(204, 215, 209)");

  await page.goto("/user.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#user-value-name")).toHaveCSS("color", "rgb(237, 242, 237)");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/palette.html", { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.goto("/history.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#home-user-display")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
