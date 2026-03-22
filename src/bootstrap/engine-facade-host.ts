import { createEngineFacade } from "../core/engine";

type AnyRecord = Record<string, unknown>;

export interface EngineFacadeWindowLike {
  CoreEngineFacade?: unknown;
}

function hasFunction(target: unknown, key: string): boolean {
  if (!target || typeof target !== "object") return false;
  return typeof (target as AnyRecord)[key] === "function";
}

export function registerEngineFacade(windowLike: EngineFacadeWindowLike | undefined): void {
  if (!windowLike || typeof windowLike !== "object") return;
  const existing = windowLike.CoreEngineFacade;
  if (hasFunction(existing, "createUndoSnapshot") && hasFunction(existing, "computeUndoRestoreState")) {
    return;
  }
  windowLike.CoreEngineFacade = createEngineFacade();
}
