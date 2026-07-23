import { describe, expect, it } from "vitest";

import {
  appendCompactMoveCode,
  appendCompactPracticeAction,
  appendCompactUndo,
  createReplayV1MoveRecords,
  decodeReplayV1Base64,
  decodeReplayV1Rpl,
  decodeBoardV4,
  decodeUleb128,
  encodeReplayV1Base64,
  encodeReplayV1Rpl,
  decodeReplay128,
  encodeBoardV4,
  encodeReplay128,
  encodeUleb128,
  replayV1BoardToInitTiles,
  replayV1InitTilesToBoard,
  replayV1RecordsToReplayActions,
  type ReplayV1Record,
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
      [4096, 8192, 16384, 32768],
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
        [4096, 8192, 16384, 32768],
      ]),
    ).toThrow();
    expect(() => decodeBoardV4("too-short")).toThrow();
  });

  it("appends compact replay move and undo sequences", () => {
    const moveLog = appendCompactMoveCode({ log: "", rawCode: 12 });
    expect(moveLog.length).toBe(1);
    expect(decodeReplay128(moveLog)).toBe(12);

    const escapedMoveLog = appendCompactMoveCode({
      log: moveLog,
      rawCode: 127,
    });
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
      value: 8,
    });
    expect(log.length).toBe(4);
    expect(decodeReplay128(log.charAt(0))).toBe(127);
    expect(decodeReplay128(log.charAt(1))).toBe(2);
    expect(decodeReplay128(log.charAt(2))).toBe((2 << 2) | 1);
    expect(decodeReplay128(log.charAt(3))).toBe(3);
  });

  it("rejects invalid compact practice payload", () => {
    expect(() =>
      appendCompactPracticeAction({
        log: "",
        width: 5,
        height: 4,
        x: 0,
        y: 0,
        value: 2,
      }),
    ).toThrow();
    expect(() =>
      appendCompactPracticeAction({
        log: "",
        width: 4,
        height: 4,
        x: -1,
        y: 0,
        value: 2,
      }),
    ).toThrow();
    expect(() =>
      appendCompactPracticeAction({
        log: "",
        width: 4,
        height: 4,
        x: 0,
        y: 0,
        value: 3,
      }),
    ).toThrow();
  });

  it("encodes and decodes replay v1 .rpl payload", () => {
    const encoded = encodeReplayV1Rpl({
      width: 4,
      height: 4,
      startUnixMs: 1_720_000_000_000,
      initTiles: [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 5, valueBit: 1 },
      ],
      records: [
        { kind: "move", dir: 1, spawnIndex: 6, spawnValueBit: 0, deltaMs: 400 },
        { kind: "undo1", deltaMs: 120 },
        { kind: "undon", undoCount: 2, deltaMs: 200 },
        { kind: "move", dir: 3, spawnIndex: 2, spawnValueBit: 1, deltaMs: 980 },
        {
          kind: "checkpoint",
          boardCodes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        },
        { kind: "ext", extType: 7, payload: new Uint8Array([9, 8, 7]) },
        { kind: "end" },
      ],
    });
    const decoded = decodeReplayV1Rpl(encoded);
    expect(decoded.magic).toBe("RPL1");
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(4);
    expect(decoded.initTiles).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 5, valueBit: 1 },
    ]);
    expect(decoded.startUnixMs).toBe(1_720_000_000_000);
    expect(decoded.records[0]).toMatchObject({
      kind: "move",
      dir: 1,
      spawnIndex: 6,
      spawnValueBit: 0,
      deltaMs: 400,
    });
    expect(decoded.records[1]).toEqual({ kind: "undo1", deltaMs: 120 });
    expect(decoded.records[2]).toEqual({
      kind: "undon",
      undoCount: 2,
      deltaMs: 200,
    });
    expect(decoded.records[4]).toMatchObject({
      kind: "checkpoint",
      boardCodes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    });
    expect(decoded.records[5]).toMatchObject({
      kind: "ext",
      extType: 7,
    });
  });

  it("encodes replay v1 as the canonical base64 envelope", () => {
    const encoded = encodeReplayV1Base64({
      width: 4,
      height: 4,
      initTiles: [],
      records: [
        { kind: "move", dir: 1, spawnIndex: 6, spawnValueBit: 0, deltaMs: 400 },
      ],
    });
    expect(encoded.startsWith("REPLAY_v1RPL_B64_")).toBe(true);
    expect(decodeReplayV1Base64(encoded).records).toEqual([
      { kind: "move", dir: 1, spawnIndex: 6, spawnValueBit: 0, deltaMs: 400 },
    ]);
  });

  it("strictly rejects malformed or non-canonical replay v1 base64 envelopes", () => {
    const prefix = "REPLAY_v1RPL_B64_";
    expect(() => decodeReplayV1Base64("")).toThrow(
      "Invalid replay v1 base64 envelope",
    );
    expect(() => decodeReplayV1Base64(`${prefix}`)).toThrow(
      "Invalid replay v1 base64 payload",
    );
    expect(() => decodeReplayV1Base64(` ${prefix}AAAA`)).toThrow(
      "Invalid replay v1 base64 envelope",
    );
    expect(() => decodeReplayV1Base64(`${prefix}AA=A`)).toThrow(
      "Invalid replay v1 base64 payload",
    );
    expect(() => decodeReplayV1Base64(`${prefix}TR==`)).toThrow(
      "Invalid replay v1 base64 payload",
    );
  });

  it("keeps crc validation when decoding the replay v1 base64 envelope", () => {
    const encoded = encodeReplayV1Base64({
      width: 4,
      height: 4,
      initTiles: [],
      records: [
        { kind: "move", dir: 1, spawnIndex: 6, spawnValueBit: 0, deltaMs: 400 },
      ],
    });
    const prefix = "REPLAY_v1RPL_B64_";
    const bytes = Uint8Array.from(
      Buffer.from(encoded.slice(prefix.length), "base64"),
    );
    bytes[7] ^= 0xff;
    const tampered = prefix + Buffer.from(bytes).toString("base64");
    expect(() => decodeReplayV1Base64(tampered)).toThrow(
      "Replay v1 CRC32 mismatch",
    );
  });

  it("keeps ordinary pow2 spawn bytes unchanged", () => {
    const encodeMove = (spawnValue: 2 | 4) =>
      Array.from(
        encodeReplayV1Rpl({
          width: 4,
          height: 4,
          initTiles: [],
          records: createReplayV1MoveRecords({
            dir: 1,
            spawnIndex: 6,
            spawnValue,
            deltaMs: 400,
          }),
        }),
      );

    expect(encodeMove(2)).toEqual([
      82, 80, 76, 49, 68, 0, 0, 25, 144, 3, 20, 13, 105, 51,
    ]);
    expect(encodeMove(4)).toEqual([
      82, 80, 76, 49, 68, 0, 0, 89, 144, 3, 212, 128, 243, 67,
    ]);
  });

  it.each([8, 16, 32, 64])(
    "round trips exact pow2 spawn %i through ext type 8",
    (value) => {
      const decoded = decodeReplayV1Rpl(
        encodeReplayV1Rpl({
          width: 4,
          height: 4,
          initTiles: [],
          records: createReplayV1MoveRecords({
            dir: 2,
            spawnIndex: 6,
            spawnValue: value,
            deltaMs: 100,
          }),
        }),
      );

      expect(
        replayV1RecordsToReplayActions(decoded.records, 4).replaySpawns,
      ).toEqual([{ x: 2, y: 1, value }]);
    },
  );

  it("rejects malformed exact pow2 spawn extension pairs", () => {
    const move: ReplayV1Record = {
      kind: "move",
      dir: 2,
      spawnIndex: 6,
      spawnValueBit: 0,
      deltaMs: 100,
    };
    const ext = (payload: number[]): ReplayV1Record => ({
      kind: "ext",
      extType: 8,
      payload: new Uint8Array(payload),
    });
    const invalidCases: Array<{
      records: ReplayV1Record[];
      ruleset?: "pow2" | "fibonacci";
    }> = [
      { records: [ext([]), move] },
      { records: [ext([8, 16]), move] },
      { records: [ext([4]), move] },
      { records: [ext([128]), move] },
      { records: [ext([8])] },
      { records: [ext([8]), ext([16]), move] },
      { records: [ext([8]), { kind: "undo1", deltaMs: 1 }, move] },
      {
        records: [ext([8]), { ...move, spawnValueBit: 1 }],
      },
      { records: [ext([8]), move], ruleset: "fibonacci" },
    ];

    for (const testCase of invalidCases) {
      expect(() =>
        replayV1RecordsToReplayActions(
          testCase.records,
          4,
          testCase.ruleset || "pow2",
        ),
      ).toThrow();
    }
  });

  it("encodes and decodes replay v1 diagonal move direction", () => {
    const encoded = encodeReplayV1Rpl({
      width: 4,
      height: 4,
      initTiles: [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 1, valueBit: 1 },
      ],
      records: [
        {
          kind: "move",
          dir: 6,
          spawnIndex: 15,
          spawnValueBit: 0,
          deltaMs: 321,
        },
      ],
    });
    const decoded = decodeReplayV1Rpl(encoded);
    expect(decoded.records[0]).toMatchObject({
      kind: "move",
      dir: 6,
      spawnIndex: 15,
      spawnValueBit: 0,
      deltaMs: 321,
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
        { cellIndex: 24, valueBit: 1 },
      ],
      records: [
        { kind: "move", dir: 2, spawnIndex: 20, spawnValueBit: 0, deltaMs: 16 },
      ],
    });
    const decoded = decodeReplayV1Rpl(encoded);
    expect(decoded.width).toBe(5);
    expect(decoded.height).toBe(5);
    expect(decoded.initTiles).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 24, valueBit: 1 },
    ]);
    expect(decoded.records[0]).toMatchObject({
      kind: "move",
      dir: 2,
      spawnIndex: 20,
      spawnValueBit: 0,
    });
  });

  it("rejects replay v1 payload when crc mismatch", () => {
    const encoded = encodeReplayV1Rpl({
      width: 4,
      height: 4,
      initTiles: [],
      records: [
        { kind: "move", dir: 0, spawnIndex: 0, spawnValueBit: 0, deltaMs: 1 },
      ],
    });
    const tampered = encoded.slice();
    tampered[7] = tampered[7] ^ 0xff;
    expect(() => decodeReplayV1Rpl(tampered)).toThrow(
      "Replay v1 CRC32 mismatch",
    );
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
      { cellIndex: 5, valueBit: 1 },
    ]);
    expect(board[0][0]).toBe(2);
    expect(board[1][1]).toBe(4);
    expect(replayV1BoardToInitTiles(4, 4, board)).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 5, valueBit: 1 },
    ]);

    const mapped = replayV1RecordsToReplayActions(
      [
        { kind: "move", dir: 2, spawnIndex: 6, spawnValueBit: 1, deltaMs: 100 },
        { kind: "undo1", deltaMs: 100 },
        { kind: "undon", undoCount: 2, deltaMs: 200 },
      ],
      4,
    );
    expect(mapped.replayMoves).toEqual([2, -1, -1, -1]);
    expect(mapped.replaySpawns[0]).toEqual({ x: 2, y: 1, value: 4 });
    expect(mapped.replaySpawns[1]).toBeNull();
    expect(mapped.replaySpawns[2]).toBeNull();
    expect(mapped.replaySpawns[3]).toBeNull();
  });

  it("maps replay v1 init tiles and actions for fibonacci ruleset", () => {
    const board = replayV1InitTilesToBoard(
      4,
      4,
      [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 5, valueBit: 1 },
      ],
      "fibonacci",
    );
    expect(board[0][0]).toBe(1);
    expect(board[1][1]).toBe(2);
    expect(replayV1BoardToInitTiles(4, 4, board, "fibonacci")).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 5, valueBit: 1 },
    ]);

    const mapped = replayV1RecordsToReplayActions(
      [{ kind: "move", dir: 2, spawnIndex: 6, spawnValueBit: 1, deltaMs: 100 }],
      4,
      "fibonacci",
    );
    expect(mapped.replayMoves).toEqual([2]);
    expect(mapped.replaySpawns[0]).toEqual({ x: 2, y: 1, value: 2 });
  });
});
