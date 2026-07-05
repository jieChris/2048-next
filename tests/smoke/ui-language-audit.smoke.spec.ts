import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  "/2048.html",
  "/index.html",
  "/play.html",
  "/undo_2048.html",
  "/capped_2048.html",
  "/Practice_board.html",
  "/PKU2048.html",
  "/replay.html",
  "/modes.html",
  "/history.html",
  "/user.html",
  "/account.html",
  "/account_settings.html",
  "/register.html",
  "/password.html",
  "/medal-wall.html",
  "/admin.html",
  "/beta-login.html",
  "/beta-access.html",
  "/palette.html",
  "/touch_sensitivity.html",
  "/relay_5x5.html",
  "/stone_2k_monitor.html",
  "/api-docs.html",
  "/cache-reset.html",
  "/favicon-preview.html",
  "/ui-preview.html",
  "/easter-eggs/breakout/index.html",
  "/ranked_seed_validator.html"
];

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const ZH_EN_UI_LEAK_RE =
  /\b(?:Admin Console|Account Center|Back To Game|Authorization Status|Data Query|Load Table Data|Export Query Result|Custom SQL|Run Query|Beta User Management|Super Admin Management|Issue Rescue Game|Issue Rescue Offer|Achievement Management|Manual Grant|History Backfill|Palette Center|Theme & Modes|Select Theme|Theme Preview|Palette List|New Copy|Rename|Delete|Export|Import|Background Color|Color Preview|Favicon Preview|Chrome tab mock|Actual sizes|Magnified inspection|Legacy production icon|Ranked Seed Validator|OFFLINE VALIDATION SURFACE|Manual seed input only|Start Game|History Ranking|Open Game|Restore Game|Keep Playing|Close|Minimize|Pause|Home|Practice Board|Mode Selection|Export Replay|New Game|Settings|Announcements|Stats|Language|Win Prompt|Background Music|Night Mode|Login|Register|Password|Email|Nickname)\b/;

async function installApiMocks(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/admin/me")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          admin: true,
          data: {
            admin: true,
            rootAdmin: true,
            canManageSuperAdmins: true
          },
          user: {
            id: 0,
            nickname: "Admin"
          }
        })
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: "api_unavailable"
      })
    });
  });
}

async function installLanguage(page: Page, language: "en" | "zh"): Promise<void> {
  await page.addInitScript((lang) => {
    localStorage.setItem("2048_beta_access_smoke_bypass_v1", "1");
    localStorage.setItem("ui_language_v1", lang);
    localStorage.setItem("2048_auth_token_v1", "smoke-token");
  }, language);
}

async function collectAuditText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const parts: string[] = [];
    parts.push(document.title || "");
    parts.push(document.body.innerText || "");
    for (const element of Array.from(
      document.querySelectorAll("input, textarea, button, a, img, [title], [aria-label], option")
    )) {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      for (const attr of ["placeholder", "title", "aria-label", "alt", "value"]) {
        const value = element.getAttribute(attr);
        if (value && value.trim()) parts.push(value.trim());
      }
    }
    return parts.join("\n");
  });
}

test.describe("UI language audit", () => {
  test.describe("English UI", () => {
    test.beforeEach(async ({ page }) => {
      await installApiMocks(page);
      await installLanguage(page, "en");
    });

    for (const path of PAGES) {
      test(`has no Chinese text on ${path}`, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(900);

        const visibleText = await collectAuditText(page);

        expect(visibleText).not.toMatch(CJK_RE);
      });
    }
  });

  test.describe("Chinese UI", () => {
    test.beforeEach(async ({ page }) => {
      await installApiMocks(page);
      await installLanguage(page, "zh");
    });

    for (const path of PAGES) {
      test(`has no obvious English UI labels on ${path}`, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(900);

        const visibleText = await collectAuditText(page);

        expect(visibleText).not.toMatch(ZH_EN_UI_LEAK_RE);
      });
    }
  });
});
