function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export interface HistoryFilterState {
  modeKey: string;
  keyword: string;
  sortBy: string;
  adapterParityFilter: string;
  burnInWindow: string;
  sustainedWindows: string;
  burnInMinComparable: string;
  burnInMaxMismatchRate: string;
}

type MutableHistoryFilterTarget = Record<string, unknown>;
type HistoryListStoreLike = {
  listRecords?: (query: unknown) => unknown;
};

const DEFAULT_HISTORY_LIST_RESULT = {
  items: [],
  total: 0
};

export function resolveHistoryFilterState(input: {
  modeKeyRaw?: unknown;
  keywordRaw?: unknown;
  sortByRaw?: unknown;
  adapterParityFilterRaw?: unknown;
  burnInWindowRaw?: unknown;
  sustainedWindowsRaw?: unknown;
  minComparableRaw?: unknown;
  maxMismatchRateRaw?: unknown;
}): HistoryFilterState {
  return {
    modeKey: normalizeString(input && input.modeKeyRaw, ""),
    keyword: normalizeString(input && input.keywordRaw, ""),
    sortBy: normalizeString(input && input.sortByRaw, "ended_desc"),
    adapterParityFilter: normalizeString(input && input.adapterParityFilterRaw, "all"),
    burnInWindow: normalizeString(input && input.burnInWindowRaw, "200"),
    sustainedWindows: normalizeString(input && input.sustainedWindowsRaw, "3"),
    burnInMinComparable: normalizeString(input && input.minComparableRaw, "50"),
    burnInMaxMismatchRate: normalizeString(input && input.maxMismatchRateRaw, "1")
  };
}

function asMutableHistoryFilterTarget(value: unknown): MutableHistoryFilterTarget | null {
  if (!value || typeof value !== "object") return null;
  return value as MutableHistoryFilterTarget;
}

export function applyHistoryFilterState(targetState: unknown, input: unknown): boolean {
  const target = asMutableHistoryFilterTarget(targetState);
  if (!target) return false;
  const next = resolveHistoryFilterState(input as Record<string, unknown>);
  target.modeKey = next.modeKey;
  target.keyword = next.keyword;
  target.sortBy = next.sortBy;
  target.adapterParityFilter = next.adapterParityFilter;
  target.burnInWindow = next.burnInWindow;
  target.sustainedWindows = next.sustainedWindows;
  target.burnInMinComparable = next.burnInMinComparable;
  target.burnInMaxMismatchRate = next.burnInMaxMismatchRate;
  return true;
}

export function resolveHistoryListQuery(input: {
  modeKey?: unknown;
  keyword?: unknown;
  sortBy?: unknown;
  adapterParityFilter?: unknown;
  page?: unknown;
  pageSize?: unknown;
}): {
  mode_key: string;
  keyword: string;
  sort_by: string;
  adapter_parity_filter: string;
  page: number;
  page_size: number;
} {
  return {
    mode_key: normalizeString(input && input.modeKey, ""),
    keyword: normalizeString(input && input.keyword, ""),
    sort_by: normalizeString(input && input.sortBy, "ended_desc"),
    adapter_parity_filter: normalizeString(input && input.adapterParityFilter, "all"),
    page: normalizePositiveInteger(input && input.page, 1),
    page_size: normalizePositiveInteger(input && input.pageSize, 30)
  };
}

function asHistoryListStore(value: unknown): HistoryListStoreLike | null {
  if (!value || typeof value !== "object") return null;
  return value as HistoryListStoreLike;
}

export function resolveHistoryListResultSource(input: {
  localHistoryStore?: unknown;
  listQuery?: unknown;
  fallbackResult?: unknown;
}): unknown {
  const source = (input && typeof input === "object" ? input : {}) as {
    localHistoryStore?: unknown;
    listQuery?: unknown;
    fallbackResult?: unknown;
  };
  const fallback = source.fallbackResult ?? DEFAULT_HISTORY_LIST_RESULT;
  const store = asHistoryListStore(source.localHistoryStore);
  if (!store || typeof store.listRecords !== "function") return fallback;
  try {
    const result = store.listRecords(source.listQuery);
    return result ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

export function resolveHistoryBurnInQuery(input: {
  modeKey?: unknown;
  keyword?: unknown;
  sortBy?: unknown;
  sampleLimit?: unknown;
  sustainedWindows?: unknown;
  minComparable?: unknown;
  maxMismatchRate?: unknown;
}): {
  mode_key: string;
  keyword: string;
  sort_by: string;
  sample_limit: string;
  sustained_windows: string;
  min_comparable: number;
  max_mismatch_rate: number;
} {
  return {
    mode_key: normalizeString(input && input.modeKey, ""),
    keyword: normalizeString(input && input.keyword, ""),
    sort_by: normalizeString(input && input.sortBy, "ended_desc"),
    sample_limit: normalizeString(input && input.sampleLimit, "200"),
    sustained_windows: normalizeString(input && input.sustainedWindows, "3"),
    min_comparable: normalizePositiveInteger(input && input.minComparable, 50),
    max_mismatch_rate: normalizePositiveNumber(input && input.maxMismatchRate, 1)
  };
}

export function resolveHistoryPagerState(input: {
  total?: unknown;
  page?: unknown;
  pageSize?: unknown;
}): {
  maxPage: number;
  disablePrev: boolean;
  disableNext: boolean;
} {
  const page = normalizePositiveInteger(input && input.page, 1);
  const pageSize = normalizePositiveInteger(input && input.pageSize, 30);
  const totalRaw = Number(input && input.total);
  const total = Number.isFinite(totalRaw) && totalRaw > 0 ? Math.floor(totalRaw) : 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  return {
    maxPage,
    disablePrev: page <= 1,
    disableNext: page >= maxPage
  };
}
