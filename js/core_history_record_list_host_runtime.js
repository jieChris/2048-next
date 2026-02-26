(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function queryNode(node, selector) {
    var querySelector = asFunction(toRecord(node).querySelector);
    if (!querySelector) return null;
    return querySelector.call(node, selector);
  }

  function readItemField(item, key) {
    return toRecord(item)[key];
  }

  function applyHistoryRecordListRender(input) {
    var source = toRecord(input);
    var listElement = toRecord(source.listElement);
    if (!("innerHTML" in listElement)) {
      return {
        hasItems: false,
        renderedCount: 0
      };
    }

    listElement.innerHTML = "";
    var items = toArray(toRecord(source.result).items);
    if (!items.length) {
      listElement.innerHTML =
        "<div class='history-item'>暂无历史记录。你可以开始一局游戏后再回来查看。</div>";
      return {
        hasItems: false,
        renderedCount: 0
      };
    }

    var documentLike = toRecord(source.documentLike);
    var createElement = asFunction(documentLike.createElement);
    var appendChild = asFunction(listElement.appendChild);
    if (!createElement || !appendChild) {
      return {
        hasItems: true,
        renderedCount: 0
      };
    }

    var historyAdapterHostRuntime = toRecord(source.historyAdapterHostRuntime);
    var historyRecordViewRuntime = toRecord(source.historyRecordViewRuntime);
    var historyRecordItemRuntime = toRecord(source.historyRecordItemRuntime);
    var historyRecordHostRuntime = toRecord(source.historyRecordHostRuntime);

    var resolveHistoryAdapterRecordRenderState = asFunction(
      historyAdapterHostRuntime.resolveHistoryAdapterRecordRenderState
    );
    var resolveHistoryRecordHeadState = asFunction(
      historyRecordViewRuntime.resolveHistoryRecordHeadState
    );
    var resolveHistoryCatalogModeLabel = asFunction(
      historyRecordViewRuntime.resolveHistoryCatalogModeLabel
    );
    var resolveHistoryRecordItemHtml = asFunction(historyRecordItemRuntime.resolveHistoryRecordItemHtml);
    var resolveHistoryRecordReplayHref = asFunction(
      historyRecordHostRuntime.resolveHistoryRecordReplayHref
    );
    var applyHistoryRecordExportAction = asFunction(
      historyRecordHostRuntime.applyHistoryRecordExportAction
    );
    var applyHistoryRecordDeleteAction = asFunction(
      historyRecordHostRuntime.applyHistoryRecordDeleteAction
    );

    var boardToHtml = asFunction(source.boardToHtml);
    var confirmAction = asFunction(source.confirmAction);
    var setStatus = asFunction(source.setStatus);
    var loadHistory = asFunction(source.loadHistory);
    var navigateToHref = asFunction(source.navigateToHref);

    var renderedCount = 0;
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var node = toRecord(createElement.call(documentLike, "div"));
      node.className = "history-item";

      var adapterRenderState = toRecord(
        resolveHistoryAdapterRecordRenderState
          ? resolveHistoryAdapterRecordRenderState({
              localHistoryStore: source.localHistoryStore,
              item: item,
              historyAdapterDiagnosticsRuntime: source.historyAdapterDiagnosticsRuntime
            })
          : null
      );

      var headState = toRecord(
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

      var boardHtml = boardToHtml
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
              boardHtml: boardHtml
            })
          : ""
      );

      var replayBtn = queryNode(node, ".history-replay-btn");
      if (
        replayBtn &&
        resolveHistoryRecordReplayHref &&
        bindListener(replayBtn, "click", function (recordItem) {
          return function () {
            var href = resolveHistoryRecordReplayHref({
              historyRecordActionsRuntime: source.historyRecordActionsRuntime,
              itemId: readItemField(recordItem, "id")
            });
            if (navigateToHref && toText(href)) {
              navigateToHref(href);
            }
          };
        }(item))
      ) {
        // bound
      }

      var exportBtn = queryNode(node, ".history-export-btn");
      if (
        exportBtn &&
        applyHistoryRecordExportAction &&
        bindListener(exportBtn, "click", function (recordItem) {
          return function () {
            applyHistoryRecordExportAction({
              localHistoryStore: source.localHistoryStore,
              item: recordItem,
              historyExportRuntime: source.historyExportRuntime
            });
          };
        }(item))
      ) {
        // bound
      }

      var deleteBtn = queryNode(node, ".history-delete-btn");
      if (
        deleteBtn &&
        applyHistoryRecordDeleteAction &&
        bindListener(deleteBtn, "click", function (recordItem) {
          return function () {
            var deleteState = toRecord(
              applyHistoryRecordDeleteAction({
                historyRecordActionsRuntime: source.historyRecordActionsRuntime,
                localHistoryStore: source.localHistoryStore,
                itemId: readItemField(recordItem, "id"),
                confirmAction: confirmAction
              })
            );
            if (setStatus && deleteState.shouldSetStatus === true) {
              setStatus(deleteState.statusText, deleteState.isError);
            }
            if (loadHistory && deleteState.shouldReload === true) {
              loadHistory(false);
            }
          };
        }(item))
      ) {
        // bound
      }

      appendChild.call(listElement, node);
      renderedCount += 1;
    }

    return {
      hasItems: true,
      renderedCount: renderedCount
    };
  }

  global.CoreHistoryRecordListHostRuntime = global.CoreHistoryRecordListHostRuntime || {};
  global.CoreHistoryRecordListHostRuntime.applyHistoryRecordListRender =
    applyHistoryRecordListRender;
})(typeof window !== "undefined" ? window : undefined);
