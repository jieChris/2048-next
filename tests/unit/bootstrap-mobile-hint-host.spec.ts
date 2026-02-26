import { describe, expect, it, vi } from "vitest";

import { applyMobileHintToggleInit } from "../../src/bootstrap/mobile-hint-host";

describe("bootstrap mobile hint host", () => {
  it("returns early when page scope is not game scope", () => {
    const result = applyMobileHintToggleInit({
      isGamePageScope() {
        return false;
      }
    });

    expect(result).toEqual({
      isScope: false,
      hasButton: false,
      didBindButton: false,
      didRunSync: false
    });
  });

  it("returns no button when ensure function fails", () => {
    const result = applyMobileHintToggleInit({
      isGamePageScope() {
        return true;
      },
      ensureMobileHintToggleButton() {
        return null;
      }
    });

    expect(result).toEqual({
      isScope: true,
      hasButton: false,
      didBindButton: false,
      didRunSync: false
    });
  });

  it("binds click handler and runs initial sync", () => {
    const handlers: Record<string, (eventLike: unknown) => void> = {};
    const addEventListener = vi.fn((name: string, handler: (eventLike: unknown) => void) => {
      handlers[name] = handler;
    });
    const button = {
      __mobileHintBound: false,
      addEventListener
    };
    const openMobileHintModal = vi.fn();
    const syncMobileHintUI = vi.fn();

    const result = applyMobileHintToggleInit({
      isGamePageScope() {
        return true;
      },
      ensureMobileHintToggleButton() {
        return button;
      },
      openMobileHintModal,
      syncMobileHintUI
    });

    expect(result).toEqual({
      isScope: true,
      hasButton: true,
      didBindButton: true,
      didRunSync: true
    });
    expect(button.__mobileHintBound).toBe(true);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(syncMobileHintUI).toHaveBeenCalledTimes(1);

    const preventDefault = vi.fn();
    handlers.click({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openMobileHintModal).toHaveBeenCalledTimes(1);
  });

  it("does not rebind when marker exists", () => {
    const addEventListener = vi.fn();
    const button = {
      __mobileHintBound: true,
      addEventListener
    };

    const result = applyMobileHintToggleInit({
      isGamePageScope() {
        return true;
      },
      ensureMobileHintToggleButton() {
        return button;
      },
      syncMobileHintUI: vi.fn()
    });

    expect(result.didBindButton).toBe(false);
    expect(addEventListener).not.toHaveBeenCalled();
  });
});
