import {
  assignManagerClientRecordId,
  buildClientRecordIdRandomSuffix,
  createManagerClientRecordId,
  resolveManagerClientRecordId
} from "../core/game-manager-client-record-id";

export interface GameManagerClientRecordIdRuntime {
  createManagerClientRecordId: typeof createManagerClientRecordId;
  buildClientRecordIdRandomSuffix: typeof buildClientRecordIdRandomSuffix;
  assignManagerClientRecordId: typeof assignManagerClientRecordId;
  resolveManagerClientRecordId: typeof resolveManagerClientRecordId;
}

export interface GameManagerClientRecordIdRuntimeWindowLike {
  CoreGameManagerClientRecordIdRuntime?: GameManagerClientRecordIdRuntime;
  createManagerClientRecordId?: typeof createManagerClientRecordId;
  buildClientRecordIdRandomSuffix?: typeof buildClientRecordIdRandomSuffix;
  assignManagerClientRecordId?: typeof assignManagerClientRecordId;
  resolveManagerClientRecordId?: typeof resolveManagerClientRecordId;
}

export interface GameManagerClientRecordIdRuntimeInstallOptions {
  windowLike?: GameManagerClientRecordIdRuntimeWindowLike | null | undefined;
}

export function createGameManagerClientRecordIdRuntime(): GameManagerClientRecordIdRuntime {
  return {
    createManagerClientRecordId,
    buildClientRecordIdRandomSuffix,
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
  if (typeof windowLike.buildClientRecordIdRandomSuffix !== "function") {
    windowLike.buildClientRecordIdRandomSuffix = runtime.buildClientRecordIdRandomSuffix;
  }
  if (typeof windowLike.assignManagerClientRecordId !== "function") {
    windowLike.assignManagerClientRecordId = runtime.assignManagerClientRecordId;
  }
  if (typeof windowLike.resolveManagerClientRecordId !== "function") {
    windowLike.resolveManagerClientRecordId = runtime.resolveManagerClientRecordId;
  }
  if (!windowLike.CoreGameManagerClientRecordIdRuntime) {
    windowLike.CoreGameManagerClientRecordIdRuntime = {
      createManagerClientRecordId: windowLike.createManagerClientRecordId,
      buildClientRecordIdRandomSuffix: windowLike.buildClientRecordIdRandomSuffix,
      assignManagerClientRecordId: windowLike.assignManagerClientRecordId,
      resolveManagerClientRecordId: windowLike.resolveManagerClientRecordId
    };
  }
  return windowLike.CoreGameManagerClientRecordIdRuntime || {
    createManagerClientRecordId: windowLike.createManagerClientRecordId,
    buildClientRecordIdRandomSuffix: windowLike.buildClientRecordIdRandomSuffix,
    assignManagerClientRecordId: windowLike.assignManagerClientRecordId,
    resolveManagerClientRecordId: windowLike.resolveManagerClientRecordId
  };
}
