import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

function loadReplayHelpersRuntime() {
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_replay_helpers_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    Date,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    GameManager: {
      REPLAY_V1_RPL_BASE64_PREFIX: "REPLAY_v1RPL_B64_",
      REPLAY_FIB_VERSE_PREFIX: "replay_fib_",
      REPLAY_V4_MODE_KEY_TO_CODE: {}
    },
    getDurationMs(manager: { getDurationMs?: () => number }) {
      return typeof manager.getDurationMs === "function" ? manager.getDurationMs() : 0;
    },
    resolveCoreArgsCallWith(
      manager: Record<string, unknown>,
      _runtimeName: string,
      _methodName: string,
      _args: unknown[],
      _fallbackValue: unknown,
      callback: (manager: Record<string, unknown>, coreCallResult: unknown) => unknown
    ) {
      return callback(manager, null);
    }
  };
  vm.runInNewContext(script, context);
  return context as typeof context & {
    tryAutoSubmitOnGameOver: (manager: Record<string, unknown>) => void;
  };
}

describe("core game manager replay auto submit", () => {
  it("saves recovered games with rescue replay fallback when live serialization is unavailable", () => {
    const runtime = loadReplayHelpersRuntime();
    const savedRecords: Record<string, unknown>[] = [];
    const resultWrites: Record<string, unknown>[] = [];
    const manager = {
      sessionSubmitDone: false,
      replayMode: false,
      over: true,
      won: false,
      keepPlaying: false,
      mode: "standard_4x4_pow2_no_undo",
      modeKey: "standard_4x4_pow2_no_undo",
      width: 4,
      height: 4,
      ruleset: "pow2",
      rankedBucket: "standard_no_undo",
      modeFamily: "standard",
      rankPolicy: "unranked",
      modeConfig: { undo_enabled: false },
      specialRules: {},
      initialSeed: 123,
      score: 4096,
      rescueReplayString: "REPLAY_v1RPL_B64_rescue",
      grid: {
        cells: [[{ value: 4096 }]],
        cellContent({ x, y }: { x: number; y: number }) {
          return x === 0 && y === 0 ? { value: 4096 } : null;
        },
        eachCell(callback: (x: number, y: number, tile: { value: number }) => void) {
          callback(0, 0, { value: 4096 });
        }
      },
      getDurationMs: vi.fn(() => 1200),
      clonePlain: vi.fn((value: unknown) => JSON.parse(JSON.stringify(value))),
      getWindowLike: vi.fn(() => ({})),
      resolveNormalizedCoreValueOrFallback: vi.fn(
        (_coreValue: unknown, _normalize: unknown, fallback: () => unknown) => fallback()
      ),
      resolveWindowNamespaceMethod: vi.fn((namespace: string, methodName: string) => {
        if (namespace !== "LocalHistoryStore" || methodName !== "saveRecord") return null;
        return {
          scope: {},
          method(record: Record<string, unknown>) {
            savedRecords.push(record);
            return { id: "local-rescue-record" };
          }
        };
      }),
      writeLocalStorageJsonPayload: vi.fn((_key: string, payload: Record<string, unknown>) => {
        resultWrites.push(payload);
      })
    };

    expect(() => runtime.tryAutoSubmitOnGameOver(manager)).not.toThrow();
    expect(savedRecords).toHaveLength(1);
    expect(savedRecords[0]).toMatchObject({
      mode_key: "standard_4x4_pow2_no_undo",
      score: 4096,
      board_sum: 4096,
      replay_string: "REPLAY_v1RPL_B64_rescue"
    });
    expect(resultWrites[0]).toMatchObject({ ok: true, local_saved: true });
  });
});
