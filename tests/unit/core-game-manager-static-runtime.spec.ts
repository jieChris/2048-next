import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

function loadStaticRuntime(): { GameManager: {
  FALLBACK_MODE_CONFIGS?: Record<string, { ranked_bucket?: string }>;
  DEFAULT_TIMER_SLOT_IDS?: number[];
  TIMER_SLOT_IDS?: number[];
} } {
  const script = readFileSync(path.resolve(process.cwd(), "js/core_game_manager_static_runtime.js"), "utf8");
  const context = {
    GameManager: {},
    CoreFallbackModeConfigsRuntime: {
      createGameManagerFallbackPow2VariantModeConfigs: () => ({})
    }
  };
  vm.runInNewContext(script, context);
  vm.runInNewContext("applyGameManagerStaticConfiguration();", context);
  return context;
}

describe("core game manager static runtime fallback modes", () => {
  it("keeps undo board fallback configs in their undo leaderboard buckets", () => {
    const { GameManager } = loadStaticRuntime();

    expect(GameManager.FALLBACK_MODE_CONFIGS?.board_3x3_pow2_undo?.ranked_bucket).toBe("pow2_3x3_undo");
    expect(GameManager.FALLBACK_MODE_CONFIGS?.board_3x4_pow2_undo?.ranked_bucket).toBe("pow2_3x4_undo");
    expect(GameManager.FALLBACK_MODE_CONFIGS?.board_2x4_pow2_undo?.ranked_bucket).toBe("pow2_2x4_undo");
    expect(GameManager.TIMER_SLOT_IDS).toEqual(GameManager.DEFAULT_TIMER_SLOT_IDS);
    expect(GameManager.TIMER_SLOT_IDS).not.toBe(GameManager.DEFAULT_TIMER_SLOT_IDS);
  });
});
