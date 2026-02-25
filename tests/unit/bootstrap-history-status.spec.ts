import { describe, expect, it } from "vitest";

import { resolveHistoryStatusDisplayState } from "../../src/bootstrap/history-status";

describe("bootstrap history status", () => {
  it("resolves default status text and color", () => {
    expect(resolveHistoryStatusDisplayState({})).toEqual({
      text: "",
      color: "#4a4a4a"
    });
  });

  it("resolves error status color", () => {
    expect(resolveHistoryStatusDisplayState({ text: "导入失败", isError: true })).toEqual({
      text: "导入失败",
      color: "#c0392b"
    });
  });

  it("normalizes invalid text input", () => {
    expect(resolveHistoryStatusDisplayState({ text: 123, isError: false })).toEqual({
      text: "",
      color: "#4a4a4a"
    });
  });
});
