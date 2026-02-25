export type HistoryImportMode = "merge" | "replace";

export interface HistoryImportActionState {
  mode: HistoryImportMode;
  requiresConfirm: boolean;
  confirmMessage: string;
}

function normalizeImportMode(mode: unknown): HistoryImportMode {
  return mode === "replace" ? "replace" : "merge";
}

export function resolveHistoryImportActionState(action: unknown): HistoryImportActionState {
  if (action === "replace") {
    return {
      mode: "replace",
      requiresConfirm: true,
      confirmMessage: "导入并替换会清空当前本地历史后再导入，是否继续？"
    };
  }

  return {
    mode: "merge",
    requiresConfirm: false,
    confirmMessage: ""
  };
}

export function resolveHistoryImportMergeFlag(mode: unknown): boolean {
  return normalizeImportMode(mode) !== "replace";
}

export function resolveHistoryImportSuccessNotice(result: unknown): string {
  const imported =
    result && typeof result === "object" && Number.isFinite((result as { imported?: unknown }).imported)
      ? Number((result as { imported?: unknown }).imported)
      : 0;
  const replaced =
    result && typeof result === "object" && Number.isFinite((result as { replaced?: unknown }).replaced)
      ? Number((result as { replaced?: unknown }).replaced)
      : 0;
  return "导入成功：新增 " + imported + " 条，覆盖 " + replaced + " 条。";
}

export function resolveHistoryImportErrorNotice(error: unknown): string {
  const message =
    error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "unknown";
  return "导入失败: " + message;
}

export function resolveHistoryImportReadErrorNotice(): string {
  return "读取文件失败";
}
