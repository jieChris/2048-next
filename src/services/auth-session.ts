import { buildApiBaseCandidates } from "./api-base";

type JsonRecord = Record<string, unknown>;

export const LEGACY_AUTH_TOKEN_KEY = "2048_auth_token_v1";
export const AUTH_USER_ID_KEY = "2048_auth_userId_v1";
export const AUTH_NICKNAME_KEY = "2048_auth_nickname_v1";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface AuthSessionOptions {
  bases?: string[];
  fetchLike?: FetchLike;
  storageLike?: Storage | null;
}

export type AuthRestoreResult =
  | { status: "authenticated"; user: JsonRecord | null }
  | { status: "unauthenticated"; code: string }
  | { status: "transient_error"; code: string };

export interface AuthSessionRuntime {
  getAuthToken: (options?: { storageLike?: Storage | null }) => string;
  setAuthSession: (payload: JsonRecord, options?: { storageLike?: Storage | null }) => void;
  clearAuthSession: (options?: { storageLike?: Storage | null }) => void;
  restoreAuthSession: (options?: AuthSessionOptions) => Promise<AuthRestoreResult>;
  fetchWithAuth: (
    input: string,
    init?: RequestInit,
    options?: AuthSessionOptions,
  ) => Promise<Response>;
}

declare global {
  interface Window {
    AuthSessionRuntime?: AuthSessionRuntime;
  }
}

const TERMINAL_AUTH_CODES = new Set([
  "ACCOUNT_DELETED",
  "ACCOUNT_INACTIVE",
  "ACCOUNT_PENDING_DELETION",
  "INVALID_TOKEN",
  "SESSION_REVOKED",
  "TOKEN_EXPIRED",
  "TOKEN_REDEEMED",
  "TOKEN_REVOKED",
  "UNAUTHORIZED",
]);

let accessToken = "";
let accessTokenExpiresAt = 0;
let restorePromise: Promise<AuthRestoreResult> | null = null;

function defaultStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch (_error) {
    return null;
  }
}

function storage(options?: { storageLike?: Storage | null }): Storage | null {
  return options && "storageLike" in options ? options.storageLike || null : defaultStorage();
}

function read(storageLike: Storage | null, key: string): string {
  try {
    return String(storageLike?.getItem(key) || "").trim();
  } catch (_error) {
    return "";
  }
}

function write(storageLike: Storage | null, key: string, value: unknown): void {
  try {
    const normalized = String(value ?? "").trim();
    if (normalized) storageLike?.setItem(key, normalized);
    else storageLike?.removeItem(key);
  } catch (_error) {}
}

function notifyAuthChanged(): void {
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("auth-session-change"));
  } catch (_error) {}
}

function responseCode(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  return String((data as JsonRecord).code || "").trim().toUpperCase();
}

async function readResponseJson(response: Response): Promise<JsonRecord | null> {
  try {
    const data = await response.clone().json();
    return data && typeof data === "object" && !Array.isArray(data) ? data as JsonRecord : null;
  } catch (_error) {
    return null;
  }
}

function resolveFetch(options: AuthSessionOptions): FetchLike | null {
  if (options.fetchLike) return options.fetchLike;
  return typeof fetch === "function" ? fetch.bind(globalThis) : null;
}

function resolveBases(options: AuthSessionOptions): string[] {
  const bases = options.bases?.length
    ? options.bases
    : buildApiBaseCandidates({
      locationLike: typeof window !== "undefined" ? window.location : null,
    });
  return Array.from(new Set(bases.map((base) => String(base || "").replace(/\/+$/u, "")).filter(Boolean)));
}

export function getAuthToken(options: { storageLike?: Storage | null } = {}): string {
  return accessToken || read(storage(options), LEGACY_AUTH_TOKEN_KEY);
}

export function setAuthSession(payload: JsonRecord, options: { storageLike?: Storage | null } = {}): void {
  const storageLike = storage(options);
  const user = payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)
    ? payload.user as JsonRecord
    : null;
  accessToken = String(payload.token || "").trim();
  accessTokenExpiresAt = Math.floor(Number(payload.expiresAt || payload.expires_at || 0));
  write(storageLike, LEGACY_AUTH_TOKEN_KEY, "");
  write(storageLike, AUTH_USER_ID_KEY, user?.id ?? payload.userId ?? payload.user_id ?? payload.id);
  write(storageLike, AUTH_NICKNAME_KEY, user?.nickname ?? payload.nickname);
  notifyAuthChanged();
}

export function clearAuthSession(options: { storageLike?: Storage | null } = {}): void {
  const storageLike = storage(options);
  accessToken = "";
  accessTokenExpiresAt = 0;
  write(storageLike, LEGACY_AUTH_TOKEN_KEY, "");
  write(storageLike, AUTH_USER_ID_KEY, "");
  write(storageLike, AUTH_NICKNAME_KEY, "");
  notifyAuthChanged();
}

export function restoreAuthSession(options: AuthSessionOptions = {}): Promise<AuthRestoreResult> {
  if (restorePromise) return restorePromise;
  const pending = (async (): Promise<AuthRestoreResult> => {
    const fetchLike = resolveFetch(options);
    if (!fetchLike) return { status: "transient_error", code: "FETCH_UNAVAILABLE" };
    const storageLike = storage(options);
    const legacyToken = read(storageLike, LEGACY_AUTH_TOKEN_KEY);
    let lastCode = "NETWORK_ERROR";

    for (const base of resolveBases(options)) {
      try {
        const headers = new Headers();
        let body: string | undefined;
        if (legacyToken) {
          headers.set("Authorization", `Bearer ${legacyToken}`);
          headers.set("Content-Type", "application/json");
          body = JSON.stringify({ token: legacyToken });
        }
        const response = await fetchLike(`${base}/auth/refresh`, {
          method: "POST",
          headers,
          body,
          credentials: "include",
        });
        const data = await readResponseJson(response);
        const code = responseCode(data) || `HTTP_${response.status}`;
        if (response.ok && data?.success === true && data.token) {
          setAuthSession(data, { storageLike });
          return {
            status: "authenticated",
            user: data.user && typeof data.user === "object" ? data.user as JsonRecord : null,
          };
        }
        if (response.status >= 500 || code === "AUTH_STATE_UNAVAILABLE") {
          return { status: "transient_error", code };
        }
        if (TERMINAL_AUTH_CODES.has(code)) {
          clearAuthSession({ storageLike });
          return { status: "unauthenticated", code };
        }
        lastCode = code;
      } catch (_error) {
        lastCode = "NETWORK_ERROR";
      }
    }
    return { status: "transient_error", code: lastCode };
  })().finally(() => {
    restorePromise = null;
  });
  restorePromise = pending;
  return pending;
}

export async function fetchWithAuth(
  input: string,
  init: RequestInit = {},
  options: AuthSessionOptions = {},
): Promise<Response> {
  const fetchLike = resolveFetch(options);
  if (!fetchLike) throw new Error("fetch_unavailable");
  const storageLike = storage(options);
  const send = (token: string): Promise<Response> => {
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetchLike(input, { ...init, headers, credentials: init.credentials || "include" });
  };

  let response = await send(getAuthToken({ storageLike }));
  let data = await readResponseJson(response);
  let code = responseCode(data);
  if (response.status === 401 && code === "TOKEN_EXPIRED") {
    const restored = await restoreAuthSession({ ...options, storageLike });
    if (restored.status === "authenticated") {
      response = await send(getAuthToken({ storageLike }));
      data = await readResponseJson(response);
      code = responseCode(data);
    }
  }
  if (TERMINAL_AUTH_CODES.has(code)) clearAuthSession({ storageLike });
  return response;
}

export function authTokenExpiresAt(): number {
  return accessTokenExpiresAt;
}

if (typeof window !== "undefined") {
  window.AuthSessionRuntime = {
    getAuthToken,
    setAuthSession,
    clearAuthSession,
    restoreAuthSession,
    fetchWithAuth,
  };
}
