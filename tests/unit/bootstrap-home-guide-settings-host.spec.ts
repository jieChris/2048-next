import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideSettingsUi } from "../../src/bootstrap/home-guide-settings-host";

function createHarness() {
  const triggerHandlers: Record<string, () => void> = {};
  const trigger = {
    __homeGuideBound: false,
    disabled: false,
    addEventListener(name: string, handler: () => void) {
      triggerHandlers[name] = handler;
    }
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
      if (id === "home-guide-trigger-btn") return inserted ? trigger : null;
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
    trigger,
    triggerHandlers,
    insertedRows
  };
}

describe("bootstrap home guide settings host", () => {
  it("keeps settings free of guide actions and exposes a noop sync hook", () => {
    const harness = createHarness();
    const windowLike: Record<string, unknown> = {};

    const result = applyHomeGuideSettingsUi({
      documentLike: harness.documentLike,
      windowLike
    });

    expect(result).toEqual({
      hasToggle: false,
      didBindToggle: false,
      didAssignSync: true,
      didSync: false
    });
    expect(harness.insertedRows).toHaveLength(0);
    expect(harness.trigger.__homeGuideBound).toBe(false);
    expect(typeof windowLike.syncHomeGuideSettingsUI).toBe("function");
    expect(harness.triggerHandlers.click).toBeUndefined();
  });

  it("removes an existing guide action row when one is already present", () => {
    const removedNodes: unknown[] = [];
    const row = {
      parentNode: {
        removeChild(node: unknown) {
          removedNodes.push(node);
        }
      }
    };
    const trigger = {
      closest(selector: string) {
        return selector === ".settings-row" ? row : null;
      }
    };

    const result = applyHomeGuideSettingsUi({
      documentLike: {
        getElementById(id: string) {
          return id === "home-guide-trigger-btn" ? trigger : null;
        }
      }
    });

    expect(result).toEqual({
      hasToggle: false,
      didBindToggle: false,
      didAssignSync: false,
      didSync: false
    });
    expect(removedNodes).toEqual([row]);
  });
});
