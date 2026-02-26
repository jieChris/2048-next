import { describe, expect, it, vi } from "vitest";

import { applyMobileUndoTopAvailabilitySync } from "../../src/bootstrap/mobile-undo-top-availability-host";

describe("bootstrap mobile undo top availability host", () => {
  it("returns early when page scope is not game scope", () => {
    const result = applyMobileUndoTopAvailabilitySync({
      isGamePageScope() {
        return false;
      }
    });

    expect(result).toEqual({
      isScope: false,
      hasButton: false,
      compactViewport: false,
      modeUndoCapable: false,
      canUndoNow: false,
      didApply: false,
      didApplyLabel: false
    });
  });

  it("returns no button when ensure function fails", () => {
    const result = applyMobileUndoTopAvailabilitySync({
      isGamePageScope() {
        return true;
      },
      ensureMobileUndoTopButton() {
        return null;
      }
    });

    expect(result).toEqual({
      isScope: true,
      hasButton: false,
      compactViewport: false,
      modeUndoCapable: false,
      canUndoNow: false,
      didApply: false,
      didApplyLabel: false
    });
  });

  it("applies display state and label when should show", () => {
    const attrs: Record<string, string> = {};
    const button = {
      style: {
        display: "",
        pointerEvents: "",
        opacity: ""
      },
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      }
    };

    const resolveMobileUndoTopButtonDisplayModel = vi.fn(() => ({
      shouldShow: true,
      buttonDisplay: "inline-flex",
      pointerEvents: "",
      opacity: "",
      ariaDisabled: "false",
      label: "撤回"
    }));
    const resolveMobileUndoTopAppliedModel = vi.fn(() => ({
      shouldShow: true,
      buttonDisplay: "inline-flex",
      pointerEvents: "",
      opacity: "",
      ariaDisabled: "false",
      label: "撤回",
      shouldApplyLabel: true
    }));

    const result = applyMobileUndoTopAvailabilitySync({
      isGamePageScope() {
        return true;
      },
      ensureMobileUndoTopButton() {
        return button;
      },
      isCompactGameViewport() {
        return true;
      },
      manager: { id: "gm" },
      resolveUndoCapabilityState() {
        return { modeUndoCapable: true };
      },
      undoActionRuntime: {
        isUndoInteractionEnabled() {
          return true;
        }
      },
      mobileUndoTopRuntime: {
        resolveMobileUndoTopButtonDisplayModel,
        resolveMobileUndoTopAppliedModel
      }
    });

    expect(resolveMobileUndoTopButtonDisplayModel).toHaveBeenCalledWith({
      compactViewport: true,
      modeUndoCapable: true,
      canUndoNow: true,
      label: "撤回"
    });
    expect(resolveMobileUndoTopAppliedModel).toHaveBeenCalled();
    expect(button.style.display).toBe("inline-flex");
    expect(button.style.pointerEvents).toBe("");
    expect(button.style.opacity).toBe("");
    expect(attrs["aria-disabled"]).toBe("false");
    expect(attrs["aria-label"]).toBe("撤回");
    expect(attrs.title).toBe("撤回");
    expect(result.didApply).toBe(true);
    expect(result.didApplyLabel).toBe(true);
  });

  it("falls back to undo runtime context resolver when callback is missing", () => {
    const button = {
      style: {
        display: "",
        pointerEvents: "",
        opacity: ""
      },
      setAttribute() {}
    };
    const bodyLike = { tagName: "BODY" };
    const manager = { id: "gm" };
    const globalModeConfig = { key: "standard_4x4_pow2_no_undo" };
    const resolveUndoCapabilityFromContext = vi.fn(() => ({ modeUndoCapable: true }));

    const result = applyMobileUndoTopAvailabilitySync({
      isGamePageScope() {
        return true;
      },
      ensureMobileUndoTopButton() {
        return button;
      },
      isCompactGameViewport() {
        return false;
      },
      bodyLike,
      manager,
      globalModeConfig,
      undoActionRuntime: {
        resolveUndoCapabilityFromContext,
        isUndoInteractionEnabled() {
          return false;
        }
      },
      mobileUndoTopRuntime: {
        resolveMobileUndoTopButtonDisplayModel() {
          return {
            shouldShow: false,
            buttonDisplay: "none",
            pointerEvents: "none",
            opacity: "0.45",
            ariaDisabled: "true",
            label: "撤回"
          };
        },
        resolveMobileUndoTopAppliedModel() {
          return {
            shouldShow: false,
            buttonDisplay: "none",
            pointerEvents: "none",
            opacity: "0.45",
            ariaDisabled: "true",
            label: "撤回",
            shouldApplyLabel: false
          };
        }
      }
    });

    expect(resolveUndoCapabilityFromContext).toHaveBeenCalledWith({
      bodyLike,
      manager,
      globalModeConfig
    });
    expect(result.modeUndoCapable).toBe(true);
    expect(result.canUndoNow).toBe(false);
  });

  it("does not apply label when model requests hidden state", () => {
    const attrs: Record<string, string> = {};
    const button = {
      style: {
        display: "",
        pointerEvents: "",
        opacity: ""
      },
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      }
    };

    const result = applyMobileUndoTopAvailabilitySync({
      isGamePageScope() {
        return true;
      },
      ensureMobileUndoTopButton() {
        return button;
      },
      isCompactGameViewport() {
        return false;
      },
      resolveUndoCapabilityState() {
        return { modeUndoCapable: false };
      },
      undoActionRuntime: {
        isUndoInteractionEnabled() {
          return false;
        }
      },
      mobileUndoTopRuntime: {
        resolveMobileUndoTopButtonDisplayModel() {
          return {
            shouldShow: false,
            buttonDisplay: "none",
            pointerEvents: "none",
            opacity: "0.45",
            ariaDisabled: "true",
            label: "撤回"
          };
        },
        resolveMobileUndoTopAppliedModel() {
          return {
            shouldShow: false,
            buttonDisplay: "none",
            pointerEvents: "none",
            opacity: "0.45",
            ariaDisabled: "true",
            label: "撤回",
            shouldApplyLabel: false
          };
        }
      }
    });

    expect(button.style.display).toBe("none");
    expect(button.style.pointerEvents).toBe("none");
    expect(button.style.opacity).toBe("0.45");
    expect(attrs["aria-disabled"]).toBe("true");
    expect(attrs["aria-label"]).toBeUndefined();
    expect(attrs.title).toBeUndefined();
    expect(result.didApplyLabel).toBe(false);
  });
});
