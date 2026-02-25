function toRecordId(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function resolveHistoryReplayHref(recordId: unknown): string {
  return "replay.html?local_history_id=" + encodeURIComponent(toRecordId(recordId));
}

export function resolveHistoryDeleteActionState(recordId: unknown): {
  recordId: string;
  confirmMessage: string;
} {
  return {
    recordId: toRecordId(recordId),
    confirmMessage: "确认删除这条历史记录？此操作不可撤销。"
  };
}

export function resolveHistoryDeleteFailureNotice(): string {
  return "删除失败：记录不存在或已被删除";
}

export function resolveHistoryDeleteSuccessNotice(): string {
  return "记录已删除";
}
