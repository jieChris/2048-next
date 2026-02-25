import { describe, expect, it } from "vitest";

import { resolvePlayRuntimeContracts } from "../../src/bootstrap/play-runtime-contract";

function createCompleteWindowLike() {
  return {
    CorePlayHeaderRuntime: {
      compactPlayModeLabel: () => "",
      resolvePlayRulesText: () => "",
      buildPlayModeIntroText: () => "",
      resolvePlayHeaderState: () => ({})
    },
    CorePlayHeaderHostRuntime: {
      resolvePlayHeaderFromContext: () => ({})
    },
    CorePlayEntryRuntime: {
      resolvePlayEntryPlan: () => ({})
    },
    CoreCustomSpawnRuntime: {
      isCustomSpawnModeKey: () => false,
      sanitizeCustomFourRate: () => 10,
      formatRatePercent: () => "10%",
      inferFourRateFromSpawnTable: () => 10,
      applyCustomFourRateToModeConfig: () => ({})
    },
    CorePlayCustomSpawnRuntime: {
      resolvePlayCustomSpawnModeConfig: () => ({})
    },
    CorePlayCustomSpawnHostRuntime: {
      resolvePlayCustomSpawnModeConfigFromContext: () => ({})
    },
    CorePlayChallengeIntroRuntime: {
      resolvePlayChallengeIntroModel: () => ({})
    },
    CorePlayChallengeIntroUiRuntime: {
      resolvePlayChallengeIntroUiState: () => ({})
    },
    CorePlayChallengeIntroActionRuntime: {
      resolvePlayChallengeIntroActionState: () => ({})
    },
    CorePlayChallengeIntroHostRuntime: {
      resolvePlayChallengeIntroFromContext: () => ({})
    },
    CorePlayChallengeContextRuntime: {
      resolvePlayChallengeContext: () => ({})
    },
    CorePlayStartGuardRuntime: {
      resolvePlayStartGuardState: () => ({})
    },
    CorePlayStartupPayloadRuntime: {
      resolvePlayStartupPayload: () => ({})
    },
    CorePlayStartupContextRuntime: {
      resolvePlayStartupContext: () => ({})
    },
    CorePlayStartupHostRuntime: {
      resolvePlayStartupFromContext: () => ({})
    },
    CoreStorageRuntime: {
      resolveStorageByName: () => ({}),
      safeReadStorageItem: () => null,
      safeSetStorageItem: () => {}
    },
    LegacyBootstrapRuntime: {
      startGameOnAnimationFrame: () => {}
    }
  };
}

describe("bootstrap play runtime contract", () => {
  it("returns all runtime contracts when required dependencies exist", () => {
    const source = createCompleteWindowLike();
    const result = resolvePlayRuntimeContracts(source);

    expect(result.playHeaderRuntime).toBe(source.CorePlayHeaderRuntime);
    expect(result.playHeaderHostRuntime).toBe(source.CorePlayHeaderHostRuntime);
    expect(result.playEntryRuntime).toBe(source.CorePlayEntryRuntime);
    expect(result.customSpawnRuntime).toBe(source.CoreCustomSpawnRuntime);
    expect(result.playCustomSpawnRuntime).toBe(source.CorePlayCustomSpawnRuntime);
    expect(result.playCustomSpawnHostRuntime).toBe(source.CorePlayCustomSpawnHostRuntime);
    expect(result.playChallengeIntroRuntime).toBe(source.CorePlayChallengeIntroRuntime);
    expect(result.playChallengeIntroUiRuntime).toBe(source.CorePlayChallengeIntroUiRuntime);
    expect(result.playChallengeIntroActionRuntime).toBe(source.CorePlayChallengeIntroActionRuntime);
    expect(result.playChallengeIntroHostRuntime).toBe(source.CorePlayChallengeIntroHostRuntime);
    expect(result.playChallengeContextRuntime).toBe(source.CorePlayChallengeContextRuntime);
    expect(result.playStartGuardRuntime).toBe(source.CorePlayStartGuardRuntime);
    expect(result.playStartupPayloadRuntime).toBe(source.CorePlayStartupPayloadRuntime);
    expect(result.playStartupContextRuntime).toBe(source.CorePlayStartupContextRuntime);
    expect(result.playStartupHostRuntime).toBe(source.CorePlayStartupHostRuntime);
    expect(result.storageRuntime).toBe(source.CoreStorageRuntime);
    expect(result.bootstrapRuntime).toBe(source.LegacyBootstrapRuntime);
  });

  it("throws exact error when a required runtime is missing", () => {
    const source = createCompleteWindowLike();
    source.CorePlayEntryRuntime = null;

    expect(() => resolvePlayRuntimeContracts(source)).toThrowError(
      "CorePlayEntryRuntime is required"
    );
  });

  it("throws exact error when a required runtime function is missing", () => {
    const source = createCompleteWindowLike();
    source.CoreStorageRuntime = {
      resolveStorageByName: () => ({}),
      safeReadStorageItem: () => null
    };

    expect(() => resolvePlayRuntimeContracts(source)).toThrowError(
      "CoreStorageRuntime is required"
    );
  });
});
