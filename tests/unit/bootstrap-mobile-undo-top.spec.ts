import { describe, expect, it } from "vitest";

import { resolveMobileUndoTopButtonDisplayModel } from "../../src/bootstrap/mobile-undo-top";

describe("bootstrap mobile undo top", () => {
  it("hides button when viewport is not compact", () => {
    expect(
      resolveMobileUndoTopButtonDisplayModel({
        compactViewport: false,
        modeUndoCapable: true,
        canUndoNow: true
      })
    ).toEqual({
      shouldShow: false,
      buttonDisplay: "none",
      pointerEvents: "none",
      opacity: "0.45",
      ariaDisabled: "true",
      label: "撤回"
    });
  });

  it("hides button when mode does not support undo", () => {
    expect(
      resolveMobileUndoTopButtonDisplayModel({
        compactViewport: true,
        modeUndoCapable: false,
        canUndoNow: true
      })
    ).toEqual({
      shouldShow: false,
      buttonDisplay: "none",
      pointerEvents: "none",
      opacity: "0.45",
      ariaDisabled: "true",
      label: "撤回"
    });
  });

  it("shows enabled button when undo is available", () => {
    expect(
      resolveMobileUndoTopButtonDisplayModel({
        compactViewport: true,
        modeUndoCapable: true,
        canUndoNow: true
      })
    ).toEqual({
      shouldShow: true,
      buttonDisplay: "inline-flex",
      pointerEvents: "",
      opacity: "",
      ariaDisabled: "false",
      label: "撤回"
    });
  });

  it("shows disabled button when undo cannot be triggered", () => {
    expect(
      resolveMobileUndoTopButtonDisplayModel({
        compactViewport: true,
        modeUndoCapable: true,
        canUndoNow: false
      })
    ).toEqual({
      shouldShow: true,
      buttonDisplay: "inline-flex",
      pointerEvents: "none",
      opacity: "0.45",
      ariaDisabled: "true",
      label: "撤回"
    });
  });

  it("uses custom label when provided", () => {
    expect(
      resolveMobileUndoTopButtonDisplayModel({
        compactViewport: true,
        modeUndoCapable: true,
        canUndoNow: true,
        label: "Undo"
      })
    ).toEqual({
      shouldShow: true,
      buttonDisplay: "inline-flex",
      pointerEvents: "",
      opacity: "",
      ariaDisabled: "false",
      label: "Undo"
    });
  });
});
