export interface UndoManagerLike {
  mode?: string | null | undefined;
  modeConfig?: {
    undo_enabled?: boolean | null | undefined;
  } | null | undefined;
  undoEnabled?: boolean | null | undefined;
  isUndoAllowedByMode?: ((mode: string) => boolean) | null | undefined;
  isUndoInteractionEnabled?: (() => boolean) | null | undefined;
  move?: ((direction: number) => unknown) | null | undefined;
}

interface BodyLike {
  getAttribute?(name: string): string | null;
}

export interface UndoGlobalModeConfigLike {
  key?: string | null | undefined;
  undo_enabled?: boolean | null | undefined;
}

export interface UndoCapabilityInput {
  modeId?: string | null | undefined;
  manager?: UndoManagerLike | null | undefined;
  globalModeConfig?: UndoGlobalModeConfigLike | null | undefined;
}

export interface ResolveUndoModeIdFromBodyOptions {
  bodyLike?: BodyLike | null | undefined;
}

export interface ResolveUndoCapabilityFromContextOptions {
  bodyLike?: BodyLike | null | undefined;
  manager?: UndoManagerLike | null | undefined;
  globalModeConfig?: UndoGlobalModeConfigLike | null | undefined;
}

export interface UndoCapabilityState {
  modeId: string;
  modeUndoCapable: boolean;
}

export function resolveUndoModeIdFromBody(
  options: ResolveUndoModeIdFromBodyOptions
): string {
  const opts = options || {};
  const body = opts.bodyLike || null;
  if (!body || typeof body.getAttribute !== "function") return "";
  try {
    const value = body.getAttribute("data-mode-id");
    return typeof value === "string" ? value : "";
  } catch (_err) {
    return "";
  }
}

export function canTriggerUndo(
  manager: UndoManagerLike | null | undefined
): boolean {
  return Boolean(
    manager &&
      typeof manager.isUndoInteractionEnabled === "function" &&
      typeof manager.move === "function" &&
      manager.isUndoInteractionEnabled()
  );
}

export function tryTriggerUndo(
  manager: UndoManagerLike | null | undefined,
  direction = -1
): boolean {
  if (!manager) return false;
  if (typeof manager.isUndoInteractionEnabled !== "function") return false;
  if (typeof manager.move !== "function") return false;
  if (!manager.isUndoInteractionEnabled()) return false;
  manager.move(direction);
  return true;
}

export function resolveUndoModeId(input: UndoCapabilityInput): string {
  const modeIdRaw = input.modeId;
  if (typeof modeIdRaw === "string" && modeIdRaw.trim()) {
    return modeIdRaw.trim().toLowerCase();
  }

  const managerMode = input.manager?.mode;
  if (typeof managerMode === "string" && managerMode.trim()) {
    return managerMode.trim().toLowerCase();
  }

  const configMode = input.globalModeConfig?.key;
  if (typeof configMode === "string" && configMode.trim()) {
    return configMode.trim().toLowerCase();
  }

  return "";
}

export function isUndoCapableMode(input: UndoCapabilityInput): boolean {
  const modeId = resolveUndoModeId(input);
  const manager = input.manager || null;

  if (modeId) {
    if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) return false;
    if (modeId === "capped" || modeId.indexOf("capped") !== -1) return false;
    if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) return true;
  }

  const managerExplicitUndo = manager?.modeConfig?.undo_enabled;
  if (typeof managerExplicitUndo === "boolean") return managerExplicitUndo;

  const globalExplicitUndo = input.globalModeConfig?.undo_enabled;
  if (typeof globalExplicitUndo === "boolean") return globalExplicitUndo;

  if (!manager) return false;
  try {
    if (typeof manager.isUndoAllowedByMode === "function") {
      return Boolean(manager.isUndoAllowedByMode(modeId || String(manager.mode || "")));
    }
  } catch (_err) {}

  return Boolean(manager.undoEnabled);
}

export function resolveUndoCapabilityFromContext(
  options: ResolveUndoCapabilityFromContextOptions
): UndoCapabilityState {
  const opts = options || {};
  const modeId = resolveUndoModeIdFromBody({
    bodyLike: opts.bodyLike
  });
  return {
    modeId,
    modeUndoCapable: isUndoCapableMode({
      modeId,
      manager: opts.manager || null,
      globalModeConfig: opts.globalModeConfig || null
    })
  };
}

export function isUndoInteractionEnabled(
  manager: UndoManagerLike | null | undefined
): boolean {
  return Boolean(
    manager &&
      typeof manager.isUndoInteractionEnabled === "function" &&
      manager.isUndoInteractionEnabled()
  );
}
