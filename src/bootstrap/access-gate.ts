import { removeStorageValue } from "../storage/browser-storage";
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
export const BETA_ACCESS_LOCAL_FORCE_GATE_KEY = "2048_beta_access_force_gate_local_v1";
// 2026-07-30 13:15:00–13:25:00 Asia/Shanghai (UTC+8).
export const BETA_ACCESS_GATE_TEST_START_MS = 1785388500000;
export const BETA_ACCESS_GATE_TEST_END_MS = 1785389100000;
// 2026-08-01 00:00:00 Asia/Shanghai (UTC+8).
export const BETA_ACCESS_GATE_RELEASE_AT_MS = 1785513600000;
// Mirrored by public/js/beta_access_preload.js (GATE_PAGE_VERSION) — keep in sync
// so the preload's no-token redirect builds the exact same login URL.
const BETA_GATE_PAGE_VERSION = "20260627-02";
export const BETA_ACCESS_EXEMPT_PAGE_IDS = new Set(["beta-login", "beta-access", "admin", "cache-reset"]);
// Upper bound for the /access/me check. A backend that accepts the connection
// but never responds must not leave the page hidden forever.
export const BETA_ACCESS_CHECK_TIMEOUT_MS = 6000;

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

function resolveDocument(options: BetaAccessGateOptions): Document | null {
  return options.documentLike || (typeof document !== "undefined" ? document : null);
}

function resolveWindow(options: BetaAccessGateOptions): Window | null {
  return options.windowLike || (typeof window !== "undefined" ? window : null);
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/u, "").split("/").pop() || "";
}

function isLocalDevelopmentHost(windowLike: Window | null): boolean {
  const hostname = toText(windowLike?.location?.hostname).toLowerCase();
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1" || hostname === "[::1]";
}

function shouldForceBetaGateForLocalDevelopment(windowLike: Window | null, storageLike: Storage | null): boolean {
  if (!isLocalDevelopmentHost(windowLike)) return false;
  try {
    return storageLike?.getItem(BETA_ACCESS_LOCAL_FORCE_GATE_KEY) === "1";
  } catch (_err) {
    return false;
  }
}

export function isBetaAccessGateOpen(nowMs = Date.now()): boolean {
  return (
    (nowMs >= BETA_ACCESS_GATE_TEST_START_MS && nowMs < BETA_ACCESS_GATE_TEST_END_MS)
    || nowMs >= BETA_ACCESS_GATE_RELEASE_AT_MS
  );
}

export function shouldBypassBetaGateForLocalDevelopment(
  windowLike: Window | null,
  storageLike: Storage | null
): boolean {
  return isLocalDevelopmentHost(windowLike) && !shouldForceBetaGateForLocalDevelopment(windowLike, storageLike);
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
    // Current preloads no longer hide the document, but HTML/preload versions can
    // be cached independently — keep clearing `hidden` for older cached preloads.
    root.removeAttribute("hidden");
  }
  root?.removeAttribute("data-beta-access-pending");
  documentLike?.body?.removeAttribute("data-beta-access-pending");
}

function maskProtectedDocument(documentLike: Document | null): void {
  // A definitive "no access" answer arrived while the page was already painted
  // (paint-first gate). Hide the content for the brief moment until the
  // redirect below commits, so the denied visitor cannot keep interacting.
  documentLike?.documentElement?.setAttribute("hidden", "");
}

export function normalizeAccessStatus(payload: JsonRecord): BetaAccessStatus {
  const data = toRecord(payload.data);
  return {
    authenticated: toBool(data.authenticated),
    userId: Number(data.userId || data.user_id || 0),
    email: toText(data.email),
    role: toText(data.role),
    superAdmin: toBool(data.superAdmin || data.super_admin),
    allowlisted: toBool(data.allowlisted),
    noticeAccepted: toBool(data.noticeAccepted || data.notice_accepted),
    noticeVersion: toText(data.noticeVersion || data.notice_version || ACTIVE_BETA_NOTICE_VERSION),
    canAccessProduct: toBool(data.canAccessProduct || data.can_access_product)
  };
}

export function shouldRunBetaAccessGate(pageId: string): boolean {
  return !BETA_ACCESS_EXEMPT_PAGE_IDS.has(toText(pageId).trim().toLowerCase());
}

export async function fetchBetaAccessStatus(options: BetaAccessGateOptions = {}): Promise<{
  payload: JsonRecord;
  status: BetaAccessStatus | null;
  unauthorized: boolean;
  transient: boolean;
}> {
  const windowLike = resolveWindow(options);
  const storageLike = options.storageLike === undefined ? windowLike?.localStorage || null : options.storageLike;
  const token = readAuthToken({ storageLike });
  if (!token) {
    return { payload: { success: false, code: "NO_TOKEN" }, status: null, unauthorized: true, transient: false };
  }

  const client = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: windowLike?.location }),
    fetchLike: options.fetchLike,
    token,
    timeoutMs: BETA_ACCESS_CHECK_TIMEOUT_MS
  });
  const payload = await client.request("/access/me", { method: "GET" });
  if (payload.success === false) {
    const code = toText(payload.code).toUpperCase();
    if (code === "UNAUTHORIZED" || code === "INVALID_TOKEN") {
      return { payload, status: null, unauthorized: true, transient: false };
    }
    // A failure without a recognized API code means the request could not be
    // completed (network error / timeout / proxy unavailable) rather than an
    // authoritative "you are blocked" answer. Treat it as transient so the gate
    // degrades gracefully instead of wrongly bouncing a valid user.
    return { payload, status: null, unauthorized: false, transient: true };
  }
  return { payload, status: normalizeAccessStatus(payload), unauthorized: false, transient: false };
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
  if (shouldBypassBetaGateForLocalDevelopment(windowLike, storageLike)) {
    revealProtectedDocument(documentLike);
    return { allowed: true };
  }
  if (isBetaAccessGateOpen() && !shouldForceBetaGateForLocalDevelopment(windowLike, storageLike)) {
    revealProtectedDocument(documentLike);
    return { allowed: true };
  }

  // The preload no longer hides the page while this check runs: the static
  // board is already painted. This gate decides asynchronously whether to let
  // the runtime initialize (allowed) or to mask + redirect (definitive denial).
  const access = await fetchBetaAccessStatus({ ...options, windowLike: windowLike || undefined, storageLike });
  if (access.unauthorized) {
    removeStorageValue(storageLike, AUTH_TOKEN_KEY);
    maskProtectedDocument(documentLike);
    safeNavigate(windowLike, buildGateHref("beta-login.html", windowLike, "login"));
    return { allowed: false };
  }
  if (access.transient) {
    // Could not reach the access service. Keep the already painted client-side
    // game in a degraded mode rather than white-screening or falsely
    // redirecting a valid beta user. The backend-gated features
    // (leaderboard/account) simply stay unavailable until connectivity
    // returns. This keeps the token so a later navigation re-checks access.
    revealProtectedDocument(documentLike);
    return { allowed: true };
  }

  const status = access.status;
  if (!status || (!status.superAdmin && !status.allowlisted)) {
    maskProtectedDocument(documentLike);
    safeNavigate(windowLike, buildGateHref("beta-access.html", windowLike, "blocked"));
    return { allowed: false };
  }
  if (!status.noticeAccepted || !status.canAccessProduct) {
    maskProtectedDocument(documentLike);
    safeNavigate(windowLike, buildGateHref("beta-access.html", windowLike, "notice"));
    return { allowed: false };
  }

  revealProtectedDocument(documentLike);
  return { allowed: true };
}
