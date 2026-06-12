import { describe, expect, it } from "vitest";

import { computeMergeEffects } from "../../src/core/merge-effects";
import {
  createMergeEffectsRuntime,
  installMergeEffectsRuntime,
  type MergeEffectsRuntime
} from "../../src/bootstrap/merge-effects-runtime";

describe("bootstrap merge-effects runtime", () => {
  it("creates the legacy CoreMergeEffectsRuntime shape from TypeScript functions", () => {
    const runtime = createMergeEffectsRuntime();

    expect(runtime.computeMergeEffects).toBe(computeMergeEffects);
    expect(
      runtime.computeMergeEffects({
        mergedValue: 32768,
        isCappedMode: false,
        cappedTargetValue: null,
        reached32k: false
      })
    ).toEqual({
      shouldRecordCappedMilestone: false,
      shouldSetWon: false,
      shouldSetReached32k: true,
      timerIdsToStamp: ["timer32768"],
      showSubTimerContainer: true,
      hideTimerRows: [16, 32]
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreMergeEffectsRuntime?: MergeEffectsRuntime } = {};

    const installed = installMergeEffectsRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreMergeEffectsRuntime);
    expect(installed?.computeMergeEffects).toBe(computeMergeEffects);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createMergeEffectsRuntime();
    const windowLike = { CoreMergeEffectsRuntime: existing };

    const installed = installMergeEffectsRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreMergeEffectsRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installMergeEffectsRuntime({ windowLike: null })).toBeNull();
  });
});
