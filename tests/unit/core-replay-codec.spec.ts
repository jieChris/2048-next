import { describe, expect, it } from "vitest";

import {
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
});
