export const NO_X_FORBIDDEN_TILE_OPTIONS = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768] as const;
export const DEFAULT_NO_X_FORBIDDEN_TILE = 8192;

export interface NoXSelectionDocumentLike {
  body?: {
    appendChild?: (node: NoXSelectionElementLike) => unknown;
    setAttribute?: (name: string, value: string) => void;
    removeAttribute?: (name: string) => void;
  } | null;
  documentElement?: {
    getAttribute?: (name: string) => string | null;
  } | null;
  createElement?: (tagName: string) => NoXSelectionElementLike;
  getElementById?: (id: string) => NoXSelectionElementLike | null;
}

export interface NoXSelectionElementLike {
  id?: string;
  type?: string;
  textContent?: string | null;
  style: Record<string, string>;
  parentNode?: {
    removeChild?: (node: NoXSelectionElementLike) => unknown;
  } | null;
  appendChild?: (node: NoXSelectionElementLike) => unknown;
  setAttribute?: (name: string, value: string) => void;
  addEventListener?: (name: string, listener: () => void) => void;
}

export interface NoXSelectionStorageLike {
  getItem?: (key: string) => string | null;
}

export interface NoXSelectionWindowLike {
  document?: NoXSelectionDocumentLike | null;
  localStorage?: NoXSelectionStorageLike | null;
  GAME_MODE_CONFIG?: unknown;
  UII18N?: {
    getLanguage?: () => unknown;
  } | null;
  CorePlayHeaderRuntime?: {
    resolvePlayHeaderState?: unknown;
  } | null;
  CorePlayHeaderHostRuntime?: {
    resolvePlayHeaderFromContext?: (context: {
      modeConfig: unknown;
      documentLike: NoXSelectionDocumentLike | null;
      resolveHeaderState: unknown;
    }) => unknown;
  } | null;
  getDocumentLike?: () => NoXSelectionDocumentLike | null;
}

export interface NoXSelectionManagerLike {
  document?: NoXSelectionDocumentLike | null;
  mode?: unknown;
  modeKey?: unknown;
  modeConfig?: unknown;
  specialRules?: unknown;
  noXSelectionPending?: boolean;
  noXPendingDefaultTarget?: unknown;
  getWindowLike?: () => NoXSelectionWindowLike | null;
}

export interface NoXSelectionSetupOptions {
  noXTarget?: unknown;
  skipNoXSelection?: boolean;
}

export interface NoXSelectionRuntime {
  ensureNoXSelectionOverlayForManager: typeof ensureNoXSelectionOverlayForManager;
  removeNoXSelectionOverlay: typeof removeNoXSelectionOverlay;
  applyNoXSelectionToManager: typeof applyNoXSelectionToManager;
  applySavedNoXSelectionState: typeof applySavedNoXSelectionState;
  buildSavedGameStateNoXSelectionPayload: typeof buildSavedGameStateNoXSelectionPayload;
  resolveSetupNoXModeConfig: typeof resolveSetupNoXModeConfig;
  resolveNoXSelectionOverlayId: typeof resolveNoXSelectionOverlayId;
}

export interface NoXSelectionRuntimeWindowLike {
  CoreNoXSelectionRuntime?: NoXSelectionRuntime;
}

export interface NoXSelectionRuntimeInstallOptions {
  windowLike?: NoXSelectionRuntimeWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function resolveNoXForbiddenTileOption(rawValue: unknown): number | null {
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) return null;
  return (NO_X_FORBIDDEN_TILE_OPTIONS as readonly number[]).includes(value) ? value : null;
}

function formatNoXForbiddenTileLabel(value: unknown): string {
  const resolved = resolveNoXForbiddenTileOption(value);
  if (resolved === null) return "";
  if (resolved < 1024) return String(resolved);
  return `${Math.round(resolved / 1024)}k`;
}

function isNoXModeConfig(modeConfig: unknown): boolean {
  if (!isRecord(modeConfig)) return false;
  const key = String(modeConfig.key || "").toLowerCase();
  if (key.includes("nox_") || key.includes("no_x")) return true;
  const specialRules = modeConfig.special_rules;
  return isRecord(specialRules) && specialRules.no_x_enabled === true;
}

function resolveNoXForbiddenTileFromModeConfig(modeConfig: unknown): number | null {
  if (!isRecord(modeConfig) || !isRecord(modeConfig.special_rules)) return null;
  return resolveNoXForbiddenTileOption(modeConfig.special_rules.no_x_target);
}

function ensureNoXSpecialRulesObject(modeConfig: unknown): Record<string, unknown> | null {
  if (!isRecord(modeConfig)) return null;
  if (!isRecord(modeConfig.special_rules)) {
    modeConfig.special_rules = {};
  }
  return modeConfig.special_rules as Record<string, unknown>;
}

function applyNoXSelectionToModeConfig(modeConfig: unknown, forbiddenTile: number): void {
  const rules = ensureNoXSpecialRulesObject(modeConfig);
  if (!rules) return;
  rules.no_x_enabled = true;
  rules.no_x_target = forbiddenTile;
}

function resolveSavedNoXTarget(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const target = Math.floor(numeric);
  return target === numeric ? target : null;
}

function resolveSavedNoXTargetFromSource(source: unknown): number | null {
  if (!isRecord(source)) return null;
  const direct = resolveSavedNoXTarget(source.no_x_target);
  if (direct !== null) return direct;
  return isRecord(source.special_rules_snapshot)
    ? resolveSavedNoXTarget(source.special_rules_snapshot.no_x_target)
    : null;
}

function isNoXManager(manager: NoXSelectionManagerLike | null | undefined): boolean {
  if (!manager) return false;
  const modeKey = String(manager.modeKey || manager.mode || "").toLowerCase();
  if (modeKey.startsWith("nox_") || modeKey.includes("no_x")) return true;
  if (isRecord(manager.specialRules) && manager.specialRules.no_x_enabled === true) return true;
  return isNoXModeConfig(manager.modeConfig);
}

export function buildSavedGameStateNoXSelectionPayload(
  manager: NoXSelectionManagerLike | null | undefined
): Record<string, unknown> {
  if (!isNoXManager(manager)) return {};
  const fromRules = isRecord(manager?.specialRules)
    ? resolveSavedNoXTarget(manager.specialRules.no_x_target)
    : null;
  return {
    no_x_target: fromRules ?? resolveNoXForbiddenTileFromModeConfig(manager?.modeConfig),
    no_x_selection_pending: manager?.noXSelectionPending === true
  };
}

export function applySavedNoXSelectionState(
  manager: NoXSelectionManagerLike | null | undefined,
  saved: unknown
): void {
  if (!manager || !isNoXManager(manager)) return;
  const target = resolveSavedNoXTargetFromSource(saved);
  if (target === null) return;
  const pending = isRecord(saved) && saved.no_x_selection_pending === true;
  if (!pending && resolveNoXForbiddenTileOption(target) !== null) {
    applyNoXSelectionToManager(manager, target);
    manager.noXPendingDefaultTarget = target;
    manager.noXSelectionPending = false;
    return;
  }
  applyNoXSelectionToModeConfig(manager.modeConfig, target);
  if (isRecord(manager.specialRules)) {
    manager.specialRules.no_x_enabled = true;
    manager.specialRules.no_x_target = target;
  }
  const windowLike = resolveWindowLike(manager);
  if (isRecord(windowLike?.GAME_MODE_CONFIG)) {
    applyNoXSelectionToModeConfig(windowLike.GAME_MODE_CONFIG, target);
  }
  manager.noXPendingDefaultTarget = target;
  manager.noXSelectionPending = pending;
}

function resolveWindowLike(manager: NoXSelectionManagerLike | null | undefined): NoXSelectionWindowLike | null {
  return manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
}

function resolveNoXSelectionDocumentLike(
  manager: NoXSelectionManagerLike | null | undefined,
  windowLike: NoXSelectionWindowLike | null
): NoXSelectionDocumentLike | null {
  if (manager?.document) return manager.document;
  if (windowLike?.document) return windowLike.document;
  if (windowLike && typeof windowLike.getDocumentLike === "function") {
    return windowLike.getDocumentLike() || null;
  }
  if (typeof document !== "undefined") return document as unknown as NoXSelectionDocumentLike;
  return null;
}

function resolveNoXSelectionElementById(
  manager: NoXSelectionManagerLike | null | undefined,
  windowLike: NoXSelectionWindowLike | null,
  elementId: string
): NoXSelectionElementLike | null {
  const documentLike = resolveNoXSelectionDocumentLike(manager, windowLike);
  if (!documentLike || typeof documentLike.getElementById !== "function") return null;
  return documentLike.getElementById(elementId);
}

function setNoXSelectionPendingState(manager: NoXSelectionManagerLike | null | undefined, pending: boolean): void {
  if (!manager) return;
  manager.noXSelectionPending = pending === true;
  const documentLike = resolveNoXSelectionDocumentLike(manager, resolveWindowLike(manager));
  const body = documentLike?.body;
  if (!(body && typeof body.setAttribute === "function")) return;
  if (manager.noXSelectionPending) {
    body.setAttribute("data-no-x-selecting", "1");
  } else if (typeof body.removeAttribute === "function") {
    body.removeAttribute("data-no-x-selecting");
  }
}

export function resolveNoXSelectionOverlayId(): string {
  return "no-x-selection-overlay";
}

export function removeNoXSelectionOverlay(manager: NoXSelectionManagerLike | null | undefined): void {
  if (!manager) return;
  const windowLike = resolveWindowLike(manager);
  const overlay = resolveNoXSelectionElementById(manager, windowLike, resolveNoXSelectionOverlayId());
  if (overlay?.parentNode && typeof overlay.parentNode.removeChild === "function") {
    overlay.parentNode.removeChild(overlay);
  }
}

function normalizeNoXSelectionLanguage(value: unknown): "en" | "zh" | "" {
  const lang = String(value || "").trim().toLowerCase();
  if (lang.indexOf("en") === 0) return "en";
  if (lang.indexOf("zh") === 0) return "zh";
  return "";
}

function resolveNoXSelectionLanguage(
  manager: NoXSelectionManagerLike | null | undefined,
  windowLike: NoXSelectionWindowLike | null
): "en" | "zh" {
  try {
    const fromI18n = normalizeNoXSelectionLanguage(windowLike?.UII18N?.getLanguage?.());
    if (fromI18n) return fromI18n;
  } catch (_error) {}
  try {
    const storage = windowLike?.localStorage || null;
    const fromStorage = normalizeNoXSelectionLanguage(
      storage && typeof storage.getItem === "function" ? storage.getItem("ui_language_v1") : ""
    );
    if (fromStorage) return fromStorage;
  } catch (_error) {}
  try {
    const root = resolveNoXSelectionDocumentLike(manager, windowLike)?.documentElement;
    const fromRoot = normalizeNoXSelectionLanguage(root?.getAttribute?.("data-ui-lang") || root?.getAttribute?.("lang"));
    if (fromRoot) return fromRoot;
  } catch (_error) {}
  return "zh";
}

function buildNoXSelectionTitle(
  manager: NoXSelectionManagerLike | null | undefined,
  windowLike: NoXSelectionWindowLike | null
): string {
  return resolveNoXSelectionLanguage(manager, windowLike) === "en" ? "Choose forbidden X" : "\u9009\u62e9 NO X \u7684 X";
}

function buildNoXSelectionSubtitle(
  manager: NoXSelectionManagerLike | null | undefined,
  windowLike: NoXSelectionWindowLike | null
): string {
  return resolveNoXSelectionLanguage(manager, windowLike) === "en"
    ? "Click one option. If X appears, game ends."
    : "\u70b9\u51fb\u9009\u62e9 64~32k\uff0c\u82e5\u5408\u6210\u51fa X \u6570\uff0c\u672c\u5c40\u7acb\u5373\u7ed3\u675f\u3002";
}

function syncNoXHeaderStateAfterSelection(manager: NoXSelectionManagerLike): void {
  const windowLike = resolveWindowLike(manager);
  const playHeaderRuntime = windowLike?.CorePlayHeaderRuntime;
  const playHeaderHostRuntime = windowLike?.CorePlayHeaderHostRuntime;
  if (!(playHeaderRuntime && typeof playHeaderRuntime.resolvePlayHeaderState === "function")) return;
  if (!(playHeaderHostRuntime && typeof playHeaderHostRuntime.resolvePlayHeaderFromContext === "function")) return;
  playHeaderHostRuntime.resolvePlayHeaderFromContext({
    modeConfig: manager.modeConfig,
    documentLike: resolveNoXSelectionDocumentLike(manager, windowLike),
    resolveHeaderState: playHeaderRuntime.resolvePlayHeaderState
  });
}

export function applyNoXSelectionToManager(
  manager: NoXSelectionManagerLike | null | undefined,
  forbiddenTile: unknown
): void {
  if (!manager) return;
  const resolved = resolveNoXForbiddenTileOption(forbiddenTile);
  if (resolved === null) return;
  applyNoXSelectionToModeConfig(manager.modeConfig, resolved);
  if (isRecord(manager.specialRules)) {
    manager.specialRules.no_x_enabled = true;
    manager.specialRules.no_x_target = resolved;
  }
  const windowLike = resolveWindowLike(manager);
  if (isRecord(windowLike?.GAME_MODE_CONFIG)) {
    applyNoXSelectionToModeConfig(windowLike?.GAME_MODE_CONFIG, resolved);
  }
  manager.noXPendingDefaultTarget = resolved;
  syncNoXHeaderStateAfterSelection(manager);
}

function createNoXSelectionOptionButton(
  documentLike: NoXSelectionDocumentLike,
  manager: NoXSelectionManagerLike,
  value: number,
  selectedValue: number
): NoXSelectionElementLike {
  const button = documentLike.createElement?.("button");
  if (!button) throw new Error("NO X selection document cannot create button");
  button.type = "button";
  button.setAttribute?.("data-no-x-value", String(value));
  button.setAttribute?.("class", `no-x-selection-option${value === selectedValue ? " is-selected" : ""}`);
  button.textContent = `NO ${formatNoXForbiddenTileLabel(value).toUpperCase()}`;
  button.style.padding = "10px 12px";
  button.style.borderRadius = "8px";
  button.style.border = value === selectedValue ? "2px solid #8f7a66" : "1px solid #c9bfb1";
  button.style.background = value === selectedValue ? "#f3eee6" : "#fff";
  button.style.color = "#5f574f";
  button.style.fontSize = "16px";
  button.style.fontWeight = "700";
  button.style.cursor = "pointer";
  button.style.transition = "all 0.12s ease";
  button.addEventListener?.("click", () => {
    applyNoXSelectionToManager(manager, value);
    setNoXSelectionPendingState(manager, false);
    removeNoXSelectionOverlay(manager);
  });
  return button;
}

export function ensureNoXSelectionOverlayForManager(manager: NoXSelectionManagerLike | null | undefined): void {
  if (!manager) return;
  const windowLike = resolveWindowLike(manager);
  const documentLike = resolveNoXSelectionDocumentLike(manager, windowLike);
  if (!(documentLike?.body && typeof documentLike.createElement === "function")) return;
  removeNoXSelectionOverlay(manager);

  if (!isNoXModeConfig(manager.modeConfig) || manager.noXSelectionPending !== true) return;

  let selectedValue = resolveNoXForbiddenTileOption(manager.noXPendingDefaultTarget);
  if (selectedValue === null) selectedValue = resolveNoXForbiddenTileFromModeConfig(manager.modeConfig);
  if (selectedValue === null) selectedValue = DEFAULT_NO_X_FORBIDDEN_TILE;

  const overlay = documentLike.createElement("div");
  overlay.id = resolveNoXSelectionOverlayId();
  overlay.setAttribute?.("class", "no-x-selection-overlay");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "4000";
  overlay.style.background = "rgba(32,24,17,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";

  const panel = documentLike.createElement("div");
  panel.setAttribute?.("class", "no-x-selection-panel");
  panel.style.width = "min(520px, 96vw)";
  panel.style.background = "#fbf8f1";
  panel.style.border = "1px solid #d8ccbc";
  panel.style.borderRadius = "12px";
  panel.style.boxShadow = "0 16px 38px rgba(0,0,0,0.25)";
  panel.style.padding = "18px 16px 16px";
  panel.style.boxSizing = "border-box";

  const title = documentLike.createElement("div");
  title.setAttribute?.("class", "no-x-selection-title");
  title.textContent = buildNoXSelectionTitle(manager, windowLike);
  title.style.fontSize = "20px";
  title.style.fontWeight = "700";
  title.style.color = "#5a5249";
  title.style.marginBottom = "6px";
  panel.appendChild?.(title);

  const subtitle = documentLike.createElement("div");
  subtitle.setAttribute?.("class", "no-x-selection-subtitle");
  subtitle.textContent = buildNoXSelectionSubtitle(manager, windowLike);
  subtitle.style.fontSize = "14px";
  subtitle.style.color = "#7b7167";
  subtitle.style.marginBottom = "14px";
  panel.appendChild?.(subtitle);

  const grid = documentLike.createElement("div");
  grid.setAttribute?.("class", "no-x-selection-grid");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(86px, 1fr))";
  grid.style.gap = "10px";
  for (let index = 0; index < NO_X_FORBIDDEN_TILE_OPTIONS.length; index += 1) {
    grid.appendChild?.(
      createNoXSelectionOptionButton(documentLike, manager, NO_X_FORBIDDEN_TILE_OPTIONS[index], selectedValue)
    );
  }
  panel.appendChild?.(grid);
  overlay.appendChild?.(panel);
  documentLike.body.appendChild?.(overlay);
}

export function resolveSetupNoXModeConfig(
  manager: NoXSelectionManagerLike | null | undefined,
  modeConfig: unknown,
  setupOptions: NoXSelectionSetupOptions | null | undefined,
  inputSeed: unknown
): unknown {
  if (!isNoXModeConfig(modeConfig)) {
    setNoXSelectionPendingState(manager, false);
    removeNoXSelectionOverlay(manager);
    return modeConfig;
  }

  let selectedValue = resolveNoXForbiddenTileOption(setupOptions?.noXTarget);
  if (selectedValue === null) selectedValue = resolveNoXForbiddenTileFromModeConfig(modeConfig);
  if (selectedValue === null) selectedValue = DEFAULT_NO_X_FORBIDDEN_TILE;

  applyNoXSelectionToModeConfig(modeConfig, selectedValue);
  if (manager) {
    manager.noXPendingDefaultTarget = selectedValue;
  }

  const shouldRequireSelection = setupOptions?.skipNoXSelection !== true && typeof inputSeed === "undefined";
  setNoXSelectionPendingState(manager, shouldRequireSelection);
  return modeConfig;
}

export function createNoXSelectionRuntime(): NoXSelectionRuntime {
  return {
    ensureNoXSelectionOverlayForManager,
    removeNoXSelectionOverlay,
    applyNoXSelectionToManager,
    applySavedNoXSelectionState,
    buildSavedGameStateNoXSelectionPayload,
    resolveSetupNoXModeConfig,
    resolveNoXSelectionOverlayId
  };
}

export function installNoXSelectionRuntime(
  options: NoXSelectionRuntimeInstallOptions = {}
): NoXSelectionRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as NoXSelectionRuntimeWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreNoXSelectionRuntime) {
    target.CoreNoXSelectionRuntime = createNoXSelectionRuntime();
  }
  return target.CoreNoXSelectionRuntime;
}
