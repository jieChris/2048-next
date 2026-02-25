export interface HistoryMismatchExportQuery {
  mode_key: string;
  keyword: string;
  sort_by: string;
  adapter_parity_filter: "mismatch";
}

export interface HistoryClearAllActionState {
  requiresConfirm: boolean;
  confirmMessage: string;
  successNotice: string;
}

function toDateTag(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function toFilterText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toSortKey(value: unknown): string {
  return typeof value === "string" && value ? value : "ended_desc";
}

export function resolveHistoryExportDateTag(value: unknown): string {
  return toDateTag(value);
}

export function resolveHistoryExportAllFileName(dateTag: unknown): string {
  return "2048_local_history_" + toDateTag(dateTag) + ".json";
}

export function resolveHistoryExportAllNotice(): string {
  return "已导出全部历史记录";
}

export function resolveHistoryMismatchExportQuery(input: unknown): HistoryMismatchExportQuery {
  const payload = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    mode_key: toFilterText(payload.modeKey),
    keyword: toFilterText(payload.keyword),
    sort_by: toSortKey(payload.sortBy),
    adapter_parity_filter: "mismatch"
  };
}

export function resolveHistoryMismatchExportEmptyNotice(): string {
  return "没有可导出的 A/B 不一致记录";
}

export function resolveHistoryMismatchExportFileName(dateTag: unknown): string {
  return "2048_local_history_mismatch_" + toDateTag(dateTag) + ".json";
}

export function resolveHistoryMismatchExportSuccessNotice(count: unknown): string {
  const total = Number.isFinite(count) ? Number(count) : 0;
  return "已导出 A/B 不一致记录 " + total + " 条";
}

export function resolveHistoryClearAllActionState(): HistoryClearAllActionState {
  return {
    requiresConfirm: true,
    confirmMessage: "确认清空全部本地历史记录？此操作不可撤销。",
    successNotice: "已清空全部历史记录"
  };
}
