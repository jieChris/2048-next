import type { TileInteractionInput, TileInteractionResult } from "./move-apply";
import type { PostMoveLifecycleInput, PostMoveLifecycleResult } from "./post-move";
import type { PostMoveScoreInput, PostMoveScoreResult } from "./scoring";
import type { UndoRestoreInput, UndoRestoreResult } from "./undo-restore";
import type { UndoSnapshotInput, UndoSnapshotResult } from "./undo-snapshot";
import type { ReplaySeekTargetInput, ReplayStepPlanInput, ReplayStepPlanResult } from "./replay-lifecycle";
import type { ReplayImportEnvelope, ParseReplayImportEnvelopeInput } from "./replay-import";

import { planTileInteraction } from "./move-apply";
import { computePostMoveLifecycle } from "./post-move";
import { computePostMoveScore } from "./scoring";
import { computeUndoRestoreState } from "./undo-restore";
import { createUndoSnapshot } from "./undo-snapshot";
import { normalizeReplaySeekTarget, planReplayStep } from "./replay-lifecycle";
import { parseReplayImportEnvelope } from "./replay-import";
import { encodeBoardV4, decodeBoardV4 } from "./replay-codec";
import { getBestTileValue } from "./grid-scan";

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
  interactions: TileInteractionResult[];
  lifecycle: PostMoveLifecycleResult;
  scoring: PostMoveScoreResult;
}

export interface ExportedState {
  version: number;
  config: EngineConfig;
  state: EngineState;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Engine class — unified entry point for core game logic
// ---------------------------------------------------------------------------

export class Engine {
  private started = false;
  public readonly config: EngineConfig;
  private state: EngineState;

  constructor(config: EngineConfig) {
    this.config = Object.freeze({ ...config });
    this.state = {
      score: 0,
      board: [],
      over: false,
      won: false,
      successfulMoveCount: 0,
      undoUsed: 0,
      comboStreak: 0
    };
  }

  // -- Lifecycle ------------------------------------------------------------

  start(): void {
    this.started = true;
  }

  isStarted(): boolean {
    return this.started;
  }

  getState(): Readonly<EngineState> {
    return this.state;
  }

  // -- State I/O ------------------------------------------------------------

  loadState(state: Partial<EngineState>): void {
    if (state.score !== undefined) this.state.score = Number(state.score) || 0;
    if (state.board !== undefined) this.state.board = state.board;
    if (state.over !== undefined) this.state.over = !!state.over;
    if (state.won !== undefined) this.state.won = !!state.won;
    if (state.successfulMoveCount !== undefined) {
      this.state.successfulMoveCount = Number(state.successfulMoveCount) || 0;
    }
    if (state.undoUsed !== undefined) this.state.undoUsed = Number(state.undoUsed) || 0;
    if (state.comboStreak !== undefined) this.state.comboStreak = Number(state.comboStreak) || 0;
  }

  exportState(): ExportedState {
    return {
      version: 1,
      config: { ...this.config },
      state: { ...this.state, board: this.state.board.map((r) => [...r]) },
      timestamp: new Date().toISOString()
    };
  }

  importState(exported: ExportedState): void {
    this.loadState(exported.state);
  }

  // -- Core operations (delegated to pure functions) ------------------------

  planTileInteraction(input: TileInteractionInput): TileInteractionResult {
    return planTileInteraction(input);
  }

  computePostMoveLifecycle(input: PostMoveLifecycleInput): PostMoveLifecycleResult {
    return computePostMoveLifecycle(input);
  }

  computePostMoveScore(input: PostMoveScoreInput): PostMoveScoreResult {
    return computePostMoveScore(input);
  }

  // -- Undo -----------------------------------------------------------------

  createUndoSnapshot(input: UndoSnapshotInput): UndoSnapshotResult {
    return createUndoSnapshot(input);
  }

  computeUndoRestore(input: UndoRestoreInput): UndoRestoreResult {
    return computeUndoRestoreState(input);
  }

  // -- Replay ---------------------------------------------------------------

  normalizeReplaySeekTarget(input: ReplaySeekTargetInput): number {
    return normalizeReplaySeekTarget(input);
  }

  planReplayStep(input: ReplayStepPlanInput): ReplayStepPlanResult {
    return planReplayStep(input);
  }

  importReplay(input: ParseReplayImportEnvelopeInput): ReplayImportEnvelope {
    return parseReplayImportEnvelope(input);
  }

  // -- Board codec ----------------------------------------------------------

  encodeBoardV4(board: number[][]): string {
    return encodeBoardV4(board);
  }

  decodeBoardV4(encoded: string): number[][] {
    return decodeBoardV4(encoded);
  }

  getBestTile(board: unknown): number {
    return getBestTileValue(board);
  }
}
