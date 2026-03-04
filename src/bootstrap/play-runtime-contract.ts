type AnyRecord = Record<string, unknown>;

export interface PlayRuntimeContractWindowLike {
  CorePlayHeaderRuntime?: unknown;
  CorePlayHeaderHostRuntime?: unknown;
  CorePlayPageContextRuntime?: unknown;
  CorePlayEntryRuntime?: unknown;
  CoreCustomSpawnRuntime?: unknown;
  CorePlayCustomSpawnRuntime?: unknown;
  CorePlayCustomSpawnHostRuntime?: unknown;
  CorePlayChallengeIntroRuntime?: unknown;
  CorePlayChallengeIntroUiRuntime?: unknown;
  CorePlayChallengeIntroActionRuntime?: unknown;
  CorePlayChallengeIntroHostRuntime?: unknown;
  CorePlayChallengeContextRuntime?: unknown;
  CorePlayStartGuardRuntime?: unknown;
  CorePlayStartupPayloadRuntime?: unknown;
  CorePlayStartupContextRuntime?: unknown;
  CorePlayStartupHostRuntime?: unknown;
  CoreStorageRuntime?: unknown;
  CoreBootstrapRuntime?: unknown;
  LegacyBootstrapRuntime?: unknown;
}

export interface ResolvePlayRuntimeContractsResult {
  playHeaderRuntime: AnyRecord;
  playHeaderHostRuntime: AnyRecord;
  playPageContextRuntime: AnyRecord;
  playEntryRuntime: AnyRecord;
  customSpawnRuntime: AnyRecord;
  playCustomSpawnRuntime: AnyRecord;
  playCustomSpawnHostRuntime: AnyRecord;
  playChallengeIntroRuntime: AnyRecord;
  playChallengeIntroUiRuntime: AnyRecord;
  playChallengeIntroActionRuntime: AnyRecord;
  playChallengeIntroHostRuntime: AnyRecord;
  playChallengeContextRuntime: AnyRecord;
  playStartGuardRuntime: AnyRecord;
  playStartupPayloadRuntime: AnyRecord;
  playStartupContextRuntime: AnyRecord;
  playStartupHostRuntime: AnyRecord;
  storageRuntime: AnyRecord;
  bootstrapRuntime: AnyRecord;
}

function hasFunction(target: unknown, key: string): boolean {
  if (!target || typeof target !== "object") return false;
  return typeof (target as AnyRecord)[key] === "function";
}

function requireRuntimeFunctions(
  target: unknown,
  functionNames: string[],
  errorMessage: string
): AnyRecord {
  if (!target || typeof target !== "object") {
    throw new Error(errorMessage);
  }
  for (const functionName of functionNames) {
    if (!hasFunction(target, functionName)) {
      throw new Error(errorMessage);
    }
  }
  return target as AnyRecord;
}

export function resolvePlayRuntimeContracts(
  windowLike: PlayRuntimeContractWindowLike
): ResolvePlayRuntimeContractsResult {
  const source = windowLike || {};

  const playHeaderRuntime = requireRuntimeFunctions(
    source.CorePlayHeaderRuntime,
    [
      "compactPlayModeLabel",
      "resolvePlayRulesText",
      "buildPlayModeIntroText",
      "resolvePlayHeaderState"
    ],
    "CorePlayHeaderRuntime is required"
  );
  const playHeaderHostRuntime = requireRuntimeFunctions(
    source.CorePlayHeaderHostRuntime,
    ["resolvePlayHeaderFromContext"],
    "CorePlayHeaderHostRuntime is required"
  );
  const playPageContextRuntime = requireRuntimeFunctions(
    source.CorePlayPageContextRuntime,
    ["resolvePlayCustomSpawnModeConfigFromPageContext", "applyPlayHeaderFromPageContext"],
    "CorePlayPageContextRuntime is required"
  );
  const playEntryRuntime = requireRuntimeFunctions(
    source.CorePlayEntryRuntime,
    ["resolvePlayEntryPlan"],
    "CorePlayEntryRuntime is required"
  );
  const customSpawnRuntime = requireRuntimeFunctions(
    source.CoreCustomSpawnRuntime,
    [
      "isCustomSpawnModeKey",
      "sanitizeCustomFourRate",
      "formatRatePercent",
      "inferFourRateFromSpawnTable",
      "applyCustomFourRateToModeConfig"
    ],
    "CoreCustomSpawnRuntime is required"
  );
  const playCustomSpawnRuntime = requireRuntimeFunctions(
    source.CorePlayCustomSpawnRuntime,
    ["resolvePlayCustomSpawnModeConfig"],
    "CorePlayCustomSpawnRuntime is required"
  );
  const playCustomSpawnHostRuntime = requireRuntimeFunctions(
    source.CorePlayCustomSpawnHostRuntime,
    ["resolvePlayCustomSpawnModeConfigFromContext"],
    "CorePlayCustomSpawnHostRuntime is required"
  );
  const playChallengeIntroRuntime = requireRuntimeFunctions(
    source.CorePlayChallengeIntroRuntime,
    ["resolvePlayChallengeIntroModel"],
    "CorePlayChallengeIntroRuntime is required"
  );
  const playChallengeIntroUiRuntime = requireRuntimeFunctions(
    source.CorePlayChallengeIntroUiRuntime,
    ["resolvePlayChallengeIntroUiState"],
    "CorePlayChallengeIntroUiRuntime is required"
  );
  const playChallengeIntroActionRuntime = requireRuntimeFunctions(
    source.CorePlayChallengeIntroActionRuntime,
    ["resolvePlayChallengeIntroActionState"],
    "CorePlayChallengeIntroActionRuntime is required"
  );
  const playChallengeIntroHostRuntime = requireRuntimeFunctions(
    source.CorePlayChallengeIntroHostRuntime,
    ["resolvePlayChallengeIntroFromContext"],
    "CorePlayChallengeIntroHostRuntime is required"
  );
  const playChallengeContextRuntime = requireRuntimeFunctions(
    source.CorePlayChallengeContextRuntime,
    ["resolvePlayChallengeContext"],
    "CorePlayChallengeContextRuntime is required"
  );
  const playStartGuardRuntime = requireRuntimeFunctions(
    source.CorePlayStartGuardRuntime,
    ["resolvePlayStartGuardState"],
    "CorePlayStartGuardRuntime is required"
  );
  const playStartupPayloadRuntime = requireRuntimeFunctions(
    source.CorePlayStartupPayloadRuntime,
    ["resolvePlayStartupPayload"],
    "CorePlayStartupPayloadRuntime is required"
  );
  const playStartupContextRuntime = requireRuntimeFunctions(
    source.CorePlayStartupContextRuntime,
    ["resolvePlayStartupContext"],
    "CorePlayStartupContextRuntime is required"
  );
  const playStartupHostRuntime = requireRuntimeFunctions(
    source.CorePlayStartupHostRuntime,
    ["resolvePlayStartupFromContext"],
    "CorePlayStartupHostRuntime is required"
  );
  const storageRuntime = requireRuntimeFunctions(
    source.CoreStorageRuntime,
    ["resolveStorageByName", "safeReadStorageItem", "safeSetStorageItem"],
    "CoreStorageRuntime is required"
  );
  const bootstrapRuntime = requireRuntimeFunctions(
    source.CoreBootstrapRuntime || source.LegacyBootstrapRuntime,
    ["startGameOnAnimationFrame"],
    "CoreBootstrapRuntime.startGameOnAnimationFrame is required"
  );

  return {
    playHeaderRuntime,
    playHeaderHostRuntime,
    playPageContextRuntime,
    playEntryRuntime,
    customSpawnRuntime,
    playCustomSpawnRuntime,
    playCustomSpawnHostRuntime,
    playChallengeIntroRuntime,
    playChallengeIntroUiRuntime,
    playChallengeIntroActionRuntime,
    playChallengeIntroHostRuntime,
    playChallengeContextRuntime,
    playStartGuardRuntime,
    playStartupPayloadRuntime,
    playStartupContextRuntime,
    playStartupHostRuntime,
    storageRuntime,
    bootstrapRuntime
  };
}
