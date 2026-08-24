import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

interface HtmlEntryExpectation {
  htmlPath: string;
  entryPath: string;
}

const ENTRY_PAGES: HtmlEntryExpectation[] = [
  { htmlPath: "2048.html", entryPath: "./src/entries/index.ts" },
  { htmlPath: "history.html", entryPath: "./src/entries/history.ts" },
  { htmlPath: "relay_5x5.html", entryPath: "./src/entries/relay-5x5.ts" },
  { htmlPath: "modes.html", entryPath: "./src/entries/modes.ts" },
  { htmlPath: "account.html", entryPath: "./src/entries/account.ts" },
  { htmlPath: "medal-wall.html", entryPath: "./src/entries/achievements.ts" },
  { htmlPath: "account_settings.html", entryPath: "./src/entries/account-settings.ts" },
  { htmlPath: "register.html", entryPath: "./src/entries/register.ts" },
  { htmlPath: "password.html", entryPath: "./src/entries/password.ts" },
  { htmlPath: "user.html", entryPath: "./src/entries/user-profile.ts" },
  { htmlPath: "palette.html", entryPath: "./src/entries/palette.ts" },
  { htmlPath: "touch_sensitivity.html", entryPath: "./src/entries/touch-sensitivity.ts" },
  { htmlPath: "replay.html", entryPath: "./src/entries/replay.ts" },
  { htmlPath: "play.html", entryPath: "./src/entries/play.ts" },
  { htmlPath: "undo_2048.html", entryPath: "./src/entries/undo.ts" },
  { htmlPath: "capped_2048.html", entryPath: "./src/entries/capped.ts" },
  { htmlPath: "Practice_board.html", entryPath: "./src/entries/practice-board.ts" }
];

const TIMER_LEADERBOARD_SHELL_PAGES = ["2048.html", "play.html", "undo_2048.html", "capped_2048.html"];

function readHtml(relativePath: string): string {
  const htmlPath = path.resolve(process.cwd(), relativePath);
  return readFileSync(htmlPath, "utf8");
}

describe("module entry html pages", () => {
  it("index.html (blog homepage) does not include runtime module entry", () => {
    const html = readHtml("index.html");
    const moduleScripts = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g) || [];
    const legacyJsScripts = html.match(/<script\b[^>]*src="js\/[^"]+"[^>]*><\/script>/g) || [];

    expect(moduleScripts).toEqual([]);
    expect(legacyJsScripts).toEqual([]);
  });

  for (const entry of ENTRY_PAGES) {
    it(`${entry.htmlPath} uses a single module entry`, () => {
      const html = readHtml(entry.htmlPath);
      const moduleScripts = (html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g) || [])
        .filter((script) => script.includes("/src/entries/") || script.includes("./src/entries/"));
      const legacyJsScripts = html.match(/<script\b[^>]*src="js\/[^"]+"[^>]*><\/script>/g) || [];

      expect(moduleScripts).toHaveLength(1);
      expect(html).toContain(`type="module" src="${entry.entryPath}"`);
      expect(legacyJsScripts).toEqual([]);
    });
  }

  it("2048.html provides a nomodule fallback for old embedded browsers", () => {
    const html = readHtml("2048.html");

    expect(html).toContain(
      '<script nomodule src="/js/legacy_index_nomodule_loader.js?v=20260803-operation-feedback"></script>'
    );
    expect(html.indexOf("legacy_index_nomodule_loader.js")).toBeLessThan(
      html.indexOf('type="module" src="./src/entries/index.ts"')
    );
  });

  it("palette.html preserves required palette editor mounts", () => {
    const html = readHtml("palette.html");

    expect(html).toContain('id="palette-editor-pow2"');
    expect(html).toContain('id="palette-editor-fib"');
    expect(html).toContain('id="palette-preview-pow2"');
    expect(html).toContain('id="palette-preview-fib"');
    expect(html).toContain('id="timer-settings" class="palette-settings-section"');
    expect(html).not.toContain('class="card-surface palette-settings-card"');
    expect(html).toContain('id="custom-secondary-timer-editor"');
    expect(html).toContain('<strong>计时器</strong>');
    expect(html).toContain('<small>自定义子计时器规则</small>');
    expect(html).toContain('id="custom-secondary-timer-editor" class="settings-disclosure" open');
    expect(html).not.toContain('class="settings-disclosure-action"');
    expect(html).not.toContain('id="palette-preview-legend"');
  });

  it("palette.html keeps every settings workspace expanded", () => {
    const html = readHtml("palette.html");

    expect(html).toContain('id="appearance-settings" class="palette-settings-section"');
    expect(html).not.toContain('id="appearance-settings" class="palette-settings-section" hidden');
    expect(html).toContain('class="settings-category-active-bookmark" aria-hidden="true"></span>');
    expect(html).toContain('href="#appearance-settings" aria-controls="appearance-settings" aria-current="location"');
    expect(html).toContain('href="#timer-settings" aria-controls="timer-settings"');
    expect(html).toContain('id="appearance-settings-editor"');
    expect(html).toContain('id="appearance-settings-editor" class="settings-disclosure appearance-settings-disclosure" open');
    expect(html).toContain('class="settings-disclosure appearance-settings-disclosure"');
    expect(html).not.toContain('id="theme-selection-editor"');
  });

  it("palette.html exposes the top language switcher", () => {
    const html = readHtml("palette.html");

    expect(html).not.toContain('href="#language-settings" aria-controls="language-settings"');
    expect(html).not.toContain('id="language-settings" class="palette-settings-section"');
    expect(html).not.toContain('id="ui-language-toggle"');
    expect(html).toContain('class="palette-settings-menu palette-language-switch"');
    expect(html).toContain('class="palette-settings-popover" role="menu" aria-label="界面语言"');
    expect(html).toContain('data-ui-language="zh"');
    expect(html).toContain('data-ui-language="en"');
    expect(html).not.toContain('id="operation-feedback-toggle"');
  });

  it("palette.html exposes the beginner guide settings entry", () => {
    const html = readHtml("palette.html");

    expect(html).toContain('href="#contextual-guide-settings" aria-controls="contextual-guide-settings"');
    expect(html).not.toContain('class="replay-button palette-nav-btn palette-guide-entry"');
    expect(html).toContain('id="contextual-guide-settings" class="palette-settings-section"');
    expect(html).toContain('id="contextual-guide-catalog-row"');
    expect(html).toContain('<strong>新手指引</strong>');
  });

  it("palette settings navigation keeps labels left aligned at every breakpoint", () => {
    const css = readHtml("style/palette_page.css");
    const categoryLinkRules = css.match(/\.settings-category-link \{[\s\S]*?\n  \}/g) || [];

    expect(categoryLinkRules).toHaveLength(2);
    expect(categoryLinkRules.every((rule) => rule.includes("justify-content: flex-start;"))).toBe(true);
  });

  it("palette settings keeps independent spacing between the right-side modules", () => {
    const css = readHtml("style/palette_page.css");
    const contentRule = css.match(/\.settings-category-content \{[\s\S]*?\n\}/)?.[0] || "";

    expect(contentRule).toContain("display: grid;");
    expect(contentRule).toContain("gap: 20px;");
  });

  it("operation feedback editor uses a real page overlay instead of a nested dialog", () => {
    const css = readHtml("style/components/operation-feedback-settings.css");

    expect(css).toContain(".operation-feedback-overlay {");
    expect(css).not.toContain(".operation-feedback-layout-modal");
    expect(css).toContain("--operation-feedback-slot-pitch: 66px;");
    expect(css).toMatch(/\.operation-feedback-overlay,\s*\n\.operation-feedback-surface,\s*\n\.operation-feedback-key-stack \{[\s\S]*?width: 96px;[\s\S]*?height: 520px;/);
    expect(css).toMatch(/\.operation-feedback-key \{[\s\S]*?width: 58px;[\s\S]*?height: 58px;[\s\S]*?border-radius: 17px;/);
    expect(css).toMatch(/\.operation-feedback-key\.is-wide \{[\s\S]*?width: 96px;/);
    expect(css).toContain("font-size: 28px;");
    expect(css).toContain("font-weight: 780;");
    expect(css).toContain("stroke-width: 4.8;");
    expect(css).toContain('html[data-theme="mist_cyan"]');
    expect(css).toContain(".operation-feedback-key.is-invalid");
    expect(css).toContain("transition-duration: 240ms;");
    expect(css).toContain("transition-duration: 280ms;");
    ["0.80", "0.64", "0.50", "0.38", "0.29", "0.21", "0.14"].forEach((opacity) => {
      expect(css).toContain(`opacity: ${opacity};`);
    });
    expect(css).toContain(".operation-feedback-overlay.placement-edge .operation-feedback-editor-tools {");
    expect(css).toMatch(/\.operation-feedback-overlay\.is-locked \{[\s\S]*?pointer-events: auto;/);
    expect(css).not.toMatch(/\.operation-feedback-overlay\.is-editing\s*\{[^}]*padding:/);
    expect(css).not.toMatch(/\.operation-feedback-overlay\.is-locked\s*\{[^}]*padding:/);
    expect(css).toContain(".operation-feedback-overlay.is-locked:hover .operation-feedback-lock");
    expect(css).toMatch(/\.operation-feedback-overlay\.is-locked \.operation-feedback-lock::after \{[\s\S]*?top: 100%;[\s\S]*?height: 8px;/);
    expect(css).toMatch(/\.operation-feedback-editor-tools \{[\s\S]*?position: absolute;[\s\S]*?left: 108px;/);
    expect(css).toMatch(/\.operation-feedback-overlay\.placement-edge \.operation-feedback-editor-tools \{[\s\S]*?right: 108px;[\s\S]*?left: auto;/);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*?transition-property: color, background-color, border-color, opacity;/);
  });

  it("operation feedback wakes immediately but fades out over 400ms", () => {
    const css = readHtml("style/components/operation-feedback-settings.css");

    expect(css).toMatch(/\.operation-feedback-key-stack \{[\s\S]*?transition: opacity 0ms ease;/);
    expect(css).toMatch(/\.operation-feedback-overlay\.is-idle \.operation-feedback-key-stack \{[\s\S]*?opacity: 0;[\s\S]*?transition-duration: 400ms;/);
  });

  it("reduced motion keeps entering at its age and leaving at the top", () => {
    const css = readHtml("style/components/operation-feedback-settings.css");

    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*?\.operation-feedback-key\.is-entering \{[\s\S]*?translateY\(var\(--operation-feedback-age-y\)\) scale\(1\);/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*?\.operation-feedback-key\.is-leaving \{[\s\S]*?translateY\(calc\(-7 \* var\(--operation-feedback-slot-pitch\)\)\) scale\(1\);/);
  });

  for (const htmlPath of TIMER_LEADERBOARD_SHELL_PAGES) {
    it(`${htmlPath} includes a static timer leaderboard placeholder shell`, () => {
      const html = readHtml(htmlPath);
      const timerBoxStart = html.indexOf('id="timerbox"');
      const timerBoxEnd = html.indexOf('<div class="game-container"', timerBoxStart);
      const timerBoxHtml = html.slice(timerBoxStart, timerBoxEnd);
      const placeholderRows = timerBoxHtml.match(/class="timer-leaderboard-row/g) || [];

      expect(timerBoxStart, `${htmlPath} should include #timerbox`).toBeGreaterThanOrEqual(0);
      expect(timerBoxEnd, `${htmlPath} should include a game container after #timerbox`).toBeGreaterThan(timerBoxStart);
      expect(timerBoxHtml).toContain('id="timer-leaderboard-panel"');
      expect(timerBoxHtml).toContain('id="timer-leaderboard-summary"');
      expect(timerBoxHtml).toContain('id="timer-leaderboard-list"');
      expect(timerBoxHtml).toContain('aria-busy="true"');
      expect(placeholderRows).toHaveLength(11);
      expect(timerBoxHtml).toContain('class="timertile timer-leaderboard-rank-tile is-top-1"');
      expect(timerBoxHtml).toContain('class="timertile timer-leaderboard-rank-tile is-top-2"');
      expect(timerBoxHtml).toContain('class="timertile timer-leaderboard-rank-tile is-top-3"');
      expect(timerBoxHtml).toContain('class="timer-leaderboard-row is-self"');
    });
  }

  it("moves local history entry from game headers to account-related pages", () => {
    for (const htmlPath of TIMER_LEADERBOARD_SHELL_PAGES) {
      const html = readHtml(htmlPath);
      const topActionsStart = html.indexOf('class="top-action-buttons"');
      const topActionsEnd = html.indexOf("</div>", topActionsStart);
      const topActionsHtml = html.slice(topActionsStart, topActionsEnd);

      expect(topActionsStart, `${htmlPath} should include top actions`).toBeGreaterThanOrEqual(0);
      expect(topActionsHtml).not.toContain('id="top-history-btn"');
      expect(topActionsHtml).not.toContain('href="history.html"');
    }

    const accountHtml = readHtml("account.html");
    expect(accountHtml).toContain('id="account-nav-settings"');
    expect(accountHtml).toContain('href="account_settings.html"');
    expect(accountHtml).not.toContain('id="account-nav-history"');
    expect(accountHtml).not.toContain('id="account-nav-palette"');
    expect(accountHtml).not.toContain('id="account-nav-practice"');
    expect(accountHtml).not.toContain('id="account-nav-achievements"');
    expect(accountHtml).not.toContain('href="achievements.html"');
    expect(accountHtml).not.toContain('href="medal-wall.html"');

    const userHtml = readHtml("user.html");
    expect(userHtml).toContain('id="user-nav-settings"');
    expect(userHtml).toContain('href="account_settings.html"');
    expect(userHtml).toContain('id="user-nav-history"');
    expect(userHtml).toContain('href="history.html"');
    expect(userHtml).toContain('id="user-nav-replay"');
    expect(userHtml).toContain('href="replay.html"');
    expect(userHtml).toContain('id="user-nav-palette"');
    expect(userHtml).toContain('href="palette.html"');
    expect(userHtml).toContain('id="user-nav-practice"');
    expect(userHtml).toContain('href="Practice_board.html"');
  });

  it("admin.html exposes the dynamic admin console mounts", () => {
    const html = readHtml("admin.html");

    [
      'id="admin-gate"',
      'id="admin-shell"',
      'id="admin-sidebar"',
      'id="admin-topbar"',
      'id="admin-content"',
      'id="admin-dialog"',
      'id="admin-toast"',
      'src="/src/entries/admin.ts"'
    ].forEach((fragment) => {
      expect(html).toContain(fragment);
    });
  });

  it("medal-wall.html exposes the centered username and medal wall", () => {
    const html = readHtml("medal-wall.html");

    expect(html).toContain('id="achievements-user-name"');
    expect(html).toContain('class="achievements-header-user"');
    expect(html).not.toContain('id="achievements-user-link"');
    expect(html).toContain("成就勋章墙");
    expect(html).toContain('id="achievement-family-dialog"');
  });

  it("does not keep the old public achievements direct page", () => {
    expect(existsSync(path.resolve(process.cwd(), "achievements.html"))).toBe(false);
  });

  it("does not keep the duplicate PKU practice page", () => {
    expect(existsSync(path.resolve(process.cwd(), "PKU2048.html"))).toBe(false);
    expect(existsSync(path.resolve(process.cwd(), "src/entries/pku2048.ts"))).toBe(false);
  });
});
