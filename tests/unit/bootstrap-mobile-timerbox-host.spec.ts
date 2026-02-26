import { describe, expect, it, vi } from "vitest";

import { applyMobileTimerboxToggleInit } from "../../src/bootstrap/mobile-timerbox-host";

describe("bootstrap mobile timerbox host", () => {
  it("returns early when page scope is not mobile timerbox scope", () => {
    const result = applyMobileTimerboxToggleInit({
      isTimerboxMobileScope() {
        return false;
      }
    });

    expect(result).toEqual({
      isScope: false,
      hasToggle: false,
      hasTimerbox: false,
      didBindToggle: false,
      didRunSync: false
    });
  });

  it("returns element availability when toggle or timerbox is missing", () => {
    const result = applyMobileTimerboxToggleInit({
      isTimerboxMobileScope() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox") return { id: "timerbox" };
        return null;
      }
    });

    expect(result).toEqual({
      isScope: true,
      hasToggle: false,
      hasTimerbox: true,
      didBindToggle: false,
      didRunSync: false
    });
  });

  it("binds toggle click and applies startup sync chain", () => {
    const handlers: Record<string, (eventLike: unknown) => void> = {};
    const addEventListener = vi.fn((name: string, handler: (eventLike: unknown) => void) => {
      handlers[name] = handler;
    });
    const toggleBtn = {
      __mobileTimerboxBound: false,
      addEventListener
    };
    const timerBox = {
      classList: {
        contains(name: string) {
          return name === "is-mobile-expanded";
        }
      }
    };

    const syncMobileTimerboxUI = vi.fn();
    const requestResponsiveGameRelayout = vi.fn();
    const syncMobileTopActionsPlacement = vi.fn();
    const syncPracticeTopActionsPlacement = vi.fn();
    const syncMobileUndoTopButtonAvailability = vi.fn();

    const result = applyMobileTimerboxToggleInit({
      isTimerboxMobileScope() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox-toggle-btn") return toggleBtn;
        if (id === "timerbox") return timerBox;
        return null;
      },
      syncMobileTimerboxUI,
      requestResponsiveGameRelayout,
      syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability
    });

    expect(result).toEqual({
      isScope: true,
      hasToggle: true,
      hasTimerbox: true,
      didBindToggle: true,
      didRunSync: true
    });
    expect(toggleBtn.__mobileTimerboxBound).toBe(true);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(syncMobileTopActionsPlacement).toHaveBeenCalledTimes(1);
    expect(syncPracticeTopActionsPlacement).toHaveBeenCalledTimes(1);
    expect(syncMobileUndoTopButtonAvailability).toHaveBeenCalledTimes(1);
    expect(syncMobileTimerboxUI).toHaveBeenCalledTimes(1);
    expect(syncMobileTimerboxUI).toHaveBeenNthCalledWith(1);

    const preventDefault = vi.fn();
    handlers.click({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(syncMobileTimerboxUI).toHaveBeenNthCalledWith(2, {
      collapsed: true,
      persist: true
    });
    expect(requestResponsiveGameRelayout).toHaveBeenCalledTimes(1);
  });

  it("skips rebinding when toggle already has bound marker", () => {
    const addEventListener = vi.fn();
    const toggleBtn = {
      __mobileTimerboxBound: true,
      addEventListener
    };

    const result = applyMobileTimerboxToggleInit({
      isTimerboxMobileScope() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox-toggle-btn") return toggleBtn;
        if (id === "timerbox") return { classList: { contains: () => false } };
        return null;
      },
      syncMobileTimerboxUI: vi.fn()
    });

    expect(result.didBindToggle).toBe(false);
    expect(addEventListener).not.toHaveBeenCalled();
  });
});
