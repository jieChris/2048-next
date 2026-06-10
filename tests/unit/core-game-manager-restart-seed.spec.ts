import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type RestartSeedRuntime = {
  initializeSetupSeedAndReplayState: (
    manager: Record<string, unknown> | null,
    inputSeed?: unknown
  ) => { hasInputSeed: boolean; rankedSessionContext?: Record<string, unknown> | null };
  resetSetupTimerAndInputState: (manager: Record<string, unknown>) => void;
};

function loadRestartSeedRuntime(options?: {
  globalCrypto?: { getRandomValues?: (values: Uint32Array) => Uint32Array | void } | null;
  mathRandomValue?: number;
  nowMs?: number;
  performanceNowMs?: number;
}) {
  const scriptPath = path.resolve(
    process.cwd(),
    "js/core_game_manager_restart_setup_helpers_runtime.js"
  );
  const script = readFileSync(scriptPath, "utf8");
  const math = Object.create(Math) as Math & {
    random: ReturnType<typeof vi.fn>;
  };
  const mathRandom = vi.fn(() => options?.mathRandomValue ?? 0.25);
  math.random = mathRandom;
  const dateNow = vi.fn(() => options?.nowMs ?? 1_700_000_000_000);
  const performanceNow = vi.fn(() => options?.performanceNowMs ?? 123.456);
  const context = {
    console,
    Math: math,
    Uint32Array,
    crypto: options?.globalCrypto || null,
    clearInterval: vi.fn(),
    Date: { now: dateNow },
    performance: { now: performanceNow }
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);

  return {
    runtime: context as RestartSeedRuntime,
    mathRandom,
    dateNow,
    performanceNow
  };
}

describe("core game manager restart seed runtime", () => {
  it("uses crypto-backed fresh seeds without changing the seed type", () => {
    const cryptoLike = {
      getRandomValues: vi.fn((values: Uint32Array) => {
        values[0] = 0x000abcde;
        values[1] = 0x12345678;
        return values;
      })
    };
    const { runtime, mathRandom } = loadRestartSeedRuntime();
    const manager = {
      disableSessionSync: true,
      getWindowLike() {
        return { crypto: cryptoLike };
      }
    } as Record<string, unknown>;

    const snapshot = runtime.initializeSetupSeedAndReplayState(manager);
    const expectedSeed = (0x000abcde & 0x1fffff) * 4294967296 + 0x12345678;

    expect(snapshot.hasInputSeed).toBe(false);
    expect(manager.initialSeed).toBe(expectedSeed);
    expect(Number.isSafeInteger(manager.initialSeed)).toBe(true);
    expect(manager.seed).toBe(expectedSeed);
    expect(manager.replayMode).toBe(false);
    expect(manager.disableSessionSync).toBe(false);
    expect(cryptoLike.getRandomValues).toHaveBeenCalledTimes(1);
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("mixes fallback fresh seeds without Math.random when crypto seed generation fails", () => {
    const cryptoLike = {
      getRandomValues: vi.fn(() => {
        throw new Error("crypto unavailable");
      })
    };
    const { runtime, mathRandom } = loadRestartSeedRuntime({ mathRandomValue: 0.375 });
    const manager = {
      getWindowLike() {
        return { crypto: cryptoLike };
      }
    } as Record<string, unknown>;

    runtime.initializeSetupSeedAndReplayState(manager);

    expect(Number.isSafeInteger(manager.initialSeed)).toBe(true);
    expect(manager.initialSeed).not.toBe(0.375);
    expect(manager.seed).toBe(manager.initialSeed);
    expect(manager.freshSetupSeedCounter).toBe(1);
    expect(cryptoLike.getRandomValues).toHaveBeenCalledTimes(1);
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("does not repeat fallback fresh seeds without Math.random", () => {
    const cryptoLike = {
      getRandomValues: vi.fn(() => {
        throw new Error("crypto unavailable");
      })
    };
    const { runtime, mathRandom } = loadRestartSeedRuntime({
      mathRandomValue: 0.125,
      nowMs: 1_700_000_000_000,
      performanceNowMs: 100
    });
    const manager = {
      getWindowLike() {
        return { crypto: cryptoLike, performance: { now: () => 100 } };
      }
    } as Record<string, unknown>;

    runtime.initializeSetupSeedAndReplayState(manager);
    const firstSeed = manager.initialSeed;
    runtime.initializeSetupSeedAndReplayState(manager);

    expect(manager.initialSeed).not.toBe(firstSeed);
    expect(manager.freshSetupSeedCounter).toBe(2);
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("preserves explicit replay seeds and skips fresh random generation", () => {
    const cryptoLike = {
      getRandomValues: vi.fn()
    };
    const { runtime, mathRandom } = loadRestartSeedRuntime();
    const setRuntimeReplayIndex = vi.fn();
    const manager = {
      disableSessionSync: true,
      setRuntimeReplayIndex,
      getWindowLike() {
        return { crypto: cryptoLike };
      }
    } as Record<string, unknown>;

    const snapshot = runtime.initializeSetupSeedAndReplayState(manager, 12345);

    expect(snapshot.hasInputSeed).toBe(true);
    expect(setRuntimeReplayIndex).toHaveBeenCalledWith(0);
    expect(manager.initialSeed).toBe(12345);
    expect(manager.seed).toBe(12345);
    expect(manager.replayMode).toBe(true);
    expect(manager.disableSessionSync).toBe(true);
    expect(cryptoLike.getRandomValues).not.toHaveBeenCalled();
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("uses preloaded ranked session seed without entering replay mode", () => {
    const cryptoLike = {
      getRandomValues: vi.fn()
    };
    const { runtime, mathRandom } = loadRestartSeedRuntime();
    const manager = {
      rankPolicy: "ranked",
      getWindowLike() {
        return {
          crypto: cryptoLike,
          GAME_CHALLENGE_CONTEXT: {
            id: "rch_seeded",
            mode_key: "standard_4x4_pow2_no_undo",
            seed: 424242,
            ranked_session_token: "rs1.token"
          }
        };
      }
    } as Record<string, unknown>;

    const snapshot = runtime.initializeSetupSeedAndReplayState(manager);

    expect(snapshot.hasInputSeed).toBe(false);
    expect(snapshot.rankedSessionContext).toEqual({
      id: "rch_seeded",
      mode_key: "standard_4x4_pow2_no_undo",
      seed: 424242,
      ranked_session_token: "rs1.token"
    });
    expect(manager.initialSeed).toBe(424242);
    expect(manager.seed).toBe(424242);
    expect(manager.replayMode).toBe(false);
    expect(cryptoLike.getRandomValues).not.toHaveBeenCalled();
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("clears restored timer offsets and anchors when setting up a fresh game", () => {
    const { runtime } = loadRestartSeedRuntime();
    const manager = {
      timerStatus: 1,
      startTime: new Date(100_000),
      timerID: 99,
      time: 45_000,
      accumulatedTime: 45_000,
      timerElapsedOffsetMs: 45_000,
      timerAnchorLocalMs: 100_000,
      timerAnchorServerMs: 90_000,
      pendingTimerAnchorServerMs: 95_000,
      timerFrozen: true,
      pendingMoveInput: { direction: 1 },
      moveInputFlushScheduled: true,
      lastMoveInputAt: 123,
      moveDeadlineAt: 456
    } as Record<string, unknown>;

    runtime.resetSetupTimerAndInputState(manager);

    expect((runtime as unknown as { clearInterval: ReturnType<typeof vi.fn> }).clearInterval).toHaveBeenCalledWith(99);
    expect(manager.timerStatus).toBe(0);
    expect(manager.startTime).toBeNull();
    expect(manager.timerID).toBeNull();
    expect(manager.time).toBe(0);
    expect(manager.accumulatedTime).toBe(0);
    expect(manager.timerElapsedOffsetMs).toBe(0);
    expect(manager.timerAnchorLocalMs).toBeNull();
    expect(manager.timerAnchorServerMs).toBeNull();
    expect(manager.pendingTimerAnchorServerMs).toBeNull();
    expect(manager.timerFrozen).toBe(false);
  });
});
