import { describe, expect, it } from "vitest";

import {
  appendCompactMoveCode,
  appendCompactPracticeAction,
  appendCompactUndo,
  decodeReplayV1Rpl,
  decodeBoardV4,
  decodeUleb128,
  encodeReplayV1Rpl,
  decodeReplay128,
  encodeBoardV4,
  encodeReplay128,
  encodeUleb128,
  replayV1BoardToInitTiles,
  replayV1InitTilesToBoard,
  replayV1RecordsToReplayActions
} from "../../src/core/replay-codec";

describe("core replay codec", () => {
  it("encodes and decodes replay128 boundaries", () => {
    expect(decodeReplay128(encodeReplay128(0))).toBe(0);
    expect(decodeReplay128(encodeReplay128(93))).toBe(93);
    expect(decodeReplay128(encodeReplay128(94))).toBe(94);
    expect(decodeReplay128(encodeReplay128(127))).toBe(127);
  });

  it("throws for invalid replay128 inputs", () => {
    expect(() => encodeReplay128(-1)).toThrow();
    expect(() => encodeReplay128(128)).toThrow();
    expect(() => decodeReplay128("")).toThrow();
    expect(() => decodeReplay128("AB")).toThrow();
  });

  it("encodes and decodes valid 4x4 board payload", () => {
    const board = [
      [0, 2, 4, 8],
      [16, 32, 64, 128],
      [256, 512, 1024, 2048],
      [4096, 8192, 16384, 32768]
    ];

    const encoded = encodeBoardV4(board);
    expect(encoded.length).toBe(16);
    expect(decodeBoardV4(encoded)).toEqual(board);
  });

  it("throws on invalid board payload", () => {
    expect(() => encodeBoardV4([[1]])).toThrow();
    expect(() =>
      encodeBoardV4([
        [0, 2, 4, 8],
        [16, 32, 64, 128],
        [256, 3, 1024, 2048],
        [4096, 8192, 16384, 32768]
      ])
    ).toThrow();
    expect(() => decodeBoardV4("too-short")).toThrow();
  });

  it("appends compact replay move and undo sequences", () => {
    const moveLog = appendCompactMoveCode({ log: "", rawCode: 12 });
    expect(moveLog.length).toBe(1);
    expect(decodeReplay128(moveLog)).toBe(12);

    const escapedMoveLog = appendCompactMoveCode({ log: moveLog, rawCode: 127 });
    expect(escapedMoveLog.length).toBe(3);
    expect(decodeReplay128(escapedMoveLog.charAt(1))).toBe(127);
    expect(decodeReplay128(escapedMoveLog.charAt(2))).toBe(0);

    const undoLog = appendCompactUndo(escapedMoveLog);
    expect(undoLog.length).toBe(5);
    expect(decodeReplay128(undoLog.charAt(3))).toBe(127);
    expect(decodeReplay128(undoLog.charAt(4))).toBe(1);
  });

  it("appends compact practice action sequence", () => {
    const log = appendCompactPracticeAction({
      log: "",
      width: 4,
      height: 4,
      x: 2,
      y: 1,
      value: 8
    });
    expect(log.length).toBe(4);
    expect(decodeReplay128(log.charAt(0))).toBe(127);
    expect(decodeReplay128(log.charAt(1))).toBe(2);
    expect(decodeReplay128(log.charAt(2))).toBe((2 << 2) | 1);
    expect(decodeReplay128(log.charAt(3))).toBe(3);
  });

  it("encodes the unmergeable practice marker with its dedicated subtype", () => {
    const log = appendCompactPracticeAction({
      log: "",
      width: 4,
      height: 4,
      x: 2,
      y: 1,
      value: 1
    });

    expect(log.length).toBe(3);
    expect(decodeReplay128(log.charAt(0))).toBe(127);
    expect(decodeReplay128(log.charAt(1))).toBe(3);
    expect(decodeReplay128(log.charAt(2))).toBe((2 << 2) | 1);
  });

  it("rejects invalid compact practice payload", () => {
    expect(() =>
      appendCompactPracticeAction({
        log: "",
        width: 5,
        height: 4,
        x: 0,
        y: 0,
        value: 2
      })
    ).toThrow();
    expect(() =>
      appendCompactPracticeAction({
        log: "",
        width: 4,
        height: 4,
        x: -1,
        y: 0,
        value: 2
      })
    ).toThrow();
    expect(() =>
      appendCompactPracticeAction({
        log: "",
        width: 4,
        height: 4,
        x: 0,
        y: 0,
        value: 3
      })
    ).toThrow();
  });

  it("encodes and decodes replay v1 .rpl payload", () => {
    const encoded = encodeReplayV1Rpl({
      width: 4,
      height: 4,
      startUnixMs: 1_720_000_000_000,
      initTiles: [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 5, valueBit: 1 }
      ],
      records: [
        { kind: "move", dir: 1, spawnIndex: 6, spawnValueBit: 0, deltaMs: 400 },
        { kind: "undo1", deltaMs: 120 },
        { kind: "undon", undoCount: 2, deltaMs: 200 },
        { kind: "move", dir: 3, spawnIndex: 2, spawnValueBit: 1, deltaMs: 980 },
        {
          kind: "checkpoint",
          boardCodes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        },
        { kind: "ext", extType: 7, payload: new Uint8Array([9, 8, 7]) },
        { kind: "end" }
      ]
    });
    const decoded = decodeReplayV1Rpl(encoded);
    expect(decoded.magic).toBe("RPL1");
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(4);
    expect(decoded.initTiles).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 5, valueBit: 1 }
    ]);
    expect(decoded.startUnixMs).toBe(1_720_000_000_000);
    expect(decoded.records[0]).toMatchObject({
      kind: "move",
      dir: 1,
      spawnIndex: 6,
      spawnValueBit: 0,
      deltaMs: 400
    });
    expect(decoded.records[1]).toEqual({ kind: "undo1", deltaMs: 120 });
    expect(decoded.records[2]).toEqual({ kind: "undon", undoCount: 2, deltaMs: 200 });
    expect(decoded.records[4]).toMatchObject({
      kind: "checkpoint",
      boardCodes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    });
    expect(decoded.records[5]).toMatchObject({
      kind: "ext",
      extType: 7
    });
  });

  it("encodes and decodes replay v1 diagonal move direction", () => {
    const encoded = encodeReplayV1Rpl({
      width: 4,
      height: 4,
      initTiles: [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 1, valueBit: 1 }
      ],
      records: [{ kind: "move", dir: 6, spawnIndex: 15, spawnValueBit: 0, deltaMs: 321 }]
    });
    const decoded = decodeReplayV1Rpl(encoded);
    expect(decoded.records[0]).toMatchObject({
      kind: "move",
      dir: 6,
      spawnIndex: 15,
      spawnValueBit: 0,
      deltaMs: 321
    });
    const mapped = replayV1RecordsToReplayActions(decoded.records, 4);
    expect(mapped.replayMoves).toEqual([6]);
    expect(mapped.replaySpawns[0]).toEqual({ x: 3, y: 3, value: 2 });
  });

  it("encodes and decodes replay v1 init tiles for 5x5 board", () => {
    const encoded = encodeReplayV1Rpl({
      width: 5,
      height: 5,
      initTiles: [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 24, valueBit: 1 }
      ],
      records: [{ kind: "move", dir: 2, spawnIndex: 20, spawnValueBit: 0, deltaMs: 16 }]
    });
    const decoded = decodeReplayV1Rpl(encoded);
    expect(decoded.width).toBe(5);
    expect(decoded.height).toBe(5);
    expect(decoded.initTiles).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 24, valueBit: 1 }
    ]);
    expect(decoded.records[0]).toMatchObject({
      kind: "move",
      dir: 2,
      spawnIndex: 20,
      spawnValueBit: 0
    });
  });

  it("encodes a replay across bounded output blocks", () => {
    const records = Array.from({ length: 20_000 }, (_unused, index) => ({
      kind: "move" as const,
      dir: index % 4,
      spawnIndex: 20,
      spawnValueBit: index % 2,
      deltaMs: 16
    }));

    const decoded = decodeReplayV1Rpl(encodeReplayV1Rpl({
      width: 5,
      height: 5,
      initTiles: [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 24, valueBit: 1 }
      ],
      records
    }));

    expect(decoded.records).toHaveLength(records.length);
    expect(decoded.records.at(-1)).toMatchObject(records.at(-1) || {});
  });

  it("rejects replay v1 payload when crc mismatch", () => {
    const encoded = encodeReplayV1Rpl({
      width: 4,
      height: 4,
      initTiles: [],
      records: [{ kind: "move", dir: 0, spawnIndex: 0, spawnValueBit: 0, deltaMs: 1 }]
    });
    const tampered = encoded.slice();
    tampered[7] = tampered[7] ^ 0xff;
    expect(() => decodeReplayV1Rpl(tampered)).toThrow("Replay v1 CRC32 mismatch");
  });

  it("encodes and decodes uleb128 values", () => {
    const value = 834;
    const encoded = encodeUleb128(value);
    expect(encoded).toEqual([0xc2, 0x06]);
    const decoded = decodeUleb128(new Uint8Array(encoded), 0);
    expect(decoded.value).toBe(value);
    expect(decoded.nextOffset).toBe(2);
  });

  it("maps replay v1 init tiles and actions", () => {
    const board = replayV1InitTilesToBoard(4, 4, [
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 5, valueBit: 1 }
    ]);
    expect(board[0][0]).toBe(2);
    expect(board[1][1]).toBe(4);
    expect(replayV1BoardToInitTiles(4, 4, board)).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 5, valueBit: 1 }
    ]);

    const mapped = replayV1RecordsToReplayActions(
      [
        { kind: "move", dir: 2, spawnIndex: 6, spawnValueBit: 1, deltaMs: 100 },
        { kind: "undo1", deltaMs: 100 },
        { kind: "undon", undoCount: 2, deltaMs: 200 }
      ],
      4
    );
    expect(mapped.replayMoves).toEqual([2, -1, -1, -1]);
    expect(mapped.replaySpawns[0]).toEqual({ x: 2, y: 1, value: 4 });
    expect(mapped.replaySpawns[1]).toBeNull();
    expect(mapped.replaySpawns[2]).toBeNull();
    expect(mapped.replaySpawns[3]).toBeNull();
  });

  it.each([
    { ruleset: "pow2" as const, value: 8, payload: new Uint8Array([8]) },
    { ruleset: "pow2" as const, value: 128, payload: new Uint8Array(encodeUleb128(128)) },
    { ruleset: "fibonacci" as const, value: 3, payload: new Uint8Array([3]) },
    { ruleset: "fibonacci" as const, value: 13, payload: new Uint8Array([13]) }
  ])("maps exact $ruleset spawn $value from its ULEB128 extension", ({ ruleset, value, payload }) => {
    const mapped = replayV1RecordsToReplayActions(
      [
        { kind: "ext", extType: 8, payload },
        { kind: "move", dir: 1, spawnIndex: 8, spawnValueBit: 0, deltaMs: 10 }
      ],
      3,
      ruleset
    );

    expect(mapped.replayMoves).toEqual([1]);
    expect(mapped.replaySpawns).toEqual([{ x: 2, y: 2, value }]);
  });

  it("rejects an exact spawn outside the active ruleset sequence", () => {
    expect(() =>
      replayV1RecordsToReplayActions(
        [
          { kind: "ext", extType: 8, payload: new Uint8Array([4]) },
          { kind: "move", dir: 1, spawnIndex: 8, spawnValueBit: 0, deltaMs: 10 }
        ],
        3,
        "fibonacci"
      )
    ).toThrow("Invalid replay v1 exact spawn extension");
  });

  it("maps replay v1 init tiles and actions for fibonacci ruleset", () => {
    const board = replayV1InitTilesToBoard(
      4,
      4,
      [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 5, valueBit: 1 }
      ],
      "fibonacci"
    );
    expect(board[0][0]).toBe(1);
    expect(board[1][1]).toBe(2);
    expect(replayV1BoardToInitTiles(4, 4, board, "fibonacci")).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 5, valueBit: 1 }
    ]);

    const mapped = replayV1RecordsToReplayActions(
      [{ kind: "move", dir: 2, spawnIndex: 6, spawnValueBit: 1, deltaMs: 100 }],
      4,
      "fibonacci"
    );
    expect(mapped.replayMoves).toEqual([2]);
    expect(mapped.replaySpawns[0]).toEqual({ x: 2, y: 1, value: 2 });
  });
});
