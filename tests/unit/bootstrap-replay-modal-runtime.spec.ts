import { describe, expect, it } from "vitest";

import {
  applyReplayModalClose,
  applyReplayModalOpen,
  applySettingsModalClose,
  applySettingsModalOpen,
  createReplayModalRuntime,
  installReplayModalRuntime,
  type ReplayModalRuntime
} from "../../src/bootstrap/replay-modal";

describe("bootstrap replay-modal runtime", () => {
  it("creates the legacy CoreReplayModalRuntime shape from TypeScript functions", () => {
    const runtime = createReplayModalRuntime();

    expect(runtime.applyReplayModalOpen).toBe(applyReplayModalOpen);
    expect(runtime.applyReplayModalClose).toBe(applyReplayModalClose);
    expect(runtime.applySettingsModalOpen).toBe(applySettingsModalOpen);
    expect(runtime.applySettingsModalClose).toBe(applySettingsModalClose);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayModalRuntime?: ReplayModalRuntime } = {};

    const installed = installReplayModalRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayModalRuntime);
    expect(installed?.applyReplayModalOpen).toBeTypeOf("function");
    expect(installed?.applyReplayModalClose).toBeTypeOf("function");
    expect(installed?.applySettingsModalOpen).toBeTypeOf("function");
    expect(installed?.applySettingsModalClose).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayModalRuntime();
    const windowLike = { CoreReplayModalRuntime: existing };

    const installed = installReplayModalRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayModalRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayModalRuntime({ windowLike: null })).toBeNull();
  });
});
