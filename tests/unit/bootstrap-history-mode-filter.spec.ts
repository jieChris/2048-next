import { describe, expect, it } from "vitest";

import { resolveHistoryModeFilterOptions } from "../../src/bootstrap/history-mode-filter";

describe("bootstrap history mode filter", () => {
  it("maps mode catalog items to select options", () => {
    expect(
      resolveHistoryModeFilterOptions([
        { key: "standard_4x4_pow2_no_undo", label: "标准 4x4" },
        { key: "fibo_4x4", label: "Fibonacci 4x4" }
      ])
    ).toEqual([
      { value: "standard_4x4_pow2_no_undo", label: "标准 4x4" },
      { value: "fibo_4x4", label: "Fibonacci 4x4" }
    ]);
  });

  it("drops invalid mode entries", () => {
    expect(
      resolveHistoryModeFilterOptions([
        null,
        { key: "", label: "bad" },
        { key: "k1", label: "" },
        { key: "ok", label: "OK" }
      ])
    ).toEqual([{ value: "ok", label: "OK" }]);
  });

  it("returns empty list for non-array input", () => {
    expect(resolveHistoryModeFilterOptions(null)).toEqual([]);
    expect(resolveHistoryModeFilterOptions({})).toEqual([]);
  });
});
