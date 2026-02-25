(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function asNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  function resolveHistoryLoadPipeline(input) {
    var source = isRecord(input) ? input : {};
    var state = isRecord(source.state) ? source.state : {};
    var queryRuntime = isRecord(source.historyQueryRuntime)
      ? source.historyQueryRuntime
      : {};
    var burnInRuntime = isRecord(source.historyBurnInRuntime)
      ? source.historyBurnInRuntime
      : {};
    var resolveHistoryListQuery = asFunction(queryRuntime.resolveHistoryListQuery);
    var resolveHistoryListResultSource = asFunction(queryRuntime.resolveHistoryListResultSource);
    var resolveHistoryBurnInSummarySource = asFunction(
      burnInRuntime.resolveHistoryBurnInSummarySource
    );
    var resolveHistoryBurnInQuery = asFunction(queryRuntime.resolveHistoryBurnInQuery);
    var resolveHistoryPagerState = asFunction(queryRuntime.resolveHistoryPagerState);

    var listQuery = resolveHistoryListQuery
      ? resolveHistoryListQuery({
          modeKey: state.modeKey,
          keyword: state.keyword,
          sortBy: state.sortBy,
          adapterParityFilter: state.adapterParityFilter,
          page: state.page,
          pageSize: state.pageSize
        })
      : {};
    var listResult = resolveHistoryListResultSource
      ? resolveHistoryListResultSource({
          localHistoryStore: source.localHistoryStore,
          listQuery: listQuery
        })
      : { items: [], total: 0 };
    var burnInSummary = resolveHistoryBurnInSummarySource
      ? resolveHistoryBurnInSummarySource({
          localHistoryStore: source.localHistoryStore,
          resolveBurnInQuery: resolveHistoryBurnInQuery,
          queryInput: {
            modeKey: state.modeKey,
            keyword: state.keyword,
            sortBy: state.sortBy,
            sampleLimit: state.burnInWindow,
            sustainedWindows: state.sustainedWindows,
            minComparable: asNumber(source.burnInMinComparable, 50),
            maxMismatchRate: asNumber(source.burnInMaxMismatchRate, 1)
          }
        })
      : null;

    var listResultRecord = isRecord(listResult) ? listResult : {};
    var pagerStateRaw = resolveHistoryPagerState
      ? resolveHistoryPagerState({
          total: listResultRecord.total,
          page: state.page,
          pageSize: state.pageSize
        })
      : null;
    var pagerStateRecord = isRecord(pagerStateRaw) ? pagerStateRaw : {};

    return {
      listQuery: listQuery,
      listResult: listResult,
      burnInSummary: burnInSummary,
      pagerState: {
        disablePrev: Boolean(pagerStateRecord.disablePrev),
        disableNext: Boolean(pagerStateRecord.disableNext)
      }
    };
  }

  global.CoreHistoryLoadRuntime = global.CoreHistoryLoadRuntime || {};
  global.CoreHistoryLoadRuntime.resolveHistoryLoadPipeline = resolveHistoryLoadPipeline;
})(typeof window !== "undefined" ? window : undefined);
