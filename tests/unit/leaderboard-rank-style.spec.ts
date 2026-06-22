import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function extractRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : "";
}

describe("timer leaderboard rank style", () => {
  it("uses refined rank colors instead of saturated warning colors", () => {
    const css = readFileSync("style/main.css", "utf8");
    const timerboxRule = extractRule(css, "#timerbox");
    const topOneRule = extractRule(css, ".timer-leaderboard-rank-tile.is-top-1");
    const selfRule = extractRule(css, ".timer-leaderboard-row.is-self .timer-leaderboard-rank-tile");

    expect(timerboxRule).toContain("--leaderboard-rank-text: #fffaf2;");
    expect(timerboxRule).toContain("--leaderboard-rank-top-1-text: #5d4711;");
    expect(timerboxRule).toContain("--leaderboard-rank-self-text: #fff8f4;");
    expect(topOneRule).toContain("var(--leaderboard-rank-top-1-bg)");
    expect(topOneRule).toContain("var(--leaderboard-rank-top-1-text)");
    expect(selfRule).toContain("var(--leaderboard-rank-self-bg)");
    expect(selfRule).toContain("var(--leaderboard-rank-self-text)");
    expect(css).not.toContain("#d8ab00");
    expect(css).not.toContain("#d61212");
  });
});
