import { describe, expect, it, vi } from "vitest";

import {
  createActuatorPayloadState,
  createGameManagerActuatorPayloadStateRuntime,
  installGameManagerActuatorPayloadStateRuntime,
  type GameManagerActuatorPayloadStateRuntime
} from "../../src/core/game-manager-actuator-payload-state";

describe("core game manager actuator payload state", () => {
  it("creates actuator metadata from manager state and filters enabled integer stone values", () => {
    const isGameTerminated = vi.fn(() => true);
    const inheritedStoneValues = { "16": true };
    const stoneValueSet = Object.create(inheritedStoneValues) as Record<string, unknown>;
    stoneValueSet["2"] = true;
    stoneValueSet["4"] = false;
    stoneValueSet["8.5"] = true;
    stoneValueSet["foo"] = true;
    stoneValueSet["32"] = true;
    const manager = {
      score: 128,
      over: false,
      won: true,
      scoreManager: {
        get: vi.fn(() => 512)
      },
      blockedCellsList: [{ x: 1, y: 2 }],
      stoneValueSet,
      hasOwnKey: (record: Record<string, unknown>, key: string) =>
        Object.prototype.hasOwnProperty.call(record, key)
    };

    expect(createActuatorPayloadState(manager, { isGameTerminated })).toEqual({
      score: 128,
      over: false,
      won: true,
      bestScore: 512,
      terminated: true,
      blockedCells: [{ x: 1, y: 2 }],
      stoneValues: [2, 32]
    });
    expect(isGameTerminated).toHaveBeenCalledWith(manager);
    expect(manager.scoreManager.get).toHaveBeenCalledTimes(1);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerActuatorPayloadStateRuntime();
    expect(runtime.createActuatorPayloadState).toBe(createActuatorPayloadState);

    const windowLike: {
      CoreGameManagerActuatorPayloadStateRuntime?: GameManagerActuatorPayloadStateRuntime;
    } = {};
    expect(installGameManagerActuatorPayloadStateRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerActuatorPayloadStateRuntime
    );
    expect(windowLike.CoreGameManagerActuatorPayloadStateRuntime?.createActuatorPayloadState).toBe(
      createActuatorPayloadState
    );

    const existing = {
      createActuatorPayloadState: vi.fn()
    };
    expect(
      installGameManagerActuatorPayloadStateRuntime({
        windowLike: { CoreGameManagerActuatorPayloadStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
