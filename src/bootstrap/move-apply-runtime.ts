import {
  planTileInteraction,
  type CellPoint,
  type TileInteractionInput,
  type TileInteractionResult
} from "../core/move-apply";

export type MoveApplyRuntimeInput = Partial<TileInteractionInput> | null | undefined;

export interface MoveApplyRuntime {
  planTileInteraction: (input: MoveApplyRuntimeInput) => TileInteractionResult;
}

export interface MoveApplyRuntimeWindowLike {
  CoreMoveApplyRuntime?: MoveApplyRuntime;
}

export interface MoveApplyRuntimeInstallOptions {
  windowLike?: MoveApplyRuntimeWindowLike | null | undefined;
}

function normalizePoint(point: Partial<CellPoint> | null | undefined): CellPoint {
  if (!point || typeof point !== "object") {
    return { x: 0, y: 0 };
  }
  return {
    x: point.x as number,
    y: point.y as number
  };
}

function normalizeLegacyMoveApplyInput(input: MoveApplyRuntimeInput): TileInteractionInput {
  const opts = input || {};
  return {
    cell: normalizePoint(opts.cell),
    farthest: normalizePoint(opts.farthest),
    next: normalizePoint(opts.next),
    hasNextTile: Boolean(opts.hasNextTile),
    nextMergedFrom: Boolean(opts.nextMergedFrom),
    mergedValue: opts.mergedValue as number | null
  };
}

export function createMoveApplyRuntime(): MoveApplyRuntime {
  return {
    planTileInteraction: (input) => planTileInteraction(normalizeLegacyMoveApplyInput(input))
  };
}

export function installMoveApplyRuntime(
  options: MoveApplyRuntimeInstallOptions = {}
): MoveApplyRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as MoveApplyRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreMoveApplyRuntime) {
    windowLike.CoreMoveApplyRuntime = createMoveApplyRuntime();
  }
  return windowLike.CoreMoveApplyRuntime || null;
}
