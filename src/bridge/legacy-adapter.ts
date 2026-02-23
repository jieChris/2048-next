import { Engine, type EngineConfig } from "../core/engine";

export function createLegacyEngineBridge(config: EngineConfig) {
  const engine = new Engine(config);
  return {
    engine,
    start() {
      engine.start();
    }
  };
}
