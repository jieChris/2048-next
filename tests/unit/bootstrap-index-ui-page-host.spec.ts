import { describe, expect, it, vi } from "vitest";

import {
  applyIndexUiPageBootstrap,
  createIndexUiTryUndoHandler
} from "../../src/bootstrap/index-ui-page-host";

describe("bootstrap index ui page host", () => {
  it("creates undo handler and delegates to undo action runtime", () => {
    const tryTriggerUndoFromContext = vi.fn(() => ({ didTrigger: true }));
    const tryUndoFromUi = createIndexUiTryUndoHandler({
      undoActionRuntime: {
        tryTriggerUndoFromContext
      },
      windowLike: { id: "window" },
      direction: -1
    });

    expect(tryUndoFromUi()).toBe(true);
    expect(tryTriggerUndoFromContext).toHaveBeenCalledWith({
      windowLike: { id: "window" },
      direction: -1
    });
  });

  it("returns false when undo runtime contract is unavailable", () => {
    const tryUndoFromUi = createIndexUiTryUndoHandler({
      undoActionRuntime: {}
    });

    expect(tryUndoFromUi()).toBe(false);
  });

  it("binds page globals and delegates startup on dom ready", () => {
    let domReadyHandler: (() => unknown) | null = null;
    const addEventListener = vi.fn((name: string, listener: () => unknown) => {
      if (name === "DOMContentLoaded") {
        domReadyHandler = listener;
      }
    });

    const getElementById = vi.fn();
    const applyIndexUiStartup = vi.fn(() => ({ didStart: true }));
    const nowMs = vi.fn(() => 123456);
    const windowLike: Record<string, unknown> = {};
    const documentLike = {
      addEventListener,
      getElementById
    };

    const exportReplay = vi.fn();
    const openPracticeBoardFromCurrent = vi.fn();
    const openSettingsModal = vi.fn();
    const closeSettingsModal = vi.fn();

    const result = applyIndexUiPageBootstrap({
      indexUiStartupHostRuntime: {
        applyIndexUiStartup
      },
      topActionBindingsHostRuntime: { id: "top-actions-host" },
      gameOverUndoHostRuntime: { id: "game-over-host" },
      documentLike,
      windowLike,
      nowMs,
      touchGuardWindowMs: 450,
      tryUndoFromUi: () => true,
      exportReplay,
      closeReplayModal: vi.fn(),
      openPracticeBoardFromCurrent,
      openSettingsModal,
      closeSettingsModal,
      initThemeSettingsUI: vi.fn(),
      removeLegacyUndoSettingsUI: vi.fn(),
      initTimerModuleSettingsUI: vi.fn(),
      initMobileHintToggle: vi.fn(),
      initMobileUndoTopButton: vi.fn(),
      initHomeGuideSettingsUI: vi.fn(),
      autoStartHomeGuideIfNeeded: vi.fn(),
      initMobileTimerboxToggle: vi.fn(),
      requestResponsiveGameRelayout: vi.fn(),
      syncMobileTimerboxUI: vi.fn(),
      syncMobileHintUI: vi.fn(),
      syncMobileUndoTopButtonAvailability: vi.fn(),
      prettyTimeRuntime: {
        formatPrettyTime(value: unknown) {
          return `pretty:${String(value)}`;
        }
      }
    });

    expect(result.appliedGlobalBindings).toBe(true);
    expect(result.boundDomContentLoaded).toBe(true);
    expect(result.startupInvoked).toBe(false);

    expect(typeof windowLike.exportReplay).toBe("function");
    expect(typeof windowLike.openPracticeBoardFromCurrent).toBe("function");
    expect(typeof windowLike.openSettingsModal).toBe("function");
    expect(typeof windowLike.closeSettingsModal).toBe("function");
    expect(typeof windowLike.pretty).toBe("function");
    expect((windowLike.pretty as (input: number) => string)(30)).toBe("pretty:30");

    expect(domReadyHandler).not.toBeNull();
    domReadyHandler?.();

    expect(applyIndexUiStartup).toHaveBeenCalledTimes(1);
    expect(applyIndexUiStartup).toHaveBeenCalledWith(
      expect.objectContaining({
        topActionBindingsHostRuntime: { id: "top-actions-host" },
        gameOverUndoHostRuntime: { id: "game-over-host" },
        windowLike,
        exportReplay,
        openPracticeBoardFromCurrent,
        openSettingsModal,
        closeSettingsModal,
        nowMs,
        touchGuardWindowMs: 450,
        getElementById: expect.any(Function)
      })
    );

    const second = applyIndexUiPageBootstrap({
      indexUiStartupHostRuntime: {
        applyIndexUiStartup
      },
      documentLike,
      windowLike
    });

    expect(second.boundDomContentLoaded).toBe(false);
    expect(addEventListener).toHaveBeenCalledTimes(1);
  });
});
