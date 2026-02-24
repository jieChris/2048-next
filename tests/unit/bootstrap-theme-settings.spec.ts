import { describe, expect, it } from "vitest";

import {
  formatThemePreviewValue,
  resolveThemeBindingState,
  resolveThemeDropdownToggleState,
  resolveThemeOptions,
  resolveThemeOptionSelectedState,
  resolveThemePreviewCssSelectors,
  resolveThemePreviewLayout,
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

  it("resolves preview layout contract", () => {
    expect(resolveThemePreviewLayout()).toEqual({
      containerClassName: "theme-preview-dual-wrap",
      innerHtml:
        "<div class='theme-preview-grid-block'>" +
        "<div class='theme-preview-grid-title'>2幂</div>" +
        "<div id='theme-preview-grid-pow2' class='theme-preview-grid'></div>" +
        "</div>" +
        "<div class='theme-preview-grid-block'>" +
        "<div class='theme-preview-grid-title'>Fibonacci</div>" +
        "<div id='theme-preview-grid-fib' class='theme-preview-grid'></div>" +
        "</div>",
      pow2GridId: "theme-preview-grid-pow2",
      fibonacciGridId: "theme-preview-grid-fib",
      pow2Selector: "#theme-preview-grid-pow2",
      fibonacciSelector: "#theme-preview-grid-fib"
    });
  });

  it("resolves preview css selectors with layout-first fallback", () => {
    expect(
      resolveThemePreviewCssSelectors({
        previewLayout: resolveThemePreviewLayout()
      })
    ).toEqual({
      pow2Selector: "#theme-preview-grid-pow2",
      fibSelector: "#theme-preview-grid-fib"
    });
    expect(
      resolveThemePreviewCssSelectors({
        previewLayout: {
          containerClassName: "x",
          innerHtml: "",
          pow2GridId: "a",
          fibonacciGridId: "b",
          pow2Selector: "",
          fibonacciSelector: ""
        },
        fallbackPow2Selector: ".pow2-fallback",
        fallbackFibonacciSelector: ".fib-fallback"
      })
    ).toEqual({
      pow2Selector: ".pow2-fallback",
      fibSelector: ".fib-fallback"
    });
  });

  it("resolves theme options list by normalizing raw themes", () => {
    expect(
      resolveThemeOptions({
        themes: [
          { id: "classic", label: "经典" },
          { id: "mint", label: "" },
          { id: "", label: "空" },
          { id: "dark" } as any,
          null as any
        ]
      })
    ).toEqual([
      { id: "classic", label: "经典" },
      { id: "mint", label: "mint" },
      { id: "dark", label: "dark" }
    ]);
  });
});
