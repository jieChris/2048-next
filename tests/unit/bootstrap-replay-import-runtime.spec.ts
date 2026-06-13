import { describe, expect, it } from "vitest";

import { parseReplayImportEnvelope } from "../../src/core/replay-import";
import {
  createReplayImportRuntime,
  installReplayImportRuntime,
  type ReplayImportRuntime
} from "../../src/bootstrap/replay-import-runtime";

describe("bootstrap replay-import runtime", () => {
  it("creates the legacy CoreReplayImportRuntime shape from TypeScript functions", () => {
    const runtime = createReplayImportRuntime();
    const input = {
      trimmedReplayString: "REPLAY_v1RPL_B64_AQID"
    };

    expect(runtime.parseReplayImportEnvelope(input)).toEqual(parseReplayImportEnvelope(input));
  });

  it("preserves empty v1 payload throw behavior", () => {
    const runtime = createReplayImportRuntime();

    expect(() =>
      runtime.parseReplayImportEnvelope({
        trimmedReplayString: "REPLAY_v1RPL_B64_"
      })
    ).toThrow("Invalid replay v1 payload");
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayImportRuntime?: ReplayImportRuntime } = {};

    const installed = installReplayImportRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayImportRuntime);
    expect(installed?.parseReplayImportEnvelope).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayImportRuntime();
    const windowLike = { CoreReplayImportRuntime: existing };

    const installed = installReplayImportRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayImportRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayImportRuntime({ windowLike: null })).toBeNull();
  });
});
