import { describe, expect, it, vi } from "vitest";

import { createTopActionsPageResolvers } from "../../src/bootstrap/top-actions-page-host";

describe("bootstrap top actions page host", () => {
  it("creates page resolvers and reuses placement state across sync calls", () => {
    const gameState = { id: "game-state" };
    const practiceState = { id: "practice-state" };
    const applyGameTopActionsPlacementSync = vi.fn((payload: any) => ({
      mobileTopActionsState: payload.mobileTopActionsState || gameState
    }));
    const applyPracticeTopActionsPlacementSync = vi.fn((payload: any) => ({
      practiceTopActionsState: payload.practiceTopActionsState || practiceState
    }));
    let compact = true;

    const resolvers = createTopActionsPageResolvers({
      topActionsRuntime: { id: "runtime" },
      topActionsHostRuntime: {
        applyGameTopActionsPlacementSync,
        applyPracticeTopActionsPlacementSync
      },
      documentLike: {
        querySelector: vi.fn(),
        getElementById: vi.fn(),
        createComment: vi.fn()
      },
      isGamePageScope: () => true,
      isPracticePageScope: () => false,
      isCompactGameViewport: () => {
        const next = compact;
        compact = false;
        return next;
      }
    });

    resolvers.syncMobileTopActionsPlacement();
    resolvers.syncMobileTopActionsPlacement();
    resolvers.syncPracticeTopActionsPlacement();
    resolvers.syncPracticeTopActionsPlacement();

    expect(applyGameTopActionsPlacementSync).toHaveBeenCalledTimes(2);
    expect(applyGameTopActionsPlacementSync.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        mobileTopActionsState: null,
        compactViewport: true
      })
    );
    expect(applyGameTopActionsPlacementSync.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        mobileTopActionsState: gameState,
        compactViewport: false
      })
    );

    expect(applyPracticeTopActionsPlacementSync).toHaveBeenCalledTimes(2);
    expect(applyPracticeTopActionsPlacementSync.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        practiceTopActionsState: null
      })
    );
    expect(applyPracticeTopActionsPlacementSync.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        practiceTopActionsState: practiceState
      })
    );
  });

  it("returns null when host runtime apis are missing", () => {
    const resolvers = createTopActionsPageResolvers({
      topActionsRuntime: {},
      topActionsHostRuntime: {}
    });

    expect(resolvers.syncMobileTopActionsPlacement()).toBeNull();
    expect(resolvers.syncPracticeTopActionsPlacement()).toBeNull();
  });
});
