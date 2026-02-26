import { describe, expect, it, vi } from "vitest";

import { applyTimerModuleSettingsPageInit } from "../../src/bootstrap/timer-module-settings-page-host";

describe("bootstrap timer module settings page host", () => {
  it("returns capability flags when host runtime apis are missing", () => {
    const result = applyTimerModuleSettingsPageInit({
      timerModuleSettingsHostRuntime: {}
    });

    expect(result).toEqual({
      hasEnsureToggleApi: false,
      hasApplyUiApi: false,
      hasToggle: false,
      hasNoteElement: false,
      didScheduleRetry: false,
      didBindToggle: false,
      didSync: false
    });
  });

  it("resolves toggle and delegates ui apply", () => {
    const toggle = { id: "timer-module-view-toggle" };
    const note = { id: "timer-module-view-note" };
    const ensureTimerModuleSettingsToggle = vi.fn(() => toggle);
    const applyTimerModuleSettingsUi = vi.fn(() => ({
      didScheduleRetry: false,
      didBindToggle: true,
      didSync: true
    }));

    const result = applyTimerModuleSettingsPageInit({
      timerModuleSettingsHostRuntime: {
        ensureTimerModuleSettingsToggle,
        applyTimerModuleSettingsUi
      },
      timerModuleRuntime: { id: "timer-runtime" },
      documentLike: {
        getElementById(id: string) {
          return id === "timer-module-view-note" ? note : null;
        }
      },
      windowLike: { id: "window" },
      retryDelayMs: 80,
      setTimeoutLike: vi.fn(),
      reinvokeInit: vi.fn(),
      syncMobileTimerboxUi: vi.fn()
    });

    expect(ensureTimerModuleSettingsToggle).toHaveBeenCalledWith({
      documentLike: expect.any(Object),
      timerModuleRuntime: { id: "timer-runtime" }
    });
    expect(applyTimerModuleSettingsUi).toHaveBeenCalledWith(
      expect.objectContaining({
        toggle,
        noteElement: note,
        retryDelayMs: 80,
        scheduleRetry: expect.any(Function)
      })
    );
    expect(result).toEqual({
      hasEnsureToggleApi: true,
      hasApplyUiApi: true,
      hasToggle: true,
      hasNoteElement: true,
      didScheduleRetry: false,
      didBindToggle: true,
      didSync: true
    });
  });

  it("wires retry scheduler to timeout and reinvoke callback", () => {
    const setTimeoutLike = vi.fn();
    const reinvokeInit = vi.fn();
    let scheduleRetry: ((delayMs: number) => void) | null = null;

    applyTimerModuleSettingsPageInit({
      timerModuleSettingsHostRuntime: {
        ensureTimerModuleSettingsToggle() {
          return { id: "timer-module-view-toggle" };
        },
        applyTimerModuleSettingsUi(payload: { scheduleRetry?: (delayMs: number) => void }) {
          scheduleRetry = payload.scheduleRetry || null;
          return {
            didScheduleRetry: true,
            didBindToggle: false,
            didSync: false
          };
        }
      },
      documentLike: {
        getElementById() {
          return null;
        }
      },
      retryDelayMs: 60,
      setTimeoutLike,
      reinvokeInit
    });

    expect(typeof scheduleRetry).toBe("function");
    scheduleRetry?.(120);
    scheduleRetry?.(-1);

    expect(setTimeoutLike).toHaveBeenNthCalledWith(1, reinvokeInit, 120);
    expect(setTimeoutLike).toHaveBeenNthCalledWith(2, reinvokeInit, 60);
  });
});
