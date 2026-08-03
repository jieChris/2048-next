import { describe, expect, it, vi } from "vitest";

import {
  applyReplayImportActions,
  getFinalBoardMatrix,
  importReplay,
  insertCustomTile,
  installGameManagerReplayHelperGlobals,
  recordSessionReplayV1Move,
  seekReplay,
  serializeReplay,
  serializeReplayV3,
  stepReplay,
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

function createReplaySeekTestManager() {
  const windowLike = {
    createCurrentUndoStackEntrySnapshot(manager: Record<string, unknown>) {
      return {
        score: manager.score,
        tiles: [],
        testState: manager.testState,
        comboStreak: 0,
        successfulMoveCount: 0,
        lockConsumedAtMoveCount: -1,
        lockedDirectionTurn: null,
        lockedDirection: null,
        undoUsed: 0
      };
    },
    applyUndoRestoredTiles(manager: Record<string, unknown>, entry: Record<string, unknown>) {
      manager.testState = entry.testState;
    },
    applyUndoRestoreState(manager: Record<string, unknown>, entry: Record<string, unknown>) {
      manager.score = entry.score;
    }
  };
  return {
    replayMoves: [],
    replaySpawns: [],
    replayIndex: 0,
    replayMode: true,
    replayStartBoardMatrix: [[2, 0], [0, 0]],
    score: 0,
    testState: 0,
    getWindowLike: () => windowLike,
    restartWithBoard: vi.fn(),
    move: vi.fn(function (this: { score: number; testState: number }) {
      this.testState += 1;
      this.score += 2;
    }),
    actuate: vi.fn(),
    clearTransientTileVisualState: vi.fn()
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

  it("imports JSON fallback replays exported with the v1 base64 envelope", () => {
    const windowLike = {
      btoa(value: string) {
        return Buffer.from(value, "binary").toString("base64");
      },
      atob(value: string) {
        return Buffer.from(value, "base64").toString("binary");
      },
      GameManager: {
        REPLAY_V1_RPL_BASE64_PREFIX: "REPLAY_v1RPL_B64_"
      }
    };
    const manager = {
      width: 2,
      height: 2,
      modeKey: "standard_4x4_pow2_no_undo",
      score: 16,
      seed: 0.5,
      successfulMoveCount: 2,
      sessionReplayV3: {
        actions: [1, 2]
      },
      grid: createGrid(),
      replayMoves: [] as unknown[],
      replaySpawns: [] as unknown[],
      replayIndex: 99,
      replayMode: false,
      getWindowLike: () => windowLike,
      resolveModeConfig: vi.fn((modeKey: string) => ({ key: modeKey })),
      restartWithSeed: vi.fn(),
      loadUndoSettingForMode: vi.fn(() => false),
      resolveUndoPolicyStateForMode: vi.fn(() => ({ forcedUndoSetting: null })),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn()
    };

    const replayText = serializeReplay(manager);
    const ok = importReplay(manager, replayText);

    expect(ok).toBe(true);
    expect(manager.restartWithSeed).toHaveBeenCalledWith(
      0.5,
      { key: "standard_4x4_pow2_no_undo" },
      { asReplay: true }
    );
    expect(manager.replayMoves).toEqual([1, 2]);
    expect(manager.replayIndex).toBe(0);
    expect(manager.replayMode).toBe(true);
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
        ruleset: "pow2",
        owner_user_id: "42",
        owner_nickname: "测试Player超长昵称",
        custom_secondary_timer_rule_text: "32\n32+2"
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
    const customRulesRecord = decoded.records.find(
      (record) => record.kind === "ext" && record.extType === 5
    );
    expect(customRulesRecord?.kind).toBe("ext");
    expect(
      customRulesRecord?.kind === "ext"
        ? new TextDecoder().decode(customRulesRecord.payload)
        : ""
    ).toBe("32\n32+2");
    const ownerIdRecord = decoded.records.find(
      (record) => record.kind === "ext" && record.extType === 6
    );
    const ownerNicknameRecord = decoded.records.find(
      (record) => record.kind === "ext" && record.extType === 7
    );
    expect(
      ownerIdRecord?.kind === "ext" ? new TextDecoder().decode(ownerIdRecord.payload) : ""
    ).toBe("42");
    expect(
      ownerNicknameRecord?.kind === "ext"
        ? new TextDecoder().decode(ownerNicknameRecord.payload)
        : ""
    ).toBe("测试Player超长");
  });

  it("restores the opening custom timer rules through a replay v1 export/import round trip", () => {
    const browserLike = {
      btoa(value: string) {
        return Buffer.from(value, "binary").toString("base64");
      },
      atob(value: string) {
        return Buffer.from(value, "base64").toString("binary");
      },
      GameManager: {
        REPLAY_V1_RPL_BASE64_PREFIX: "REPLAY_v1RPL_B64_"
      },
      applyCustomSecondaryTimerRuleText: vi.fn()
    };
    const sourceManager = {
      width: 2,
      height: 2,
      modeKey: "board_2x2_pow2_no_undo",
      sessionReplayV1: {
        supported: true,
        board_width: 2,
        board_height: 2,
        init_tiles: [
          { cellIndex: 0, valueBit: 0 },
          { cellIndex: 3, valueBit: 1 }
        ],
        records: [],
        mode_key: "board_2x2_pow2_no_undo",
        ruleset: "pow2",
        custom_secondary_timer_rule_text: "32\n32+2\n32+4"
      },
      getWindowLike: () => browserLike
    };
    const replayText = serializeReplay(sourceManager);
    const targetManager = {
      width: 2,
      height: 2,
      modeKey: "board_2x2_pow2_no_undo",
      replayMoves: [] as unknown[],
      replaySpawns: [] as unknown[],
      replayIndex: 0,
      replayMode: false,
      resolveModeConfig: vi.fn((modeKey: string) => ({ key: modeKey })),
      restartWithBoard: vi.fn(),
      getWindowLike: () => browserLike
    };

    expect(importReplay(targetManager, replayText)).toBe(true);
    expect(browserLike.applyCustomSecondaryTimerRuleText).toHaveBeenCalledWith(
      targetManager,
      "32\n32+2\n32+4"
    );
    expect(targetManager.restartWithBoard.mock.invocationCallOrder[0]).toBeLessThan(
      browserLike.applyCustomSecondaryTimerRuleText.mock.invocationCallOrder[0]
    );
  });

  it("prefers live session replay over stale rescue replay strings", () => {
    const manager = {
      width: 2,
      height: 2,
      modeKey: "board_2x2_pow2_no_undo",
      score: 16,
      rescueReplayString: "REPLAY_v1RPL_B64_stale_rescue",
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

    expect(serializeReplay(manager)).not.toBe("REPLAY_v1RPL_B64_stale_rescue");
  });

  it("keeps rescue replay as a serialization failure fallback", () => {
    const manager = {
      width: 2,
      height: 2,
      modeKey: "board_2x2_pow2_no_undo",
      rescueReplayString: "REPLAY_v1RPL_B64_rescue",
      grid: createGrid(),
      getWindowLike: () => ({
        btoa() {
          throw new Error("codec unavailable");
        }
      })
    };

    expect(serializeReplay(manager)).toBe("REPLAY_v1RPL_B64_rescue");
  });

  it("records compact replay v1 move deltas instead of zero-duration moves", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const manager = {
      width: 2,
      height: 2,
      replayMode: false,
      sessionReplayV1: {
        supported: true,
        last_event_at_ms: 1_000,
        records: [] as unknown[]
      }
    };

    vi.setSystemTime(1_456);
    recordSessionReplayV1Move(manager, 1, { x: 1, y: 0, value: 4 });

    expect(manager.sessionReplayV1.records).toEqual([
      { kind: "move", dir: 1, spawnIndex: 1, spawnValueBit: 1, deltaMs: 456 }
    ]);
    expect(manager.sessionReplayV1.last_event_at_ms).toBe(1_456);
    vi.useRealTimers();
  });

  it("serializes diagonal sessions with structured seed, mode key, and actions for cloud replay", () => {
    const manager = {
      width: 4,
      height: 4,
      modeKey: "diag_4x4_pow2_no_undo",
      mode: "diagonal",
      score: 128,
      initialSeed: 0.625,
      ruleset: "pow2",
      modeConfig: { undo_enabled: false },
      modeFamily: "diagonal",
      rankPolicy: "casual",
      specialRules: { allow_diagonal_moves: true },
      sessionReplayV3: {
        v: 3,
        mode_key: "diag_4x4_pow2_no_undo",
        seed: 0.625,
        custom_secondary_timer_rule_text: "32\n32+2",
        actions: [["m", 4], ["m", 7]]
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      }
    };

    expect(serializeReplayV3(manager)).toMatchObject({
      v: 3,
      mode_key: "diag_4x4_pow2_no_undo",
      seed: 0.625,
      custom_secondary_timer_rule_text: "32\n32+2",
      actions: [["m", 4], ["m", 7]]
    });
  });

  it("imports structured replay JSON actions without replacing them with fallback moves", () => {
    const applyCustomSecondaryTimerRuleText = vi.fn();
    const manager = {
      replayMoves: [],
      replaySpawns: [],
      replayIndex: 99,
      replayMode: false,
      getWindowLike: () => ({ applyCustomSecondaryTimerRuleText }),
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
        custom_secondary_timer_rule_text: "32\n32+2",
        actions: [3]
      })
    );

    expect(ok).toBe(true);
    expect(manager.replayMoves).toEqual([3]);
    expect(manager.replayIndex).toBe(0);
    expect(manager.replayMode).toBe(true);
    expect(manager.restartWithSeed).toHaveBeenCalledWith(
      0.25,
      { key: "standard_4x4_pow2_no_undo" },
      { asReplay: true }
    );
    expect(applyCustomSecondaryTimerRuleText).toHaveBeenCalledWith(manager, "32\n32+2");
  });

  it("imports legacy VRS text replays", () => {
    const manager = {
      replayMoves: [],
      replaySpawns: [],
      replayIndex: 99,
      replayMode: false,
      resolveModeConfig: vi.fn((modeKey: string) => ({ key: modeKey })),
      restartWithBoard: vi.fn(),
      loadUndoSettingForMode: vi.fn(() => false),
      resolveUndoPolicyStateForMode: vi.fn(() => ({ forcedUndoSetting: null })),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn()
    };

    const ok = importReplay(manager, "4x4-0000000000000000_00000g683");

    expect(ok).toBe(true);
    expect(manager.restartWithBoard).toHaveBeenCalledWith(
      [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      { key: "standard_4x4_pow2_no_undo" },
      { asReplay: true }
    );
    expect(manager.replayMoves).toEqual([1]);
    expect(manager.replayIndex).toBe(0);
    expect(manager.replayMode).toBe(true);
  });

  it("restores imported replay start board when restartWithBoard leaves the current grid unchanged", () => {
    class TestTile {
      x: number;
      y: number;
      value: number;

      constructor(position: { x: number; y: number }, value: number) {
        this.x = position.x;
        this.y = position.y;
        this.value = value;
      }
    }

    class TestGrid {
      width: number;
      height: number;
      size: number;
      cells: Array<Array<TestTile | null>>;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.size = width;
        this.cells = Array.from({ length: width }, () => Array.from({ length: height }, () => null));
      }

      insertTile(tile: TestTile) {
        this.cells[tile.x][tile.y] = tile;
      }

      eachCell(callback: (x: number, y: number, tile: TestTile | null) => void) {
        for (let x = 0; x < this.width; x += 1) {
          for (let y = 0; y < this.height; y += 1) callback(x, y, this.cells[x][y]);
        }
      }
    }

    const staleGrid = new TestGrid(4, 4);
    staleGrid.insertTile(new TestTile({ x: 0, y: 0 }, 8));
    const manager = {
      width: 4,
      height: 4,
      grid: staleGrid,
      replayMoves: [],
      replaySpawns: [],
      replayIndex: 99,
      replayMode: false,
      resolveModeConfig: vi.fn((modeKey: string) => ({ key: modeKey })),
      restartWithBoard: vi.fn(),
      setRuntimeGrid(grid: TestGrid) {
        this.grid = grid;
      },
      getWindowLike: () => ({ Grid: TestGrid, Tile: TestTile }),
      loadUndoSettingForMode: vi.fn(() => false),
      resolveUndoPolicyStateForMode: vi.fn(() => ({ forcedUndoSetting: null })),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn()
    };

    const ok = importReplay(manager, "4x4-0000000000000000_00000g683");

    expect(ok).toBe(true);
    expect(getFinalBoardMatrix(manager)).toEqual([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
  });

  it("imports legacy verse text replays", () => {
    const manager = {
      replayMoves: [],
      replaySpawns: [],
      replayIndex: 99,
      replayMode: false,
      resolveModeConfig: vi.fn((modeKey: string) => ({ key: modeKey })),
      restartWithBoard: vi.fn(),
      loadUndoSettingForMode: vi.fn(() => false),
      resolveUndoPolicyStateForMode: vi.fn(() => ({ forcedUndoSetting: null })),
      updateUndoUiState: vi.fn(),
      notifyUndoSettingsStateChanged: vi.fn()
    };

    const ok = importReplay(manager, "replay_(!äfC");

    expect(ok).toBe(true);
    expect(manager.restartWithBoard).toHaveBeenCalled();
    expect(manager.replayMoves.length).toBeGreaterThan(0);
    expect(manager.replayMode).toBe(true);
  });

  it("seeks replay by dispatching moves with forced spawns", () => {
    const moves: unknown[] = [];
    const manager = {
      replayMoves: [1, 2],
      replaySpawns: [
        { x: 0, y: 0, value: 2 },
        { x: 1, y: 0, value: 4 }
      ],
      replayIndex: 0,
      replayMode: true,
      forcedSpawn: null as unknown,
      replayStartBoardMatrix: [[2, 0], [0, 0]],
      modeConfig: { key: "test" },
      restartWithBoard: vi.fn(),
      move: vi.fn(function (this: { forcedSpawn: unknown }, direction: unknown) {
        moves.push([direction, this.forcedSpawn]);
      })
    };

    seekReplay(manager, 2);

    expect(moves).toEqual([
      [1, { x: 0, y: 0, value: 2 }],
      [2, { x: 1, y: 0, value: 4 }]
    ]);
    expect(manager.replayIndex).toBe(2);
  });

  it("rewinds replay steps through seek so the board is rebuilt", () => {
    const moves: unknown[] = [];
    const manager = {
      replayMoves: [1, 2],
      replaySpawns: [
        { x: 0, y: 0, value: 2 },
        { x: 1, y: 0, value: 4 }
      ],
      replayIndex: 2,
      replayMode: true,
      forcedSpawn: null as unknown,
      replayStartBoardMatrix: [[2, 0], [0, 0]],
      modeConfig: { key: "test" },
      restartWithBoard: vi.fn(),
      move: vi.fn(function (this: { forcedSpawn: unknown }, direction: unknown) {
        moves.push([direction, this.forcedSpawn]);
      })
    };

    stepReplay(manager, -1);

    expect(manager.restartWithBoard).toHaveBeenCalled();
    expect(moves).toEqual([[1, { x: 0, y: 0, value: 2 }]]);
    expect(manager.replayIndex).toBe(1);
  });

  it("restores recent backward steps from replay state history", () => {
    const manager: any = createReplaySeekTestManager();

    applyReplayImportActions(manager, { replayMoves: [1, 1, 1], replaySpawns: [] });
    seekReplay(manager, 3);
    expect(manager.move).toHaveBeenCalledTimes(3);

    stepReplay(manager, -1);
    expect(manager.move).toHaveBeenCalledTimes(3);
    expect(manager.restartWithBoard).not.toHaveBeenCalled();
    expect(manager.testState).toBe(2);
    expect(manager.score).toBe(4);

    stepReplay(manager, 1);
    expect(manager.move).toHaveBeenCalledTimes(4);
    expect(manager.testState).toBe(3);
  });

  it("uses bounded generated checkpoints for long backward seeks", () => {
    const manager: any = createReplaySeekTestManager();

    applyReplayImportActions(manager, {
      replayMoves: Array.from({ length: 600 }, () => 1),
      replaySpawns: []
    });
    seekReplay(manager, 600);

    expect(manager.replayStateHistory.filter(Boolean).length).toBeLessThanOrEqual(513);
    expect(manager.replaySeekCheckpointHistory.length).toBeGreaterThanOrEqual(18);

    const moveCountBeforeBackwardSeek = manager.move.mock.calls.length;
    seekReplay(manager, 50);

    expect(manager.restartWithBoard).not.toHaveBeenCalled();
    expect(manager.move.mock.calls.length - moveCountBeforeBackwardSeek).toBeLessThanOrEqual(31);
    expect(manager.testState).toBe(50);
    expect(manager.replayIndex).toBe(50);
  });

  it("keeps undo-action replays on the original rebuild path", () => {
    const manager: any = createReplaySeekTestManager();

    applyReplayImportActions(manager, { replayMoves: [1, ["u"], 1], replaySpawns: [] });
    seekReplay(manager, 3);
    manager.restartWithBoard.mockClear();
    manager.move.mockClear();

    stepReplay(manager, -1);

    expect(manager.restartWithBoard).toHaveBeenCalled();
    expect(manager.move).toHaveBeenCalledTimes(2);
  });

  it("restores checkpoint scores when seeking legacy text replays", () => {
    const scores: unknown[] = [];
    const manager = {
      replayMoves: Array.from({ length: 33 }, () => 1),
      replaySpawns: Array.from({ length: 33 }, () => ({ x: 0, y: 0, value: 2 })),
      replayIndex: 31,
      replayMode: true,
      score: 999,
      modeConfig: { key: "test" },
      replaySeekCheckpointHistory: [
        { index: 32, board: [[2, 4], [0, 0]], score: 208 }
      ],
      restartWithBoard: vi.fn(),
      setRuntimeScore(value: number) {
        this.score = value;
      },
      move() {
        scores.push(this.score);
      }
    };

    seekReplay(manager, 33);

    expect(manager.restartWithBoard).toHaveBeenCalled();
    expect(scores).toEqual([208]);
    expect(manager.replayIndex).toBe(33);
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

  it("rejects custom practice tiles above the active capped max tile", () => {
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

    const cells: Array<Array<InstanceType<typeof Tile> | null>> = [[null]];
    const manager = {
      modeKey: "practice",
      maxTile: 64,
      modeConfig: { key: "practice", max_tile: 64, special_rules: { enforce_max_tile: true } },
      grid: {
        eachCell(callback: (x: number, y: number, tile: unknown) => void) {
          callback(0, 0, cells[0][0]);
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

    expect(insertCustomTile(manager, 0, 0, 128)).toBe(false);
    expect(cells[0][0]).toBeNull();
    expect(manager.actuate).not.toHaveBeenCalled();
  });

  it("skips non-terminal win prompts but persists capped win-stop sessions", () => {
    const savedRecords: Record<string, unknown>[] = [];
    const resultWrites: Record<string, unknown>[] = [];
    const baseManager = {
      sessionSubmitDone: false,
      replayMode: false,
      over: false,
      won: true,
      keepPlaying: false,
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: { max_tile: 2048, special_rules: {} },
      score: 2048,
      grid: createGrid(),
      getDurationMs: vi.fn(() => 1200),
      resolveWindowNamespaceMethod: vi.fn((namespace: string, methodName: string) => {
        if (namespace !== "LocalHistoryStore" || methodName !== "saveRecord") return null;
        return {
          scope: {},
          method(record: Record<string, unknown>) {
            savedRecords.push(record);
            return { id: `local-${savedRecords.length}` };
          }
        };
      }),
      writeLocalStorageJsonPayload: vi.fn((_key: string, payload: Record<string, unknown>) => {
        resultWrites.push(payload);
      })
    };

    tryAutoSubmitOnGameOver(baseManager);

    expect(savedRecords).toHaveLength(0);
    expect(resultWrites.at(-1)).toMatchObject({ ok: false, skipped: true, reason: "not_game_over" });
    expect(baseManager.sessionSubmitDone).toBe(false);

    const cappedManager = {
      ...baseManager,
      modeKey: "capped_4x4_pow2_64_no_undo",
      modeConfig: { max_tile: 64, special_rules: { enforce_max_tile: true } },
      sessionSubmitDone: false
    };

    tryAutoSubmitOnGameOver(cappedManager);

    expect(savedRecords).toHaveLength(1);
    expect(savedRecords[0]).toMatchObject({
      mode_key: "capped_4x4_pow2_64_no_undo",
      end_reason: "win_stop"
    });
    expect(resultWrites.at(-1)).toMatchObject({ ok: true, local_saved: true });
    expect(cappedManager.sessionSubmitDone).toBe(true);
  });

  it("auto-submits terminal local history records with live replay evidence", () => {
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
      board_sum: 6
    });
    expect(savedRecords[0].replay_string).not.toBe("REPLAY_v1RPL_B64_rescue");
    expect(String(savedRecords[0].replay_string)).toMatch(/^REPLAY_v1RPL_B64_/);
    expect(resultWrites[0]).toMatchObject({ ok: true, local_saved: true });
    expect(manager.sessionSubmitDone).toBe(true);
  });

  it("waits for durable async history saves and retries after a failure", async () => {
    const saveRecord = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "local-async-record" });
    const syncSaveRecord = vi.fn(() => {
      throw new Error("sync_fallback_must_not_run");
    });
    const manager = {
      sessionSubmitDone: false,
      replayMode: false,
      over: true,
      won: false,
      keepPlaying: false,
      modeKey: "standard_4x4_pow2_no_undo",
      clientRecordId: "rec_async_1",
      score: 4096,
      grid: createGrid(),
      getDurationMs: vi.fn(() => 1200),
      resolveWindowNamespaceMethod: vi.fn((namespace: string, methodName: string) => {
        if (namespace !== "LocalHistoryStore") return null;
        if (methodName === "saveRecordAsync") return { scope: {}, method: saveRecord };
        if (methodName === "saveRecord") return { scope: {}, method: syncSaveRecord };
        return null;
      }),
      writeLocalStorageJsonPayload: vi.fn()
    };

    const firstAttempt = tryAutoSubmitOnGameOver(manager) as unknown;
    expect(firstAttempt).toBeInstanceOf(Promise);
    expect(manager.sessionSubmitDone).toBe(false);
    await expect(firstAttempt).resolves.toBe(false);
    expect(manager.sessionSubmitDone).toBe(false);

    const secondAttempt = tryAutoSubmitOnGameOver(manager) as unknown;
    expect(manager.sessionSubmitDone).toBe(false);
    await expect(secondAttempt).resolves.toBe(true);

    expect(saveRecord).toHaveBeenCalledTimes(2);
    expect(syncSaveRecord).not.toHaveBeenCalled();
    expect(manager.sessionSubmitDone).toBe(true);
  });

  it("does not let an old async history save mark a newly started game as submitted", async () => {
    let resolveSave!: (record: Record<string, unknown>) => void;
    const savePromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveSave = resolve;
    });
    const manager = {
      sessionSubmitDone: false,
      replayMode: false,
      over: true,
      won: false,
      keepPlaying: false,
      modeKey: "standard_4x4_pow2_no_undo",
      clientRecordId: "rec_old",
      score: 4096,
      grid: createGrid(),
      getDurationMs: vi.fn(() => 1200),
      resolveWindowNamespaceMethod: vi.fn((_namespace: string, methodName: string) =>
        methodName === "saveRecordAsync" ? { scope: {}, method: () => savePromise } : null
      ),
      writeLocalStorageJsonPayload: vi.fn()
    };

    const oldSave = tryAutoSubmitOnGameOver(manager) as unknown;
    manager.over = false;
    manager.clientRecordId = "rec_new";
    manager.sessionSubmitDone = false;
    resolveSave({ id: "local-old-record" });

    await expect(oldSave).resolves.toBe(true);
    expect(manager.sessionSubmitDone).toBe(false);
  });
});
