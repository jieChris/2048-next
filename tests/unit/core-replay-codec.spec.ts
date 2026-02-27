import { describe, expect, it } from "vitest";

import {
  appendCompactMoveCode,
  appendCompactPracticeAction,
  appendCompactUndo,
  decodeBoardV4,
  decodeReplay128,
  encodeBoardV4,
  encodeReplay128
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
});
