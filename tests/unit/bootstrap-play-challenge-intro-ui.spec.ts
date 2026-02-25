import { describe, expect, it } from "vitest";

import { resolvePlayChallengeIntroUiState } from "../../src/bootstrap/play-challenge-intro-ui";

describe("bootstrap play challenge intro ui", () => {
  it("normalizes display and text fields", () => {
    expect(
      resolvePlayChallengeIntroUiState({
        introModel: {
          entryDisplay: "inline-flex",
          modalDisplay: "flex",
          title: "标题",
          description: "描述",
          leaderboardText: "榜单文案",
          bindEvents: true
        }
      })
    ).toEqual({
      entryDisplay: "inline-flex",
      modalDisplay: "flex",
      titleText: "标题",
      descriptionText: "描述",
      leaderboardText: "榜单文案",
      bindIntroClick: true,
      bindCloseClick: true,
      bindOverlayClick: true
    });
  });

  it("falls back to hidden defaults when model fields are invalid", () => {
    expect(
      resolvePlayChallengeIntroUiState({
        introModel: {
          entryDisplay: "block",
          modalDisplay: "block",
          bindEvents: false
        }
      })
    ).toEqual({
      entryDisplay: "none",
      modalDisplay: "none",
      titleText: "",
      descriptionText: "",
      leaderboardText: "",
      bindIntroClick: false,
      bindCloseClick: false,
      bindOverlayClick: false
    });
  });

  it("skips binding for nodes that are already bound", () => {
    const uiState = resolvePlayChallengeIntroUiState({
      introModel: {
        bindEvents: true
      },
      introButtonBound: true,
      closeButtonBound: false,
      modalBound: true
    });

    expect(uiState.bindIntroClick).toBe(false);
    expect(uiState.bindCloseClick).toBe(true);
    expect(uiState.bindOverlayClick).toBe(false);
  });
});
