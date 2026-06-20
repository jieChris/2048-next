import { describe, expect, it, vi } from "vitest";

import {
  createSetupStateInitializationRuntime,
  installSetupStateInitializationRuntime,
  resetSetupTimerAndInputState,
  runSetupStateInitialization,
  type SetupStateInitializationRuntime
} from "../../src/core/setup-state-initialization";

function createOperations(calls: string[] = []) {
  return {
    initializeSetupSeedAndReplayState: vi.fn(() => {
      calls.push("seed");
      return {
        hasInputSeed: false,
        rankedSessionContext: { id: "rch_daily", ranked_session_token: "token" }
      };
    }),
    resetSetupRuntimeState: vi.fn(() => calls.push("reset-runtime")),
    resolveSetupChallengeId: vi.fn(() => {
      calls.push("challenge-id");
      return "rch_daily";
    }),
    resolveSetupRankedSessionToken: vi.fn(() => {
      calls.push("ranked-token");
      return "token";
    }),
    initializeSetupSessionReplaySnapshot: vi.fn(() => calls.push("replay-snapshot")),
    initializeTimerMilestones: vi.fn(() => calls.push("timer-milestones")),
    resetRoundStatsState: vi.fn(() => calls.push("round-stats")),
    resetTimerUiForSetup: vi.fn(() => calls.push("timer-ui")),
    resolvePreferredTimerModuleViewForSetup: vi.fn(() => {
      calls.push("timer-view");
      return "timer";
    }),
    resolveSetupRestoreAndInitialBoardState: vi.fn(() => {
      calls.push("restore-state");
      return { restoredFromSavedState: true };
    }),
    syncSetupSessionReplayV1InitTiles: vi.fn(() => calls.push("sync-replay-v1")),
    finalizeSetupUiAndStatsState: vi.fn(() => calls.push("finalize-ui"))
  };
}

describe("core setup state initialization runtime", () => {
  it("resets setup timer and pending input state", () => {
    const clearInterval = vi.fn();
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
      timerUpdateIntervalMs: 250,
      timerFrozen: true,
      pendingMoveInput: { direction: 1 },
      moveInputFlushScheduled: true,
      lastMoveInputAt: 123,
      moveDeadlineAt: 456
    };

    resetSetupTimerAndInputState(manager, { clearInterval });

    expect(clearInterval).toHaveBeenCalledWith(99);
    expect(manager).toMatchObject({
      timerStatus: 0,
      startTime: null,
      timerID: null,
      time: 0,
      accumulatedTime: 0,
      timerElapsedOffsetMs: 0,
      timerAnchorLocalMs: null,
      timerAnchorServerMs: null,
      pendingTimerAnchorServerMs: null,
      timerUpdateIntervalMs: null,
      timerFrozen: false,
      pendingMoveInput: null,
      moveInputFlushScheduled: false,
      lastMoveInputAt: 0,
      moveDeadlineAt: null
    });
  });

  it("invokes clear interval as an unbound callback", () => {
    const observedThisValues: unknown[] = [];
    const manager = {
      timerID: 99
    };
    const clearInterval = function (this: unknown, _timerId: unknown) {
      observedThisValues.push(this);
    };

    resetSetupTimerAndInputState(manager, { clearInterval });

    expect(observedThisValues).toEqual([undefined]);
  });

  it("runs setup initialization operations in the legacy order", () => {
    const calls: string[] = [];
    const operations = createOperations(calls);
    const manager: Record<string, unknown> = {};
    const setupOptions = { disableStateRestore: false };

    runSetupStateInitialization(manager, undefined, setupOptions, operations);

    expect(calls).toEqual([
      "seed",
      "reset-runtime",
      "challenge-id",
      "ranked-token",
      "replay-snapshot",
      "timer-milestones",
      "round-stats",
      "timer-ui",
      "timer-view",
      "restore-state",
      "sync-replay-v1",
      "finalize-ui"
    ]);
    expect(manager.challengeId).toBe("rch_daily");
    expect(manager.rankedSessionToken).toBe("token");
    expect(operations.resolveSetupChallengeId).toHaveBeenCalledWith(
      manager,
      setupOptions,
      { id: "rch_daily", ranked_session_token: "token" }
    );
    expect(operations.resolveSetupRestoreAndInitialBoardState).toHaveBeenCalledWith(
      manager,
      false,
      setupOptions
    );
    expect(operations.finalizeSetupUiAndStatsState).toHaveBeenCalledWith(manager, "timer", true);
  });

  it("normalizes non-object setup options to an empty object", () => {
    const operations = createOperations();
    const manager: Record<string, unknown> = {};

    runSetupStateInitialization(manager, 12345, ["invalid"], operations);

    expect(operations.resolveSetupChallengeId).toHaveBeenCalledWith(
      manager,
      {},
      { id: "rch_daily", ranked_session_token: "token" }
    );
    expect(operations.resolveSetupRestoreAndInitialBoardState).toHaveBeenCalledWith(manager, false, {});
  });

  it("schedules ranked checkpoint restore after setup when required", () => {
    const operations = createOperations();
    const scheduleRankedCheckpointRestore = vi.fn();
    const manager = {
      needsRankedCheckpointRestore: true,
      getWindowLike() {
        return {
          OnlineLeaderboardRuntime: {
            scheduleRankedCheckpointRestore
          }
        };
      }
    };

    runSetupStateInitialization(manager, undefined, {}, operations);

    expect(scheduleRankedCheckpointRestore).toHaveBeenCalledWith(manager, { reason: "setup" });
  });

  it("swallows ranked checkpoint scheduling errors", () => {
    const operations = createOperations();
    const manager = {
      needsRankedCheckpointRestore: true,
      getWindowLike() {
        throw new Error("window unavailable");
      }
    };

    expect(() => runSetupStateInitialization(manager, undefined, {}, operations)).not.toThrow();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSetupStateInitializationRuntime();
    expect(runtime.runSetupStateInitialization).toBe(runSetupStateInitialization);
    expect(runtime.resetSetupTimerAndInputState).toBe(resetSetupTimerAndInputState);

    const windowLike: { CoreSetupStateInitializationRuntime?: SetupStateInitializationRuntime } = {};
    expect(installSetupStateInitializationRuntime({ windowLike })).toBe(
      windowLike.CoreSetupStateInitializationRuntime
    );
    expect(windowLike.CoreSetupStateInitializationRuntime?.runSetupStateInitialization).toBe(
      runSetupStateInitialization
    );
    expect(windowLike.CoreSetupStateInitializationRuntime?.resetSetupTimerAndInputState).toBe(
      resetSetupTimerAndInputState
    );

    const existing = { runSetupStateInitialization: vi.fn(), resetSetupTimerAndInputState: vi.fn() };
    expect(
      installSetupStateInitializationRuntime({
        windowLike: { CoreSetupStateInitializationRuntime: existing }
      })
    ).toBe(existing);
  });
});
