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
  { htmlPath: "Practice_board.html", entryPath: "./src/entries/practice-board.ts" },
  { htmlPath: "PKU2048.html", entryPath: "./src/entries/pku2048.ts" },
  { htmlPath: "achievement-icon-showcase.html", entryPath: "./src/entries/achievement-icon-showcase.ts" },
  { htmlPath: "achievement-unlock-showcase.html", entryPath: "./src/entries/achievement-unlock-showcase.ts" }
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
      '<script nomodule src="/js/legacy_index_nomodule_loader.js?v=20260625-ranked-cache"></script>'
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
    expect(html).not.toContain('id="palette-preview-legend"');
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
    expect(accountHtml).toContain('id="account-nav-history"');
    expect(accountHtml).toContain('href="history.html"');
    expect(accountHtml).not.toContain('id="account-nav-achievements"');
    expect(accountHtml).not.toContain('href="achievements.html"');
    expect(accountHtml).not.toContain('href="medal-wall.html"');

    const userHtml = readHtml("user.html");
    expect(userHtml).toContain('id="user-nav-history"');
    expect(userHtml).toContain('href="history.html"');
  });

  it("admin.html includes the achievement management mounts", () => {
    const html = readHtml("admin.html");

    [
      'id="admin-achievement-list"',
      'id="admin-achievement-name"',
      'id="admin-achievement-description"',
      'id="admin-achievement-rule-type"',
      'id="admin-achievement-create"',
      'id="admin-achievement-save"',
      'id="admin-achievement-upload-icon"',
      'id="admin-achievement-grant"',
      'id="admin-achievement-backfill"'
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
    expect(html).toContain("已点亮和未点亮的成就会同时展示");
  });

  it("does not keep the old public achievements direct page", () => {
    expect(existsSync(path.resolve(process.cwd(), "achievements.html"))).toBe(false);
  });
});
