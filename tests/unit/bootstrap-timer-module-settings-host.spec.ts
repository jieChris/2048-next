import { describe, expect, it, vi } from "vitest";

import {
  applyLegacyUndoSettingsCleanup,
  applyTimerModuleSettingsUi,
  ensureTimerModuleSettingsToggle
} from "../../src/bootstrap/timer-module-settings-host";

function createTimerRuntime() {
  return {
    resolveTimerModuleInitRetryState(payload: { hasManager?: boolean }) {
      return {
        shouldRetry: !payload.hasManager,
        retryDelayMs: 60
      };
    },
    resolveTimerModuleCurrentViewMode(payload: {
      manager?: {
        getTimerModuleViewMode?: (() => string) | null;
      };
    }) {
      if (payload.manager && typeof payload.manager.getTimerModuleViewMode === "function") {
        return payload.manager.getTimerModuleViewMode();
      }
      return "timer";
    },
    resolveTimerModuleSettingsState(payload: { viewMode?: string }) {
      return {
        toggleDisabled: false,
        toggleChecked: payload.viewMode !== "hidden",
        noteText: payload.viewMode === "hidden" ? "隐藏" : "显示"
      };
    },
    resolveTimerModuleBindingState(payload: { alreadyBound?: boolean }) {
      return {
        shouldBind: !payload.alreadyBound,
        boundValue: true
      };
    },
    resolveTimerModuleViewMode(payload: { checked?: boolean }) {
      return {
        viewMode: payload.checked ? "timer" : "hidden"
      };
    },
    resolveTimerModuleAppliedViewMode(payload: {
      nextViewMode?: { viewMode?: string };
      checked?: boolean;
    }) {
      if (payload.nextViewMode && payload.nextViewMode.viewMode) {
        return payload.nextViewMode.viewMode;
      }
      return payload.checked ? "timer" : "hidden";
    }
  };
}

describe("bootstrap timer module settings host", () => {
  it("removes legacy undo settings row when toggle row exists", () => {
    const parentNode = {
      removeChild: vi.fn()
    };
    const row = { parentNode };
    const toggle = {
      closest(selector: string) {
        return selector === ".settings-row" ? row : null;
      }
    };

    const result = applyLegacyUndoSettingsCleanup({
      documentLike: {
        getElementById(id: string) {
          return id === "undo-enabled-toggle" ? toggle : null;
        }
      }
    });

    expect(result).toEqual({
      hadToggle: true,
      didRemoveRow: true,
      didHideToggle: false
    });
    expect(parentNode.removeChild).toHaveBeenCalledWith(row);
  });

  it("hides legacy undo toggle when row is unavailable", () => {
    const toggle = {
      style: {},
      closest() {
        return null;
      }
    };

    const result = applyLegacyUndoSettingsCleanup({
      documentLike: {
        getElementById(id: string) {
          return id === "undo-enabled-toggle" ? toggle : null;
        }
      }
    });

    expect(result).toEqual({
      hadToggle: true,
      didRemoveRow: false,
      didHideToggle: true
    });
    expect(toggle.style.display).toBe("none");
  });

  it("creates timer settings row before replay actions and returns inserted toggle", () => {
    const nodes: Record<string, unknown> = {};
    const toggle = { id: "timer-module-view-toggle" };
    const actions = { parentNode: null as unknown };
    const content = {
      insertedRow: null as unknown,
      querySelector(selector: string) {
        return selector === ".replay-modal-actions" ? actions : null;
      },
      insertBefore(row: unknown) {
        this.insertedRow = row;
        nodes["timer-module-view-toggle"] = toggle;
      },
      appendChild: vi.fn()
    };
    actions.parentNode = content;

    const modal = {
      querySelector(selector: string) {
        return selector === ".settings-modal-content" ? content : null;
      }
    };

    const documentLike = {
      getElementById(id: string) {
        if (id === "settings-modal") return modal;
        return nodes[id] || null;
      },
      createElement() {
        return {
          className: "",
          innerHTML: ""
        };
      }
    };

    const result = ensureTimerModuleSettingsToggle({
      documentLike,
      timerModuleRuntime: {
        buildTimerModuleSettingsRowInnerHtml() {
          return "<input id='timer-module-view-toggle' />";
        }
      }
    });

    expect(result).toBe(toggle);
    expect(content.insertedRow).toEqual(
      expect.objectContaining({
        className: "settings-row settings-toggle-row",
        innerHTML: "<input id='timer-module-view-toggle' />"
      })
    );
    expect(content.appendChild).not.toHaveBeenCalled();
  });

  it("returns existing toggle directly when already present", () => {
    const existingRow = {
      innerHTML: ""
    };
    const existingToggle = {
      id: "timer-module-view-toggle",
      closest(selector: string) {
        return selector === ".settings-row" ? existingRow : null;
      }
    };
    const result = ensureTimerModuleSettingsToggle({
      documentLike: {
        getElementById(id: string) {
          return id === "timer-module-view-toggle" ? existingToggle : null;
        }
      },
      timerModuleRuntime: {
        buildTimerModuleSettingsRowInnerHtml() {
          return "<input id='timer-module-view-toggle' />";
        }
      }
    });
    expect(result).toBe(existingToggle);
    expect(existingRow.innerHTML).toBe("<input id='timer-module-view-toggle' />");
  });

  it("schedules retry when manager is not ready", () => {
    const scheduleRetry = vi.fn();

    const result = applyTimerModuleSettingsUi({
      toggle: {},
      noteElement: {},
      windowLike: {},
      timerModuleRuntime: createTimerRuntime(),
      retryDelayMs: 80,
      scheduleRetry
    });

    expect(result).toEqual({
      hasToggle: true,
      shouldRetry: true,
      didScheduleRetry: true,
      didAssignSync: false,
      didBindToggle: false,
      didSync: false
    });
    expect(scheduleRetry).toHaveBeenCalledWith(60);
  });

  it("binds toggle and syncs view mode with manager", () => {
    const toggleHandlers: Record<string, () => void> = {};
    const toggle = {
      __timerViewBound: false,
      checked: false,
      disabled: true,
      addEventListener(name: string, handler: () => void) {
        toggleHandlers[name] = handler;
      }
    };
    const note = {
      textContent: ""
    };
    const syncMobileTimerboxUi = vi.fn();
    const setTimerModuleViewModeCalls: string[] = [];
    let setTimerModuleViewModeThis: unknown = null;
    const manager = {
      getTimerModuleViewMode() {
        return "hidden";
      },
      setTimerModuleViewMode(this: unknown, viewMode: string) {
        setTimerModuleViewModeThis = this;
        setTimerModuleViewModeCalls.push(viewMode);
      }
    };
    const windowLike: Record<string, unknown> = {
      game_manager: manager
    };

    const result = applyTimerModuleSettingsUi({
      toggle,
      noteElement: note,
      windowLike,
      timerModuleRuntime: createTimerRuntime(),
      scheduleRetry: vi.fn(),
      syncMobileTimerboxUi
    });

    expect(result).toEqual({
      hasToggle: true,
      shouldRetry: false,
      didScheduleRetry: false,
      didAssignSync: true,
      didBindToggle: true,
      didSync: true
    });
    expect(toggle.checked).toBe(false);
    expect(toggle.disabled).toBe(false);
    expect(note.textContent).toBe("隐藏");
    expect(syncMobileTimerboxUi).toHaveBeenCalledTimes(1);
    expect(typeof windowLike.syncTimerModuleSettingsUI).toBe("function");

    toggle.checked = true;
    toggleHandlers.change();
    expect(setTimerModuleViewModeCalls).toEqual(["timer"]);
    expect(setTimerModuleViewModeThis).toBe(manager);
    expect(syncMobileTimerboxUi).toHaveBeenCalledTimes(2);
  });

  it("skips rebinding when toggle is already bound", () => {
    const addEventListener = vi.fn();
    const toggle = {
      __timerViewBound: true,
      checked: true,
      disabled: false,
      addEventListener
    };

    const result = applyTimerModuleSettingsUi({
      toggle,
      noteElement: { textContent: "" },
      windowLike: {
        game_manager: {
          getTimerModuleViewMode() {
            return "timer";
          }
        }
      },
      timerModuleRuntime: createTimerRuntime(),
      syncMobileTimerboxUi: vi.fn()
    });

    expect(result.didBindToggle).toBe(false);
    expect(addEventListener).not.toHaveBeenCalled();
  });
});
