import { describe, expect, it } from "vitest";

import {
  appendQueryParam,
  buildPracticeBoardUrl,
  buildPracticeTransferPayload,
  buildPracticeTransferToken,
  buildPracticeModeConfigFromCurrent,
  cloneJsonSafe,
  hasPracticeGuideSeen
} from "../../src/bootstrap/practice-transfer";

describe("bootstrap practice transfer", () => {
  it("builds practice mode from global config with pow2 defaults", () => {
    const modeConfig = buildPracticeModeConfigFromCurrent({
      gameModeConfig: {
        key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        mode_family: "pow2",
        special_rules: { combo_multiplier: 1.2 }
      },
      manager: {
        width: 6,
        height: 6
      }
    });

    expect(modeConfig.key).toBe("practice_legacy");
    expect(modeConfig.label).toBe("练习板（直通）");
    expect(modeConfig.board_width).toBe(4);
    expect(modeConfig.board_height).toBe(4);
    expect(modeConfig.ruleset).toBe("pow2");
    expect(modeConfig.spawn_table).toEqual([{ value: 2, weight: 90 }, { value: 4, weight: 10 }]);
    expect(modeConfig.mode_family).toBe("pow2");
    expect(modeConfig.special_rules).toEqual({ combo_multiplier: 1.2 });
  });

  it("falls back to manager config and fibonacci defaults", () => {
    const modeConfig = buildPracticeModeConfigFromCurrent({
      manager: {
        width: 5,
        height: 4,
        modeConfig: {
          ruleset: "fibonacci",
          mode_family: "fibonacci"
        }
      }
    });

    expect(modeConfig.board_width).toBe(5);
    expect(modeConfig.board_height).toBe(4);
    expect(modeConfig.ruleset).toBe("fibonacci");
    expect(modeConfig.spawn_table).toEqual([{ value: 1, weight: 90 }, { value: 2, weight: 10 }]);
    expect(modeConfig.mode_family).toBe("fibonacci");
  });

  it("adds max_tile only when valid positive integer", () => {
    const withMax = buildPracticeModeConfigFromCurrent({
      gameModeConfig: {
        max_tile: 4096
      }
    });
    const withoutMax = buildPracticeModeConfigFromCurrent({
      gameModeConfig: {
        max_tile: 0
      }
    });

    expect(withMax.max_tile).toBe(4096);
    expect("max_tile" in withoutMax).toBe(false);
  });

  it("clones mutable payload fields", () => {
    const spawnTable = [{ value: 2, weight: 90 }];
    const specialRules = { marker: "x" };
    const modeConfig = buildPracticeModeConfigFromCurrent({
      gameModeConfig: {
        spawn_table: spawnTable,
        special_rules: specialRules
      }
    });

    spawnTable[0].weight = 10;
    specialRules.marker = "changed";

    expect(modeConfig.spawn_table).toEqual([{ value: 2, weight: 90 }]);
    expect(modeConfig.special_rules).toEqual({ marker: "x" });
  });

  it("returns null for non-json values in clone helper", () => {
    expect(cloneJsonSafe(undefined as never)).toBeNull();
  });

  it("detects practice guide seen from local/session storage, cookie, and window name", () => {
    expect(
      hasPracticeGuideSeen({
        localStorageLike: { getItem: () => "1" },
        guideShownKey: "k"
      })
    ).toBe(true);
    expect(
      hasPracticeGuideSeen({
        sessionStorageLike: { getItem: () => "1" },
        guideShownKey: "k"
      })
    ).toBe(true);
    expect(
      hasPracticeGuideSeen({
        guideShownKey: "k",
        cookie: "foo=1; k=1; bar=2"
      })
    ).toBe(true);
    expect(
      hasPracticeGuideSeen({
        guideSeenFlag: "flag=1",
        windowName: "abc flag=1 xyz"
      })
    ).toBe(true);
  });

  it("returns false when no guide-seen marker exists", () => {
    expect(
      hasPracticeGuideSeen({
        localStorageLike: { getItem: () => null },
        sessionStorageLike: { getItem: () => null },
        guideShownKey: "practice_guide_shown_v2",
        guideSeenFlag: "practice_guide_seen_v2=1",
        cookie: "",
        windowName: ""
      })
    ).toBe(false);
  });

  it("builds practice board url with optional guide and payload", () => {
    const noPayload = buildPracticeBoardUrl({
      token: "abc 123",
      practiceRuleset: "fibonacci",
      includeGuideSeen: true
    });
    const withPayload = buildPracticeBoardUrl({
      token: "abc 123",
      practiceRuleset: "pow2",
      includeGuideSeen: false,
      includePayload: true,
      payload: "{\"token\":\"x\"}"
    });

    expect(noPayload).toContain("Practice_board.html?practice_token=abc%20123");
    expect(noPayload).toContain("practice_ruleset=fibonacci");
    expect(noPayload).toContain("practice_guide_seen=1");
    expect(withPayload).toContain("practice_ruleset=pow2");
    expect(withPayload).toContain("practice_payload=%7B%22token%22%3A%22x%22%7D");
  });

  it("appends query params for urls with and without existing search", () => {
    expect(appendQueryParam("x.html", "a", "1")).toBe("x.html?a=1");
    expect(appendQueryParam("x.html?a=1", "b", "2")).toBe("x.html?a=1&b=2");
  });

  it("builds deterministic practice transfer token with provided time/random", () => {
    const token = buildPracticeTransferToken({
      nowMs: 1700000000000,
      randomLike: () => 0.123456789
    });
    expect(token).toBe("p1700000000000_4fzzzx");
  });

  it("builds practice transfer payload with deep-cloned board and created_at", () => {
    const board = [
      [2, 0],
      [0, 4]
    ];
    const modeConfig = buildPracticeModeConfigFromCurrent({
      gameModeConfig: { ruleset: "pow2", board_width: 2, board_height: 2 }
    });
    const payload = buildPracticeTransferPayload({
      token: "pt",
      board,
      modeConfig,
      nowMs: 1700000000000
    });

    board[0][0] = 8;

    expect(payload.token).toBe("pt");
    expect(payload.created_at).toBe(1700000000000);
    expect(payload.board).toEqual([
      [2, 0],
      [0, 4]
    ]);
    expect(payload.mode_config).toBe(modeConfig);
  });
});
