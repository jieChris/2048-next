import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";

function loadPanelTimerRuntime(extraContext: Record<string, unknown> = {}) {
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_panel_timer_helpers_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    Date,
    console,
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
    document: {
      hidden: false,
      addEventListener: vi.fn()
    },
    resolveManagerElementById: vi.fn(() => null),
    refreshIpsDisplay: vi.fn(),
    resolveCorePayloadCallWith(
      manager: Record<string, unknown>,
      _namespace: string,
      _method: string,
      _payload: unknown,
      _fallbackValue: unknown,
      fallback: (currentManager: Record<string, unknown>, coreCallResult: unknown) => unknown
    ) {
      return fallback(manager, undefined);
    },
    resolveCoreArgsCallWith(
      manager: Record<string, unknown>,
      _namespace: string,
      _method: string,
      _args: unknown[],
      _fallbackValue: unknown,
      fallback: (currentManager: Record<string, unknown>, coreCallResult: unknown) => unknown
    ) {
      return fallback(manager, undefined);
    },
    ...extraContext
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);
  return context as typeof context & {
    startTimer: (manager: Record<string, unknown>) => void;
    stopTimer: (manager: Record<string, unknown>) => void;
    getDurationMs: (manager: Record<string, unknown>) => number;
    resolveTimerElapsedMs: (manager: Record<string, unknown>, nowMs: number) => number;
    buildSavedStateSyncTrimPayload: (manager: Record<string, unknown>) => Record<string, unknown>;
  };
}

function createManager(overrides: Record<string, unknown> = {}) {
  return {
    timerStatus: 0,
    accumulatedTime: 0,
    hasGameStarted: false,
    timerFrozen: false,
    modeKey: "standard_4x4_pow2_no_undo",
    notifyUndoSettingsStateChanged: vi.fn(),
    resolveCoreStringCallOrFallback(_coreCallResult: unknown, fallback: () => string) {
      return fallback();
    },
    resolveCoreNumericCallOrFallback(_coreCallResult: unknown, fallback: () => number) {
      return fallback();
    },
    resolveNormalizedCoreValueOrFallback(
      _coreCallResult: unknown,
      _normalize: (value: unknown) => unknown,
      fallback: () => unknown
    ) {
      return fallback();
    },
    ...overrides
  };
}

describe("core game manager panel timer runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a ranked timer from the first valid move and keeps counting while the page is closed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const storage = new Map<string, string>([
      [
        "ranked_session_active:v1:standard_4x4_pow2_no_undo",
        JSON.stringify({
          mode_key: "standard_4x4_pow2_no_undo",
          challenge_id: "ranked-active",
          seed: 123,
          ranked_session_token: "ranked-token",
          issued_at: 90,
          exp: 3600,
          client_received_at_ms: 95_000
        })
      ]
    ]);
    const runtime = loadPanelTimerRuntime();
    const manager = createManager({
      getWindowLike() {
        return {
          localStorage: {
            getItem(key: string) {
              return storage.get(key) || "";
            }
          }
        };
      }
    });

    runtime.startTimer(manager);

    expect(manager.timerStatus).toBe(1);
    expect(manager.timerElapsedOffsetMs).toBe(0);
    expect(manager.timerAnchorLocalMs).toBe(100_000);
    expect(manager.timerAnchorServerMs).toBe(95_000);
    expect(runtime.getDurationMs(manager)).toBe(0);

    vi.setSystemTime(107_500);

    expect(runtime.getDurationMs(manager)).toBe(7_500);

    runtime.stopTimer(manager);

    expect(manager.accumulatedTime).toBe(7_500);
    expect(manager.timerElapsedOffsetMs).toBe(7_500);
    expect(manager.timerAnchorLocalMs).toBeNull();
  });

  it("continues from restored active timer anchors when startTimer is called after reload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000);
    const runtime = loadPanelTimerRuntime();
    const manager = createManager({
      accumulatedTime: 16_000,
      timerElapsedOffsetMs: 1_000,
      timerAnchorLocalMs: 5_000,
      timerAnchorServerMs: 15_000
    });

    runtime.startTimer(manager);

    expect(manager.timerStatus).toBe(1);
    expect(manager.accumulatedTime).toBe(16_000);
    expect(runtime.getDurationMs(manager)).toBe(16_000);

    vi.setSystemTime(22_500);

    expect(runtime.getDurationMs(manager)).toBe(18_500);
  });

  it("uses the server anchor instead of local closed-page time when active session metadata is available", () => {
    vi.useFakeTimers();
    vi.setSystemTime(200_000);
    const storage = new Map<string, string>([
      [
        "ranked_session_active:v1:standard_4x4_pow2_no_undo",
        JSON.stringify({
          mode_key: "standard_4x4_pow2_no_undo",
          challenge_id: "ranked-active",
          seed: 123,
          ranked_session_token: "ranked-token",
          issued_at: 90,
          exp: 3600,
          client_received_at_ms: 95_000
        })
      ]
    ]);
    const runtime = loadPanelTimerRuntime();
    const manager = createManager({
      timerStatus: 1,
      timerElapsedOffsetMs: 2_500,
      timerAnchorLocalMs: 1,
      timerAnchorServerMs: 95_000,
      getWindowLike() {
        return {
          localStorage: {
            getItem(key: string) {
              return storage.get(key) || "";
            }
          }
        };
      }
    });

    expect(runtime.getDurationMs(manager)).toBe(102_500);
  });

  it("delegates timer elapsed resolution to the TypeScript runtime", () => {
    const resolveTimerElapsedMs = vi.fn(() => 12_345);
    const runtime = loadPanelTimerRuntime({
      CoreGameManagerTimerElapsedRuntime: {
        resolveTimerElapsedMs
      }
    });
    const manager = createManager({
      timerStatus: 1,
      timerElapsedOffsetMs: 250,
      timerAnchorLocalMs: 1_000,
      timerAnchorServerMs: 2_000,
      pendingTimerAnchorServerMs: 2_000
    });

    expect(runtime.resolveTimerElapsedMs(manager, 9_000)).toBe(12_345);
    expect(resolveTimerElapsedMs).toHaveBeenCalledWith(
      manager,
      9_000,
      expect.objectContaining({
        resolveTimerElapsedOffsetMs: expect.any(Function),
        resolveTimerServerNowMs: expect.any(Function)
      })
    );

    const operations = resolveTimerElapsedMs.mock.calls[0]?.[2] as {
      resolveTimerElapsedOffsetMs: (currentManager: Record<string, unknown>) => number;
      resolveTimerServerNowMs: (currentManager: Record<string, unknown>, nowMs: number) => number | null;
    };
    expect(operations.resolveTimerElapsedOffsetMs(manager)).toBe(250);
    expect(operations.resolveTimerServerNowMs(manager, 9_000)).toBe(2_000);
  });

  it("delegates saved-state sync trim payload construction to the core runtime", () => {
    const buildSavedStateSyncTrimPayload = vi.fn(() => ({
      move_history: ["from-runtime"],
      ips_input_count: 7
    }));
    const runtime = loadPanelTimerRuntime({
      CoreSavedStateSyncPayloadRuntime: {
        buildSavedStateSyncTrimPayload
      }
    });
    const manager = createManager({ ipsInputCount: 2 });

    expect(runtime.buildSavedStateSyncTrimPayload(manager)).toEqual({
      move_history: ["from-runtime"],
      ips_input_count: 7
    });
    expect(buildSavedStateSyncTrimPayload).toHaveBeenCalledWith(manager);
  });
});
