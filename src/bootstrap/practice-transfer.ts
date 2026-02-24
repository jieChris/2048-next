type JsonLike = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export interface PracticeTransferManagerLike {
  width?: number | null | undefined;
  height?: number | null | undefined;
  modeConfig?: Record<string, unknown> | null | undefined;
}

export interface PracticeTransferOptions {
  gameModeConfig?: Record<string, unknown> | null | undefined;
  manager?: PracticeTransferManagerLike | null | undefined;
}

export interface PracticeTransferModeConfig {
  key: "practice_legacy";
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

export interface PracticeGuideSeenOptions {
  localStorageLike?: StorageLike | null | undefined;
  sessionStorageLike?: StorageLike | null | undefined;
  guideShownKey?: string | null | undefined;
  guideSeenFlag?: string | null | undefined;
  cookie?: string | null | undefined;
  windowName?: string | null | undefined;
}

export interface BuildPracticeBoardUrlOptions {
  token: string;
  practiceRuleset?: string | null | undefined;
  includeGuideSeen?: boolean;
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
  guideShownKey?: string | null | undefined;
  guideSeenFlag?: string | null | undefined;
  cookie?: string | null | undefined;
  windowName?: string | null | undefined;
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
  guideSeen: boolean;
  persisted: boolean;
  persistedTarget: "local" | "session" | "none";
  openUrl: string;
  usedPayloadInUrl: boolean;
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

function safeReadStorageItem(storage: StorageLike | null | undefined, key: string): string | null {
  if (!storage || !key) return null;
  try {
    return storage.getItem(key);
  } catch (_err) {
    return null;
  }
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

function hasCookieFlag(cookie: string, key: string, value: string): boolean {
  if (!cookie || !key) return false;
  return cookie.indexOf(key + "=" + value) !== -1;
}

function hasWindowNameFlag(windowName: string, flag: string): boolean {
  if (!windowName || !flag) return false;
  return windowName.indexOf(flag) !== -1;
}

export function appendQueryParam(url: string, key: string, value: string): string {
  const sep = url.indexOf("?") === -1 ? "?" : "&";
  return url + sep + encodeURIComponent(key) + "=" + encodeURIComponent(value);
}

export function hasPracticeGuideSeen(options: PracticeGuideSeenOptions): boolean {
  const opts = options || {};
  const guideShownKey =
    typeof opts.guideShownKey === "string" && opts.guideShownKey ? opts.guideShownKey : "practice_guide_shown_v2";
  const guideSeenFlag =
    typeof opts.guideSeenFlag === "string" && opts.guideSeenFlag ? opts.guideSeenFlag : "practice_guide_seen_v2=1";
  const cookie = typeof opts.cookie === "string" ? opts.cookie : "";
  const windowName = typeof opts.windowName === "string" ? opts.windowName : "";

  return (
    safeReadStorageItem(opts.localStorageLike || null, guideShownKey) === "1" ||
    safeReadStorageItem(opts.sessionStorageLike || null, guideShownKey) === "1" ||
    hasCookieFlag(cookie, guideShownKey, "1") ||
    hasWindowNameFlag(windowName, guideSeenFlag)
  );
}

export function buildPracticeBoardUrl(options: BuildPracticeBoardUrlOptions): string {
  const opts = options || ({} as BuildPracticeBoardUrlOptions);
  const basePath = typeof opts.basePath === "string" && opts.basePath ? opts.basePath : "Practice_board.html";
  const token = typeof opts.token === "string" ? opts.token : "";
  const ruleset = opts.practiceRuleset === "fibonacci" ? "fibonacci" : "pow2";
  let url = basePath + "?practice_token=" + encodeURIComponent(token);
  url = appendQueryParam(url, "practice_ruleset", ruleset);
  if (opts.includeGuideSeen) {
    url = appendQueryParam(url, "practice_guide_seen", "1");
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
  const randomSource = typeof opts.randomLike === "function" ? opts.randomLike : Math.random;
  let randomValue = 0;
  try {
    randomValue = Number(randomSource());
  } catch (_err) {
    randomValue = 0;
  }
  if (!Number.isFinite(randomValue)) randomValue = 0;
  const suffix = randomValue.toString(36).slice(2, 8);
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
  const practiceRuleset = modeConfig.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  const payload = buildPracticeTransferPayload({
    token,
    board: opts.board,
    modeConfig,
    nowMs: opts.nowMs
  });
  const payloadString = JSON.stringify(payload);
  const guideSeen = hasPracticeGuideSeen({
    localStorageLike: opts.localStorageLike || null,
    sessionStorageLike: opts.sessionStorageLike || null,
    guideShownKey: opts.guideShownKey,
    guideSeenFlag: opts.guideSeenFlag,
    cookie: opts.cookie,
    windowName: opts.windowName
  });
  const baseUrl = buildPracticeBoardUrl({
    token,
    practiceRuleset,
    includeGuideSeen: guideSeen,
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
      guideSeen,
      persisted: true,
      persistedTarget: persistResult.target,
      openUrl: baseUrl,
      usedPayloadInUrl: false
    };
  }

  const urlWithPayload = buildPracticeBoardUrl({
    token,
    practiceRuleset,
    includeGuideSeen: guideSeen,
    includePayload: true,
    payload: payloadString,
    basePath: opts.basePath
  });
  return {
    token,
    practiceRuleset,
    modeConfig,
    payload,
    payloadString,
    guideSeen,
    persisted: false,
    persistedTarget: persistResult.target,
    openUrl: urlWithPayload,
    usedPayloadInUrl: true
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
    key: "practice_legacy",
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
  }
  return modeConfig;
}
