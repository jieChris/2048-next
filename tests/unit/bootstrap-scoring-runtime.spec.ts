import { describe, expect, it } from "vitest";

import { computePostMoveScore } from "../../src/core/scoring";
import {
  createScoringRuntime,
  installScoringRuntime,
  type ScoringRuntime
} from "../../src/bootstrap/scoring-runtime";

describe("bootstrap scoring runtime", () => {
  it("creates the legacy CoreScoringRuntime shape from TypeScript functions", () => {
    const runtime = createScoringRuntime();

    expect(runtime.computePostMoveScore).toBe(computePostMoveScore);
    expect(
      runtime.computePostMoveScore({
        scoreBeforeMove: 100,
        scoreAfterMerge: 140,
        comboStreak: 1,
        comboMultiplier: 1.5
      })
    ).toEqual({
      score: 160,
      comboStreak: 2,
      mergeGain: 40,
      comboBonus: 20
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreScoringRuntime?: ScoringRuntime } = {};

    const installed = installScoringRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreScoringRuntime);
    expect(installed?.computePostMoveScore).toBe(computePostMoveScore);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createScoringRuntime();
    const windowLike = { CoreScoringRuntime: existing };

    const installed = installScoringRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreScoringRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installScoringRuntime({ windowLike: null })).toBeNull();
  });
});
