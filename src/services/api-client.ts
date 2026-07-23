import { readStorageValue } from "../storage/browser-storage";

export type JsonRecord = Record<string, unknown>;

export interface LocationLike {
  origin?: string;
}

export interface BuildApiBaseCandidatesOptions {
  locationLike?: LocationLike | null | undefined;
  remoteApiBase?: string;
}

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

export interface JsonApiResult {
  ok: boolean;
  status: number | null;
  body: JsonRecord | null;
  networkError: string | null;
}

export interface JsonApiClient {
  request: (path: string, options?: RequestInit) => Promise<JsonRecord>;
  requestResult: (path: string, options?: RequestInit) => Promise<JsonApiResult>;
}

interface JsonApiExecution {
  result: JsonApiResult;
  legacyError: string | null;
}

const DEFAULT_REMOTE_API_BASE = "https://2048next.cn/api";
export const AUTH_TOKEN_KEY = "2048_auth_token_v1";

function normalizeBase(value: string): string {
  return value.replace(/\/+$/u, "");
}

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

export function buildApiBaseCandidates(options: BuildApiBaseCandidatesOptions = {}): string[] {
  const remoteApiBase = normalizeBase(options.remoteApiBase || DEFAULT_REMOTE_API_BASE);
  const origin = toText(
    options.locationLike?.origin || (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/+$/u, "");
  const bases = origin ? [`${origin}/api`, remoteApiBase] : [remoteApiBase];
  return Array.from(new Set(bases.map(normalizeBase).filter(Boolean)));
}

export function readAuthToken(options: { storageLike?: Storage | null | undefined } = {}): string {
  return readStorageValue(options.storageLike || null, AUTH_TOKEN_KEY) || "";
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
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetchLike(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error("request_timeout");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeHttpStatus(value: unknown): number | null {
  const status = Number(value);
  return Number.isInteger(status) && status >= 0 ? status : null;
}

function isSuccessfulHttpStatus(status: number | null): boolean {
  return status === null || (status >= 200 && status < 300);
}

function createRequestHeaders(requestOptions: RequestInit, token?: string): Headers {
  const headers = new Headers(requestOptions.headers || {});
  if (token) headers.set("Authorization", "Bearer " + token);
  if (shouldUseJsonContentType(requestOptions.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

function createNetworkFailure(message: string): JsonApiExecution {
  return {
    result: { ok: false, status: null, body: null, networkError: message },
    legacyError: message
  };
}

async function executeJsonRequest(
  bases: string[],
  fetchLike: FetchLike | null,
  token: string | undefined,
  timeoutMs: number | undefined,
  path: string,
  requestOptions: RequestInit
): Promise<JsonApiExecution> {
  if (!fetchLike) return createNetworkFailure("fetch_unavailable");
  let lastExecution = createNetworkFailure("api_unavailable");
  for (const base of bases) {
    const headers = createRequestHeaders(requestOptions, token);
    const allowFallback = canTryNextApiBase(requestOptions, headers);
    try {
      const response = await fetchWithTimeout(
        fetchLike,
        base + path,
        { ...requestOptions, headers },
        timeoutMs
      );
      const status = normalizeHttpStatus(response.status);
      const data = (await response.json().catch(() => null)) as JsonRecord | null;
      if (data) {
        const proxyUnavailable = isUnavailableProxyPayload(data);
        lastExecution = {
          result: {
            ok: isSuccessfulHttpStatus(status),
            status,
            body: data,
            networkError: null
          },
          legacyError: proxyUnavailable ? "api_unavailable" : null
        };
        if (proxyUnavailable && allowFallback) continue;
        return lastExecution;
      }
      const responseError = toText(response.statusText || response.status);
      lastExecution = {
        result: { ok: isSuccessfulHttpStatus(status), status, body: null, networkError: null },
        legacyError: responseError
      };
      if (!allowFallback) return lastExecution;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastExecution = createNetworkFailure(message);
      if (!allowFallback) return lastExecution;
    }
  }
  return lastExecution;
}

export function createJsonApiClient(options: JsonApiClientOptions): JsonApiClient {
  const bases = Array.from(new Set(options.bases.map(normalizeBase).filter(Boolean)));
  const fetchLike =
    options.fetchLike ||
    (typeof fetch !== "undefined" ? (fetch.bind(globalThis) as FetchLike) : null);

  return {
    async request(path: string, requestOptions: RequestInit = {}) {
      const execution = await executeJsonRequest(
        bases,
        fetchLike,
        options.token,
        options.timeoutMs,
        path,
        requestOptions
      );
      if (execution.legacyError !== null) {
        return { success: false, error: execution.legacyError };
      }
      return execution.result.body || { success: false, error: "invalid_json_response" };
    },
    async requestResult(path: string, requestOptions: RequestInit = {}) {
      const execution = await executeJsonRequest(
        bases,
        fetchLike,
        options.token,
        options.timeoutMs,
        path,
        requestOptions
      );
      return execution.result;
    }
  };
}
