export interface SetupGameManagerLike {
  width: number;
  height: number;
  actuator?: {
    clearContainer?: (container: unknown) => void;
    tileContainer?: unknown;
  } | null;
  rankPolicy?: unknown;
  rankedSetupBlockedUntilSessionReady?: boolean;
  rankedSessionToken?: unknown;
  challengeId?: unknown;
  over?: boolean;
  won?: boolean;
  keepPlaying?: boolean;
  normalizeModeConfig: (modeKey: unknown, modeConfig: unknown) => unknown;
  setRuntimeGrid: (grid: unknown) => void;
  setRuntimeScore: (score: number) => void;
}

export interface SetupGameOperations {
  isNonArrayObject: (value: unknown) => boolean;
  detectMode: (manager: SetupGameManagerLike) => unknown;
  resolveSetupModeConfig: (
    manager: SetupGameManagerLike,
    setupOptions: Record<string, unknown>,
    detectedMode: unknown
  ) => Record<string, unknown> | null | undefined;
  resolveSetupNoXModeConfig: (
    manager: SetupGameManagerLike,
    config: unknown,
    setupOptions: Record<string, unknown>,
    inputSeed: unknown
  ) => unknown;
  applySetupModeConfig: (manager: SetupGameManagerLike, config: unknown) => void;
  isRankedSeedRequiredForSetup?: (manager: SetupGameManagerLike) => boolean;
  shouldBlockRankedSetupWithoutSeed?: (manager: SetupGameManagerLike) => boolean;
  hasLegalRankedSetupSeed?: (manager: SetupGameManagerLike) => boolean;
  ensureSingleModePageLock: (manager: SetupGameManagerLike) => boolean;
  handleSingleModePageDuplicate: (manager: SetupGameManagerLike) => void;
  createGrid: (width: number, height: number) => unknown;
  runSetupStateInitialization: (
    manager: SetupGameManagerLike,
    inputSeed: unknown,
    setupOptions: Record<string, unknown>
  ) => void;
  clearRankedBlockedBoardView?: (manager: SetupGameManagerLike) => void;
}

export interface SetupGameRuntime {
  setupGame: typeof setupGame;
}

export interface SetupGameWindowLike {
  CoreSetupGameRuntime?: SetupGameRuntime;
}

export interface SetupGameRuntimeInstallOptions {
  windowLike?: SetupGameWindowLike | null;
}

function resolveModeConfigKey(config: Record<string, unknown> | null | undefined): unknown {
  return config && Object.prototype.hasOwnProperty.call(config, "key") ? config.key : undefined;
}

export function setupGame(
  manager: SetupGameManagerLike | null | undefined,
  inputSeed: unknown,
  options: unknown,
  operations: SetupGameOperations
): void {
  if (!manager) return;
  const setupOptions = operations.isNonArrayObject(options) ? (options as Record<string, unknown>) : {};
  const detectedMode = operations.detectMode(manager);
  const resolvedModeConfig = operations.resolveSetupModeConfig(manager, setupOptions, detectedMode);
  const cfg = operations.resolveSetupNoXModeConfig(
    manager,
    manager.normalizeModeConfig(resolveModeConfigKey(resolvedModeConfig), resolvedModeConfig),
    setupOptions,
    inputSeed
  );
  operations.applySetupModeConfig(manager, cfg);
  const rankedSeedRequired = operations.isRankedSeedRequiredForSetup?.(manager) !== false;
  const shouldBlockUnseededRankedSetup = operations.shouldBlockRankedSetupWithoutSeed?.(manager) !== false;
  if (
    manager.rankPolicy === "ranked" &&
    rankedSeedRequired &&
    shouldBlockUnseededRankedSetup &&
    operations.hasLegalRankedSetupSeed?.(manager) === false
  ) {
    manager.rankedSetupBlockedUntilSessionReady = true;
    manager.rankedSessionToken = "";
    manager.challengeId = null;
    manager.setRuntimeGrid(null);
    operations.clearRankedBlockedBoardView?.(manager);
    return;
  }
  manager.rankedSetupBlockedUntilSessionReady = false;
  if (!operations.ensureSingleModePageLock(manager)) {
    operations.handleSingleModePageDuplicate(manager);
    return;
  }
  manager.setRuntimeGrid(operations.createGrid(manager.width, manager.height));
  manager.setRuntimeScore(0);
  manager.over = false;
  manager.won = false;
  manager.keepPlaying = false;
  operations.runSetupStateInitialization(manager, inputSeed, setupOptions);
}

export function createSetupGameRuntime(): SetupGameRuntime {
  return {
    setupGame
  };
}

export function installSetupGameRuntime(
  options: SetupGameRuntimeInstallOptions = {}
): SetupGameRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SetupGameWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSetupGameRuntime) {
    target.CoreSetupGameRuntime = createSetupGameRuntime();
  }
  return target.CoreSetupGameRuntime;
}
