import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type ModeRulesRuntime = {
  applySetupModeConfigBaseFields: (manager: Record<string, unknown>, cfg: Record<string, unknown>) => void;
};

function loadModeRulesRuntime(options: { coreAvailable?: boolean } = {}): ModeRulesRuntime & { GameManager: Record<string, unknown> } {
  const scriptPath = path.resolve(
    process.cwd(),
    "js/core_game_manager_mode_rules_helpers_runtime.js"
  );
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    GameManager: {
      DEFAULT_TIMER_SLOT_IDS: [32, 64, 128, 256, 512, 1024, 2048],
      TIMER_SLOT_IDS: [32, 64, 128, 256, 512, 1024, 2048]
    },
    resolveCoreArgsCallWith(
      manager: Record<string, unknown>,
      namespace: string,
      method: string,
      args: unknown[],
      _fallback: unknown,
      resolver: (manager: Record<string, unknown>, result: unknown) => unknown
    ) {
      const coreAvailable = options.coreAvailable !== false;
      return resolver(manager, {
        available: coreAvailable && namespace === "callCoreRulesRuntime" && method === "getTimerSlotIdsForBoard",
        value: method === "getTimerSlotIdsForBoard"
          ? Number(args[4]) === 64
            ? [32, 64]
            : [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, 33554432, 67108864]
          : args
      });
    }
  };
  vm.runInNewContext(script, context);
  return context as ModeRulesRuntime & { GameManager: Record<string, unknown> };
}

function createManager() {
  return {
    normalizeSpawnTable: vi.fn((table) => table),
    normalizeSpecialRules: vi.fn((rules) => rules || {}),
    resolveNormalizedCoreValueOrFallback(result: Record<string, unknown>, normalizer: (value: unknown) => unknown, fallback: () => unknown) {
      return result.available ? normalizer(result.value) : fallback();
    }
  };
}

describe("core game manager mode rules runtime", () => {
  it("updates timer slots when a board-specific mode is applied", () => {
    const runtime = loadModeRulesRuntime();
    const manager = createManager();

    runtime.applySetupModeConfigBaseFields(manager, {
      key: "board_5x5_pow2_no_undo",
      board_width: 5,
      board_height: 5,
      ruleset: "pow2",
      max_tile: null,
      spawn_table: [],
      special_rules: {},
      ranked_bucket: "pow2_5x5",
      mode_family: "pow2",
      rank_policy: "ranked"
    });

    expect(runtime.GameManager.TIMER_SLOT_IDS).toContain(67108864);
  });

  it("limits timer slots to an explicit capped-mode maximum", () => {
    const runtime = loadModeRulesRuntime();
    const manager = createManager();

    runtime.applySetupModeConfigBaseFields(manager, {
      key: "capped_4x4_pow2_64_no_undo",
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      max_tile: 64,
      spawn_table: [],
      special_rules: { enforce_max_tile: true }
    });

    expect(runtime.GameManager.TIMER_SLOT_IDS).toEqual([32, 64]);
  });

  it("keeps default timer slots when core rules runtime is unavailable", () => {
    const runtime = loadModeRulesRuntime({ coreAvailable: false });
    const manager = createManager();

    runtime.applySetupModeConfigBaseFields(manager, {
      key: "board_3x4_pow2_no_undo",
      board_width: 4,
      board_height: 3,
      ruleset: "pow2",
      max_tile: null,
      spawn_table: [],
      special_rules: {}
    });

    expect(runtime.GameManager.TIMER_SLOT_IDS).toEqual([32, 64, 128, 256, 512, 1024, 2048]);

    runtime.applySetupModeConfigBaseFields(manager, {
      key: "fib_4x2_no_undo",
      board_width: 4,
      board_height: 2,
      ruleset: "fibonacci",
      max_tile: null,
      spawn_table: [],
      special_rules: {}
    });

    expect(runtime.GameManager.TIMER_SLOT_IDS).toEqual([32, 64, 128, 256, 512, 1024, 2048]);
  });
});
