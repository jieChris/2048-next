import { describe, expect, it } from "vitest";

import {
  appendQueryParam,
  buildPracticeBoardUrl,
  buildPracticeTransferPayload,
  buildPracticeTransferToken,
  buildPracticeModeConfigFromCurrent,
  cloneJsonSafe,
  createPracticeTransferNavigationPlan,
  hasPracticeGuideSeen,
  persistPracticeTransferPayload,
  resolvePracticeTransferPrecheck
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

    expect(modeConfig.key).toBe("practice");
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

  it("persists payload to local storage first", () => {
    const writes: string[] = [];
    const result = persistPracticeTransferPayload({
      localStorageLike: {
        getItem() {
          return null;
        },
        setItem(key: string, value: string) {
          writes.push("local:" + key + ":" + value);
        }
      },
      sessionStorageLike: {
        getItem() {
          return null;
        },
        setItem(key: string, value: string) {
          writes.push("session:" + key + ":" + value);
        }
      },
      payload: "payload-json"
    });

    expect(result).toEqual({ persisted: true, target: "local" });
    expect(writes).toEqual(["local:practice_board_transfer_v1:payload-json"]);
  });

  it("falls back to session storage when local storage write fails", () => {
    const writes: string[] = [];
    const result = persistPracticeTransferPayload({
      localStorageLike: {
        getItem() {
          return null;
        },
        setItem() {
          throw new Error("blocked");
        }
      },
      sessionStorageLike: {
        getItem() {
          return null;
        },
        setItem(key: string, value: string) {
          writes.push("session:" + key + ":" + value);
        }
      },
      payload: "payload-json"
    });

    expect(result).toEqual({ persisted: true, target: "session" });
    expect(writes).toEqual(["session:practice_board_transfer_session_v1:payload-json"]);
  });

  it("returns none when both storages cannot persist", () => {
    const result = persistPracticeTransferPayload({
      localStorageLike: null,
      sessionStorageLike: null,
      payload: "payload-json"
    });

    expect(result).toEqual({ persisted: false, target: "none" });
  });

  it("builds a direct-open transfer plan when payload is persisted", () => {
    const writes: string[] = [];
    const plan = createPracticeTransferNavigationPlan({
      board: [[2, 0], [0, 4]],
      gameModeConfig: {
        ruleset: "pow2",
        board_width: 2,
        board_height: 2
      },
      localStorageLike: {
        getItem(key: string) {
          return key === "practice_guide_shown_v2" ? "1" : null;
        },
        setItem(key: string, value: string) {
          writes.push("local:" + key + ":" + value);
        }
      },
      sessionStorageLike: {
        getItem() {
          return null;
        },
        setItem(key: string, value: string) {
          writes.push("session:" + key + ":" + value);
        }
      },
      nowMs: 1700000000000,
      randomLike: () => 0.123456789
    });

    expect(plan.token).toBe("p1700000000000_4fzzzx");
    expect(plan.persisted).toBe(true);
    expect(plan.persistedTarget).toBe("local");
    expect(plan.usedPayloadInUrl).toBe(false);
    expect(plan.practiceRuleset).toBe("pow2");
    expect(plan.guideSeen).toBe(true);
    expect(plan.openUrl).toContain("Practice_board.html");
    expect(plan.openUrl).toContain("practice_token=p1700000000000_4fzzzx");
    expect(plan.openUrl).toContain("practice_ruleset=pow2");
    expect(plan.openUrl).toContain("practice_guide_seen=1");
    expect(writes).toEqual(["local:practice_board_transfer_v1:" + plan.payloadString]);
  });

  it("falls back to url payload when both storages cannot persist", () => {
    const plan = createPracticeTransferNavigationPlan({
      board: [[1, 1, 2, 3]],
      gameModeConfig: {
        ruleset: "fibonacci",
        board_width: 4,
        board_height: 1
      },
      localStorageLike: null,
      sessionStorageLike: null,
      nowMs: 1700000000000,
      randomLike: () => 0.123456789
    });

    expect(plan.persisted).toBe(false);
    expect(plan.persistedTarget).toBe("none");
    expect(plan.usedPayloadInUrl).toBe(true);
    expect(plan.practiceRuleset).toBe("fibonacci");
    expect(plan.openUrl).toContain("practice_token=p1700000000000_4fzzzx");
    expect(plan.openUrl).toContain("practice_ruleset=fibonacci");
    expect(plan.openUrl).toContain("practice_payload=");
  });

  it("resolves precheck failure when manager is unavailable", () => {
    expect(resolvePracticeTransferPrecheck({ manager: null })).toEqual({
      canOpen: false,
      board: null,
      alertMessage: "当前局面尚未就绪，稍后再试。"
    });
  });

  it("resolves precheck board validity and success state", () => {
    expect(
      resolvePracticeTransferPrecheck({
        manager: {
          getFinalBoardMatrix() {
            return [];
          }
        }
      })
    ).toEqual({
      canOpen: false,
      board: null,
      alertMessage: "未读取到有效盘面。"
    });

    expect(
      resolvePracticeTransferPrecheck({
        manager: {
          getFinalBoardMatrix() {
            return [[2, 0], [0, 4]];
          }
        }
      })
    ).toEqual({
      canOpen: true,
      board: [[2, 0], [0, 4]],
      alertMessage: null
    });
  });
});
