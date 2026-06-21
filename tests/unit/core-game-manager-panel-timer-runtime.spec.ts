import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createGameManagerTimerStartRuntime } from "../../src/core/game-manager-timer-start";
import { createSavedStateSyncPublishRuntime } from "../../src/core/saved-state-sync-publish";

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
    CoreGameManagerTimerStartRuntime: createGameManagerTimerStartRuntime(),
    CoreSavedStateSyncPublishRuntime: createSavedStateSyncPublishRuntime(),
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
    executeTimerTick: (manager: Record<string, unknown>) => void;
    startTimer: (manager: Record<string, unknown>) => void;
    stopTimer: (manager: Record<string, unknown>) => void;
    getDurationMs: (manager: Record<string, unknown>) => number;
    resolveTimerElapsedMs: (manager: Record<string, unknown>, nowMs: number) => number;
    setTimerRowVisibleState: (
      manager: Record<string, unknown>,
      value: number,
      visible: boolean,
      keepSpace: boolean
    ) => void;
    publishSavedStateSyncSnapshot: (manager: Record<string, unknown>) => boolean;
    buildSavedStateSyncTrimPayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    parseSavedStateSyncEventPayload: (manager: Record<string, unknown>, raw: string) => Record<string, unknown> | null;
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

  it("delegates timer ticks to the TypeScript runtime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(50_000);
    const executeTimerTick = vi.fn();
    const runtime = loadPanelTimerRuntime({
      CoreGameManagerTimerTickRuntime: {
        executeTimerTick
      },
      checkAndHandleMoveTimeout: vi.fn(() => false),
      updateMoveTimeoutHud: vi.fn()
    });
    const manager = createManager({
      startTime: new Date(40_000)
    });

    runtime.executeTimerTick(manager);

    expect(executeTimerTick).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        checkAndHandleMoveTimeout: expect.any(Function),
        refreshIpsDisplay: expect.any(Function),
        resolveManagerElementById: expect.any(Function),
        resolveTimerElapsedMs: expect.any(Function),
        shouldUpdateStatsPanelAtTimerTick: expect.any(Function),
        updateMoveTimeoutHud: expect.any(Function)
      }),
      50_000
    );
  });

  it("delegates timer starts to the TypeScript runtime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(75_000);
    const startTimer = vi.fn();
    const updateMoveTimeoutHud = vi.fn();
    const runtime = loadPanelTimerRuntime({
      CoreGameManagerTimerStartRuntime: {
        startTimer
      },
      updateMoveTimeoutHud
    });
    const manager = createManager();

    runtime.startTimer(manager);

    expect(startTimer).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        bindTimerVisibilityChangeListener: expect.any(Function),
        ensureTimerAnchors: expect.any(Function),
        resolveTimerElapsedMs: expect.any(Function),
        restartTimerIntervalWithCurrentSettings: expect.any(Function),
        updateMoveTimeoutHud
      }),
      75_000
    );
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

  it("delegates timer row visibility state to the TypeScript runtime", () => {
    const setTimerRowVisibleState = vi.fn();
    const runtime = loadPanelTimerRuntime({
      CoreGameManagerTimerRowVisibleStateRuntime: {
        setTimerRowVisibleState
      }
    });
    const manager = createManager();

    runtime.setTimerRowVisibleState(manager, 64, false, true);

    expect(setTimerRowVisibleState).toHaveBeenCalledWith(manager, 64, false, true);
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

  it("delegates saved-state sync event parsing to the core runtime", () => {
    const parsed = {
      sourceClientId: "tab-runtime",
      savedAt: 111,
      state: { saved_at: 111 }
    };
    const parseSavedStateSyncEventPayload = vi.fn(() => parsed);
    const runtime = loadPanelTimerRuntime({
      CoreSavedStateSyncPayloadRuntime: {
        parseSavedStateSyncEventPayload
      }
    });
    const manager = createManager();

    expect(runtime.parseSavedStateSyncEventPayload(manager, "{\"state\":{}}")).toBe(parsed);
    expect(parseSavedStateSyncEventPayload).toHaveBeenCalledWith("{\"state\":{}}");
  });

  it("delegates saved-state sync snapshot publishing to the core runtime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(88_000);
    const publishSavedStateSyncSnapshot = vi.fn(() => true);
    const runtime = loadPanelTimerRuntime({
      CoreSavedStateSyncPublishRuntime: {
        publishSavedStateSyncSnapshot
      }
    });
    const manager = createManager({ replayMode: true });

    expect(runtime.publishSavedStateSyncSnapshot(manager)).toBe(true);
    expect(publishSavedStateSyncSnapshot).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        buildSavedStateSyncEventPayload: expect.any(Function),
        canWriteToStorage: expect.any(Function),
        rememberSavedStateKnownSavedAt: expect.any(Function),
        resolveSavedGameStateSyncStorageKey: expect.any(Function),
        shouldSkipSavedStateSyncPublishByThrottle: expect.any(Function),
        shouldUseSavedGameState: expect.any(Function),
        writeStorageJsonPayload: expect.any(Function)
      }),
      88_000
    );
  });
});
