import { describe, expect, it } from "vitest";

import { resolvePlayChallengeIntroActionState } from "../../src/bootstrap/play-challenge-intro-action";

describe("bootstrap play challenge intro action", () => {
  it("returns open action state", () => {
    expect(resolvePlayChallengeIntroActionState({ action: "open" })).toEqual({
      shouldPreventDefault: true,
      shouldApplyDisplay: true,
      nextModalDisplay: "flex"
    });
  });

  it("returns close action state", () => {
    expect(resolvePlayChallengeIntroActionState({ action: "close" })).toEqual({
      shouldPreventDefault: true,
      shouldApplyDisplay: true,
      nextModalDisplay: "none"
    });
  });

  it("returns overlay close state when target is modal", () => {
    expect(
      resolvePlayChallengeIntroActionState({
        action: "overlay-click",
        eventTargetIsModal: true
      })
    ).toEqual({
      shouldPreventDefault: false,
      shouldApplyDisplay: true,
      nextModalDisplay: "none"
    });
  });

  it("ignores overlay click when target is not modal", () => {
    expect(
      resolvePlayChallengeIntroActionState({
        action: "overlay-click",
        eventTargetIsModal: false
      })
    ).toEqual({
      shouldPreventDefault: false,
      shouldApplyDisplay: false,
      nextModalDisplay: "none"
    });
  });
});
