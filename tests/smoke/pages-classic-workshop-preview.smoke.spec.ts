import { expect, test } from "@playwright/test";

const PREVIEW_PAGES = [
  "game",
  "practice",
  "account",
  "account-settings",
  "achievements",
  "relay"
] as const;

test("classic workshop preview shows one untransformed candidate safely", async ({ page }) => {
  const response = await page.goto("/visual-preview.html", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  await expect(page.locator("[data-classic-workshop-preview]")).toBeVisible();
  await expect(page.locator("[data-preview-page-key]")).toHaveCount(PREVIEW_PAGES.length);

  const candidateFrameElement = page.locator('[data-preview-frame="candidate"]');
  await expect(page.locator("[data-preview-frame]")).toHaveCount(1);
  await expect(candidateFrameElement).toHaveAttribute("src", /2048\.html/);
  await expect(candidateFrameElement).toHaveCSS("transform", "none");

  const candidateFrame = page.frameLocator('[data-preview-frame="candidate"]');
  await expect(candidateFrame.locator("body[data-page='game']")).toBeVisible();
  await expect(candidateFrame.locator("html")).not.toHaveAttribute("data-classic-workshop-preview", "1");
  await expect(candidateFrame.locator("link[data-classic-workshop-preview-style]")).toHaveCount(0);
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
    root: "rgb(244, 241, 234)",
    page: "rgb(244, 241, 234)",
    board: "rgb(199, 189, 178)",
    gridCell: "rgb(226, 219, 210)",
    score: "rgb(251, 248, 241)",
    scoreText: "rgb(22, 140, 135)",
    bestText: "rgb(228, 126, 57)",
    timer: "rgb(251, 248, 241)",
    timerText: "rgb(145, 180, 92)",
    timerSize: [235, 55],
    timerTrack: "rgb(240, 235, 228)",
    scrollButton: "rgb(255, 254, 249)",
    scrollButtonHeight: 32,
    scrollButtonStripe: "auto",
    button: "rgb(255, 254, 249)"
  });

  await page.waitForTimeout(900);
  await expect(candidateFrame.locator("body[data-page='game']")).toBeVisible();
  expect(await candidateFrame.locator(".top-action-buttons").evaluate((node) => node.getBoundingClientRect().top))
    .toBeGreaterThanOrEqual(0);

  await candidateFrame.locator("#top-settings-btn").click();
  await expect(candidateFrame.locator("#settings-modal")).toBeVisible();
  expect(await candidateFrame.locator(".settings-modal-content").evaluate((node) => getComputedStyle(node).borderRadius))
    .toBe("8px");
  await candidateFrame.locator("#settings-modal").click({ position: { x: 5, y: 5 } });
  await expect(candidateFrame.locator("#settings-modal")).toBeHidden();

  await page.locator('[data-preview-page-key="account"]').click();
  await expect(candidateFrame.locator("body[data-page='account-hub']")).toBeVisible();
  await expect(candidateFrame.locator(".account-board-row")).toHaveCount(3);

  await page.locator('[data-preview-page-key="account-settings"]').click();
  await expect(candidateFrame.locator("body[data-page='account-settings-hub']")).toBeVisible();
  const settingsHeaderGap = await candidateFrame.locator("body").evaluate(() => {
    const badge = document.querySelector<HTMLElement>(".home-user-display--global:not([hidden])");
    const title = document.querySelector<HTMLElement>(".palette-title");
    if (!badge || !title) return Number.POSITIVE_INFINITY;
    return title.getBoundingClientRect().left - badge.getBoundingClientRect().right;
  });
  expect(settingsHeaderGap).toBeGreaterThanOrEqual(8);

  await page.locator('[data-preview-device="mobile"]').click();
  await expect(page.locator("[data-preview-stage]")).toHaveAttribute("data-active-device", "mobile");
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

  await page.locator('[data-preview-page-key="practice"]').click();
  await expect(candidateFrame.locator("body[data-page='practice']")).toBeVisible();
  const highTileLabelsFit = await candidateFrame.locator(".selection-tile[data-value='16384'], .selection-tile[data-value='32768']")
    .evaluateAll((nodes) => nodes.every((node) => {
      const label = node.querySelector<HTMLElement>(".tile-inner");
      return !!label && label.scrollWidth <= label.clientWidth;
    }));
  expect(highTileLabelsFit).toBe(true);

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
    "style/main.css?v=20260711-warm-ivory-v8"
  );
  const productionPalette = await page.locator("body").evaluate(() => ({
    page: getComputedStyle(document.body).backgroundColor,
    board: getComputedStyle(document.querySelector<HTMLElement>(".game-container")!).backgroundColor,
    score: getComputedStyle(document.querySelector<HTMLElement>(".score-container")!).backgroundColor,
    scoreText: getComputedStyle(document.querySelector<HTMLElement>(".score-container")!).color
  }));
  expect(productionPalette).toEqual({
    page: "rgb(244, 241, 234)",
    board: "rgb(199, 189, 178)",
    score: "rgb(251, 248, 241)",
    scoreText: "rgb(22, 140, 135)"
  });

  await page.goto("/modes.html", { waitUntil: "domcontentloaded" });
  const modeButton = page.locator(".mode-hub-btn").first();
  await expect(modeButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(modeButton).toHaveCSS("border-radius", "10px");
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
      pickerIconWidth: pickerIcon.width
    };
  });
  expect(style).toMatchObject({
    appearance: "base-select",
    alignItems: "center",
    borderRadius: "7px",
    minHeight: "38px",
    pickerBackground: "rgb(255, 252, 246)",
    pickerBorderRadius: "8px",
    pickerIconContent: '""',
    pickerIconHeight: "8px",
    pickerIconWidth: "8px"
  });
  expect(style.backgroundImage).toBe("none");
});
