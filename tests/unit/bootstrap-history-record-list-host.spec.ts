import { describe, expect, it, vi } from "vitest";

import { applyHistoryRecordListRender } from "../../src/bootstrap/history-record-list-host";

function createFakeButton() {
  const handlers: Record<string, () => void> = {};
  return {
    handlers,
    addEventListener(name: string, cb: () => void) {
      handlers[name] = cb;
    }
  };
}

function createFakeNode() {
  const replayBtn = createFakeButton();
  const exportBtn = createFakeButton();
  const deleteBtn = createFakeButton();

  const selectors: Record<string, unknown> = {
    ".history-replay-btn": replayBtn,
    ".history-export-btn": exportBtn,
    ".history-delete-btn": deleteBtn
  };

  return {
    className: "",
    innerHTML: "",
    replayBtn,
    exportBtn,
    deleteBtn,
    querySelector(selector: string) {
      return selectors[selector] || null;
    }
  };
}

describe("bootstrap history record list host", () => {
  it("renders empty state when list has no items", () => {
    const listElement = {
      innerHTML: "",
      appendChild: vi.fn()
    };

    const result = applyHistoryRecordListRender({
      listElement,
      result: { items: [] }
    });

    expect(result).toEqual({ hasItems: false, renderedCount: 0 });
    expect(listElement.innerHTML).toContain("暂无历史记录");
    expect(listElement.appendChild).not.toHaveBeenCalled();
  });

  it("renders record list and binds replay/export/delete actions", () => {
    const createdNodes: ReturnType<typeof createFakeNode>[] = [];
    const listElement = {
      innerHTML: "",
      appended: [] as unknown[],
      appendChild(node: unknown) {
        this.appended.push(node);
      }
    };
    const navigateToHref = vi.fn();
    const setStatus = vi.fn();
    const loadHistory = vi.fn();
    const applyHistoryRecordExportAction = vi.fn(() => true);
    const applyHistoryRecordDeleteAction = vi.fn(() => ({
      shouldSetStatus: true,
      statusText: "deleted",
      isError: false,
      shouldReload: true
    }));

    const result = applyHistoryRecordListRender({
      listElement,
      result: {
        items: [
          {
            id: "record-1",
            mode_key: "standard_4x4_pow2_no_undo",
            score: 256,
            best_tile: 32,
            duration_ms: 5000,
            ended_at: "2026-02-26T00:00:00.000Z",
            final_board: [[2]],
            board_width: 1,
            board_height: 1
          }
        ]
      },
      documentLike: {
        createElement() {
          const node = createFakeNode();
          createdNodes.push(node);
          return node;
        }
      },
      localHistoryStore: {},
      modeCatalog: {},
      historyAdapterHostRuntime: {
        resolveHistoryAdapterRecordRenderState: () => ({
          adapterBadgeHtml: "<span>badge</span>",
          adapterDiagnosticsHtml: "<div>diag</div>"
        })
      },
      historyAdapterDiagnosticsRuntime: {},
      historyRecordViewRuntime: {
        resolveHistoryCatalogModeLabel: () => "标准模式",
        resolveHistoryRecordHeadState: () => ({
          modeText: "标准模式",
          score: 256,
          bestTile: 32,
          durationText: "5s",
          endedText: "date"
        })
      },
      historyRecordItemRuntime: {
        resolveHistoryRecordItemHtml: () =>
          "<button class='history-replay-btn'></button><button class='history-export-btn'></button><button class='history-delete-btn'></button>"
      },
      historyRecordActionsRuntime: {},
      historyRecordHostRuntime: {
        resolveHistoryRecordReplayHref: () => "/replay.html?id=record-1",
        applyHistoryRecordExportAction,
        applyHistoryRecordDeleteAction
      },
      historyExportRuntime: {},
      boardToHtml: () => "<div class='board'></div>",
      confirmAction: () => true,
      setStatus,
      loadHistory,
      navigateToHref
    });

    expect(result).toEqual({ hasItems: true, renderedCount: 1 });
    expect(listElement.appended).toHaveLength(1);

    const firstNode = createdNodes[0];
    firstNode.replayBtn.handlers.click();
    expect(navigateToHref).toHaveBeenCalledWith("/replay.html?id=record-1");

    firstNode.exportBtn.handlers.click();
    expect(applyHistoryRecordExportAction).toHaveBeenCalledTimes(1);

    firstNode.deleteBtn.handlers.click();
    expect(applyHistoryRecordDeleteAction).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith("deleted", false);
    expect(loadHistory).toHaveBeenCalledWith(false);
  });
});
