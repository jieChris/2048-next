import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideSettingsUi } from "../../src/bootstrap/home-guide-settings-host";

function createHarness() {
  const toggleHandlers: Record<string, () => void> = {};
  const toggle = {
    __homeGuideBound: false,
    checked: false,
    disabled: false,
    addEventListener(name: string, handler: () => void) {
      toggleHandlers[name] = handler;
    }
  };
  const note = {
    textContent: ""
  };

  const actions = { parentNode: null as unknown };
  let inserted = false;
  const insertedRows: Array<Record<string, unknown>> = [];

  const content = {
    querySelector(selector: string) {
      return selector === ".replay-modal-actions" ? actions : null;
    },
    insertBefore(row: unknown) {
      inserted = true;
      insertedRows.push(row as Record<string, unknown>);
    },
    appendChild(row: unknown) {
      inserted = true;
      insertedRows.push(row as Record<string, unknown>);
    }
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
      if (id === "home-guide-note") return note;
      if (id === "home-guide-toggle") return inserted ? toggle : null;
      return null;
    },
    createElement() {
      return {
        className: "",
        innerHTML: ""
      };
    }
  };

  return {
    documentLike,
    toggle,
    toggleHandlers,
    note,
    insertedRows
  };
}

describe("bootstrap home guide settings host", () => {
  it("creates settings row, syncs ui and triggers guide start action", () => {
    const harness = createHarness();
    const closeSettingsModal = vi.fn();
    const startHomeGuide = vi.fn();
    const windowLike: Record<string, unknown> = {};

    const result = applyHomeGuideSettingsUi({
      documentLike: harness.documentLike,
      windowLike,
      homeGuideRuntime: {
        buildHomeGuideSettingsRowInnerHtml() {
          return '<label><input id="home-guide-toggle" /></label><span id="home-guide-note"></span>';
        },
        resolveHomeGuideSettingsState() {
          return {
            toggleDisabled: false,
            toggleChecked: false,
            noteText: "未启用"
          };
        },
        resolveHomeGuideBindingState() {
          return {
            shouldBind: true,
            boundValue: true
          };
        },
        resolveHomeGuideToggleAction(payload: { checked: boolean }) {
          if (!payload.checked) {
            return {
              shouldResync: false,
              shouldStartGuide: false
            };
          }
          return {
            shouldResync: false,
            shouldStartGuide: true,
            shouldCloseSettings: true,
            startFromSettings: true
          };
        }
      },
      homeGuideState: {
        active: false,
        fromSettings: false
      },
      isHomePage() {
        return true;
      },
      closeSettingsModal,
      startHomeGuide
    });

    expect(result).toEqual({
      hasToggle: true,
      didBindToggle: true,
      didAssignSync: true,
      didSync: true
    });
    expect(harness.insertedRows).toHaveLength(1);
    expect(harness.insertedRows[0].className).toBe("settings-row");
    expect(harness.toggle.__homeGuideBound).toBe(true);
    expect(harness.note.textContent).toBe("未启用");
    expect(typeof windowLike.syncHomeGuideSettingsUI).toBe("function");

    harness.toggle.checked = true;
    harness.toggleHandlers.change();
    expect(closeSettingsModal).toHaveBeenCalledTimes(1);
    expect(startHomeGuide).toHaveBeenCalledWith({ fromSettings: true });
  });

  it("resyncs only when toggle action requests resync", () => {
    const harness = createHarness();
    const syncMarks: string[] = [];

    applyHomeGuideSettingsUi({
      documentLike: harness.documentLike,
      homeGuideRuntime: {
        buildHomeGuideSettingsRowInnerHtml() {
          return '<input id="home-guide-toggle" /><span id="home-guide-note"></span>';
        },
        resolveHomeGuideSettingsState() {
          syncMarks.push("sync");
          return {
            toggleDisabled: false,
            toggleChecked: false,
            noteText: ""
          };
        },
        resolveHomeGuideBindingState() {
          return {
            shouldBind: true,
            boundValue: true
          };
        },
        resolveHomeGuideToggleAction() {
          return {
            shouldResync: true,
            shouldStartGuide: false
          };
        }
      },
      isHomePage() {
        return true;
      }
    });

    expect(syncMarks).toEqual(["sync"]);
    harness.toggleHandlers.change();
    expect(syncMarks).toEqual(["sync", "sync"]);
  });
});
