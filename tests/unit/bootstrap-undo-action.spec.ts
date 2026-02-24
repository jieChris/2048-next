import { describe, expect, it, vi } from "vitest";

import {
  canTriggerUndo,
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
});
