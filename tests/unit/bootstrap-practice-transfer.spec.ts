import { describe, expect, it } from "vitest";

import {
  buildPracticeModeConfigFromCurrent,
  cloneJsonSafe
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
});
