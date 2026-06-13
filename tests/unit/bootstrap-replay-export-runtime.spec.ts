import { describe, expect, it } from "vitest";

import {
  applyReplayClipboardCopy,
  applyReplayExport,
  createReplayExportRuntime,
  installReplayExportRuntime,
  type ReplayExportRuntime
} from "../../src/bootstrap/replay-export";

describe("bootstrap replay-export runtime", () => {
  it("creates the legacy CoreReplayExportRuntime shape from TypeScript functions", () => {
    const runtime = createReplayExportRuntime();

    expect(runtime.applyReplayClipboardCopy).toBe(applyReplayClipboardCopy);
    expect(runtime.applyReplayExport).toBe(applyReplayExport);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayExportRuntime?: ReplayExportRuntime } = {};

    const installed = installReplayExportRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayExportRuntime);
    expect(installed?.applyReplayClipboardCopy).toBeTypeOf("function");
    expect(installed?.applyReplayExport).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayExportRuntime();
    const windowLike = { CoreReplayExportRuntime: existing };

    const installed = installReplayExportRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayExportRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayExportRuntime({ windowLike: null })).toBeNull();
  });
});
