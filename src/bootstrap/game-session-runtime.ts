import { isAppModeKey, type AppModeKey } from "../contracts";
import {
  createEngineSession,
  type EngineConfig,
  type EngineSession
} from "../core/engine";

export interface GameSessionRuntime {
  supportsMode(modeKey: unknown): modeKey is AppModeKey;
  createSession(config: EngineConfig): EngineSession;
}

export interface GameSessionRuntimeWindowLike {
  CoreGameSessionRuntime?: GameSessionRuntime;
}

export function createGameSessionRuntime(): GameSessionRuntime {
  return {
    supportsMode: isAppModeKey,
    createSession: createEngineSession
  };
}

export function installGameSessionRuntime(
  windowLike: GameSessionRuntimeWindowLike | null | undefined =
    typeof window === "undefined"
      ? null
      : (window as unknown as GameSessionRuntimeWindowLike)
): GameSessionRuntime | null {
  if (!windowLike) return null;
  if (!windowLike.CoreGameSessionRuntime) {
    windowLike.CoreGameSessionRuntime = createGameSessionRuntime();
  }
  return windowLike.CoreGameSessionRuntime;
}
