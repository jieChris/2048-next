import { describe, expect, it } from "vitest";

import {
  buildTimerModuleSettingsRowInnerHtml,
  resolveTimerModuleAppliedViewMode,
  resolveTimerModuleBindingState,
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
    expect(
      resolveTimerModuleSettingsState({
        viewMode: "timer"
      })
    ).toEqual({
      toggleDisabled: false,
      toggleChecked: true,
      noteText: "关闭后仅隐藏右侧计时器栏，不影响棋盘和回放。"
    });

    expect(
      resolveTimerModuleSettingsState({
        viewMode: "hidden"
      })
    ).toEqual({
      toggleDisabled: false,
      toggleChecked: false,
      noteText: "关闭后仅隐藏右侧计时器栏，不影响棋盘和回放。"
    });
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
