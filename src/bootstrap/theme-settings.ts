export interface ThemeLike {
  id?: string | null | undefined;
  label?: string | null | undefined;
}

export interface ResolveThemePreviewTileValuesOptions {
  getTileValues?: ((ruleset: "pow2" | "fibonacci") => Array<number> | null | undefined) | null | undefined;
}

export interface ResolveThemePreviewTileValuesResult {
  pow2Values: number[];
  fibonacciValues: number[];
}

export interface ResolveThemeSelectLabelOptions {
  themes?: Array<ThemeLike> | null | undefined;
  currentThemeId?: string | null | undefined;
  fallbackLabel?: string | null | undefined;
}

export interface ResolveThemeDropdownToggleStateOptions {
  isOpen?: boolean | null | undefined;
}

export interface ResolveThemeDropdownToggleStateResult {
  shouldOpen: boolean;
}

export interface ResolveThemeBindingStateOptions {
  alreadyBound?: boolean | null | undefined;
}

export interface ResolveThemeBindingStateResult {
  shouldBind: boolean;
  boundValue: boolean;
}

export interface ResolveThemeOptionSelectedStateOptions {
  optionValue?: string | null | undefined;
  currentThemeId?: string | null | undefined;
}

export interface ResolveThemePreviewCssSelectorsOptions {
  previewLayout?: ResolveThemePreviewLayoutResult | null | undefined;
  fallbackPow2Selector?: string | null | undefined;
  fallbackFibonacciSelector?: string | null | undefined;
}

export interface ResolveThemePreviewCssSelectorsResult {
  pow2Selector: string;
  fibSelector: string;
}

export interface ResolveThemePreviewLayoutResult {
  containerClassName: string;
  innerHtml: string;
  pow2GridId: string;
  fibonacciGridId: string;
  pow2Selector: string;
  fibonacciSelector: string;
}

export interface ResolveThemeOptionsOptions {
  themes?: Array<ThemeLike> | null | undefined;
}

export interface ResolvedThemeOption {
  id: string;
  label: string;
}

const FALLBACK_POW2_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
const FALLBACK_FIB_VALUES = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function normalizeValues(value: Array<number> | null | undefined, fallback: number[]): number[] {
  if (!Array.isArray(value) || value.length === 0) return fallback.slice();
  const normalized = value.filter((item) => typeof item === "number" && Number.isFinite(item));
  return normalized.length > 0 ? normalized : fallback.slice();
}

export function formatThemePreviewValue(value: number | null | undefined): string {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (num >= 1024 && num % 1024 === 0) {
    return num / 1024 + "K";
  }
  return "" + num;
}

export function resolveThemePreviewTileValues(
  options: ResolveThemePreviewTileValuesOptions
): ResolveThemePreviewTileValuesResult {
  const opts = options || {};
  const getTileValues = typeof opts.getTileValues === "function" ? opts.getTileValues : null;
  const pow2Values = normalizeValues(getTileValues ? getTileValues("pow2") : null, FALLBACK_POW2_VALUES);
  const fibonacciValues = normalizeValues(
    getTileValues ? getTileValues("fibonacci") : null,
    FALLBACK_FIB_VALUES
  );
  return {
    pow2Values,
    fibonacciValues
  };
}

export function resolveThemeSelectLabel(options: ResolveThemeSelectLabelOptions): string {
  const opts = options || {};
  const themes = Array.isArray(opts.themes) ? opts.themes : [];
  const fallbackLabel =
    typeof opts.fallbackLabel === "string" && opts.fallbackLabel ? opts.fallbackLabel : "选择主题";
  const currentThemeId = typeof opts.currentThemeId === "string" ? opts.currentThemeId : "";
  for (let i = 0; i < themes.length; i += 1) {
    const item = themes[i];
    if (!item || item.id !== currentThemeId) continue;
    if (typeof item.label === "string" && item.label) return item.label;
  }
  return fallbackLabel;
}

export function resolveThemeDropdownToggleState(
  options: ResolveThemeDropdownToggleStateOptions
): ResolveThemeDropdownToggleStateResult {
  const opts = options || {};
  return {
    shouldOpen: !opts.isOpen
  };
}

export function resolveThemeBindingState(
  options: ResolveThemeBindingStateOptions
): ResolveThemeBindingStateResult {
  const opts = options || {};
  const alreadyBound = !!opts.alreadyBound;
  return {
    shouldBind: !alreadyBound,
    boundValue: true
  };
}

export function resolveThemeOptionSelectedState(
  options: ResolveThemeOptionSelectedStateOptions
): boolean {
  const opts = options || {};
  return String(opts.optionValue || "") === String(opts.currentThemeId || "");
}

export function resolveThemePreviewLayout(): ResolveThemePreviewLayoutResult {
  return {
    containerClassName: "theme-preview-dual-wrap",
    innerHtml:
      "<div class='theme-preview-grid-block'>" +
      "<div class='theme-preview-grid-title'>2幂</div>" +
      "<div id='theme-preview-grid-pow2' class='theme-preview-grid'></div>" +
      "</div>" +
      "<div class='theme-preview-grid-block'>" +
      "<div class='theme-preview-grid-title'>Fibonacci</div>" +
      "<div id='theme-preview-grid-fib' class='theme-preview-grid'></div>" +
      "</div>",
    pow2GridId: "theme-preview-grid-pow2",
    fibonacciGridId: "theme-preview-grid-fib",
    pow2Selector: "#theme-preview-grid-pow2",
    fibonacciSelector: "#theme-preview-grid-fib"
  };
}

export function resolveThemePreviewCssSelectors(
  options: ResolveThemePreviewCssSelectorsOptions
): ResolveThemePreviewCssSelectorsResult {
  const opts = options || {};
  const layout = opts.previewLayout;
  const fallbackPow2 =
    typeof opts.fallbackPow2Selector === "string" && opts.fallbackPow2Selector
      ? opts.fallbackPow2Selector
      : "#theme-preview-grid-pow2";
  const fallbackFib =
    typeof opts.fallbackFibonacciSelector === "string" && opts.fallbackFibonacciSelector
      ? opts.fallbackFibonacciSelector
      : "#theme-preview-grid-fib";
  const pow2Selector =
    layout && typeof layout.pow2Selector === "string" && layout.pow2Selector
      ? layout.pow2Selector
      : fallbackPow2;
  const fibSelector =
    layout && typeof layout.fibonacciSelector === "string" && layout.fibonacciSelector
      ? layout.fibonacciSelector
      : fallbackFib;
  return {
    pow2Selector,
    fibSelector
  };
}

export function resolveThemeOptions(options: ResolveThemeOptionsOptions): ResolvedThemeOption[] {
  const opts = options || {};
  const inputThemes = Array.isArray(opts.themes) ? opts.themes : [];
  const result: ResolvedThemeOption[] = [];
  for (let i = 0; i < inputThemes.length; i += 1) {
    const theme = inputThemes[i];
    if (!theme) continue;
    const id = typeof theme.id === "string" ? theme.id : "";
    if (!id) continue;
    const label = typeof theme.label === "string" && theme.label ? theme.label : id;
    result.push({ id, label });
  }
  return result;
}
