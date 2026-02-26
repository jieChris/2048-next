function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function bindListener(
  element: unknown,
  eventName: string,
  handler: (...args: never[]) => unknown
): boolean {
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    toRecord(element).addEventListener
  );
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler);
  return true;
}

function queryNode(node: unknown, selector: string): unknown {
  const querySelector = asFunction<(value: string) => unknown>(toRecord(node).querySelector);
  if (!querySelector) return null;
  return (querySelector as unknown as Function).call(node, selector);
}

function readItemField(item: unknown, key: string): unknown {
  return toRecord(item)[key];
}

export interface HistoryRecordListRenderResult {
  hasItems: boolean;
  renderedCount: number;
}

export function applyHistoryRecordListRender(input: {
  listElement?: unknown;
  result?: unknown;
  documentLike?: unknown;
  localHistoryStore?: unknown;
  modeCatalog?: unknown;
  historyAdapterHostRuntime?: unknown;
  historyAdapterDiagnosticsRuntime?: unknown;
  historyRecordViewRuntime?: unknown;
  historyRecordItemRuntime?: unknown;
  historyRecordActionsRuntime?: unknown;
  historyRecordHostRuntime?: unknown;
  historyExportRuntime?: unknown;
  boardToHtml?: unknown;
  confirmAction?: unknown;
  setStatus?: unknown;
  loadHistory?: unknown;
  navigateToHref?: unknown;
}): HistoryRecordListRenderResult {
  const source = toRecord(input);
  const listElement = toRecord(source.listElement);
  if (!("innerHTML" in listElement)) {
    return {
      hasItems: false,
      renderedCount: 0
    };
  }

  listElement.innerHTML = "";
  const items = toArray(toRecord(source.result).items);
  if (!items.length) {
    listElement.innerHTML =
      "<div class='history-item'>暂无历史记录。你可以开始一局游戏后再回来查看。</div>";
    return {
      hasItems: false,
      renderedCount: 0
    };
  }

  const documentLike = toRecord(source.documentLike);
  const createElement = asFunction<(tag: string) => unknown>(documentLike.createElement);
  const appendChild = asFunction<(node: unknown) => unknown>(listElement.appendChild);
  if (!createElement || !appendChild) {
    return {
      hasItems: true,
      renderedCount: 0
    };
  }

  const historyAdapterHostRuntime = toRecord(source.historyAdapterHostRuntime);
  const historyRecordViewRuntime = toRecord(source.historyRecordViewRuntime);
  const historyRecordItemRuntime = toRecord(source.historyRecordItemRuntime);
  const historyRecordHostRuntime = toRecord(source.historyRecordHostRuntime);

  const resolveHistoryAdapterRecordRenderState = asFunction<(payload: unknown) => unknown>(
    historyAdapterHostRuntime.resolveHistoryAdapterRecordRenderState
  );
  const resolveHistoryRecordHeadState = asFunction<(payload: unknown) => unknown>(
    historyRecordViewRuntime.resolveHistoryRecordHeadState
  );
  const resolveHistoryCatalogModeLabel = asFunction<(catalog: unknown, item: unknown) => unknown>(
    historyRecordViewRuntime.resolveHistoryCatalogModeLabel
  );
  const resolveHistoryRecordItemHtml = asFunction<(payload: unknown) => unknown>(
    historyRecordItemRuntime.resolveHistoryRecordItemHtml
  );
  const resolveHistoryRecordReplayHref = asFunction<(payload: unknown) => unknown>(
    historyRecordHostRuntime.resolveHistoryRecordReplayHref
  );
  const applyHistoryRecordExportAction = asFunction<(payload: unknown) => unknown>(
    historyRecordHostRuntime.applyHistoryRecordExportAction
  );
  const applyHistoryRecordDeleteAction = asFunction<(payload: unknown) => unknown>(
    historyRecordHostRuntime.applyHistoryRecordDeleteAction
  );

  const boardToHtml = asFunction<(board: unknown, width: unknown, height: unknown) => unknown>(
    source.boardToHtml
  );
  const confirmAction = asFunction<(message: unknown) => unknown>(source.confirmAction);
  const setStatus = asFunction<(text: unknown, isError: unknown) => unknown>(source.setStatus);
  const loadHistory = asFunction<(resetPage: unknown) => unknown>(source.loadHistory);
  const navigateToHref = asFunction<(href: unknown) => unknown>(source.navigateToHref);

  let renderedCount = 0;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const node = toRecord((createElement as unknown as Function).call(documentLike, "div"));
    node.className = "history-item";

    const adapterRenderState = toRecord(
      resolveHistoryAdapterRecordRenderState
        ? resolveHistoryAdapterRecordRenderState({
            localHistoryStore: source.localHistoryStore,
            item,
            historyAdapterDiagnosticsRuntime: source.historyAdapterDiagnosticsRuntime
          })
        : null
    );

    const headState = toRecord(
      resolveHistoryRecordHeadState
        ? resolveHistoryRecordHeadState({
            modeKey: readItemField(item, "mode_key"),
            modeFallback: readItemField(item, "mode"),
            catalogLabel: resolveHistoryCatalogModeLabel
              ? resolveHistoryCatalogModeLabel(source.modeCatalog, item)
              : "",
            score: readItemField(item, "score"),
            bestTile: readItemField(item, "best_tile"),
            durationMs: readItemField(item, "duration_ms"),
            endedAt: readItemField(item, "ended_at")
          })
        : null
    );

    const boardHtml = boardToHtml
      ? boardToHtml(
          readItemField(item, "final_board"),
          readItemField(item, "board_width"),
          readItemField(item, "board_height")
        )
      : "";

    node.innerHTML = toText(
      resolveHistoryRecordItemHtml
        ? resolveHistoryRecordItemHtml({
            modeText: headState.modeText,
            score: headState.score,
            bestTile: headState.bestTile,
            durationText: headState.durationText,
            endedText: headState.endedText,
            adapterBadgeHtml: adapterRenderState.adapterBadgeHtml,
            adapterDiagnosticsHtml: adapterRenderState.adapterDiagnosticsHtml,
            boardHtml
          })
        : ""
    );

    const replayBtn = queryNode(node, ".history-replay-btn");
    if (
      replayBtn &&
      resolveHistoryRecordReplayHref &&
      bindListener(replayBtn, "click", function () {
        const href = resolveHistoryRecordReplayHref({
          historyRecordActionsRuntime: source.historyRecordActionsRuntime,
          itemId: readItemField(item, "id")
        });
        if (navigateToHref && toText(href)) {
          navigateToHref(href);
        }
      })
    ) {
      // bound
    }

    const exportBtn = queryNode(node, ".history-export-btn");
    if (
      exportBtn &&
      applyHistoryRecordExportAction &&
      bindListener(exportBtn, "click", function () {
        applyHistoryRecordExportAction({
          localHistoryStore: source.localHistoryStore,
          item,
          historyExportRuntime: source.historyExportRuntime
        });
      })
    ) {
      // bound
    }

    const deleteBtn = queryNode(node, ".history-delete-btn");
    if (
      deleteBtn &&
      applyHistoryRecordDeleteAction &&
      bindListener(deleteBtn, "click", function () {
        const deleteState = toRecord(
          applyHistoryRecordDeleteAction({
            historyRecordActionsRuntime: source.historyRecordActionsRuntime,
            localHistoryStore: source.localHistoryStore,
            itemId: readItemField(item, "id"),
            confirmAction
          })
        );
        if (setStatus && deleteState.shouldSetStatus === true) {
          setStatus(deleteState.statusText, deleteState.isError);
        }
        if (loadHistory && deleteState.shouldReload === true) {
          loadHistory(false);
        }
      })
    ) {
      // bound
    }

    (appendChild as unknown as Function).call(listElement, node);
    renderedCount += 1;
  }

  return {
    hasItems: true,
    renderedCount
  };
}
