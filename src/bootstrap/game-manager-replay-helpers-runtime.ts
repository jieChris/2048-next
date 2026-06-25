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
  const actions = Array.isArray(envelope.actions) ? envelope.actions.slice() : [];
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
    }
    applied = true;
  }

  if (!applied) return false;
  manager.replayMoves = actions;
  manager.replaySpawns = spawns;
  manager.replayIndex = 0;
  manager.replayMode = true;
  manager.replayPaused = false;
  manager.replayRunning = false;
  manager.replayDelay = 200;
  if (initialBoard) {
    manager.replayStartBoardMatrix = initialBoard;
    manager.initialBoardMatrix = cloneJsonSafe(initialBoard) || initialBoard;
  }
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
  return !!manager && (!!manager.over || (!!manager.won && !manager.keepPlaying));
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
  return {
    v: 1,
    replay_logic_version: "v1",
    replay_string: serializeReplay(manager)
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
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(numericValue)) {
    return false;
  }
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
  insertTile.call(grid, new TileCtor(position, numericValue));
  syncPracticeRestartBoardSnapshot(manager);
  const actuate = asFunction<() => unknown>(manager.actuate);
  if (actuate) actuate.call(manager);
  return true;
}

export function pauseReplay(manager: ManagerLike): void {
  manager.replayPaused = true;
  manager.replayRunning = false;
}

export function resumeReplay(manager: ManagerLike): void {
  manager.replayPaused = false;
  manager.replayRunning = true;
}

export function setReplaySpeed(manager: ManagerLike, multiplier: unknown): number {
  const speed = Number(multiplier);
  const normalized = Number.isFinite(speed) && speed > 0 ? speed : 1;
  manager.replaySpeed = normalized;
  return normalized;
}

export function seekReplay(manager: ManagerLike, targetIndex: unknown): number {
  const moves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
  const target = Math.max(0, Math.min(moves.length, Math.floor(Number(targetIndex) || 0)));
  manager.replayIndex = target;
  return target;
}

export function stepReplay(manager: ManagerLike, delta: unknown): number {
  const moves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
  const current = Math.floor(Number(manager.replayIndex) || 0);
  const next = Math.max(0, Math.min(moves.length, current + Math.floor(Number(delta) || 0)));
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

export function tryAutoSubmitOnGameOver(manager: ManagerLike): void {
  if (!manager || manager.sessionSubmitDone || manager.replayMode || !isSessionTerminated(manager)) return;
  const endedAt = new Date().toISOString();
  const replayString = serializeReplay(manager);
  const record = {
    mode_key: manager.modeKey || manager.mode,
    score: manager.score,
    final_board: getFinalBoardMatrix(manager),
    duration_ms: manager.getDurationMs ? asFunction<() => unknown>(manager.getDurationMs)?.call(manager) : 0,
    ended_at: endedAt,
    replay: serializeReplayV3(manager),
    replay_string: replayString
  };
  const saveRecord = resolveLocalHistorySave(manager);
  const saved = saveRecord ? toRecord(saveRecord.method.call(saveRecord.scope, record)) : {};
  manager.sessionSubmitDone = true;
  const writeResult = asFunction<(key: string, payload: unknown) => unknown>(manager.writeLocalStorageJsonPayload);
  if (writeResult) {
    writeResult.call(manager, "last_session_submit_result_v1", {
      at: endedAt,
      ok: !!saveRecord,
      local_saved: !!saveRecord,
      record_id: saved.id || null,
      mode_key: record.mode_key,
      score: record.score
    });
  }
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
    isSessionTerminated,
    serializeReplay,
    applyReplayImportActions,
    importReplay,
    importV9RplBuffer,
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
