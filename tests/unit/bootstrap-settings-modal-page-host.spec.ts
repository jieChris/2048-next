import { describe, expect, it, vi } from "vitest";

import {
  createSettingsModalInitResolvers,
  createSettingsModalActionResolvers,
  applySettingsModalPageClose,
  applySettingsModalPageOpen
} from "../../src/bootstrap/settings-modal-page-host";

describe("bootstrap settings modal page host", () => {
  it("creates settings action resolvers with safe fallbacks", () => {
    const resolvers = createSettingsModalActionResolvers({});
    expect(typeof resolvers.openSettingsModal).toBe("function");
    expect(typeof resolvers.closeSettingsModal).toBe("function");
    expect(resolvers.openSettingsModal()).toEqual({
      hasApplyOpenApi: false,
      didApply: false
    });
    expect(resolvers.closeSettingsModal()).toEqual({
      hasApplyCloseApi: false,
      didApply: false
    });
  });

  it("delegates settings action resolvers through page host runtime methods", () => {
    const applySettingsModalPageOpen = vi.fn();
    const applySettingsModalPageClose = vi.fn();
    const settingsModalHostRuntime = { id: "settings-host" };
    const replayModalRuntime = { id: "replay-runtime" };
    const documentLike = { id: "document" };
    const removeLegacyUndoSettingsUI = vi.fn();
    const initThemeSettingsUI = vi.fn();
    const initTimerModuleSettingsUI = vi.fn();
    const initWinPromptSettingsUI = vi.fn();
    const initHomeGuideSettingsUI = vi.fn();

    const resolvers = createSettingsModalActionResolvers({
      settingsModalPageHostRuntime: {
        applySettingsModalPageOpen,
        applySettingsModalPageClose
      },
      settingsModalHostRuntime,
      replayModalRuntime,
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initWinPromptSettingsUI,
      initHomeGuideSettingsUI
    });

    resolvers.openSettingsModal();
    resolvers.closeSettingsModal();

    expect(applySettingsModalPageOpen).toHaveBeenCalledWith({
      settingsModalHostRuntime,
      replayModalRuntime,
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initWinPromptSettingsUI,
      initHomeGuideSettingsUI
    });
    expect(applySettingsModalPageClose).toHaveBeenCalledWith({
      settingsModalHostRuntime,
      replayModalRuntime,
      documentLike
    });
  });

  it("returns false result when open api is missing", () => {
    const result = applySettingsModalPageOpen({
      settingsModalHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplyOpenApi: false,
      didApply: false
    });
  });

  it("delegates modal open orchestration to host runtime", () => {
    const applySettingsModalOpenOrchestration = vi.fn();
    const documentLike = { id: "document" };
    const replayModalRuntime = { id: "replay" };
    const removeLegacyUndoSettingsUI = vi.fn();
    const initThemeSettingsUI = vi.fn();
    const initTimerModuleSettingsUI = vi.fn();
    const initWinPromptSettingsUI = vi.fn();
    const initHomeGuideSettingsUI = vi.fn();

    const result = applySettingsModalPageOpen({
      settingsModalHostRuntime: {
        applySettingsModalOpenOrchestration
      },
      replayModalRuntime,
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initWinPromptSettingsUI,
      initHomeGuideSettingsUI
    });

    expect(applySettingsModalOpenOrchestration).toHaveBeenCalledWith({
      replayModalRuntime,
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initWinPromptSettingsUI,
      initHomeGuideSettingsUI
    });
    expect(result).toEqual({
      hasApplyOpenApi: true,
      didApply: true
    });
  });

  it("returns false result when close api is missing", () => {
    const result = applySettingsModalPageClose({
      settingsModalHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplyCloseApi: false,
      didApply: false
    });
  });

  it("delegates modal close orchestration to host runtime", () => {
    const applySettingsModalCloseOrchestration = vi.fn();
    const replayModalRuntime = { id: "replay" };
    const documentLike = { id: "document" };

    const result = applySettingsModalPageClose({
      settingsModalHostRuntime: {
        applySettingsModalCloseOrchestration
      },
      replayModalRuntime,
      documentLike
    });

    expect(applySettingsModalCloseOrchestration).toHaveBeenCalledWith({
      replayModalRuntime,
      documentLike
    });
    expect(result).toEqual({
      hasApplyCloseApi: true,
      didApply: true
    });
  });

  it("creates settings init resolvers and delegates theme/timer/cleanup init", () => {
    const applyThemeSettingsPageInit = vi.fn(() => ({ didApply: true }));
    const applyLegacyUndoSettingsCleanup = vi.fn(() => ({ didRemoveRow: true }));
    const applyTimerModuleSettingsPageInit = vi.fn(() => ({ didBindToggle: true }));
    const syncMobileTimerboxUi = vi.fn();

    const resolvers = createSettingsModalInitResolvers({
      themeSettingsPageHostRuntime: {
        applyThemeSettingsPageInit
      },
      themeSettingsHostRuntime: { id: "theme-host" },
      themeSettingsRuntime: { id: "theme-runtime" },
      timerModuleSettingsHostRuntime: {
        applyLegacyUndoSettingsCleanup
      },
      timerModuleSettingsPageHostRuntime: {
        applyTimerModuleSettingsPageInit
      },
      timerModuleRuntime: { id: "timer-runtime" },
      documentLike: { id: "document" },
      windowLike: { id: "window" },
      retryDelayMs: 120,
      setTimeoutLike: vi.fn(),
      syncMobileTimerboxUi
    });

    expect(resolvers.initThemeSettingsUI()).toEqual({ didApply: true });
    expect(resolvers.removeLegacyUndoSettingsUI()).toEqual({ didRemoveRow: true });
    expect(resolvers.initTimerModuleSettingsUI()).toEqual({ didBindToggle: true });
    expect(resolvers.initWinPromptSettingsUI()).toEqual({
      hasToggle: false,
      didBindToggle: false,
      didSync: false
    });

    expect(applyThemeSettingsPageInit).toHaveBeenCalledWith({
      themeSettingsHostRuntime: { id: "theme-host" },
      themeSettingsRuntime: { id: "theme-runtime" },
      documentLike: { id: "document" },
      windowLike: { id: "window" }
    });
    expect(applyLegacyUndoSettingsCleanup).toHaveBeenCalledWith({
      documentLike: { id: "document" }
    });
    expect(applyTimerModuleSettingsPageInit).toHaveBeenCalledTimes(1);
    const timerPayload = applyTimerModuleSettingsPageInit.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(timerPayload.retryDelayMs).toBe(120);
    expect(typeof timerPayload.reinvokeInit).toBe("function");
    expect(timerPayload.syncMobileTimerboxUi).toBe(syncMobileTimerboxUi);
  });

  it("resolves syncMobileTimerboxUI from window when resolver input is missing", () => {
    const applyTimerModuleSettingsPageInit = vi.fn(() => ({ didBindToggle: true }));
    const syncMobileTimerboxUI = vi.fn();
    const windowLike = { syncMobileTimerboxUI };

    const resolvers = createSettingsModalInitResolvers({
      timerModuleSettingsPageHostRuntime: {
        applyTimerModuleSettingsPageInit
      },
      windowLike
    });

    expect(resolvers.initTimerModuleSettingsUI()).toEqual({ didBindToggle: true });

    const timerPayload = applyTimerModuleSettingsPageInit.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    const syncResolver = timerPayload.syncMobileTimerboxUi as (() => unknown) | undefined;
    expect(typeof syncResolver).toBe("function");
    syncResolver && syncResolver();
    expect(syncMobileTimerboxUI).toHaveBeenCalledTimes(1);
    expect(syncMobileTimerboxUI.mock.contexts[0]).toBe(windowLike);
  });

  it("initializes win prompt toggle state from storage and persists changes", () => {
    const handlers: Record<string, (() => void) | undefined> = {};
    const toggle = {
      checked: true,
      __winPromptBound: false,
      addEventListener(eventName: string, handler: () => void) {
        handlers[eventName] = handler;
      }
    };
    const note = { textContent: "" };
    let storageValue = "0";
    const localStorage = {
      getItem: vi.fn(() => storageValue),
      setItem: vi.fn((key: string, value: string) => {
        if (key === "settings_win_prompt_enabled_v1") {
          storageValue = value;
        }
      })
    };

    const resolvers = createSettingsModalInitResolvers({
      documentLike: {
        getElementById(id: string) {
          if (id === "win-prompt-toggle") return toggle;
          if (id === "win-prompt-note") return note;
          return null;
        }
      },
      windowLike: { localStorage }
    });

    expect(resolvers.initWinPromptSettingsUI()).toEqual({
      hasToggle: true,
      didBindToggle: true,
      didSync: true
    });
    expect(toggle.checked).toBe(false);
    expect(note.textContent).toContain("不弹出胜利提示");

    toggle.checked = true;
    handlers.change && handlers.change();
    expect(localStorage.setItem).toHaveBeenCalledWith("settings_win_prompt_enabled_v1", "1");
    expect(note.textContent).toContain("会弹出胜利提示");

    expect(resolvers.initWinPromptSettingsUI()).toEqual({
      hasToggle: true,
      didBindToggle: false,
      didSync: true
    });
  });

  it("reads legacy win prompt storage value and treats 'false' as disabled", () => {
    const toggle = {
      checked: true,
      __winPromptBound: false,
      addEventListener() {}
    };
    const note = { textContent: "" };
    const localStorage = {
      getItem: vi.fn((key: string) => {
        if (key === "settings_win_prompt_enabled_v1") return null;
        if (key === "settings_win_prompt_enabled") return "false";
        return null;
      }),
      setItem: vi.fn()
    };

    const resolvers = createSettingsModalInitResolvers({
      documentLike: {
        getElementById(id: string) {
          if (id === "win-prompt-toggle") return toggle;
          if (id === "win-prompt-note") return note;
          return null;
        }
      },
      windowLike: { localStorage }
    });

    expect(resolvers.initWinPromptSettingsUI()).toEqual({
      hasToggle: true,
      didBindToggle: true,
      didSync: true
    });
    expect(toggle.checked).toBe(false);
    expect(note.textContent).toContain("不弹出胜利提示");
  });

  it("creates settings init resolvers with safe fallbacks when host apis are missing", () => {
    const resolvers = createSettingsModalInitResolvers({
      themeSettingsPageHostRuntime: {},
      timerModuleSettingsHostRuntime: {},
      timerModuleSettingsPageHostRuntime: {}
    });

    expect(resolvers.initThemeSettingsUI()).toBeNull();
    expect(resolvers.removeLegacyUndoSettingsUI()).toBeNull();
    expect(resolvers.initTimerModuleSettingsUI()).toBeNull();
    expect(resolvers.initWinPromptSettingsUI()).toEqual({
      hasToggle: false,
      didBindToggle: false,
      didSync: false
    });
  });
});
