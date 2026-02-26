import { describe, expect, it, vi } from "vitest";

import { bindHistoryImportControls } from "../../src/bootstrap/history-import-bind-host";

function createFakeElement() {
  const handlers: Record<string, (event?: unknown) => void> = {};
  return {
    handlers,
    value: "",
    files: null as unknown,
    addEventListener: (name: string, cb: (event?: unknown) => void) => {
      handlers[name] = cb;
    }
  };
}

describe("bootstrap history import bind host", () => {
  it("binds import controls and delegates import read orchestration", () => {
    const importBtn = createFakeElement();
    const replaceBtn = createFakeElement();
    const importInput = createFakeElement();
    const clickSpy = vi.fn();
    (importInput as unknown as { click: () => void }).click = clickSpy;
    importInput.files = [{ name: "history.json" }];

    const setStatus = vi.fn();
    const loadHistory = vi.fn();

    const result = bindHistoryImportControls({
      getElementById: (id: string) => {
        if (id === "history-import-btn") return importBtn;
        if (id === "history-import-replace-btn") return replaceBtn;
        if (id === "history-import-file") return importInput;
        return null;
      },
      localHistoryStore: {},
      historyImportRuntime: {},
      historyImportFileRuntime: {},
      historyImportHostRuntime: {
        resolveHistoryImportMergeClickState: () => ({
          nextMode: "merge",
          shouldOpenFilePicker: true
        }),
        resolveHistoryImportReplaceClickState: () => ({
          nextMode: "replace",
          shouldOpenFilePicker: true
        }),
        resolveHistoryImportFileSelectionState: () => ({
          file: { name: "history.json" },
          shouldRead: true,
          encoding: "utf-8",
          resetValue: ""
        }),
        applyHistoryImportFromFileReadResult: () => ({
          shouldSetStatus: true,
          statusText: "imported",
          isError: false,
          shouldReload: true
        }),
        resolveHistoryImportReadFailureState: () => ({
          shouldSetStatus: true,
          statusText: "read error",
          isError: true,
          shouldReload: false
        })
      },
      confirmAction: () => true,
      createFileReader: () => ({
        result: null,
        onload: null as null | (() => void),
        onerror: null as null | (() => void),
        readAsText(file: unknown) {
          this.result = JSON.stringify(file);
          if (typeof this.onload === "function") this.onload();
        }
      }),
      setStatus,
      loadHistory
    });

    expect(result).toEqual({ didBind: true, boundControlCount: 3 });

    importBtn.handlers.click();
    replaceBtn.handlers.click();
    expect(clickSpy).toHaveBeenCalledTimes(2);

    importInput.handlers.change();
    expect(setStatus).toHaveBeenCalledWith("imported", false);
    expect(loadHistory).toHaveBeenCalledWith(true);
    expect(importInput.value).toBe("");
  });

  it("returns noop when required binding dependencies are missing", () => {
    expect(bindHistoryImportControls({})).toEqual({
      didBind: false,
      boundControlCount: 0
    });
  });
});
