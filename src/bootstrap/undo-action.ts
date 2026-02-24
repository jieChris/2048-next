export interface UndoManagerLike {
  isUndoInteractionEnabled?: (() => boolean) | null | undefined;
  move?: ((direction: number) => unknown) | null | undefined;
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
