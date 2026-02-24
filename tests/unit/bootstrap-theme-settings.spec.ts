import { describe, expect, it } from "vitest";

import {
  formatThemePreviewValue,
  resolveThemeBindingState,
  resolveThemeDropdownToggleState,
  resolveThemeOptionSelectedState,
  resolveThemePreviewTileValues,
  resolveThemeSelectLabel
} from "../../src/bootstrap/theme-settings";

describe("bootstrap theme settings", () => {
  it("formats preview value in K units", () => {
    expect(formatThemePreviewValue(2048)).toBe("2K");
    expect(formatThemePreviewValue(1536)).toBe("1536");
  });

  it("resolves preview tile values with fallback", () => {
    expect(
      resolveThemePreviewTileValues({
        getTileValues() {
          return null;
        }
      })
    ).toEqual({
      pow2Values: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536],
      fibonacciValues: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]
    });
  });

  it("resolves select label by current theme id", () => {
    expect(
      resolveThemeSelectLabel({
        themes: [
          { id: "classic", label: "经典" },
          { id: "mint", label: "薄荷" }
        ],
        currentThemeId: "mint",
        fallbackLabel: "选择主题"
      })
    ).toBe("薄荷");
    expect(
      resolveThemeSelectLabel({
        themes: [],
        currentThemeId: "unknown",
        fallbackLabel: "选择主题"
      })
    ).toBe("选择主题");
  });

  it("resolves dropdown and binding state", () => {
    expect(
      resolveThemeDropdownToggleState({
        isOpen: false
      })
    ).toEqual({
      shouldOpen: true
    });
    expect(
      resolveThemeBindingState({
        alreadyBound: true
      })
    ).toEqual({
      shouldBind: false,
      boundValue: true
    });
  });

  it("resolves option selected state", () => {
    expect(
      resolveThemeOptionSelectedState({
        optionValue: "classic",
        currentThemeId: "classic"
      })
    ).toBe(true);
    expect(
      resolveThemeOptionSelectedState({
        optionValue: "mint",
        currentThemeId: "classic"
      })
    ).toBe(false);
  });
});
