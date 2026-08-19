import { getAuthToken } from "./auth-session";
import {
  buildApiBaseCandidates,
  normalizeApiBase,
  type LocationLike,
} from "./api-base";

export { buildApiBaseCandidates, type BuildApiBaseCandidatesOptions, type LocationLike } from "./api-base";

export type JsonRecord = Record<string, unknown>;

export type FetchLike = (
  input: string,
  init?: RequestInit
) => Promise<{
  status?: number;
  statusText?: string;
  json: () => Promise<unknown>;
}>;

export interface JsonApiClientOptions {
  bases: string[];
  fetchLike?: FetchLike;
  token?: string;
  /**
   * Per-request timeout in milliseconds. When set (and AbortController is
   * available) a request that neither resolves nor rejects — e.g. a backend
   * that accepts the TCP connection but never responds — is aborted so callers
   * never hang forever. Off by default to preserve existing behavior.
   */
  timeoutMs?: number;
}

export interface JsonApiClient {
  request: (path: string, options?: RequestInit) => Promise<JsonRecord>;
}

export interface RequestLogoutOptions {
  locationLike?: LocationLike | null | undefined;
  fetchLike?: FetchLike;
}

export const AUTH_TOKEN_KEY = "2048_auth_token_v1";

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function shouldUseJsonContentType(body: unknown): boolean {
  if (body === undefined || body === null) return false;
  if (typeof FormData !== "undefined" && body instanceof FormData) return false;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return false;
  if (typeof Blob !== "undefined" && body instanceof Blob) return false;
  return true;
}

function isUnavailableProxyPayload(data: JsonRecord): boolean {
  return data.success === false && toText(data.error || data.code) === "api_unavailable";
}

function requestMethod(options: RequestInit): string {
  return toText(options.method || "GET").trim().toUpperCase() || "GET";
}

function canTryNextApiBase(options: RequestInit, headers: Headers): boolean {
  return requestMethod(options) === "GET" && !headers.has("Authorization");
}

export function readAuthToken(options: { storageLike?: Storage | null | undefined } = {}): string {
  return getAuthToken({ storageLike: options.storageLike || null });
}

export async function requestLogout(options: RequestLogoutOptions = {}): Promise<JsonRecord> {
  const client = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: options.locationLike }),
    fetchLike: options.fetchLike,
    timeoutMs: 1500
  });
  return client.request("/logout", { method: "POST" });
}

async function fetchWithTimeout(
  fetchLike: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs?: number
): Promise<Awaited<ReturnType<FetchLike>>> {
  if (!timeoutMs || typeof AbortController === "undefined") {
    return fetchLike(url, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchLike(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function createJsonApiClient(options: JsonApiClientOptions): JsonApiClient {
  const bases = Array.from(new Set(options.bases.map(normalizeApiBase).filter(Boolean)));
  const fetchLike =
    options.fetchLike ||
    (typeof fetch !== "undefined" ? (fetch.bind(globalThis) as FetchLike) : null);

  return {
    async request(path: string, requestOptions: RequestInit = {}) {
      if (!fetchLike) {
        return { success: false, error: "fetch_unavailable" };
      }
      let lastError = "api_unavailable";
      for (const base of bases) {
        try {
          const headers = new Headers(requestOptions.headers || {});
          if (options.token) headers.set("Authorization", "Bearer " + options.token);
          if (shouldUseJsonContentType(requestOptions.body) && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
          }
          const allowFallback = canTryNextApiBase(requestOptions, headers);
          const response = await fetchWithTimeout(fetchLike, base + path, {
            ...requestOptions,
            headers,
            credentials: requestOptions.credentials || "include",
          }, options.timeoutMs);
          const data = (await response.json().catch(() => null)) as JsonRecord | null;
          if (data) {
            if (isUnavailableProxyPayload(data)) {
              lastError = "api_unavailable";
              if (allowFallback) continue;
            }
            return data;
          }
          lastError = toText(response.statusText || response.status);
          if (!allowFallback) break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          const headers = new Headers(requestOptions.headers || {});
          if (options.token) headers.set("Authorization", "Bearer " + options.token);
          if (!canTryNextApiBase(requestOptions, headers)) break;
        }
      }
      return { success: false, error: lastError };
    }
  };
}
