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

export interface HistoryFilterState {
  modeKey: string;
  keyword: string;
  sortBy: string;
  adapterParityFilter: string;
  burnInWindow: string;
  sustainedWindows: string;
}

export function resolveHistoryFilterState(input: {
  modeKeyRaw?: unknown;
  keywordRaw?: unknown;
  sortByRaw?: unknown;
  adapterParityFilterRaw?: unknown;
  burnInWindowRaw?: unknown;
  sustainedWindowsRaw?: unknown;
}): HistoryFilterState {
  return {
    modeKey: normalizeString(input && input.modeKeyRaw, ""),
    keyword: normalizeString(input && input.keywordRaw, ""),
    sortBy: normalizeString(input && input.sortByRaw, "ended_desc"),
    adapterParityFilter: normalizeString(input && input.adapterParityFilterRaw, "all"),
    burnInWindow: normalizeString(input && input.burnInWindowRaw, "200"),
    sustainedWindows: normalizeString(input && input.sustainedWindowsRaw, "3")
  };
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
    max_mismatch_rate: normalizePositiveInteger(input && input.maxMismatchRate, 1)
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
