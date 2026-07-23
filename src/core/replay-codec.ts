export const REPLAY128_ASCII_START = 33;
export const REPLAY128_ASCII_COUNT = 94;
export const REPLAY128_TOTAL = 128;
export const REPLAY_V1_MAGIC = "RPL1";
export const REPLAY_V1_BASE64_PREFIX = "REPLAY_v1RPL_B64_";

export const REPLAY_V1_FLAG_HAS_START_UNIX_MS = 1 << 0;
export const REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS = 1 << 1;
export const REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS = 1 << 2;
export const REPLAY_V1_FLAG_EXTENDED_INIT_TILES = 1 << 3;

export const REPLAY_V1_RECORD_UNDO1 = 0x80;
export const REPLAY_V1_RECORD_UNDON = 0x81;
export const REPLAY_V1_RECORD_CHECKPOINT = 0x82;
export const REPLAY_V1_RECORD_EXT = 0x83;
export const REPLAY_V1_RECORD_END = 0x84;
export const REPLAY_V1_RECORD_MOVE8 = 0x85;
export const REPLAY_V1_EXT_POW2_EXACT_SPAWN = 8;

export const REPLAY128_EXTRA_CODES: number[] = (() => {
  const codes: number[] = [];
  for (let c = 161; c <= 172; c += 1) codes.push(c);
  // Skip 173 (soft hyphen) because it is visually unstable in copy/paste.
  for (let c = 174; c <= 195; c += 1) codes.push(c);
  return codes;
})();

export interface ReplayV1InitTile {
  cellIndex: number;
  valueBit: 0 | 1;
}

export interface ReplayV1MoveRecord {
  kind: "move";
  dir: number;
  spawnIndex: number;
  spawnValueBit: 0 | 1;
  deltaMs: number;
}

export interface ReplayV1Undo1Record {
  kind: "undo1";
  deltaMs: number;
}

export interface ReplayV1UndonRecord {
  kind: "undon";
  undoCount: number;
  deltaMs: number;
}

export interface ReplayV1CheckpointRecord {
  kind: "checkpoint";
  boardCodes: number[];
}

export interface ReplayV1ExtRecord {
  kind: "ext";
  extType: number;
  payload: Uint8Array;
}

export interface ReplayV1EndRecord {
  kind: "end";
}

export type ReplayV1Record =
  | ReplayV1MoveRecord
  | ReplayV1Undo1Record
  | ReplayV1UndonRecord
  | ReplayV1CheckpointRecord
  | ReplayV1ExtRecord
  | ReplayV1EndRecord;

export interface ReplayV1EncodeInput {
  width: number;
  height: number;
  initTiles: ReplayV1InitTile[];
  records: ReplayV1Record[];
  startUnixMs?: number | null;
  flags?: number;
}

export interface ReplayV1MoveInput {
  dir: number;
  spawnIndex: number;
  spawnValue: number;
  deltaMs: number;
  ruleset?: ReplayV1Ruleset;
}

export interface ReplayV1DecodedFile {
  magic: "RPL1";
  width: number;
  height: number;
  flags: number;
  initTiles: ReplayV1InitTile[];
  startUnixMs: number | null;
  records: ReplayV1Record[];
  expectedCrc32: number;
  computedCrc32: number;
}

export interface ReplayV1DecodedActions {
  replayMoves: Array<number | unknown[]>;
  replaySpawns: Array<{ x: number; y: number; value: number } | null>;
}

export type ReplayV1Ruleset = "pow2" | "fibonacci";

const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 1) !== 0 ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

function toUint8Array(data: ArrayBuffer | ArrayLike<number> | Uint8Array): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data);
}

function appendBytes(chunks: number[][], bytes: number[]): void {
  chunks.push(bytes);
}

function concatByteChunks(chunks: number[][]): Uint8Array {
  let total = 0;
  for (let i = 0; i < chunks.length; i += 1) total += chunks[i].length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function assertIntegerRange(value: number, min: number, max: number, message: string): number {
  if (!Number.isInteger(value) || value < min || value > max) throw message;
  return value;
}

function clampNonNegativeInt(value: number, message: string): number {
  if (!Number.isFinite(value) || value < 0) throw message;
  return Math.floor(value);
}

function isReplayV1Pow2ExactSpawnValue(value: number): boolean {
  return value === 8 || value === 16 || value === 32 || value === 64;
}

export function createReplayV1MoveRecords(input: ReplayV1MoveInput): ReplayV1Record[] {
  const dir = assertIntegerRange(Number(input.dir), 0, 7, "Invalid replay v1 move direction");
  const spawnIndex = assertIntegerRange(
    Number(input.spawnIndex),
    0,
    0x7fffffff,
    "Invalid replay v1 spawn index"
  );
  const deltaMs = clampNonNegativeInt(Number(input.deltaMs), "Invalid replay v1 move delta");
  const spawnValue = Number(input.spawnValue);
  const ruleset = input.ruleset || "pow2";
  let spawnValueBit: 0 | 1;

  if (ruleset === "fibonacci") {
    if (spawnValue !== 1 && spawnValue !== 2) throw "Invalid replay v1 fibonacci spawn value";
    spawnValueBit = spawnValue === 2 ? 1 : 0;
  } else {
    if (spawnValue !== 2 && spawnValue !== 4 && !isReplayV1Pow2ExactSpawnValue(spawnValue)) {
      throw "Invalid replay v1 pow2 spawn value";
    }
    spawnValueBit = spawnValue === 4 ? 1 : 0;
  }

  const move: ReplayV1MoveRecord = { kind: "move", dir, spawnIndex, spawnValueBit, deltaMs };
  if (ruleset === "pow2" && isReplayV1Pow2ExactSpawnValue(spawnValue)) {
    return [
      {
        kind: "ext",
        extType: REPLAY_V1_EXT_POW2_EXACT_SPAWN,
        payload: new Uint8Array([spawnValue])
      },
      move
    ];
  }
  return [move];
}

export function encodeUleb128(value: number): number[] {
  const normalized = clampNonNegativeInt(value, "Invalid ULEB128 value");
  if (normalized === 0) return [0];
  const out: number[] = [];
  let current = normalized;
  while (current > 0) {
    const byte = current & 0x7f;
    current = Math.floor(current / 128);
    if (current > 0) {
      out.push((byte | 0x80) & 0xff);
    } else {
      out.push(byte & 0xff);
    }
  }
  return out;
}

export function decodeUleb128(bytesLike: ArrayBuffer | ArrayLike<number> | Uint8Array, offset: number): {
  value: number;
  nextOffset: number;
} {
  const bytes = toUint8Array(bytesLike);
  let value = 0;
  let shift = 0;
  let cursor = offset;
  while (cursor < bytes.length) {
    const byte = bytes[cursor];
    cursor += 1;
    value += (byte & 0x7f) * Math.pow(2, shift);
    if ((byte & 0x80) === 0) {
      return {
        value: Math.floor(value),
        nextOffset: cursor
      };
    }
    shift += 7;
    if (shift > 56) throw "ULEB128 value is too large";
  }
  throw "Unexpected EOF while decoding ULEB128";
}

export function computeCrc32(bytesLike: ArrayBuffer | ArrayLike<number> | Uint8Array): number {
  const bytes = toUint8Array(bytesLike);
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodeReplayV1PackedBoardCodes(width: number, height: number, boardCodes: number[]): number[] {
  const cellCount = width * height;
  if (!Array.isArray(boardCodes) || boardCodes.length !== cellCount) {
    throw "Invalid replay v1 checkpoint board codes";
  }
  const totalBits = cellCount * 5;
  const totalBytes = Math.ceil(totalBits / 8);
  const out = new Uint8Array(totalBytes);
  let bitCursor = 0;
  for (let i = 0; i < boardCodes.length; i += 1) {
    const code = assertIntegerRange(Number(boardCodes[i]), 0, 31, "Invalid replay v1 checkpoint board code");
    for (let bit = 0; bit < 5; bit += 1) {
      if (((code >> bit) & 1) === 0) continue;
      const targetBit = bitCursor + bit;
      const byteIndex = Math.floor(targetBit / 8);
      const bitIndex = targetBit % 8;
      out[byteIndex] |= 1 << bitIndex;
    }
    bitCursor += 5;
  }
  return Array.from(out);
}

function decodeReplayV1PackedBoardCodes(width: number, height: number, payload: Uint8Array): number[] {
  const cellCount = width * height;
  const totalBits = cellCount * 5;
  const totalBytes = Math.ceil(totalBits / 8);
  if (payload.length !== totalBytes) throw "Invalid replay v1 checkpoint payload length";
  const out: number[] = [];
  let bitCursor = 0;
  for (let i = 0; i < cellCount; i += 1) {
    let code = 0;
    for (let bit = 0; bit < 5; bit += 1) {
      const sourceBit = bitCursor + bit;
      const byteIndex = Math.floor(sourceBit / 8);
      const bitIndex = sourceBit % 8;
      const bitValue = (payload[byteIndex] >> bitIndex) & 1;
      code |= bitValue << bit;
    }
    out.push(code);
    bitCursor += 5;
  }
  return out;
}

function encodeReplayV1Record(width: number, height: number, record: ReplayV1Record): number[] {
  if (!record || typeof record !== "object") throw "Invalid replay v1 record";
  if (record.kind === "move") {
    const dir = assertIntegerRange(record.dir, 0, 7, "Invalid replay v1 move direction");
    const spawnIndex = assertIntegerRange(record.spawnIndex, 0, width * height - 1, "Invalid replay v1 spawn index");
    const spawnValueBit = assertIntegerRange(record.spawnValueBit, 0, 1, "Invalid replay v1 spawn value bit");
    const delta = encodeUleb128(record.deltaMs);
    if (dir <= 3 && spawnIndex <= 15) {
      const byte0 = (dir & 0x03) | ((spawnIndex & 0x0f) << 2) | ((spawnValueBit & 1) << 6);
      return [byte0, ...delta];
    }
    return [
      REPLAY_V1_RECORD_MOVE8,
      dir & 0xff,
      ...encodeUleb128(spawnIndex),
      spawnValueBit & 1,
      ...delta
    ];
  }

  if (record.kind === "undo1") {
    return [REPLAY_V1_RECORD_UNDO1, ...encodeUleb128(record.deltaMs)];
  }

  if (record.kind === "undon") {
    const undoCount = assertIntegerRange(record.undoCount, 1, 0x7fffffff, "Invalid replay v1 undo count");
    return [REPLAY_V1_RECORD_UNDON, ...encodeUleb128(undoCount), ...encodeUleb128(record.deltaMs)];
  }

  if (record.kind === "checkpoint") {
    const packed = encodeReplayV1PackedBoardCodes(width, height, record.boardCodes);
    return [REPLAY_V1_RECORD_CHECKPOINT, ...packed];
  }

  if (record.kind === "ext") {
    const extType = assertIntegerRange(record.extType, 0, 0x7fffffff, "Invalid replay v1 ext type");
    const payload = Array.from(toUint8Array(record.payload || []));
    return [REPLAY_V1_RECORD_EXT, ...encodeUleb128(extType), ...encodeUleb128(payload.length), ...payload];
  }

  if (record.kind === "end") {
    return [REPLAY_V1_RECORD_END];
  }

  throw "Unsupported replay v1 record kind";
}

export function encodeReplayV1Rpl(input: ReplayV1EncodeInput): Uint8Array {
  const width = assertIntegerRange(Number(input.width), 1, 15, "Invalid replay v1 board width");
  const height = assertIntegerRange(Number(input.height), 1, 15, "Invalid replay v1 board height");
  const initTiles = Array.isArray(input.initTiles) ? input.initTiles : [];
  const records = Array.isArray(input.records) ? input.records : [];
  const hasStartUnixMs = Number.isFinite(input.startUnixMs) && Number(input.startUnixMs) >= 0;
  const rawFlags = typeof input.flags === "number" && Number.isInteger(input.flags) ? input.flags : 0;
  let flags = rawFlags & 0xff;
  if (hasStartUnixMs) {
    flags |= REPLAY_V1_FLAG_HAS_START_UNIX_MS;
  } else {
    flags &= ~REPLAY_V1_FLAG_HAS_START_UNIX_MS;
  }

  let containsUndo = false;
  let containsCheckpoints = false;
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (!record) continue;
    if (record.kind === "undo1" || record.kind === "undon") containsUndo = true;
    if (record.kind === "checkpoint") containsCheckpoints = true;
  }
  if (containsUndo) flags |= REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS;
  if (containsCheckpoints) flags |= REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS;
  const useExtendedInitTiles = width * height > 16;
  if (useExtendedInitTiles) {
    flags |= REPLAY_V1_FLAG_EXTENDED_INIT_TILES;
  } else {
    flags &= ~REPLAY_V1_FLAG_EXTENDED_INIT_TILES;
  }

  const chunks: number[][] = [];
  appendBytes(chunks, [82, 80, 76, 49]); // RPL1
  appendBytes(chunks, [(width & 0x0f) | ((height & 0x0f) << 4)]);
  appendBytes(chunks, [flags & 0xff]);
  appendBytes(chunks, [assertIntegerRange(initTiles.length, 0, 255, "Too many replay v1 init tiles")]);

  if (hasStartUnixMs) {
    appendBytes(chunks, encodeUleb128(Number(input.startUnixMs)));
  }

  for (let i = 0; i < initTiles.length; i += 1) {
    const tile = initTiles[i];
    const cellIndex = assertIntegerRange(
      Number(tile && tile.cellIndex),
      0,
      width * height - 1,
      "Invalid replay v1 init tile cell index"
    );
    const valueBit = assertIntegerRange(Number(tile && tile.valueBit), 0, 1, "Invalid replay v1 init tile value bit");
    if ((flags & REPLAY_V1_FLAG_EXTENDED_INIT_TILES) !== 0) {
      appendBytes(chunks, encodeUleb128((cellIndex << 1) | (valueBit & 1)));
    } else {
      appendBytes(chunks, [(cellIndex & 0x0f) | ((valueBit & 1) << 4)]);
    }
  }

  for (let i = 0; i < records.length; i += 1) {
    appendBytes(chunks, encodeReplayV1Record(width, height, records[i]));
  }

  const payload = concatByteChunks(chunks);
  const crc = computeCrc32(payload);
  const withCrc = new Uint8Array(payload.length + 4);
  withCrc.set(payload, 0);
  withCrc[payload.length] = crc & 0xff;
  withCrc[payload.length + 1] = (crc >>> 8) & 0xff;
  withCrc[payload.length + 2] = (crc >>> 16) & 0xff;
  withCrc[payload.length + 3] = (crc >>> 24) & 0xff;
  return withCrc;
}

function encodeReplayV1BytesAsBase64(bytes: Uint8Array): string {
  const btoaLike = (globalThis as unknown as { btoa?: (value: string) => string }).btoa;
  if (typeof btoaLike === "function") {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoaLike(binary);
  }
  const BufferLike = (globalThis as unknown as {
    Buffer?: { from: (value: Uint8Array) => { toString: (encoding: string) => string } };
  }).Buffer;
  if (BufferLike) return BufferLike.from(bytes).toString("base64");
  throw "Base64 encoder is unavailable";
}

export function encodeReplayV1Base64(input: ReplayV1EncodeInput): string {
  return REPLAY_V1_BASE64_PREFIX + encodeReplayV1BytesAsBase64(encodeReplayV1Rpl(input));
}

export function decodeReplayV1Rpl(bytesLike: ArrayBuffer | ArrayLike<number> | Uint8Array): ReplayV1DecodedFile {
  const bytes = toUint8Array(bytesLike);
  if (bytes.length < 11) throw "Invalid replay v1 payload length";

  if (bytes[0] !== 82 || bytes[1] !== 80 || bytes[2] !== 76 || bytes[3] !== 49) {
    throw "Invalid replay v1 magic";
  }

  const dims = bytes[4];
  const width = dims & 0x0f;
  const height = (dims >> 4) & 0x0f;
  if (!width || !height) throw "Invalid replay v1 board dimensions";

  const flags = bytes[5] & 0xff;
  const initCount = bytes[6] & 0xff;

  const crcOffset = bytes.length - 4;
  const expectedCrc32 =
    (bytes[crcOffset] & 0xff) |
    ((bytes[crcOffset + 1] & 0xff) << 8) |
    ((bytes[crcOffset + 2] & 0xff) << 16) |
    ((bytes[crcOffset + 3] & 0xff) << 24);
  const computedCrc32 = computeCrc32(bytes.subarray(0, crcOffset));
  if ((expectedCrc32 >>> 0) !== (computedCrc32 >>> 0)) throw "Replay v1 CRC32 mismatch";

  let offset = 7;
  let startUnixMs: number | null = null;
  if ((flags & REPLAY_V1_FLAG_HAS_START_UNIX_MS) !== 0) {
    const decoded = decodeUleb128(bytes, offset);
    startUnixMs = decoded.value;
    offset = decoded.nextOffset;
  }

  const initTiles: ReplayV1InitTile[] = [];
  for (let i = 0; i < initCount; i += 1) {
    if ((flags & REPLAY_V1_FLAG_EXTENDED_INIT_TILES) !== 0) {
      const decoded = decodeUleb128(bytes, offset);
      offset = decoded.nextOffset;
      const encodedTile = decoded.value;
      const cellIndex = encodedTile >>> 1;
      const valueBit = (encodedTile & 1) as 0 | 1;
      if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= width * height) {
        throw "Invalid replay v1 init tile cell index";
      }
      initTiles.push({
        cellIndex,
        valueBit
      });
    } else {
      if (offset >= crcOffset) throw "Unexpected EOF while decoding replay v1 init tiles";
      const token = bytes[offset];
      offset += 1;
      initTiles.push({
        cellIndex: token & 0x0f,
        valueBit: ((token >> 4) & 1) as 0 | 1
      });
    }
  }

  const records: ReplayV1Record[] = [];
  const checkpointBytes = Math.ceil((width * height * 5) / 8);
  while (offset < crcOffset) {
    const tag = bytes[offset] & 0xff;
    if (tag < 0x80) {
      offset += 1;
      const deltaDecoded = decodeUleb128(bytes, offset);
      offset = deltaDecoded.nextOffset;
      records.push({
        kind: "move",
        dir: tag & 0x03,
        spawnIndex: (tag >> 2) & 0x0f,
        spawnValueBit: ((tag >> 6) & 1) as 0 | 1,
        deltaMs: deltaDecoded.value
      });
      continue;
    }

    if (tag === REPLAY_V1_RECORD_UNDO1) {
      offset += 1;
      const deltaDecoded = decodeUleb128(bytes, offset);
      offset = deltaDecoded.nextOffset;
      records.push({
        kind: "undo1",
        deltaMs: deltaDecoded.value
      });
      continue;
    }

    if (tag === REPLAY_V1_RECORD_UNDON) {
      offset += 1;
      const undoCountDecoded = decodeUleb128(bytes, offset);
      const deltaDecoded = decodeUleb128(bytes, undoCountDecoded.nextOffset);
      offset = deltaDecoded.nextOffset;
      records.push({
        kind: "undon",
        undoCount: undoCountDecoded.value,
        deltaMs: deltaDecoded.value
      });
      continue;
    }

    if (tag === REPLAY_V1_RECORD_CHECKPOINT) {
      offset += 1;
      const payloadEnd = offset + checkpointBytes;
      if (payloadEnd > crcOffset) throw "Unexpected EOF while decoding replay v1 checkpoint";
      const payload = bytes.subarray(offset, payloadEnd);
      offset = payloadEnd;
      records.push({
        kind: "checkpoint",
        boardCodes: decodeReplayV1PackedBoardCodes(width, height, payload)
      });
      continue;
    }

    if (tag === REPLAY_V1_RECORD_EXT) {
      offset += 1;
      const extTypeDecoded = decodeUleb128(bytes, offset);
      const extLenDecoded = decodeUleb128(bytes, extTypeDecoded.nextOffset);
      offset = extLenDecoded.nextOffset;
      const payloadEnd = offset + extLenDecoded.value;
      if (payloadEnd > crcOffset) throw "Unexpected EOF while decoding replay v1 ext payload";
      const payload = bytes.subarray(offset, payloadEnd);
      offset = payloadEnd;
      records.push({
        kind: "ext",
        extType: extTypeDecoded.value,
        payload: payload.slice()
      });
      continue;
    }

    if (tag === REPLAY_V1_RECORD_END) {
      offset += 1;
      records.push({ kind: "end" });
      continue;
    }

    if (tag === REPLAY_V1_RECORD_MOVE8) {
      offset += 1;
      if (offset >= crcOffset) throw "Unexpected EOF while decoding replay v1 move8";
      const dir = bytes[offset] & 0xff;
      offset += 1;
      if (!Number.isInteger(dir) || dir < 0 || dir > 7) throw "Invalid replay v1 move8 direction";
      const spawnIndexDecoded = decodeUleb128(bytes, offset);
      offset = spawnIndexDecoded.nextOffset;
      const spawnIndex = spawnIndexDecoded.value;
      if (!Number.isInteger(spawnIndex) || spawnIndex < 0 || spawnIndex >= width * height) {
        throw "Invalid replay v1 move8 spawn index";
      }
      if (offset >= crcOffset) throw "Unexpected EOF while decoding replay v1 move8 value bit";
      const spawnValueBit = bytes[offset] & 0xff;
      offset += 1;
      if (spawnValueBit !== 0 && spawnValueBit !== 1) throw "Invalid replay v1 move8 spawn value bit";
      const deltaDecoded = decodeUleb128(bytes, offset);
      offset = deltaDecoded.nextOffset;
      records.push({
        kind: "move",
        dir,
        spawnIndex,
        spawnValueBit: spawnValueBit as 0 | 1,
        deltaMs: deltaDecoded.value
      });
      continue;
    }

    throw "Unsupported replay v1 record type";
  }

  return {
    magic: "RPL1",
    width,
    height,
    flags,
    initTiles,
    startUnixMs,
    records,
    expectedCrc32: expectedCrc32 >>> 0,
    computedCrc32: computedCrc32 >>> 0
  };
}

export function replayV1InitTilesToBoard(
  width: number,
  height: number,
  initTiles: ReplayV1InitTile[],
  ruleset: ReplayV1Ruleset = "pow2"
): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < width; x += 1) row.push(0);
    out.push(row);
  }
  const tiles = Array.isArray(initTiles) ? initTiles : [];
  const fib = ruleset === "fibonacci";
  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i];
    const cellIndex = Number(tile && tile.cellIndex);
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= width * height) continue;
    const valueBit = Number(tile && tile.valueBit);
    const value = fib ? (valueBit === 1 ? 2 : 1) : valueBit === 1 ? 4 : 2;
    const x = cellIndex % width;
    const y = Math.floor(cellIndex / width);
    out[y][x] = value;
  }
  return out;
}

export function replayV1BoardToInitTiles(
  width: number,
  height: number,
  board: number[][],
  ruleset: ReplayV1Ruleset = "pow2"
): ReplayV1InitTile[] {
  if (!Array.isArray(board) || board.length !== height) throw "Invalid replay v1 board";
  const initTiles: ReplayV1InitTile[] = [];
  const fib = ruleset === "fibonacci";
  for (let y = 0; y < height; y += 1) {
    const row = board[y];
    if (!Array.isArray(row) || row.length !== width) throw "Invalid replay v1 board row";
    for (let x = 0; x < width; x += 1) {
      const value = Number(row[x]);
      if (value === 0) continue;
      if (fib) {
        if (value !== 1 && value !== 2) throw "Replay v1 init tile only supports value 1/2 in fibonacci mode";
      } else if (value !== 2 && value !== 4) {
        throw "Replay v1 init tile only supports value 2/4";
      }
      initTiles.push({
        cellIndex: y * width + x,
        valueBit: fib ? (value === 2 ? 1 : 0) : value === 4 ? 1 : 0
      });
    }
  }
  return initTiles;
}

export function replayV1RecordsToReplayActions(
  records: ReplayV1Record[],
  width: number,
  ruleset: ReplayV1Ruleset = "pow2"
): ReplayV1DecodedActions {
  const replayMoves: Array<number | unknown[]> = [];
  const replaySpawns: Array<{ x: number; y: number; value: number } | null> = [];
  const source = Array.isArray(records) ? records : [];
  const fib = ruleset === "fibonacci";
  let exactSpawnValue: number | null = null;
  for (let i = 0; i < source.length; i += 1) {
    const record = source[i];
    if (!record) {
      if (exactSpawnValue !== null) throw "Replay v1 exact spawn extension crossed a record";
      continue;
    }
    if (record.kind === "ext" && record.extType === REPLAY_V1_EXT_POW2_EXACT_SPAWN) {
      if (exactSpawnValue !== null) throw "Duplicate replay v1 exact spawn extension";
      if (fib) throw "Replay v1 exact spawn extension requires pow2 rules";
      const payload = toUint8Array(record.payload || []);
      if (payload.length !== 1 || !isReplayV1Pow2ExactSpawnValue(payload[0])) {
        throw "Invalid replay v1 exact spawn extension";
      }
      exactSpawnValue = payload[0];
      continue;
    }
    if (exactSpawnValue !== null && record.kind !== "move") {
      throw "Replay v1 exact spawn extension crossed a record";
    }
    if (record.kind === "move") {
      if (exactSpawnValue !== null && record.spawnValueBit !== 0) {
        throw "Replay v1 exact spawn move value bit must be zero";
      }
      replayMoves.push(record.dir);
      replaySpawns.push({
        x: record.spawnIndex % width,
        y: Math.floor(record.spawnIndex / width),
        value:
          exactSpawnValue !== null
            ? exactSpawnValue
            : fib
              ? record.spawnValueBit === 1
                ? 2
                : 1
              : record.spawnValueBit === 1
                ? 4
                : 2
      });
      exactSpawnValue = null;
      continue;
    }
    if (record.kind === "undo1") {
      replayMoves.push(-1);
      replaySpawns.push(null);
      continue;
    }
    if (record.kind === "undon") {
      for (let j = 0; j < record.undoCount; j += 1) {
        replayMoves.push(-1);
        replaySpawns.push(null);
      }
    }
  }
  if (exactSpawnValue !== null) throw "Dangling replay v1 exact spawn extension";
  return { replayMoves, replaySpawns };
}

export function encodeReplay128(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code >= REPLAY128_TOTAL) {
    throw "Invalid replay code";
  }
  if (code < REPLAY128_ASCII_COUNT) {
    return String.fromCharCode(REPLAY128_ASCII_START + code);
  }
  return String.fromCharCode(REPLAY128_EXTRA_CODES[code - REPLAY128_ASCII_COUNT]);
}

export function decodeReplay128(char: string): number {
  if (!char || char.length !== 1) throw "Invalid replay char";
  const code = char.charCodeAt(0);
  if (code >= REPLAY128_ASCII_START && code < REPLAY128_ASCII_START + REPLAY128_ASCII_COUNT) {
    return code - REPLAY128_ASCII_START;
  }
  const extraIndex = REPLAY128_EXTRA_CODES.indexOf(code);
  if (extraIndex >= 0) return REPLAY128_ASCII_COUNT + extraIndex;
  throw "Invalid replay char";
}

export function encodeBoardV4(board: number[][]): string {
  if (!Array.isArray(board) || board.length !== 4) throw "Invalid initial board";
  let out = "";
  for (let y = 0; y < 4; y += 1) {
    if (!Array.isArray(board[y]) || board[y].length !== 4) throw "Invalid initial board row";
    for (let x = 0; x < 4; x += 1) {
      const value = board[y][x];
      if (!Number.isInteger(value) || value < 0) throw "Invalid board tile value";
      let exp = 0;
      if (value > 0) {
        const lg = Math.log(value) / Math.log(2);
        if (Math.floor(lg) !== lg) throw "Board tile is not power of two";
        exp = lg;
      }
      if (exp < 0 || exp >= REPLAY128_TOTAL) throw "Board tile exponent too large";
      out += encodeReplay128(exp);
    }
  }
  return out;
}

export function decodeBoardV4(encoded: string): number[][] {
  if (typeof encoded !== "string" || encoded.length !== 16) throw "Invalid encoded board";
  const rows: number[][] = [];
  let idx = 0;
  for (let y = 0; y < 4; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < 4; x += 1) {
      const exp = decodeReplay128(encoded.charAt(idx));
      idx += 1;
      row.push(exp === 0 ? 0 : Math.pow(2, exp));
    }
    rows.push(row);
  }
  return rows;
}

export function appendCompactMoveCode(input: { log?: unknown; rawCode?: unknown }): string {
  const source = input || {};
  const rawCode = Number(source.rawCode);
  if (!Number.isInteger(rawCode) || rawCode < 0 || rawCode > 127) throw "Invalid move code";
  const baseLog = typeof source.log === "string" ? source.log : "";
  if (rawCode < 127) return baseLog + encodeReplay128(rawCode);
  return baseLog + encodeReplay128(127) + encodeReplay128(0);
}

export function appendCompactUndo(log: unknown): string {
  const baseLog = typeof log === "string" ? log : "";
  return baseLog + encodeReplay128(127) + encodeReplay128(1);
}

export function appendCompactPracticeAction(input: {
  log?: unknown;
  width?: unknown;
  height?: unknown;
  x?: unknown;
  y?: unknown;
  value?: unknown;
}): string {
  const source = input || {};
  const width = Number(source.width);
  const height = Number(source.height);
  if (width !== 4 || height !== 4) throw "Compact practice replay only supports 4x4";

  const x = Number(source.x);
  const y = Number(source.y);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 3 || y < 0 || y > 3) {
    throw "Invalid practice coords";
  }

  const value = Number(source.value);
  if (!Number.isInteger(value) || value < 0) throw "Invalid practice value";
  let exp = 0;
  if (value > 0) {
    const lg = Math.log(value) / Math.log(2);
    if (Math.floor(lg) !== lg) throw "Practice value must be power of two";
    exp = lg;
  }
  if (exp < 0 || exp > 127) throw "Practice value exponent too large";

  const baseLog = typeof source.log === "string" ? source.log : "";
  const cell = (x << 2) | y;
  return (
    baseLog +
    encodeReplay128(127) +
    encodeReplay128(2) +
    encodeReplay128(cell) +
    encodeReplay128(exp)
  );
}
