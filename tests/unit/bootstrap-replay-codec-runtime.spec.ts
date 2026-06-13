import { describe, expect, it } from "vitest";

import {
  appendCompactMoveCode,
  appendCompactPracticeAction,
  appendCompactUndo,
  computeCrc32,
  decodeBoardV4,
  decodeReplay128,
  decodeReplayV1Rpl,
  decodeUleb128,
  encodeBoardV4,
  encodeReplay128,
  encodeReplayV1Rpl,
  encodeUleb128,
  REPLAY_V1_FLAG_EXTENDED_INIT_TILES,
  REPLAY_V1_MAGIC,
  replayV1BoardToInitTiles,
  replayV1InitTilesToBoard,
  replayV1RecordsToReplayActions
} from "../../src/core/replay-codec";
import {
  createReplayCodecRuntime,
  installReplayCodecRuntime,
  type ReplayCodecRuntime
} from "../../src/bootstrap/replay-codec-runtime";

describe("bootstrap replay-codec runtime", () => {
  it("creates the legacy CoreReplayCodecRuntime shape from TypeScript functions", () => {
    const runtime = createReplayCodecRuntime();
    const board = [
      [0, 2, 4, 8],
      [16, 32, 64, 128],
      [256, 512, 1024, 2048],
      [4096, 8192, 16384, 32768]
    ];
    const encodedBoard = encodeBoardV4(board);
    const replayV1Input = {
      width: 4,
      height: 4,
      initTiles: [
        { cellIndex: 0, valueBit: 0 as const },
        { cellIndex: 5, valueBit: 1 as const }
      ],
      records: [{ kind: "move" as const, dir: 1, spawnIndex: 6, spawnValueBit: 0 as const, deltaMs: 400 }]
    };
    const encodedReplay = runtime.encodeReplayV1Rpl(replayV1Input);
    const decodedReplay = runtime.decodeReplayV1Rpl(encodedReplay);

    expect(runtime.REPLAY_V1_MAGIC).toBe(REPLAY_V1_MAGIC);
    expect(runtime.REPLAY_V1_FLAG_EXTENDED_INIT_TILES).toBe(REPLAY_V1_FLAG_EXTENDED_INIT_TILES);
    expect(runtime.encodeReplay128(127)).toBe(encodeReplay128(127));
    expect(runtime.decodeReplay128(encodeReplay128(94))).toBe(decodeReplay128(encodeReplay128(94)));
    expect(runtime.encodeBoardV4(board)).toBe(encodedBoard);
    expect(runtime.decodeBoardV4(encodedBoard)).toEqual(decodeBoardV4(encodedBoard));
    expect(runtime.appendCompactMoveCode({ log: "", rawCode: 12 })).toBe(
      appendCompactMoveCode({ log: "", rawCode: 12 })
    );
    expect(runtime.appendCompactUndo("abc")).toBe(appendCompactUndo("abc"));
    expect(runtime.appendCompactPracticeAction({ log: "", width: 4, height: 4, x: 1, y: 2, value: 8 })).toBe(
      appendCompactPracticeAction({ log: "", width: 4, height: 4, x: 1, y: 2, value: 8 })
    );
    expect(runtime.encodeUleb128(834)).toEqual(encodeUleb128(834));
    expect(runtime.decodeUleb128(new Uint8Array([0xc2, 0x06]), 0)).toEqual(
      decodeUleb128(new Uint8Array([0xc2, 0x06]), 0)
    );
    expect(runtime.computeCrc32(new Uint8Array([1, 2, 3]))).toBe(computeCrc32(new Uint8Array([1, 2, 3])));
    expect(decodedReplay).toEqual(decodeReplayV1Rpl(encodeReplayV1Rpl(replayV1Input)));
    expect(runtime.replayV1InitTilesToBoard(4, 4, replayV1Input.initTiles)).toEqual(
      replayV1InitTilesToBoard(4, 4, replayV1Input.initTiles)
    );
    expect(runtime.replayV1BoardToInitTiles(4, 4, [[2, 0, 0, 0], [0, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])).toEqual(
      replayV1BoardToInitTiles(4, 4, [[2, 0, 0, 0], [0, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    );
    expect(runtime.replayV1RecordsToReplayActions(decodedReplay.records, 4)).toEqual(
      replayV1RecordsToReplayActions(decodedReplay.records, 4)
    );
  });

  it("preserves legacy fallback behavior for missing object inputs", () => {
    const runtime = createReplayCodecRuntime();

    expect(() => runtime.appendCompactMoveCode(undefined)).toThrow("Invalid move code");
    expect(runtime.appendCompactUndo(undefined)).toBe(encodeReplay128(127) + encodeReplay128(1));
    expect(() => runtime.appendCompactPracticeAction(undefined)).toThrow(
      "Compact practice replay only supports 4x4"
    );
    expect(() => runtime.encodeReplayV1Rpl(undefined)).toThrow("Invalid replay v1 board width");
    expect(runtime.decodeUleb128(new Uint8Array([0xc2, 0x06]), undefined)).toEqual({
      value: 834,
      nextOffset: 2
    });
    expect(runtime.computeCrc32(undefined)).toBe(computeCrc32(new Uint8Array([])));
    expect(runtime.replayV1InitTilesToBoard(4, 4, undefined)).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayCodecRuntime?: ReplayCodecRuntime } = {};

    const installed = installReplayCodecRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayCodecRuntime);
    expect(installed?.encodeReplay128).toBeTypeOf("function");
    expect(installed?.decodeReplayV1Rpl).toBeTypeOf("function");
    expect(installed?.replayV1RecordsToReplayActions).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayCodecRuntime();
    const windowLike = { CoreReplayCodecRuntime: existing };

    const installed = installReplayCodecRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayCodecRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayCodecRuntime({ windowLike: null })).toBeNull();
  });
});
