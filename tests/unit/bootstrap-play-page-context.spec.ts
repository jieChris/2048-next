import { describe, expect, it, vi } from "vitest";

import {
  applyPlayHeaderFromPageContext,
  resolvePlayCustomSpawnModeConfigFromPageContext
} from "../../src/bootstrap/play-page-context";

describe("bootstrap play page context", () => {
  it("delegates custom spawn resolution with page location context", () => {
    const resolvePlayCustomSpawnModeConfigFromContext = vi.fn(() => ({
      key: "spawn_custom_4x4_pow2_no_undo"
    }));

    const result = resolvePlayCustomSpawnModeConfigFromPageContext({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: { key: "spawn_custom_4x4_pow2_no_undo" },
      storageKey: "custom_spawn_4x4_four_rate_v1",
      windowLike: {
        location: {
          search: "?mode_key=spawn_custom_4x4_pow2_no_undo&four_rate=25",
          pathname: "/play.html",
          hash: "#x"
        }
      },
      storageRuntimeLike: { x: 1 },
      playCustomSpawnRuntimeLike: { y: 1 },
      playCustomSpawnHostRuntimeLike: {
        resolvePlayCustomSpawnModeConfigFromContext
      }
    });

    expect(resolvePlayCustomSpawnModeConfigFromContext).toHaveBeenCalledWith({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: { key: "spawn_custom_4x4_pow2_no_undo" },
      searchLike: "?mode_key=spawn_custom_4x4_pow2_no_undo&four_rate=25",
      pathname: "/play.html",
      hash: "#x",
      storageKey: "custom_spawn_4x4_four_rate_v1",
      windowLike: {
        location: {
          search: "?mode_key=spawn_custom_4x4_pow2_no_undo&four_rate=25",
          pathname: "/play.html",
          hash: "#x"
        }
      },
      storageRuntimeLike: { x: 1 },
      playCustomSpawnRuntimeLike: { y: 1 }
    });
    expect(result).toEqual({ key: "spawn_custom_4x4_pow2_no_undo" });
  });

  it("applies play header through header host and challenge intro host runtimes", () => {
    const resolvePlayChallengeIntroFromContext = vi.fn();
    const resolvePlayHeaderFromContext = vi.fn((opts) => {
      opts.applyChallengeModeIntro(opts.modeConfig);
      return { applied: true };
    });

    const result = applyPlayHeaderFromPageContext({
      modeConfig: { key: "standard_4x4_pow2_no_undo" },
      documentLike: {
        getElementById: () => null
      },
      playHeaderRuntimeLike: {
        resolvePlayHeaderState: vi.fn(() => ({ titleText: "标准模式" }))
      },
      playHeaderHostRuntimeLike: {
        resolvePlayHeaderFromContext
      },
      playChallengeIntroRuntimeLike: {
        resolvePlayChallengeIntroModel: vi.fn(() => ({}))
      },
      playChallengeIntroUiRuntimeLike: {
        resolvePlayChallengeIntroUiState: vi.fn(() => ({}))
      },
      playChallengeIntroActionRuntimeLike: {
        resolvePlayChallengeIntroActionState: vi.fn(() => ({}))
      },
      playChallengeIntroHostRuntimeLike: {
        resolvePlayChallengeIntroFromContext
      }
    });

    expect(resolvePlayHeaderFromContext).toHaveBeenCalledTimes(1);
    expect(resolvePlayChallengeIntroFromContext).toHaveBeenCalledWith({
      modeConfig: { key: "standard_4x4_pow2_no_undo" },
      featureEnabled: false,
      documentLike: {
        getElementById: expect.any(Function)
      },
      resolveIntroModel: expect.any(Function),
      resolveIntroUiState: expect.any(Function),
      resolveIntroActionState: expect.any(Function)
    });
    expect(result).toEqual({ applied: true });
  });
});
