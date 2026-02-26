function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function resolveHistoryImportSelectedFile(files: unknown): unknown | null {
  if (Array.isArray(files)) {
    return files.length > 0 ? files[0] ?? null : null;
  }

  if (!isObject(files)) return null;

  if (typeof files.item === "function") {
    const first = files.item(0);
    return first ?? null;
  }

  const length = Number((files as { length?: unknown }).length);
  if (!Number.isFinite(length) || length <= 0) return null;
  return (files as { 0?: unknown })[0] ?? null;
}

export function resolveHistoryImportPayloadText(readerResult: unknown): string {
  return String(readerResult || "");
}

export function resolveHistoryImportReadEncoding(): string {
  return "utf-8";
}

export function resolveHistoryImportInputResetValue(): string {
  return "";
}
