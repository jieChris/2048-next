export type CustomSecondaryTimerFamily = "pow2" | "fibonacci";
export type CustomSecondaryTimerHitKind = "exact" | "covered";

export interface CustomSecondaryTimerRule {
  key: string;
  parent: number;
  values: number[];
  expression: string;
  line: number;
}

export interface CustomSecondaryTimerParseError {
  line: number;
  message: string;
}

export interface CustomSecondaryTimerParseResult {
  rules: CustomSecondaryTimerRule[];
  errors: CustomSecondaryTimerParseError[];
}

export interface CustomSecondaryTimerMatch {
  kind: CustomSecondaryTimerHitKind;
  coveredBy: string;
}

export interface CustomSecondaryTimerRuntime {
  resolveCustomSecondaryTimerFamily: typeof resolveCustomSecondaryTimerFamily;
  parseCustomSecondaryTimerRules: typeof parseCustomSecondaryTimerRules;
  matchCustomSecondaryTimerRule: typeof matchCustomSecondaryTimerRule;
  readCustomSecondaryTimerRuleText: typeof readCustomSecondaryTimerRuleText;
  writeCustomSecondaryTimerRuleText: typeof writeCustomSecondaryTimerRuleText;
}

export interface CustomSecondaryTimerRuntimeWindowLike {
  CoreCustomSecondaryTimerRuntime?: CustomSecondaryTimerRuntime;
}

export const CUSTOM_SECONDARY_TIMER_STORAGE_KEY =
  "settings_custom_secondary_timer_rules_by_family_v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizePositiveInteger(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function isPowerOfTwo(value: number): boolean {
  return value >= 2 && (value & (value - 1)) === 0;
}

function isFibonacciValue(value: number): boolean {
  if (value === 1 || value === 2) return true;
  let previous = 1;
  let current = 2;
  while (current < value) {
    const next = previous + current;
    previous = current;
    current = next;
  }
  return current === value;
}

function isAllowedValue(value: number, family: CustomSecondaryTimerFamily): boolean {
  return family === "fibonacci" ? isFibonacciValue(value) : isPowerOfTwo(value);
}

function compareProgressValues(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] || 0;
    const rightValue = right[index] || 0;
    if (leftValue !== rightValue) return leftValue - rightValue;
  }
  return 0;
}

function collectValueCounts(values: number[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = String(value);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function containsRequiredValues(actual: number[], required: number[]): boolean {
  const actualCounts = collectValueCounts(actual);
  const requiredCounts = collectValueCounts(required);
  for (const key of Object.keys(requiredCounts)) {
    if ((actualCounts[key] || 0) < requiredCounts[key]) return false;
  }
  return true;
}

function containsOnlyNonProgressingExtras(actual: number[], required: number[]): boolean {
  const remainingCounts = collectValueCounts(actual);
  for (const value of required) {
    const key = String(value);
    if (!remainingCounts[key]) return false;
    remainingCounts[key] -= 1;
  }
  const smallestRequired = required[required.length - 1] || 0;
  for (const key of Object.keys(remainingCounts)) {
    if (remainingCounts[key] > 0 && Number(key) > smallestRequired) return false;
  }
  return true;
}

function resolveCoveringExpression(actual: number[], target: number[]): string {
  const prefix: number[] = [];
  const length = Math.max(actual.length, target.length);
  for (let index = 0; index < length; index += 1) {
    const actualValue = actual[index] || 0;
    const targetValue = target[index] || 0;
    if (actualValue > 0) prefix.push(actualValue);
    if (actualValue !== targetValue) break;
  }
  return prefix.join("+");
}

function normalizeParentValues(parentValues: unknown): Set<number> {
  const values = Array.isArray(parentValues) ? parentValues : [];
  const parents = new Set<number>();
  for (const value of values) {
    const normalized = normalizePositiveInteger(value);
    if (normalized !== null) parents.add(normalized);
  }
  return parents;
}

function getRecommendedChildValues(parent: number, family: CustomSecondaryTimerFamily): number[] {
  const values: number[] = [];
  if (family === "pow2") {
    for (let value = 2; value < parent; value *= 2) values.push(value);
    return values;
  }
  let previous = 1;
  let current = 2;
  values.push(previous);
  while (current < parent) {
    values.push(current);
    const next = previous + current;
    previous = current;
    current = next;
  }
  return values;
}

export function generateRecommendedSecondaryTimerRuleText(input: {
  family?: unknown;
  parentValues?: unknown;
  startParent?: unknown;
  endParent?: unknown;
}): string {
  const family = resolveCustomSecondaryTimerFamily(input?.family);
  const start = normalizePositiveInteger(input?.startParent);
  const end = normalizePositiveInteger(input?.endParent);
  if (start === null || end === null) return "";
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const groups: string[] = [];
  const parents = Array.from(normalizeParentValues(input?.parentValues)).sort((left, right) => left - right);
  for (const parent of parents) {
    if (parent < low || parent > high) continue;
    const children = getRecommendedChildValues(parent, family);
    const lines = [String(parent), ...children.map((child) => `${parent}+${child}`)];
    const largestChild = children[children.length - 1];
    if (largestChild) {
      lines.push(...children.slice(0, -1).map((child) => `${parent}+${largestChild}+${child}`));
    }
    groups.push(lines.join("\n"));
  }
  return groups.join("\n\n");
}

function parseRuleValues(rawLine: string): number[] | null {
  const parts = rawLine.split("+");
  if (parts.some((part) => part.trim() === "")) return null;
  const values: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part.trim())) return null;
    const value = normalizePositiveInteger(part.trim());
    if (value === null) return null;
    values.push(value);
  }
  return values;
}

export function resolveCustomSecondaryTimerFamily(ruleset: unknown): CustomSecondaryTimerFamily {
  return String(ruleset || "").toLowerCase() === "fibonacci" ? "fibonacci" : "pow2";
}

export function parseCustomSecondaryTimerRules(input: {
  text?: unknown;
  family?: unknown;
  parentValues?: unknown;
}): CustomSecondaryTimerParseResult {
  const text = typeof input?.text === "string" ? input.text : "";
  const family = resolveCustomSecondaryTimerFamily(input?.family);
  const allowedParents = normalizeParentValues(input?.parentValues);
  const rules: CustomSecondaryTimerRule[] = [];
  const errors: CustomSecondaryTimerParseError[] = [];
  const seenExpressions = new Set<string>();
  let activeParent: number | null = null;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;
    const values = parseRuleValues(trimmed);
    if (!values) {
      errors.push({ line, message: "仅支持用 + 分隔的正整数" });
      return;
    }
    if (values.some((value) => !isAllowedValue(value, family))) {
      errors.push({ line, message: family === "fibonacci" ? "包含非 Fibonacci 数值" : "包含非 2 的幂数值" });
      return;
    }
    const parent = values[0];
    if (values.length === 1) {
      if (!allowedParents.has(parent)) {
        errors.push({ line, message: "母计时器不是当前规则体系中的现有计时器" });
        return;
      }
      activeParent = parent;
      return;
    }
    if (activeParent === null || parent !== activeParent) {
      errors.push({ line, message: "子规则必须写在对应母计时器行下面" });
      return;
    }
    const children = values.slice(1);
    if (children.some((value) => value >= parent)) {
      errors.push({ line, message: "子规则数值必须小于母计时器" });
      return;
    }
    children.sort((left, right) => right - left);
    const normalizedValues = [parent, ...children];
    const expression = normalizedValues.join("+");
    if (seenExpressions.has(expression)) {
      errors.push({ line, message: "规则重复" });
      return;
    }
    seenExpressions.add(expression);
    rules.push({
      key: expression,
      parent,
      values: normalizedValues,
      expression,
      line
    });
  });

  rules.sort((left, right) => {
    if (left.parent !== right.parent) return left.parent - right.parent;
    return compareProgressValues(left.values, right.values);
  });
  return { rules: errors.length > 0 ? [] : rules, errors };
}

export function matchCustomSecondaryTimerRule(
  boardValues: unknown,
  rule: CustomSecondaryTimerRule
): CustomSecondaryTimerMatch | null {
  const actual = (Array.isArray(boardValues) ? boardValues : [])
    .map(normalizePositiveInteger)
    .filter((value): value is number => value !== null)
    .sort((left, right) => right - left);
  if (
    containsRequiredValues(actual, rule.values) &&
    containsOnlyNonProgressingExtras(actual, rule.values)
  ) {
    return { kind: "exact", coveredBy: "" };
  }
  if (compareProgressValues(actual, rule.values) <= 0) return null;
  return {
    kind: "covered",
    coveredBy: resolveCoveringExpression(actual, rule.values)
  };
}

function readRuleTextMap(storageLike: unknown): Record<string, unknown> {
  if (!isRecord(storageLike) || typeof storageLike.getItem !== "function") return {};
  try {
    const parsed = JSON.parse(String(storageLike.getItem(CUSTOM_SECONDARY_TIMER_STORAGE_KEY) || "{}"));
    return isRecord(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

export function readCustomSecondaryTimerRuleText(
  storageLike: unknown,
  family: CustomSecondaryTimerFamily
): string {
  const value = readRuleTextMap(storageLike)[family];
  return typeof value === "string" ? value : "";
}

export function writeCustomSecondaryTimerRuleText(
  storageLike: unknown,
  family: CustomSecondaryTimerFamily,
  text: string
): boolean {
  if (!isRecord(storageLike) || typeof storageLike.setItem !== "function") return false;
  const map = readRuleTextMap(storageLike);
  map[family] = text;
  try {
    storageLike.setItem(CUSTOM_SECONDARY_TIMER_STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch (_error) {
    return false;
  }
}

export function createCustomSecondaryTimerRuntime(): CustomSecondaryTimerRuntime {
  return {
    resolveCustomSecondaryTimerFamily,
    parseCustomSecondaryTimerRules,
    matchCustomSecondaryTimerRule,
    readCustomSecondaryTimerRuleText,
    writeCustomSecondaryTimerRuleText
  };
}

export function installCustomSecondaryTimerRuntime(options: {
  windowLike?: CustomSecondaryTimerRuntimeWindowLike | null;
} = {}): CustomSecondaryTimerRuntime | null {
  const target = options.windowLike === undefined
    ? typeof window === "undefined"
      ? null
      : (window as unknown as CustomSecondaryTimerRuntimeWindowLike)
    : options.windowLike;
  if (!target) return null;
  if (!target.CoreCustomSecondaryTimerRuntime) {
    target.CoreCustomSecondaryTimerRuntime = createCustomSecondaryTimerRuntime();
  }
  return target.CoreCustomSecondaryTimerRuntime;
}
