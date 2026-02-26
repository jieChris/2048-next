import { describe, expect, it, vi } from "vitest";

import { applyIndexUiStartup } from "../../src/bootstrap/index-ui-startup-host";

describe("bootstrap index ui startup host", () => {
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
      initHomeGuideSettingsUI: () => marks.push("initHomeGuide"),
      autoStartHomeGuideIfNeeded: () => marks.push("autoStartGuide"),
      initMobileTimerboxToggle: () => marks.push("initTimerbox"),
      requestResponsiveGameRelayout,
      nowMs: () => 123,
      touchGuardWindowMs: 450
    });

    expect(result).toEqual({
      appliedTopActionBindings: true,
      appliedGameOverUndoBinding: true,
      initCallCount: 9,
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
      "initHomeGuide",
      "autoStartGuide",
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
