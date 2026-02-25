import { describe, expect, it } from "vitest";

import { resolvePlayChallengeIntroModel } from "../../src/bootstrap/play-challenge-intro";

describe("bootstrap play challenge intro", () => {
  it("keeps intro hidden when feature flag is disabled", () => {
    expect(
      resolvePlayChallengeIntroModel({
        modeKey: "capped_4x4_pow2_64_no_undo",
        featureEnabled: false
      })
    ).toEqual({
      entryDisplay: "none",
      modalDisplay: "none",
      title: "64封顶模式简介",
      description:
        "64封顶是短局冲刺模式。\n目标是尽快合成 64，合成后本局结束并计入该模式榜单。\n建议优先保持大数在角落，减少无效横跳，提升稳定性。",
      leaderboardText: "榜单功能即将上线，这里将展示 64 封顶模式排行榜。",
      bindEvents: false
    });
  });

  it("keeps intro hidden for non-target mode even when feature flag is enabled", () => {
    const model = resolvePlayChallengeIntroModel({
      modeKey: "standard_4x4_pow2_no_undo",
      featureEnabled: true
    });
    expect(model.entryDisplay).toBe("none");
    expect(model.bindEvents).toBe(false);
  });

  it("shows intro entry for target mode when feature flag is enabled", () => {
    const model = resolvePlayChallengeIntroModel({
      modeKey: "capped_4x4_pow2_64_no_undo",
      featureEnabled: true
    });
    expect(model.entryDisplay).toBe("inline-flex");
    expect(model.modalDisplay).toBe("none");
    expect(model.bindEvents).toBe(true);
    expect(model.title).toContain("64封顶");
  });
});
