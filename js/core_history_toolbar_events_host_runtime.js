(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function toStringList(value) {
    if (!Array.isArray(value)) return [];
    var result = [];
    for (var i = 0; i < value.length; i += 1) {
      if (typeof value[i] === "string" && value[i].length > 0) {
        result.push(value[i]);
      }
    }
    return result;
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener(eventName, handler);
    return true;
  }

  function bindHistoryToolbarPagerAndFilterEvents(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    var loadHistory = asFunction(source.loadHistory);
    if (!getElementById || !loadHistory) {
      return {
        didBind: false,
        boundControlCount: 0
      };
    }

    var state = toRecord(source.state);
    var runtime = toRecord(source.historyToolbarEventsRuntime);
    var resolveHistoryPrevPageState = asFunction(runtime.resolveHistoryPrevPageState);
    var resolveHistoryNextPageState = asFunction(runtime.resolveHistoryNextPageState);
    var resolveHistoryFilterReloadControlIds = asFunction(runtime.resolveHistoryFilterReloadControlIds);
    var shouldHistoryKeywordTriggerReload = asFunction(runtime.shouldHistoryKeywordTriggerReload);

    var boundControlCount = 0;

    var prevBtn = getElementById("history-prev-page");
    if (
      resolveHistoryPrevPageState &&
      bindListener(prevBtn, "click", function () {
        var prevState = toRecord(resolveHistoryPrevPageState(state.page));
        if (prevState.canGo !== true) return;
        state.page = prevState.nextPage;
        loadHistory(false);
      })
    ) {
      boundControlCount += 1;
    }

    var nextBtn = getElementById("history-next-page");
    if (
      resolveHistoryNextPageState &&
      bindListener(nextBtn, "click", function () {
        var nextState = toRecord(resolveHistoryNextPageState(state.page));
        state.page = nextState.nextPage;
        loadHistory(false);
      })
    ) {
      boundControlCount += 1;
    }

    var reloadControlIds = toStringList(
      resolveHistoryFilterReloadControlIds ? resolveHistoryFilterReloadControlIds() : []
    );
    for (var i = 0; i < reloadControlIds.length; i += 1) {
      var control = getElementById(reloadControlIds[i]);
      if (
        bindListener(control, "change", function () {
          loadHistory(true);
        })
      ) {
        boundControlCount += 1;
      }
    }

    var keyword = getElementById("history-keyword");
    if (
      shouldHistoryKeywordTriggerReload &&
      bindListener(keyword, "keydown", function (event) {
        var keyboardEvent = toRecord(event);
        if (shouldHistoryKeywordTriggerReload(keyboardEvent.key) !== true) return;
        var preventDefault = asFunction(keyboardEvent.preventDefault);
        if (preventDefault) preventDefault();
        loadHistory(true);
      })
    ) {
      boundControlCount += 1;
    }

    return {
      didBind: boundControlCount > 0,
      boundControlCount: boundControlCount
    };
  }

  global.CoreHistoryToolbarEventsHostRuntime = global.CoreHistoryToolbarEventsHostRuntime || {};
  global.CoreHistoryToolbarEventsHostRuntime.bindHistoryToolbarPagerAndFilterEvents =
    bindHistoryToolbarPagerAndFilterEvents;
})(typeof window !== "undefined" ? window : undefined);
