function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(
  value: unknown
): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function asPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function asPositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export interface ResolveHistoryLoadPipelineInput {
  state?: Record<string, unknown>;
  localHistoryStore?: unknown;
  historyQueryRuntime?: unknown;
  historyBurnInRuntime?: unknown;
  burnInMinComparable?: unknown;
  burnInMaxMismatchRate?: unknown;
}

export interface ResolveHistoryLoadPipelineResult {
  listQuery: unknown;
  listResult: unknown;
  burnInSummary: unknown;
  pagerState: {
    disablePrev: boolean;
    disableNext: boolean;
  };
}

export function resolveHistoryLoadPipeline(
  input: ResolveHistoryLoadPipelineInput
): ResolveHistoryLoadPipelineResult {
  const source = isRecord(input) ? input : {};
  const state = isRecord(source.state) ? source.state : {};
  const queryRuntime = isRecord(source.historyQueryRuntime)
    ? source.historyQueryRuntime
    : {};
  const burnInRuntime = isRecord(source.historyBurnInRuntime)
    ? source.historyBurnInRuntime
    : {};
  const resolveHistoryListQuery = asFunction<(payload: unknown) => unknown>(
    queryRuntime.resolveHistoryListQuery
  );
  const resolveHistoryListResultSource = asFunction<(payload: unknown) => unknown>(
    queryRuntime.resolveHistoryListResultSource
  );
  const resolveHistoryBurnInSummarySource = asFunction<(payload: unknown) => unknown>(
    burnInRuntime.resolveHistoryBurnInSummarySource
  );
  const resolveHistoryBurnInQuery = asFunction<(payload: unknown) => unknown>(
    queryRuntime.resolveHistoryBurnInQuery
  );
  const resolveHistoryPagerState = asFunction<(payload: unknown) => unknown>(
    queryRuntime.resolveHistoryPagerState
  );

  const listQuery = resolveHistoryListQuery
    ? resolveHistoryListQuery({
        modeKey: state.modeKey,
        keyword: state.keyword,
        sortBy: state.sortBy,
        adapterParityFilter: state.adapterParityFilter,
        page: state.page,
        pageSize: state.pageSize
      })
    : {};
  const listResult = resolveHistoryListResultSource
    ? resolveHistoryListResultSource({
        localHistoryStore: source.localHistoryStore,
        listQuery
      })
    : { items: [], total: 0 };
  const burnInSummary = resolveHistoryBurnInSummarySource
    ? resolveHistoryBurnInSummarySource({
        localHistoryStore: source.localHistoryStore,
        resolveBurnInQuery: resolveHistoryBurnInQuery,
        queryInput: {
          modeKey: state.modeKey,
          keyword: state.keyword,
          sortBy: state.sortBy,
          sampleLimit: state.burnInWindow,
          sustainedWindows: state.sustainedWindows,
          minComparable: asPositiveInteger(
            state.burnInMinComparable ?? source.burnInMinComparable,
            50
          ),
          maxMismatchRate: asPositiveNumber(
            state.burnInMaxMismatchRate ?? source.burnInMaxMismatchRate,
            1
          )
        }
      })
    : null;

  const listResultRecord = isRecord(listResult) ? listResult : {};
  const pagerStateRaw = resolveHistoryPagerState
    ? resolveHistoryPagerState({
        total: listResultRecord.total,
        page: state.page,
        pageSize: state.pageSize
      })
    : null;
  const pagerStateRecord = isRecord(pagerStateRaw) ? pagerStateRaw : {};

  return {
    listQuery,
    listResult,
    burnInSummary,
    pagerState: {
      disablePrev: Boolean(pagerStateRecord.disablePrev),
      disableNext: Boolean(pagerStateRecord.disableNext)
    }
  };
}
