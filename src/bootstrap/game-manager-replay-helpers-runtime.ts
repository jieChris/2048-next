import {
  appendCompactMoveCode as appendCompactMoveCodeCore,
  appendCompactPracticeAction as appendCompactPracticeActionCore,
  appendCompactUndo as appendCompactUndoCore,
  decodeReplay128 as decodeReplay128Core,
  decodeReplayV1Rpl,
  encodeReplay128 as encodeReplay128Core,
  encodeReplayV1Rpl,
  replayV1InitTilesToBoard,
  replayV1RecordsToReplayActions,
  type ReplayV1EncodeInput,
  type ReplayV1Record
} from "../core/replay-codec";
import { computePostMoveRecord as computePostMoveRecordCore } from "../core/post-move-record";

const REPLAY_V1_RPL_BASE64_PREFIX = "REPLAY_v1RPL_B64_";
const REPLAY_V1_EXT_MODE_KEY = 1;
const REPLAY_V1_EXT_RULESET = 2;
const REPLAY_V1_EXT_CHALLENGE_ID = 3;
const REPLAY_V1_EXT_SEED = 4;
const LEGACY_VRS_NEW_CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  Array.from({ length: 64 }, (_unused, index) => String.fromCharCode(0xc0 + index)).join("") +
  "\u00a4\u00be";
const LEGACY_VRS_VARIANTS = {
  "2x4": { width: 4, height: 2, modeKey: "board_2x4_pow2_no_undo" },
  "3x3": { width: 3, height: 3, modeKey: "board_3x3_pow2_no_undo" },
  "3x4": { width: 4, height: 3, modeKey: "board_3x4_pow2_no_undo" },
  "4x4": { width: 4, height: 4, modeKey: "standard_4x4_pow2_no_undo" }
};
const V9_VERSE_ASCII_CHARSET = Array.from({ length: 95 }, (_unused, index) =>
  String.fromCharCode(32 + index)
).join("");
const V9_VERSE_PNG_CHARSET =
  V9_VERSE_ASCII_CHARSET +
  "\u811f\u7709\u8305\u8292\u76f2\u813f\u6c13\u83bd\u951a\u6bdb\u732b\u8302\u536f\u77db\u811b\u811c\u8121\u5fd9\u811d\u4e48\u679a\u8c8c\u6ca1\u9709\u6bcf\u8130\u813a\u9176\u62e2\u8134\u8133\u8320\u8c29";
const V9_VERSE_PNG_CHARSET_LEGACY =
  V9_VERSE_ASCII_CHARSET +
  "\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00f8\u00a3\u00d8\u00d7\u0192\u00e1";
const REPLAY_SEEK_CHECKPOINT_INTERVAL = 32;

type BoardMatrix = number[][];
type ReplaySpawn = { x: number; y: number; value: number };
type ReplayCheckpoint = { index: number; board: BoardMatrix };
type GridLike = { insertTile?: (tile: unknown) => unknown };

let v9VerseRepairRuntime: { map: Record<string, string>; maxKeyLength: number } | null = null;

type ManagerLike = Record<string, unknown>;
type WindowLike = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function cloneJsonSafe(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return null;
  }
}

function cloneBoardMatrix(board: BoardMatrix): BoardMatrix {
  return board.map((row) => row.slice());
}

function normalizeBoardMatrix(board: unknown): BoardMatrix | null {
  if (!Array.isArray(board) || board.length === 0) return null;
  const width = Array.isArray(board[0]) ? board[0].length : 0;
  if (!width) return null;
  const normalized: BoardMatrix = [];
  for (const sourceRow of board) {
    if (!Array.isArray(sourceRow) || sourceRow.length !== width) return null;
    const row = [];
    for (const value of sourceRow) row.push(Math.floor(Number(value) || 0));
    normalized.push(row);
  }
  return normalized;
}

function boardMatricesEqual(left: unknown, right: BoardMatrix): boolean {
  const normalizedLeft = normalizeBoardMatrix(left);
  if (!normalizedLeft || normalizedLeft.length !== right.length) return false;
  for (let y = 0; y < right.length; y += 1) {
    if (normalizedLeft[y].length !== right[y].length) return false;
    for (let x = 0; x < right[y].length; x += 1) {
      if (normalizedLeft[y][x] !== Math.floor(Number(right[y][x]) || 0)) return false;
    }
  }
  return true;
}

function findGridConstructor(manager: ManagerLike): (new (width: number, height: number) => GridLike) | null {
  const windowLike = getWindowLikeForManager(manager);
  if (typeof windowLike.Grid === "function") return windowLike.Grid as new (width: number, height: number) => GridLike;
  const existingCtor = toRecord(manager.grid).constructor;
  return typeof existingCtor === "function" && existingCtor !== Object
    ? (existingCtor as new (width: number, height: number) => GridLike)
    : null;
}

function findTileConstructor(manager: ManagerLike): (new (position: unknown, value: number) => unknown) | null {
  const windowLike = getWindowLikeForManager(manager);
  if (typeof windowLike.Tile === "function") return windowLike.Tile as new (position: unknown, value: number) => unknown;
  const cells = Array.isArray(toRecord(manager.grid).cells) ? (toRecord(manager.grid).cells as unknown[][]) : [];
  for (const column of cells) {
    if (!Array.isArray(column)) continue;
    for (const cell of column) {
      if (!cell) continue;
      const ctor = toRecord(cell).constructor;
      if (typeof ctor === "function" && ctor !== Object) return ctor as new (position: unknown, value: number) => unknown;
    }
  }
  return null;
}

function applyBoardMatrixDirectly(manager: ManagerLike, board: BoardMatrix): boolean {
  const GridCtor = findGridConstructor(manager);
  const TileCtor = findTileConstructor(manager);
  if (!GridCtor || !TileCtor) return false;
  const height = board.length;
  const width = board[0]?.length || 0;
  if (!width || !height) return false;
  const grid = new GridCtor(width, height);
  const insertTile = asFunction<(tile: unknown) => unknown>(grid.insertTile);
  if (!insertTile) return false;
  const isBlockedCell = asFunction<(x: number, y: number) => boolean>(manager.isBlockedCell);
  const isStoneValue = asFunction<(value: number) => boolean>(manager.isStoneValue);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Math.floor(Number(board[y][x]) || 0);
      if (value <= 0) continue;
      if (isBlockedCell && isBlockedCell.call(manager, x, y)) return false;
      const tile = toRecord(new TileCtor({ x, y }, value));
      if (isStoneValue && isStoneValue.call(manager, value)) tile.isStone = true;
      insertTile.call(grid, tile);
    }
  }
  const setRuntimeGrid = asFunction<(grid: unknown) => unknown>(manager.setRuntimeGrid);
  if (setRuntimeGrid) setRuntimeGrid.call(manager, grid);
  else manager.grid = grid;
  return boardMatricesEqual(getFinalBoardMatrix(manager), board);
}

function ensureReplayBoardApplied(manager: ManagerLike, board: unknown): void {
  const normalized = normalizeBoardMatrix(board);
  if (!normalized) return;
  if (boardMatricesEqual(getFinalBoardMatrix(manager), normalized)) return;
  applyBoardMatrixDirectly(manager, normalized);
}

function encodeBase64(input: string, windowLike?: WindowLike): string {
  const btoaLike = asFunction<(value: string) => string>(windowLike?.btoa);
  if (btoaLike) {
    return btoaLike.call(windowLike, input);
  }
  return input;
}

function decodeBase64ToBytes(encoded: string, windowLike: WindowLike): Uint8Array {
  const atobLike = asFunction<(value: string) => string>(windowLike.atob);
  if (atobLike) {
    const binary = atobLike.call(windowLike, encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 255;
    return bytes;
  }
  const BufferLike = (globalThis as unknown as {
    Buffer?: { from: (value: string, encoding: string) => Uint8Array };
  }).Buffer;
  if (BufferLike) return BufferLike.from(encoded, "base64");
  return new Uint8Array(0);
}

function getWindowLikeForManager(manager: ManagerLike): WindowLike {
  const getWindowLike = asFunction<() => unknown>(manager.getWindowLike);
  const resolved = getWindowLike ? getWindowLike.call(manager) : null;
  if (isRecord(resolved)) return resolved;
  return typeof window === "undefined" ? {} : (window as unknown as WindowLike);
}

function resolveGameManagerStatic(manager: ManagerLike): Record<string, unknown> {
  const windowLike = getWindowLikeForManager(manager);
  if (isRecord(windowLike.GameManager)) return windowLike.GameManager;
  const globalLike = globalThis as unknown as WindowLike;
  return isRecord(globalLike.GameManager) ? globalLike.GameManager : {};
}

function resolveReplayV1Base64Prefix(manager: ManagerLike): string {
  const gameManagerStatic = resolveGameManagerStatic(manager);
  return String(gameManagerStatic.REPLAY_V1_RPL_BASE64_PREFIX || REPLAY_V1_RPL_BASE64_PREFIX);
}

function bytesToBinaryString(bytes: Uint8Array): string {
  let out = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    out += String.fromCharCode(...chunk);
  }
  return out;
}

function encodeBytesToBase64(manager: ManagerLike, bytes: Uint8Array): string {
  const windowLike = getWindowLikeForManager(manager);
  const btoaLike = asFunction<(value: string) => string>(windowLike.btoa);
  if (btoaLike) return btoaLike.call(windowLike, bytesToBinaryString(bytes));
  const BufferLike = (globalThis as unknown as {
    Buffer?: { from: (value: Uint8Array) => { toString: (encoding: string) => string } };
  }).Buffer;
  if (BufferLike) return BufferLike.from(bytes).toString("base64");
  return encodeBase64(bytesToBinaryString(bytes), windowLike);
}

function encodeReplayV1Utf8Text(text: unknown): Uint8Array {
  const sourceText = typeof text === "string" ? text : String(text == null ? "" : text);
  if (!sourceText) return new Uint8Array(0);
  if (typeof TextEncoder === "function") {
    return new TextEncoder().encode(sourceText);
  }
  const escaped = unescape(encodeURIComponent(sourceText));
  const bytes = new Uint8Array(escaped.length);
  for (let i = 0; i < escaped.length; i += 1) bytes[i] = escaped.charCodeAt(i) & 255;
  return bytes;
}

function normalizeReplayV1SerializedStartUnixMs(rawStartUnixMs: unknown): number | null {
  const parsed = Math.floor(Number(rawStartUnixMs));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (parsed <= 4_294_967_295) return parsed;
  const seconds = Math.floor(parsed / 1000);
  if (Number.isFinite(seconds) && seconds > 0 && seconds <= 4_294_967_295) {
    return seconds;
  }
  return null;
}

function appendReplayV1ExtRecord(records: ReplayV1Record[], extType: number, rawValue: unknown): void {
  const normalized = typeof rawValue === "string" ? rawValue.trim().toLowerCase() : "";
  if (!normalized) return;
  records.push({
    kind: "ext",
    extType,
    payload: encodeReplayV1Utf8Text(normalized)
  });
}

function createReplayV1ExtRecords(session: Record<string, unknown>): ReplayV1Record[] {
  const records: ReplayV1Record[] = [];
  appendReplayV1ExtRecord(records, REPLAY_V1_EXT_MODE_KEY, session.mode_key);
  const ruleset = typeof session.ruleset === "string" ? session.ruleset.trim().toLowerCase() : "";
  if (ruleset === "pow2" || ruleset === "fibonacci") {
    appendReplayV1ExtRecord(records, REPLAY_V1_EXT_RULESET, ruleset);
  }
  appendReplayV1ExtRecord(records, REPLAY_V1_EXT_CHALLENGE_ID, session.challenge_id);
  const seedValue = Math.floor(Number(session.seed));
  if (Number.isInteger(seedValue) && seedValue >= 0) {
    appendReplayV1ExtRecord(records, REPLAY_V1_EXT_SEED, String(seedValue));
  }
  return records;
}

function resolveReplayV1SessionForSerialize(manager: ManagerLike): Record<string, unknown> | null {
  const session = manager && manager.sessionReplayV1;
  if (!isRecord(session)) return null;
  if (!Array.isArray(session.init_tiles) || !Array.isArray(session.records)) return null;
  if (!Number.isInteger(session.board_width) || !Number.isInteger(session.board_height)) return null;
  return session;
}

function shouldSerializeReplayAsV1(manager: ManagerLike, session: Record<string, unknown> | null): boolean {
  if (!manager || !session || session.supported !== true) return false;
  if (manager.modeKey === "practice") return false;
  return session.board_width === manager.width && session.board_height === manager.height;
}

function createReplayV1SerializeInput(session: Record<string, unknown>): ReplayV1EncodeInput {
  const records = createReplayV1ExtRecords(session).concat(
    (session.records as ReplayV1Record[]).slice()
  );
  return {
    width: Number(session.board_width),
    height: Number(session.board_height),
    initTiles: (session.init_tiles as ReplayV1EncodeInput["initTiles"]).slice(),
    records,
    startUnixMs: normalizeReplayV1SerializedStartUnixMs(session.start_unix_ms)
  };
}

export function serializeReplayAsV1RplBase64(manager: ManagerLike): string {
  const session = resolveReplayV1SessionForSerialize(manager);
  if (!session || !shouldSerializeReplayAsV1(manager, session)) throw "Replay v1 codec unavailable";
  const bytes = encodeReplayV1Rpl(createReplayV1SerializeInput(session));
  return `${resolveReplayV1Base64Prefix(manager)}${encodeBytesToBase64(manager, bytes)}`;
}

function decodeReplayV1ExtTextPayload(payload: unknown): string {
  if (!payload) return "";
  const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload as ArrayLike<number>);
  if (!bytes.length) return "";
  if (typeof TextDecoder === "function") {
    try {
      return new TextDecoder("utf-8").decode(bytes);
    } catch (_error) {
      return "";
    }
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] & 255);
  try {
    return decodeURIComponent(escape(binary));
  } catch (_error) {
    return binary;
  }
}

function resolveReplayModeKeyFromDecoded(manager: ManagerLike, decoded: Record<string, unknown>): string {
  const records = Array.isArray(decoded.records) ? decoded.records : [];
  for (let i = 0; i < records.length; i += 1) {
    const record = toRecord(records[i]);
    if (Number(record.extType) !== REPLAY_V1_EXT_MODE_KEY) continue;
    const modeKey = decodeReplayV1ExtTextPayload(record.payload).trim();
    if (!modeKey) break;
    const resolveModeConfig = asFunction<(modeKey: string) => unknown>(manager.resolveModeConfig);
    if (!resolveModeConfig || resolveModeConfig.call(manager, modeKey)) return modeKey;
  }
  const width = Number(decoded.width);
  const height = Number(decoded.height);
  if (width === 3 && height === 3) return "board_3x3_pow2_no_undo";
  if (width === 4 && height === 3) return "board_3x4_pow2_no_undo";
  if (width === 4 && height === 2) return "board_2x4_pow2_no_undo";
  if (width === 4 && height === 4) return "standard_4x4_pow2_no_undo";
  return String(manager.modeKey || manager.mode || "standard_4x4_pow2_no_undo");
}

function resolveReplayRulesetFromDecoded(manager: ManagerLike, decoded: Record<string, unknown>): "pow2" | "fibonacci" {
  const records = Array.isArray(decoded.records) ? decoded.records : [];
  for (let i = 0; i < records.length; i += 1) {
    const record = toRecord(records[i]);
    if (Number(record.extType) !== REPLAY_V1_EXT_RULESET) continue;
    const ruleset = decodeReplayV1ExtTextPayload(record.payload).trim().toLowerCase();
    if (ruleset === "fibonacci" || ruleset === "pow2") return ruleset;
  }
  const resolveModeConfig = asFunction<(modeKey: string) => unknown>(manager.resolveModeConfig);
  const config = resolveModeConfig ? resolveModeConfig.call(manager, String(manager.modeKey || manager.mode || "")) : null;
  return String(toRecord(config).ruleset || "").toLowerCase() === "fibonacci" ? "fibonacci" : "pow2";
}

function callManagerMethod<T>(manager: ManagerLike, methodName: string, args: unknown[]): T | null {
  const method = asFunction<(...callArgs: unknown[]) => T>(manager[methodName]);
  if (!method) return null;
  return method.apply(manager, args);
}

function applyStructuredReplaySession(
  manager: ManagerLike,
  envelope: Record<string, unknown>,
  replayModeConfig: unknown
): boolean {
  const replayMoves = Array.isArray(envelope.replayMoves) ? envelope.replayMoves : [];
  const actions = Array.isArray(envelope.actions) ? envelope.actions.slice() : replayMoves.slice();
  const spawns = Array.isArray(envelope.replaySpawns) ? envelope.replaySpawns.slice() : [];
  const initialBoard = cloneJsonSafe(envelope.initialBoard) || envelope.initialBoard || null;
  let applied = false;

  if (envelope.kind === "v3-json") {
    const seed = Number(envelope.seed);
    if (Number.isFinite(seed)) {
      const restartWithSeed = asFunction<(seed: unknown, modeConfig: unknown) => unknown>(
        manager.restartWithSeed
      );
      if (restartWithSeed) restartWithSeed.call(manager, seed, replayModeConfig);
    }
    applied = true;
  }

  if (envelope.kind === "v1rpl" || envelope.kind === "v9rpl") {
    const restartWithBoard = asFunction<(board: unknown, modeConfig: unknown, options?: unknown) => unknown>(
      manager.restartWithBoard
    );
    if (restartWithBoard) {
      restartWithBoard.call(manager, envelope.initialBoard, replayModeConfig, { asReplay: true });
      ensureReplayBoardApplied(manager, envelope.initialBoard);
    }
    applied = true;
  }

  if (!applied) return false;
  manager.score = 0;
  manager.successfulMoveCount = 0;
  manager.moveHistory = [];
  manager.replayMoves = actions;
  manager.replaySpawns = spawns;
  manager.replayIndex = 0;
  manager.replayMode = true;
  manager.replayPaused = false;
  manager.replayRunning = false;
  manager.isPaused = true;
  manager.replayDelay = 200;
  if (initialBoard) {
    manager.replayStartBoardMatrix = initialBoard;
    manager.initialBoardMatrix = cloneJsonSafe(initialBoard) || initialBoard;
  }
  manager.replaySeekCheckpointHistory = Array.isArray(envelope.replaySeekCheckpoints)
    ? envelope.replaySeekCheckpoints
    : [];
  manager.replayStateHistory = [];
  return true;
}

function parseStructuredReplayJson(manager: ManagerLike, text: string): Record<string, unknown> | null {
  if (!text) return null;
  const first = text.charAt(0);
  if (first !== "{" && first !== "[") return null;
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) {
    return {
      kind: "v3-json",
      modeKey: String(manager.modeKey || manager.mode || "standard_4x4_pow2_no_undo"),
      actions: parsed.slice(),
      seed: null
    };
  }
  if (isRecord(parsed) && Array.isArray(parsed.actions)) {
    return {
      kind: "v3-json",
      modeKey: String(parsed.mode_key || manager.modeKey || manager.mode || "standard_4x4_pow2_no_undo"),
      actions: parsed.actions.slice(),
      seed: parsed.seed ?? null
    };
  }
  return null;
}

function decodeLegacyVrsToken(chunk: string, chunkIndex: number): number {
  if (chunk.length !== 3) throw `Invalid VRS token length at index ${String(chunkIndex)}`;
  const value0 = LEGACY_VRS_NEW_CHARSET.indexOf(chunk.charAt(0));
  const value1 = LEGACY_VRS_NEW_CHARSET.indexOf(chunk.charAt(1));
  const value2 = LEGACY_VRS_NEW_CHARSET.indexOf(chunk.charAt(2));
  if (value0 < 0 || value1 < 0 || value2 < 0) {
    throw `Invalid VRS token at index ${String(chunkIndex)}`;
  }
  return (value0 << 14) + (value1 << 7) + value2;
}

function decodeLegacyVrsStep(binary: number): { move: number; spawn: { x: number; y: number; value: number } } {
  const moveMap = [0, 2, 3, 1];
  const valueBit = (binary >> 2) & 3;
  if (valueBit !== 0 && valueBit !== 1) throw "Invalid VRS spawn value";
  return {
    move: moveMap[binary & 3],
    spawn: {
      x: (binary >> 4) & 7,
      y: (binary >> 7) & 7,
      value: valueBit === 1 ? 4 : 2
    }
  };
}

function applyLegacyVrsStartupSpawn(board: number[][], spawn: { x: number; y: number; value: number }): void {
  if (!Array.isArray(board[spawn.y]) || board[spawn.y][spawn.x] !== 0) {
    throw "Invalid VRS startup collision";
  }
  board[spawn.y][spawn.x] = spawn.value;
}

function parseLegacyVrsText(manager: ManagerLike, text: string): Record<string, unknown> | null {
  const match = /^(\d+x\d+)-[^_]*_(.*)$/.exec(text);
  if (!match) return null;
  const variant = LEGACY_VRS_VARIANTS[match[1] as keyof typeof LEGACY_VRS_VARIANTS];
  if (!variant) return null;
  const movesText = match[2] || "";
  if (movesText.length < 6) throw "Invalid VRS replay payload";
  const initialBoard = Array.from({ length: variant.height }, () => Array.from({ length: variant.width }, () => 0));
  const replayMoves = [];
  const replaySpawns = [];
  let tokenCount = 0;
  for (let index = 0; index < movesText.length; index += 3) {
    const chunk = movesText.slice(index, index + 3);
    if (chunk.length < 3) break;
    const step = decodeLegacyVrsStep(decodeLegacyVrsToken(chunk, tokenCount));
    if (step.spawn.x >= variant.width || step.spawn.y >= variant.height) throw "Invalid VRS spawn coordinates";
    if (tokenCount < 2) applyLegacyVrsStartupSpawn(initialBoard, step.spawn);
    else {
      replayMoves.push(step.move);
      replaySpawns.push(step.spawn);
    }
    tokenCount += 1;
  }
  if (tokenCount < 2) throw "Invalid VRS replay payload";
  const resolveModeConfig = asFunction<(modeKey: string) => unknown>(manager.resolveModeConfig);
  const modeKey = !resolveModeConfig || resolveModeConfig.call(manager, variant.modeKey)
    ? variant.modeKey
    : String(manager.modeKey || manager.mode || variant.modeKey);
  return { kind: "v9rpl", modeKey, initialBoard, replayMoves, replaySpawns };
}

function createCharMap(chars: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (let index = 0; index < chars.length; index += 1) map[chars.charAt(index)] = index;
  return map;
}

function hasOwnChar(map: Record<string, number>, char: string): boolean {
  return Object.prototype.hasOwnProperty.call(map, char);
}

function isAsciiVerseChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 32 && code <= 126;
}

function decodeUtf8BytesAsGb18030(text: string, decoder: TextDecoder): string {
  if (!text || typeof TextEncoder !== "function") return "";
  try {
    const decoded = decoder.decode(new TextEncoder().encode(text));
    if (!decoded || decoded.includes("\ufffd")) return "";
    return decoded;
  } catch (_error) {
    return "";
  }
}

function repairPriority(sourceText: string, currentMap: Record<string, number>): number {
  let score = 0;
  for (let index = 0; index < sourceText.length; index += 1) {
    const char = sourceText.charAt(index);
    if (hasOwnChar(currentMap, char)) score += 2;
    else if (isAsciiVerseChar(char)) score += 1;
  }
  return score;
}

function putRepairEntry(
  map: Record<string, { value: string; priority: number } | null>,
  brokenText: string,
  sourceText: string,
  currentMap: Record<string, number>
): void {
  if (!brokenText || !sourceText || brokenText === sourceText || brokenText.includes("\ufffd")) return;
  const priority = repairPriority(sourceText, currentMap);
  const existing = map[brokenText];
  if (!existing || priority > existing.priority) {
    map[brokenText] = { value: sourceText, priority };
    return;
  }
  if (priority === existing.priority && existing.value !== sourceText) map[brokenText] = null;
}

function buildV9VerseRepairRuntime(): { map: Record<string, string>; maxKeyLength: number } {
  if (v9VerseRepairRuntime) return v9VerseRepairRuntime;
  let decoder: TextDecoder | null = null;
  try {
    decoder = new TextDecoder("gb18030");
  } catch (_error) {
    try {
      decoder = new TextDecoder("gbk");
    } catch (_fallbackError) {}
  }
  if (!decoder) {
    v9VerseRepairRuntime = { map: {}, maxKeyLength: 0 };
    return v9VerseRepairRuntime;
  }
  const currentMap = createCharMap(V9_VERSE_PNG_CHARSET);
  const sourceChars = Array.from(new Set((V9_VERSE_PNG_CHARSET + V9_VERSE_PNG_CHARSET_LEGACY).split("")));
  const entries: Record<string, { value: string; priority: number } | null> = {};
  for (const first of sourceChars) {
    for (const second of sourceChars) {
      if (isAsciiVerseChar(first) && isAsciiVerseChar(second)) continue;
      const source = first + second;
      const oneStep = decodeUtf8BytesAsGb18030(source, decoder);
      putRepairEntry(entries, oneStep, source, currentMap);
      putRepairEntry(entries, decodeUtf8BytesAsGb18030(oneStep, decoder), source, currentMap);
    }
  }
  const map: Record<string, string> = {};
  let maxKeyLength = 0;
  for (const key of Object.keys(entries)) {
    const entry = entries[key];
    if (!entry) continue;
    map[key] = entry.value;
    if (key.length > maxKeyLength) maxKeyLength = key.length;
  }
  v9VerseRepairRuntime = { map, maxKeyLength };
  return v9VerseRepairRuntime;
}

function hasUnsupportedV9VerseChars(
  body: string,
  currentMap: Record<string, number>,
  legacyMap: Record<string, number>
): boolean {
  for (let index = 0; index < body.length; index += 1) {
    const char = body.charAt(index);
    if (hasOwnChar(currentMap, char) || hasOwnChar(legacyMap, char)) continue;
    return true;
  }
  return false;
}

function repairV9VerseBody(body: string): string {
  const currentMap = createCharMap(V9_VERSE_PNG_CHARSET);
  const legacyMap = createCharMap(V9_VERSE_PNG_CHARSET_LEGACY);
  if (!hasUnsupportedV9VerseChars(body, currentMap, legacyMap)) return body;
  const runtime = buildV9VerseRepairRuntime();
  if (!runtime.maxKeyLength) return body;
  let nextBody = body;
  for (let pass = 0; pass < 2; pass += 1) {
    let repaired = "";
    let changed = false;
    for (let index = 0; index < nextBody.length;) {
      let matchedKey = "";
      let replacement = "";
      let length = Math.min(runtime.maxKeyLength, nextBody.length - index);
      while (length > 1) {
        const slice = nextBody.slice(index, index + length);
        if (Object.prototype.hasOwnProperty.call(runtime.map, slice)) {
          matchedKey = slice;
          replacement = runtime.map[slice];
          break;
        }
        length -= 1;
      }
      if (!matchedKey) {
        repaired += nextBody.charAt(index);
        index += 1;
      } else {
        repaired += replacement;
        index += matchedKey.length;
        changed = true;
      }
    }
    nextBody = repaired;
    if (!changed || !hasUnsupportedV9VerseChars(nextBody, currentMap, legacyMap)) break;
  }
  return nextBody;
}

function resolveV9VerseMapForBody(body: string): Record<string, number> {
  const currentMap = createCharMap(V9_VERSE_PNG_CHARSET);
  const legacyMap = createCharMap(V9_VERSE_PNG_CHARSET_LEGACY);
  let hasCurrentSpecial = false;
  let hasLegacySpecial = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body.charAt(index);
    if (isAsciiVerseChar(char)) continue;
    if (hasOwnChar(currentMap, char)) hasCurrentSpecial = true;
    if (hasOwnChar(legacyMap, char)) hasLegacySpecial = true;
  }
  return hasLegacySpecial && !hasCurrentSpecial ? legacyMap : currentMap;
}

function createEmptyV9Board(): BoardMatrix {
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
}

function decodeV9VerseToken(map: Record<string, number>, body: string, index: number): number {
  const char = body.charAt(index);
  if (!hasOwnChar(map, char)) throw `Invalid replay char at index ${String(index)}`;
  return Number(map[char]);
}

function decodeV9VerseSpawn(token: number): ReplaySpawn {
  const spawnPos = ((token & 3) << 2) + ((token & 15) >> 2);
  return {
    x: spawnPos % 4,
    y: Math.floor(spawnPos / 4),
    value: (((token >> 4) & 1) + 1) === 2 ? 4 : 2
  };
}

function applyV9Spawn(board: BoardMatrix, spawn: ReplaySpawn): void {
  if (!Array.isArray(board[spawn.y]) || board[spawn.y][spawn.x] !== 0) {
    throw "Invalid replay spawn collision";
  }
  board[spawn.y][spawn.x] = spawn.value;
}

function mergeV9Line(line: number[]): number[] {
  const compact = line.filter((value) => value > 0);
  const merged: number[] = [];
  for (let index = 0; index < compact.length; index += 1) {
    if (index + 1 < compact.length && compact[index] === compact[index + 1]) {
      merged.push(compact[index] * 2);
      index += 1;
    } else {
      merged.push(compact[index]);
    }
  }
  while (merged.length < 4) merged.push(0);
  return merged;
}

function applyV9Move(board: BoardMatrix, v9Move: number): BoardMatrix {
  const next = cloneBoardMatrix(board);
  if (v9Move === 0 || v9Move === 1) {
    for (let y = 0; y < 4; y += 1) {
      const source = v9Move === 0 ? board[y].slice() : board[y].slice().reverse();
      const row = mergeV9Line(source);
      if (v9Move === 1) row.reverse();
      next[y] = row;
    }
    return next;
  }
  for (let x = 0; x < 4; x += 1) {
    const source = [board[0][x], board[1][x], board[2][x], board[3][x]];
    if (v9Move === 3) source.reverse();
    const column = mergeV9Line(source);
    if (v9Move === 3) column.reverse();
    for (let y = 0; y < 4; y += 1) next[y][x] = column[y];
  }
  return next;
}

function parseV9VerseText(text: string): Record<string, unknown> | null {
  const prefix = "replay_";
  if (text.slice(0, prefix.length).toLowerCase() !== prefix) return null;
  let body = repairV9VerseBody(text.slice(prefix.length));
  if (body.length < 2) throw "Invalid replay payload";
  const map = resolveV9VerseMapForBody(body);
  const initialBoard = createEmptyV9Board();
  applyV9Spawn(initialBoard, decodeV9VerseSpawn(decodeV9VerseToken(map, body, 0)));
  applyV9Spawn(initialBoard, decodeV9VerseSpawn(decodeV9VerseToken(map, body, 1)));
  let currentBoard = cloneBoardMatrix(initialBoard);
  const replayMoves: number[] = [];
  const replaySpawns: ReplaySpawn[] = [];
  const checkpoints: ReplayCheckpoint[] = [{ index: 0, board: cloneBoardMatrix(initialBoard) }];
  const moveChunkToV9Move = [2, 1, 3, 0];
  for (let index = 2; index < body.length; index += 1) {
    const token = decodeV9VerseToken(map, body, index);
    const v9Move = moveChunkToV9Move[(token >> 5) & 3];
    const internalDirection = v9Move === 0 ? 3 : v9Move === 1 ? 1 : v9Move === 2 ? 0 : 2;
    const spawn = decodeV9VerseSpawn(token);
    currentBoard = applyV9Move(currentBoard, v9Move);
    applyV9Spawn(currentBoard, spawn);
    replayMoves.push(internalDirection);
    replaySpawns.push(spawn);
    if (replayMoves.length % REPLAY_SEEK_CHECKPOINT_INTERVAL === 0) {
      checkpoints.push({ index: replayMoves.length, board: cloneBoardMatrix(currentBoard) });
    }
  }
  return {
    kind: "v9rpl",
    modeKey: "standard_4x4_pow2_no_undo",
    initialBoard,
    replayMoves,
    replaySpawns,
    replaySeekCheckpoints: checkpoints
  };
}

function parseReplayImportEnvelope(manager: ManagerLike, text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const prefix = resolveReplayV1Base64Prefix(manager);
  if (trimmed.indexOf(prefix) === 0) {
    const decoded = decodeReplayV1Rpl(decodeBase64ToBytes(trimmed.slice(prefix.length), getWindowLikeForManager(manager)));
    const modeKey = resolveReplayModeKeyFromDecoded(manager, decoded as unknown as Record<string, unknown>);
    const ruleset = resolveReplayRulesetFromDecoded(manager, decoded as unknown as Record<string, unknown>);
    const initialBoard = replayV1InitTilesToBoard(decoded.width, decoded.height, decoded.initTiles || [], ruleset);
    const actions = replayV1RecordsToReplayActions(decoded.records || [], decoded.width, ruleset);
    return {
      kind: "v1rpl",
      modeKey,
      initialBoard,
      replayMoves: actions.replayMoves,
      replaySpawns: actions.replaySpawns
    };
  }
  const legacyVrs = parseLegacyVrsText(manager, trimmed);
  if (legacyVrs) return legacyVrs;
  const legacyVerse = parseV9VerseText(trimmed);
  if (legacyVerse) return legacyVerse;
  return parseStructuredReplayJson(manager, trimmed);
}

export function getFinalBoardMatrix(manager: ManagerLike): unknown[][] {
  const grid = toRecord(manager.grid);
  const width = Math.max(0, Math.floor(Number(manager.width || grid.size || 4)));
  const height = Math.max(0, Math.floor(Number(manager.height || grid.size || width || 4)));
  const matrix = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
  const eachCell = asFunction<(callback: (x: number, y: number, tile: unknown) => void) => unknown>(
    grid.eachCell
  );
  if (eachCell) {
    eachCell.call(grid, (x: number, y: number, tile: unknown) => {
      if (y < 0 || y >= height || x < 0 || x >= width) return;
      matrix[y][x] = Number(toRecord(tile).value || 0);
    });
    return matrix;
  }
  const cells = Array.isArray(grid.cells) ? grid.cells : [];
  for (let y = 0; y < Math.min(height, cells.length); y += 1) {
    const row = Array.isArray(cells[y]) ? cells[y] : [];
    for (let x = 0; x < Math.min(width, row.length); x += 1) {
      matrix[y][x] = Number(toRecord(row[x]).value || row[x] || 0);
    }
  }
  return matrix;
}

export function encodeReplay128(_manager: ManagerLike, code: unknown): string {
  return encodeReplay128Core(Number(code));
}

export function decodeReplay128(_manager: ManagerLike, char: unknown): number {
  return decodeReplay128Core(String(char || ""));
}

export function appendCompactMoveCode(manager: ManagerLike, rawCode: unknown): void {
  if (!manager) return;
  manager.replayCompactLog = appendCompactMoveCodeCore({
    log: manager.replayCompactLog,
    rawCode
  });
}

export function appendCompactUndo(manager: ManagerLike): void {
  if (!manager) return;
  manager.replayCompactLog = appendCompactUndoCore(manager.replayCompactLog);
}

export function appendCompactPracticeAction(
  manager: ManagerLike,
  x: unknown,
  y: unknown,
  value: unknown
): void {
  if (!manager) return;
  manager.replayCompactLog = appendCompactPracticeActionCore({
    log: manager.replayCompactLog,
    width: manager.width,
    height: manager.height,
    x,
    y,
    value
  });
}

export function recordSpawnValue(manager: ManagerLike, value: unknown): void {
  if (!manager) return;
  const numericValue = Number(value);
  const key = String(Number.isFinite(numericValue) ? numericValue : value);
  const counts = toRecord(manager.spawnValueCounts);
  counts[key] = Number(counts[key] || 0) + 1;
  manager.spawnValueCounts = counts;
  manager.spawnTwos = Number(counts["2"] || 0);
  manager.spawnFours = Number(counts["4"] || 0);
  refreshSpawnRateDisplay(manager);
}

export function computePostMoveRecord(manager: ManagerLike, direction: unknown): unknown {
  const isFibonacciMode = asFunction<() => unknown>(manager.isFibonacciMode);
  return computePostMoveRecordCore({
    replayMode: !!manager.replayMode,
    direction: Number(direction),
    lastSpawn: manager.lastSpawn as never,
    width: Number(manager.width),
    height: Number(manager.height),
    isFibonacciMode: !!(isFibonacciMode && isFibonacciMode.call(manager)),
    hasSessionReplayV3: !!manager.sessionReplayV3
  });
}

export function recordSessionReplayV1Move(
  manager: ManagerLike,
  direction: unknown,
  spawn: unknown
): void {
  const session = toRecord(manager.sessionReplayV1);
  if (!session) return;
  const records = Array.isArray(session.records) ? session.records : [];
  session.records = records;
  const spawnRecord = toRecord(spawn);
  records.push({
    kind: "move",
    dir: Number(direction),
    spawnIndex:
      Number(spawnRecord.x || 0) + Number(spawnRecord.y || 0) * Math.max(1, Number(manager.width || 4)),
    spawnValueBit: Number(spawnRecord.value) === 4 ? 1 : 0,
    deltaMs: 0
  });
}

export function refreshSpawnRateDisplay(manager: ManagerLike): void {
  if (!manager) return;
  const getActualSecondaryRate = asFunction<() => unknown>(manager.getActualSecondaryRate);
  const text = getActualSecondaryRate ? String(getActualSecondaryRate.call(manager)) : "";
  const documentLike = toRecord(
    manager.resolveManagerDocumentLike
      ? asFunction<() => unknown>(manager.resolveManagerDocumentLike)?.call(manager)
      : toRecord(manager.getWindowLike ? asFunction<() => unknown>(manager.getWindowLike)?.call(manager) : null)
          .document
  );
  const getElementById = asFunction<(id: string) => unknown>(documentLike.getElementById);
  const rateEl = toRecord(getElementById ? getElementById.call(documentLike, "stats-4-rate") : null);
  if (rateEl && text) rateEl.textContent = text;
  const cornerRateEl = toRecord(manager.cornerRateEl);
  if (cornerRateEl && text) cornerRateEl.textContent = text;
}

export function detectMode(manager: ManagerLike): string {
  const defaultMode = String(toRecord(manager.constructor).DEFAULT_MODE_KEY || "standard_4x4_pow2_no_undo");
  const documentLike = toRecord(
    manager.resolveManagerDocumentLike
      ? asFunction<() => unknown>(manager.resolveManagerDocumentLike)?.call(manager)
      : toRecord(manager.getWindowLike ? asFunction<() => unknown>(manager.getWindowLike)?.call(manager) : null)
          .document
  );
  const body = toRecord(documentLike.body);
  const dataset = toRecord(body.dataset);
  const bodyMode = String(dataset.modeId || body.getAttribute && asFunction<(name: string) => unknown>(body.getAttribute)?.call(body, "data-mode-id") || "");
  const windowLike = toRecord(manager.getWindowLike ? asFunction<() => unknown>(manager.getWindowLike)?.call(manager) : null);
  const pathname = String(toRecord(windowLike.location).pathname || "");
  const coreModeRuntime = toRecord(windowLike.CoreModeRuntime);
  const resolveDetectedMode = asFunction<(input: unknown) => unknown>(coreModeRuntime.resolveDetectedMode);
  if (resolveDetectedMode) {
    const resolved = String(
      resolveDetectedMode.call(coreModeRuntime, {
        existingMode: manager.mode,
        bodyMode,
        pathname
      }) || ""
    );
    if (resolved) return resolved;
  }
  if (typeof manager.mode === "string" && manager.mode) return manager.mode;
  if (bodyMode) return bodyMode;
  if (pathname.includes("capped_2048")) return "capped_4x4_pow2_no_undo";
  if (pathname.includes("Practice_board")) return "practice";
  if (pathname.includes("2048.html") || pathname === "/" || /\/$/.test(pathname)) {
    return "standard_4x4_pow2_no_undo";
  }
  return defaultMode;
}

export function keepPlaying(manager: ManagerLike): void {
  if (!manager) return;
  manager.keepPlaying = true;
  const actuator = toRecord(manager.actuator);
  const continueGame = asFunction<() => unknown>(actuator.continue);
  if (continueGame) continueGame.call(actuator);
}

export function clearTransientTileVisualState(manager: ManagerLike): void {
  const grid = toRecord(manager.grid);
  const eachCell = asFunction<(callback: (x: number, y: number, tile: unknown) => void) => unknown>(
    grid.eachCell
  );
  if (!eachCell) return;
  eachCell.call(grid, (_x: number, _y: number, tile: unknown) => {
    const tileRecord = toRecord(tile);
    if (!tileRecord) return;
    tileRecord.previousPosition = null;
    tileRecord.mergedFrom = null;
  });
}

function syncPracticeRestartBoardSnapshot(manager: ManagerLike): void {
  if (!manager || manager.modeKey !== "practice" || manager.hasGameStarted) return;
  const boardMatrix = getFinalBoardMatrix(manager);
  const clonedBoard = cloneJsonSafe(boardMatrix);
  manager.initialBoardMatrix = cloneJsonSafe(boardMatrix) || boardMatrix;
  manager.replayStartBoardMatrix = cloneJsonSafe(boardMatrix) || boardMatrix;
  manager.practiceRestartBoardMatrix = cloneJsonSafe(boardMatrix) || boardMatrix;
  manager.practiceRestartModeConfig = cloneJsonSafe(manager.modeConfig) || manager.modeConfig || null;
  if (clonedBoard) {
    manager.practiceRestartBoardMatrix = clonedBoard;
  }
}

export function isSessionTerminated(manager: ManagerLike): boolean {
  return isTerminalSessionForPersistence(manager);
}

function shouldAutoSubmitCompletedWinState(manager: ManagerLike): boolean {
  if (!manager || manager.over || !manager.won || manager.keepPlaying) return false;
  const modeConfig = toRecord(manager.modeConfig);
  const maxTile = Math.floor(Number(modeConfig.max_tile));
  if (Number.isInteger(maxTile) && maxTile > 0) return true;
  const specialRules = isRecord(modeConfig.special_rules)
    ? modeConfig.special_rules
    : toRecord(manager.specialRules);
  return specialRules.enforce_max_tile === true;
}

export function isTerminalSessionForPersistence(manager: ManagerLike): boolean {
  if (!manager || manager.replayMode) return false;
  return !!manager.over || shouldAutoSubmitCompletedWinState(manager);
}

function resolveTerminalSessionEndReason(manager: ManagerLike): string {
  if (!isTerminalSessionForPersistence(manager)) return "";
  return manager.over ? "game_over" : "win_stop";
}

function resolveReplayModeTag(modeKey: unknown, fallbackMode: unknown): string {
  const key = typeof modeKey === "string" && modeKey ? modeKey : typeof fallbackMode === "string" ? fallbackMode : "";
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
}

function resolveReplayV3Seed(manager: ManagerLike, source: Record<string, unknown>): unknown {
  if (source.seed != null) return source.seed;
  if (manager.initialSeed != null) return manager.initialSeed;
  return manager.seed;
}

function resolveReplayV3Actions(source: Record<string, unknown>): unknown[] {
  if (!Array.isArray(source.actions)) return [];
  return (cloneJsonSafe(source.actions) as unknown[] | null) || source.actions.slice();
}

export function serializeReplay(manager: ManagerLike): string {
  const rescueReplay = String(manager.rescueReplayString || "").trim();
  if (rescueReplay) return rescueReplay;
  const session = resolveReplayV1SessionForSerialize(manager);
  if (shouldSerializeReplayAsV1(manager, session)) {
    return serializeReplayAsV1RplBase64(manager);
  }
  const windowLike = toRecord(manager.getWindowLike ? asFunction<() => unknown>(manager.getWindowLike)?.call(manager) : null);
  const payload = {
    v: 1,
    mode_key: manager.modeKey || manager.mode,
    board_width: manager.width,
    board_height: manager.height,
    score: manager.score,
    seed: manager.seed || manager.initialSeed,
    successful_move_count: manager.successfulMoveCount,
    board: getFinalBoardMatrix(manager),
    actions: cloneJsonSafe(toRecord(manager.sessionReplayV3).actions) || []
  };
  return `${REPLAY_V1_RPL_BASE64_PREFIX}${encodeBase64(JSON.stringify(payload), windowLike)}`;
}

export function serializeReplayV3(manager: ManagerLike): Record<string, unknown> {
  const source = toRecord(manager.sessionReplayV3);
  const modeKey = source.mode_key || manager.modeKey || manager.mode;
  const modeConfig = toRecord(manager.modeConfig);
  return {
    v: 3,
    mode: source.mode || resolveReplayModeTag(modeKey, manager.mode),
    mode_key: modeKey,
    board_width: source.board_width || manager.width,
    board_height: source.board_height || manager.height,
    ruleset: source.ruleset || manager.ruleset,
    undo_enabled: typeof source.undo_enabled === "boolean" ? source.undo_enabled : !!modeConfig.undo_enabled,
    mode_family: source.mode_family || manager.modeFamily,
    rank_policy: source.rank_policy || manager.rankPolicy,
    special_rules_snapshot: cloneJsonSafe(source.special_rules_snapshot || manager.specialRules || {}) || {},
    challenge_id: source.challenge_id || manager.challengeId || null,
    seed: resolveReplayV3Seed(manager, source),
    actions: resolveReplayV3Actions(source)
  };
}

export function serializeReplayAsV9Verse(manager: ManagerLike): string {
  return serializeReplay(manager);
}

export function serializeReplayAsV9RplBase64(manager: ManagerLike): string {
  return serializeReplay(manager);
}

export function exportReplayAsV9VerseBlob(manager: ManagerLike): unknown {
  const replay = serializeReplayAsV9Verse(manager);
  const windowLike = toRecord(manager.getWindowLike ? asFunction<() => unknown>(manager.getWindowLike)?.call(manager) : null);
  const BlobLike =
    typeof windowLike.Blob === "function"
      ? (windowLike.Blob as new (parts: unknown[], options?: unknown) => unknown)
      : null;
  return BlobLike ? new BlobLike([replay], { type: "text/plain" }) : replay;
}

export function insertCustomTile(manager: ManagerLike, x: unknown, y: unknown, value: unknown): boolean {
  const grid = toRecord(manager.grid);
  const position = { x: Number(x), y: Number(y) };
  const numericValue = Number(value);
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isInteger(numericValue) || numericValue < 0) {
    return false;
  }
  if (asFunction<(x: unknown, y: unknown) => boolean>(manager.isBlockedCell)?.call(manager, x, y)) {
    throw new Error("Blocked cell cannot be edited");
  }
  const modeConfigMaxTile = Math.floor(Number(toRecord(manager.modeConfig).max_tile));
  const managerMaxTile = Math.floor(Number(manager.maxTile));
  const maxTile =
    Number.isFinite(modeConfigMaxTile) && modeConfigMaxTile > 0
      ? modeConfigMaxTile
      : Number.isFinite(managerMaxTile) && managerMaxTile > 0
        ? managerMaxTile
        : null;
  if (maxTile && numericValue > maxTile) return false;
  const windowLike = toRecord(manager.getWindowLike ? asFunction<() => unknown>(manager.getWindowLike)?.call(manager) : null);
  const TileCtor =
    typeof windowLike.Tile === "function"
      ? (windowLike.Tile as new (position: unknown, value: unknown) => unknown)
      : null;
  const insertTile = asFunction<(tile: unknown) => unknown>(grid.insertTile);
  if (!TileCtor || !insertTile) return false;
  const cellContent = asFunction<(cell: unknown) => unknown>(grid.cellContent);
  const removeTile = asFunction<(tile: unknown) => unknown>(grid.removeTile);
  const existing = cellContent ? cellContent.call(grid, position) : null;
  if (existing && removeTile) removeTile.call(grid, existing);
  if (numericValue === 0) {
    syncPracticeRestartBoardSnapshot(manager);
    clearTransientTileVisualState(manager);
    const actuate = asFunction<() => unknown>(manager.actuate);
    if (actuate) actuate.call(manager);
    return true;
  }
  insertTile.call(grid, new TileCtor(position, numericValue));
  syncPracticeRestartBoardSnapshot(manager);
  clearTransientTileVisualState(manager);
  const actuate = asFunction<() => unknown>(manager.actuate);
  if (actuate) actuate.call(manager);
  return true;
}

export function pauseReplay(manager: ManagerLike): void {
  manager.replayPaused = true;
  manager.replayRunning = false;
  manager.isPaused = true;
  if (manager.replayTimer) {
    clearTimeout(manager.replayTimer as ReturnType<typeof setTimeout>);
    manager.replayTimer = null;
  }
}

export function resumeReplay(manager: ManagerLike): void {
  manager.replayPaused = false;
  manager.replayRunning = true;
  manager.isPaused = false;
  queueNativeReplayTick(manager);
}

export function setReplaySpeed(manager: ManagerLike, multiplier: unknown): number {
  const speed = Number(multiplier);
  const normalized = Number.isFinite(speed) && speed > 0 ? speed : 1;
  manager.replaySpeed = normalized;
  return normalized;
}

function findReplayCheckpoint(manager: ManagerLike, target: number): ReplayCheckpoint | null {
  const checkpoints = Array.isArray(manager.replaySeekCheckpointHistory)
    ? manager.replaySeekCheckpointHistory
    : [];
  let best: ReplayCheckpoint | null = null;
  for (const item of checkpoints) {
    const checkpoint = toRecord(item);
    const index = Math.floor(Number(checkpoint.index));
    if (!Number.isInteger(index) || index > target) continue;
    if (!Array.isArray(checkpoint.board)) continue;
    if (!best || index > best.index) {
      best = { index, board: checkpoint.board as BoardMatrix };
    }
  }
  return best;
}

function restartReplayAtBoard(manager: ManagerLike, board: BoardMatrix, replayIndex: number): void {
  const restartWithBoard = asFunction<(board: unknown, modeConfig: unknown, options?: unknown) => unknown>(
    manager.restartWithBoard
  );
  if (restartWithBoard) {
    restartWithBoard.call(manager, cloneBoardMatrix(board), manager.modeConfig || null, { asReplay: true });
    ensureReplayBoardApplied(manager, board);
  }
  manager.replayMode = true;
  manager.replayIndex = replayIndex;
}

function restartReplayForSeek(manager: ManagerLike, target: number): number {
  const checkpoint = findReplayCheckpoint(manager, target);
  if (checkpoint) {
    restartReplayAtBoard(manager, checkpoint.board, checkpoint.index);
    return checkpoint.index;
  }
  if (Array.isArray(manager.replayStartBoardMatrix)) {
    restartReplayAtBoard(manager, manager.replayStartBoardMatrix as BoardMatrix, 0);
    return 0;
  }
  const restartWithSeed = asFunction<(seed: unknown, modeConfig: unknown) => unknown>(manager.restartWithSeed);
  if (restartWithSeed && typeof manager.initialSeed !== "undefined") {
    restartWithSeed.call(manager, manager.initialSeed, manager.modeConfig || null);
  }
  manager.replayMode = true;
  manager.replayIndex = 0;
  return 0;
}

function dispatchReplayAction(manager: ManagerLike, action: unknown): void {
  if (action === -1) {
    callManagerMethod(manager, "move", [-1]);
    return;
  }
  if (Array.isArray(action)) {
    const kind = String(action[0] || "");
    if (kind === "m") {
      callManagerMethod(manager, "move", [action[1]]);
      return;
    }
    if (kind === "u") {
      callManagerMethod(manager, "move", [-1]);
      return;
    }
    if (kind === "p") {
      const insert = asFunction<(x: unknown, y: unknown, value: unknown) => unknown>(manager.insertCustomTile);
      if (insert) insert.call(manager, action[1], action[2], action[3]);
      else insertCustomTile(manager, action[1], action[2], action[3]);
      return;
    }
    throw "Unknown replay action";
  }
  callManagerMethod(manager, "move", [action]);
}

function executeReplayActionAt(manager: ManagerLike, index: number): void {
  const moves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
  if (index < 0 || index >= moves.length) return;
  const action = moves[index];
  if (Array.isArray(manager.replaySpawns) && !Array.isArray(action)) {
    manager.forcedSpawn = manager.replaySpawns[index];
  }
  dispatchReplayAction(manager, action);
  manager.replayIndex = index + 1;
}

function queueNativeReplayTick(manager: ManagerLike): void {
  if (manager.replayTimer) clearTimeout(manager.replayTimer as ReturnType<typeof setTimeout>);
  const delay = Math.max(1, Math.floor(Number(manager.replayDelay) || 200));
  manager.replayTimer = setTimeout(() => {
    manager.replayTimer = null;
    if (!manager.replayRunning || manager.replayPaused) return;
    const moves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
    const index = Math.floor(Number(manager.replayIndex) || 0);
    if (index >= moves.length) {
      pauseReplay(manager);
      return;
    }
    executeReplayActionAt(manager, index);
    if (Math.floor(Number(manager.replayIndex) || 0) >= moves.length) {
      pauseReplay(manager);
      return;
    }
    queueNativeReplayTick(manager);
  }, delay);
}

function withSingleFinalActuate(manager: ManagerLike, callback: () => void): void {
  const originalActuate = asFunction<(...args: unknown[]) => unknown>(manager.actuate);
  if (!originalActuate) {
    callback();
    return;
  }
  let actuated = false;
  manager.actuate = function (this: unknown) {
    actuated = true;
  };
  try {
    callback();
  } finally {
    manager.actuate = originalActuate;
    if (actuated) originalActuate.call(manager);
  }
}

export function seekReplay(manager: ManagerLike, targetIndex: unknown): number {
  const moves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
  const target = Math.max(0, Math.min(moves.length, Math.floor(Number(targetIndex) || 0)));
  const current = Math.max(0, Math.min(moves.length, Math.floor(Number(manager.replayIndex) || 0)));
  if (target === current) return target;
  withSingleFinalActuate(manager, () => {
    let start = current;
    const checkpoint = findReplayCheckpoint(manager, target);
    if (target < current || (checkpoint && checkpoint.index > current)) {
      start = restartReplayForSeek(manager, target);
    }
    for (let index = start; index < target; index += 1) executeReplayActionAt(manager, index);
    manager.replayIndex = target;
  });
  manager.replayPaused = true;
  manager.replayRunning = false;
  manager.isPaused = true;
  return target;
}

function normalizeReplayStepDelta(delta: unknown): number {
  const value = Number(delta);
  if (!Number.isFinite(value)) return 0;
  return value > 0 ? Math.floor(value) : Math.ceil(value);
}

export function stepReplay(manager: ManagerLike, delta: unknown): number {
  const moves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
  const current = Math.max(0, Math.min(moves.length, Math.floor(Number(manager.replayIndex) || 0)));
  const step = normalizeReplayStepDelta(delta);
  const next = Math.max(0, Math.min(moves.length, current + step));
  if (step > 0) return seekReplay(manager, next);
  manager.replayIndex = next;
  return next;
}

export function applyReplayImportActions(manager: ManagerLike, payload: unknown): boolean {
  const source = toRecord(payload);
  const moves = Array.isArray(source.replayMoves) ? source.replayMoves : [];
  const spawns = Array.isArray(source.replaySpawns) ? source.replaySpawns : [];
  manager.replayMoves = moves;
  manager.replaySpawns = spawns;
  manager.replayIndex = 0;
  manager.replayMode = true;
  return moves.length > 0 || spawns.length > 0;
}

export function importReplay(manager: ManagerLike, replayString: unknown): boolean {
  const text = String(replayString || "").trim();
  if (!text) return false;
  try {
    const envelope = parseReplayImportEnvelope(manager, text);
    if (!envelope) return false;
    if (envelope.kind === "v3-json") {
      const modeConfig = callManagerMethod<unknown>(manager, "resolveModeConfig", [envelope.modeKey]);
      const applied = applyStructuredReplaySession(manager, envelope, modeConfig);
      manager.replaySource = text;
      return applied;
    }
    if (envelope.kind === "v1rpl" || envelope.kind === "v9rpl") {
      const modeConfig = callManagerMethod<unknown>(manager, "resolveModeConfig", [envelope.modeKey]);
      const applied = applyStructuredReplaySession(manager, envelope, modeConfig);
      manager.replaySource = text;
      return applied;
    }
    return false;
  } catch (error) {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(`导入回放出错: ${String(error || "")}`);
    }
    return false;
  }
}

export function importV9RplBuffer(manager: ManagerLike, sourceBuffer: unknown): boolean {
  return importReplay(manager, String(sourceBuffer || ""));
}

function resolveLocalHistorySave(manager: ManagerLike): { scope: unknown; method: (record: unknown) => unknown } | null {
  const resolver = asFunction<(namespace: string, methodName: string) => unknown>(
    manager.resolveWindowNamespaceMethod
  );
  const resolved = toRecord(resolver ? resolver.call(manager, "LocalHistoryStore", "saveRecord") : null);
  const method = asFunction<(record: unknown) => unknown>(resolved.method);
  return method ? { scope: resolved.scope || null, method } : null;
}

function writeAutoSubmitResultRecord(manager: ManagerLike, payload: unknown): void {
  const writeResult = asFunction<(key: string, payload: unknown) => unknown>(manager.writeLocalStorageJsonPayload);
  if (writeResult) {
    writeResult.call(manager, "last_session_submit_result_v1", payload);
  }
}

function writeAutoSubmitSkippedResult(manager: ManagerLike, reason: string): void {
  writeAutoSubmitResultRecord(manager, {
    at: new Date().toISOString(),
    ok: false,
    skipped: true,
    reason
  });
}

export function tryAutoSubmitOnGameOver(manager: ManagerLike): void {
  if (!manager || manager.sessionSubmitDone) return;
  if (manager.replayMode) {
    writeAutoSubmitSkippedResult(manager, "replay_mode");
    return;
  }
  if (!isTerminalSessionForPersistence(manager)) {
    writeAutoSubmitSkippedResult(manager, "not_game_over");
    return;
  }
  const endedAt = new Date().toISOString();
  const replayString = serializeReplay(manager);
  const record = {
    mode_key: manager.modeKey || manager.mode,
    score: manager.score,
    final_board: getFinalBoardMatrix(manager),
    duration_ms: manager.getDurationMs ? asFunction<() => unknown>(manager.getDurationMs)?.call(manager) : 0,
    ended_at: endedAt,
    end_reason: resolveTerminalSessionEndReason(manager) || "game_over",
    replay: serializeReplayV3(manager),
    replay_string: replayString
  };
  const saveRecord = resolveLocalHistorySave(manager);
  if (!saveRecord) {
    writeAutoSubmitResultRecord(manager, {
      at: endedAt,
      ok: false,
      reason: "local_history_store_missing"
    });
    return;
  }
  const saved = toRecord(saveRecord.method.call(saveRecord.scope, record));
  manager.sessionSubmitDone = true;
  writeAutoSubmitResultRecord(manager, {
    at: endedAt,
    ok: true,
    local_saved: true,
    record_id: saved.id || null,
    mode_key: record.mode_key,
    score: record.score
  });
}

export interface GameManagerReplayHelpersRuntime {
  installGlobals: (windowLike?: WindowLike | null) => WindowLike | null;
}

export function createGameManagerReplayHelpersRuntime(): GameManagerReplayHelpersRuntime {
  return {
    installGlobals: installGameManagerReplayHelperGlobals
  };
}

export function installGameManagerReplayHelperGlobals(
  windowLike: WindowLike | null | undefined =
    typeof window === "undefined" ? null : (window as unknown as WindowLike)
): WindowLike | null {
  if (!windowLike) return null;
  Object.assign(windowLike, {
    keepPlaying,
    encodeReplay128,
    decodeReplay128,
    appendCompactMoveCode,
    appendCompactUndo,
    appendCompactPracticeAction,
    recordSpawnValue,
    refreshSpawnRateDisplay,
    computePostMoveRecord,
    recordSessionReplayV1Move,
    detectMode,
    clearTransientTileVisualState,
    insertCustomTile,
    getFinalBoardMatrix,
    serializeReplayV3,
    serializeReplayAsV9Verse,
    exportReplayAsV9VerseBlob,
    serializeReplayAsV9RplBase64,
    tryAutoSubmitOnGameOver,
    isTerminalSessionForPersistence,
    isSessionTerminated,
    serializeReplay,
    applyReplayImportActions,
    importReplay,
    importV9RplBuffer,
    LEGACY_VRS_NEW_CHARSET: Array.from(LEGACY_VRS_NEW_CHARSET),
    pauseReplay,
    resumeReplay,
    setReplaySpeed,
    seekReplay,
    stepReplay
  });
  if (!windowLike.CoreGameManagerReplayHelpersRuntime) {
    windowLike.CoreGameManagerReplayHelpersRuntime = createGameManagerReplayHelpersRuntime();
  }
  return windowLike;
}
