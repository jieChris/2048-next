import { describe, expect, it, vi } from "vitest";

import {
  canTriggerUndo,
  createUndoActionRuntime,
  installUndoActionRuntime,
  isUndoCapableMode,
  isUndoInteractionEnabled,
  resolveUndoCapabilityFromContext,
  resolveUndoModeIdFromBody,
  resolveUndoModeId,
  tryTriggerUndo,
  tryTriggerUndoFromContext,
  type UndoActionRuntime
} from "../../src/bootstrap/undo-action";

describe("bootstrap undo action", () => {
  it("creates the legacy CoreUndoActionRuntime shape from TypeScript functions", () => {
    const runtime = createUndoActionRuntime();

    expect(runtime.canTriggerUndo).toBe(canTriggerUndo);
    expect(runtime.resolveUndoModeIdFromBody).toBe(resolveUndoModeIdFromBody);
    expect(runtime.resolveUndoModeId).toBe(resolveUndoModeId);
    expect(runtime.isUndoCapableMode).toBe(isUndoCapableMode);
    expect(runtime.resolveUndoCapabilityFromContext).toBe(resolveUndoCapabilityFromContext);
    expect(runtime.isUndoInteractionEnabled).toBe(isUndoInteractionEnabled);
    expect(runtime.tryTriggerUndo).toBe(tryTriggerUndo);
    expect(runtime.tryTriggerUndoFromContext).toBe(tryTriggerUndoFromContext);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreUndoActionRuntime?: UndoActionRuntime } = {};

    const installed = installUndoActionRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreUndoActionRuntime);
    expect(installed?.tryTriggerUndo).toBeTypeOf("function");
  });

  it("does not overwrite an existing undo action runtime", () => {
    const existing = createUndoActionRuntime();
    const windowLike = { CoreUndoActionRuntime: existing };

    const installed = installUndoActionRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreUndoActionRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installUndoActionRuntime({ windowLike: null })).toBeNull();
  });

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

  it("resolves manager from window context when triggering undo", () => {
    const manager = {
      isUndoInteractionEnabled: vi.fn(() => true),
      move: vi.fn()
    };
    const result = tryTriggerUndoFromContext({
      windowLike: {
        game_manager: manager
      },
      direction: -3
    });

    expect(manager.move).toHaveBeenCalledWith(-3);
    expect(result).toEqual({
      didTrigger: true,
      managerResolved: true
    });
  });

  it("returns safe result when undo manager is missing in context", () => {
    const result = tryTriggerUndoFromContext({
      windowLike: null,
      direction: -1
    });
    expect(result).toEqual({
      didTrigger: false,
      managerResolved: false
    });
  });

  it("resolves undo mode id by priority", () => {
    expect(
      resolveUndoModeId({
        modeId: "practice",
        manager: { mode: "fallback_mode" },
        globalModeConfig: { key: "global_mode" }
      })
    ).toBe("practice");

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
