import { describe, expect, it } from "vitest";

import {
  applySettingsModalCloseOrchestration,
  applySettingsModalOpenOrchestration,
  createSettingsModalHostRuntime,
  installSettingsModalHostRuntime,
  type SettingsModalHostRuntime
} from "../../src/bootstrap/settings-modal-host";

describe("bootstrap settings-modal-host runtime", () => {
  it("creates the legacy CoreSettingsModalHostRuntime shape from TypeScript functions", () => {
    const runtime = createSettingsModalHostRuntime();

    expect(runtime.applySettingsModalOpenOrchestration).toBe(
      applySettingsModalOpenOrchestration
    );
    expect(runtime.applySettingsModalCloseOrchestration).toBe(
      applySettingsModalCloseOrchestration
    );
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreSettingsModalHostRuntime?: SettingsModalHostRuntime } = {};

    const installed = installSettingsModalHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreSettingsModalHostRuntime);
    expect(installed?.applySettingsModalOpenOrchestration).toBeTypeOf("function");
    expect(installed?.applySettingsModalCloseOrchestration).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createSettingsModalHostRuntime();
    const windowLike = { CoreSettingsModalHostRuntime: existing };

    const installed = installSettingsModalHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreSettingsModalHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installSettingsModalHostRuntime({ windowLike: null })).toBeNull();
  });
});
