import {
  buildBoardMatrix,
  getAvailableCells,
  getBestTileValue,
  type CellPoint,
  type CellValueReader
} from "../core/grid-scan";

export interface GridScanRuntime {
  getAvailableCells: (
    width: number,
    height: number,
    isBlockedCell?: (x: number, y: number) => boolean,
    isCellAvailable?: (cell: CellPoint) => boolean
  ) => CellPoint[];
  buildBoardMatrix: (
    width: number,
    height: number,
    readCellValue?: CellValueReader
  ) => number[][];
  getBestTileValue: typeof getBestTileValue;
}

export interface GridScanRuntimeWindowLike {
  CoreGridScanRuntime?: GridScanRuntime;
}

export interface GridScanRuntimeInstallOptions {
  windowLike?: GridScanRuntimeWindowLike | null | undefined;
}

export function createGridScanRuntime(): GridScanRuntime {
  return {
    getAvailableCells: (width, height, isBlockedCell, isCellAvailable) =>
      getAvailableCells(
        width,
        height,
        typeof isBlockedCell === "function" ? isBlockedCell : () => false,
        typeof isCellAvailable === "function" ? isCellAvailable : () => false
      ),
    buildBoardMatrix: (width, height, readCellValue) =>
      buildBoardMatrix(
        width,
        height,
        typeof readCellValue === "function" ? readCellValue : () => 0
      ),
    getBestTileValue
  };
}

export function installGridScanRuntime(
  options: GridScanRuntimeInstallOptions = {}
): GridScanRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as GridScanRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreGridScanRuntime) {
    windowLike.CoreGridScanRuntime = createGridScanRuntime();
  }
  return windowLike.CoreGridScanRuntime || null;
}
