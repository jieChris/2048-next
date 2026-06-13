import { describe, expect, it } from "vitest";

import {
  applyReplayExportPageAction,
  applyReplayExportPageActionFromContext,
  applyReplayModalPageClose,
  applyReplayModalPageOpen,
  createReplayPageActionResolvers,
  createReplayPageHostRuntime,
  installReplayPageHostRuntime,
  type ReplayPageHostRuntime
} from "../../src/bootstrap/replay-page-host";

describe("bootstrap replay-page-host runtime", () => {
  it("creates the legacy CoreReplayPageHostRuntime shape from TypeScript functions", () => {
    const runtime = createReplayPageHostRuntime();

    expect(runtime.createReplayPageActionResolvers).toBe(createReplayPageActionResolvers);
    expect(runtime.applyReplayModalPageOpen).toBe(applyReplayModalPageOpen);
    expect(runtime.applyReplayModalPageClose).toBe(applyReplayModalPageClose);
    expect(runtime.applyReplayExportPageAction).toBe(applyReplayExportPageAction);
    expect(runtime.applyReplayExportPageActionFromContext).toBe(
      applyReplayExportPageActionFromContext
    );
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayPageHostRuntime?: ReplayPageHostRuntime } = {};

    const installed = installReplayPageHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayPageHostRuntime);
    expect(installed?.createReplayPageActionResolvers).toBeTypeOf("function");
    expect(installed?.applyReplayModalPageOpen).toBeTypeOf("function");
    expect(installed?.applyReplayModalPageClose).toBeTypeOf("function");
    expect(installed?.applyReplayExportPageAction).toBeTypeOf("function");
    expect(installed?.applyReplayExportPageActionFromContext).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayPageHostRuntime();
    const windowLike = { CoreReplayPageHostRuntime: existing };

    const installed = installReplayPageHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayPageHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayPageHostRuntime({ windowLike: null })).toBeNull();
  });
});
