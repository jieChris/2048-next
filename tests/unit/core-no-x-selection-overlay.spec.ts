import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";

import {
  applyNoXSelectionToManager,
  createNoXSelectionRuntime,
  ensureNoXSelectionOverlayForManager,
  installNoXSelectionRuntime,
  removeNoXSelectionOverlay,
  resolveSetupNoXModeConfig,
  resolveNoXSelectionOverlayId,
  type NoXSelectionRuntime
} from "../../src/core/no-x-selection-overlay";

function createManager(options: { language?: string; defaultTarget?: number | null } = {}) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/play.html" });
  const windowLike = {
    UII18N: {
      getLanguage: vi.fn(() => options.language ?? "en")
    },
    GAME_MODE_CONFIG: {
      key: "nox_4x4_pow2_no_undo",
      special_rules: {
        no_x_enabled: true,
        no_x_target: null
      }
    },
    CorePlayHeaderRuntime: {
      resolvePlayHeaderState: vi.fn()
    },
    CorePlayHeaderHostRuntime: {
      resolvePlayHeaderFromContext: vi.fn()
    }
  };
  const manager = {
    document: dom.window.document,
    modeConfig: {
      key: "nox_4x4_pow2_no_undo",
      special_rules: {
        no_x_enabled: true,
        no_x_target: options.defaultTarget ?? null
      }
    },
    specialRules: {},
    noXSelectionPending: true,
    noXPendingDefaultTarget: options.defaultTarget ?? null,
    getWindowLike: () => windowLike
  };
  return { dom, manager, windowLike };
}

describe("core NO X selection runtime installer", () => {
  it("creates the legacy CoreNoXSelectionRuntime shape from TypeScript functions", () => {
    const runtime = createNoXSelectionRuntime();

    expect(runtime.ensureNoXSelectionOverlayForManager).toBe(ensureNoXSelectionOverlayForManager);
    expect(runtime.removeNoXSelectionOverlay).toBe(removeNoXSelectionOverlay);
    expect(runtime.applyNoXSelectionToManager).toBe(applyNoXSelectionToManager);
    expect(runtime.resolveSetupNoXModeConfig).toBe(resolveSetupNoXModeConfig);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreNoXSelectionRuntime?: NoXSelectionRuntime } = {};

    const installed = installNoXSelectionRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreNoXSelectionRuntime);
    expect(installed?.ensureNoXSelectionOverlayForManager).toBeTypeOf("function");
  });
});

describe("core NO X selection overlay", () => {
  it("renders the localized selection overlay with a highlighted default target", () => {
    const { manager } = createManager({ language: "en", defaultTarget: 1024 });

    ensureNoXSelectionOverlayForManager(manager);

    const overlay = manager.document.getElementById(resolveNoXSelectionOverlayId());
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain("Choose forbidden X");
    expect(overlay?.textContent).toContain("NO 1K");
    expect(
      manager.document.querySelector<HTMLButtonElement>('[data-no-x-value="1024"]')?.style.border
    ).toContain("2px solid");
  });

  it("applies the clicked forbidden target to manager, mode config, window config, and header state", () => {
    const { manager, windowLike } = createManager({ language: "zh", defaultTarget: 8192 });

    ensureNoXSelectionOverlayForManager(manager);
    manager.document.querySelector<HTMLButtonElement>('[data-no-x-value="2048"]')?.click();

    expect(manager.noXSelectionPending).toBe(false);
    expect(manager.document.body.getAttribute("data-no-x-selecting")).toBeNull();
    expect(manager.document.getElementById(resolveNoXSelectionOverlayId())).toBeNull();
    expect(manager.modeConfig.special_rules.no_x_target).toBe(2048);
    expect(manager.specialRules).toMatchObject({
      no_x_enabled: true,
      no_x_target: 2048
    });
    expect(windowLike.GAME_MODE_CONFIG.special_rules.no_x_target).toBe(2048);
    expect(windowLike.CorePlayHeaderHostRuntime.resolvePlayHeaderFromContext).toHaveBeenCalledWith({
      modeConfig: manager.modeConfig,
      documentLike: manager.document,
      resolveHeaderState: windowLike.CorePlayHeaderRuntime.resolvePlayHeaderState
    });
  });

  it("removes a stale overlay and skips rendering when mode is not pending NO X selection", () => {
    const { manager } = createManager();
    const stale = manager.document.createElement("div");
    stale.id = resolveNoXSelectionOverlayId();
    manager.document.body.appendChild(stale);
    manager.noXSelectionPending = false;

    ensureNoXSelectionOverlayForManager(manager);

    expect(manager.document.getElementById(resolveNoXSelectionOverlayId())).toBeNull();
  });

  it("resolves setup NO X mode config and marks selection pending for seedless setup", () => {
    const { manager } = createManager();

    const modeConfig = resolveSetupNoXModeConfig(manager, manager.modeConfig, {}, undefined);

    expect(modeConfig).toBe(manager.modeConfig);
    expect(manager.noXPendingDefaultTarget).toBe(8192);
    expect(manager.noXSelectionPending).toBe(true);
    expect(manager.document.body.getAttribute("data-no-x-selecting")).toBe("1");
    expect(manager.modeConfig.special_rules.no_x_target).toBe(8192);
  });

  it("uses explicit setup NO X target without requiring selection", () => {
    const { manager } = createManager();

    resolveSetupNoXModeConfig(manager, manager.modeConfig, { noXTarget: 2048, skipNoXSelection: true }, undefined);

    expect(manager.noXPendingDefaultTarget).toBe(2048);
    expect(manager.noXSelectionPending).toBe(false);
    expect(manager.document.body.getAttribute("data-no-x-selecting")).toBeNull();
    expect(manager.modeConfig.special_rules.no_x_target).toBe(2048);
  });
});
