import { describe, expect, it, vi } from "vitest";

import { applyResponsiveRelayoutRequest } from "../../src/bootstrap/responsive-relayout-host";

describe("bootstrap responsive relayout host", () => {
  it("returns fallback result when runtime contract is missing", () => {
    const timer = { id: 1 };
    const result = applyResponsiveRelayoutRequest({
      responsiveRelayoutRuntime: {},
      existingTimer: timer,
      delayMs: 160
    });

    expect(result).toEqual({
      didRequest: false,
      shouldSchedule: false,
      shouldClearExistingTimer: false,
      didClearExistingTimer: false,
      didSchedule: false,
      timerRef: timer,
      delayMs: 160
    });
  });

  it("keeps current timer when relayout should not schedule", () => {
    const timer = { id: 2 };
    const resolveResponsiveRelayoutRequest = vi.fn(() => ({
      shouldSchedule: false,
      shouldClearExistingTimer: false,
      delayMs: 120
    }));
    const applyResponsiveRelayout = vi.fn();
    const scope = vi.fn(() => false);

    const result = applyResponsiveRelayoutRequest({
      responsiveRelayoutRuntime: {
        resolveResponsiveRelayoutRequest,
        applyResponsiveRelayout
      },
      isTimerboxMobileScope: scope,
      existingTimer: timer
    });

    expect(scope).toHaveBeenCalledTimes(1);
    expect(resolveResponsiveRelayoutRequest).toHaveBeenCalledWith({
      isTimerboxMobileScope: false,
      hasExistingTimer: true,
      delayMs: 120
    });
    expect(result).toEqual({
      didRequest: true,
      shouldSchedule: false,
      shouldClearExistingTimer: false,
      didClearExistingTimer: false,
      didSchedule: false,
      timerRef: timer,
      delayMs: 120
    });
    expect(applyResponsiveRelayout).not.toHaveBeenCalled();
  });

  it("clears existing timer, schedules new timer and applies relayout on callback", () => {
    const oldTimer = { id: "old" };
    const newTimer = { id: "new" };
    const clearTimeoutLike = vi.fn();
    let scheduledCallback: (() => void) | null = null;
    const setTimeoutLike = vi.fn((callback: () => void, _delay: number) => {
      scheduledCallback = callback;
      return newTimer;
    });
    const resolveResponsiveRelayoutRequest = vi.fn(() => ({
      shouldSchedule: true,
      shouldClearExistingTimer: true,
      delayMs: 220
    }));
    const applyResponsiveRelayout = vi.fn();
    const syncMobileHintUI = vi.fn();
    const syncMobileTopActionsPlacement = vi.fn();
    const syncPracticeTopActionsPlacement = vi.fn();
    const syncMobileUndoTopButtonAvailability = vi.fn();
    const syncMobileTimerboxUI = vi.fn();
    const manager = { key: "manager" };

    const result = applyResponsiveRelayoutRequest({
      responsiveRelayoutRuntime: {
        resolveResponsiveRelayoutRequest,
        applyResponsiveRelayout
      },
      isTimerboxMobileScope: true,
      existingTimer: oldTimer,
      clearTimeoutLike,
      setTimeoutLike,
      syncMobileHintUI,
      syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability,
      syncMobileTimerboxUI,
      manager
    });

    expect(clearTimeoutLike).toHaveBeenCalledTimes(1);
    expect(clearTimeoutLike).toHaveBeenCalledWith(oldTimer);
    expect(setTimeoutLike).toHaveBeenCalledTimes(1);
    expect(setTimeoutLike).toHaveBeenCalledWith(expect.any(Function), 220);
    expect(result).toEqual({
      didRequest: true,
      shouldSchedule: true,
      shouldClearExistingTimer: true,
      didClearExistingTimer: true,
      didSchedule: true,
      timerRef: newTimer,
      delayMs: 220
    });

    expect(scheduledCallback).not.toBeNull();
    if (scheduledCallback) {
      scheduledCallback();
    }
    expect(applyResponsiveRelayout).toHaveBeenCalledTimes(1);
    expect(applyResponsiveRelayout).toHaveBeenCalledWith({
      syncMobileHintUI,
      syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability,
      syncMobileTimerboxUI,
      manager
    });
  });
});
