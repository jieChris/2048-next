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
}

export interface JsonApiClient {
  request: (path: string, options?: RequestInit) => Promise<JsonRecord>;
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

export function createJsonApiClient(options: JsonApiClientOptions): JsonApiClient {
  const bases = Array.from(new Set(options.bases.map(normalizeBase).filter(Boolean)));
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
          const response = await fetchLike(base + path, { ...requestOptions, headers });
          const data = (await response.json().catch(() => null)) as JsonRecord | null;
          if (data) {
            if (isUnavailableProxyPayload(data)) {
              lastError = "api_unavailable";
              continue;
            }
            return data;
          }
          lastError = toText(response.statusText || response.status);
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }
      return { success: false, error: lastError };
    }
  };
}
