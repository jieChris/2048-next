import { describe, expect, it } from "vitest";

import {
  createRankedSessionSetupContextRuntime,
  installRankedSessionSetupContextRuntime,
  resolveSetupRankedSessionContext,
  type RankedSessionSetupContextRuntime
} from "../../src/core/ranked-session-setup-context";

const MODE_KEY = "standard_4x4_pow2_no_undo";

function createManager(context: unknown, modeKey = MODE_KEY) {
  const windowLike = { GAME_CHALLENGE_CONTEXT: context };
  return {
    rankPolicy: "ranked",
    modeKey,
    getWindowLike: () => windowLike
  };
}

describe("core ranked session setup context runtime", () => {
  it("creates and installs the legacy runtime namespace", () => {
    const runtime = createRankedSessionSetupContextRuntime();
    const windowLike: { CoreRankedSessionSetupContextRuntime?: RankedSessionSetupContextRuntime } = {};

    expect(runtime.resolveSetupRankedSessionContext).toBe(resolveSetupRankedSessionContext);

    const installed = installRankedSessionSetupContextRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreRankedSessionSetupContextRuntime);
    expect(installed?.resolveSetupRankedSessionContext).toBeTypeOf("function");
  });

  it("normalizes a matching ranked challenge context", () => {
    const manager = createManager({
      id: " challenge-1 ",
      mode_key: MODE_KEY,
      seed: "12345",
      ranked_session_token: " token-1 "
    });

    expect(resolveSetupRankedSessionContext(manager)).toEqual({
      id: "challenge-1",
      mode_key: MODE_KEY,
      seed: 12345,
      ranked_session_token: "token-1"
    });
  });

  it("uses manager mode when context omits mode_key", () => {
    const manager = createManager({
      id: "challenge-2",
      seed: 7,
      ranked_session_token: "token-2"
    });

    expect(resolveSetupRankedSessionContext(manager)).toMatchObject({
      id: "challenge-2",
      mode_key: MODE_KEY,
      seed: 7,
      ranked_session_token: "token-2"
    });
  });

  it("rejects invalid ranked challenge contexts", () => {
    expect(resolveSetupRankedSessionContext({ rankPolicy: "practice" })).toBeNull();
    expect(resolveSetupRankedSessionContext(createManager({ id: "x", mode_key: "other", seed: 1 }))).toBeNull();
    expect(resolveSetupRankedSessionContext(createManager({ id: "", seed: 1 }))).toBeNull();
    expect(resolveSetupRankedSessionContext(createManager({ id: "x", seed: 1 }))).toBeNull();
    expect(resolveSetupRankedSessionContext(createManager({ id: "x", seed: -1 }))).toBeNull();
    expect(resolveSetupRankedSessionContext(createManager({ id: "x", seed: "bad" }))).toBeNull();
  });

  it("floors decimal seed values to preserve legacy setup behavior", () => {
    expect(resolveSetupRankedSessionContext(createManager({ id: "x", seed: 1.5, ranked_session_token: "token" }))).toMatchObject({
      id: "x",
      seed: 1
    });
  });
});
