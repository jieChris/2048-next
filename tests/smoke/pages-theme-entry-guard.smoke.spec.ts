import { expect, test } from "@playwright/test";

import { mockAcceptedBetaAccess } from "./support/beta-access";
import { waitForWindowCondition } from "./support/runtime-ready";

const FORBIDDEN_SETTINGS_SELECTORS = [
  "#visual-theme-select",
  "#color-scheme-select",
  "#settings-theme-select",
  "#settings-modal #theme-select",
  "#settings-modal [name='visual-theme']",
  "#settings-modal [name='color-scheme']",
  "#settings-modal [data-visual-theme]",
  "#settings-modal [data-color-scheme]",
  "#settings-modal .liquid-glass",
  "#settings-modal .visual-theme",
  "#settings-modal .color-scheme"
];

test.describe("Visual theme entry guard", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/ranked-session/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "ranked session unavailable in theme guard smoke"
        })
      });
    });
    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await page.route("**/api/user/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    await mockAcceptedBetaAccess(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("home_guide_seen_v1", "1");
      window.localStorage.setItem("practice_guide_shown_v2", "1");
      window.localStorage.setItem("practice_guide_mobile_shown_v1", "1");
      window.localStorage.setItem("theme_profile_v1", "classic");
      window.localStorage.setItem("tile_palette_active_v1", "follow-theme");
      window.localStorage.removeItem("visual_theme_v1");
      window.localStorage.removeItem("color_scheme_v1");
      window.localStorage.removeItem("settings_theme_select_v1");
    });
  });

  test("settings modal does not host visual theme switching controls", async ({ page }) => {
    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Home response should exist").not.toBeNull();
    expect(response?.ok(), "Home response should be 2xx").toBeTruthy();

    await waitForWindowCondition(
      page,
      () => typeof (window as any).openSettingsModal === "function",
      15_000
    );

    await page.evaluate(() => {
      (window as any).openSettingsModal();
    });
    await expect(page.locator("#settings-modal")).toHaveCSS("display", "flex");
    await expect(page.locator("#toolkit-palette-link")).toBeVisible();

    const snapshot = await page.evaluate((forbiddenSelectors) => {
      const modal = document.getElementById("settings-modal");
      const content = modal?.querySelector(".settings-modal-content") as HTMLElement | null;
      const paletteLink = document.getElementById("toolkit-palette-link") as HTMLAnchorElement | null;
      const directToggleInputIds = content
        ? Array.from(content.children)
            .filter((child) => child.classList.contains("settings-toggle-row"))
            .flatMap((row) =>
              Array.from(row.querySelectorAll("input[type='checkbox']")).map((input) =>
                String((input as HTMLInputElement).id || "")
              )
          )
        : [];
      const forbiddenSelectorMatches = content
        ? forbiddenSelectors.filter((selector) => Boolean(document.querySelector(selector)))
        : forbiddenSelectors;
      const forbiddenIdentityMatches = content
        ? Array.from(content.querySelectorAll("*"))
            .map((element) => {
              const className =
                typeof (element as HTMLElement).className === "string"
                  ? (element as HTMLElement).className
                  : "";
              return `${element.id || ""} ${className} ${
                element.getAttribute("name") || ""
              } ${element.getAttribute("data-visual-theme") || ""} ${
                element.getAttribute("data-color-scheme") || ""
              }`;
            })
            .filter((value) =>
              /liquid-glass|visual-theme|color-scheme|settings-theme-select/iu.test(value)
            )
        : [];
      const forbiddenControlTextMatches = content
        ? Array.from(
            content.querySelectorAll("button,a,label,select,input,[role='button'],[role='switch']")
          )
            .map((element) =>
              String((element.textContent || element.getAttribute("aria-label") || "").trim())
            )
            .filter((text) => /liquid glass|visual theme|color scheme/iu.test(text))
        : [];
      const modalRect = content?.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      return {
        modalExists: Boolean(modal),
        contentExists: Boolean(content),
        directToggleInputIds,
        forbiddenSelectorMatches,
        forbiddenIdentityMatches,
        forbiddenControlTextMatches,
        paletteLinkTag: paletteLink?.tagName || "",
        paletteHref: paletteLink?.getAttribute("href") || "",
        visualThemeStorage: window.localStorage.getItem("visual_theme_v1"),
        colorSchemeStorage: window.localStorage.getItem("color_scheme_v1"),
        settingsThemeSelectStorage: window.localStorage.getItem("settings_theme_select_v1"),
        contentWithinViewport: modalRect
          ? modalRect.left >= 0 &&
            modalRect.top >= 0 &&
            modalRect.right <= viewportWidth &&
            modalRect.bottom <= viewportHeight
          : false
      };
    }, FORBIDDEN_SETTINGS_SELECTORS);

    expect(snapshot.modalExists).toBe(true);
    expect(snapshot.contentExists).toBe(true);
    expect(snapshot.directToggleInputIds).toEqual(
      expect.arrayContaining(["win-prompt-toggle", "bgm-toggle", "night-bg-toggle"])
    );
    expect(snapshot.forbiddenSelectorMatches).toEqual([]);
    expect(snapshot.forbiddenIdentityMatches).toEqual([]);
    expect(snapshot.forbiddenControlTextMatches).toEqual([]);
    expect(snapshot.paletteLinkTag).toBe("A");
    expect(snapshot.paletteHref).toBe("palette.html");
    expect(snapshot.visualThemeStorage).toBeNull();
    expect(snapshot.colorSchemeStorage).toBeNull();
    expect(snapshot.settingsThemeSelectStorage).toBeNull();
    expect(snapshot.contentWithinViewport).toBe(true);
  });
});
