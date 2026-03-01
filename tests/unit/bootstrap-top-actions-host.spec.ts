import { describe, expect, it, vi } from "vitest";

import {
  applyGameTopActionsPlacementSync,
  applyPracticeTopActionsPlacementSync
} from "../../src/bootstrap/top-actions-host";

describe("bootstrap top actions host", () => {
  it("returns early when game scope is false", () => {
    const existingState = { id: "game-state" };
    const result = applyGameTopActionsPlacementSync({
      isGamePageScope: false,
      mobileTopActionsState: existingState
    });

    expect(result).toEqual({
      isScope: false,
      hasState: true,
      didCreateState: false,
      didSync: false,
      mobileTopActionsState: existingState
    });
  });

  it("creates game placement state and syncs when in scope", () => {
    const createdState = { id: "created-game-state" };
    const createGameTopActionsPlacementState = vi.fn(() => createdState);
    const syncGameTopActionsPlacement = vi.fn(() => true);
    const querySelector = vi.fn((selector: string) => ({ selector }));
    const getElementById = vi.fn((id: string) => ({ id }));
    const createComment = vi.fn((text: string) => ({ text }));

    const result = applyGameTopActionsPlacementSync({
      topActionsRuntime: {
        createGameTopActionsPlacementState,
        syncGameTopActionsPlacement
      },
      isGamePageScope: true,
      compactViewport: true,
      querySelector,
      getElementById,
      createComment
    });

    expect(result.isScope).toBe(true);
    expect(result.hasState).toBe(true);
    expect(result.didCreateState).toBe(true);
    expect(result.didSync).toBe(true);
    expect(result.mobileTopActionsState).toBe(createdState);
    expect(createGameTopActionsPlacementState).toHaveBeenCalledTimes(1);
    expect(syncGameTopActionsPlacement).toHaveBeenCalledTimes(1);
    expect(querySelector).toHaveBeenCalledWith(".top-action-buttons");
    expect(querySelector).toHaveBeenCalledWith(".above-game .restart-button");
    expect(getElementById).toHaveBeenCalledWith("timerbox-toggle-btn");
    expect(createGameTopActionsPlacementState).toHaveBeenCalledWith(
      expect.objectContaining({
        createComment
      })
    );
  });

  it("reuses existing game state without re-creating", () => {
    const existingState = { id: "existing" };
    const createGameTopActionsPlacementState = vi.fn(() => ({ id: "new" }));
    const syncGameTopActionsPlacement = vi.fn(() => true);

    const result = applyGameTopActionsPlacementSync({
      topActionsRuntime: {
        createGameTopActionsPlacementState,
        syncGameTopActionsPlacement
      },
      mobileTopActionsState: existingState,
      isGamePageScope: () => true,
      compactViewport: false
    });

    expect(result.didCreateState).toBe(false);
    expect(result.didSync).toBe(true);
    expect(result.mobileTopActionsState).toBe(existingState);
    expect(createGameTopActionsPlacementState).not.toHaveBeenCalled();
    expect(syncGameTopActionsPlacement).toHaveBeenCalledTimes(1);
  });

  it("creates practice placement state and syncs when in scope", () => {
    const createdState = { id: "created-practice-state" };
    const createPracticeTopActionsPlacementState = vi.fn(() => createdState);
    const syncPracticeTopActionsPlacement = vi.fn(() => true);
    const querySelector = vi.fn((selector: string) => ({ selector }));
    const getElementById = vi.fn((id: string) => ({ id }));
    const createComment = vi.fn((text: string) => ({ text }));

    const result = applyPracticeTopActionsPlacementSync({
      topActionsRuntime: {
        createPracticeTopActionsPlacementState,
        syncPracticeTopActionsPlacement
      },
      isPracticePageScope: () => true,
      compactViewport: true,
      querySelector,
      getElementById,
      createComment
    });

    expect(result.isScope).toBe(true);
    expect(result.hasState).toBe(true);
    expect(result.didCreateState).toBe(true);
    expect(result.didSync).toBe(true);
    expect(result.practiceTopActionsState).toBe(createdState);
    expect(createPracticeTopActionsPlacementState).toHaveBeenCalledTimes(1);
    expect(syncPracticeTopActionsPlacement).toHaveBeenCalledTimes(1);
    expect(getElementById).toHaveBeenCalledWith("practice-stats-actions");
    expect(querySelector).toHaveBeenCalledWith(".above-game .restart-button");
    expect(createPracticeTopActionsPlacementState).toHaveBeenCalledWith(
      expect.objectContaining({
        createComment
      })
    );
  });
});
