import { parsePlayModeKey } from "./play-query";
import { resolveStorageByName, safeReadStorageItem, safeSetStorageItem } from "./storage";

const AUTH_TOKEN_STORAGE_KEY = "2048_auth_token_v1";
const AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";
const ACTIVE_SESSION_STORAGE_KEY_PREFIX = "ranked_session_active:v1:";
const PREFETCH_SESSION_STORAGE_KEY_PREFIX = "ranked_session_prefetch:v1:";
const DEFAULT_REMOTE_API_BASE_URL = "https://2048next.cn/api";

const RANKED_MODE_KEYS = new Set([
  "standard_4x4_pow2_no_undo",
  "classic_4x4_pow2_undo",
  "capped_4x4_pow2_no_undo",
  "board_3x3_pow2_no_undo",
  "board_3x3_pow2_undo",
  "board_2x4_pow2_no_undo",
  "board_2x4_pow2_undo",
  "board_3x4_pow2_no_undo",
  "board_3x4_pow2_undo",
  "fib_3x3_no_undo",
  "fib_3x3_undo"
]);

export interface RankedSessionRecord {
  mode_key: string;
  mode_bucket?: string | null | undefined;
  challenge_id: string;
  seed: number;
  ranked_session_token: string;
  issued_at: number;
  exp: number;
  owner_user_id?: string | null | undefined;
}

export interface RankedChallengeContext {
  id: string;
  mode_key: string;
  seed: number;
  ranked_session_token: string;
}

export interface RankedSessionRuntime {
  getCurrentContext: (modeLike?: string | null | undefined) => RankedChallengeContext | null;
  promotePrefetchedSession: (modeLike?: string | null | undefined) => boolean;
  startNextSession: (modeLike?: string | null | undefined) => Promise<boolean>;
  ensurePrefetch: (modeLike?: string | null | undefined) => Promise<boolean>;
  clearActiveSession: (modeLike?: string | null | undefined) => void;
  clearModeSession: (modeLike?: string | null | undefined) => void;
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
  expectedModeKey: string
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
  if (!Number.isInteger(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
  return {
    mode_key: modeKey,
    mode_bucket: typeof parsed.mode_bucket === "string" ? parsed.mode_bucket : null,
    challenge_id: challengeId,
    seed,
    ranked_session_token: rankedSessionToken,
    issued_at: issuedAt,
    exp,
    owner_user_id:
      typeof parsed.owner_user_id === "string" && parsed.owner_user_id.trim()
        ? parsed.owner_user_id.trim()
        : null
  };
}

function readRankedSessionRecord(
  storageLike: Storage | null,
  storageKey: string,
  expectedModeKey: string,
  expectedOwnerUserId: string
): RankedSessionRecord | null {
  const raw = safeReadStorageItem({
    storageLike,
    key: storageKey
  });
  const normalized = normalizeRankedSessionRecord(raw, expectedModeKey);
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
      ownerUserIdResolver()
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
    if (!authToken || !isRankedModeKey(modeKey)) return null;
    const fetchLike = resolveFetchLike(windowLike);
    if (!fetchLike) return null;
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
              body: JSON.stringify({ mode_key: modeKey })
            });
            const payload = (await response.json().catch(() => null)) as {
              success?: boolean;
              data?: Record<string, unknown>;
            } | null;
            if (!response.ok) {
              if (!payload && index < apiBases.length - 1) continue;
              return null;
            }
            if (!payload || payload.success !== true) {
              if (index < apiBases.length - 1) continue;
              return null;
            }
            const session = normalizeRankedSessionRecord(payload.data || null, modeKey);
            return session
              ? {
                  ...session,
                  owner_user_id: ownerUserIdResolver() || null
                }
              : null;
          } catch (_requestErr) {
            if (index >= apiBases.length - 1) {
              return null;
            }
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
    resolvePageModeKey() {
      return pageModeResolver();
    }
  };

  return runtime;
}

export async function bootstrapRankedSessionForHomeFamilyPage(
  pageId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  const windowLike = window as unknown as RankedSessionWindowLike;
  const runtime = createRankedSessionRuntime(windowLike, pageId);
  windowLike.RankedSessionRuntime = runtime;
  const modeKey = runtime.resolvePageModeKey();
  if (!modeKey) return;
  if (!readAuthToken(windowLike)) return;

  let activeContext = runtime.getCurrentContext(modeKey);
  if (!activeContext) {
    const prefetchedReady = await runtime.ensurePrefetch(modeKey);
    if (prefetchedReady && runtime.promotePrefetchedSession(modeKey)) {
      activeContext = runtime.getCurrentContext(modeKey);
    }
  }
  if (activeContext) windowLike.GAME_CHALLENGE_CONTEXT = activeContext;
  void runtime.ensurePrefetch(modeKey);
}
