import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readCssEntry } from "./css-test-utils";

function extractRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : "";
}

describe("home user display style", () => {
  it("shows long nicknames without ellipsis clipping", () => {
    const css = readCssEntry("style/main.css");
    const scss = readFileSync("style/main.scss", "utf8");

    for (const source of [css, scss]) {
      const rule = extractRule(source, ".home-user-display");
      expect(rule).toContain("width: max-content;");
      expect(rule).toContain("overflow: visible;");
      expect(rule).not.toContain("max-width: 220px;");
      expect(rule).not.toContain("text-overflow: ellipsis;");
    }
  });

  it("uses a fresh stylesheet cache key on the main game page", () => {
    const html = readFileSync("2048.html", "utf8");

    expect(html).toContain("style/main.css?v=20260713-night-pages-v1");
    expect(html).not.toContain("style/main.css?v=20260626-breakout-window-controls");
    expect(html).not.toContain("style/main.css?v=20260626-flying-tiles-burst");
    expect(html).not.toContain("style/main.css?v=20260626-flying-tiles-favicon");
    expect(html).not.toContain("style/main.css?v=20260626-flying-tiles-fast");
    expect(html).not.toContain("style/main.css?v=20260626-flying-tiles-continuous");
    expect(html).not.toContain("style/main.css?v=20260626-flying-tiles-rollback");
    expect(html).not.toContain("style/main.css?v=20260625-flying-tiles-smooth");
    expect(html).not.toContain("style/main.css?v=20260625-breakout-easter-egg");
    expect(html).not.toContain('"style/main.css?v=20260625-flying-tiles"');
    expect(html).not.toContain("style/main.css?v=20260625-rank-tile-no-select");
    expect(html).not.toContain("style/main.css?v=20260625-rank-tile-pointer");
    expect(html).not.toContain("style/main.css?v=20260623-leaderboard-rank");
    expect(html).not.toContain("style/main.css?v=20260608-toolkit-align");
    expect(html).not.toContain("style/main.css?v=20260607-userdisplay");
  });

  it("keeps the top profile button on the animated icon system", () => {
    const html = readFileSync("2048.html", "utf8");
    const css = readCssEntry("style/main.css");

    expect(html).toContain('class="top-action-btn profile-btn" id="top-user-profile-btn"');
    expect(html).toContain('class="profile-line profile-head-left"');
    expect(html).toContain('class="profile-line profile-shoulder-right"');
    expect(html).toContain('class="profile-origin"');
    expect(css).toContain(".top-action-btn.profile-btn:hover .profile-line");
    expect(css).toContain("animation: profile-line-draw 0.44s linear");
    expect(css).toContain("83.333%");
    expect(html).toContain('width="34" height="34"');
    expect(css).toContain("width: 34px !important;");
    expect(css).toContain("stroke-width: 1.65;");
    expect(css).toContain('.top-action-buttons .top-action-btn:not(#top-user-profile-btn)');
    expect(css).toContain("@keyframes profile-line-draw");
    expect(css).toContain("@keyframes profile-origin-fade");
  });

  it("defines a fixed global variant without changing the home label base rule", () => {
    const css = readCssEntry("style/main.css");
    const scss = readFileSync("style/main.scss", "utf8");

    for (const source of [css, scss]) {
      const baseRule = extractRule(source, ".home-user-display");
      const globalRule = extractRule(source, ".home-user-display--global");
      expect(baseRule).toContain("position: absolute;");
      expect(globalRule).toContain("position: fixed;");
      expect(globalRule).toContain("top: 22px;");
      expect(globalRule).toContain("left: 24px;");
      expect(globalRule).toContain("text-overflow: ellipsis;");
    }
  });
});
