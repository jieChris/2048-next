function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
}

function removeHomeGuideSettingsTriggerRow(documentLike: unknown): boolean {
  const trigger = getElementById(documentLike, "home-guide-trigger-btn");
  const triggerClosest = asFunction<(selector: string) => unknown>(toRecord(trigger).closest);
  const row =
    triggerClosest && trigger ? (triggerClosest as unknown as Function).call(trigger, ".settings-row") : null;
  const node = row || trigger;
  if (!node) return false;
  const parentNode = toRecord(node).parentNode;
  const removeChild = asFunction<(value: unknown) => unknown>(toRecord(parentNode).removeChild);
  if (!removeChild) return false;
  (removeChild as unknown as Function).call(parentNode, node);
  return true;
}

export interface HomeGuideSettingsHostResult {
  hasToggle: boolean;
  didBindToggle: boolean;
  didAssignSync: boolean;
  didSync: boolean;
}

export function applyHomeGuideSettingsUi(input: {
  documentLike?: unknown;
  windowLike?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  isHomePage?: unknown;
  closeSettingsModal?: unknown;
  startHomeGuide?: unknown;
}): HomeGuideSettingsHostResult {
  const source = toRecord(input);
  removeHomeGuideSettingsTriggerRow(toRecord(source.documentLike));
  let didAssignSync = false;
  if (isRecord(source.windowLike)) {
    source.windowLike.syncHomeGuideSettingsUI = (): void => {};
    didAssignSync = true;
  }

  return {
    hasToggle: false,
    didBindToggle: false,
    didAssignSync,
    didSync: false
  };
}
