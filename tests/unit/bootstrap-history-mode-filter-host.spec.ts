import { describe, expect, it } from "vitest";

import { applyHistoryModeFilterOptionsRender } from "../../src/bootstrap/history-mode-filter-host";

describe("bootstrap history mode filter host", () => {
  it("renders options from mode catalog into mode select", () => {
    const appended: Array<{ value: string; textContent: string }> = [];
    const selectElement = {
      appendChild(node: { value: string; textContent: string }) {
        appended.push(node);
      }
    };
    const documentLike = {
      createElement(tagName: string) {
        if (tagName !== "option") throw new Error("unexpected tag");
        return {
          value: "",
          textContent: ""
        };
      }
    };

    const result = applyHistoryModeFilterOptionsRender({
      selectElement,
      modeCatalog: {
        listModes: () => [
          { key: "standard_4x4_pow2_no_undo", label: "标准版 4x4（无撤回）" },
          { key: "fibo_4x4_undo", label: "Fibonacci 4x4（可撤回）" }
        ]
      },
      historyModeFilterRuntime: {
        resolveHistoryModeFilterOptions: (modes: unknown) =>
          Array.isArray(modes)
            ? modes.map((mode) => ({
                value: String((mode as { key: string }).key),
                label: String((mode as { label: string }).label)
              }))
            : []
      },
      documentLike
    });

    expect(result).toEqual({
      didRender: true,
      renderedOptionCount: 2
    });
    expect(appended).toEqual([
      { value: "standard_4x4_pow2_no_undo", textContent: "标准版 4x4（无撤回）" },
      { value: "fibo_4x4_undo", textContent: "Fibonacci 4x4（可撤回）" }
    ]);
  });

  it("returns noop result when required dependencies are missing", () => {
    expect(applyHistoryModeFilterOptionsRender({})).toEqual({
      didRender: false,
      renderedOptionCount: 0
    });
  });
});
