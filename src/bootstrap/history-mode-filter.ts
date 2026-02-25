export interface HistoryModeFilterOption {
  value: string;
  label: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function resolveHistoryModeFilterOptions(modes: unknown): HistoryModeFilterOption[] {
  if (!Array.isArray(modes)) return [];

  const options: HistoryModeFilterOption[] = [];
  for (let i = 0; i < modes.length; i++) {
    const item = modes[i];
    if (!isObject(item)) continue;

    const value = item.key == null ? "" : String(item.key);
    const label = item.label == null ? "" : String(item.label);
    if (!value || !label) continue;

    options.push({ value, label });
  }
  return options;
}
