import { describe, expect, it } from "vitest";

import {
  resolveHistoryImportInputResetValue,
  resolveHistoryImportPayloadText,
  resolveHistoryImportReadEncoding,
  resolveHistoryImportSelectedFile
} from "../../src/bootstrap/history-import-file";

describe("bootstrap history import file", () => {
  it("selects first file from array or file-list like objects", () => {
    const fileA = { name: "a.json" };
    const fileB = { name: "b.json" };

    expect(resolveHistoryImportSelectedFile([fileA, fileB])).toBe(fileA);
    expect(resolveHistoryImportSelectedFile({
      item(index: number) {
        return index === 0 ? fileA : null;
      }
    })).toBe(fileA);
    expect(resolveHistoryImportSelectedFile({ length: 1, 0: fileA })).toBe(fileA);
  });

  it("returns null for empty or invalid file sources", () => {
    expect(resolveHistoryImportSelectedFile([])).toBeNull();
    expect(resolveHistoryImportSelectedFile({ item: () => null })).toBeNull();
    expect(resolveHistoryImportSelectedFile({ length: 0 })).toBeNull();
    expect(resolveHistoryImportSelectedFile(null)).toBeNull();
  });

  it("normalizes payload text and constants", () => {
    expect(resolveHistoryImportPayloadText("{\"ok\":true}")).toBe("{\"ok\":true}");
    expect(resolveHistoryImportPayloadText(0)).toBe("");
    expect(resolveHistoryImportPayloadText(false)).toBe("");
    expect(resolveHistoryImportReadEncoding()).toBe("utf-8");
    expect(resolveHistoryImportInputResetValue()).toBe("");
  });
});
