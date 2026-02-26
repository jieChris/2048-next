import { describe, expect, it, vi } from "vitest";

import { applyMobileUndoTopInit } from "../../src/bootstrap/mobile-undo-top-host";

describe("bootstrap mobile undo top host", () => {
  it("returns early when page is out of scope", () => {
    const result = applyMobileUndoTopInit({
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
    const result = applyMobileUndoTopInit({
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
      __mobileUndoBound: false,
      addEventListener
    };
    const tryUndoFromUi = vi.fn();
    const syncMobileUndoTopButtonAvailability = vi.fn();

    const result = applyMobileUndoTopInit({
      isGamePageScope() {
        return true;
      },
      ensureMobileUndoTopButton() {
        return button;
      },
      tryUndoFromUi,
      syncMobileUndoTopButtonAvailability
    });

    expect(result).toEqual({
      isScope: true,
      hasButton: true,
      didBindButton: true,
      didRunSync: true
    });
    expect(button.__mobileUndoBound).toBe(true);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(syncMobileUndoTopButtonAvailability).toHaveBeenCalledTimes(1);

    const preventDefault = vi.fn();
    handlers.click({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(tryUndoFromUi).toHaveBeenCalledTimes(1);
  });

  it("does not rebind when marker exists", () => {
    const addEventListener = vi.fn();
    const button = {
      __mobileUndoBound: true,
      addEventListener
    };

    const result = applyMobileUndoTopInit({
      isGamePageScope() {
        return true;
      },
      ensureMobileUndoTopButton() {
        return button;
      },
      syncMobileUndoTopButtonAvailability: vi.fn()
    });

    expect(result.didBindButton).toBe(false);
    expect(addEventListener).not.toHaveBeenCalled();
  });
});
