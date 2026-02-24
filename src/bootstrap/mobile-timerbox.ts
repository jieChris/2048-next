interface StorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
}

export interface ResolveStoredMobileTimerboxCollapsedOptions {
  storageLike?: StorageLike | null | undefined;
  storageKey?: string | null | undefined;
  defaultCollapsed?: boolean | null | undefined;
}

export interface PersistMobileTimerboxCollapsedOptions {
  storageLike?: StorageLike | null | undefined;
  storageKey?: string | null | undefined;
  collapsed?: boolean | null | undefined;
}

export interface MobileTimerboxDisplayModel {
  showToggle: boolean;
  toggleDisplay: "inline-flex" | "none";
  ariaExpanded: "true" | "false";
  label: string;
  iconSvg: string;
  expanded: boolean;
}

export interface ResolveMobileTimerboxDisplayModelOptions {
  collapsible?: boolean | null | undefined;
  timerModuleHidden?: boolean | null | undefined;
  collapsed?: boolean | null | undefined;
}

const DEFAULT_STORAGE_KEY = "ui_timerbox_collapsed_mobile_v1";
const LABEL_EXPAND = "展开计时器";
const LABEL_COLLAPSE = "收起计时器";
const ICON_COLLAPSED =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
const ICON_EXPANDED =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"></polyline></svg>';

function resolveStorageKey(value: string | null | undefined): string {
  return typeof value === "string" && value ? value : DEFAULT_STORAGE_KEY;
}

export function resolveStoredMobileTimerboxCollapsed(
  options: ResolveStoredMobileTimerboxCollapsedOptions
): boolean {
  const opts = options || {};
  const fallback = typeof opts.defaultCollapsed === "boolean" ? opts.defaultCollapsed : true;
  const storage = opts.storageLike || null;
  if (!storage || typeof storage.getItem !== "function") return fallback;

  try {
    const raw = storage.getItem(resolveStorageKey(opts.storageKey));
    if (raw === "0") return false;
    if (raw === "1") return true;
    return fallback;
  } catch (_err) {
    return fallback;
  }
}

export function persistMobileTimerboxCollapsed(
  options: PersistMobileTimerboxCollapsedOptions
): boolean {
  const opts = options || {};
  const storage = opts.storageLike || null;
  if (!storage || typeof storage.setItem !== "function") return false;

  try {
    storage.setItem(resolveStorageKey(opts.storageKey), opts.collapsed ? "1" : "0");
    return true;
  } catch (_err) {
    return false;
  }
}

export function getTimerboxToggleIconSvg(collapsed: boolean): string {
  return collapsed ? ICON_COLLAPSED : ICON_EXPANDED;
}

export function resolveMobileTimerboxDisplayModel(
  options: ResolveMobileTimerboxDisplayModelOptions
): MobileTimerboxDisplayModel {
  const opts = options || {};
  const showToggle = !!opts.collapsible && !opts.timerModuleHidden;
  if (!showToggle) {
    return {
      showToggle: false,
      toggleDisplay: "none",
      ariaExpanded: "false",
      label: LABEL_EXPAND,
      iconSvg: ICON_COLLAPSED,
      expanded: false
    };
  }

  const collapsed = typeof opts.collapsed === "boolean" ? opts.collapsed : true;
  const expanded = !collapsed;
  return {
    showToggle: true,
    toggleDisplay: "inline-flex",
    ariaExpanded: expanded ? "true" : "false",
    label: expanded ? LABEL_COLLAPSE : LABEL_EXPAND,
    iconSvg: getTimerboxToggleIconSvg(collapsed),
    expanded
  };
}
