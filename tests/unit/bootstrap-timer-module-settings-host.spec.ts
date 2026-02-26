import { describe, expect, it, vi } from "vitest";

import {
  applyLegacyUndoSettingsCleanup,
  ensureTimerModuleSettingsToggle
} from "../../src/bootstrap/timer-module-settings-host";

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
        className: "settings-row",
        innerHTML: "<input id='timer-module-view-toggle' />"
      })
    );
    expect(content.appendChild).not.toHaveBeenCalled();
  });

  it("returns existing toggle directly when already present", () => {
    const existingToggle = { id: "timer-module-view-toggle" };
    const result = ensureTimerModuleSettingsToggle({
      documentLike: {
        getElementById(id: string) {
          return id === "timer-module-view-toggle" ? existingToggle : null;
        }
      }
    });
    expect(result).toBe(existingToggle);
  });
});
