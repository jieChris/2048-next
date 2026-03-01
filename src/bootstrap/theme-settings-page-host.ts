function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface ThemeSettingsPageInitResult {
  hasApplyUiApi: boolean;
  hasThemeManager: boolean;
  didApply: boolean;
}

export function applyThemeSettingsPageInit(input: {
  themeSettingsHostRuntime?: unknown;
  themeSettingsRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
}): ThemeSettingsPageInitResult {
  const source = toRecord(input);
  const hostRuntime = toRecord(source.themeSettingsHostRuntime);
  const applyUi = asFunction<(payload: unknown) => unknown>(hostRuntime.applyThemeSettingsUi);
  if (!applyUi) {
    return {
      hasApplyUiApi: false,
      hasThemeManager: false,
      didApply: false
    };
  }

  const windowLike = toRecord(source.windowLike);
  const themeManager = windowLike.ThemeManager || null;

  applyUi({
    documentLike: source.documentLike,
    windowLike: source.windowLike,
    themeSettingsRuntime: source.themeSettingsRuntime,
    themeManager
  });

  return {
    hasApplyUiApi: true,
    hasThemeManager: !!themeManager,
    didApply: true
  };
}
