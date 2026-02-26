function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function hasOwnKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

export function resolvePlayPageDefaults(input?: unknown): Record<string, unknown> {
  const source = toRecord(input);
  return {
    defaultModeKey:
      typeof source.defaultModeKey === "string"
        ? source.defaultModeKey
        : "standard_4x4_pow2_no_undo",
    invalidModeRedirectUrl:
      typeof source.invalidModeRedirectUrl === "string"
        ? source.invalidModeRedirectUrl
        : "play.html?mode_key=standard_4x4_pow2_no_undo",
    invalidModeMessage:
      typeof source.invalidModeMessage === "string"
        ? source.invalidModeMessage
        : "无效模式，已回退到标准模式",
    defaultBoardWidth: typeof source.defaultBoardWidth === "number" ? source.defaultBoardWidth : 4,
    customFourRateStorageKey:
      typeof source.customFourRateStorageKey === "string"
        ? source.customFourRateStorageKey
        : "custom_spawn_4x4_four_rate_v1"
  };
}

export function resolvePlayPageRuntimes(input: {
  windowLike?: unknown;
  playRuntimeContractRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const playRuntimeContractRuntime = toRecord(
    source.playRuntimeContractRuntime || windowLike.CorePlayRuntimeContractRuntime
  );
  const resolvePlayRuntimeContracts = asFunction<(windowLike: unknown) => unknown>(
    playRuntimeContractRuntime.resolvePlayRuntimeContracts
  );
  if (!resolvePlayRuntimeContracts) {
    throw new Error("CorePlayRuntimeContractRuntime is required");
  }

  const result = resolvePlayRuntimeContracts(windowLike);
  return isRecord(result) ? result : {};
}

export function applyPlayPageBootstrap(input: {
  windowLike?: unknown;
  inputManagerCtor?: unknown;
  playPageDefaults?: unknown;
  playRuntimes?: unknown;
  playRuntimeContractRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const sourceDefaults = toRecord(source.playPageDefaults);
  const playPageDefaults = hasOwnKeys(sourceDefaults) ? sourceDefaults : resolvePlayPageDefaults();
  const sourcePlayRuntimes = toRecord(source.playRuntimes);
  const playRuntimes = hasOwnKeys(sourcePlayRuntimes)
    ? sourcePlayRuntimes
    : resolvePlayPageRuntimes({
        windowLike,
        playRuntimeContractRuntime: source.playRuntimeContractRuntime
      });

  const bootstrapRuntime = toRecord(playRuntimes.bootstrapRuntime);
  const startGameOnAnimationFrame = asFunction<(callback: () => unknown) => unknown>(
    bootstrapRuntime.startGameOnAnimationFrame
  );
  if (!startGameOnAnimationFrame) {
    return {
      started: false,
      missingBootstrapRuntime: true
    };
  }

  const playStartupHostRuntime = toRecord(playRuntimes.playStartupHostRuntime);
  const resolvePlayStartupFromContext = asFunction<(payload: unknown) => unknown>(
    playStartupHostRuntime.resolvePlayStartupFromContext
  );
  if (!resolvePlayStartupFromContext) {
    return {
      started: false,
      missingStartupRuntime: true
    };
  }

  const playHeaderRuntime = toRecord(playRuntimes.playHeaderRuntime);
  const playHeaderHostRuntime = toRecord(playRuntimes.playHeaderHostRuntime);
  const playPageContextRuntime = toRecord(playRuntimes.playPageContextRuntime);
  const playEntryRuntime = toRecord(playRuntimes.playEntryRuntime);
  const playCustomSpawnRuntime = toRecord(playRuntimes.playCustomSpawnRuntime);
  const playCustomSpawnHostRuntime = toRecord(playRuntimes.playCustomSpawnHostRuntime);
  const playChallengeIntroRuntime = toRecord(playRuntimes.playChallengeIntroRuntime);
  const playChallengeIntroUiRuntime = toRecord(playRuntimes.playChallengeIntroUiRuntime);
  const playChallengeIntroActionRuntime = toRecord(playRuntimes.playChallengeIntroActionRuntime);
  const playChallengeIntroHostRuntime = toRecord(playRuntimes.playChallengeIntroHostRuntime);
  const playChallengeContextRuntime = toRecord(playRuntimes.playChallengeContextRuntime);
  const playStartGuardRuntime = toRecord(playRuntimes.playStartGuardRuntime);
  const playStartupPayloadRuntime = toRecord(playRuntimes.playStartupPayloadRuntime);
  const playStartupContextRuntime = toRecord(playRuntimes.playStartupContextRuntime);
  const storageRuntime = toRecord(playRuntimes.storageRuntime);

  const customFourRateStorageKey =
    typeof playCustomSpawnHostRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY === "string"
      ? playCustomSpawnHostRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY
      : playPageDefaults.customFourRateStorageKey;
  const inputManagerCtor = source.inputManagerCtor || windowLike.KeyboardInputManager;

  const startupResult = startGameOnAnimationFrame(function () {
    return resolvePlayStartupFromContext({
      windowLike,
      defaultModeKey: playPageDefaults.defaultModeKey,
      invalidModeRedirectUrl: playPageDefaults.invalidModeRedirectUrl,
      invalidModeMessage: playPageDefaults.invalidModeMessage,
      defaultBoardWidth: playPageDefaults.defaultBoardWidth,
      inputManagerCtor,
      resolveEntryPlan: playEntryRuntime.resolvePlayEntryPlan,
      resolveStartupContext: playStartupContextRuntime.resolvePlayStartupContext,
      resolveModeConfig: function (modeKey: unknown, modeConfig: unknown) {
        const resolvePlayCustomSpawnModeConfigFromPageContext = asFunction<
          (payload: unknown) => unknown
        >(playPageContextRuntime.resolvePlayCustomSpawnModeConfigFromPageContext);
        return resolvePlayCustomSpawnModeConfigFromPageContext
          ? resolvePlayCustomSpawnModeConfigFromPageContext({
              modeKey,
              modeConfig,
              storageKey: customFourRateStorageKey,
              windowLike,
              storageRuntimeLike: storageRuntime,
              playCustomSpawnRuntimeLike: playCustomSpawnRuntime,
              playCustomSpawnHostRuntimeLike: playCustomSpawnHostRuntime
            })
          : modeConfig;
      },
      resolveGuardState: playStartGuardRuntime.resolvePlayStartGuardState,
      resolveChallengeContext: playChallengeContextRuntime.resolvePlayChallengeContext,
      applyHeader: function (modeConfig: unknown) {
        const applyPlayHeaderFromPageContext = asFunction<(payload: unknown) => unknown>(
          playPageContextRuntime.applyPlayHeaderFromPageContext
        );
        return applyPlayHeaderFromPageContext
          ? applyPlayHeaderFromPageContext({
              modeConfig,
              documentLike: windowLike.document,
              playHeaderRuntimeLike: playHeaderRuntime,
              playHeaderHostRuntimeLike: playHeaderHostRuntime,
              playChallengeIntroRuntimeLike: playChallengeIntroRuntime,
              playChallengeIntroUiRuntimeLike: playChallengeIntroUiRuntime,
              playChallengeIntroActionRuntimeLike: playChallengeIntroActionRuntime,
              playChallengeIntroHostRuntimeLike: playChallengeIntroHostRuntime
            })
          : null;
      },
      resolveStartupPayload: playStartupPayloadRuntime.resolvePlayStartupPayload
    });
  });

  return {
    started: true,
    startupResult
  };
}
