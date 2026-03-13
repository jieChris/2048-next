import { describe, expect, it } from "vitest";

import {
  buildTimerModuleSettingsRowInnerHtml,
  resolveTimerModuleAppliedViewMode,
  resolveTimerModuleBindingState,
  resolveTimerModuleCurrentViewMode,
  resolveTimerModuleInitRetryState,
  resolveTimerModuleSettingsState,
  resolveTimerModuleViewMode
} from "../../src/bootstrap/timer-module";

describe("bootstrap timer module", () => {
  it("builds settings row template", () => {
    const html = buildTimerModuleSettingsRowInnerHtml();
    expect(html).toContain("timer-module-view-toggle");
    expect(html).toContain("timer-module-view-note");
  });

  it("resolves settings state from view mode", () => {
    const timerState = resolveTimerModuleSettingsState({
      viewMode: "timer"
    });
    expect(timerState).toEqual(
      expect.objectContaining({
        toggleDisabled: false,
        toggleChecked: true,
        rowVisible: true
      })
    );
    expect(typeof timerState.toggleLabelText).toBe("string");
    expect(typeof timerState.noteText).toBe("string");

    const hiddenState = resolveTimerModuleSettingsState({
      viewMode: "hidden"
    });
    expect(hiddenState).toEqual(
      expect.objectContaining({
        toggleDisabled: false,
        toggleChecked: false,
        rowVisible: true
      })
    );
    expect(typeof hiddenState.toggleLabelText).toBe("string");
    expect(typeof hiddenState.noteText).toBe("string");
  });

  it("resolves binding state for dedup", () => {
    expect(
      resolveTimerModuleBindingState({
        alreadyBound: false
      })
    ).toEqual({
      shouldBind: true,
      boundValue: true
    });
    expect(
      resolveTimerModuleBindingState({
        alreadyBound: true
      })
    ).toEqual({
      shouldBind: false,
      boundValue: true
    });
  });

  it("resolves current view mode from manager with safe fallback", () => {
    expect(
      resolveTimerModuleCurrentViewMode({
        manager: {
          getTimerModuleViewMode() {
            return "hidden";
          }
        }
      })
    ).toBe("hidden");
    expect(
      resolveTimerModuleCurrentViewMode({
        manager: {
          getTimerModuleViewMode() {
            return "invalid";
          }
        },
        fallbackViewMode: "timer"
      })
    ).toBe("timer");
    expect(
      resolveTimerModuleCurrentViewMode({
        manager: null,
        fallbackViewMode: "hidden"
      })
    ).toBe("hidden");
  });

  it("resolves next view mode from toggle checked", () => {
    expect(
      resolveTimerModuleViewMode({
        checked: true
      })
    ).toEqual({
      viewMode: "timer"
    });
    expect(
      resolveTimerModuleViewMode({
        checked: false
      })
    ).toEqual({
      viewMode: "hidden"
    });
  });

  it("resolves applied view mode with runtime result fallback", () => {
    expect(
      resolveTimerModuleAppliedViewMode({
        nextViewMode: { viewMode: "timer" },
        checked: false
      })
    ).toBe("timer");
    expect(
      resolveTimerModuleAppliedViewMode({
        nextViewMode: null,
        checked: false
      })
    ).toBe("hidden");
  });

  it("resolves init retry state for delayed manager availability", () => {
    expect(
      resolveTimerModuleInitRetryState({
        hasToggle: true,
        hasManager: false,
        retryDelayMs: 60
      })
    ).toEqual({
      shouldRetry: true,
      retryDelayMs: 60
    });
    expect(
      resolveTimerModuleInitRetryState({
        hasToggle: false,
        hasManager: false
      })
    ).toEqual({
      shouldRetry: false,
      retryDelayMs: 60
    });
  });
});
