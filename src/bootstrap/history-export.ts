type AnyRecord = Record<string, unknown>;

type ListRecordsFn = (query: {
  mode_key: string;
  keyword: string;
  sort_by: string;
  adapter_parity_filter: string;
  page: number;
  page_size: number;
}) => unknown;

export interface HistoryExportQueryOptions {
  mode_key?: unknown;
  keyword?: unknown;
  sort_by?: unknown;
  adapter_parity_filter?: unknown;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

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

function toSafeModeKey(modeKey: unknown): string {
  const raw = typeof modeKey === "string" && modeKey ? modeKey : "mode";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function resolveHistoryRecordExportFileName(input: {
  modeKey?: unknown;
  id?: unknown;
}): string {
  const safeMode = toSafeModeKey(input && input.modeKey);
  const idText = String((input && input.id) ?? "");
  return "history_" + safeMode + "_" + idText + ".json";
}

export function collectHistoryRecordIdsForExport(input: {
  listRecords: ListRecordsFn | null | undefined;
  queryOptions?: HistoryExportQueryOptions | null;
  maxPages?: unknown;
  pageSize?: unknown;
}): string[] {
  if (!input || typeof input.listRecords !== "function") return [];

  const queryOptions = isPlainObject(input.queryOptions) ? input.queryOptions : {};
  const modeKey = normalizeString(queryOptions.mode_key, "");
  const keyword = normalizeString(queryOptions.keyword, "");
  const sortBy = normalizeString(queryOptions.sort_by, "ended_desc");
  const adapterParityFilter = normalizeString(queryOptions.adapter_parity_filter, "all");
  const maxPages = normalizePositiveInteger(input.maxPages, 100);
  const pageSize = normalizePositiveInteger(input.pageSize, 500);

  const ids: string[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = input.listRecords({
      mode_key: modeKey,
      keyword,
      sort_by: sortBy,
      adapter_parity_filter: adapterParityFilter,
      page,
      page_size: pageSize
    });

    const resultRecord = isPlainObject(result) ? result : {};
    const rawItems = Array.isArray(resultRecord.items) ? resultRecord.items : [];
    if (!rawItems.length) break;

    for (let i = 0; i < rawItems.length; i += 1) {
      const item = rawItems[i];
      if (!isPlainObject(item)) continue;
      const id = item.id;
      if (id === null || id === undefined || id === "") continue;
      ids.push(String(id));
    }

    const total = normalizePositiveInteger(resultRecord.total, 0);
    if (total > 0 && ids.length >= total) break;
  }

  return ids;
}
