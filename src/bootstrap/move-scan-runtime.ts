import { movesAvailable, tileMatchesAvailable, type CellPoint } from "../core/move-scan";

export interface MoveScanRuntime {
  tileMatchesAvailable: (
    width: number,
    height: number,
    isBlockedCell?: (x: number, y: number) => boolean,
    getCellValue?: (cell: CellPoint) => number | null | undefined,
    canMerge?: (a: number, b: number) => boolean,
    directions?: number[] | null
  ) => boolean;
  movesAvailable: typeof movesAvailable;
}

export interface MoveScanRuntimeWindowLike {
  CoreMoveScanRuntime?: MoveScanRuntime;
}

export interface MoveScanRuntimeInstallOptions {
  windowLike?: MoveScanRuntimeWindowLike | null | undefined;
}

export function createMoveScanRuntime(): MoveScanRuntime {
  return {
    tileMatchesAvailable: (width, height, isBlockedCell, getCellValue, canMerge, directions) =>
      tileMatchesAvailable(
        width,
        height,
        typeof isBlockedCell === "function" ? isBlockedCell : () => false,
        typeof getCellValue === "function" ? getCellValue : () => null,
        typeof canMerge === "function" ? canMerge : () => false,
        directions
      ),
    movesAvailable
  };
}

export function installMoveScanRuntime(
  options: MoveScanRuntimeInstallOptions = {}
): MoveScanRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as MoveScanRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreMoveScanRuntime) {
    windowLike.CoreMoveScanRuntime = createMoveScanRuntime();
  }
  return windowLike.CoreMoveScanRuntime || null;
}
