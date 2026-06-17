import { describe, expect, it } from "vitest";

import {
  createFallbackModeConfigsRuntime,
  createGameManagerFallbackPow2VariantModeConfigs,
  installFallbackModeConfigsRuntime,
  type FallbackModeConfigsRuntime
} from "../../src/core/game-manager-fallback-mode-configs";

describe("core game manager fallback mode configs runtime", () => {
  it("creates the legacy CoreFallbackModeConfigsRuntime shape from TypeScript functions", () => {
    const runtime = createFallbackModeConfigsRuntime();

    expect(runtime.createGameManagerFallbackPow2VariantModeConfigs).toBe(
      createGameManagerFallbackPow2VariantModeConfigs
    );
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreFallbackModeConfigsRuntime?: FallbackModeConfigsRuntime } = {};

    const installed = installFallbackModeConfigsRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreFallbackModeConfigsRuntime);
    expect(installed?.createGameManagerFallbackPow2VariantModeConfigs).toBeTypeOf("function");
  });
});

describe("createGameManagerFallbackPow2VariantModeConfigs", () => {
  it("builds all pow2 variant fallback configs with unranked defaults", () => {
    const configs = createGameManagerFallbackPow2VariantModeConfigs();

    expect(Object.keys(configs)).toEqual([
      "spawn50_3x3_pow2_no_undo",
      "diag_3x3_pow2_no_undo",
      "diag_4x4_pow2_no_undo",
      "diag_3x4_pow2_no_undo",
      "diag_2x4_pow2_no_undo",
      "item_4x4_pow2_no_undo",
      "stone_4x4_pow2_no_undo",
      "timed5s_4x4_pow2_no_undo",
      "nox_4x4_pow2_no_undo"
    ]);
    expect(configs.spawn50_3x3_pow2_no_undo).toMatchObject({
      board_width: 3,
      board_height: 3,
      undo_enabled: false,
      mode_family: "pow2",
      rank_policy: "unranked",
      special_rules: {}
    });
    expect(configs.spawn50_3x3_pow2_no_undo.spawn_table).toEqual([
      { value: 2, weight: 50 },
      { value: 4, weight: 50 }
    ]);
  });

  it("assigns special rules for diagonal, item, stone, timed, and NO X variants", () => {
    const configs = createGameManagerFallbackPow2VariantModeConfigs();

    expect(configs.diag_4x4_pow2_no_undo.special_rules).toEqual({
      allow_diagonal_moves: true
    });
    expect(configs.item_4x4_pow2_no_undo).toMatchObject({
      mode_family: "item",
      special_rules: {
        item_mode: { enabled: true, grant_every_moves: 6, max_per_item: 3 }
      }
    });
    expect(configs.stone_4x4_pow2_no_undo).toMatchObject({
      mode_family: "stone",
      special_rules: {
        stone_tiles: [
          [1, 1],
          [2, 2]
        ]
      }
    });
    expect(configs.timed5s_4x4_pow2_no_undo).toMatchObject({
      mode_family: "timed",
      special_rules: { move_timeout_ms: 5000 }
    });
    expect(configs.nox_4x4_pow2_no_undo.special_rules).toEqual({
      no_x_enabled: true,
      no_x_target: null
    });
  });
});
