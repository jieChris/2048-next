import { randomBase36 } from "../utils/crypto-random";
import { isPracticeBoardSizeAllowed } from "./practice-mode";

type JsonLike = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export interface PracticeTransferManagerLike {
  width?: number | null | undefined;
  height?: number | null | undefined;
  modeConfig?: Record<string, unknown> | null | undefined;
  getFinalBoardMatrix?: (() => unknown) | null | undefined;
}

export interface PracticeTransferOptions {
  gameModeConfig?: Record<string, unknown> | null | undefined;
  manager?: PracticeTransferManagerLike | null | undefined;
}

export interface PracticeTransferModeConfig {
  key: "practice";
  label: "练习板（直通）";
  board_width: number;
  board_height: number;
  ruleset: "pow2" | "fibonacci";
  undo_enabled: true;
  spawn_table: Array<{ value: number; weight: number }>;
  ranked_bucket: "none";
  mode_family: string;
  rank_policy: "unranked";
  special_rules: Record<string, unknown>;
  max_tile?: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem?(key: string, value: string): void;
}

export interface BuildPracticeBoardUrlOptions {
  token: string;
  practiceRuleset?: string | null | undefined;
  practiceModeKey?: string | null | undefined;
  includePayload?: boolean;
  payload?: string | null | undefined;
  basePath?: string | null | undefined;
}

export interface BuildPracticeTransferTokenOptions {
  nowMs?: number | null | undefined;
  randomLike?: (() => number) | null | undefined;
  prefix?: string | null | undefined;
}

export interface BuildPracticeTransferPayloadOptions {
  token: string;
  board: unknown;
  modeConfig: PracticeTransferModeConfig;
  nowMs?: number | null | undefined;
}

export interface PracticeTransferPayload {
  token: string;
  created_at: number;
  board: unknown;
  mode_config: PracticeTransferModeConfig;
}

export interface PersistPracticeTransferPayloadOptions {
  localStorageLike?: StorageLike | null | undefined;
  sessionStorageLike?: StorageLike | null | undefined;
  localStorageKey?: string | null | undefined;
  sessionStorageKey?: string | null | undefined;
  payload: string;
}

export interface PersistPracticeTransferPayloadResult {
  persisted: boolean;
  target: "local" | "session" | "none";
}

export interface CreatePracticeTransferNavigationPlanOptions extends PracticeTransferOptions {
  board: unknown;
  localStorageLike?: StorageLike | null | undefined;
  sessionStorageLike?: StorageLike | null | undefined;
  localStorageKey?: string | null | undefined;
  sessionStorageKey?: string | null | undefined;
  nowMs?: number | null | undefined;
  randomLike?: (() => number) | null | undefined;
  tokenPrefix?: string | null | undefined;
  basePath?: string | null | undefined;
}

export interface PracticeTransferNavigationPlan {
  token: string;
  practiceRuleset: "pow2" | "fibonacci";
  modeConfig: PracticeTransferModeConfig;
  payload: PracticeTransferPayload;
  payloadString: string;
  persisted: boolean;
  persistedTarget: "local" | "session" | "none";
  openUrl: string;
  usedPayloadInUrl: boolean;
}

export interface ResolvePracticeTransferPrecheckOptions {
  manager?: PracticeTransferManagerLike | null | undefined;
}

export interface ResolvePracticeTransferPrecheckResult {
  canOpen: boolean;
  board: unknown[] | null;
  alertMessage: string | null;
}

export function cloneJsonSafe<T extends JsonLike>(value: T): T | null {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (_err) {
    return null;
  }
}

function toPositiveInt(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function safeSetStorageItem(storage: StorageLike | null | undefined, key: string, value: string): boolean {
  if (!storage || !key || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

export function appendQueryParam(url: string, key: string, value: string): string {
  const sep = url.indexOf("?") === -1 ? "?" : "&";
  return url + sep + encodeURIComponent(key) + "=" + encodeURIComponent(value);
}

export function buildPracticeBoardUrl(options: BuildPracticeBoardUrlOptions): string {
  const opts = options || ({} as BuildPracticeBoardUrlOptions);
  const basePath = typeof opts.basePath === "string" && opts.basePath ? opts.basePath : "Practice_board.html";
  const token = typeof opts.token === "string" ? opts.token : "";
  const ruleset = opts.practiceRuleset === "fibonacci" ? "fibonacci" : "pow2";
  const practiceModeKey =
    typeof opts.practiceModeKey === "string" && opts.practiceModeKey.trim() && opts.practiceModeKey !== "practice"
      ? opts.practiceModeKey.trim()
      : "";
  let url = basePath + "?practice_token=" + encodeURIComponent(token);
  url = appendQueryParam(url, "practice_ruleset", ruleset);
  if (practiceModeKey) {
    url = appendQueryParam(url, "practice_mode_key", practiceModeKey);
  }
  if (opts.includePayload && typeof opts.payload === "string" && opts.payload) {
    url = appendQueryParam(url, "practice_payload", opts.payload);
  }
  return url;
}

export function buildPracticeTransferToken(options: BuildPracticeTransferTokenOptions): string {
  const opts = options || {};
  const nowMs = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
  const prefix = typeof opts.prefix === "string" && opts.prefix ? opts.prefix : "p";
  let suffix = "";
  if (typeof opts.randomLike === "function") {
    let randomValue = 0;
    try {
      randomValue = Number(opts.randomLike());
    } catch (_err) {
      randomValue = 0;
    }
    if (!Number.isFinite(randomValue)) randomValue = 0;
    suffix = randomValue.toString(36).slice(2, 8);
  } else {
    suffix = randomBase36(6);
  }
  return prefix + nowMs + "_" + suffix;
}

export function buildPracticeTransferPayload(
  options: BuildPracticeTransferPayloadOptions
): PracticeTransferPayload {
  const opts = options;
  const createdAt = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
  return {
    token: String(opts.token || ""),
    created_at: createdAt,
    board: cloneJsonSafe(opts.board as JsonLike) || opts.board,
    mode_config: opts.modeConfig
  };
}

export function persistPracticeTransferPayload(
  options: PersistPracticeTransferPayloadOptions
): PersistPracticeTransferPayloadResult {
  const opts = options || ({} as PersistPracticeTransferPayloadOptions);
  const localKey =
    typeof opts.localStorageKey === "string" && opts.localStorageKey
      ? opts.localStorageKey
      : "practice_board_transfer_v1";
  const sessionKey =
    typeof opts.sessionStorageKey === "string" && opts.sessionStorageKey
      ? opts.sessionStorageKey
      : "practice_board_transfer_session_v1";

  if (safeSetStorageItem(opts.localStorageLike || null, localKey, opts.payload)) {
    return { persisted: true, target: "local" };
  }
  if (safeSetStorageItem(opts.sessionStorageLike || null, sessionKey, opts.payload)) {
    return { persisted: true, target: "session" };
  }
  return { persisted: false, target: "none" };
}

function resolvePracticeTransferSourceModeKey(options: PracticeTransferOptions): string {
  const opts = options || {};
  const cfg =
    opts.gameModeConfig && typeof opts.gameModeConfig === "object"
      ? opts.gameModeConfig
      : opts.manager && opts.manager.modeConfig && typeof opts.manager.modeConfig === "object"
        ? opts.manager.modeConfig
        : null;
  const raw = cfg && typeof cfg.key === "string" ? cfg.key.trim() : "";
  return raw && raw !== "practice" ? raw : "";
}

function resolvePracticeTransferSizeSource(
  manager: PracticeTransferManagerLike | null | undefined
): Record<string, unknown> {
  if (manager && manager.modeConfig && typeof manager.modeConfig === "object") {
    return manager.modeConfig;
  }
  return {
    board_width: manager?.width,
    board_height: manager?.height
  };
}

export function createPracticeTransferNavigationPlan(
  options: CreatePracticeTransferNavigationPlanOptions
): PracticeTransferNavigationPlan {
  const opts = options || ({} as CreatePracticeTransferNavigationPlanOptions);
  const token = buildPracticeTransferToken({
    nowMs: opts.nowMs,
    randomLike: opts.randomLike,
    prefix: opts.tokenPrefix
  });
  const modeConfig = buildPracticeModeConfigFromCurrent({
    gameModeConfig: opts.gameModeConfig || null,
    manager: opts.manager || null
  });
  const practiceModeKey = resolvePracticeTransferSourceModeKey(opts);
  const practiceRuleset = modeConfig.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  const payload = buildPracticeTransferPayload({
    token,
    board: opts.board,
    modeConfig,
    nowMs: opts.nowMs
  });
  const payloadString = JSON.stringify(payload);
  const urlWithPayload = buildPracticeBoardUrl({
    token,
    practiceRuleset,
    practiceModeKey,
    includePayload: true,
    payload: payloadString,
    basePath: opts.basePath
  });
  const persistResult = persistPracticeTransferPayload({
    localStorageLike: opts.localStorageLike || null,
    sessionStorageLike: opts.sessionStorageLike || null,
    localStorageKey: opts.localStorageKey,
    sessionStorageKey: opts.sessionStorageKey,
    payload: payloadString
  });
  if (persistResult.persisted) {
    return {
      token,
      practiceRuleset,
      modeConfig,
      payload,
      payloadString,
      persisted: true,
      persistedTarget: persistResult.target,
      openUrl: urlWithPayload,
      usedPayloadInUrl: true
    };
  }
  return {
    token,
    practiceRuleset,
    modeConfig,
    payload,
    payloadString,
    persisted: false,
    persistedTarget: persistResult.target,
    openUrl: urlWithPayload,
    usedPayloadInUrl: true
  };
}

export function resolvePracticeTransferPrecheck(
  options: ResolvePracticeTransferPrecheckOptions
): ResolvePracticeTransferPrecheckResult {
  const opts = options || {};
  const manager = opts.manager || null;
  if (!manager || typeof manager.getFinalBoardMatrix !== "function") {
    return {
      canOpen: false,
      board: null,
      alertMessage: "当前局面尚未就绪，稍后再试。"
    };
  }

  if (!isPracticeBoardSizeAllowed(resolvePracticeTransferSizeSource(manager))) {
    return {
      canOpen: false,
      board: null,
      alertMessage: "6x6 及以上模式不支持直通练习板。"
    };
  }

  const board = manager.getFinalBoardMatrix();
  if (!Array.isArray(board) || board.length === 0) {
    return {
      canOpen: false,
      board: null,
      alertMessage: "未读取到有效盘面。"
    };
  }

  return {
    canOpen: true,
    board: board as unknown[],
    alertMessage: null
  };
}

export function buildPracticeModeConfigFromCurrent(
  options: PracticeTransferOptions
): PracticeTransferModeConfig {
  const manager = options.manager || null;
  const globalConfig = options.gameModeConfig;
  const cfg =
    globalConfig && typeof globalConfig === "object"
      ? globalConfig
      : manager && manager.modeConfig && typeof manager.modeConfig === "object"
        ? manager.modeConfig
        : {};

  const ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  const width = toPositiveInt(cfg.board_width, toPositiveInt(manager?.width, 4));
  const height = toPositiveInt(cfg.board_height, toPositiveInt(manager?.height, width));
  const spawnTable =
    Array.isArray(cfg.spawn_table) && cfg.spawn_table.length > 0
      ? cloneJsonSafe(cfg.spawn_table)
      : ruleset === "fibonacci"
        ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
        : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  const modeConfig: PracticeTransferModeConfig = {
    key: "practice",
    label: "练习板（直通）",
    board_width: width,
    board_height: height,
    ruleset,
    undo_enabled: true,
    spawn_table: Array.isArray(spawnTable) ? spawnTable as Array<{ value: number; weight: number }> : [],
    ranked_bucket: "none",
    mode_family:
      typeof cfg.mode_family === "string" && cfg.mode_family
        ? cfg.mode_family
        : ruleset === "fibonacci"
          ? "fibonacci"
          : "pow2",
    rank_policy: "unranked",
    special_rules:
      (cloneJsonSafe(cfg.special_rules as JsonLike) as Record<string, unknown> | null) || {}
  };

  if (Number.isInteger(cfg.max_tile) && Number(cfg.max_tile) > 0) {
    modeConfig.max_tile = Number(cfg.max_tile);
    modeConfig.special_rules.enforce_max_tile = true;
  }
  return modeConfig;
}
