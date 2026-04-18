import { describe, expect, it, vi } from "vitest";

import {
  applyHomeGuideHighlightClear,
  applyHomeGuideTargetElevation
} from "../../src/bootstrap/home-guide-highlight-host";

function createNode() {
  return {
    classList: {
      add: vi.fn(),
      remove: vi.fn()
    }
  };
}

describe("bootstrap home guide highlight host", () => {
  it("clears target/scoped/elevated classes and resets state", () => {
    const target = createNode();
    const scopedA = createNode();
    const scopedB = createNode();
    const elevatedA = createNode();
    const elevatedB = createNode();
    const homeGuideState: Record<string, unknown> = {
      target,
      elevated: [elevatedA, elevatedB]
    };

    const result = applyHomeGuideHighlightClear({
      documentLike: {
        querySelectorAll() {
          return [scopedA, scopedB];
        }
      },
      homeGuideState
    });

    expect(result).toEqual({
      clearedScopedCount: 2,
      clearedElevatedCount: 2,
      hadTarget: true
    });
    expect(target.classList.remove).toHaveBeenCalledWith("home-guide-highlight");
    expect(scopedA.classList.remove).toHaveBeenCalledWith("home-guide-scope");
    expect(scopedB.classList.remove).toHaveBeenCalledWith("home-guide-scope");
    expect(elevatedA.classList.remove).toHaveBeenCalledWith("home-guide-elevated");
    expect(elevatedB.classList.remove).toHaveBeenCalledWith("home-guide-elevated");
    expect(homeGuideState.target).toBeNull();
    expect(homeGuideState.elevated).toEqual([]);
  });

  it("skips host elevation when the plan keeps focus on the target only", () => {
    const topActionButtons = createNode();
    const headingHost = createNode();
    const target = {
      closest(selector: string) {
        if (selector === ".top-action-buttons") return topActionButtons;
        if (selector === ".heading") return headingHost;
        return null;
      }
    };
    const homeGuideState: Record<string, unknown> = {};

    const result = applyHomeGuideTargetElevation({
      target,
      homeGuideState,
      homeGuideRuntime: {
        resolveHomeGuideElevationPlan() {
          return {
            hostSelector: "",
            shouldScopeTopActions: false
          };
        }
      }
    });

    expect(result).toEqual({
      didElevateHost: false,
      didScopeTopActions: false
    });
    expect(topActionButtons.classList.add).not.toHaveBeenCalled();
    expect(headingHost.classList.add).not.toHaveBeenCalled();
    expect(homeGuideState.elevated).toEqual([]);
  });

  it("returns noop when target closest or elevation resolver is missing", () => {
    expect(applyHomeGuideTargetElevation({ target: {}, homeGuideRuntime: {} })).toEqual({
      didElevateHost: false,
      didScopeTopActions: false
    });
  });
});
