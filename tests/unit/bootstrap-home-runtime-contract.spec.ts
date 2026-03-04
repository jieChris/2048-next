import { describe, expect, it } from "vitest";

import { resolveHomeRuntimeContracts } from "../../src/bootstrap/home-runtime-contract";

function createWindowLike() {
  return {
    CoreHomeModeRuntime: {
      resolveHomeModeSelection: () => ({}),
      resolveHomeModeSelectionFromContext: () => ({})
    },
    CoreUndoActionRuntime: {
      tryTriggerUndo: () => true
    },
    CoreBootstrapRuntime: {
      startGameOnAnimationFrame: () => {}
    }
  };
}

describe("bootstrap home runtime contract", () => {
  it("returns required runtime contracts when dependencies exist", () => {
    const source = createWindowLike();
    const result = resolveHomeRuntimeContracts(source);

    expect(result.homeModeRuntime).toBe(source.CoreHomeModeRuntime);
    expect(result.undoActionRuntime).toBe(source.CoreUndoActionRuntime);
    expect(result.bootstrapRuntime).toBe(source.CoreBootstrapRuntime);
  });

  it("throws exact error when home mode runtime is missing", () => {
    const source = createWindowLike();
    source.CoreHomeModeRuntime = null;

    expect(() => resolveHomeRuntimeContracts(source)).toThrowError(
      "CoreHomeModeRuntime is required"
    );
  });

  it("throws exact error when undo runtime is missing required function", () => {
    const source = createWindowLike();
    source.CoreUndoActionRuntime = {};

    expect(() => resolveHomeRuntimeContracts(source)).toThrowError(
      "CoreUndoActionRuntime is required"
    );
  });
});
