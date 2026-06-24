import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

import { createRankedSessionSetupContextRuntime } from "../../src/core/ranked-session-setup-context";
import { createResetSetupReplayAndSpawnStateRuntime } from "../../src/core/reset-setup-replay-and-spawn-state";
import { createRestartGameRuntime } from "../../src/core/restart-game";
import { createSessionReplaySnapshotRuntime } from "../../src/core/session-replay-snapshot";
import { createSetupRestoreInitialBoardStateRuntime } from "../../src/core/setup-restore-initial-board-state";
import { createSetupGameRuntime } from "../../src/core/setup-game";
import { createSetupStateInitializationRuntime } from "../../src/core/setup-state-initialization";

type RestartSeedRuntime = {
  createFallbackFreshSetupSeed: (manager: Record<string, unknown> | null) => number;
  resolveReplayV1InitTilesFromBoardMatrix: (
    manager: Record<string, unknown> | null,
    board: unknown,
    width: number,
    height: number,
    ruleset: string
  ) => unknown;
  initializeSetupSeedAndReplayState: (
    manager: Record<string, unknown> | null,
    inputSeed?: unknown
  ) => { hasInputSeed: boolean; rankedSessionContext?: Record<string, unknown> | null };
  initializeSetupSessionReplaySnapshot: (manager: Record<string, unknown> | null) => void;
  resolveSetupRestoreAndInitialBoardState: (
    manager: Record<string, unknown> | null,
    hasInputSeed: boolean,
    normalizedOptions: Record<string, unknown>
  ) => { restoredFromSavedState: boolean };
  shouldForceRankedCheckpointRestoreInSetup: (
    manager: Record<string, unknown> | null
  ) => boolean;
  resolveSetupChallengeId: (
    manager: Record<string, unknown> | null,
    normalizedOptions: Record<string, unknown>,
    rankedSessionContext: unknown
  ) => unknown;
  runSetupStateInitialization: (
    manager: Record<string, unknown> | null,
    inputSeed?: unknown,
    setupOptions?: unknown
  ) => void;
  restartGame: (manager: Record<string, unknown> | null) => void | Promise<void>;
  restartWithBoard: (
    manager: Record<string, unknown> | null,
    board: unknown,
    modeConfig?: unknown,
    options?: unknown
  ) => void;
  resetSetupTimerAndInputState: (manager: Record<string, unknown>) => void;
  resolveRestartConfirmLanguage: (manager: Record<string, unknown> | null) => string;
  resolveSingleModePageTabId: (windowLike: Record<string, unknown> | null) => string;
  setupGame: (
    manager: Record<string, unknown> | null,
    inputSeed?: unknown,
    options?: unknown
  ) => void;
};

function loadRestartSeedRuntime(options?: {
  browserConfirm?: (this: unknown, message: string) => boolean;
  globalCrypto?: { getRandomValues?: (values: Uint32Array) => Uint32Array | void } | null;
  mathRandomValue?: number;
  nowMs?: number;
  performanceNowMs?: number;
  windowLike?: Record<string, unknown>;
  sessionReplaySnapshotRuntime?: {
    initializeSetupSessionReplaySnapshot?: (manager: Record<string, unknown> | null) => void;
    resolveReplayV1InitTilesFromBoardMatrix?: (
      payload: Record<string, unknown>
    ) => unknown;
  };
  setupRestoreInitialBoardStateRuntime?: {
    resolveSetupRestoreAndInitialBoardState?: (
      manager: Record<string, unknown> | null,
      hasInputSeed: boolean,
      normalizedOptions: Record<string, unknown>,
      operations: Record<string, unknown>
    ) => { restoredFromSavedState: boolean };
    shouldForceRankedCheckpointRestoreInSetup?: (
      manager: Record<string, unknown> | null
    ) => boolean;
  };
  setupStateInitializationRuntime?: {
    runSetupStateInitialization?: (
      manager: Record<string, unknown> | null,
      inputSeed: unknown,
      setupOptions: unknown,
      operations: Record<string, unknown>
    ) => void;
    resetSetupTimerAndInputState?: (
      manager: Record<string, unknown> | null,
      operations: Record<string, unknown>
    ) => void;
    resolveSetupChallengeId?: (
      manager: Record<string, unknown> | null,
      normalizedOptions: Record<string, unknown>,
      rankedSessionContext: unknown
    ) => unknown;
  };
  setupGameRuntime?: {
    setupGame?: (
      manager: Record<string, unknown> | null,
      inputSeed: unknown,
      options: unknown,
      operations: Record<string, unknown>
    ) => void;
  };
  resetSetupReplayAndSpawnStateRuntime?: {
    resetSetupReplayAndSpawnState?: (
      manager: Record<string, unknown> | null,
      operations: Record<string, unknown>
    ) => void;
  };
  restartGameRuntime?: {
    restartGame?: (
      manager: Record<string, unknown> | null,
      operations: Record<string, unknown>
    ) => void;
    restartGameAsync?: (
      manager: Record<string, unknown> | null,
      operations: Record<string, unknown>
    ) => Promise<void>;
    createFallbackFreshSetupSeed?: (payload: Record<string, unknown>) => number;
    resolveRestartConfirmLanguage?: (manager: Record<string, unknown> | null) => string;
  };
  resolveManagerDocumentLike?: (manager: Record<string, unknown> | null) => unknown;
  setBoardFromMatrix?: (manager: Record<string, unknown> | null, board: unknown) => void;
  getFinalBoardMatrix?: (manager: Record<string, unknown> | null) => unknown;
  singleModePageLockRuntime?: {
    ensureSingleModePageLock?: (
      manager: Record<string, unknown> | null,
      options: Record<string, unknown>
    ) => boolean;
    resolveSingleModePageTabId?: (
      windowLike: Record<string, unknown> | null,
      options: Record<string, unknown>
    ) => string;
  };
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
    confirm: options?.browserConfirm,
    crypto: options?.globalCrypto || null,
    clearInterval: vi.fn(),
    Date: { now: dateNow },
    performance: { now: performanceNow },
    isNonArrayObject: (value: unknown) => !!value && typeof value === "object" && !Array.isArray(value),
    resolveManagerDocumentLike: options?.resolveManagerDocumentLike,
    setBoardFromMatrix: options?.setBoardFromMatrix,
    getFinalBoardMatrix: options?.getFinalBoardMatrix,
    window: options?.windowLike
  } as Record<string, unknown>;
  context.CoreRankedSessionSetupContextRuntime = createRankedSessionSetupContextRuntime();
  context.CoreSessionReplaySnapshotRuntime =
    options?.sessionReplaySnapshotRuntime || createSessionReplaySnapshotRuntime();
  context.CoreSetupRestoreInitialBoardStateRuntime =
    options?.setupRestoreInitialBoardStateRuntime || createSetupRestoreInitialBoardStateRuntime();
  context.CoreSetupStateInitializationRuntime =
    options?.setupStateInitializationRuntime || createSetupStateInitializationRuntime();
  context.CoreSetupGameRuntime = options?.setupGameRuntime || createSetupGameRuntime();
  context.CoreResetSetupReplayAndSpawnStateRuntime =
    options?.resetSetupReplayAndSpawnStateRuntime || createResetSetupReplayAndSpawnStateRuntime();
  context.CoreRestartGameRuntime = options?.restartGameRuntime || createRestartGameRuntime();
  if (options?.singleModePageLockRuntime) {
    context.CoreSingleModePageLockRuntime = options.singleModePageLockRuntime;
  }

  vm.runInNewContext(script, context);

  return {
    runtime: context as RestartSeedRuntime,
    mathRandom,
    dateNow,
    performanceNow
  };
}

describe("core game manager restart seed runtime", () => {
  it("delegates setup game orchestration to the TypeScript runtime", () => {
    const setupGame = vi.fn();
    const { runtime } = loadRestartSeedRuntime({
      setupGameRuntime: {
        setupGame
      },
      singleModePageLockRuntime: {
        ensureSingleModePageLock: vi.fn(() => false)
      }
    });
    const manager = {
      width: 4,
      height: 4,
      normalizeModeConfig: vi.fn(() => ({ key: "practice" })),
      setRuntimeGrid: vi.fn(),
      setRuntimeScore: vi.fn()
    };
    const options = { restore: true };

    runtime.setupGame(manager, 123, options);

    expect(setupGame).toHaveBeenCalledWith(
      manager,
      123,
      options,
      expect.objectContaining({
        applySetupModeConfig: expect.any(Function),
        createGrid: expect.any(Function),
        detectMode: expect.any(Function),
        ensureSingleModePageLock: expect.any(Function),
        handleSingleModePageDuplicate: expect.any(Function),
        clearRankedBlockedBoardView: expect.any(Function),
        isNonArrayObject: expect.any(Function),
        resolveSetupModeConfig: expect.any(Function),
        resolveSetupNoXModeConfig: expect.any(Function),
        runSetupStateInitialization: expect.any(Function)
      })
    );
  });

  it("clears rendered tiles when delegated setup blocks a ranked game without a legal seed", () => {
    let operations: Record<string, unknown> | null = null;
    const setupGame = vi.fn((_manager, _inputSeed, _options, runtimeOperations) => {
      operations = runtimeOperations;
    });
    const { runtime } = loadRestartSeedRuntime({
      setupGameRuntime: {
        setupGame
      }
    });
    const tileContainer = { id: "tiles" };
    const manager = {
      actuator: {
        clearContainer: vi.fn(),
        tileContainer
      }
    } as Record<string, unknown>;

    runtime.setupGame(manager, undefined, {});
    expect(operations).not.toBeNull();

    (operations?.clearRankedBlockedBoardView as (target: Record<string, unknown>) => void)(manager);

    expect((manager.actuator as { clearContainer: ReturnType<typeof vi.fn> }).clearContainer).toHaveBeenCalledWith(
      tileContainer
    );
  });

  it("delegates single-mode tab id resolution to the core runtime", () => {
    const resolveSingleModePageTabId = vi.fn(() => "tab-from-runtime");
    const windowLike = {};
    const { runtime } = loadRestartSeedRuntime({
      windowLike,
      singleModePageLockRuntime: {
        resolveSingleModePageTabId
      }
    });

    expect(runtime.resolveSingleModePageTabId(windowLike)).toBe("tab-from-runtime");
    expect(resolveSingleModePageTabId).toHaveBeenCalledWith(
      windowLike,
      expect.objectContaining({
        tabIdSessionKey: "playModeSinglePageTabId:v1",
        createId: expect.any(Function)
      })
    );
  });

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

  it("delegates fallback fresh setup seed mixing to the core restart runtime", () => {
    const createFallbackFreshSetupSeed = vi.fn(() => 987_654_321);
    const { runtime } = loadRestartSeedRuntime({
      nowMs: 1_234,
      performanceNowMs: 5.678,
      restartGameRuntime: {
        restartGame: vi.fn(),
        createFallbackFreshSetupSeed
      }
    });
    const manager = {} as Record<string, unknown>;

    expect(runtime.createFallbackFreshSetupSeed(manager)).toBe(987_654_321);
    expect(manager.freshSetupSeedCounter).toBe(1);
    expect(createFallbackFreshSetupSeed).toHaveBeenCalledWith({
      nowMs: 1_234,
      performanceNowMicros: 5_678,
      counter: 1
    });
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

  it("does not write a board or actuate when ranked restart setup is blocked until a seed is ready", () => {
    const setBoardFromMatrix = vi.fn();
    const getFinalBoardMatrix = vi.fn(() => [[0, 0], [0, 0]]);
    const { runtime } = loadRestartSeedRuntime({ setBoardFromMatrix, getFinalBoardMatrix });
    const manager = {
      actuator: {
        continue: vi.fn()
      },
      rankedSetupBlockedUntilSessionReady: false,
      setup: vi.fn(function (this: Record<string, unknown>) {
        this.rankedSetupBlockedUntilSessionReady = true;
      }),
      actuate: vi.fn(),
    } as Record<string, unknown>;

    runtime.restartWithBoard(manager, [[2, 0], [0, 0]], null, { preserveSeed: true });

    expect(manager.actuator.continue).toHaveBeenCalledTimes(1);
    expect(manager.setup).toHaveBeenCalledWith(undefined, {
      skipStartTiles: true,
      modeConfig: null,
      disableStateRestore: true
    });
    expect(manager.initialBoardMatrix).toBeUndefined();
    expect(manager.replayStartBoardMatrix).toBeUndefined();
    expect(setBoardFromMatrix).not.toHaveBeenCalled();
    expect(getFinalBoardMatrix).not.toHaveBeenCalled();
    expect(manager.actuate).not.toHaveBeenCalled();
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

  it("delegates replay v1 init tile resolution to the TypeScript runtime", () => {
    const initTiles = [{ cellIndex: 3, valueBit: 1 }];
    const resolveReplayV1InitTilesFromBoardMatrix = vi.fn(() => initTiles);
    const { runtime } = loadRestartSeedRuntime({
      sessionReplaySnapshotRuntime: {
        initializeSetupSessionReplaySnapshot: vi.fn(),
        resolveReplayV1InitTilesFromBoardMatrix
      }
    });
    const manager = {} as Record<string, unknown>;
    const board = [[2, 4]];

    expect(runtime.resolveReplayV1InitTilesFromBoardMatrix(manager, board, 2, 1, "pow2")).toBe(initTiles);
    expect(resolveReplayV1InitTilesFromBoardMatrix).toHaveBeenCalledWith({
      board,
      width: 2,
      height: 1,
      ruleset: "pow2"
    });
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

  it("delegates setup session replay snapshot initialization to the TypeScript runtime", () => {
    const initializeSetupSessionReplaySnapshot = vi.fn();
    const { runtime } = loadRestartSeedRuntime({
      sessionReplaySnapshotRuntime: {
        initializeSetupSessionReplaySnapshot
      }
    });
    const manager = { modeKey: "practice" } as Record<string, unknown>;

    runtime.initializeSetupSessionReplaySnapshot(manager);

    expect(initializeSetupSessionReplaySnapshot).toHaveBeenCalledWith(manager);
    expect(manager.sessionReplayV3).toBeUndefined();
    expect(manager.sessionReplayV1).toBeUndefined();
  });

  it("delegates setup restore and initial board state resolution to the TypeScript runtime", () => {
    const resolveSetupRestoreAndInitialBoardState = vi.fn(() => ({ restoredFromSavedState: true }));
    const { runtime } = loadRestartSeedRuntime({
      setupRestoreInitialBoardStateRuntime: {
        resolveSetupRestoreAndInitialBoardState
      }
    });
    const manager = { modeKey: "standard_4x4_pow2_no_undo" } as Record<string, unknown>;
    const normalizedOptions = { disableStateRestore: false };

    const result = runtime.resolveSetupRestoreAndInitialBoardState(manager, false, normalizedOptions);

    expect(result).toEqual({ restoredFromSavedState: true });
    expect(resolveSetupRestoreAndInitialBoardState).toHaveBeenCalledWith(
      manager,
      false,
      normalizedOptions,
      expect.objectContaining({
        shouldTryRestoreSavedStateInSetup: expect.any(Function),
        tryRestoreLatestSavedState: undefined,
        shouldForceRankedCheckpointRestoreInSetup: expect.any(Function),
        readRankedCheckpointLocalMirrorSavedStateForSetup: expect.any(Function),
        applySavedStateRestore: undefined,
        shouldScheduleRankedCheckpointRestoreInSetup: expect.any(Function),
        hasRankedCheckpointAuthTokenForSetup: expect.any(Function),
        placeStoneTilesForSetup: expect.any(Function),
        seedInitialTilesAndSnapshotBoard: expect.any(Function)
      })
    );
  });

  it("delegates setup state initialization orchestration to the TypeScript runtime", () => {
    const runSetupStateInitialization = vi.fn();
    const { runtime } = loadRestartSeedRuntime({
      setupStateInitializationRuntime: {
        runSetupStateInitialization
      }
    });
    const manager = { modeKey: "standard_4x4_pow2_no_undo" } as Record<string, unknown>;
    const setupOptions = { disableStateRestore: false };

    runtime.runSetupStateInitialization(manager, 12345, setupOptions);

    expect(runSetupStateInitialization).toHaveBeenCalledWith(
      manager,
      12345,
      setupOptions,
      expect.objectContaining({
        initializeSetupSeedAndReplayState: expect.any(Function),
        resetSetupRuntimeState: expect.any(Function),
        resolveSetupChallengeId: expect.any(Function),
        resolveSetupRankedSessionToken: expect.any(Function),
        initializeSetupSessionReplaySnapshot: expect.any(Function),
        initializeTimerMilestones: undefined,
        resetRoundStatsState: undefined,
        resetTimerUiForSetup: undefined,
        resolvePreferredTimerModuleViewForSetup: expect.any(Function),
        resolveSetupRestoreAndInitialBoardState: expect.any(Function),
        syncSetupSessionReplayV1InitTiles: expect.any(Function),
        finalizeSetupUiAndStatsState: expect.any(Function)
      })
    );
  });

  it("delegates setup replay and spawn reset to the TypeScript runtime", () => {
    const resetSetupReplayAndSpawnState = vi.fn();
    const { runtime } = loadRestartSeedRuntime({
      resetSetupReplayAndSpawnStateRuntime: {
        resetSetupReplayAndSpawnState
      }
    });
    const manager = { clientRecordId: "client-1" } as Record<string, unknown>;

    (runtime as unknown as { resetSetupReplayAndSpawnState: (manager: Record<string, unknown>) => void })
      .resetSetupReplayAndSpawnState(manager);

    expect(resetSetupReplayAndSpawnState).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        assignManagerClientRecordId: undefined
      })
    );
    expect(manager.clientRecordId).toBe("client-1");
  });

  it("delegates restart game orchestration to the TypeScript runtime", () => {
    const restartGame = vi.fn();
    const { runtime } = loadRestartSeedRuntime({
      restartGameRuntime: {
        restartGame
      }
    });
    const manager = { modeKey: "practice" } as Record<string, unknown>;

    runtime.restartGame(manager);

    expect(restartGame).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        confirmRestart: expect.any(Function),
        resolveRestartConfirmMessage: expect.any(Function),
        shouldClearPracticeBoardOnRestart: expect.any(Function),
        createEmptyPracticeBoardMatrix: expect.any(Function),
        restartWithBoard: expect.any(Function)
      })
    );
  });

  it("binds browser confirm to window before delegating restart orchestration", () => {
    const windowLike: Record<string, unknown> = {};
    const browserConfirm = vi.fn(function (this: unknown, message: string) {
      if (this !== windowLike) {
        throw new TypeError("Illegal invocation");
      }
      return message === "Start a new game?";
    });
    windowLike.confirm = browserConfirm;
    const restartGame = vi.fn((_manager: Record<string, unknown> | null, operations) => {
      const confirmRestart = operations.confirmRestart as (message: string) => boolean;

      expect(confirmRestart("Start a new game?")).toBe(true);
    });
    const { runtime } = loadRestartSeedRuntime({
      browserConfirm,
      windowLike,
      restartGameRuntime: {
        restartGame
      }
    });

    runtime.restartGame({ modeKey: "standard_4x4_pow2_no_undo" });

    expect(browserConfirm).toHaveBeenCalledWith("Start a new game?");
  });

  it("uses the game dialog for restart confirmation before falling back to browser confirm", async () => {
    const browserConfirm = vi.fn(() => true);
    const gameDialogConfirm = vi.fn(async (message: string) => message === "Start a new game?");
    const windowLike: Record<string, unknown> = {
      confirm: browserConfirm,
      GameDialog: {
        confirm: gameDialogConfirm
      }
    };
    const restartGameAsync = vi.fn(async (_manager: Record<string, unknown> | null, operations) => {
      const confirmRestartAsync = operations.confirmRestartAsync as (message: string) => Promise<boolean>;

      expect(await confirmRestartAsync("Start a new game?")).toBe(true);
    });
    const { runtime } = loadRestartSeedRuntime({
      browserConfirm,
      windowLike,
      restartGameRuntime: {
        restartGame: vi.fn(),
        restartGameAsync
      }
    });

    await runtime.restartGame({ modeKey: "standard_4x4_pow2_no_undo" });

    expect(gameDialogConfirm).toHaveBeenCalledWith("Start a new game?", {
      kind: "confirm"
    });
    expect(browserConfirm).not.toHaveBeenCalled();
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

  it("delegates setup timer and input reset to the TypeScript runtime", () => {
    const resetSetupTimerAndInputState = vi.fn();
    const { runtime } = loadRestartSeedRuntime({
      setupStateInitializationRuntime: {
        runSetupStateInitialization: vi.fn(),
        resetSetupTimerAndInputState
      }
    });
    const manager = {
      timerID: 99
    } as Record<string, unknown>;

    runtime.resetSetupTimerAndInputState(manager);

    expect(resetSetupTimerAndInputState).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        clearInterval: expect.any(Function)
      })
    );
  });

  it("delegates forced ranked checkpoint restore detection to the TypeScript runtime", () => {
    const shouldForceRankedCheckpointRestoreInSetup = vi.fn(() => true);
    const { runtime } = loadRestartSeedRuntime({
      setupRestoreInitialBoardStateRuntime: {
        resolveSetupRestoreAndInitialBoardState: vi.fn(),
        shouldForceRankedCheckpointRestoreInSetup
      }
    });
    const manager = {
      rankPolicy: "ranked"
    } as Record<string, unknown>;

    expect(runtime.shouldForceRankedCheckpointRestoreInSetup(manager)).toBe(true);
    expect(shouldForceRankedCheckpointRestoreInSetup).toHaveBeenCalledWith(manager);
  });

  it("delegates restart confirm language resolution to the TypeScript runtime", () => {
    const resolveRestartConfirmLanguage = vi.fn(() => "en");
    const { runtime } = loadRestartSeedRuntime({
      restartGameRuntime: {
        restartGame: vi.fn(),
        createFallbackFreshSetupSeed: vi.fn(),
        resolveRestartConfirmLanguage
      }
    });
    const manager = {
      getWindowLike: vi.fn(() => ({
        localStorage: {
          getItem: vi.fn(() => "zh")
        }
      }))
    } as Record<string, unknown>;

    expect(runtime.resolveRestartConfirmLanguage(manager)).toBe("en");
    expect(resolveRestartConfirmLanguage).toHaveBeenCalledWith(manager);
  });

  it("uses the env document helper when restart confirm fallback reads the root language", () => {
    const documentElement = {
      getAttribute: vi.fn((name: string) => (name === "data-ui-lang" ? "en-US" : ""))
    };
    const resolveManagerDocumentLike = vi.fn(() => ({ documentElement }));
    const { runtime } = loadRestartSeedRuntime({
      resolveManagerDocumentLike,
      restartGameRuntime: {
        restartGame: vi.fn(),
        createFallbackFreshSetupSeed: vi.fn()
      }
    });
    const manager = {
      getWindowLike: vi.fn(() => ({
        localStorage: {
          getItem: vi.fn(() => "")
        }
      }))
    } as Record<string, unknown>;

    expect(runtime.resolveRestartConfirmLanguage(manager)).toBe("en");
    expect(resolveManagerDocumentLike).toHaveBeenCalledWith(manager);
  });

  it("delegates setup challenge id resolution to the TypeScript runtime", () => {
    const resolveSetupChallengeId = vi.fn(() => "rch_runtime");
    const { runtime } = loadRestartSeedRuntime({
      setupStateInitializationRuntime: {
        runSetupStateInitialization: vi.fn(),
        resetSetupTimerAndInputState: vi.fn(),
        resolveSetupChallengeId
      }
    });
    const manager = {
      getWindowLike: vi.fn(() => ({
        GAME_CHALLENGE_CONTEXT: {
          id: "rch_window"
        }
      }))
    } as Record<string, unknown>;
    const options = { challengeId: "rch_options" };
    const rankedContext = { id: "rch_ranked" };

    expect(runtime.resolveSetupChallengeId(manager, options, rankedContext)).toBe("rch_runtime");
    expect(resolveSetupChallengeId).toHaveBeenCalledWith(manager, options, rankedContext);
  });
});
