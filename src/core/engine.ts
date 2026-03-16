// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Ruleset = "pow2" | "fibonacci";

export type Direction = 0 | 1 | 2 | 3;

export interface EngineConfig {
  width: number;
  height: number;
  ruleset: Ruleset;
  undoEnabled: boolean;
  maxTile?: number | null;
}

export interface EngineState {
  score: number;
  board: number[][];
  over: boolean;
  won: boolean;
  successfulMoveCount: number;
  undoUsed: number;
  comboStreak: number;
}

export interface MoveResult {
  moved: boolean;
  interactions: import("./move-apply").TileInteractionResult[];
  lifecycle: import("./post-move").PostMoveLifecycleResult;
  scoring: import("./scoring").PostMoveScoreResult;
}

export interface ExportedState {
  version: number;
  config: EngineConfig;
  state: EngineState;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Barrel re-exports — pure function delegation
// ---------------------------------------------------------------------------

export { planTileInteraction } from "./move-apply";
export { computePostMoveLifecycle } from "./post-move";
export { computePostMoveScore } from "./scoring";
export { computeUndoRestoreState } from "./undo-restore";
export { createUndoSnapshot } from "./undo-snapshot";
export { normalizeReplaySeekTarget, planReplayStep } from "./replay-lifecycle";
export { parseReplayImportEnvelope } from "./replay-import";
export { encodeBoardV4, decodeBoardV4 } from "./replay-codec";
export { getBestTileValue } from "./grid-scan";
