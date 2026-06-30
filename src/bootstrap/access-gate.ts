import { removeStorageValue, writeStorageValue } from "../storage/browser-storage";
import {
  AUTH_TOKEN_KEY,
  buildApiBaseCandidates,
  createJsonApiClient,
  readAuthToken,
  type FetchLike,
  type JsonRecord
} from "../services/api-client";

export const ACTIVE_BETA_NOTICE_VERSION = "beta_notice_2026_06_26_v1";
export const BETA_ACCESS_SMOKE_BYPASS_KEY = "2048_beta_access_smoke_bypass_v1";
const BETA_GATE_PAGE_VERSION = "20260627-02";
export const BETA_ACCESS_EXEMPT_PAGE_IDS = new Set(["beta-login", "beta-access", "admin", "cache-reset"]);
const AUTH_USER_ID_KEY = "2048_auth_userId_v1";
const AUTH_NICKNAME_KEY = "2048_auth_nickname_v1";

export interface BetaAccessGateResult {
  allowed: boolean;
}

export interface BetaAccessGateOptions {
  documentLike?: Document;
  windowLike?: Window;
  storageLike?: Storage | null;
  fetchLike?: FetchLike;
}

export interface BetaAccessStatus {
  authenticated: boolean;
  userId: number;
  email: string;
  nickname: string;
  role: string;
  superAdmin: boolean;
  allowlisted: boolean;
  noticeAccepted: boolean;
  noticeVersion: string;
  canAccessProduct: boolean;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function firstPresentText(...values: unknown[]): string {
  for (const value of values) {
    if (value !== null && value !== undefined) return toText(value).trim();
  }
  return "";
}

function resolveDocument(options: BetaAccessGateOptions): Document | null {
  return options.documentLike || (typeof document !== "undefined" ? document : null);
}

function resolveWindow(options: BetaAccessGateOptions): Window | null {
  return options.windowLike || (typeof window !== "undefined" ? window : null);
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/u, "").split("/").pop() || "";
}

function isLocalSmokeHost(windowLike: Window | null): boolean {
  const hostname = toText(windowLike?.location?.hostname).toLowerCase();
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1" || hostname === "[::1]";
}

function shouldBypassBetaGateForSmoke(windowLike: Window | null, storageLike: Storage | null): boolean {
  if (!isLocalSmokeHost(windowLike)) return false;
  try {
    return storageLike?.getItem(BETA_ACCESS_SMOKE_BYPASS_KEY) === "1";
  } catch (_err) {
    return false;
  }
}

function resolveCurrentPageHref(windowLike: Window | null): string {
  if (!windowLike?.location) return "";
  return `${windowLike.location.pathname || ""}${windowLike.location.search || ""}${windowLike.location.hash || ""}`;
}

function buildGateHref(page: "beta-login.html" | "beta-access.html", windowLike: Window | null, state: string): string {
  const params = new URLSearchParams();
  params.set("gate_v", BETA_GATE_PAGE_VERSION);
  const next = resolveCurrentPageHref(windowLike);
  if (next) params.set("next", next);
  if (state) params.set("state", state);
  const query = params.toString();
  return query ? `${page}?${query}` : page;
}

function safeNavigate(windowLike: Window | null, href: string): void {
  try {
    windowLike?.location.replace(href);
  } catch (_err) {
    try {
      if (windowLike) windowLike.location.href = href;
    } catch (_ignore) {
      // Navigation can be unavailable in unit tests.
    }
  }
}

function revealProtectedDocument(documentLike: Document | null): void {
  const root = documentLike?.documentElement || null;
  if (root?.getAttribute("data-beta-access-pending") === "1") {
    root.removeAttribute("hidden");
  }
  root?.removeAttribute("data-beta-access-pending");
  documentLike?.body?.removeAttribute("data-beta-access-pending");
}

export function normalizeAccessStatus(payload: JsonRecord): BetaAccessStatus {
  const data = toRecord(payload.data);
  return {
    authenticated: toBool(data.authenticated),
    userId: Number(data.userId ?? data.user_id ?? 0),
    email: toText(data.email),
    nickname: toText(data.nickname),
    role: toText(data.role),
    superAdmin: toBool(data.superAdmin || data.super_admin),
    allowlisted: toBool(data.allowlisted),
    noticeAccepted: toBool(data.noticeAccepted || data.notice_accepted),
    noticeVersion: toText(data.noticeVersion || data.notice_version || ACTIVE_BETA_NOTICE_VERSION),
    canAccessProduct: toBool(data.canAccessProduct || data.can_access_product)
  };
}

function syncLocalIdentityFromAccessPayload(payload: JsonRecord, storageLike: Storage | null): void {
  const data = toRecord(payload.data);
  const user = toRecord(payload.user);
  const userId = firstPresentText(data.userId, data.user_id, user.id, payload.userId, payload.user_id);
  const nickname = firstPresentText(
    data.nickname,
    data.displayName,
    data.display_name,
    user.nickname,
    user.displayName,
    user.display_name,
    payload.nickname,
    payload.displayName,
    payload.display_name
  );
  let previousUserId = "";
  try {
    previousUserId = toText(storageLike?.getItem(AUTH_USER_ID_KEY)).trim();
  } catch (_err) {
    previousUserId = "";
  }
  if (userId) writeStorageValue(storageLike, AUTH_USER_ID_KEY, userId);
  if (nickname) {
    writeStorageValue(storageLike, AUTH_NICKNAME_KEY, nickname);
  } else if (userId && previousUserId && previousUserId !== userId) {
    removeStorageValue(storageLike, AUTH_NICKNAME_KEY);
  }
}

export function shouldRunBetaAccessGate(pageId: string): boolean {
  return !BETA_ACCESS_EXEMPT_PAGE_IDS.has(toText(pageId).trim().toLowerCase());
}

export async function fetchBetaAccessStatus(options: BetaAccessGateOptions = {}): Promise<{
  payload: JsonRecord;
  status: BetaAccessStatus | null;
  unauthorized: boolean;
}> {
  const windowLike = resolveWindow(options);
  const storageLike = options.storageLike === undefined ? windowLike?.localStorage || null : options.storageLike;
  const token = readAuthToken({ storageLike });
  if (!token) {
    return { payload: { success: false, code: "NO_TOKEN" }, status: null, unauthorized: true };
  }

  const client = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: windowLike?.location }),
    fetchLike: options.fetchLike,
    token
  });
  const payload = await client.request("/access/me", { method: "GET" });
  if (payload.success === false) {
    const code = toText(payload.code).toUpperCase();
    return {
      payload,
      status: null,
      unauthorized: code === "UNAUTHORIZED" || code === "INVALID_TOKEN"
    };
  }
  return { payload, status: normalizeAccessStatus(payload), unauthorized: false };
}

export async function acceptBetaNotice(options: BetaAccessGateOptions & { noticeVersion?: string } = {}): Promise<{
  payload: JsonRecord;
  status: BetaAccessStatus | null;
}> {
  const windowLike = resolveWindow(options);
  const storageLike = options.storageLike === undefined ? windowLike?.localStorage || null : options.storageLike;
  const token = readAuthToken({ storageLike });
  if (!token) return { payload: { success: false, code: "NO_TOKEN" }, status: null };

  const client = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: windowLike?.location }),
    fetchLike: options.fetchLike,
    token
  });
  const payload = await client.request("/access/beta-notice/accept", {
    method: "POST",
    body: JSON.stringify({
      notice_version: options.noticeVersion || ACTIVE_BETA_NOTICE_VERSION
    })
  });
  return {
    payload,
    status: payload.success === false ? null : normalizeAccessStatus(payload)
  };
}

export async function runBetaAccessGate(
  pageId: string,
  options: BetaAccessGateOptions = {}
): Promise<BetaAccessGateResult> {
  const documentLike = resolveDocument(options);
  const windowLike = resolveWindow(options);
  if (!shouldRunBetaAccessGate(pageId)) {
    revealProtectedDocument(documentLike);
    return { allowed: true };
  }
  const currentPage = normalizePathname(toText(windowLike?.location?.pathname));
  if (currentPage === "beta-login.html" || currentPage === "beta-access.html") {
    revealProtectedDocument(documentLike);
    return { allowed: true };
  }

  const storageLike = options.storageLike === undefined ? windowLike?.localStorage || null : options.storageLike;
  if (shouldBypassBetaGateForSmoke(windowLike, storageLike)) {
    revealProtectedDocument(documentLike);
    return { allowed: true };
  }

  const access = await fetchBetaAccessStatus({ ...options, windowLike: windowLike || undefined, storageLike });
  if (access.unauthorized) {
    removeStorageValue(storageLike, AUTH_TOKEN_KEY);
    safeNavigate(windowLike, buildGateHref("beta-login.html", windowLike, "login"));
    return { allowed: false };
  }

  const status = access.status;
  if (status) syncLocalIdentityFromAccessPayload(access.payload, storageLike);
  if (!status || (!status.superAdmin && !status.allowlisted)) {
    safeNavigate(windowLike, buildGateHref("beta-access.html", windowLike, "blocked"));
    return { allowed: false };
  }
  if (!status.noticeAccepted || !status.canAccessProduct) {
    safeNavigate(windowLike, buildGateHref("beta-access.html", windowLike, "notice"));
    return { allowed: false };
  }

  revealProtectedDocument(documentLike);
  return { allowed: true };
}
