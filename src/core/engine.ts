import { getBestTileValue } from "./grid-scan";
import { normalizeReplaySeekTarget, planReplayStep } from "./replay-lifecycle";
import { parseReplayImportEnvelope } from "./replay-import";
import { decodeBoardV4, encodeBoardV4 } from "./replay-codec";
import { planTileInteraction } from "./move-apply";
import { computePostMoveLifecycle } from "./post-move";
import { computePostMoveScore } from "./scoring";
import { createUndoSnapshot } from "./undo-snapshot";
import { computeUndoRestoreState } from "./undo-restore";

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
// Facade API — unified callable surface for page/runtime integration
// ---------------------------------------------------------------------------

export interface EngineFacade {
  planTileInteraction: typeof import("./move-apply").planTileInteraction;
  computePostMoveLifecycle: typeof import("./post-move").computePostMoveLifecycle;
  computePostMoveScore: typeof import("./scoring").computePostMoveScore;
  createUndoSnapshot: typeof import("./undo-snapshot").createUndoSnapshot;
  computeUndoRestoreState: typeof import("./undo-restore").computeUndoRestoreState;
  normalizeReplaySeekTarget: typeof import("./replay-lifecycle").normalizeReplaySeekTarget;
  planReplayStep: typeof import("./replay-lifecycle").planReplayStep;
  parseReplayImportEnvelope: typeof import("./replay-import").parseReplayImportEnvelope;
  encodeBoardV4: typeof import("./replay-codec").encodeBoardV4;
  decodeBoardV4: typeof import("./replay-codec").decodeBoardV4;
  getBestTileValue: typeof import("./grid-scan").getBestTileValue;
}

export function createEngineFacade(): EngineFacade {
  return {
    planTileInteraction,
    computePostMoveLifecycle,
    computePostMoveScore,
    createUndoSnapshot,
    computeUndoRestoreState,
    normalizeReplaySeekTarget,
    planReplayStep,
    parseReplayImportEnvelope,
    encodeBoardV4,
    decodeBoardV4,
    getBestTileValue
  };
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
