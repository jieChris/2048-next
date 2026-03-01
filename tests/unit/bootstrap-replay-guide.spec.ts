import { describe, expect, it, vi } from "vitest";

import {
  markReplayGuideSeenFromContext,
  readReplayGuideSeenFromContext,
  shouldShowReplayGuideFromContext
} from "../../src/bootstrap/replay-guide";

describe("bootstrap replay guide", () => {
  it("reads seen flag from local storage safely", () => {
    const getItem = vi.fn(() => "true");
    const value = readReplayGuideSeenFromContext({
      windowLike: {
        localStorage: {
          getItem
        }
      },
      key: "replay_guide_shown_v1"
    });

    expect(getItem).toHaveBeenCalledWith("replay_guide_shown_v1");
    expect(value).toBe("true");
  });

  it("falls back to show guide when storage key is absent", () => {
    const result = shouldShowReplayGuideFromContext({
      windowLike: {
        localStorage: {
          getItem: () => null
        }
      },
      key: "replay_guide_shown_v1",
      seenValue: "true"
    });
    expect(result).toBe(true);
  });

  it("hides guide when seen value matches", () => {
    const result = shouldShowReplayGuideFromContext({
      windowLike: {
        localStorage: {
          getItem: () => "true"
        }
      },
      key: "replay_guide_shown_v1",
      seenValue: "true"
    });
    expect(result).toBe(false);
  });

  it("marks guide as seen via storage context", () => {
    const setItem = vi.fn();
    const result = markReplayGuideSeenFromContext({
      windowLike: {
        localStorage: {
          setItem
        }
      },
      key: "replay_guide_shown_v1",
      seenValue: "true"
    });

    expect(setItem).toHaveBeenCalledWith("replay_guide_shown_v1", "true");
    expect(result).toBe(true);
  });

  it("returns false when storage is unavailable", () => {
    const result = markReplayGuideSeenFromContext({
      windowLike: null,
      key: "replay_guide_shown_v1"
    });
    expect(result).toBe(false);
  });
});
