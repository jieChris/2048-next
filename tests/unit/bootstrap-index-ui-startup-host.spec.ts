import { describe, expect, it, vi } from "vitest";

import {
  applyIndexUiStartup,
  createIndexUiStartupHostRuntime,
  installIndexUiStartupHostRuntime,
  type IndexUiStartupHostRuntime
} from "../../src/bootstrap/index-ui-startup-host";

describe("bootstrap index ui startup host", () => {
  it("creates the legacy CoreIndexUiStartupHostRuntime shape from TypeScript functions", () => {
    const runtime = createIndexUiStartupHostRuntime();

    expect(runtime.applyIndexUiStartup).toBe(applyIndexUiStartup);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreIndexUiStartupHostRuntime?: IndexUiStartupHostRuntime } = {};

    const installed = installIndexUiStartupHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreIndexUiStartupHostRuntime);
    expect(installed?.applyIndexUiStartup).toBeTypeOf("function");
  });

  it("does not overwrite an existing startup host runtime", () => {
    const existing = createIndexUiStartupHostRuntime();
    const windowLike = { CoreIndexUiStartupHostRuntime: existing };

    const installed = installIndexUiStartupHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreIndexUiStartupHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installIndexUiStartupHostRuntime({ windowLike: null })).toBeNull();
  });

  it("orchestrates startup chain and binds responsive listeners once", () => {
    const marks: string[] = [];
    const requestResponsiveGameRelayout = vi.fn(() => marks.push("requestRelayout"));

    const windowLike = {
      __responsiveGameRelayoutBound: false,
      addEventListener: vi.fn((name: string) => marks.push("bind:" + name))
    };

    const result = applyIndexUiStartup({
      topActionBindingsHostRuntime: {
        applyTopActionBindings: vi.fn(() => marks.push("topActions"))
      },
      gameOverUndoHostRuntime: {
        bindGameOverUndoControl: vi.fn(() => marks.push("gameOverUndo"))
      },
      getElementById: vi.fn(() => null),
      windowLike,
      tryUndo: vi.fn(),
      exportReplay: vi.fn(),
      openPracticeBoardFromCurrent: vi.fn(),
      openSettingsModal: vi.fn(),
      closeSettingsModal: vi.fn(),
      initThemeSettingsUI: () => marks.push("initTheme"),
      removeLegacyUndoSettingsUI: () => marks.push("removeLegacyUndo"),
      initTimerModuleSettingsUI: () => marks.push("initTimerModule"),
      initMobileHintToggle: () => marks.push("initMobileHint"),
      initMobileUndoTopButton: () => marks.push("initMobileUndoTop"),
      initMobileTimerboxToggle: () => marks.push("initTimerbox"),
      requestResponsiveGameRelayout,
      nowMs: () => 123,
      touchGuardWindowMs: 450
    });

    expect(result).toEqual({
      appliedTopActionBindings: true,
      appliedGameOverUndoBinding: true,
      initCallCount: 7,
      boundResponsiveRelayoutListeners: true
    });
    expect(windowLike.__responsiveGameRelayoutBound).toBe(true);
    expect(marks).toEqual([
      "topActions",
      "initTheme",
      "removeLegacyUndo",
      "initTimerModule",
      "initMobileHint",
      "initMobileUndoTop",
      "gameOverUndo",
      "initTimerbox",
      "requestRelayout",
      "bind:resize",
      "bind:orientationchange"
    ]);
  });

  it("does not rebind responsive listeners when already bound", () => {
    const addEventListener = vi.fn();
    const result = applyIndexUiStartup({
      windowLike: {
        __responsiveGameRelayoutBound: true,
        addEventListener
      },
      requestResponsiveGameRelayout: vi.fn()
    });

    expect(result.boundResponsiveRelayoutListeners).toBe(false);
    expect(addEventListener).not.toHaveBeenCalled();
  });
});
