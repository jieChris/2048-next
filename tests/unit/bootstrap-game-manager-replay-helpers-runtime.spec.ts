import { describe, expect, it, vi } from "vitest";

import {
  getFinalBoardMatrix,
  importReplay,
  insertCustomTile,
  installGameManagerReplayHelperGlobals,
  serializeReplay,
  tryAutoSubmitOnGameOver
} from "../../src/bootstrap/game-manager-replay-helpers-runtime";
import { decodeReplayV1Rpl, encodeReplayV1Rpl } from "../../src/core/replay-codec";

function createGrid() {
  return {
    eachCell(callback: (x: number, y: number, tile: unknown) => void) {
      callback(0, 0, { value: 2, previousPosition: { x: 0, y: 0 }, mergedFrom: [] });
      callback(1, 0, null);
      callback(0, 1, { value: 4 });
      callback(1, 1, null);
    }
  };
}

describe("bootstrap game-manager replay helpers runtime", () => {
  it("installs the replay helper globals consumed by legacy game-manager bindings", () => {
    const windowLike: Record<string, unknown> = {};

    installGameManagerReplayHelperGlobals(windowLike);

    expect(windowLike.CoreGameManagerReplayHelpersRuntime).toBeTruthy();
    expect(windowLike.keepPlaying).toBeTypeOf("function");
    expect(windowLike.serializeReplay).toBeTypeOf("function");
    expect(windowLike.importReplay).toBeTypeOf("function");
    expect(windowLike.stepReplay).toBeTypeOf("function");
  });

  it("serializes a manager without loading the retired replay helpers script", () => {
    const manager = {
      width: 2,
      height: 2,
      modeKey: "standard_4x4_pow2_no_undo",
      score: 16,
      seed: 123,
      successfulMoveCount: 3,
      grid: createGrid(),
      getWindowLike: () => ({
        btoa(value: string) {
          return `encoded:${value.length}`;
        }
      })
    };

    expect(getFinalBoardMatrix(manager)).toEqual([
      [2, 0],
      [4, 0]
    ]);
    expect(serializeReplay(manager)).toMatch(/^REPLAY_v1RPL_B64_encoded:/);
  });

  it("serializes supported session replay as a real replay v1 RPL payload", () => {
    const manager = {
      width: 2,
      height: 2,
      modeKey: "board_2x2_pow2_no_undo",
      score: 16,
      sessionReplayV1: {
        supported: true,
        board_width: 2,
        board_height: 2,
        init_tiles: [
          { cellIndex: 0, valueBit: 0 },
          { cellIndex: 3, valueBit: 1 }
        ],
        records: [
          {
            kind: "move",
            dir: 1,
            spawnIndex: 1,
            spawnValueBit: 0,
            deltaMs: 12
          }
        ],
        start_unix_ms: 123456,
        mode_key: "board_2x2_pow2_no_undo",
        ruleset: "pow2"
      },
      getWindowLike: () => ({
        btoa(value: string) {
          return Buffer.from(value, "binary").toString("base64");
        },
        GameManager: {
          REPLAY_V1_RPL_BASE64_PREFIX: "REPLAY_v1RPL_B64_"
        }
      })
    };

    const replayText = serializeReplay(manager);
    const prefix = "REPLAY_v1RPL_B64_";
    expect(replayText.startsWith(prefix)).toBe(true);
    const bytes = Uint8Array.from(Buffer.from(replayText.slice(prefix.length), "base64"));
    const decoded = decodeReplayV1Rpl(bytes);

    expect(decoded.magic).toBe("RPL1");
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(2);
    expect(decoded.initTiles).toHaveLength(2);
    expect(decoded.records.some((record) => record.kind === "move")).toBe(true);
  });

  it("imports structured replay JSON actions without replacing them with fallback moves", () => {
    const manager = {
      replayMoves: [],
      replaySpawns: [],
      replayIndex: 99,
      replayMode: false,
      resolveModeConfig: vi.fn((modeKey: string) => ({ key: modeKey })),
      restartWithSeed: vi.fn(),
      loadUndoSettingForMode: vi.fn(() => false),
      resolveUndoPolicyStateForMode: vi.fn(() => ({ forcedUndoSetting: null })),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn()
    };

    const ok = importReplay(
      manager,
      JSON.stringify({
        v: 3,
        mode_key: "standard_4x4_pow2_no_undo",
        seed: 0.25,
        actions: [3]
      })
    );

    expect(ok).toBe(true);
    expect(manager.replayMoves).toEqual([3]);
    expect(manager.replayIndex).toBe(0);
    expect(manager.replayMode).toBe(true);
    expect(manager.restartWithSeed).toHaveBeenCalledWith(0.25, { key: "standard_4x4_pow2_no_undo" });
  });

  it("infers rectangular replay mode keys from width then height when v1 metadata has no mode key", () => {
    const importedModes: string[] = [];
    const replayText = (width: number, height: number) =>
      `REPLAY_v1RPL_B64_${Buffer.from(encodeReplayV1Rpl({
        width,
        height,
        initTiles: [],
        records: []
      })).toString("base64")}`;
    const manager = {
      replayMoves: [],
      replaySpawns: [],
      replayIndex: 0,
      replayMode: false,
      modeKey: "standard_4x4_pow2_no_undo",
      resolveModeConfig: vi.fn((modeKey: string) => ({ key: modeKey })),
      restartWithBoard: vi.fn(),
      loadUndoSettingForMode: vi.fn(() => false),
      resolveUndoPolicyStateForMode: vi.fn(() => ({ forcedUndoSetting: null })),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn(),
      getWindowLike: () => ({
        atob(value: string) {
          return Buffer.from(value, "base64").toString("binary");
        },
        GameManager: {
          REPLAY_V1_RPL_BASE64_PREFIX: "REPLAY_v1RPL_B64_"
        }
      })
    };

    importReplay(manager, replayText(4, 2));
    importedModes.push((manager.restartWithBoard.mock.calls.at(-1)?.[1] as { key: string }).key);

    importReplay(manager, replayText(4, 3));
    importedModes.push((manager.restartWithBoard.mock.calls.at(-1)?.[1] as { key: string }).key);

    expect(importedModes).toEqual([
      "board_2x4_pow2_no_undo",
      "board_3x4_pow2_no_undo"
    ]);
  });

  it("syncs practice restart board snapshots after setup custom tile edits", () => {
    class Tile {
      x: number;
      y: number;
      value: number;

      constructor(position: { x: number; y: number }, value: number) {
        this.x = position.x;
        this.y = position.y;
        this.value = value;
      }
    }

    const cells: Array<Array<InstanceType<typeof Tile> | null>> = [
      [null, null],
      [null, null]
    ];
    const manager = {
      width: 2,
      height: 2,
      modeKey: "practice",
      hasGameStarted: false,
      modeConfig: { key: "practice" },
      grid: {
        eachCell(callback: (x: number, y: number, tile: unknown) => void) {
          for (let y = 0; y < cells.length; y += 1) {
            for (let x = 0; x < cells[y].length; x += 1) {
              callback(x, y, cells[y][x]);
            }
          }
        },
        cellContent({ x, y }: { x: number; y: number }) {
          return cells[y]?.[x] || null;
        },
        insertTile(tile: InstanceType<typeof Tile>) {
          cells[tile.y][tile.x] = tile;
        },
        removeTile(tile: InstanceType<typeof Tile>) {
          cells[tile.y][tile.x] = null;
        }
      },
      getWindowLike: () => ({ Tile }),
      actuate: vi.fn()
    };

    expect(insertCustomTile(manager, 0, 0, 32768)).toBe(true);
    expect(manager.practiceRestartBoardMatrix).toEqual([
      [32768, 0],
      [0, 0]
    ]);
    expect(manager.replayStartBoardMatrix).toEqual(manager.practiceRestartBoardMatrix);
  });

  it("auto-submits terminal local history records with replay fallback evidence", () => {
    const savedRecords: Record<string, unknown>[] = [];
    const resultWrites: Record<string, unknown>[] = [];
    const manager = {
      sessionSubmitDone: false,
      replayMode: false,
      over: true,
      won: false,
      keepPlaying: false,
      modeKey: "standard_4x4_pow2_no_undo",
      score: 4096,
      rescueReplayString: "REPLAY_v1RPL_B64_rescue",
      grid: createGrid(),
      getDurationMs: vi.fn(() => 1200),
      resolveWindowNamespaceMethod: vi.fn((namespace: string, methodName: string) => {
        if (namespace !== "LocalHistoryStore" || methodName !== "saveRecord") return null;
        return {
          scope: {},
          method(record: Record<string, unknown>) {
            savedRecords.push(record);
            return { id: "local-rescue-record" };
          }
        };
      }),
      writeLocalStorageJsonPayload: vi.fn((_key: string, payload: Record<string, unknown>) => {
        resultWrites.push(payload);
      })
    };

    expect(() => tryAutoSubmitOnGameOver(manager)).not.toThrow();
    expect(savedRecords).toHaveLength(1);
    expect(savedRecords[0]).toMatchObject({
      mode_key: "standard_4x4_pow2_no_undo",
      score: 4096,
      replay_string: "REPLAY_v1RPL_B64_rescue"
    });
    expect(resultWrites[0]).toMatchObject({ ok: true, local_saved: true });
    expect(manager.sessionSubmitDone).toBe(true);
  });
});
