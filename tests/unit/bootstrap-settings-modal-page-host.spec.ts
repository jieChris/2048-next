import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import {
  createSettingsModalInitResolvers,
  createSettingsModalActionResolvers,
  applySettingsModalPageClose,
  applySettingsModalPageOpen,
  normalizeSettingsModalContent
} from "../../src/bootstrap/settings-modal-page-host";

describe("bootstrap settings modal page host", () => {
  it("normalizes settings rows to one canonical order across page templates", () => {
    const dom = new JSDOM(`
      <div id="settings-modal" class="replay-modal-overlay" style="display: none;">
        <div class="replay-modal-content settings-modal-content">
          <h3>设置</h3>
          <div id="toolkit-entry-row" class="settings-row toolkit-entry-row">
            <div class="toolkit-entry-actions">
              <a id="toolkit-palette-link" class="replay-button" href="palette.html">主题设置</a>
            </div>
          </div>
          <div id="night-bg-settings-row" class="settings-row settings-toggle-row"></div>
          <div class="settings-row settings-toggle-row">
            <label for="pku2048-inline-stats-toggle" class="settings-toggle-title">统计面板</label>
            <input id="pku2048-inline-stats-toggle" type="checkbox">
          </div>
          <div id="bgm-settings-row" class="settings-row settings-toggle-row"></div>
          <div class="settings-row settings-toggle-row">
            <label for="win-prompt-toggle" class="settings-toggle-title">胜利提示</label>
            <input id="win-prompt-toggle" type="checkbox">
          </div>
        </div>
      </div>
    `);

    const result = normalizeSettingsModalContent({
      documentLike: dom.window.document
    });

    expect(result).toEqual({
      hasModal: true,
      didNormalize: true,
      hasInlineStats: true
    });
    expect(
      Array.from(dom.window.document.querySelectorAll(".settings-modal-content > .settings-row"))
        .map((row) => {
          const input = row.querySelector("input");
          return row.id || input?.id || "";
        })
    ).toEqual([
      "win-prompt-toggle",
      "bgm-settings-row",
      "night-bg-settings-row",
      "operation-feedback-settings-row",
      "pku2048-inline-stats-toggle"
    ]);
    expect(dom.window.document.querySelectorAll("#win-prompt-toggle")).toHaveLength(1);
    expect(dom.window.document.querySelectorAll("#bgm-toggle")).toHaveLength(1);
    expect(dom.window.document.querySelectorAll("#night-bg-toggle")).toHaveLength(1);
    expect(dom.window.document.querySelector("#toolkit-entry-row")).toBeNull();
    expect(dom.window.document.querySelector("#toolkit-account-link")).toBeNull();
  });

  it("preserves dynamic settings rows and reuses canonical nodes on repeated opens", () => {
    const dom = new JSDOM(`
      <div id="settings-modal">
        <div class="settings-modal-content">
          <h3>设置</h3>
          <div id="top-button-style-settings-row" class="settings-row settings-toggle-row">
            <input id="top-button-style-toggle" type="checkbox">
          </div>
          <div id="ui-language-settings-row" class="settings-row settings-toggle-row">
            <input id="ui-language-toggle" type="checkbox">
          </div>
          <div id="toolkit-entry-row" class="settings-row toolkit-entry-row"></div>
        </div>
      </div>
    `, {
      url: "https://example.test/"
    });

    normalizeSettingsModalContent({
      documentLike: dom.window.document
    });
    const winPromptToggle = dom.window.document.getElementById("win-prompt-toggle");
    const topButtonStyleRow = dom.window.document.getElementById("top-button-style-settings-row");

    normalizeSettingsModalContent({
      documentLike: dom.window.document
    });

    expect(dom.window.document.getElementById("win-prompt-toggle")).toBe(winPromptToggle);
    expect(dom.window.document.getElementById("top-button-style-settings-row")).toBe(topButtonStyleRow);
    expect(
      Array.from(dom.window.document.querySelectorAll(".settings-modal-content > .settings-row"))
        .map((row) => row.id || row.querySelector("input")?.id || "")
    ).toEqual([
      "win-prompt-toggle",
      "bgm-settings-row",
      "night-bg-settings-row",
      "operation-feedback-settings-row",
      "top-button-style-settings-row",
      "ui-language-settings-row"
    ]);
  });

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
      initWinPromptSettingsUI
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
      initWinPromptSettingsUI
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

    const result = applySettingsModalPageOpen({
      settingsModalHostRuntime: {
        applySettingsModalOpenOrchestration
      },
      replayModalRuntime,
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initWinPromptSettingsUI
    });

    expect(applySettingsModalOpenOrchestration).toHaveBeenCalledWith({
      replayModalRuntime,
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initWinPromptSettingsUI
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
    const applyTimerModuleSettingsPageInit = vi.fn(() => ({ didApply: true }));
    const setTimeoutLike = vi.fn();

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
      setTimeoutLike
    });

    expect(resolvers.initThemeSettingsUI()).toEqual({ didApply: true });
    expect(resolvers.removeLegacyUndoSettingsUI()).toEqual({ didRemoveRow: true });
    expect(resolvers.initTimerModuleSettingsUI()).toEqual({ didApply: true });
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
    expect(applyTimerModuleSettingsPageInit).toHaveBeenCalledWith({
      timerModuleSettingsHostRuntime: {
        applyLegacyUndoSettingsCleanup
      },
      timerModuleRuntime: { id: "timer-runtime" },
      documentLike: { id: "document" },
      windowLike: { id: "window" },
      retryDelayMs: 120,
      setTimeoutLike,
      reinvokeInit: expect.any(Function),
      syncMobileTimerboxUi: undefined
    });
  });

  it("returns null for timer settings init when page host api is missing", () => {
    const resolvers = createSettingsModalInitResolvers({
      documentLike: {}
    });

    expect(resolvers.initTimerModuleSettingsUI()).toBeNull();
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
    expect(note.textContent).toContain("自动继续游戏");

    toggle.checked = true;
    handlers.change && handlers.change();
    expect(localStorage.setItem).toHaveBeenCalledWith("settings_win_prompt_enabled_v1", "1");
    expect(note.textContent).toContain("弹出胜利提示");

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
    expect(note.textContent).toContain("自动继续游戏");
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
