import { describe, expect, it } from "vitest";

import {
  getTimerboxToggleIconSvg,
  persistMobileTimerboxCollapsed,
  resolveMobileTimerboxAppliedModel,
  resolveMobileTimerboxCollapsedValue,
  resolveMobileTimerboxDisplayModel,
  resolveStoredMobileTimerboxCollapsed
} from "../../src/bootstrap/mobile-timerbox";

describe("bootstrap mobile timerbox", () => {
  it("reads collapsed flag from storage with fallback", () => {
    expect(
      resolveStoredMobileTimerboxCollapsed({
        storageLike: {
          getItem() {
            return "0";
          }
        }
      })
    ).toBe(false);

    expect(
      resolveStoredMobileTimerboxCollapsed({
        storageLike: {
          getItem() {
            return "1";
          }
        }
      })
    ).toBe(true);

    expect(
      resolveStoredMobileTimerboxCollapsed({
        storageLike: {
          getItem() {
            return null;
          }
        }
      })
    ).toBe(true);
  });

  it("persists collapsed flag to storage safely", () => {
    const writes: Array<{ key: string; value: string }> = [];
    const ok = persistMobileTimerboxCollapsed({
      collapsed: false,
      storageLike: {
        setItem(key: string, value: string) {
          writes.push({ key, value });
        }
      }
    });
    expect(ok).toBe(true);
    expect(writes).toEqual([{ key: "ui_timerbox_collapsed_mobile_v1", value: "0" }]);
    expect(persistMobileTimerboxCollapsed({ collapsed: true, storageLike: null })).toBe(false);
  });

  it("returns different icons for collapsed and expanded state", () => {
    expect(getTimerboxToggleIconSvg(true)).toContain("6 9 12 15 18 9");
    expect(getTimerboxToggleIconSvg(false)).toContain("6 15 12 9 18 15");
  });

  it("hides toggle when timerbox is not collapsible", () => {
    expect(
      resolveMobileTimerboxDisplayModel({
        collapsible: false,
        timerModuleHidden: false,
        collapsed: false
      })
    ).toEqual({
      showToggle: false,
      toggleDisplay: "none",
      ariaExpanded: "false",
      label: "展开计时器",
      iconSvg: getTimerboxToggleIconSvg(true),
      expanded: false
    });
  });

  it("resolves display model for expanded and collapsed states", () => {
    expect(
      resolveMobileTimerboxDisplayModel({
        collapsible: true,
        timerModuleHidden: false,
        collapsed: true
      })
    ).toEqual({
      showToggle: true,
      toggleDisplay: "inline-flex",
      ariaExpanded: "false",
      label: "展开计时器",
      iconSvg: getTimerboxToggleIconSvg(true),
      expanded: false
    });

    expect(
      resolveMobileTimerboxDisplayModel({
        collapsible: true,
        timerModuleHidden: false,
        collapsed: false
      })
    ).toEqual({
      showToggle: true,
      toggleDisplay: "inline-flex",
      ariaExpanded: "true",
      label: "收起计时器",
      iconSvg: getTimerboxToggleIconSvg(false),
      expanded: true
    });
  });

  it("resolves collapsed value by option priority", () => {
    expect(
      resolveMobileTimerboxCollapsedValue({
        collapsedOption: false,
        storedCollapsed: true,
        defaultCollapsed: true
      })
    ).toBe(false);
    expect(
      resolveMobileTimerboxCollapsedValue({
        collapsedOption: null,
        storedCollapsed: false,
        defaultCollapsed: true
      })
    ).toBe(false);
    expect(resolveMobileTimerboxCollapsedValue({})).toBe(true);
  });

  it("resolves applied model with display fallback", () => {
    expect(
      resolveMobileTimerboxAppliedModel({
        displayModel: null,
        collapsed: true,
        fallbackToggleDisplay: "none",
        fallbackAriaExpanded: "false",
        fallbackLabel: "展开计时器",
        fallbackIconSvg: getTimerboxToggleIconSvg(true)
      })
    ).toEqual({
      showToggle: false,
      toggleDisplay: "none",
      ariaExpanded: "false",
      label: "展开计时器",
      iconSvg: getTimerboxToggleIconSvg(true),
      expanded: false
    });
  });
});
