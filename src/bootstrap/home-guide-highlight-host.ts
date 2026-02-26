function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function removeClass(node: unknown, className: string): boolean {
  const classList = toRecord(node).classList;
  const remove = asFunction<(value: string) => unknown>(toRecord(classList).remove);
  if (!remove) return false;
  (remove as unknown as Function).call(classList, className);
  return true;
}

function addClass(node: unknown, className: string): boolean {
  const classList = toRecord(node).classList;
  const add = asFunction<(value: string) => unknown>(toRecord(classList).add);
  if (!add) return false;
  (add as unknown as Function).call(classList, className);
  return true;
}

function querySelectorAll(node: unknown, selector: string): unknown[] {
  const query = asFunction<(value: string) => unknown>(toRecord(node).querySelectorAll);
  if (!query) return [];
  const result = query.call(node, selector);
  if (Array.isArray(result)) return result;
  if (!result || typeof (result as { length?: unknown }).length !== "number") return [];
  const list: unknown[] = [];
  const length = (result as { length: number }).length;
  for (let i = 0; i < length; i++) {
    list.push((result as { [key: number]: unknown })[i]);
  }
  return list;
}

export interface HomeGuideHighlightClearResult {
  clearedScopedCount: number;
  clearedElevatedCount: number;
  hadTarget: boolean;
}

export function applyHomeGuideHighlightClear(input: {
  documentLike?: unknown;
  homeGuideState?: unknown;
}): HomeGuideHighlightClearResult {
  const source = toRecord(input);
  const homeGuideState = toRecord(source.homeGuideState);

  const hadTarget = removeClass(homeGuideState.target, "home-guide-highlight");

  const scoped = querySelectorAll(source.documentLike, ".home-guide-scope");
  let clearedScopedCount = 0;
  for (let s = 0; s < scoped.length; s++) {
    if (removeClass(scoped[s], "home-guide-scope")) {
      clearedScopedCount += 1;
    }
  }

  const elevated = resolveArray(homeGuideState.elevated);
  let clearedElevatedCount = 0;
  for (let i = 0; i < elevated.length; i++) {
    if (removeClass(elevated[i], "home-guide-elevated")) {
      clearedElevatedCount += 1;
    }
  }

  homeGuideState.elevated = [];
  homeGuideState.target = null;

  return {
    clearedScopedCount,
    clearedElevatedCount,
    hadTarget
  };
}

export interface HomeGuideTargetElevationResult {
  didElevateHost: boolean;
  didScopeTopActions: boolean;
}

export function applyHomeGuideTargetElevation(input: {
  target?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
}): HomeGuideTargetElevationResult {
  const source = toRecord(input);
  const target = source.target;
  const closest = asFunction<(selector: string) => unknown>(toRecord(target).closest);
  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const resolveHomeGuideElevationPlan = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideElevationPlan
  );
  if (!closest || !resolveHomeGuideElevationPlan) {
    return {
      didElevateHost: false,
      didScopeTopActions: false
    };
  }

  const elevated: unknown[] = [];
  const topActionButtons = closest.call(target, ".top-action-buttons");
  const headingHost = closest.call(target, ".heading");
  const elevationPlan = toRecord(
    resolveHomeGuideElevationPlan({
      hasTopActionButtonsAncestor: !!topActionButtons,
      hasHeadingAncestor: !!headingHost
    })
  );

  let stackHost: unknown = null;
  if (elevationPlan.hostSelector === ".top-action-buttons") {
    stackHost = topActionButtons;
  } else if (elevationPlan.hostSelector === ".heading") {
    stackHost = headingHost;
  }

  const didElevateHost = !!(stackHost && addClass(stackHost, "home-guide-elevated"));
  if (didElevateHost) {
    elevated.push(stackHost);
  }

  const didScopeTopActions = !!(
    elevationPlan.shouldScopeTopActions &&
    topActionButtons &&
    addClass(topActionButtons, "home-guide-scope")
  );

  const homeGuideState = toRecord(source.homeGuideState);
  homeGuideState.elevated = elevated;

  return {
    didElevateHost,
    didScopeTopActions
  };
}
