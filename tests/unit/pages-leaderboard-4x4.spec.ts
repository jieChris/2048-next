import { describe, expect, it } from "vitest";

import {
  buildLeaderboardProfileUrl,
  formatLeaderboardRate,
  formatLeaderboardDuration,
  normalizeLeaderboardAchievementFocus,
  normalizeLeaderboardShowcase,
  normalizeLeaderboardShowcaseSummary,
  normalizeLeaderboardTrend
} from "../../src/pages/leaderboard-4x4-page";

describe("4x4 leaderboard showcase page model", () => {
  it("normalizes server rows without changing authoritative order", () => {
    const rows = normalizeLeaderboardShowcase([
      {
        rank: "1",
        user_id: "42",
        nickname: "  Alpha  ",
        score: "120000",
        max_tile: "8192",
        board_sum: "32764",
        duration_ms: "654321"
      },
      {
        rank: 2,
        user_id: 7,
        nickname: "Beta",
        score: 118000,
        max_tile: 4096,
        board_sum: 24572,
        duration_ms: 700000
      }
    ]);

    expect(rows).toEqual([
      {
        rank: 1,
        userId: 42,
        nickname: "Alpha",
        score: 120000,
        maxTile: 8192,
        boardSum: 32764,
        durationMs: 654321
      },
      {
        rank: 2,
        userId: 7,
        nickname: "Beta",
        score: 118000,
        maxTile: 4096,
        boardSum: 24572,
        durationMs: 700000
      }
    ]);
  });

  it("formats exact values and safe profile links", () => {
    expect(formatLeaderboardDuration(654321)).toBe("10:54.321");
    expect(buildLeaderboardProfileUrl(42, "Alpha 玩家")).toBe("user.html?id=42&nickname=Alpha+%E7%8E%A9%E5%AE%B6");
    expect(buildLeaderboardProfileUrl(null, "Alpha")).toBe("");
  });

  it("normalizes the existing-record overview and seven-day score trend", () => {
    expect(normalizeLeaderboardShowcaseSummary({
      total_records: "1284",
      total_players: "96",
      reached_16384: "83",
      reached_32768: "12"
    })).toEqual({
      totalRecords: 1284,
      totalPlayers: 96,
      reached16384: 83,
      reached32768: 12
    });
    expect(formatLeaderboardRate(83, 1284)).toBe("6%");
    expect(formatLeaderboardRate(10, 0)).toBe("0%");

    expect(normalizeLeaderboardTrend([
      { date: "2026-07-17", best_score: "68240" },
      { date: "2026-07-18", best_score: 73110 },
      { date: "invalid", best_score: 999999 },
      { date: "2026-07-19", best_score: -1 }
    ])).toEqual([
      { date: "2026-07-17", bestScore: 68240 },
      { date: "2026-07-18", bestScore: 73110 },
      { date: "2026-07-19", bestScore: 0 }
    ]);
  });

  it("normalizes the closest unfinished achievement and all-complete state", () => {
    expect(normalizeLeaderboardAchievementFocus({
      completed_all: false,
      achievement_id: "tile_4096_count_10",
      name: "10 次 4096",
      current: "8",
      target: "10",
      progress_percent: "80"
    })).toEqual({
      completedAll: false,
      achievementId: "tile_4096_count_10",
      name: "10 次 4096",
      current: 8,
      target: 10,
      progressPercent: 80
    });
    expect(normalizeLeaderboardAchievementFocus({ completed_all: true })).toEqual({
      completedAll: true,
      achievementId: "",
      name: "",
      current: 0,
      target: 0,
      progressPercent: 100
    });
    expect(normalizeLeaderboardAchievementFocus({ completed_all: false, target: 0 })).toBeNull();
  });
});
