function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    if (typeof value[i] === "string" && value[i].length > 0) {
      result.push(value[i]);
    }
  }
  return result;
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
  addEventListener(eventName, handler);
  return true;
}

export interface HistoryToolbarEventsHostBindResult {
  didBind: boolean;
  boundControlCount: number;
}

export function bindHistoryToolbarPagerAndFilterEvents(input: {
  getElementById?: unknown;
  state?: unknown;
  loadHistory?: unknown;
  historyToolbarEventsRuntime?: unknown;
}): HistoryToolbarEventsHostBindResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const loadHistory = asFunction<(resetPage: unknown) => unknown>(source.loadHistory);
  if (!getElementById || !loadHistory) {
    return {
      didBind: false,
      boundControlCount: 0
    };
  }

  const state = toRecord(source.state);
  const runtime = toRecord(source.historyToolbarEventsRuntime);
  const resolveHistoryPrevPageState = asFunction<(page: unknown) => unknown>(
    runtime.resolveHistoryPrevPageState
  );
  const resolveHistoryNextPageState = asFunction<(page: unknown) => unknown>(
    runtime.resolveHistoryNextPageState
  );
  const resolveHistoryFilterReloadControlIds = asFunction<() => unknown>(
    runtime.resolveHistoryFilterReloadControlIds
  );
  const shouldHistoryKeywordTriggerReload = asFunction<(key: unknown) => unknown>(
    runtime.shouldHistoryKeywordTriggerReload
  );

  let boundControlCount = 0;

  const prevBtn = getElementById("history-prev-page");
  if (
    resolveHistoryPrevPageState &&
    bindListener(prevBtn, "click", function () {
      const prevState = toRecord(resolveHistoryPrevPageState(state.page));
      if (prevState.canGo !== true) return;
      state.page = prevState.nextPage;
      loadHistory(false);
    })
  ) {
    boundControlCount += 1;
  }

  const nextBtn = getElementById("history-next-page");
  if (
    resolveHistoryNextPageState &&
    bindListener(nextBtn, "click", function () {
      const nextState = toRecord(resolveHistoryNextPageState(state.page));
      state.page = nextState.nextPage;
      loadHistory(false);
    })
  ) {
    boundControlCount += 1;
  }

  const reloadControlIds = toStringList(
    resolveHistoryFilterReloadControlIds ? resolveHistoryFilterReloadControlIds() : []
  );
  for (let i = 0; i < reloadControlIds.length; i += 1) {
    const control = getElementById(reloadControlIds[i]);
    if (
      bindListener(control, "change", function () {
        loadHistory(true);
      })
    ) {
      boundControlCount += 1;
    }
  }

  const keyword = getElementById("history-keyword");
  if (
    shouldHistoryKeywordTriggerReload &&
    bindListener(keyword, "keydown", function (event: unknown) {
      const keyboardEvent = toRecord(event);
      if (shouldHistoryKeywordTriggerReload(keyboardEvent.key) !== true) return;
      const preventDefault = asFunction<() => unknown>(keyboardEvent.preventDefault);
      if (preventDefault) preventDefault();
      loadHistory(true);
    })
  ) {
    boundControlCount += 1;
  }

  return {
    didBind: boundControlCount > 0,
    boundControlCount
  };
}
