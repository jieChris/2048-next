import { describe, expect, it } from "vitest";

import {
  createGameSessionRuntime,
  installGameSessionRuntime,
  type GameSessionRuntimeWindowLike
} from "../../src/bootstrap/game-session-runtime";

describe("bootstrap game-session runtime", () => {
  it("exposes only the three App modes and creates the real Game Session", () => {
    const runtime = createGameSessionRuntime();
    expect(runtime.supportsMode("standard_4x4_pow2_no_undo")).toBe(true);
    expect(runtime.supportsMode("classic_4x4_pow2_undo")).toBe(true);
    expect(runtime.supportsMode("board_3x3_pow2_no_undo")).toBe(true);
    expect(runtime.supportsMode("fib_4x4_no_undo")).toBe(false);

    const session = runtime.createSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 424242,
      startedAtMs: 1700000000000
    });
    expect(session.init().board).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 2],
      [2, 0, 0, 0]
    ]);
  });

  it("installs idempotently and returns null without a target", () => {
    const windowLike: GameSessionRuntimeWindowLike = {};
    const first = installGameSessionRuntime(windowLike);
    const second = installGameSessionRuntime(windowLike);
    expect(second).toBe(first);
    expect(windowLike.CoreGameSessionRuntime).toBe(first);
    expect(installGameSessionRuntime(null)).toBeNull();
  });
});
