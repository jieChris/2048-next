import {
  assignManagerClientRecordId,
  createManagerClientRecordId,
  resolveManagerClientRecordId
} from "../core/game-manager-client-record-id";

export interface GameManagerClientRecordIdRuntime {
  createManagerClientRecordId: typeof createManagerClientRecordId;
  assignManagerClientRecordId: typeof assignManagerClientRecordId;
  resolveManagerClientRecordId: typeof resolveManagerClientRecordId;
}

export interface GameManagerClientRecordIdRuntimeWindowLike {
  createManagerClientRecordId?: typeof createManagerClientRecordId;
  assignManagerClientRecordId?: typeof assignManagerClientRecordId;
  resolveManagerClientRecordId?: typeof resolveManagerClientRecordId;
}

export interface GameManagerClientRecordIdRuntimeInstallOptions {
  windowLike?: GameManagerClientRecordIdRuntimeWindowLike | null | undefined;
}

export function createGameManagerClientRecordIdRuntime(): GameManagerClientRecordIdRuntime {
  return {
    createManagerClientRecordId,
    assignManagerClientRecordId,
    resolveManagerClientRecordId
  };
}

export function installGameManagerClientRecordIdRuntime(
  options: GameManagerClientRecordIdRuntimeInstallOptions = {}
): GameManagerClientRecordIdRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as GameManagerClientRecordIdRuntimeWindowLike));
  if (!windowLike) return null;

  const runtime = createGameManagerClientRecordIdRuntime();
  if (typeof windowLike.createManagerClientRecordId !== "function") {
    windowLike.createManagerClientRecordId = runtime.createManagerClientRecordId;
  }
  if (typeof windowLike.assignManagerClientRecordId !== "function") {
    windowLike.assignManagerClientRecordId = runtime.assignManagerClientRecordId;
  }
  if (typeof windowLike.resolveManagerClientRecordId !== "function") {
    windowLike.resolveManagerClientRecordId = runtime.resolveManagerClientRecordId;
  }

  return {
    createManagerClientRecordId: windowLike.createManagerClientRecordId,
    assignManagerClientRecordId: windowLike.assignManagerClientRecordId,
    resolveManagerClientRecordId: windowLike.resolveManagerClientRecordId
  };
}
