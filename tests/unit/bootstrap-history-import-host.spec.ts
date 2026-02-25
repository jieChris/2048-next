import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryImportFromFileReadResult,
  resolveHistoryImportFileSelectionState,
  resolveHistoryImportMergeClickState,
  resolveHistoryImportReadFailureState,
  resolveHistoryImportReplaceClickState
} from "../../src/bootstrap/history-import-host";

describe("bootstrap history import host", () => {
  it("resolves merge click state from import runtime", () => {
    const state = resolveHistoryImportMergeClickState({
      currentMode: "replace",
      historyImportRuntime: {
        resolveHistoryImportActionState: () => ({ mode: "merge" })
      }
    });

    expect(state).toEqual({
      nextMode: "merge",
      shouldOpenFilePicker: true
    });
  });

  it("resolves replace click state and respects confirm flow", () => {
    const confirmAction = vi.fn(() => false);
    const rejected = resolveHistoryImportReplaceClickState({
      currentMode: "merge",
      confirmAction,
      historyImportRuntime: {
        resolveHistoryImportActionState: () => ({
          mode: "replace",
          requiresConfirm: true,
          confirmMessage: "确认替换?"
        })
      }
    });

    expect(rejected).toEqual({
      nextMode: "merge",
      shouldOpenFilePicker: false
    });
    expect(confirmAction).toHaveBeenCalledWith("确认替换?");

    const accepted = resolveHistoryImportReplaceClickState({
      currentMode: "merge",
      confirmAction: () => true,
      historyImportRuntime: {
        resolveHistoryImportActionState: () => ({
          mode: "replace",
          requiresConfirm: true,
          confirmMessage: "确认替换?"
        })
      }
    });
    expect(accepted).toEqual({
      nextMode: "replace",
      shouldOpenFilePicker: true
    });
  });

  it("resolves file selection state with encoding and reset value", () => {
    const fakeFile = { name: "history.json" };
    const state = resolveHistoryImportFileSelectionState({
      files: { 0: fakeFile },
      historyImportFileRuntime: {
        resolveHistoryImportSelectedFile: () => fakeFile,
        resolveHistoryImportReadEncoding: () => "utf-8",
        resolveHistoryImportInputResetValue: () => ""
      }
    });

    expect(state).toEqual({
      file: fakeFile,
      shouldRead: true,
      encoding: "utf-8",
      resetValue: ""
    });
  });

  it("applies import result and returns success or error status", () => {
    const success = applyHistoryImportFromFileReadResult({
      readerResult: '[{"id":"1"}]',
      importMode: "merge",
      localHistoryStore: { id: "store" },
      historyImportRuntime: {
        executeHistoryImport: () => ({ ok: true, notice: "导入成功" }),
        resolveHistoryImportErrorNotice: () => "导入失败"
      },
      historyImportFileRuntime: {
        resolveHistoryImportPayloadText: (value: unknown) => String(value)
      }
    });
    expect(success).toEqual({
      shouldSetStatus: true,
      statusText: "导入成功",
      isError: false,
      shouldReload: true
    });

    const failed = applyHistoryImportFromFileReadResult({
      readerResult: "bad",
      importMode: "replace",
      localHistoryStore: { id: "store" },
      historyImportRuntime: {
        executeHistoryImport: () => ({ ok: false, notice: "导入失败" }),
        resolveHistoryImportErrorNotice: () => "兜底失败"
      },
      historyImportFileRuntime: {
        resolveHistoryImportPayloadText: () => {
          throw new Error("bad");
        }
      }
    });
    expect(failed).toEqual({
      shouldSetStatus: true,
      statusText: "兜底失败",
      isError: true,
      shouldReload: false
    });
  });

  it("resolves read failure status notice", () => {
    const state = resolveHistoryImportReadFailureState({
      historyImportRuntime: {
        resolveHistoryImportReadErrorNotice: () => "读取失败"
      }
    });
    expect(state).toEqual({
      shouldSetStatus: true,
      statusText: "读取失败",
      isError: true,
      shouldReload: false
    });
  });
});
