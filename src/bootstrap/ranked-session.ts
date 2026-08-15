import { parsePlayModeKey } from "./play-query";
import { resolveStorageByName, safeReadStorageItem, safeSetStorageItem } from "./storage";

const AUTH_TOKEN_STORAGE_KEY = "2048_auth_token_v1";
const AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";
const AUTH_NICKNAME_STORAGE_KEY = "2048_auth_nickname_v1";
const RANKED_SESSION_SUPPRESS_NEXT_AUTH_RELOAD_KEY = "__rankedSessionSuppressNextAuthReload";
const ACTIVE_SESSION_STORAGE_KEY_PREFIX = "ranked_session_active:v1:";
const PREFETCH_SESSION_STORAGE_KEY_PREFIX = "ranked_session_prefetch:v1:";
const ATTEMPT_OUTBOX_STORAGE_KEY = "ranked_session_attempt_outbox:v1";
const ATTEMPT_SCHEMA_VERSION = 1;
const SAVED_GAME_STATE_STORAGE_KEY_PREFIX = "savedGameStateByMode:v1:";
const SAVED_GAME_STATE_LITE_STORAGE_KEY_PREFIX = "savedGameStateLiteByMode:v1:";
const DEFAULT_REMOTE_API_BASE_URL = "https://2048next.cn/api";
const AUTH_STATE_STORAGE_KEYS = new Set([
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_ID_STORAGE_KEY
]);

const RANKED_MODE_KEYS = new Set([
  "standard_4x4_pow2_no_undo",
  "classic_4x4_pow2_undo",
  "capped_4x4_pow2_no_undo",
  "capped_4x4_pow2_64_no_undo",
  "capped_4x4_pow2_1024_no_undo",
  "capped_4x4_pow2_4096_no_undo",
  "board_3x3_pow2_no_undo",
  "board_3x3_pow2_undo",
  "board_2x4_pow2_no_undo",
  "board_2x4_pow2_undo",
  "board_3x4_pow2_no_undo",
  "board_3x4_pow2_undo",
  "board_5x5_pow2_no_undo",
  "board_5x5_pow2_undo",
  "diag_3x3_pow2_no_undo",
  "diag_4x4_pow2_no_undo",
  "diag_3x4_pow2_no_undo",
  "diag_2x4_pow2_no_undo",
  "obstacle_4x4_pow2_no_undo",
  "fib_4x4_no_undo",
  "fib_4x4_undo",
  "fib_3x3_no_undo",
  "fib_3x3_undo",
  "fib_4x3_no_undo",
  "fib_4x3_undo",
  "fib_4x2_no_undo",
  "fib_4x2_undo"
]);

export interface RankedSessionRecord {
  mode_key: string;
  mode_bucket?: string | null | undefined;
  challenge_id: string;
  seed: number;
  ranked_session_token: string;
  issued_at: number;
  exp: number;
  status?: "created" | "started" | "consumed" | "abandoned" | "expired" | null | undefined;
  record_era?: "beta" | "official_v1" | null | undefined;
  owner_user_id?: string | null | undefined;
  client_received_at_ms?: number | null | undefined;
}

export interface RankedChallengeContext {
  id: string;
  mode_key: string;
  seed: number;
  ranked_session_token: string;
}

export interface RankedSessionAttemptDraft {
  challenge_id: string;
  event: "begin" | "abandon";
  mode_key: string;
  ranked_session_token: string;
  replay_string: string;
  reason?: "restart" | "navigation" | undefined;
  attempt_schema_version: 1;
}

export interface RankedSessionAttemptFlushOptions {
  keepalive?: boolean;
}

export interface RankedSessionRuntime {
  getCurrentContext: (modeLike?: string | null | undefined) => RankedChallengeContext | null;
  promotePrefetchedSession: (modeLike?: string | null | undefined) => boolean;
  startNextSession: (modeLike?: string | null | undefined) => Promise<boolean>;
  ensurePrefetch: (modeLike?: string | null | undefined) => Promise<boolean>;
  getLastFailureReason: () => string;
  clearActiveSession: (modeLike?: string | null | undefined) => void;
  clearModeSession: (modeLike?: string | null | undefined) => void;
  enqueueAttempt: (attempt: RankedSessionAttemptDraft) => boolean;
  flushAttemptOutbox: (options?: RankedSessionAttemptFlushOptions) => Promise<boolean>;
  resolvePageModeKey: () => string | null;
}

interface RankedSessionWindowLike extends Window {
  [key: string]: unknown;
  GAME_CHALLENGE_CONTEXT?: unknown;
  GAME_API_ALLOW_CROSS_ORIGIN_FALLBACK?: unknown;
  GAME_API_BASE_URL?: unknown;
  GAME_API_FALLBACK_BASE_URL?: unknown;
  RankedSessionRuntime?: RankedSessionRuntime;
}

interface NormalizeRankedSessionOptions {
  allowExpired?: boolean;
}

interface RankedSessionAttemptPayload {
  event: "begin" | "abandon";
  mode_key: string;
  ranked_session_token: string;
  replay_string: string;
  reason?: "restart" | "navigation" | undefined;
  attempt_schema_version: 1;
}

interface RankedSessionAttemptOutboxItem {
  id: string;
  owner_user_id: string;
  challenge_id: string;
  payload: RankedSessionAttemptPayload;
  created_at_ms: number;
}

function isRankedModeKey(modeLike: unknown): modeLike is string {
  const modeKey = String(modeLike || "").trim();
  return !!modeKey && RANKED_MODE_KEYS.has(modeKey);
}

function resolveRankedModeKeyForPage(
  windowLike: RankedSessionWindowLike,
  pageId: string
): string | null {
  if (pageId === "index") return "standard_4x4_pow2_no_undo";
  if (pageId === "undo") return "classic_4x4_pow2_undo";
  if (pageId === "capped") return "capped_4x4_pow2_no_undo";
  if (pageId !== "play") return null;
  const modeKey = parsePlayModeKey(windowLike.location?.search || "");
  return isRankedModeKey(modeKey) ? modeKey : null;
}

function resolveLocalStorage(windowLike: RankedSessionWindowLike): Storage | null {
  return resolveStorageByName({
    windowLike,
    storageName: "localStorage"
  }) as Storage | null;
}

function resolveFetchLike(windowLike: RankedSessionWindowLike): typeof globalThis.fetch | null {
  if (typeof windowLike.fetch === "function") {
    return windowLike.fetch.bind(windowLike) as typeof globalThis.fetch;
  }
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis) as typeof globalThis.fetch;
  }
  return null;
}

function normalizeApiBase(base: unknown): string {
  return String(base || "").trim().replace(/\/+$/, "");
}

function isLocalDevelopmentHostname(hostname: unknown): boolean {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("127.");
}

function shouldUseRemoteApiFallback(hostname: unknown, allowCrossOriginFallback: boolean): boolean {
  const host = String(hostname || "").toLowerCase();
  if (allowCrossOriginFallback) return true;
  if (host === "2048next.cn" || host === "www.2048next.cn") return true;
  return !!host && !isLocalDevelopmentHostname(host);
}

function shouldUseSameOriginApi(hostname: unknown): boolean {
  const host = String(hostname || "").toLowerCase();
  return host !== "taihe.fun" && host !== "www.taihe.fun";
}

export function buildRankedSessionApiBaseCandidates(windowLike: RankedSessionWindowLike): string[] {
  const bases: string[] = [];
  const push = (base: unknown): void => {
    const normalized = normalizeApiBase(base);
    if (!normalized || bases.includes(normalized)) return;
    bases.push(normalized);
  };

  push(windowLike.GAME_API_BASE_URL);

  const locationLike = windowLike.location;
  const hostname = String(locationLike?.hostname || "").toLowerCase();
  const origin = String(locationLike?.origin || "");
  const allowCrossOriginFallback =
    String(windowLike.GAME_API_ALLOW_CROSS_ORIGIN_FALLBACK || "").toLowerCase() === "true";
  const remoteFallback = normalizeApiBase(windowLike.GAME_API_FALLBACK_BASE_URL) || DEFAULT_REMOTE_API_BASE_URL;

  if (/^https?:\/\//i.test(origin) && shouldUseSameOriginApi(hostname)) {
    push(`${origin}/api`);
  }
  if (shouldUseRemoteApiFallback(hostname, allowCrossOriginFallback)) {
    push(remoteFallback);
  }
  if (bases.length === 0) {
    push(remoteFallback);
  }

  return bases;
}

function removeStorageKey(storageLike: Storage | null, key: string): void {
  if (!storageLike || typeof storageLike.removeItem !== "function" || !key) return;
  try {
    storageLike.removeItem(key);
  } catch (_err) {}
}

function clearAuthSession(storageLike: Storage | null): void {
  removeStorageKey(storageLike, AUTH_TOKEN_STORAGE_KEY);
  removeStorageKey(storageLike, AUTH_USER_ID_STORAGE_KEY);
  removeStorageKey(storageLike, AUTH_NICKNAME_STORAGE_KEY);
}

function markInternalAuthTransition(windowLike: RankedSessionWindowLike): void {
  try {
    (windowLike as unknown as Record<string, unknown>)[RANKED_SESSION_SUPPRESS_NEXT_AUTH_RELOAD_KEY] = true;
  } catch (_err) {}
}

function consumeInternalAuthTransition(windowLike: RankedSessionWindowLike): boolean {
  try {
    const target = windowLike as unknown as Record<string, unknown>;
    if (target[RANKED_SESSION_SUPPRESS_NEXT_AUTH_RELOAD_KEY] !== true) return false;
    target[RANKED_SESSION_SUPPRESS_NEXT_AUTH_RELOAD_KEY] = false;
    return true;
  } catch (_err) {
    return false;
  }
}

function readAuthToken(windowLike: RankedSessionWindowLike): string {
  return (
    safeReadStorageItem({
      storageLike: resolveLocalStorage(windowLike),
      key: AUTH_TOKEN_STORAGE_KEY
    }) || ""
  ).trim();
}

function readAuthUserId(windowLike: RankedSessionWindowLike): string {
  return (
    safeReadStorageItem({
      storageLike: resolveLocalStorage(windowLike),
      key: AUTH_USER_ID_STORAGE_KEY
    }) || ""
  ).trim();
}

function resolveModeStorageKey(prefix: string, modeKey: string): string {
  return `${prefix}${modeKey}`;
}

function normalizeRankedSessionRecord(
  rawValue: unknown,
  expectedModeKey: string,
  options: NormalizeRankedSessionOptions = {}
): RankedSessionRecord | null {
  if (!rawValue) return null;
  let parsed: Record<string, unknown> | null = null;
  if (typeof rawValue === "string") {
    try {
      parsed = JSON.parse(rawValue) as Record<string, unknown>;
    } catch (_err) {
      return null;
    }
  } else if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
    parsed = rawValue as Record<string, unknown>;
  }
  if (!parsed) return null;
  const modeKey = String(parsed.mode_key || expectedModeKey || "").trim();
  const challengeId = String(parsed.challenge_id || "").trim().toLowerCase();
  const rankedSessionToken = String(parsed.ranked_session_token || "").trim();
  const seed = Math.floor(Number(parsed.seed));
  const issuedAt = Math.floor(Number(parsed.issued_at));
  const exp = Math.floor(Number(parsed.exp));
  if (!modeKey || modeKey !== expectedModeKey) return null;
  if (!challengeId || !rankedSessionToken) return null;
  if (!Number.isInteger(seed) || seed < 0) return null;
  if (!Number.isInteger(issuedAt) || issuedAt <= 0) return null;
  if (!Number.isInteger(exp) || (!options.allowExpired && exp <= Math.floor(Date.now() / 1000))) return null;
  return {
    mode_key: modeKey,
    mode_bucket: typeof parsed.mode_bucket === "string" ? parsed.mode_bucket : null,
    challenge_id: challengeId,
    seed,
    ranked_session_token: rankedSessionToken,
    issued_at: issuedAt,
    exp,
    status:
      parsed.status === "created" ||
      parsed.status === "started" ||
      parsed.status === "consumed" ||
      parsed.status === "abandoned" ||
      parsed.status === "expired"
        ? parsed.status
        : null,
    record_era:
      parsed.record_era === "beta" || parsed.record_era === "official_v1"
        ? parsed.record_era
        : null,
    owner_user_id:
      typeof parsed.owner_user_id === "string" && parsed.owner_user_id.trim()
        ? parsed.owner_user_id.trim()
        : null,
    client_received_at_ms:
      Number.isFinite(Number(parsed.client_received_at_ms)) && Number(parsed.client_received_at_ms) >= 0
        ? Math.floor(Number(parsed.client_received_at_ms))
        : null
  };
}

function normalizeRankedSessionAttemptDraft(rawValue: unknown): RankedSessionAttemptDraft | null {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return null;
  const source = rawValue as Record<string, unknown>;
  const event = source.event === "begin" || source.event === "abandon" ? source.event : null;
  const modeKey = String(source.mode_key || "").trim();
  const challengeId = String(source.challenge_id || "").trim().toLowerCase();
  const token = String(source.ranked_session_token || "").trim();
  const replayString = String(source.replay_string || "").trim();
  const reason = source.reason === "restart" || source.reason === "navigation" ? source.reason : undefined;
  if (!event || !isRankedModeKey(modeKey) || !challengeId || !token || !replayString) return null;
  if (Number(source.attempt_schema_version) !== ATTEMPT_SCHEMA_VERSION) return null;
  if (event === "begin" && source.reason != null && String(source.reason).trim()) return null;
  if (event === "abandon" && !reason) return null;
  return {
    challenge_id: challengeId,
    event,
    mode_key: modeKey,
    ranked_session_token: token,
    replay_string: replayString,
    ...(reason ? { reason } : {}),
    attempt_schema_version: ATTEMPT_SCHEMA_VERSION
  };
}

function buildAttemptOutboxItemId(ownerUserId: string, challengeId: string, event: string): string {
  return JSON.stringify([ownerUserId, challengeId, event]);
}

function normalizeAttemptOutboxItem(rawValue: unknown): RankedSessionAttemptOutboxItem | null {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return null;
  const source = rawValue as Record<string, unknown>;
  const ownerUserId = String(source.owner_user_id || "").trim();
  const challengeId = String(source.challenge_id || "").trim().toLowerCase();
  const draft = normalizeRankedSessionAttemptDraft({
    ...(source.payload && typeof source.payload === "object" && !Array.isArray(source.payload)
      ? (source.payload as Record<string, unknown>)
      : {}),
    challenge_id: challengeId
  });
  if (!ownerUserId || !challengeId || !draft) return null;
  const { challenge_id: _challengeId, ...payload } = draft;
  const createdAt = Math.max(0, Math.floor(Number(source.created_at_ms) || 0));
  return {
    id: buildAttemptOutboxItemId(ownerUserId, challengeId, payload.event),
    owner_user_id: ownerUserId,
    challenge_id: challengeId,
    payload,
    created_at_ms: createdAt
  };
}

function readAttemptOutbox(storageLike: Storage | null): RankedSessionAttemptOutboxItem[] {
  const raw = safeReadStorageItem({ storageLike, key: ATTEMPT_OUTBOX_STORAGE_KEY });
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeAttemptOutboxItem(item))
      .filter((item): item is RankedSessionAttemptOutboxItem => !!item);
  } catch (_err) {
    return [];
  }
}

function writeAttemptOutbox(
  storageLike: Storage | null,
  items: RankedSessionAttemptOutboxItem[]
): boolean {
  if (items.length === 0) {
    removeStorageKey(storageLike, ATTEMPT_OUTBOX_STORAGE_KEY);
    return true;
  }
  return safeSetStorageItem({
    storageLike,
    key: ATTEMPT_OUTBOX_STORAGE_KEY,
    value: JSON.stringify(items)
  });
}

function removeAttemptOutboxItem(storageLike: Storage | null, itemId: string): void {
  writeAttemptOutbox(
    storageLike,
    readAttemptOutbox(storageLike).filter((item) => item.id !== itemId)
  );
}

function readRankedSessionRecord(
  storageLike: Storage | null,
  storageKey: string,
  expectedModeKey: string,
  expectedOwnerUserId: string,
  options: NormalizeRankedSessionOptions = {}
): RankedSessionRecord | null {
  const raw = safeReadStorageItem({
    storageLike,
    key: storageKey
  });
  const normalized = normalizeRankedSessionRecord(raw, expectedModeKey, options);
  if (
    normalized &&
    (!expectedOwnerUserId || normalized.owner_user_id === expectedOwnerUserId)
  ) {
    return normalized;
  }
  removeStorageKey(storageLike, storageKey);
  return null;
}

function writeRankedSessionRecord(
  storageLike: Storage | null,
  storageKey: string,
  record: RankedSessionRecord,
  ownerUserId: string
): boolean {
  return safeSetStorageItem({
    storageLike,
    key: storageKey,
    value: JSON.stringify({
      ...record,
      owner_user_id: ownerUserId || null
    })
  });
}

function buildChallengeContext(record: RankedSessionRecord | null): RankedChallengeContext | null {
  if (!record) return null;
  return {
    id: record.challenge_id,
    mode_key: record.mode_key,
    seed: record.seed,
    ranked_session_token: record.ranked_session_token
  };
}

function normalizeSavedStatePayload(rawValue: unknown): Record<string, unknown> | null {
  if (!rawValue) return null;
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch (_err) {
      return null;
    }
  }
  return rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
    ? (rawValue as Record<string, unknown>)
    : null;
}

function isResumableSavedStatePayload(payload: Record<string, unknown> | null, modeKey: string): boolean {
  if (!payload) return false;
  if (String(payload.mode_key || "").trim() !== modeKey) return false;
  if (payload.terminated === true) return false;
  if (payload.over === true && modeKey !== "practice") return false;
  return Array.isArray(payload.board);
}

function isRankedBoundSavedStatePayload(payload: Record<string, unknown> | null, modeKey: string): boolean {
  if (!payload) return false;
  if (!isResumableSavedStatePayload(payload, modeKey)) return false;
  return (
    typeof payload.ranked_session_token === "string" &&
    payload.ranked_session_token.trim().length > 0 &&
    typeof payload.challenge_id === "string" &&
    payload.challenge_id.trim().length > 0
  );
}

function hasResumableLocalSavedStateForMode(
  windowLike: RankedSessionWindowLike,
  modeKey: string
): boolean {
  const storageLike = resolveLocalStorage(windowLike);
  if (!storageLike) return false;
  const keys = [
    `${SAVED_GAME_STATE_STORAGE_KEY_PREFIX}${modeKey}`,
    `${SAVED_GAME_STATE_LITE_STORAGE_KEY_PREFIX}${modeKey}`
  ];
  return keys.some((key) => {
    const raw = safeReadStorageItem({
      storageLike,
      key
    });
    return isResumableSavedStatePayload(normalizeSavedStatePayload(raw), modeKey);
  });
}

function hasRankedBoundLocalSavedStateForMode(
  windowLike: RankedSessionWindowLike,
  modeKey: string
): boolean {
  const storageLike = resolveLocalStorage(windowLike);
  if (!storageLike) return false;
  const keys = [
    `${SAVED_GAME_STATE_STORAGE_KEY_PREFIX}${modeKey}`,
    `${SAVED_GAME_STATE_LITE_STORAGE_KEY_PREFIX}${modeKey}`
  ];
  return keys.some((key) => {
    const raw = safeReadStorageItem({
      storageLike,
      key
    });
    return isRankedBoundSavedStatePayload(normalizeSavedStatePayload(raw), modeKey);
  });
}

function syncWindowChallengeContext(
  windowLike: RankedSessionWindowLike,
  pageModeKey: string | null,
  record: RankedSessionRecord | null
): void {
  if (!pageModeKey || !isRankedModeKey(pageModeKey)) return;
  const context = buildChallengeContext(record);
  windowLike.GAME_CHALLENGE_CONTEXT = context;
}

function isSameRankedSessionRecord(
  left: RankedSessionRecord | null,
  right: RankedSessionRecord | null
): boolean {
  if (!left || !right) return false;
  if (left.ranked_session_token && right.ranked_session_token) {
    if (left.ranked_session_token === right.ranked_session_token) return true;
  }
  if (left.challenge_id && right.challenge_id && left.challenge_id === right.challenge_id) {
    return true;
  }
  return left.seed === right.seed;
}

export function createRankedSessionRuntime(
  windowLike: RankedSessionWindowLike,
  pageId: string
): RankedSessionRuntime {
  const storageLike = resolveLocalStorage(windowLike);
  const pageModeResolver = () => resolveRankedModeKeyForPage(windowLike, pageId);
  const sessionRequestCache = new Map<string, Promise<RankedSessionRecord | null>>();
  const ownerUserIdResolver = () => readAuthUserId(windowLike);
  let lastFailureReason = "";
  let attemptFlushPromise: Promise<boolean> | null = null;

  const resolveModeKey = (modeLike?: string | null | undefined): string | null => {
    const explicitModeKey = String(modeLike || "").trim();
    if (isRankedModeKey(explicitModeKey)) return explicitModeKey;
    return pageModeResolver();
  };

  const readActiveSession = (modeKey: string): RankedSessionRecord | null =>
    readRankedSessionRecord(
      storageLike,
      resolveModeStorageKey(ACTIVE_SESSION_STORAGE_KEY_PREFIX, modeKey),
      modeKey,
      ownerUserIdResolver(),
      { allowExpired: true }
    );

  const readPrefetchedSession = (modeKey: string): RankedSessionRecord | null =>
    readRankedSessionRecord(
      storageLike,
      resolveModeStorageKey(PREFETCH_SESSION_STORAGE_KEY_PREFIX, modeKey),
      modeKey,
      ownerUserIdResolver()
    );

  const writeActiveSession = (modeKey: string, record: RankedSessionRecord): boolean =>
    writeRankedSessionRecord(
      storageLike,
      resolveModeStorageKey(ACTIVE_SESSION_STORAGE_KEY_PREFIX, modeKey),
      record,
      ownerUserIdResolver()
    );

  const writePrefetchedSession = (modeKey: string, record: RankedSessionRecord): boolean =>
    writeRankedSessionRecord(
      storageLike,
      resolveModeStorageKey(PREFETCH_SESSION_STORAGE_KEY_PREFIX, modeKey),
      record,
      ownerUserIdResolver()
    );

  const clearActiveSession = (modeKey: string): void => {
    removeStorageKey(storageLike, resolveModeStorageKey(ACTIVE_SESSION_STORAGE_KEY_PREFIX, modeKey));
    if (pageModeResolver() === modeKey) {
      windowLike.GAME_CHALLENGE_CONTEXT = null;
    }
  };

  const clearPrefetchedSession = (modeKey: string): void => {
    removeStorageKey(storageLike, resolveModeStorageKey(PREFETCH_SESSION_STORAGE_KEY_PREFIX, modeKey));
  };

  const activateSession = (modeKey: string, session: RankedSessionRecord): boolean => {
    if (!writeActiveSession(modeKey, session)) return false;
    clearPrefetchedSession(modeKey);
    if (pageModeResolver() === modeKey) {
      syncWindowChallengeContext(windowLike, modeKey, session);
    }
    return true;
  };

  const requestSession = async (modeKey: string): Promise<RankedSessionRecord | null> => {
    const authToken = readAuthToken(windowLike);
    lastFailureReason = "";
    if (!authToken || !isRankedModeKey(modeKey)) {
      lastFailureReason = !authToken ? "unauthorized" : "invalid_mode";
      return null;
    }
    const fetchLike = resolveFetchLike(windowLike);
    if (!fetchLike) {
      lastFailureReason = "fetch_unavailable";
      return null;
    }
    const requestKey = `start:${modeKey}`;
    const existing = sessionRequestCache.get(requestKey);
    if (existing) return existing;
    const requestPromise = (async () => {
      try {
        const apiBases = buildRankedSessionApiBaseCandidates(windowLike);
        for (let index = 0; index < apiBases.length; index += 1) {
          try {
            const response = await fetchLike(`${apiBases[index]}/ranked-session/start`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${authToken}`
              },
              body: JSON.stringify({
                mode_key: modeKey,
                attempt_schema_version: ATTEMPT_SCHEMA_VERSION
              })
            });
            const payload = (await response.json().catch(() => null)) as {
              success?: boolean;
              data?: Record<string, unknown>;
              code?: string;
              error?: string;
            } | null;
            if (!response.ok) {
              if (response.status === 401 || response.status === 403) {
                clearAuthSession(storageLike);
                markInternalAuthTransition(windowLike);
                clearActiveSession(modeKey);
                clearPrefetchedSession(modeKey);
                lastFailureReason = "unauthorized";
                return null;
              }
              lastFailureReason = payload?.code || payload?.error || `http_${response.status}`;
              return null;
            }
            if (!payload || payload.success !== true) {
              lastFailureReason = payload?.code || payload?.error || "api_failure";
              return null;
            }
            const session = normalizeRankedSessionRecord(payload.data || null, modeKey);
            if (!session) lastFailureReason = "invalid_response";
            return session
              ? {
                  ...session,
                  client_received_at_ms: Date.now(),
                  owner_user_id: ownerUserIdResolver() || null
                }
              : null;
          } catch (_requestErr) {
            lastFailureReason = "network";
            return null;
          }
        }
        return null;
      } catch (_err) {
        return null;
      } finally {
        sessionRequestCache.delete(requestKey);
      }
    })();
    sessionRequestCache.set(requestKey, requestPromise);
    return requestPromise;
  };

  const enqueueAttempt = (rawAttempt: RankedSessionAttemptDraft): boolean => {
    const ownerUserId = ownerUserIdResolver();
    const attempt = normalizeRankedSessionAttemptDraft(rawAttempt);
    lastFailureReason = "";
    if (!ownerUserId) {
      lastFailureReason = "attempt_owner_missing";
      return false;
    }
    if (!attempt) {
      lastFailureReason = "attempt_payload_invalid";
      return false;
    }
    const { challenge_id: challengeId, ...payload } = attempt;
    const itemId = buildAttemptOutboxItemId(ownerUserId, challengeId, payload.event);
    const items = readAttemptOutbox(storageLike);
    if (items.some((item) => item.id === itemId)) return true;
    items.push({
      id: itemId,
      owner_user_id: ownerUserId,
      challenge_id: challengeId,
      payload,
      created_at_ms: Date.now()
    });
    const written = writeAttemptOutbox(storageLike, items);
    if (!written) lastFailureReason = "attempt_outbox_write_failed";
    return written;
  };

  const submitAttempt = async (
    item: RankedSessionAttemptOutboxItem,
    authToken: string,
    options: RankedSessionAttemptFlushOptions
  ): Promise<"success" | "permanent" | "retry"> => {
    const fetchLike = resolveFetchLike(windowLike);
    const apiBase = buildRankedSessionApiBaseCandidates(windowLike)[0];
    if (!fetchLike || !apiBase) return "retry";
    try {
      const response = await fetchLike(`${apiBase}/ranked-session/attempt`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(item.payload),
        keepalive: options.keepalive === true
      });
      const payload = (await response.json().catch(() => null)) as { success?: boolean } | null;
      if (response.status === 401 || response.status === 403) {
        clearAuthSession(storageLike);
        markInternalAuthTransition(windowLike);
        return "retry";
      }
      if (response.status === 400 || response.status === 409) return "permanent";
      return response.ok && payload?.success === true ? "success" : "retry";
    } catch (_err) {
      return "retry";
    }
  };

  const flushAttemptOutbox = async (
    options: RankedSessionAttemptFlushOptions = {}
  ): Promise<boolean> => {
    if (attemptFlushPromise) return attemptFlushPromise;
    const pending = (async (): Promise<boolean> => {
      const authToken = readAuthToken(windowLike);
      const ownerUserId = ownerUserIdResolver();
      if (!authToken || !ownerUserId) return false;
      const ownerItems = readAttemptOutbox(storageLike).filter(
        (item) => item.owner_user_id === ownerUserId
      );
      for (const item of ownerItems) {
        const outcome = await submitAttempt(item, authToken, options);
        if (outcome === "success" || outcome === "permanent") {
          removeAttemptOutboxItem(storageLike, item.id);
          continue;
        }
        return false;
      }
      return true;
    })().finally(() => {
      if (attemptFlushPromise === pending) attemptFlushPromise = null;
    });
    attemptFlushPromise = pending;
    return pending;
  };

  const runtime: RankedSessionRuntime = {
    getCurrentContext(modeLike) {
      const modeKey = resolveModeKey(modeLike);
      if (!modeKey) return null;
      return buildChallengeContext(readActiveSession(modeKey));
    },
    promotePrefetchedSession(modeLike) {
      const modeKey = resolveModeKey(modeLike);
      if (!modeKey) return false;
      const active = readActiveSession(modeKey);
      const prefetched = readPrefetchedSession(modeKey);
      if (!prefetched) return false;
      if (isSameRankedSessionRecord(active, prefetched)) {
        clearPrefetchedSession(modeKey);
        void runtime.ensurePrefetch(modeKey);
        return false;
      }
      if (!activateSession(modeKey, prefetched)) return false;
      void runtime.ensurePrefetch(modeKey);
      return true;
    },
    async startNextSession(modeLike) {
      const modeKey = resolveModeKey(modeLike);
      if (!modeKey) return false;
      if (runtime.promotePrefetchedSession(modeKey)) return true;
      const session = await requestSession(modeKey);
      if (!session) return false;
      const active = readActiveSession(modeKey);
      if (isSameRankedSessionRecord(active, session)) {
        clearPrefetchedSession(modeKey);
        void runtime.ensurePrefetch(modeKey);
        return false;
      }
      if (!activateSession(modeKey, session)) return false;
      void runtime.ensurePrefetch(modeKey);
      return true;
    },
    async ensurePrefetch(modeLike) {
      const modeKey = resolveModeKey(modeLike);
      if (!modeKey) return false;
      const active = readActiveSession(modeKey);
      const existingPrefetch = readPrefetchedSession(modeKey);
      if (existingPrefetch) {
        if (!isSameRankedSessionRecord(active, existingPrefetch)) return true;
        clearPrefetchedSession(modeKey);
      }
      const session = await requestSession(modeKey);
      if (!session) return false;
      if (
        isSameRankedSessionRecord(active, session) ||
        isSameRankedSessionRecord(readActiveSession(modeKey), session)
      ) {
        return false;
      }
      return writePrefetchedSession(modeKey, session);
    },
    getLastFailureReason() {
      return lastFailureReason;
    },
    clearActiveSession(modeLike) {
      const modeKey = resolveModeKey(modeLike);
      if (!modeKey) return;
      clearActiveSession(modeKey);
    },
    clearModeSession(modeLike) {
      const modeKey = resolveModeKey(modeLike);
      if (!modeKey) return;
      clearActiveSession(modeKey);
      clearPrefetchedSession(modeKey);
    },
    enqueueAttempt,
    flushAttemptOutbox,
    resolvePageModeKey() {
      return pageModeResolver();
    }
  };

  return runtime;
}

function resolveAuthStateSignature(windowLike: RankedSessionWindowLike): string {
  return `${readAuthUserId(windowLike)}\u0000${readAuthToken(windowLike)}`;
}

export function bindRankedSessionAuthTransitionReload(
  windowLike: RankedSessionWindowLike,
  runtime: Pick<RankedSessionRuntime, "clearModeSession">,
  modeKey: string | null
): void {
  if (!modeKey || !isRankedModeKey(modeKey)) return;
  if (typeof windowLike.addEventListener !== "function") return;

  let authStateSignature = resolveAuthStateSignature(windowLike);
  let reloadScheduled = false;

  const reloadForAuthTransition = (): void => {
    if (reloadScheduled) return;
    const currentAuthStateSignature = resolveAuthStateSignature(windowLike);
    if (currentAuthStateSignature === authStateSignature) return;
    authStateSignature = currentAuthStateSignature;
    if (consumeInternalAuthTransition(windowLike)) return;
    reloadScheduled = true;
    try {
      runtime.clearModeSession(modeKey);
    } catch (_err) {}
    try {
      windowLike.location.reload();
    } catch (_err) {}
  };

  windowLike.addEventListener("pageshow", reloadForAuthTransition);
  windowLike.addEventListener("focus", reloadForAuthTransition);
  windowLike.addEventListener("storage", (eventLike: StorageEvent): void => {
    if (eventLike.key && !AUTH_STATE_STORAGE_KEYS.has(eventLike.key)) return;
    reloadForAuthTransition();
  });
}

export function bindRankedSessionPrefetchWarmup(
  windowLike: RankedSessionWindowLike,
  runtime: Pick<RankedSessionRuntime, "ensurePrefetch">,
  modeKey: string | null
): void {
  if (!modeKey || !isRankedModeKey(modeKey)) return;
  if (!readAuthToken(windowLike)) return;
  if (typeof windowLike.addEventListener !== "function") return;

  let warmupInFlight = false;
  const documentLike = windowLike.document;
  const isPageVisible = (): boolean =>
    !documentLike || documentLike.visibilityState === "visible" || !documentLike.visibilityState;

  const warmup = (): void => {
    if (warmupInFlight || !isPageVisible() || !readAuthToken(windowLike)) return;
    warmupInFlight = true;
    void Promise.resolve(runtime.ensurePrefetch(modeKey))
      .catch(() => false)
      .then(() => {
        warmupInFlight = false;
      });
  };

  const scheduleWarmup = (): void => {
    if (!isPageVisible()) return;
    if (typeof windowLike.requestIdleCallback === "function") {
      windowLike.requestIdleCallback(warmup, { timeout: 1_500 });
      return;
    }
    if (typeof windowLike.setTimeout === "function") {
      windowLike.setTimeout(warmup, 0);
      return;
    }
    warmup();
  };

  windowLike.addEventListener("pageshow", scheduleWarmup);
  windowLike.addEventListener("focus", scheduleWarmup);
  windowLike.addEventListener("online", scheduleWarmup);
  if (documentLike && typeof documentLike.addEventListener === "function") {
    documentLike.addEventListener("visibilitychange", scheduleWarmup);
  }
  scheduleWarmup();
}

export async function bootstrapRankedSessionForHomeFamilyPage(
  pageId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  const windowLike = window as unknown as RankedSessionWindowLike;
  const runtime = createRankedSessionRuntime(windowLike, pageId);
  windowLike.RankedSessionRuntime = runtime;
  if (readAuthToken(windowLike)) {
    void runtime.flushAttemptOutbox().catch(() => false);
  }
  const modeKey = runtime.resolvePageModeKey();
  if (!modeKey) return;
  bindRankedSessionAuthTransitionReload(windowLike, runtime, modeKey);
  if (!readAuthToken(windowLike)) return;
  bindRankedSessionPrefetchWarmup(windowLike, runtime, modeKey);

  let activeContext = runtime.getCurrentContext(modeKey);
  if (!activeContext) {
    if (hasResumableLocalSavedStateForMode(windowLike, modeKey)) {
      if (hasRankedBoundLocalSavedStateForMode(windowLike, modeKey)) {
        await runtime.ensurePrefetch(modeKey);
        return;
      }
      if (await runtime.startNextSession(modeKey)) {
        activeContext = runtime.getCurrentContext(modeKey);
      } else {
        await runtime.ensurePrefetch(modeKey);
      }
    } else {
      const prefetchedReady = await runtime.ensurePrefetch(modeKey);
      if (prefetchedReady && runtime.promotePrefetchedSession(modeKey)) {
        activeContext = runtime.getCurrentContext(modeKey);
      }
    }
  }
  if (activeContext) windowLike.GAME_CHALLENGE_CONTEXT = activeContext;
  void runtime.ensurePrefetch(modeKey);
}
