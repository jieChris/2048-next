import { expect, test } from "@playwright/test";

const VARIANTS = ["current", "enamel"] as const;
const TOP_ACTIONS = [
  "announcement",
  "profile",
  "stats",
  "reset",
  "export",
  "practice",
  "mode",
  "history",
  "settings"
] as const;

const MOBILE_ONLY_ACTIONS = [
  "hint",
  "game-undo",
  "practice-undo",
  "timer-expand",
  "timer-collapse",
  "actions-expand",
  "actions-collapse"
] as const;

const CSS_ANIMATION_ASSERTIONS = [
  ["announcement", ".announce-wave-1", "announcement-wave-in"],
  ["profile", ".profile-head-left", "profile-line-draw"],
  ["stats", ".stats-line-left", "stats-line-rise-in"],
  ["mode", ".mode-quad-tl", "mode-quad-out-tl"],
  ["history", ".history-hand-long", "history-long-spin"],
  ["settings", "svg", "settings-spin-once"]
] as const;

const SCRIPTED_ANIMATION_ASSERTIONS = [
  ["reset", ".reset-top-mover"],
  ["export", ".export-arrow-mover"],
  ["practice", ".practice-arrow-mover"]
] as const;

test("button preview reuses real top-action SVGs and animations", async ({ page }) => {
  const response = await page.goto("/ui-preview.html", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();

  await expect(page.locator("[data-preview-button-workbench]")).toBeVisible();

  for (const variant of VARIANTS) {
    const column = page.locator(`[data-preview-variant="${variant}"]`);
    await expect(column).toHaveCount(1);

    for (const action of TOP_ACTIONS) {
      await expect(column.locator(`[data-preview-top-action="${action}"] svg`)).toHaveCount(1);
    }

    for (const action of MOBILE_ONLY_ACTIONS) {
      const button = column.locator(`[data-preview-mobile-action="${action}"]`);
      await expect(button).toBeVisible();
      await expect(button.locator("svg")).toHaveCount(1);
    }
  }

  const signatures = await page.evaluate(({ variants, actions }) => {
    return actions.map((action) => {
      return variants.map((variant) => {
        const svg = document.querySelector(
          `[data-preview-variant="${variant}"] [data-preview-top-action="${action}"] svg`
        );
        return svg?.outerHTML || "";
      });
    });
  }, { variants: VARIANTS, actions: TOP_ACTIONS });

  for (const signatureSet of signatures) {
    expect(new Set(signatureSet).size).toBe(1);
    expect(signatureSet[0]).toContain("<svg");
  }

  const mobileSignatures = await page.evaluate(({ variants, actions }) => {
    return actions.map((action) => {
      return variants.map((variant) => {
        const svg = document.querySelector(
          `[data-preview-variant="${variant}"] [data-preview-mobile-action="${action}"] svg`
        );
        return svg?.outerHTML || "";
      });
    });
  }, { variants: VARIANTS, actions: MOBILE_ONLY_ACTIONS });

  for (const signatureSet of mobileSignatures) {
    expect(new Set(signatureSet).size).toBe(1);
    expect(signatureSet[0]).toContain("<svg");
  }

  const currentProfile = page.locator(
    '[data-preview-variant="current"] [data-preview-top-action="profile"]'
  );
  await expect.poll(() => currentProfile.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      display: style.display,
      width: style.width,
      height: style.height,
      borderRadius: style.borderRadius
    };
  })).toEqual({
    display: "flex",
    width: "50px",
    height: "50px",
    borderRadius: "12px"
  });

  const enamelProfile = page.locator(
    '[data-preview-variant="enamel"] [data-preview-top-action="profile"]'
  );
  const candidateChrome = await enamelProfile.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      display: style.display,
      width: style.width,
      height: style.height,
      borderRadius: style.borderRadius
    };
  });
  expect(candidateChrome).toEqual({
    display: "flex",
    width: "46px",
    height: "46px",
    borderRadius: "7px"
  });

  const enamelBand = await enamelProfile.evaluate((button) => {
    const band = getComputedStyle(button, "::before");
    return {
      width: band.width,
      opacity: band.opacity,
      transitionProperty: band.transitionProperty
    };
  });
  expect(enamelBand.width).toBe("3px");
  expect(enamelBand.opacity).toBe("1");
  expect(enamelBand.transitionProperty).toContain("width");
  expect(enamelBand.transitionProperty).toContain("opacity");

  await expect(page.locator("#theme-dynamic-style")).toHaveCount(0);

  await page.locator("body").evaluate((body) => {
    body.setAttribute("data-top-button-style", "text");
  });
  const currentStats = page.locator(
    '[data-preview-variant="current"] [data-preview-top-action="stats"]'
  );
  await expect.poll(() => currentStats.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      width: style.width,
      padding: style.padding
    };
  })).not.toEqual({
    width: "50px",
    padding: "0px"
  });
  await page.locator("body").evaluate((body) => {
    body.removeAttribute("data-top-button-style");
  });

  for (const variant of VARIANTS) {
    for (const [action, targetSelector, animationName] of CSS_ANIMATION_ASSERTIONS) {
      const button = page.locator(
        `[data-preview-variant="${variant}"] [data-preview-top-action="${action}"]`
      );
      await button.hover();
      await expect.poll(() => button.locator(targetSelector).evaluate((target) => {
        return getComputedStyle(target).animationName;
      })).toContain(animationName);
    }

    for (const [action, targetSelector] of SCRIPTED_ANIMATION_ASSERTIONS) {
      const button = page.locator(
        `[data-preview-variant="${variant}"] [data-preview-top-action="${action}"]`
      );
      await button.hover();
      await expect.poll(() => button.locator(targetSelector).evaluate((target) => {
        return (target as SVGElement).style.offsetDistance;
      })).not.toBe("0%");
    }
  }

  const beforeClickUrl = page.url();
  await page.locator('[data-preview-variant="current"] [data-preview-action="back"]').click();
  await expect(page).toHaveURL(beforeClickUrl);
});

test("production top actions use enamel chrome without dynamic theme CSS", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("settings_top_button_style_v1", "icon");
    localStorage.setItem("2048_beta_access_smoke_bypass_v1", "1");
    localStorage.setItem("theme_profile_v1", "mist_cyan");
  });

  const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).toHaveAttribute("data-top-button-style", "icon");

  await page.locator("#theme-dynamic-style").evaluate((style) => style.remove());

  const profile = page.locator("#top-user-profile-btn");
  await expect.poll(() => profile.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      display: style.display,
      width: style.width,
      height: style.height,
      borderRadius: style.borderRadius
    };
  })).toEqual({
    display: "flex",
    width: "46px",
    height: "46px",
    borderRadius: "7px"
  });
  expect(await profile.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height
    };
  })).toEqual({
    width: 46,
    height: 46
  });

  const band = await profile.evaluate((button) => {
    const style = getComputedStyle(button, "::before");
    return {
      width: style.width,
      opacity: style.opacity
    };
  });
  expect(band).toEqual({
    width: "3px",
    opacity: "1"
  });
});

test("production mobile-only top actions use enamel chrome without horizontal overflow", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("settings_top_button_style_v1", "icon");
    localStorage.setItem("2048_beta_access_smoke_bypass_v1", "1");
    localStorage.setItem("theme_profile_v1", "mist_cyan");
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
  const expandButton = page.locator("#top-actions-expand-toggle");
  await expect(expandButton).toBeVisible();
  await expandButton.click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(220);

  for (const selector of ["#top-mobile-hint-btn", "#top-actions-expand-toggle", "#timerbox-toggle-btn"]) {
    const button = page.locator(selector);
    await expect(button).toBeVisible();
    const chrome = await button.evaluate((node) => {
      const style = getComputedStyle(node);
      const band = getComputedStyle(node, "::before");
      return {
        width: style.width,
        height: style.height,
        borderRadius: style.borderRadius,
        bandWidth: band.width,
        bandOpacity: band.opacity
      };
    });
    expect(chrome).toMatchObject({
      height: "46px",
      borderRadius: "7px",
      bandWidth: "3px",
      bandOpacity: "1"
    });
    expect(Number.parseFloat(chrome.width)).toBeGreaterThanOrEqual(46);
    expect(Number.parseFloat(chrome.width)).toBeLessThanOrEqual(64);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/Practice_board.html", { waitUntil: "domcontentloaded" });
  const practiceUndo = page.locator("#practice-mobile-undo-btn");
  await expect(practiceUndo).toBeVisible();
  const practiceChrome = await practiceUndo.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      width: style.width,
      height: style.height,
      borderRadius: style.borderRadius
    };
  });
  expect(practiceChrome).toMatchObject({
    height: "46px",
    borderRadius: "7px"
  });
  expect(Number.parseFloat(practiceChrome.width)).toBeGreaterThanOrEqual(46);
  expect(Number.parseFloat(practiceChrome.width)).toBeLessThanOrEqual(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("production button families use mist cyan semantic tones while excluded pages stay unchanged", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("2048_beta_access_smoke_bypass_v1", "1");
    localStorage.setItem("theme_profile_v1", "mist_cyan");
  });

  await page.goto("/account.html", { waitUntil: "domcontentloaded" });
  const accountButton = page.locator("#account-board-refresh");
  await expect(accountButton).toBeVisible();
  await expect.poll(() => accountButton.evaluate((button) => {
    const style = getComputedStyle(button);
    const band = getComputedStyle(button, "::before");
    return {
      minHeight: style.minHeight,
      borderRadius: style.borderRadius,
      bandWidth: band.width,
      bandOpacity: band.opacity
    };
  })).toEqual({
    minHeight: "42px",
    borderRadius: "7px",
    bandWidth: "3px",
    bandOpacity: "1"
  });

  await page.goto("/history.html", { waitUntil: "domcontentloaded" });
  const dangerButton = page.locator("#history-clear-all-btn");
  await expect(dangerButton).toBeVisible();
  await expect.poll(() => dangerButton.evaluate((button) => {
    const style = getComputedStyle(button);
    const band = getComputedStyle(button, "::before");
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      bandColor: band.backgroundColor
    };
  })).toEqual({
    color: "rgb(167, 70, 59)",
    backgroundColor: "rgb(255, 249, 246)",
    bandColor: "rgb(167, 70, 59)"
  });

  await page.goto("/palette.html#appearance-settings", { waitUntil: "domcontentloaded" });
  await page.locator("#appearance-settings-editor summary").click();
  const disabledButton = page.locator("#palette-rename-btn");
  await expect(disabledButton).toBeVisible();
  await expect(disabledButton).toBeDisabled();
  await expect.poll(() => disabledButton.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      opacity: style.opacity,
      cursor: style.cursor,
      transform: style.transform
    };
  })).toEqual({
    opacity: "0.42",
    cursor: "not-allowed",
    transform: "none"
  });

  await page.goto("/medal-wall.html", { waitUntil: "domcontentloaded" });
  const activeFilter = page.locator(".achievement-filter.is-active");
  await expect(activeFilter).toBeVisible();
  await expect.poll(() => activeFilter.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      minHeight: style.minHeight,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor
    };
  })).toEqual({
    minHeight: "42px",
    borderRadius: "7px",
    backgroundColor: "rgb(32, 56, 61)"
  });

  await page.goto("/relay_5x5.html", { waitUntil: "domcontentloaded" });
  const relayPrimary = page.locator("#relay-refresh-btn");
  const relayGhost = page.locator("#relay-page-prev-btn");
  await expect(relayPrimary).toBeVisible();
  await expect(relayGhost).toBeVisible();
  await expect.poll(() => relayPrimary.evaluate((button) => {
    return getComputedStyle(button).backgroundColor;
  })).toBe("rgb(32, 56, 61)");
  await expect.poll(() => relayGhost.evaluate((button) => {
    return getComputedStyle(button).backgroundColor;
  })).toBe("rgba(0, 0, 0, 0)");

  await page.goto("/stone_2k_monitor.html", { waitUntil: "domcontentloaded" });
  const stonePrimary = page.locator("#stone-access-submit");
  await expect(stonePrimary).toBeVisible();
  await expect.poll(() => stonePrimary.evaluate((button) => {
    return getComputedStyle(button).backgroundColor;
  })).toBe("rgb(32, 56, 61)");

  await page.goto("/modes.html", { waitUntil: "domcontentloaded" });
  const modeButton = page.locator(".mode-tab-button").first();
  await expect(modeButton).toBeVisible();
  expect(await modeButton.evaluate((button) => {
    return getComputedStyle(button, "::before").content;
  })).toBe("none");
});
