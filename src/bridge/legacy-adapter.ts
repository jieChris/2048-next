import { Engine, type EngineConfig } from "../core/engine";

export interface LegacyModeConfig {
  key?: string;
  board_width?: number;
  board_height?: number;
  ruleset?: string;
  undo_enabled?: boolean;
  max_tile?: number | null;
}

export interface LegacyEngineBridge {
  engine: Engine;
  start: () => void;
  isStarted: () => boolean;
}

const DEFAULT_ENGINE_SIZE = 4;

function normalizeRuleset(raw: string | undefined): EngineConfig["ruleset"] {
  return raw === "fibonacci" ? "fibonacci" : "pow2";
}

function toPositiveInt(raw: number | undefined, fallback: number): number {
  return Number.isFinite(raw) && Number(raw) > 0 ? Math.floor(Number(raw)) : fallback;
}

export function buildEngineConfigFromLegacyMode(
  modeConfig: LegacyModeConfig | null | undefined
): EngineConfig {
  return {
    width: toPositiveInt(modeConfig?.board_width, DEFAULT_ENGINE_SIZE),
    height: toPositiveInt(modeConfig?.board_height, DEFAULT_ENGINE_SIZE),
    ruleset: normalizeRuleset(modeConfig?.ruleset),
    undoEnabled: modeConfig?.undo_enabled === true,
    maxTile: modeConfig?.max_tile ?? null
  };
}

export function createLegacyEngineBridge(config: EngineConfig): LegacyEngineBridge {
  const engine = new Engine(config);
  return {
    engine,
    start() {
      engine.start();
    },
    isStarted() {
      return engine.isStarted();
    }
  };
}

export function createLegacyEngineBridgeFromMode(
  modeConfig: LegacyModeConfig | null | undefined
): LegacyEngineBridge {
  return createLegacyEngineBridge(buildEngineConfigFromLegacyMode(modeConfig));
}
