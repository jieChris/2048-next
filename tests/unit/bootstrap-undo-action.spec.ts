import { describe, expect, it, vi } from "vitest";

import {
  canTriggerUndo,
  isUndoCapableMode,
  isUndoInteractionEnabled,
  resolveUndoCapabilityFromContext,
  resolveUndoModeIdFromBody,
  resolveUndoModeId,
  tryTriggerUndo
} from "../../src/bootstrap/undo-action";

describe("bootstrap undo action", () => {
  it("returns false when manager is unavailable", () => {
    expect(canTriggerUndo(null)).toBe(false);
    expect(canTriggerUndo({})).toBe(false);
    expect(tryTriggerUndo(null)).toBe(false);
  });

  it("returns false when undo is disabled", () => {
    const manager = {
      isUndoInteractionEnabled: vi.fn(() => false),
      move: vi.fn()
    };

    expect(canTriggerUndo(manager)).toBe(false);
    expect(tryTriggerUndo(manager)).toBe(false);
    expect(manager.move).not.toHaveBeenCalled();
  });

  it("triggers undo when enabled", () => {
    const manager = {
      isUndoInteractionEnabled: vi.fn(() => true),
      move: vi.fn()
    };

    expect(canTriggerUndo(manager)).toBe(true);
    expect(tryTriggerUndo(manager)).toBe(true);
    expect(manager.move).toHaveBeenCalledWith(-1);
  });

  it("supports custom direction for replay-like controls", () => {
    const manager = {
      isUndoInteractionEnabled: vi.fn(() => true),
      move: vi.fn()
    };

    expect(tryTriggerUndo(manager, -2)).toBe(true);
    expect(manager.move).toHaveBeenCalledWith(-2);
  });

  it("resolves undo mode id by priority", () => {
    expect(
      resolveUndoModeId({
        modeId: "practice_legacy",
        manager: { mode: "fallback_mode" },
        globalModeConfig: { key: "global_mode" }
      })
    ).toBe("practice_legacy");

    expect(
      resolveUndoModeId({
        modeId: "   ",
        manager: { mode: "fallback_mode" },
        globalModeConfig: { key: "global_mode" }
      })
    ).toBe("fallback_mode");

    expect(
      resolveUndoModeId({
        modeId: "",
        manager: {},
        globalModeConfig: { key: "global_mode" }
      })
    ).toBe("global_mode");
  });

  it("resolves undo mode id from body attribute safely", () => {
    expect(
      resolveUndoModeIdFromBody({
        bodyLike: {
          getAttribute(name: string) {
            return name === "data-mode-id" ? "mode_from_dom" : null;
          }
        }
      })
    ).toBe("mode_from_dom");
    expect(resolveUndoModeIdFromBody({ bodyLike: null })).toBe("");
  });

  it("resolves undo capability from context safely", () => {
    const state = resolveUndoCapabilityFromContext({
      bodyLike: {
        getAttribute(name: string) {
          return name === "data-mode-id" ? "capped_4x4_pow2_no_undo" : null;
        }
      },
      manager: { mode: "standard", undoEnabled: true },
      globalModeConfig: { key: "standard", undo_enabled: true }
    });
    expect(state.modeId).toBe("capped_4x4_pow2_no_undo");
    expect(state.modeUndoCapable).toBe(false);

    const fallbackState = resolveUndoCapabilityFromContext({
      bodyLike: null,
      manager: { mode: "standard", undoEnabled: true }
    });
    expect(fallbackState.modeId).toBe("");
    expect(fallbackState.modeUndoCapable).toBe(true);
  });

  it("supports undo capability by mode key guard", () => {
    const manager = {
      mode: "standard",
      undoEnabled: true
    };

    expect(
      isUndoCapableMode({
        modeId: "capped_4x4_pow2_no_undo",
        manager
      })
    ).toBe(false);
    expect(
      isUndoCapableMode({
        modeId: "some_undo_only_mode",
        manager: { mode: "x", undoEnabled: false }
      })
    ).toBe(true);
  });

  it("supports undo capability by explicit mode config", () => {
    expect(
      isUndoCapableMode({
        modeId: "standard",
        manager: {
          mode: "standard",
          modeConfig: { undo_enabled: false },
          undoEnabled: true
        }
      })
    ).toBe(false);

    expect(
      isUndoCapableMode({
        modeId: "standard",
        manager: { mode: "standard", undoEnabled: false },
        globalModeConfig: { undo_enabled: true }
      })
    ).toBe(true);
  });

  it("supports undo capability by manager strategy fallback", () => {
    const allowManager = {
      mode: "dynamic_mode",
      undoEnabled: false,
      isUndoAllowedByMode: vi.fn(() => true)
    };
    const denyManager = {
      mode: "dynamic_mode",
      undoEnabled: true,
      isUndoAllowedByMode: vi.fn(() => false)
    };

    expect(isUndoCapableMode({ manager: allowManager })).toBe(true);
    expect(isUndoCapableMode({ manager: denyManager })).toBe(false);
    expect(isUndoCapableMode({ manager: { mode: "x", undoEnabled: true } })).toBe(true);
  });

  it("checks undo interaction enabled safely", () => {
    expect(isUndoInteractionEnabled(null)).toBe(false);
    expect(
      isUndoInteractionEnabled({
        isUndoInteractionEnabled: () => true
      })
    ).toBe(true);
    expect(
      isUndoInteractionEnabled({
        isUndoInteractionEnabled: () => false
      })
    ).toBe(false);
  });
});
