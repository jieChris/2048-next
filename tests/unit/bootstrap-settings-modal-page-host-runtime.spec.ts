import { describe, expect, it } from "vitest";

import {
  applySettingsModalPageClose,
  applySettingsModalPageOpen,
  createSettingsModalActionResolvers,
  createSettingsModalInitResolvers,
  createSettingsModalPageHostRuntime,
  installSettingsModalPageHostRuntime,
  normalizeSettingsModalContent,
  type SettingsModalPageHostRuntime
} from "../../src/bootstrap/settings-modal-page-host";

describe("bootstrap settings-modal-page-host runtime", () => {
  it("creates the legacy CoreSettingsModalPageHostRuntime shape from TypeScript functions", () => {
    const runtime = createSettingsModalPageHostRuntime();

    expect(runtime.createSettingsModalActionResolvers).toBe(createSettingsModalActionResolvers);
    expect(runtime.createSettingsModalInitResolvers).toBe(createSettingsModalInitResolvers);
    expect(runtime.normalizeSettingsModalContent).toBe(normalizeSettingsModalContent);
    expect(runtime.applySettingsModalPageOpen).toBe(applySettingsModalPageOpen);
    expect(runtime.applySettingsModalPageClose).toBe(applySettingsModalPageClose);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreSettingsModalPageHostRuntime?: SettingsModalPageHostRuntime } = {};

    const installed = installSettingsModalPageHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreSettingsModalPageHostRuntime);
    expect(installed?.createSettingsModalActionResolvers).toBeTypeOf("function");
    expect(installed?.createSettingsModalInitResolvers).toBeTypeOf("function");
    expect(installed?.normalizeSettingsModalContent).toBeTypeOf("function");
    expect(installed?.applySettingsModalPageOpen).toBeTypeOf("function");
    expect(installed?.applySettingsModalPageClose).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createSettingsModalPageHostRuntime();
    const windowLike = { CoreSettingsModalPageHostRuntime: existing };

    const installed = installSettingsModalPageHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreSettingsModalPageHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installSettingsModalPageHostRuntime({ windowLike: null })).toBeNull();
  });
});
