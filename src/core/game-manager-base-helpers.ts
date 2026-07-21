import {
  matchCustomSecondaryTimerRule,
  parseCustomSecondaryTimerRules,
  readCustomSecondaryTimerRuleText,
  resolveCustomSecondaryTimerFamily,
  type CustomSecondaryTimerHitKind,
  type CustomSecondaryTimerRule
} from "./custom-secondary-timers";

export interface CoreCallResultLike<T = unknown> {
  available?: unknown;
  value?: T;
}

export type CoreFallbackResolver<T = unknown> = (this: CoreBaseHelperManagerLike) => T;
export type CoreValueNormalizer<T = unknown> = (this: CoreBaseHelperManagerLike, value: unknown) => T;
export type CoreRawValueHandler = (this: CoreBaseHelperManagerLike, value: unknown) => void;

export interface CoreBaseHelperManagerLike {
  isCoreCallAvailable?: (coreCallResult: unknown) => boolean;
  mode?: unknown;
  modeKey?: unknown;
  createCoreModeDefaultsPayload?: (payload: unknown) => unknown;
  resolveNormalizedCoreValueOrUndefined?: (
    coreCallResult: unknown,
    normalizer?: unknown
  ) => unknown;
  clonePlain?: (value: unknown) => unknown;
  hasOwnKey?: (target: unknown, key: PropertyKey) => boolean;
}

function isRecordLike(value: unknown): value is Record<PropertyKey, unknown> {
  return !!value && (typeof value === "object" || typeof value === "function");
}

function isCoreHelperRecordObject(value: unknown): value is Record<PropertyKey, unknown> {
  return !!value && typeof value === "object";
}

function resolveIsCoreCallAvailable(manager: CoreBaseHelperManagerLike, coreCallResult: unknown): boolean {
  if (typeof manager.isCoreCallAvailable === "function") {
    return manager.isCoreCallAvailable(coreCallResult);
  }
  return isCoreCallAvailable(coreCallResult);
}

export function isCoreCallAvailable(coreCallResult: unknown): boolean {
  return !!(isRecordLike(coreCallResult) && coreCallResult.available === true);
}

export function resolveCoreObjectCallOrFallback<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike<T> | null | undefined,
  fallbackResolver?: CoreFallbackResolver<T | null> | null
): T | Record<string, never> | null {
  if (!manager) return null;
  const coreValue = resolveIsCoreCallAvailable(manager, coreCallResult)
    ? (coreCallResult?.value || {})
    : null;
  if (coreValue) return coreValue as T | Record<string, never>;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return null;
}

export function resolveCoreBooleanCallOrFallback(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  fallbackResolver?: CoreFallbackResolver<unknown> | null
): boolean | null {
  if (!manager) return null;
  const coreValue = resolveIsCoreCallAvailable(manager, coreCallResult)
    ? !!coreCallResult?.value
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return !!fallbackResolver.call(manager);
  return null;
}

export function resolveCoreNumericCallOrFallback(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  fallbackResolver?: CoreFallbackResolver<unknown> | null
): number | null {
  if (!manager) return null;
  const coreValue = resolveIsCoreCallAvailable(manager, coreCallResult)
    ? (Number(coreCallResult?.value) || 0)
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return Number(fallbackResolver.call(manager)) || 0;
  return null;
}

export function resolveCoreStringCallOrFallback(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  fallbackResolver?: CoreFallbackResolver<unknown> | null,
  allowEmpty?: boolean
): string | null {
  if (!manager) return null;
  let coreValue: string | null = null;
  if (resolveIsCoreCallAvailable(manager, coreCallResult)) {
    const rawCoreString = coreCallResult?.value;
    if (typeof rawCoreString === "string") {
      coreValue = allowEmpty === true ? rawCoreString : rawCoreString || null;
    }
  }
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return String(fallbackResolver.call(manager));
  return null;
}

export function resolveNormalizedCoreValueOrUndefined<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  normalizer?: CoreValueNormalizer<T> | null | unknown
): T | unknown | undefined {
  if (!manager) return undefined;
  if (!resolveIsCoreCallAvailable(manager, coreCallResult)) return undefined;
  if (typeof normalizer !== "function") return coreCallResult?.value;
  return normalizer.call(manager, coreCallResult?.value);
}

function resolveNormalizedCoreValueWithFallbackMode<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  normalizer?: CoreValueNormalizer<T> | null | unknown,
  fallbackResolver?: CoreFallbackResolver<T> | null,
  allowNull?: boolean
): T | unknown | undefined {
  if (!manager) return undefined;
  const normalized =
    typeof manager.resolveNormalizedCoreValueOrUndefined === "function"
      ? manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer)
      : resolveNormalizedCoreValueOrUndefined(manager, coreCallResult, normalizer);
  if (allowNull === true) {
    if (typeof normalized !== "undefined") return normalized;
  } else if (typeof normalized !== "undefined" && normalized !== null) {
    return normalized;
  }
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

export function resolveNormalizedCoreValueOrFallback<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  normalizer?: CoreValueNormalizer<T> | null | unknown,
  fallbackResolver?: CoreFallbackResolver<T> | null
): T | unknown | undefined {
  return resolveNormalizedCoreValueWithFallbackMode(manager, coreCallResult, normalizer, fallbackResolver, false);
}

export function resolveNormalizedCoreValueOrFallbackAllowNull<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  normalizer?: CoreValueNormalizer<T> | null | unknown,
  fallbackResolver?: CoreFallbackResolver<T> | null
): T | unknown | undefined {
  return resolveNormalizedCoreValueWithFallbackMode(manager, coreCallResult, normalizer, fallbackResolver, true);
}

export function resolveCoreRawCallValueOrUndefined(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined
): unknown {
  if (!manager) return undefined;
  if (!resolveIsCoreCallAvailable(manager, coreCallResult)) return undefined;
  return coreCallResult?.value;
}

export function tryHandleCoreRawValue(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  handler?: CoreRawValueHandler | null
): boolean {
  if (!manager) return false;
  const coreValue = resolveCoreRawCallValueOrUndefined(manager, coreCallResult);
  if (typeof coreValue === "undefined") return false;
  if (typeof handler === "function") {
    handler.call(manager, coreValue);
  }
  return true;
}

export function isNonArrayObject(value: unknown): boolean {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveDefaultModeKey(): unknown {
  const globalRecord = typeof globalThis === "undefined"
    ? null
    : (globalThis as unknown as { GameManager?: { DEFAULT_MODE_KEY?: unknown } });
  return globalRecord?.GameManager?.DEFAULT_MODE_KEY;
}

export function createCoreModeDefaultsPayload(payload: unknown): Record<PropertyKey, unknown> {
  const source = isCoreHelperRecordObject(payload) ? payload : {};
  return Object.assign(
    {
      defaultModeKey: resolveDefaultModeKey()
    },
    source
  );
}

export function createCoreModeContextPayload(
  manager: CoreBaseHelperManagerLike | null | undefined,
  payload: unknown
): unknown {
  if (!manager) return createCoreModeDefaultsPayload(payload);
  const source = isCoreHelperRecordObject(payload) ? payload : {};
  if (typeof manager.createCoreModeDefaultsPayload === "function") {
    return manager.createCoreModeDefaultsPayload(
      Object.assign(
        {
          currentModeKey: manager.modeKey,
          currentMode: manager.mode
        },
        source
      )
    );
  }
  return createCoreModeDefaultsPayload(
    Object.assign(
      {
        currentModeKey: manager.modeKey,
        currentMode: manager.mode
      },
      source
    )
  );
}

export function createUnavailableCoreCallResult(): { available: false; value: null } {
  return {
    available: false,
    value: null
  };
}

export function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function safeClonePlain<T>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  value: unknown,
  fallback: T
): T | unknown {
  if (!manager) return fallback;
  try {
    if (typeof manager.clonePlain !== "function") return fallback;
    return manager.clonePlain(value);
  } catch (_err) {
    return fallback;
  }
}

export function hasOwnKey(target: unknown, key: PropertyKey): boolean {
  if (!target || (typeof target !== "object" && typeof target !== "function")) return false;
  return Object.prototype.hasOwnProperty.call(target, key);
}

export function readOptionValue<T>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  options: unknown,
  key: PropertyKey,
  fallbackValue: T
): unknown | T {
  if (!manager) return fallbackValue;
  if (!isCoreHelperRecordObject(options)) return fallbackValue;
  const ownsKey =
    typeof manager.hasOwnKey === "function"
      ? manager.hasOwnKey(options, key)
      : hasOwnKey(options, key);
  return ownsKey ? options[key] : fallbackValue;
}

export interface SecondaryTimerStyleLike {
  display?: string;
  paddingLeft?: string;
  color?: string;
  fontSize?: string;
  marginLeft?: string;
  width?: string;
  cursor?: string;
  visibility?: string;
  pointerEvents?: string;
}

export interface SecondaryTimerNodeLike {
  id?: string;
  nodeType?: number;
  nodeValue?: string | null;
  tagName?: string;
  parentNode?: SecondaryTimerElementLike | null;
  nextSibling?: SecondaryTimerNodeLike | null;
}

export interface SecondaryTimerElementLike extends SecondaryTimerNodeLike {
  className?: string;
  textContent?: string;
  innerText?: string;
  style?: SecondaryTimerStyleLike;
  children?: SecondaryTimerElementLike[];
  firstChild?: SecondaryTimerNodeLike | null;
  setAttribute?: (name: string, value: string) => void;
  getAttribute?: (name: string) => string | null;
  removeAttribute?: (name: string) => void;
  addEventListener?: (name: string, listener: (event: unknown) => void) => void;
  appendChild?: (node: SecondaryTimerNodeLike) => SecondaryTimerNodeLike;
  insertBefore?: (node: SecondaryTimerNodeLike, anchor: SecondaryTimerNodeLike | null) => SecondaryTimerNodeLike;
  removeChild?: (node: SecondaryTimerNodeLike) => SecondaryTimerNodeLike;
  querySelector?: (selector: string) => SecondaryTimerElementLike | null;
}

export interface SecondaryTimerDocumentLike {
  createElement?: (tagName: string) => SecondaryTimerElementLike;
  getElementById?: (id: string) => SecondaryTimerElementLike | null;
}

type SecondaryTimerDocumentWithCreateElement = SecondaryTimerDocumentLike & {
  createElement: (tagName: string) => SecondaryTimerElementLike;
};

export interface SecondaryTimerDescriptorLike {
  parent?: unknown;
  child?: unknown;
  rule?: CustomSecondaryTimerRule | null;
  ruleKey?: unknown;
  rowId?: unknown;
  valueId?: unknown;
  row?: SecondaryTimerElementLike | null;
  timerEl?: SecondaryTimerElementLike | null;
}

interface SecondaryTimerRowBuildContext {
  parent: number;
  child: number;
  rowId: string;
  valueId: string;
  level: number;
  order: number;
}

export interface SecondaryTimerPlacementDebugSnapshot {
  totalDescriptors: number;
  validPlacementDescriptors: number;
  placed: number;
  skippedDuplicate: number;
  skippedMissingAnchor: number;
  dedupeKeyHits: Record<string, number>;
  dedupeStrategyHits: Record<string, number>;
}

export interface SecondaryTimerPlacementDebugSummary {
  totalDescriptors: number;
  validPlacementDescriptors: number;
  placed: number;
  skippedDuplicate: number;
  skippedMissingAnchor: number;
  dedupeKeyKinds: number;
  rowIdStrategyHits: number;
  parentChildStrategyHits: number;
  rowReferenceStrategyHits: number;
}

export interface SecondaryTimerManagerLike extends CoreBaseHelperManagerLike {
  ruleset?: unknown;
  timerMilestones?: unknown;
  timerMilestoneSlotByValue?: unknown;
  customSecondaryTimerRuleText?: unknown;
  customSecondaryTimerRules?: unknown;
  sessionReplayV1?: unknown;
  sessionReplayV3?: unknown;
  secondaryTimerExpandedByParent?: unknown;
  secondaryTimerPlacementDebugSnapshot?: unknown;
  secondaryTimerPlacementDebugSummary?: unknown;
  elements?: unknown;
  documentLike?: SecondaryTimerDocumentLike | null;
  getTimerRowEl?: (value: number) => SecondaryTimerElementLike | null;
  callWindowMethod?: (name: string, args?: unknown[]) => unknown;
  getWindowLike?: () => { localStorage?: unknown } | null;
  grid?: {
    eachCell?: (callback: (x: number, y: number, tile: { value?: unknown } | null) => void) => void;
  } | null;
  resolveSecondaryTimerDescriptors?: () => SecondaryTimerDescriptorLike[];
}

type SecondaryTimerPlacementInfo = {
  key: string;
  parent: number;
  row: SecondaryTimerElementLike;
  dedupeKey: string;
};

function resolveGameManagerTimerSlotIds(): unknown[] {
  const globalRecord = typeof globalThis === "undefined"
    ? null
    : (globalThis as unknown as { GameManager?: { TIMER_SLOT_IDS?: unknown } });
  const slots = globalRecord?.GameManager?.TIMER_SLOT_IDS;
  return Array.isArray(slots) ? slots : [];
}

export function normalizeSecondaryTimerValue(rawValue: unknown): number | null {
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

export function isSecondaryTimerPowerOfTwo(rawValue: unknown): boolean {
  const value = normalizeSecondaryTimerValue(rawValue);
  if (value === null) return false;
  return (value & (value - 1)) === 0;
}

export function getSecondaryTimerSlotIds(): unknown[] {
  return resolveGameManagerTimerSlotIds();
}

export function resolveSecondaryTimerSlotIndexByValue(slotValue: unknown): number {
  const slots = getSecondaryTimerSlotIds();
  for (let index = 0; index < slots.length; index += 1) {
    if (Number(slots[index]) === Number(slotValue)) return index;
  }
  return -1;
}

export function resolveSecondaryTimerDisplayValueBySlot(
  manager: SecondaryTimerManagerLike | null | undefined,
  slotValue: unknown
): number | null {
  const slot = normalizeSecondaryTimerValue(slotValue);
  if (slot === null) return null;
  const milestones = manager && Array.isArray(manager.timerMilestones) ? manager.timerMilestones : null;
  const slotIndex = resolveSecondaryTimerSlotIndexByValue(slot);
  if (slotIndex >= 0 && milestones && slotIndex < milestones.length) {
    const mapped = normalizeSecondaryTimerValue(milestones[slotIndex]);
    if (mapped !== null) return mapped;
  }
  return slot;
}

function resolveSecondaryTimerSlotFromMilestoneMap(
  manager: SecondaryTimerManagerLike | null | undefined,
  value: number
): number | null {
  const slotByMilestone =
    manager && isCoreHelperRecordObject(manager.timerMilestoneSlotByValue)
      ? manager.timerMilestoneSlotByValue
      : null;
  if (!slotByMilestone || !Object.prototype.hasOwnProperty.call(slotByMilestone, String(value))) {
    return null;
  }
  return normalizeSecondaryTimerValue(slotByMilestone[String(value)]);
}

function resolveSecondaryTimerSlotFromMilestoneList(
  manager: SecondaryTimerManagerLike | null | undefined,
  value: number
): number | null {
  const milestones = manager && Array.isArray(manager.timerMilestones) ? manager.timerMilestones : null;
  if (!milestones) return null;
  const slots = getSecondaryTimerSlotIds();
  for (let index = 0; index < milestones.length; index += 1) {
    if (Number(milestones[index]) !== value) continue;
    if (index >= slots.length) return null;
    return normalizeSecondaryTimerValue(slots[index]);
  }
  return null;
}

export function resolveSecondaryTimerSlotByValue(
  manager: SecondaryTimerManagerLike | null | undefined,
  rawValue: unknown
): number | null {
  const value = normalizeSecondaryTimerValue(rawValue);
  if (value === null) return null;

  const mappedSlot = resolveSecondaryTimerSlotFromMilestoneMap(manager, value);
  if (mappedSlot !== null) return mappedSlot;
  if (resolveSecondaryTimerSlotIndexByValue(value) >= 0) return value;

  return resolveSecondaryTimerSlotFromMilestoneList(manager, value) || value;
}

function getCustomSecondaryTimerRules(
  manager: SecondaryTimerManagerLike | null | undefined
): CustomSecondaryTimerRule[] {
  const rules = manager && Array.isArray(manager.customSecondaryTimerRules)
    ? manager.customSecondaryTimerRules
    : [];
  return rules.filter((rule): rule is CustomSecondaryTimerRule => {
    return !!rule && typeof rule === "object" && typeof rule.expression === "string";
  });
}

export function getSecondaryTimerParentValues(
  manager?: SecondaryTimerManagerLike | null
): number[] {
  const rules = getCustomSecondaryTimerRules(manager);
  const parents: number[] = [];
  const seen = new Set<number>();
  for (let index = 0; index < rules.length; index += 1) {
    const value = normalizeSecondaryTimerValue(rules[index].parent);
    if (value === null) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    parents.push(value);
  }
  return parents;
}

export function getSecondaryTimerChildValues(parentValue: unknown): number[] {
  const parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null || parent < 8192 || !isSecondaryTimerPowerOfTwo(parent)) return [];
  const children: number[] = [];
  let child = Math.floor(parent / 2);
  while (child >= 2048) {
    if (isSecondaryTimerPowerOfTwo(child)) children.push(child);
    child = Math.floor(child / 2);
  }
  return children;
}

export function getSecondaryTimerExpandedStateMap(
  manager: SecondaryTimerManagerLike | null | undefined
): Record<PropertyKey, unknown> {
  if (!manager) return {};
  if (!isCoreHelperRecordObject(manager.secondaryTimerExpandedByParent)) {
    manager.secondaryTimerExpandedByParent = {};
  }
  return manager.secondaryTimerExpandedByParent as Record<PropertyKey, unknown>;
}

export function isSecondaryTimerParentExpanded(
  manager: SecondaryTimerManagerLike | null | undefined,
  parentValue: unknown
): boolean {
  if (!manager) return false;
  const parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return false;
  const expandedMap = getSecondaryTimerExpandedStateMap(manager);
  return expandedMap[String(parent)] === true;
}

export function setSecondaryTimerParentExpanded(
  manager: SecondaryTimerManagerLike | null | undefined,
  parentValue: unknown,
  expanded: unknown
): boolean {
  if (!manager) return false;
  const parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return false;
  const expandedMap = getSecondaryTimerExpandedStateMap(manager);
  expandedMap[String(parent)] = expanded === true;
  return expandedMap[String(parent)] === true;
}

export function toggleSecondaryTimerParentExpanded(
  manager: SecondaryTimerManagerLike | null | undefined,
  parentValue: unknown
): boolean {
  const current = isSecondaryTimerParentExpanded(manager, parentValue);
  return setSecondaryTimerParentExpanded(manager, parentValue, !current);
}

export function collectSecondaryTimerExpandedParents(
  manager: SecondaryTimerManagerLike | null | undefined
): number[] {
  const out: number[] = [];
  if (!manager) return out;
  const parents = getSecondaryTimerParentValues(manager);
  for (let index = 0; index < parents.length; index += 1) {
    const parent = parents[index];
    if (isSecondaryTimerParentExpanded(manager, parent)) out.push(parent);
  }
  return out;
}

export function applySecondaryTimerExpandedParentsState(
  manager: SecondaryTimerManagerLike | null | undefined,
  expandedParents: unknown
): void {
  if (!manager) return;
  const expandedMap = getSecondaryTimerExpandedStateMap(manager);
  for (const key in expandedMap) {
    if (!Object.prototype.hasOwnProperty.call(expandedMap, key)) continue;
    delete expandedMap[key];
  }
  const list = Array.isArray(expandedParents) ? expandedParents : [];
  for (let index = 0; index < list.length; index += 1) {
    const parent = normalizeSecondaryTimerValue(list[index]);
    if (parent === null) continue;
    expandedMap[String(parent)] = true;
  }
}

function isSecondaryTimerToggleTargetBound(element: SecondaryTimerElementLike | null | undefined, parentText: string): boolean {
  return !!(
    element &&
    element.getAttribute &&
    element.getAttribute("data-secondary-toggle-bound") === "1" &&
    element.getAttribute("data-secondary-toggle-parent") === parentText
  );
}

function ensureSecondaryTimerElementStyle(element: SecondaryTimerElementLike): SecondaryTimerStyleLike {
  if (!element.style) element.style = {};
  return element.style;
}

function markSecondaryTimerToggleTargetBound(element: SecondaryTimerElementLike | null | undefined, parentText: string): void {
  if (!element) return;
  if (element.setAttribute) {
    element.setAttribute("data-secondary-toggle-bound", "1");
    element.setAttribute("data-secondary-toggle-parent", parentText);
  }
  ensureSecondaryTimerElementStyle(element).cursor = "pointer";
}

function stopSecondaryTimerToggleEvent(event: unknown): void {
  const source = isRecordLike(event) ? event : {};
  const preventDefault = source.preventDefault;
  if (typeof preventDefault === "function") preventDefault.call(event);
  const stopPropagation = source.stopPropagation;
  if (typeof stopPropagation === "function") stopPropagation.call(event);
}

function callSecondaryTimerWindowMethod(
  manager: SecondaryTimerManagerLike | null | undefined,
  name: string,
  args?: unknown[]
): boolean {
  if (!manager || typeof manager.callWindowMethod !== "function") return false;
  return !!manager.callWindowMethod(name, args);
}

function syncSecondaryTimerToggleScroll(manager: SecondaryTimerManagerLike | null | undefined, expanded: boolean): void {
  if (!manager) return;
  if (expanded) {
    if (!callSecondaryTimerWindowMethod(manager, "cappedTimerScroll", [1])) {
      callSecondaryTimerWindowMethod(manager, "updateTimerScroll");
    }
    return;
  }
  if (!callSecondaryTimerWindowMethod(manager, "cappedTimerScroll", [-1])) {
    callSecondaryTimerWindowMethod(manager, "updateTimerScroll");
  }
}

function handleSecondaryTimerToggleClick(
  manager: SecondaryTimerManagerLike,
  parent: number,
  event: unknown
): void {
  stopSecondaryTimerToggleEvent(event);
  const expanded = toggleSecondaryTimerParentExpanded(manager, parent);
  refreshSecondaryTimerRowsVisibility(manager);
  syncSecondaryTimerToggleScroll(manager, expanded);
}

function bindSecondaryTimerToggleTarget(
  manager: SecondaryTimerManagerLike | null | undefined,
  element: SecondaryTimerElementLike | null | undefined,
  parentValue: unknown
): void {
  if (!manager || !element || typeof element.addEventListener !== "function") return;
  const parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return;
  const parentText = String(parent);
  if (isSecondaryTimerToggleTargetBound(element, parentText)) return;
  markSecondaryTimerToggleTargetBound(element, parentText);
  element.addEventListener("click", (event: unknown) => {
    handleSecondaryTimerToggleClick(manager, parent, event);
  });
}

function resolveSecondaryTimerLegendFromRow(
  row: SecondaryTimerElementLike | null | undefined,
  parent: number
): SecondaryTimerElementLike | null {
  if (!(row && typeof row.querySelector === "function")) return null;
  const parentText = String(parent);
  const legendEl = row.querySelector(".timer-legend-" + parentText);
  if (legendEl) return legendEl;
  return row.querySelector(".timertile");
}

function resolveSecondaryTimerLegendFromTimerBox(
  timerBox: SecondaryTimerElementLike | null | undefined,
  parent: number
): SecondaryTimerElementLike | null {
  if (!(timerBox && typeof timerBox.querySelector === "function")) return null;
  return timerBox.querySelector(".timer-legend-" + String(parent));
}

function resolveSecondaryTimerLegendElementForParent(
  row: SecondaryTimerElementLike | null | undefined,
  timerBox: SecondaryTimerElementLike | null | undefined,
  parent: number
): SecondaryTimerElementLike | null {
  const legendEl = resolveSecondaryTimerLegendFromRow(row, parent);
  if (legendEl) return legendEl;
  return resolveSecondaryTimerLegendFromTimerBox(timerBox, parent);
}

function bindSecondaryTimerToggleTargetsForParent(
  manager: SecondaryTimerManagerLike,
  parent: number,
  row: SecondaryTimerElementLike | null | undefined,
  legendEl: SecondaryTimerElementLike | null | undefined,
  timerEl: SecondaryTimerElementLike | null | undefined
): void {
  bindSecondaryTimerToggleTarget(manager, row, parent);
  bindSecondaryTimerToggleTarget(manager, legendEl, parent);
  bindSecondaryTimerToggleTarget(manager, timerEl, parent);
}

function resolveGlobalManagerElementById(
  manager: SecondaryTimerManagerLike | null | undefined,
  id: string
): SecondaryTimerElementLike | null {
  const globalRecord = typeof globalThis === "undefined"
    ? {}
    : (globalThis as unknown as {
      resolveManagerElementById?: (manager: unknown, id: string) => unknown;
    });
  if (typeof globalRecord.resolveManagerElementById === "function") {
    const resolved = globalRecord.resolveManagerElementById(manager, id);
    if (resolved && typeof resolved === "object") return resolved as SecondaryTimerElementLike;
  }
  return null;
}

function resolveManagerElementById(
  manager: SecondaryTimerManagerLike | null | undefined,
  id: string
): SecondaryTimerElementLike | null {
  if (!manager) return null;
  const resolvedGlobal = resolveGlobalManagerElementById(manager, id);
  if (resolvedGlobal) return resolvedGlobal;
  if (isCoreHelperRecordObject(manager.elements) && Object.prototype.hasOwnProperty.call(manager.elements, id)) {
    const resolved = manager.elements[id];
    return resolved && typeof resolved === "object" ? (resolved as SecondaryTimerElementLike) : null;
  }
  const documentLike = resolveManagerDocumentLike(manager);
  if (documentLike && typeof documentLike.getElementById === "function") {
    return documentLike.getElementById(id);
  }
  return null;
}

export function bindSecondaryTimerParentToggleEvents(manager: SecondaryTimerManagerLike | null | undefined): void {
  if (!manager) return;
  const timerBox = resolveManagerElementById(manager, "timerbox");
  const parents = getSecondaryTimerParentValues(manager);
  for (let index = 0; index < parents.length; index += 1) {
    const parent = parents[index];
    const parentSlot = resolveSecondaryTimerSlotByValue(manager, parent) || parent;
    const row = manager.getTimerRowEl ? manager.getTimerRowEl(parentSlot) : null;
    const timerEl = resolveManagerElementById(manager, "timer" + String(parentSlot));
    const legendEl = resolveSecondaryTimerLegendElementForParent(row, timerBox, parent);
    bindSecondaryTimerToggleTargetsForParent(manager, parent, row, legendEl, timerEl);
  }
}

export function resolveSecondaryTimerRowId(parentValue: unknown, childValue: unknown): string {
  return "timer-row-secondary-" + String(parentValue) + "-" + String(childValue);
}

export function resolveSecondaryTimerValueId(parentValue: unknown, childValue: unknown): string {
  return "timer-secondary-" + String(parentValue) + "-" + String(childValue);
}

function isValidSecondaryTimerParentValue(parent: number | null): boolean {
  if (parent === null) return false;
  if (parent < 8192) return false;
  if (!isSecondaryTimerPowerOfTwo(parent)) return false;
  return true;
}

function isValidSecondaryTimerParentChildPair(parent: number | null, child: number | null): boolean {
  if (!isValidSecondaryTimerParentValue(parent) || child === null) return false;
  if (child < 2048) return false;
  if (parent === null || child >= parent) return false;
  if (!isSecondaryTimerPowerOfTwo(child)) return false;
  return true;
}

export function parseSecondaryTimerRowIdentity(rawRowId: unknown): { parent: number; child: number } | null {
  if (typeof rawRowId !== "string" || !rawRowId) return null;
  const match = /^timer-row-secondary-(\d+)-(\d+)$/.exec(rawRowId);
  if (!match) return null;
  const parent = normalizeSecondaryTimerValue(match[1]);
  const child = normalizeSecondaryTimerValue(match[2]);
  if (!isValidSecondaryTimerParentChildPair(parent, child)) return null;
  return {
    parent: parent as number,
    child: child as number
  };
}

export function resolveSecondaryTimerIndentLevel(parentValue: unknown, childValue: unknown): number {
  const parent = normalizeSecondaryTimerValue(parentValue);
  const child = normalizeSecondaryTimerValue(childValue);
  if (parent === null || child === null || parent <= child) return 0;
  let level = 0;
  let cursor = parent;
  while (cursor > child && cursor >= 4096) {
    cursor = Math.floor(cursor / 2);
    level += 1;
    if (level > 32) break;
  }
  return level;
}

export function resolveSecondaryTimerLegendFontSize(value: unknown): string {
  const slotValue = normalizeSecondaryTimerValue(value) || 2048;
  if (slotValue >= 16384) return "11px";
  if (slotValue >= 1024) return "14px";
  if (slotValue >= 128) return "18px";
  return "22px";
}

export function resolveSecondaryTimerWidthByLevel(level: unknown): number {
  let numericLevel = Number(level);
  if (!Number.isFinite(numericLevel) || numericLevel < 0) numericLevel = 0;
  numericLevel = Math.floor(numericLevel);
  const width = 187 - (numericLevel * 5);
  if (width < 150) return 150;
  return width;
}

function resolveGlobalManagerDocumentLike(
  manager: SecondaryTimerManagerLike | null | undefined
): SecondaryTimerDocumentLike | null {
  const globalRecord = typeof globalThis === "undefined"
    ? {}
    : (globalThis as unknown as {
      resolveManagerDocumentLike?: (manager: unknown) => unknown;
    });
  if (typeof globalRecord.resolveManagerDocumentLike !== "function") return null;
  const resolved = globalRecord.resolveManagerDocumentLike(manager);
  return resolved && typeof resolved === "object" ? (resolved as SecondaryTimerDocumentLike) : null;
}

function resolveManagerDocumentLike(
  manager: SecondaryTimerManagerLike | null | undefined
): SecondaryTimerDocumentLike | null {
  const globalDocument = resolveGlobalManagerDocumentLike(manager);
  if (globalDocument) return globalDocument;
  if (manager?.documentLike) return manager.documentLike;
  if (typeof document !== "undefined") return document as unknown as SecondaryTimerDocumentLike;
  return null;
}

function createSecondaryTimerRowElement(
  manager: SecondaryTimerManagerLike | null | undefined,
  parentValue: unknown,
  childValue: unknown
): SecondaryTimerElementLike | null {
  if (!manager) return null;
  const documentLike = resolveManagerDocumentLike(manager);
  if (!(documentLike && typeof documentLike.createElement === "function")) return null;
  const documentWithCreateElement = documentLike as SecondaryTimerDocumentWithCreateElement;
  const context = resolveSecondaryTimerRowBuildContext(parentValue, childValue);
  if (!context) return null;

  const row = documentWithCreateElement.createElement("div");
  if (!row) return null;

  row.id = context.rowId;
  row.className = "timer-row-item timer-secondary-row";
  configureSecondaryTimerRowElement(row, context);
  row.appendChild?.(createSecondaryTimerLegendElement(documentWithCreateElement, manager, context.child));
  row.appendChild?.(createSecondaryTimerValueElement(documentWithCreateElement, context.valueId, context.level));
  appendSecondaryTimerRowBreaks(documentWithCreateElement, row);
  return row;
}

function resolveSecondaryTimerRowBuildContext(
  parentValue: unknown,
  childValue: unknown
): SecondaryTimerRowBuildContext | null {
  const parent = normalizeSecondaryTimerValue(parentValue);
  const child = normalizeSecondaryTimerValue(childValue);
  if (parent === null || child === null) return null;
  const level = resolveSecondaryTimerIndentLevel(parent, child);
  return {
    parent,
    child,
    rowId: resolveSecondaryTimerRowId(parent, child),
    valueId: resolveSecondaryTimerValueId(parent, child),
    level,
    order: parent + (level / 1000)
  };
}

function configureSecondaryTimerRowElement(
  row: SecondaryTimerElementLike,
  context: SecondaryTimerRowBuildContext
): void {
  row.setAttribute?.("data-secondary-parent", String(context.parent));
  row.setAttribute?.("data-secondary-child", String(context.child));
  row.setAttribute?.("data-secondary-hidden", "1");
  row.setAttribute?.("data-timer-order", String(context.order));
  const rowStyle = ensureSecondaryTimerElementStyle(row);
  rowStyle.display = "none";
  rowStyle.paddingLeft = String(context.level * 5) + "px";
}

function createSecondaryTimerLegendElement(
  documentLike: SecondaryTimerDocumentWithCreateElement,
  manager: SecondaryTimerManagerLike,
  child: number
): SecondaryTimerElementLike {
  const legend = documentLike.createElement("div");
  legend.className = "timertile timer-secondary-legend timer-legend-" + String(child);
  const legendStyle = ensureSecondaryTimerElementStyle(legend);
  legendStyle.color = "#f9f6f2";
  legendStyle.fontSize = resolveSecondaryTimerLegendFontSize(child);
  legend.textContent = String(resolveSecondaryTimerDisplayValueBySlot(manager, child) || child);
  return legend;
}

function createSecondaryTimerValueElement(
  documentLike: SecondaryTimerDocumentWithCreateElement,
  valueId: string,
  level: number
): SecondaryTimerElementLike {
  const timer = documentLike.createElement("div");
  timer.className = "timertile";
  timer.id = valueId;
  const timerStyle = ensureSecondaryTimerElementStyle(timer);
  timerStyle.marginLeft = "6px";
  timerStyle.width = String(resolveSecondaryTimerWidthByLevel(level)) + "px";
  return timer;
}

function appendSecondaryTimerRowBreaks(
  documentLike: SecondaryTimerDocumentWithCreateElement,
  row: SecondaryTimerElementLike
): void {
  row.appendChild?.(documentLike.createElement("br"));
  row.appendChild?.(documentLike.createElement("br"));
}

function resolveSecondaryTimerContainer(
  manager: SecondaryTimerManagerLike | null | undefined
): SecondaryTimerElementLike | null {
  if (!manager) return null;
  const timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return null;

  const legacyContainer = resolveManagerElementById(manager, "timer-secondary-container");
  if (legacyContainer && legacyContainer.parentNode === timerBox) {
    while (legacyContainer.firstChild) {
      timerBox.insertBefore?.(legacyContainer.firstChild, legacyContainer);
    }
    timerBox.removeChild?.(legacyContainer);
  }

  return timerBox;
}

export function ensureSecondaryTimerDescriptorRow(
  manager: SecondaryTimerManagerLike,
  container: SecondaryTimerElementLike,
  rowId: string,
  parent: number,
  child: number
): SecondaryTimerElementLike | null {
  let row = resolveManagerElementById(manager, rowId);
  if (!row) {
    row = createSecondaryTimerRowElement(manager, parent, child);
    if (row) container.appendChild?.(row);
    return row;
  }
  if (row.parentNode !== container) {
    container.appendChild?.(row);
  }
  return row;
}

function resolveSecondaryTimerDescriptorTimerElement(
  manager: SecondaryTimerManagerLike,
  valueId: string,
  timerWidth: number
): SecondaryTimerElementLike | null {
  const timerEl = resolveManagerElementById(manager, valueId);
  if (timerEl) ensureSecondaryTimerElementStyle(timerEl).width = String(timerWidth) + "px";
  return timerEl;
}

function resolveCustomSecondaryTimerIdSuffix(expression: string): string {
  return expression.replace(/\+/g, "-");
}

function createCustomSecondaryTimerRowElement(
  manager: SecondaryTimerManagerLike,
  rule: CustomSecondaryTimerRule,
  rowId: string,
  valueId: string,
  level: number,
  order: number
): SecondaryTimerElementLike | null {
  const documentLike = resolveManagerDocumentLike(manager);
  if (!(documentLike && typeof documentLike.createElement === "function")) return null;
  const documentWithCreateElement = documentLike as SecondaryTimerDocumentWithCreateElement;
  const row = documentWithCreateElement.createElement("div");
  row.id = rowId;
  row.className = "timer-row-item timer-secondary-row timer-secondary-rule-row";
  row.setAttribute?.("data-secondary-parent", String(rule.parent));
  row.setAttribute?.("data-secondary-rule", rule.expression);
  row.setAttribute?.("data-secondary-hidden", "1");
  row.setAttribute?.("data-timer-order", String(order));
  const rowStyle = ensureSecondaryTimerElementStyle(row);
  rowStyle.display = "none";
  rowStyle.paddingLeft = String(level * 5) + "px";

  const legend = documentWithCreateElement.createElement("div");
  const parentSlot = resolveSecondaryTimerSlotByValue(manager, rule.parent) || rule.parent;
  legend.className = "timertile timer-secondary-legend timer-legend-" + String(parentSlot);
  legend.textContent = rule.expression;
  legend.setAttribute?.("title", rule.expression);
  const legendStyle = ensureSecondaryTimerElementStyle(legend);
  legendStyle.color = "#f9f6f2";
  legendStyle.fontSize = rule.expression.length > 8 ? "9px" : "11px";
  row.appendChild?.(legend);
  row.appendChild?.(createSecondaryTimerValueElement(documentWithCreateElement, valueId, level));
  appendSecondaryTimerRowBreaks(documentWithCreateElement, row);
  return row;
}

function collectCustomSecondaryTimerDescriptor(
  manager: SecondaryTimerManagerLike,
  container: SecondaryTimerElementLike,
  rule: CustomSecondaryTimerRule,
  index: number,
  descriptors: SecondaryTimerDescriptorLike[],
  validRowIds: Record<string, boolean>
): void {
  const suffix = resolveCustomSecondaryTimerIdSuffix(rule.expression);
  const rowId = "timer-row-secondary-rule-" + suffix;
  const valueId = "timer-secondary-rule-" + suffix;
  const level = Math.max(1, rule.values.length - 1);
  const order = rule.parent + ((index + 1) / 1000);
  let row = resolveManagerElementById(manager, rowId);
  if (!row) {
    row = createCustomSecondaryTimerRowElement(manager, rule, rowId, valueId, level, order);
    if (row) container.appendChild?.(row);
  } else if (row.parentNode !== container) {
    container.appendChild?.(row);
  }
  if (row) {
    row.setAttribute?.("data-secondary-parent", String(rule.parent));
    row.setAttribute?.("data-secondary-rule", rule.expression);
    row.setAttribute?.("data-timer-order", String(order));
  }
  const timerEl = resolveSecondaryTimerDescriptorTimerElement(
    manager,
    valueId,
    resolveSecondaryTimerWidthByLevel(level)
  );
  descriptors.push({
    parent: rule.parent,
    child: rule.values[rule.values.length - 1],
    rule,
    ruleKey: rule.key,
    rowId,
    valueId,
    row,
    timerEl
  });
  validRowIds[rowId] = true;
}

function isSecondaryTimerManagedRowNode(node: SecondaryTimerElementLike | null | undefined): boolean {
  return !!(
    node &&
    (parseSecondaryTimerRowIdentity(node.id) || String(node.id || "").indexOf("timer-row-secondary-rule-") === 0)
  );
}

function removeStaleSecondaryTimerRows(
  container: SecondaryTimerElementLike | null | undefined,
  validRowIds: Record<string, boolean>
): void {
  if (!container || !container.children) return;
  for (let rowIndex = container.children.length - 1; rowIndex >= 0; rowIndex -= 1) {
    const childNode = container.children[rowIndex];
    if (!isSecondaryTimerManagedRowNode(childNode)) continue;
    if (childNode.id && validRowIds[childNode.id]) continue;
    container.removeChild?.(childNode);
  }
}

function collectSecondaryTimerDescriptorsForParents(
  manager: SecondaryTimerManagerLike,
  container: SecondaryTimerElementLike,
  descriptors: SecondaryTimerDescriptorLike[],
  validRowIds: Record<string, boolean>
): void {
  const rules = getCustomSecondaryTimerRules(manager);
  for (let index = 0; index < rules.length; index += 1) {
    collectCustomSecondaryTimerDescriptor(manager, container, rules[index], index, descriptors, validRowIds);
  }
}

function ensureSecondaryTimerRows(manager: SecondaryTimerManagerLike | null | undefined): SecondaryTimerDescriptorLike[] {
  if (!manager) return [];
  const container = resolveSecondaryTimerContainer(manager);
  if (!container) return [];

  const descriptors: SecondaryTimerDescriptorLike[] = [];
  const validRowIds: Record<string, boolean> = {};

  collectSecondaryTimerDescriptorsForParents(manager, container, descriptors, validRowIds);
  removeStaleSecondaryTimerRows(container, validRowIds);
  bindSecondaryTimerParentToggleEvents(manager);
  return descriptors;
}

export function resolveSecondaryTimerDescriptors(
  manager: SecondaryTimerManagerLike | null | undefined
): SecondaryTimerDescriptorLike[] {
  if (manager && typeof manager.resolveSecondaryTimerDescriptors === "function") {
    const descriptors = manager.resolveSecondaryTimerDescriptors();
    return Array.isArray(descriptors) ? descriptors : [];
  }
  const descriptors = ensureSecondaryTimerRows(manager);
  return Array.isArray(descriptors) ? descriptors : [];
}

export function isSecondaryTimerParentReached(
  manager: SecondaryTimerManagerLike | null | undefined,
  parentValue: unknown
): boolean {
  if (!manager) return false;
  const parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return false;
  const parentSlot = resolveSecondaryTimerSlotByValue(manager, parent) || parent;
  const parentTimer = resolveManagerElementById(manager, "timer" + String(parentSlot));
  if (!parentTimer) return false;
  const text = String(parentTimer.textContent || parentTimer.innerText || "").trim();
  return text !== "";
}

function resolveSecondaryTimerParentRowAnchor(
  manager: SecondaryTimerManagerLike | null | undefined,
  timerBox: SecondaryTimerElementLike | null | undefined,
  parent: number
): SecondaryTimerElementLike | null {
  if (!manager || !timerBox) return null;
  const parentSlot = resolveSecondaryTimerSlotByValue(manager, parent) || parent;
  const parentRow = manager.getTimerRowEl ? manager.getTimerRowEl(parentSlot) : null;
  if (parentRow && parentRow.parentNode === timerBox) return parentRow;
  return null;
}

function resolveSecondaryTimerParentTimerAnchor(
  manager: SecondaryTimerManagerLike | null | undefined,
  timerBox: SecondaryTimerElementLike | null | undefined,
  parent: number
): SecondaryTimerElementLike | null {
  if (!manager || !timerBox) return null;
  const parentSlot = resolveSecondaryTimerSlotByValue(manager, parent) || parent;
  const parentTimer = resolveManagerElementById(manager, "timer" + String(parentSlot));
  if (!(parentTimer && parentTimer.parentNode === timerBox)) return null;
  return parentTimer;
}

function isSecondaryTimerWhitespaceNode(node: SecondaryTimerNodeLike | null | undefined): boolean {
  return !!(node && node.nodeType === 3 && String(node.nodeValue || "").trim() === "");
}

function isSecondaryTimerBreakNode(node: SecondaryTimerNodeLike | null | undefined): boolean {
  return !!(
    node &&
    node.nodeType === 1 &&
    node.tagName &&
    String(node.tagName).toLowerCase() === "br"
  );
}

function resolveNextNonWhitespaceSecondaryTimerNode(
  node: SecondaryTimerNodeLike | null | undefined
): SecondaryTimerNodeLike | null {
  let cursor = node || null;
  while (cursor && isSecondaryTimerWhitespaceNode(cursor)) {
    cursor = cursor.nextSibling || null;
  }
  return cursor;
}

function resolveSecondaryTimerAnchorAfterLegacyBreaks(
  parentTimer: SecondaryTimerElementLike | null | undefined
): SecondaryTimerNodeLike | null {
  let anchor: SecondaryTimerNodeLike | null = parentTimer || null;
  let cursor = resolveNextNonWhitespaceSecondaryTimerNode(parentTimer?.nextSibling || null);
  let brCount = 0;
  while (cursor && isSecondaryTimerBreakNode(cursor) && brCount < 2) {
    anchor = cursor;
    brCount += 1;
    cursor = resolveNextNonWhitespaceSecondaryTimerNode(cursor.nextSibling || null);
  }
  return anchor;
}

export function resolveSecondaryTimerParentAnchor(
  manager: SecondaryTimerManagerLike | null | undefined,
  timerBox: SecondaryTimerElementLike | null | undefined,
  parentValue: unknown
): SecondaryTimerNodeLike | null {
  if (!manager || !timerBox) return null;
  const parent = normalizeSecondaryTimerValue(parentValue);
  if (parent === null) return null;

  const parentRowAnchor = resolveSecondaryTimerParentRowAnchor(manager, timerBox, parent);
  if (parentRowAnchor) return parentRowAnchor;

  const parentTimerAnchor = resolveSecondaryTimerParentTimerAnchor(manager, timerBox, parent);
  if (!parentTimerAnchor) return null;

  return resolveSecondaryTimerAnchorAfterLegacyBreaks(parentTimerAnchor);
}

function resolveSecondaryTimerPlacementDescriptorRowId(descriptor: SecondaryTimerDescriptorLike | null | undefined): string {
  if (!descriptor) return "";
  if (typeof descriptor.rowId === "string" && descriptor.rowId) return descriptor.rowId;
  const row = descriptor.row;
  if (row && typeof row.id === "string" && row.id) return row.id;
  return "";
}

function resolveSecondaryTimerPlacementRowNumericAttribute(
  row: SecondaryTimerElementLike | null | undefined,
  attributeName: string
): number | null {
  if (!(row && typeof row.getAttribute === "function")) return null;
  return normalizeSecondaryTimerValue(row.getAttribute(attributeName));
}

function resolveSecondaryTimerPlacementRowIdentity(
  row: SecondaryTimerElementLike | null | undefined
): { parent: number; child: number } | null {
  if (!row) return null;
  return parseSecondaryTimerRowIdentity(row.id);
}

function resolveSecondaryTimerPlacementParentValue(descriptor: SecondaryTimerDescriptorLike | null | undefined): number | null {
  if (!descriptor) return null;
  let parent = normalizeSecondaryTimerValue(descriptor.parent);
  if (descriptor.rule && parent !== null) return parent;
  if (isValidSecondaryTimerParentValue(parent)) return parent;

  const row = descriptor.row;
  parent = resolveSecondaryTimerPlacementRowNumericAttribute(row, "data-secondary-parent");
  if (isValidSecondaryTimerParentValue(parent)) return parent;

  const rowIdentity = resolveSecondaryTimerPlacementRowIdentity(row);
  parent = rowIdentity ? rowIdentity.parent : null;
  if (!isValidSecondaryTimerParentValue(parent)) return null;
  return parent;
}

function resolveSecondaryTimerPlacementChildValue(
  descriptor: SecondaryTimerDescriptorLike | null | undefined,
  parent: number
): number | null {
  if (!descriptor) return null;
  let child = normalizeSecondaryTimerValue(descriptor.child);
  if (child === null) {
    const row = descriptor.row;
    child = resolveSecondaryTimerPlacementRowNumericAttribute(row, "data-secondary-child");
    if (child === null) {
      const rowIdentity = resolveSecondaryTimerPlacementRowIdentity(row);
      child = rowIdentity ? rowIdentity.child : null;
    }
  }
  if (!isValidSecondaryTimerParentChildPair(parent, child)) return null;
  return child;
}

function resolveSecondaryTimerPlacementDedupeKey(parent: number, child: number | null, rowId: string): string {
  if (typeof rowId === "string" && rowId) return "row-id:" + String(parent) + ":" + rowId;
  if (child !== null) return "parent-child:" + String(parent) + ":" + String(child);
  return "";
}

function resolveSecondaryTimerPlacementInfo(
  descriptor: SecondaryTimerDescriptorLike | null | undefined
): SecondaryTimerPlacementInfo | null {
  if (!descriptor || !descriptor.row) return null;
  const parent = resolveSecondaryTimerPlacementParentValue(descriptor);
  if (parent === null) return null;
  const child = resolveSecondaryTimerPlacementChildValue(descriptor, parent);
  const rowId = resolveSecondaryTimerPlacementDescriptorRowId(descriptor);
  const dedupeKey = resolveSecondaryTimerPlacementDedupeKey(parent, child, rowId);
  return {
    key: String(parent),
    parent,
    row: descriptor.row,
    dedupeKey
  };
}

export function createSecondaryTimerPlacementDebugSnapshot(
  totalDescriptors: unknown
): SecondaryTimerPlacementDebugSnapshot {
  return {
    totalDescriptors: Number(totalDescriptors) || 0,
    validPlacementDescriptors: 0,
    placed: 0,
    skippedDuplicate: 0,
    skippedMissingAnchor: 0,
    dedupeKeyHits: {},
    dedupeStrategyHits: {}
  };
}

function incrementSecondaryTimerPlacementDebugCount(counter: unknown, key: string): void {
  if (!isCoreHelperRecordObject(counter) || !key) return;
  const current = Number(counter[key]) || 0;
  counter[key] = current + 1;
}

function countSecondaryTimerPlacementDebugKeys(counter: unknown): number {
  if (!isCoreHelperRecordObject(counter)) return 0;
  let total = 0;
  for (const key in counter) {
    if (!Object.prototype.hasOwnProperty.call(counter, key)) continue;
    total += 1;
  }
  return total;
}

function resolveSecondaryTimerPlacementDebugCounterValue(counter: unknown, key: string): number {
  if (!isCoreHelperRecordObject(counter) || !key) return 0;
  return Number(counter[key]) || 0;
}

const SECONDARY_TIMER_PLACEMENT_DIAGNOSTIC_FIELDS = [
  "totalDescriptors",
  "validPlacementDescriptors",
  "placed",
  "skippedDuplicate",
  "skippedMissingAnchor",
  "dedupeKeyKinds",
  "rowIdStrategyHits",
  "parentChildStrategyHits",
  "rowReferenceStrategyHits"
] as const;
const SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_KEY = "secondaryTimerPlacement";
const SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_SCHEMA_VERSION = 1;

function resolveSecondaryTimerPlacementDedupeStrategy(dedupeKey: string): string {
  if (typeof dedupeKey !== "string" || !dedupeKey) return "row-reference";
  if (dedupeKey.indexOf("row-id:") === 0) return "row-id";
  if (dedupeKey.indexOf("parent-child:") === 0) return "parent-child";
  return "row-reference";
}

function createSecondaryTimerPlacementDebugSummaryDefaults(): SecondaryTimerPlacementDebugSummary {
  return {
    totalDescriptors: 0,
    validPlacementDescriptors: 0,
    placed: 0,
    skippedDuplicate: 0,
    skippedMissingAnchor: 0,
    dedupeKeyKinds: 0,
    rowIdStrategyHits: 0,
    parentChildStrategyHits: 0,
    rowReferenceStrategyHits: 0
  };
}

function applySecondaryTimerPlacementDebugSummaryCounts(
  summary: SecondaryTimerPlacementDebugSummary,
  debugSnapshot: Record<PropertyKey, unknown>
): void {
  summary.totalDescriptors = Number(debugSnapshot.totalDescriptors) || 0;
  summary.validPlacementDescriptors = Number(debugSnapshot.validPlacementDescriptors) || 0;
  summary.placed = Number(debugSnapshot.placed) || 0;
  summary.skippedDuplicate = Number(debugSnapshot.skippedDuplicate) || 0;
  summary.skippedMissingAnchor = Number(debugSnapshot.skippedMissingAnchor) || 0;
  summary.dedupeKeyKinds = countSecondaryTimerPlacementDebugKeys(debugSnapshot.dedupeKeyHits);
}

function applySecondaryTimerPlacementDebugSummaryStrategyHits(
  summary: SecondaryTimerPlacementDebugSummary,
  debugSnapshot: Record<PropertyKey, unknown>
): void {
  const strategyHits = debugSnapshot.dedupeStrategyHits;
  summary.rowIdStrategyHits = resolveSecondaryTimerPlacementDebugCounterValue(strategyHits, "row-id");
  summary.parentChildStrategyHits = resolveSecondaryTimerPlacementDebugCounterValue(strategyHits, "parent-child");
  summary.rowReferenceStrategyHits = resolveSecondaryTimerPlacementDebugCounterValue(strategyHits, "row-reference");
}

export function resolveSecondaryTimerPlacementDebugSummaryFromSnapshot(
  debugSnapshot: unknown
): SecondaryTimerPlacementDebugSummary {
  const summary = createSecondaryTimerPlacementDebugSummaryDefaults();
  if (!isCoreHelperRecordObject(debugSnapshot)) return summary;
  applySecondaryTimerPlacementDebugSummaryCounts(summary, debugSnapshot);
  applySecondaryTimerPlacementDebugSummaryStrategyHits(summary, debugSnapshot);
  return summary;
}

function markSecondaryTimerPlacementDedupeObserved(debugSnapshot: unknown, dedupeKey: string): void {
  if (!debugSnapshot || typeof dedupeKey !== "string" || !dedupeKey) return;
  if (!isCoreHelperRecordObject(debugSnapshot)) return;
  incrementSecondaryTimerPlacementDebugCount(debugSnapshot.dedupeKeyHits, dedupeKey);
  const strategy = resolveSecondaryTimerPlacementDedupeStrategy(dedupeKey);
  incrementSecondaryTimerPlacementDebugCount(debugSnapshot.dedupeStrategyHits, strategy);
}

function publishSecondaryTimerPlacementDebugSnapshot(
  manager: SecondaryTimerManagerLike | null | undefined,
  debugSnapshot: SecondaryTimerPlacementDebugSnapshot
): void {
  if (!manager || !debugSnapshot) return;
  manager.secondaryTimerPlacementDebugSnapshot = debugSnapshot;
  manager.secondaryTimerPlacementDebugSummary = resolveSecondaryTimerPlacementDebugSummaryFromSnapshot(debugSnapshot);
}

export function resolveSecondaryTimerPlacementDebugSummary(
  manager: SecondaryTimerManagerLike | null | undefined
): SecondaryTimerPlacementDebugSummary {
  if (!manager) return createSecondaryTimerPlacementDebugSummaryDefaults();
  return resolveSecondaryTimerPlacementDebugSummaryFromSnapshot(manager.secondaryTimerPlacementDebugSnapshot);
}

function resolveSecondaryTimerPlacementDiagnosticMaxDedupeKeys(value: unknown): number {
  let count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 0;
  count = Math.floor(count);
  if (count > 20) count = 20;
  return count;
}

function resolveSecondaryTimerPlacementDiagnosticsOptions(options: unknown): {
  failureOnly: boolean;
  failed: boolean;
  includeWhenNoActivity: boolean;
  maxDedupeKeys: number;
} {
  const source = isCoreHelperRecordObject(options) ? options : {};
  return {
    failureOnly: source.failureOnly !== false,
    failed: source.failed === true,
    includeWhenNoActivity: source.includeWhenNoActivity === true,
    maxDedupeKeys: resolveSecondaryTimerPlacementDiagnosticMaxDedupeKeys(source.maxDedupeKeys)
  };
}

function createSecondaryTimerPlacementDiagnosticsPayload(
  summary: SecondaryTimerPlacementDebugSummary
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (let index = 0; index < SECONDARY_TIMER_PLACEMENT_DIAGNOSTIC_FIELDS.length; index += 1) {
    const field = SECONDARY_TIMER_PLACEMENT_DIAGNOSTIC_FIELDS[index];
    payload[field] = Number(summary[field]) || 0;
  }
  return payload;
}

function shouldIncludeSecondaryTimerPlacementDiagnostics(
  summary: SecondaryTimerPlacementDebugSummary,
  options: ReturnType<typeof resolveSecondaryTimerPlacementDiagnosticsOptions>
): boolean {
  if (options.failureOnly && !options.failed) return false;
  if (!options.includeWhenNoActivity && (Number(summary.validPlacementDescriptors) || 0) <= 0) return false;
  return true;
}

function collectSecondaryTimerPlacementDiagnosticDedupeEntries(
  manager: SecondaryTimerManagerLike | null | undefined
): Array<{ key: string; count: number }> {
  if (!manager) return [];
  const snapshot = manager.secondaryTimerPlacementDebugSnapshot;
  const hits =
    snapshot && isCoreHelperRecordObject(snapshot) && isCoreHelperRecordObject(snapshot.dedupeKeyHits)
      ? snapshot.dedupeKeyHits
      : null;
  if (!hits) return [];
  const entries: Array<{ key: string; count: number }> = [];
  for (const key in hits) {
    if (!Object.prototype.hasOwnProperty.call(hits, key)) continue;
    if (typeof key !== "string" || !key) continue;
    entries.push({
      key,
      count: Number(hits[key]) || 0
    });
  }
  return entries;
}

function sortSecondaryTimerPlacementDiagnosticDedupeEntries(entries: Array<{ key: string; count: number }>): void {
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  });
}

function createSecondaryTimerPlacementDiagnosticDedupeKeySamples(
  entries: Array<{ key: string; count: number }>,
  maxDedupeKeys: number
): string[] {
  const samples: string[] = [];
  if (!Array.isArray(entries) || entries.length <= 0) return samples;
  const limit = Math.min(maxDedupeKeys, entries.length);
  for (let index = 0; index < limit; index += 1) {
    samples.push(entries[index].key + "#" + String(entries[index].count));
  }
  return samples;
}

function appendSecondaryTimerPlacementDiagnosticDedupeKeySamples(
  payload: Record<string, unknown>,
  manager: SecondaryTimerManagerLike | null | undefined,
  maxDedupeKeys: number
): void {
  if (!payload || maxDedupeKeys <= 0 || !manager) return;
  const entries = collectSecondaryTimerPlacementDiagnosticDedupeEntries(manager);
  if (entries.length <= 0) return;
  sortSecondaryTimerPlacementDiagnosticDedupeEntries(entries);
  const samples = createSecondaryTimerPlacementDiagnosticDedupeKeySamples(entries, maxDedupeKeys);
  if (samples.length <= 0) return;
  payload.dedupeKeySamples = samples;
}

export function resolveSecondaryTimerPlacementDiagnosticsPayload(
  manager: SecondaryTimerManagerLike | null | undefined,
  options?: unknown
): Record<string, unknown> | null {
  const summary = resolveSecondaryTimerPlacementDebugSummary(manager);
  const normalizedOptions = resolveSecondaryTimerPlacementDiagnosticsOptions(options);
  if (!shouldIncludeSecondaryTimerPlacementDiagnostics(summary, normalizedOptions)) return null;
  const payload = createSecondaryTimerPlacementDiagnosticsPayload(summary);
  appendSecondaryTimerPlacementDiagnosticDedupeKeySamples(payload, manager, normalizedOptions.maxDedupeKeys);
  return payload;
}

export function resolveSecondaryTimerPlacementDiagnosticsIndexEntry(
  manager: SecondaryTimerManagerLike | null | undefined,
  options?: unknown
): { key: string; schemaVersion: number; payload: Record<string, unknown> } | null {
  const payload = resolveSecondaryTimerPlacementDiagnosticsPayload(manager, options);
  if (!payload) return null;
  return {
    key: SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_KEY,
    schemaVersion: SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_SCHEMA_VERSION,
    payload
  };
}

function isSecondaryTimerRowIdLike(rowId: unknown): boolean {
  if (typeof rowId !== "string" || !rowId) return false;
  return rowId.indexOf("timer-row-secondary-") === 0;
}

function resolveSecondaryTimerExistingTailAnchorParent(node: SecondaryTimerElementLike | null | undefined): number | null {
  if (!node) return null;
  const fromIdentity = parseSecondaryTimerRowIdentity(node.id);
  if (fromIdentity && isValidSecondaryTimerParentValue(fromIdentity.parent)) return fromIdentity.parent;
  const fromAttribute = resolveSecondaryTimerPlacementRowNumericAttribute(node, "data-secondary-parent");
  if (!isValidSecondaryTimerParentValue(fromAttribute)) return null;
  return fromAttribute;
}

function resolveSecondaryTimerExistingTailAnchor(
  timerBox: SecondaryTimerElementLike | null | undefined,
  parent: number
): SecondaryTimerElementLike | null {
  if (!(timerBox && timerBox.children)) return null;
  for (let index = timerBox.children.length - 1; index >= 0; index -= 1) {
    const node: SecondaryTimerElementLike | undefined = timerBox.children[index];
    if (!node) continue;
    if (node.parentNode !== timerBox) continue;
    if (!isSecondaryTimerRowIdLike(node.id)) continue;
    const existingParent = resolveSecondaryTimerExistingTailAnchorParent(node);
    if (existingParent !== parent) continue;
    return node;
  }
  return null;
}

function resolveSecondaryTimerPlacementAnchor(
  manager: SecondaryTimerManagerLike,
  timerBox: SecondaryTimerElementLike,
  tailByParent: Record<string, SecondaryTimerElementLike | undefined>,
  placementInfo: SecondaryTimerPlacementInfo | null
): SecondaryTimerNodeLike | null {
  if (!placementInfo) return null;
  const anchors = [
    tailByParent[placementInfo.key],
    resolveSecondaryTimerParentAnchor(manager, timerBox, placementInfo.parent),
    resolveSecondaryTimerExistingTailAnchor(timerBox, placementInfo.parent)
  ];
  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    if (anchor && anchor.parentNode === timerBox) return anchor;
  }
  return null;
}

function hasSeenSecondaryTimerPlacementRowReference(
  seenPlacementRowRefs: SecondaryTimerElementLike[],
  row: SecondaryTimerElementLike | null | undefined
): boolean {
  if (!Array.isArray(seenPlacementRowRefs) || !row) return false;
  for (let index = 0; index < seenPlacementRowRefs.length; index += 1) {
    if (seenPlacementRowRefs[index] === row) return true;
  }
  return false;
}

function shouldSkipSecondaryTimerPlacementDedupeKey(
  seenPlacementRows: Record<string, boolean>,
  dedupeKey: string,
  debugSnapshot: SecondaryTimerPlacementDebugSnapshot
): boolean {
  markSecondaryTimerPlacementDedupeObserved(debugSnapshot, dedupeKey);
  if (seenPlacementRows[dedupeKey]) return true;
  seenPlacementRows[dedupeKey] = true;
  return false;
}

function shouldSkipSecondaryTimerPlacementRowReference(
  seenPlacementRowRefs: SecondaryTimerElementLike[],
  row: SecondaryTimerElementLike | null | undefined,
  debugSnapshot: SecondaryTimerPlacementDebugSnapshot
): boolean {
  if (!row) return false;
  incrementSecondaryTimerPlacementDebugCount(debugSnapshot.dedupeStrategyHits, "row-reference");
  if (hasSeenSecondaryTimerPlacementRowReference(seenPlacementRowRefs, row)) return true;
  seenPlacementRowRefs.push(row);
  return false;
}

function shouldSkipSecondaryTimerPlacementRow(
  seenPlacementRows: Record<string, boolean>,
  seenPlacementRowRefs: SecondaryTimerElementLike[],
  placementInfo: SecondaryTimerPlacementInfo | null,
  debugSnapshot: SecondaryTimerPlacementDebugSnapshot
): boolean {
  if (!placementInfo) return false;
  const dedupeKey = placementInfo.dedupeKey;
  if (dedupeKey) return shouldSkipSecondaryTimerPlacementDedupeKey(seenPlacementRows, dedupeKey, debugSnapshot);
  return shouldSkipSecondaryTimerPlacementRowReference(seenPlacementRowRefs, placementInfo.row, debugSnapshot);
}

function canPlaceSecondaryTimerRowNearParent(
  timerBox: SecondaryTimerElementLike | null | undefined,
  anchor: SecondaryTimerNodeLike | null | undefined
): boolean {
  return !!(timerBox && anchor && anchor.parentNode === timerBox);
}

function placeSecondaryTimerRowAfterAnchor(
  timerBox: SecondaryTimerElementLike | null | undefined,
  anchor: SecondaryTimerNodeLike | null | undefined,
  row: SecondaryTimerElementLike | null | undefined
): void {
  if (!timerBox || !anchor || !row) return;
  if (anchor.nextSibling !== row) timerBox.insertBefore?.(row, anchor.nextSibling || null);
}

function appendSecondaryTimerScrollControls(
  manager: SecondaryTimerManagerLike,
  timerBox: SecondaryTimerElementLike
): void {
  const controls = resolveManagerElementById(manager, "timer-scroll-controls");
  if (!controls || controls.parentNode !== timerBox) return;
  if (controls.nextSibling !== null) timerBox.appendChild?.(controls);
}

function applySecondaryTimerHiddenRowState(row: SecondaryTimerElementLike | null | undefined): void {
  if (!row) return;
  const style = ensureSecondaryTimerElementStyle(row);
  style.display = "none";
  row.setAttribute?.("data-secondary-hidden", "1");
  row.removeAttribute?.("data-scroll-hidden");
  style.visibility = "";
  style.pointerEvents = "";
}

interface SecondaryTimerPlacementContext {
  debugSnapshot: SecondaryTimerPlacementDebugSnapshot;
  tailByParent: Record<string, SecondaryTimerElementLike | undefined>;
  seenPlacementRows: Record<string, boolean>;
  seenPlacementRowRefs: SecondaryTimerElementLike[];
}

function createSecondaryTimerPlacementContext(listLength: number): SecondaryTimerPlacementContext {
  return {
    debugSnapshot: createSecondaryTimerPlacementDebugSnapshot(listLength),
    tailByParent: {},
    seenPlacementRows: {},
    seenPlacementRowRefs: []
  };
}

function shouldPlaceSecondaryTimerDescriptor(
  placementInfo: SecondaryTimerPlacementInfo,
  context: SecondaryTimerPlacementContext
): boolean {
  context.debugSnapshot.validPlacementDescriptors += 1;
  if (!shouldSkipSecondaryTimerPlacementRow(
    context.seenPlacementRows,
    context.seenPlacementRowRefs,
    placementInfo,
    context.debugSnapshot
  )) return true;
  context.debugSnapshot.skippedDuplicate += 1;
  return false;
}

function placeSecondaryTimerDescriptorNearParent(
  manager: SecondaryTimerManagerLike,
  timerBox: SecondaryTimerElementLike,
  descriptor: SecondaryTimerDescriptorLike,
  context: SecondaryTimerPlacementContext
): void {
  const placementInfo = resolveSecondaryTimerPlacementInfo(descriptor);
  if (!placementInfo) return;
  if (!shouldPlaceSecondaryTimerDescriptor(placementInfo, context)) return;
  const anchor = resolveSecondaryTimerPlacementAnchor(manager, timerBox, context.tailByParent, placementInfo);
  if (!canPlaceSecondaryTimerRowNearParent(timerBox, anchor)) {
    context.debugSnapshot.skippedMissingAnchor += 1;
    return;
  }
  placeSecondaryTimerRowAfterAnchor(timerBox, anchor, placementInfo.row);
  context.tailByParent[placementInfo.key] = placementInfo.row;
  context.debugSnapshot.placed += 1;
}

export function placeSecondaryTimerRowsNearParents(
  manager: SecondaryTimerManagerLike | null | undefined,
  descriptors: unknown
): void {
  if (!manager) return;
  const timerBox = resolveManagerElementById(manager, "timerbox");
  if (!timerBox) return;
  const list = Array.isArray(descriptors) ? descriptors as SecondaryTimerDescriptorLike[] : [];
  const context = createSecondaryTimerPlacementContext(list.length);

  for (let index = 0; index < list.length; index += 1) {
    placeSecondaryTimerDescriptorNearParent(manager, timerBox, list[index], context);
  }

  publishSecondaryTimerPlacementDebugSnapshot(manager, context.debugSnapshot);
  appendSecondaryTimerScrollControls(manager, timerBox);
}

export function refreshSecondaryTimerRowsVisibility(manager: SecondaryTimerManagerLike | null | undefined): void {
  if (!manager) return;
  const descriptors = resolveSecondaryTimerDescriptors(manager);
  placeSecondaryTimerRowsNearParents(manager, descriptors);
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !descriptor.row) continue;
    const visible = isSecondaryTimerParentExpanded(manager, descriptor.parent);
    if (visible) {
      ensureSecondaryTimerElementStyle(descriptor.row).display = "block";
      descriptor.row.removeAttribute?.("data-secondary-hidden");
      descriptor.row.removeAttribute?.("data-scroll-hidden");
      continue;
    }
    applySecondaryTimerHiddenRowState(descriptor.row);
  }
  callSecondaryTimerWindowMethod(manager, "updateTimerScroll");
}

function setCustomSecondaryTimerRulesFromText(
  manager: SecondaryTimerManagerLike,
  text: string
): boolean {
  const parsed = parseCustomSecondaryTimerRules({
    text,
    family: resolveCustomSecondaryTimerFamily(manager.ruleset),
    parentValues: manager.timerMilestones
  });
  manager.customSecondaryTimerRuleText = text;
  manager.customSecondaryTimerRules = parsed.rules;
  if (isCoreHelperRecordObject(manager.sessionReplayV1)) {
    manager.sessionReplayV1.custom_secondary_timer_rule_text = text;
  }
  if (isCoreHelperRecordObject(manager.sessionReplayV3)) {
    manager.sessionReplayV3.custom_secondary_timer_rule_text = text;
  }
  return parsed.errors.length === 0;
}

function loadCustomSecondaryTimerRulesForSetup(manager: SecondaryTimerManagerLike): void {
  let storageLike: unknown = null;
  try {
    storageLike = manager.getWindowLike?.()?.localStorage || null;
  } catch (_error) {}
  const family = resolveCustomSecondaryTimerFamily(manager.ruleset);
  setCustomSecondaryTimerRulesFromText(
    manager,
    readCustomSecondaryTimerRuleText(storageLike, family)
  );
}

function resetCustomSecondaryTimerDescriptorRows(manager: SecondaryTimerManagerLike): void {
  applySecondaryTimerExpandedParentsState(manager, []);
  const descriptors = resolveSecondaryTimerDescriptors(manager);
  placeSecondaryTimerRowsNearParents(manager, descriptors);
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor) continue;
    if (descriptor.timerEl) {
      descriptor.timerEl.textContent = "";
      descriptor.timerEl.removeAttribute?.("data-secondary-hit-kind");
      descriptor.timerEl.removeAttribute?.("data-secondary-covered-by");
      descriptor.timerEl.removeAttribute?.("title");
      descriptor.timerEl.removeAttribute?.("aria-label");
    }
    if (descriptor.row) applySecondaryTimerHiddenRowState(descriptor.row);
  }
}

export function applyCustomSecondaryTimerRuleText(
  manager: SecondaryTimerManagerLike | null | undefined,
  text: unknown
): boolean {
  if (!manager || typeof text !== "string") return false;
  const valid = setCustomSecondaryTimerRulesFromText(manager, text);
  resetCustomSecondaryTimerDescriptorRows(manager);
  return valid;
}

export function resetSecondaryTimerRowsForSetup(manager: SecondaryTimerManagerLike | null | undefined): void {
  if (!manager) return;
  loadCustomSecondaryTimerRulesForSetup(manager);
  resetCustomSecondaryTimerDescriptorRows(manager);
}

function canStampSecondaryTimerDescriptor(
  manager: SecondaryTimerManagerLike | null | undefined,
  descriptor: SecondaryTimerDescriptorLike | null | undefined,
  merged: number
): boolean {
  if (!descriptor || !descriptor.timerEl) return false;
  if (descriptor.child !== merged) return false;
  if (!isSecondaryTimerParentReached(manager, descriptor.parent)) return false;
  return String(descriptor.timerEl.textContent || "") === "";
}

export function stampSecondaryTimerDescriptor(descriptor: SecondaryTimerDescriptorLike, timeStr?: unknown): void {
  if (!descriptor.timerEl) return;
  descriptor.timerEl.textContent = String(timeStr || "");
}

function stampSecondaryTimerDescriptorsForValue(
  manager: SecondaryTimerManagerLike | null | undefined,
  descriptors: SecondaryTimerDescriptorLike[],
  merged: number,
  timeStr: unknown
): boolean {
  let changed = false;
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    if (!canStampSecondaryTimerDescriptor(manager, descriptor, merged)) continue;
    stampSecondaryTimerDescriptor(descriptor, timeStr);
    changed = true;
  }
  return changed;
}

export function stampSecondaryTimersForMergedValue(
  manager: SecondaryTimerManagerLike | null | undefined,
  mergedValue: unknown,
  timeStr: unknown
): void {
  if (!manager) return;
  const merged = resolveSecondaryTimerSlotByValue(manager, mergedValue);
  if (merged === null || merged < 2048) return;
  if (!isSecondaryTimerPowerOfTwo(merged)) return;
  const descriptors = resolveSecondaryTimerDescriptors(manager);
  const changed = stampSecondaryTimerDescriptorsForValue(manager, descriptors, merged, timeStr);
  if (changed) refreshSecondaryTimerRowsVisibility(manager);
}

function collectCustomSecondaryTimerBoardValues(
  manager: SecondaryTimerManagerLike
): number[] {
  const values: number[] = [];
  if (!(manager.grid && typeof manager.grid.eachCell === "function")) return values;
  manager.grid.eachCell((_x, _y, tile) => {
    const value = normalizeSecondaryTimerValue(tile?.value);
    if (value !== null) values.push(value);
  });
  return values;
}

function applyCustomSecondaryTimerHit(
  descriptor: SecondaryTimerDescriptorLike,
  timeStr: string,
  kind: CustomSecondaryTimerHitKind,
  coveredBy: string
): void {
  const timerEl = descriptor.timerEl;
  const rule = descriptor.rule;
  if (!timerEl || !rule) return;
  timerEl.textContent = kind === "covered" ? timeStr + " ↑" : timeStr;
  timerEl.setAttribute?.("data-secondary-hit-kind", kind);
  if (kind === "covered") {
    const explanation = "由 " + coveredBy + " 越级覆盖";
    timerEl.setAttribute?.("data-secondary-covered-by", coveredBy);
    timerEl.setAttribute?.("title", explanation);
    timerEl.setAttribute?.("aria-label", rule.expression + " " + timeStr + "，" + explanation);
    return;
  }
  timerEl.removeAttribute?.("data-secondary-covered-by");
  timerEl.setAttribute?.("title", rule.expression + " " + timeStr);
  timerEl.setAttribute?.("aria-label", rule.expression + " " + timeStr);
}

export function stampCustomSecondaryTimersForBoard(
  manager: SecondaryTimerManagerLike | null | undefined,
  timeValue: unknown
): void {
  if (!manager) return;
  const descriptors = resolveSecondaryTimerDescriptors(manager);
  if (descriptors.length === 0) return;
  const boardValues = collectCustomSecondaryTimerBoardValues(manager);
  const timeStr = String(timeValue || "");
  let changed = false;
  for (const descriptor of descriptors) {
    if (!(descriptor.rule && descriptor.timerEl)) continue;
    if (String(descriptor.timerEl.textContent || "") !== "") continue;
    const match = matchCustomSecondaryTimerRule(boardValues, descriptor.rule);
    if (!match) continue;
    applyCustomSecondaryTimerHit(descriptor, timeStr, match.kind, match.coveredBy);
    changed = true;
  }
  if (changed) refreshSecondaryTimerRowsVisibility(manager);
}

function resolveSecondaryTimerInvalidationPlaceholderText(placeholderText: unknown): string {
  return typeof placeholderText === "string" && placeholderText ? placeholderText : "---------";
}

function canInvalidateSecondaryTimerDescriptorByLimit(
  descriptor: SecondaryTimerDescriptorLike | null | undefined,
  limit: number
): boolean {
  if (!(descriptor && descriptor.timerEl)) return false;
  if (Number(descriptor.parent) > limit) return false;
  if (Number(descriptor.child) > limit) return false;
  return true;
}

function applySecondaryTimerInvalidationText(descriptor: SecondaryTimerDescriptorLike, text: string): boolean {
  if (!descriptor || !descriptor.timerEl) return false;
  const current = String(descriptor.timerEl.textContent || "");
  if (current === text) return false;
  descriptor.timerEl.textContent = text;
  return true;
}

function applySecondaryTimerInvalidationToDescriptors(
  descriptors: SecondaryTimerDescriptorLike[],
  limit: number,
  text: string
): boolean {
  let changed = false;
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    if (!canInvalidateSecondaryTimerDescriptorByLimit(descriptor, limit)) continue;
    if (applySecondaryTimerInvalidationText(descriptor, text)) changed = true;
  }
  return changed;
}

export function invalidateSecondaryTimersByLimit(
  manager: SecondaryTimerManagerLike | null | undefined,
  limitValue: unknown,
  placeholderText?: unknown
): boolean {
  if (!manager) return false;
  const limit = resolveSecondaryTimerSlotByValue(manager, limitValue);
  if (limit === null || limit < 2048) return false;
  const text = resolveSecondaryTimerInvalidationPlaceholderText(placeholderText);
  const descriptors = resolveSecondaryTimerDescriptors(manager);
  const changed = applySecondaryTimerInvalidationToDescriptors(descriptors, limit, text);
  if (changed) refreshSecondaryTimerRowsVisibility(manager);
  return changed;
}

export function collectSecondaryTimerRowsState(
  manager: SecondaryTimerManagerLike | null | undefined
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  if (!manager) return rows;
  const descriptors = resolveSecondaryTimerDescriptors(manager);
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !descriptor.row) continue;
    const rowState: Record<string, unknown> = {
      parent: descriptor.parent,
      child: descriptor.child,
      time: descriptor.timerEl ? String(descriptor.timerEl.textContent || "") : "",
      display: descriptor.row.style?.display || ""
    };
    if (descriptor.rule) {
      rowState.rule = descriptor.rule.expression;
      rowState.hit_kind = descriptor.timerEl?.getAttribute?.("data-secondary-hit-kind") || "";
      rowState.covered_by = descriptor.timerEl?.getAttribute?.("data-secondary-covered-by") || "";
    }
    rows.push(rowState);
  }
  return rows;
}

function isSecondaryTimerDisplayTimeText(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value === "") return true;
  return value.indexOf(":") !== -1 || value.indexOf(".") !== -1 || value === "---------" || value === "DNF";
}

function formatSecondaryTimerDurationMs(value: unknown): string | null {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) return null;
  let time = Math.floor(raw);
  const bits = time % 1000;
  time = (time - bits) / 1000;
  const secs = time % 60;
  const mins = ((time - secs) / 60) % 60;
  const hours = (time - secs - 60 * mins) / 3600;
  let text = String(bits);
  if (bits < 10) text = "0" + text;
  if (bits < 100) text = "0" + text;
  text = secs + "." + text;
  if (secs < 10 && (mins > 0 || hours > 0)) text = "0" + text;
  if (mins > 0 || hours > 0) text = mins + ":" + text;
  if (mins < 10 && hours > 0) text = "0" + text;
  if (hours > 0) text = hours + ":" + text;
  return text;
}

function resolveSecondaryTimerRowStateDurationMs(state: Record<PropertyKey, unknown>): string | null {
  const msKeys = ["duration_ms", "elapsed_ms", "timer_ms", "time_ms", "durationMs", "elapsedMs", "timerMs", "timeMs"];
  for (let index = 0; index < msKeys.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(state, msKeys[index])) continue;
    const formatted = formatSecondaryTimerDurationMs(state[msKeys[index]]);
    if (formatted !== null) return formatted;
  }
  return null;
}

function normalizeSecondaryTimerRowStateTime(state: unknown): string | null {
  if (!isCoreHelperRecordObject(state)) return null;
  const textKeys = ["time", "timerText", "timer_text", "text", "valueText", "value_text"];
  let fallbackText: string | null = null;
  for (let index = 0; index < textKeys.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(state, textKeys[index])) continue;
    const rawText = state[textKeys[index]];
    if (typeof rawText !== "string") continue;
    if (isSecondaryTimerDisplayTimeText(rawText)) return rawText;
    if (fallbackText === null) fallbackText = rawText;
  }
  const durationText = resolveSecondaryTimerRowStateDurationMs(state);
  if (durationText !== null) return durationText;
  if (fallbackText !== null) return fallbackText;
  if (Object.prototype.hasOwnProperty.call(state, "time")) return null;
  return "";
}

function resolveSecondaryTimerRowStateKey(state: Record<PropertyKey, unknown>): string | null {
  if (typeof state.rule === "string" && state.rule) return "rule|" + state.rule;
  const parent = normalizeSecondaryTimerValue(state.parent);
  const child = normalizeSecondaryTimerValue(state.child);
  if (!isValidSecondaryTimerParentChildPair(parent, child)) return null;
  return String(parent) + "|" + String(child);
}

interface SecondaryTimerRestoredRowState {
  time: string;
  hitKind: string;
  coveredBy: string;
}

function collectSecondaryTimerRowsStateByKey(rowsState: unknown): Record<string, SecondaryTimerRestoredRowState> {
  const stateByKey: Record<string, SecondaryTimerRestoredRowState> = {};
  const rows = Array.isArray(rowsState) ? rowsState : [];

  for (let index = 0; index < rows.length; index += 1) {
    const state = rows[index];
    if (!isCoreHelperRecordObject(state)) continue;
    const key = resolveSecondaryTimerRowStateKey(state);
    if (!key) continue;
    const time = normalizeSecondaryTimerRowStateTime(state);
    if (time === null) continue;
    stateByKey[key] = {
      time,
      hitKind: typeof state.hit_kind === "string" ? state.hit_kind : "",
      coveredBy: typeof state.covered_by === "string" ? state.covered_by : ""
    };
  }

  return stateByKey;
}

function applySecondaryTimerRowStateToDescriptors(
  descriptors: SecondaryTimerDescriptorLike[],
  stateByKey: Record<string, SecondaryTimerRestoredRowState>
): void {
  for (let descriptorIndex = 0; descriptorIndex < descriptors.length; descriptorIndex += 1) {
    const descriptor = descriptors[descriptorIndex];
    if (!descriptor || !descriptor.timerEl) continue;
    const key = descriptor.ruleKey
      ? "rule|" + String(descriptor.ruleKey)
      : String(descriptor.parent) + "|" + String(descriptor.child);
    const rowState = stateByKey[key];
    descriptor.timerEl.textContent = rowState ? rowState.time : "";
    if (!rowState) continue;
    if (rowState.hitKind) {
      descriptor.timerEl.setAttribute?.("data-secondary-hit-kind", rowState.hitKind);
    }
    if (rowState.coveredBy) {
      const explanation = "由 " + rowState.coveredBy + " 越级覆盖";
      descriptor.timerEl.setAttribute?.("data-secondary-covered-by", rowState.coveredBy);
      descriptor.timerEl.setAttribute?.("title", explanation);
      descriptor.timerEl.setAttribute?.(
        "aria-label",
        String(descriptor.ruleKey || "") + " " + rowState.time + "，" + explanation
      );
    }
  }
}

export function applySecondaryTimerRowsState(
  manager: SecondaryTimerManagerLike | null | undefined,
  rowsState: unknown
): void {
  if (!manager) return;
  const descriptors = resolveSecondaryTimerDescriptors(manager);
  const stateByKey = collectSecondaryTimerRowsStateByKey(rowsState);
  applySecondaryTimerRowStateToDescriptors(descriptors, stateByKey);
  refreshSecondaryTimerRowsVisibility(manager);
}
