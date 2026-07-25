import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function functionBody(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing_source_range:${start}`);
  return source.slice(from, to);
}

describe("legacy Web leaderboard rank authority", () => {
  it("renders backend rank in timer, self, mode-intro, and full leaderboard rows", () => {
    const online = readFileSync("js/online_leaderboard_runtime.js", "utf8");
    const account = readFileSync("js/account_page.js", "utf8");

    for (const body of [
      functionBody(online, "function renderTimerLeaderboardRows", "function renderTimerLeaderboardPlaceholderRows"),
      functionBody(online, "function resolveSelfRank", "function syncTimerLeaderboardViewMode"),
      functionBody(online, "function renderModeIntroLeaderboard", "async function refreshLeaderboard"),
      functionBody(account, "function renderBoardList", "function refreshModeSelectOptions"),
    ]) {
      expect(body).toContain("backendRank");
      expect(body).not.toMatch(/rankOffset\s*\+|rank:\s*i\s*\+\s*1|String\(i\s*\+\s*1\)/u);
    }
  });
});
