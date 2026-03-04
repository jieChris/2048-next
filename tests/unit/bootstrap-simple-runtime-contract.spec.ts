import { describe, expect, it } from "vitest";

import { resolveSimpleBootstrapRuntime } from "../../src/bootstrap/simple-runtime-contract";

describe("bootstrap simple runtime contract", () => {
  it("returns bootstrap runtime when startGameOnAnimationFrame exists", () => {
    const runtime = {
      startGameOnAnimationFrame() {}
    };
    const result = resolveSimpleBootstrapRuntime({
      CoreBootstrapRuntime: runtime
    });
    expect(result).toBe(runtime);
  });

  it("throws exact error when bootstrap runtime is missing", () => {
    expect(() => resolveSimpleBootstrapRuntime({})).toThrowError(
      "CoreBootstrapRuntime.startGameOnAnimationFrame is required"
    );
  });
});
