import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function extractRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : "";
}

describe("timer leaderboard rank style", () => {
  it("uses logo-derived rank colors instead of saturated warning colors", () => {
    const css = readFileSync("style/main.css", "utf8");
    const timerboxRule = extractRule(css, "#timerbox");
    const baseRule = extractRule(css, ".timertile.timer-leaderboard-rank-tile");
    const topOneRule = extractRule(css, ".timer-leaderboard-rank-tile.is-top-1");
    const selfRule = extractRule(css, ".timer-leaderboard-row.is-self .timer-leaderboard-rank-tile");
    const nightBaseRule = extractRule(
      css,
      'html[data-night-background="1"] .timer-leaderboard-row:not(.is-self) .timer-leaderboard-rank-tile:not(.is-top-1):not(.is-top-2):not(.is-top-3)'
    );

    expect(timerboxRule).toContain("--leaderboard-rank-bg: #b9aea2;");
    expect(timerboxRule).toContain("--leaderboard-rank-text: #fffaf2;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-1-bg: #f3cd6f;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-2-bg: #7099b6;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-3-bg: #729b8b;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-1-text: #fffaf2;");
    expect(timerboxRule).toContain("--leaderboard-rank-self-bg: #b7aa9d;");
    expect(timerboxRule).toContain("--leaderboard-rank-self-text: #fffaf2;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-shadow: none;");
    expect(timerboxRule).toContain("--leaderboard-rank-self-shadow: none;");
    expect(baseRule).toContain("background: var(--leaderboard-rank-bg)");
    expect(baseRule).toContain("font-weight: var(--leaderboard-rank-font-weight);");
    expect(nightBaseRule).toContain("background: #b9aea2;");
    expect(nightBaseRule).toContain("color: #fffaf2;");
    expect(topOneRule).toContain("var(--leaderboard-rank-top-1-bg)");
    expect(topOneRule).toContain("var(--leaderboard-rank-top-1-text)");
    expect(selfRule).toContain("var(--leaderboard-rank-self-bg)");
    expect(selfRule).toContain("var(--leaderboard-rank-self-text)");
    expect(css).toContain("background: #f4eadf;");
    expect(css).not.toContain("#d8ab00");
    expect(css).not.toContain("#d61212");
  });
});
