export type Ruleset = "pow2" | "fibonacci";

export interface EngineConfig {
  width: number;
  height: number;
  ruleset: Ruleset;
  undoEnabled: boolean;
  maxTile?: number | null;
}

export class Engine {
  private started = false;

  constructor(public readonly config: EngineConfig) {}

  start(): void {
    this.started = true;
  }

  isStarted(): boolean {
    return this.started;
  }
}
