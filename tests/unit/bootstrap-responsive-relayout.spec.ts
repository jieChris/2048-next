import { describe, expect, it, vi } from "vitest";

import {
  applyResponsiveRelayout,
  resolveResponsiveRelayoutRequest
} from "../../src/bootstrap/responsive-relayout";

describe("bootstrap responsive relayout", () => {
  it("skips scheduling when scope is disabled", () => {
    expect(
      resolveResponsiveRelayoutRequest({
        isTimerboxMobileScope: false,
        hasExistingTimer: true
      })
    ).toEqual({
      shouldSchedule: false,
      shouldClearExistingTimer: false,
      delayMs: 120
    });
  });

  it("schedules relayout and clears existing timer in scope", () => {
    expect(
      resolveResponsiveRelayoutRequest({
        isTimerboxMobileScope: true,
        hasExistingTimer: true,
        delayMs: 180
      })
    ).toEqual({
      shouldSchedule: true,
      shouldClearExistingTimer: true,
      delayMs: 180
    });
  });

  it("runs sync callbacks in order and refreshes manager visuals", () => {
    const marks: string[] = [];
    const manager = {
      actuator: {
        invalidateLayoutCache: vi.fn(() => marks.push("invalidate"))
      },
      clearTransientTileVisualState: vi.fn(() => marks.push("clear")),
      actuate: vi.fn(() => marks.push("actuate"))
    };

    const result = applyResponsiveRelayout({
      syncMobileHintUI: () => marks.push("hint"),
      syncMobileTopActionsPlacement: () => marks.push("top"),
      syncPracticeTopActionsPlacement: () => marks.push("practice"),
      syncMobileUndoTopButtonAvailability: () => marks.push("undo"),
      syncMobileTimerboxUI: () => marks.push("timer"),
      manager
    });

    expect(result).toEqual({
      ran: true,
      syncCallCount: 5,
      managerActuated: true
    });
    expect(marks).toEqual(["hint", "top", "practice", "undo", "timer", "invalidate", "clear", "actuate"]);
  });
});
