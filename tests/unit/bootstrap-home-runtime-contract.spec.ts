import { describe, expect, it } from "vitest";

import {
  createHomeRuntimeContractRuntime,
  installHomeRuntimeContractRuntime,
  resolveHomeRuntimeContracts,
  type HomeRuntimeContractRuntime
} from "../../src/bootstrap/home-runtime-contract";

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
  it("creates the legacy CoreHomeRuntimeContractRuntime shape from TypeScript functions", () => {
    const runtime = createHomeRuntimeContractRuntime();

    expect(runtime.resolveHomeRuntimeContracts).toBe(resolveHomeRuntimeContracts);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreHomeRuntimeContractRuntime?: HomeRuntimeContractRuntime } = {};

    const installed = installHomeRuntimeContractRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreHomeRuntimeContractRuntime);
    expect(installed?.resolveHomeRuntimeContracts).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime contract", () => {
    const existing = createHomeRuntimeContractRuntime();
    const windowLike = { CoreHomeRuntimeContractRuntime: existing };

    const installed = installHomeRuntimeContractRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreHomeRuntimeContractRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installHomeRuntimeContractRuntime({ windowLike: null })).toBeNull();
  });

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
