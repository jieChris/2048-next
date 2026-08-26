import {
  AUTH_USER_ID_KEY,
  getAuthToken,
  fetchWithAuth,
  type AuthSessionOptions,
} from "../../services/auth-session";
import { buildApiBaseCandidates } from "../../services/api-base";

export const ACCOUNT_PALETTE_SESSION_CONTRACT = "account-palette-sync-v2.1" as const;
export const ACCOUNT_PALETTE_SESSION_CACHE_SCHEMA = 1 as const;
const SESSION_CACHE_PREFIX = "account_palette_session_v2:";
const MAX_KNOWN_PALETTE_IDS = 10;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type WindowLike = Pick<Window, "addEventListener"> & {
  BroadcastChannel?: typeof BroadcastChannel;
  ThemeManager?: Record<string, unknown>;
};
type FetchLike = typeof fetch;

type PaletteSelectionKind = "pending" | "follow_theme" | "builtin" | "custom";

export interface AccountPaletteSelectionState {
  selection: {
    kind: PaletteSelectionKind;
    paletteId: string | null;
  };
  revision: number;
  updatedAt: string | null;
}

export interface AccountPaletteRecord {
  paletteId: string;
  revision: number;
  palette: Record<string, unknown>;
  contentHash: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AccountPaletteLibraryState {
  palettes: AccountPaletteRecord[];
  order: {
    paletteIds: string[];
    revision: number;
    updatedAt: string | null;
  };
  selection: AccountPaletteSelectionState;
  tombstones: Array<Record<string, unknown>>;
  changes: Array<Record<string, unknown>>;
  nextCursor: string;
  hasMore: boolean;
  resetRequired: boolean;
}

export interface AccountPaletteSessionSnapshot {
  accountId: number;
  contractVersion: typeof ACCOUNT_PALETTE_SESSION_CONTRACT;
  selection: AccountPaletteSelectionState;
  selectedPalette: AccountPaletteRecord | null;
  library: AccountPaletteLibraryState | null;
  bootstrapCompleted: boolean;
  libraryLoaded: boolean;
  lastError: string | null;
}

export type AccountPaletteSessionResult =
  | { status: "guest"; snapshot: null }
  | { status: "cached" | "synced" | "failed"; snapshot: AccountPaletteSessionSnapshot; code?: string };

export interface AccountPaletteSessionController {
  bootstrap(): Promise<AccountPaletteSessionResult>;
  loadLibrary(): Promise<AccountPaletteSessionResult>;
  snapshot(): AccountPaletteSessionSnapshot | null;
  applyToThemeManager(themeManager: Record<string, unknown> | null | undefined): boolean;
  reset(): void;
}

export interface AccountPaletteSessionOptions {
  storageLike?: StorageLike | null;
  sessionStorageLike?: StorageLike | null;
  windowLike?: WindowLike | null;
  fetchLike?: FetchLike;
  bases?: string[];
  accountId?: number | null;
}

interface StoredSessionState {
  schema: typeof ACCOUNT_PALETTE_SESSION_CACHE_SCHEMA;
  snapshot: AccountPaletteSessionSnapshot;
}

function clone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    throw new Error("account_palette_session_clone_failed", { cause: error });
  }
}

function authStorage(storageLike: StorageLike | null | undefined): Storage | null {
  // SAFETY: AuthSession only accesses getItem/setItem/removeItem, the complete Storage interface is not otherwise observed.
  return storageLike as Storage | null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function safeInteger(value: unknown, minimum = 0): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
}

function storageKey(accountId: number): string {
  return `${SESSION_CACHE_PREFIX}${accountId}:${ACCOUNT_PALETTE_SESSION_CONTRACT}`;
}
function readStorage(storageLike: StorageLike | null | undefined, key: string): string {
  try {
    return text(storageLike?.getItem(key)).trim();
  } catch {
    return "";
  }
}

function writeStorage(storageLike: StorageLike | null | undefined, key: string, value: string): void {
  try {
    if (value) storageLike?.setItem(key, value);
    else storageLike?.removeItem(key);
  } catch {
    // Storage is an optimization and may be unavailable in private mode.
  }
}

function sessionMarkerKey(accountId: number): string {
  return `${SESSION_CACHE_PREFIX}completed:${accountId}:${ACCOUNT_PALETTE_SESSION_CONTRACT}`;
}


function resolveAccountId(options: AccountPaletteSessionOptions): number | null {
  if (options.accountId !== undefined) {
    return Number.isSafeInteger(options.accountId) && Number(options.accountId) >= 0
      ? Number(options.accountId)
      : null;
  }
  const token = getAuthToken({ storageLike: authStorage(options.storageLike) });
  const raw = readStorage(options.storageLike, AUTH_USER_ID_KEY);
  const id = safeInteger(raw, 0);
  return token && id != null ? id : null;
}

function defaultSelection(): AccountPaletteSelectionState {
  return {
    selection: { kind: "pending", paletteId: null },
    revision: 0,
    updatedAt: null,
  };
}

function parseSelection(value: unknown): AccountPaletteSelectionState | null {
  const source = record(value);
  const selection = record(source?.selection);
  const kind = text(selection?.kind) as PaletteSelectionKind;
  if (!("pending follow_theme builtin custom" as string).split(" ").includes(kind)) return null;
  const revision = safeInteger(source?.revision, 0);
  if (revision == null) return null;
  return {
    selection: {
      kind,
      paletteId: selection?.paletteId == null ? null : text(selection.paletteId),
    },
    revision,
    updatedAt: source?.updatedAt == null ? null : text(source.updatedAt),
  };
}

function parsePaletteRecord(value: unknown): AccountPaletteRecord | null {
  const source = record(value);
  const palette = record(source?.palette);
  const revision = safeInteger(source?.revision, 1);
  const paletteId = text(source?.paletteId).trim();
  if (!palette || revision == null || !paletteId) return null;
  return {
    paletteId,
    revision,
    palette: clone(palette),
    contentHash: text(source?.contentHash),
    createdAt: source?.createdAt == null ? null : text(source.createdAt),
    updatedAt: source?.updatedAt == null ? null : text(source.updatedAt),
  };
}

function parseBootstrapResponse(value: unknown): {
  selection: AccountPaletteSelectionState;
  selectedPalette: AccountPaletteRecord | null;
} | null {
  const body = record(value);
  const data = record(body?.data);
  const selection = parseSelection(data?.selection);
  if (!selection) return null;
  const selectedPalette = data?.selectedPalette == null ? null : parsePaletteRecord(data.selectedPalette);
  if (data?.selectedPalette != null && !selectedPalette) return null;
  if (selection.selection.kind === "custom" && !selectedPalette) return null;
  return { selection, selectedPalette };
}

function parseLibraryResponse(value: unknown): AccountPaletteLibraryState | null {
  const body = record(value);
  const data = record(body?.data);
  const selection = parseSelection(data?.selection);
  const order = record(data?.order);
  const palettes = Array.isArray(data?.palettes)
    ? data.palettes.map(parsePaletteRecord).filter((item): item is AccountPaletteRecord => item !== null)
    : null;
  const nextCursor = text(data?.nextCursor);
  if (!selection || !order || !palettes || !nextCursor) return null;
  const revision = safeInteger(order.revision, 0);
  const paletteIds = Array.isArray(order.paletteIds) ? order.paletteIds.map(text).filter(Boolean) : null;
  if (revision == null || !paletteIds) return null;
  return {
    palettes,
    order: { paletteIds, revision, updatedAt: order.updatedAt == null ? null : text(order.updatedAt) },
    selection,
    tombstones: Array.isArray(data?.tombstones) ? clone(data.tombstones) : [],
    changes: Array.isArray(data?.changes) ? clone(data.changes) : [],
    nextCursor,
    hasMore: data?.hasMore === true,
    resetRequired: data?.resetRequired === true,
  };
}

function readCache(storageLike: StorageLike | null | undefined, accountId: number): AccountPaletteSessionSnapshot | null {
  if (!storageLike) return null;
  try {
    const parsed = record(JSON.parse(storageLike.getItem(storageKey(accountId)) || "null")) as StoredSessionState | null;
    if (parsed?.schema !== ACCOUNT_PALETTE_SESSION_CACHE_SCHEMA || !parsed.snapshot) return null;
    if (parsed.snapshot.accountId !== accountId || parsed.snapshot.contractVersion !== ACCOUNT_PALETTE_SESSION_CONTRACT) return null;
    return clone(parsed.snapshot);
  } catch {
    return null;
  }
}

function writeCache(storageLike: StorageLike | null | undefined, snapshot: AccountPaletteSessionSnapshot): void {
  try {
    storageLike?.setItem(storageKey(snapshot.accountId), JSON.stringify({ schema: ACCOUNT_PALETTE_SESSION_CACHE_SCHEMA, snapshot } satisfies StoredSessionState));
  } catch {
    // Browser storage is an optimization; a quota/private-mode failure must not block play.
  }
}

function postChannelMessage(windowLike: WindowLike | null | undefined, message: Record<string, unknown>): void {
  try {
    if (!windowLike?.BroadcastChannel) return;
    const channel = new windowLike.BroadcastChannel(`${SESSION_CACHE_PREFIX}${ACCOUNT_PALETTE_SESSION_CONTRACT}`);
    channel.postMessage(message);
    channel.close();
  } catch {
    // BroadcastChannel is advisory only.
  }
}

function applySelectionToThemeManager(
  themeManager: Record<string, unknown> | null | undefined,
  snapshot: AccountPaletteSessionSnapshot,
): boolean {
  if (!themeManager) return false;
  const setActive = themeManager.setActiveTilePalette;
  const replace = themeManager.replaceCustomTilePalettes;
  const selection = snapshot.selection.selection;
  if (selection.kind === "pending") return false;
  if (selection.kind === "follow_theme") {
    if (typeof setActive !== "function") return false;
    setActive.call(themeManager, "cold-cyan-steps");
    return true;
  }
  if (selection.kind === "builtin") {
    if (typeof setActive !== "function") return false;
    setActive.call(themeManager, selection.paletteId?.replace(/^builtin:/u, "") || "cold-cyan-steps");
    return true;
  }
  if (!snapshot.selectedPalette || typeof replace !== "function") return false;
  const getCustom = themeManager.getCustomTilePalettes;
  const existing = typeof getCustom === "function" && Array.isArray(getCustom.call(themeManager))
    ? getCustom.call(themeManager) as Array<Record<string, unknown>>
    : [];
  const merged = existing.filter((item) => text(item.id) !== snapshot.selectedPalette?.paletteId);
  merged.push(clone(snapshot.selectedPalette.palette));
  if (replace.call(themeManager, merged, { activePaletteId: snapshot.selectedPalette.paletteId, source: "account-sync" }) !== false) return true;
  return false;
}

export function createAccountPaletteSessionController(
  options: AccountPaletteSessionOptions = {},
): AccountPaletteSessionController {
  const storageLike = options.storageLike ?? (typeof window === "undefined" ? null : window.localStorage);
  const sessionStorageLike = options.sessionStorageLike ?? (typeof window === "undefined" ? null : window.sessionStorage);
  const windowLike: WindowLike | null = options.windowLike ?? (typeof window === "undefined" ? null : window);
  const pageLocation = typeof window !== "undefined" && window.location ? window.location : null;
  const bases = options.bases?.length
    ? options.bases
    : buildApiBaseCandidates({ locationLike: pageLocation });
  let activeKey = "";
  let generation = 0;
  let current: AccountPaletteSessionSnapshot | null = null;
  const bootstrapPromises = new Map<string, Promise<AccountPaletteSessionResult>>();
  const libraryPromises = new Map<string, Promise<AccountPaletteSessionResult>>();
  const bootstrapAttempted = new Set<string>();
  const libraryLoaded = new Set<string>();

  function identity(): { accountId: number; key: string } | null {
    const accountId = resolveAccountId({ ...options, storageLike });
    if (accountId == null) return null;
    return { accountId, key: `${accountId}:${ACCOUNT_PALETTE_SESSION_CONTRACT}` };
  }

  function ensureIdentity(): { accountId: number; key: string } | null {
    const next = identity();
    const nextKey = next?.key || "guest";
    if (nextKey !== activeKey) {
      activeKey = nextKey;
      generation += 1;
      current = next ? readCache(storageLike, next.accountId) : null;
    }
    return next;
  }

  async function fetchJson(path: string): Promise<{ response: Response; body: Record<string, unknown> | null }> {
    const authOptions: AuthSessionOptions = { bases, fetchLike: options.fetchLike, storageLike: authStorage(storageLike) };
    const base = bases[0] || "";
    const response = await fetchWithAuth(`${base}${path}`, { method: "GET", credentials: "include" }, authOptions);
    const body = record(await response.clone().json().catch(() => null));
    return { response, body };
  }

  function failedSnapshot(accountId: number, code: string): AccountPaletteSessionSnapshot {
    return current && current.accountId === accountId
      ? { ...current, lastError: code }
      : {
          accountId,
          contractVersion: ACCOUNT_PALETTE_SESSION_CONTRACT,
          selection: defaultSelection(),
          selectedPalette: null,
          library: null,
          bootstrapCompleted: false,
          libraryLoaded: false,
          lastError: code,
        };
  }

  async function bootstrap(): Promise<AccountPaletteSessionResult> {
    const owner = ensureIdentity();
    if (!owner) return { status: "guest", snapshot: null };
    const key = owner.key;
    const existingPromise = bootstrapPromises.get(key);
    if (existingPromise) return existingPromise;
    if (bootstrapAttempted.has(key) && current) return { status: current.lastError ? "failed" : "cached", snapshot: clone(current), code: current.lastError || undefined };
    bootstrapAttempted.add(key);
    const requestGeneration = generation;
    const cached = current || readCache(storageLike, owner.accountId);
    if (cached) {
      current = cached;
      applySelectionToThemeManager(windowLike?.ThemeManager, cached);
    }
    const sessionCompleted = readStorage(sessionStorageLike, sessionMarkerKey(owner.accountId)) === "1";
    if (sessionCompleted && cached?.bootstrapCompleted) {
      current = cached;
      bootstrapAttempted.add(key);
      return { status: "cached", snapshot: clone(cached) };
    }
    const promise = (async (): Promise<AccountPaletteSessionResult> => {
      try {
        const { response, body } = await fetchJson("/me/palette-sync/bootstrap");
        const parsed = parseBootstrapResponse(body);
        if (!response.ok || body?.success !== true || !parsed) throw new Error(text(body?.code || body?.error || `HTTP_${response.status}`));
        const live = ensureIdentity();
        if (!live || live.key !== key || requestGeneration !== generation) return { status: "failed", snapshot: failedSnapshot(owner.accountId, "STALE_ACCOUNT_PALETTE_RESPONSE"), code: "STALE_ACCOUNT_PALETTE_RESPONSE" };
        current = {
          accountId: owner.accountId,
          contractVersion: ACCOUNT_PALETTE_SESSION_CONTRACT,
          selection: parsed.selection,
          selectedPalette: parsed.selectedPalette,
          library: current?.library || null,
          bootstrapCompleted: true,
          libraryLoaded: current?.libraryLoaded === true,
          lastError: null,
        };
        writeCache(storageLike, current);
        writeStorage(sessionStorageLike, sessionMarkerKey(owner.accountId), "1");
        postChannelMessage(windowLike, { type: "account-palette-bootstrap", accountId: owner.accountId, contractVersion: ACCOUNT_PALETTE_SESSION_CONTRACT });
        applySelectionToThemeManager(windowLike?.ThemeManager, current);
        return { status: "synced", snapshot: clone(current) };
      } catch (error) {
        const code = error instanceof Error ? error.message : "ACCOUNT_PALETTE_BOOTSTRAP_FAILED";
        current = failedSnapshot(owner.accountId, code);
        return { status: "failed", snapshot: clone(current), code };
      }
    })().finally(() => bootstrapPromises.delete(key));
    bootstrapPromises.set(key, promise);
    return promise;
  }

  async function loadLibrary(): Promise<AccountPaletteSessionResult> {
    const bootstrapped = await bootstrap();
    if (bootstrapped.status === "guest" || !bootstrapped.snapshot) return bootstrapped;
    const owner = ensureIdentity();
    if (!owner) return { status: "guest", snapshot: null };
    const key = owner.key;
    if (libraryLoaded.has(key) && current) return { status: "cached", snapshot: clone(current) };
    const existingPromise = libraryPromises.get(key);
    if (existingPromise) return existingPromise;
    const requestGeneration = generation;
    const promise = (async (): Promise<AccountPaletteSessionResult> => {
      try {
        const cursor = current?.library?.nextCursor;
        const knownIds = (current?.library?.palettes || []).map((item) => item.paletteId).slice(0, MAX_KNOWN_PALETTE_IDS);
        const query = new URLSearchParams();
        if (cursor) query.set("cursor", cursor);
        for (const id of knownIds) query.append("known_palette_id", id);
        let { response, body } = await fetchJson(`/me/palettes${query.toString() ? `?${query.toString()}` : ""}`);
        let library = parseLibraryResponse(body);
        if (library?.resetRequired) {
          ({ response, body } = await fetchJson("/me/palettes"));
          library = parseLibraryResponse(body);
        }
        if (!response.ok || body?.success !== true || !library) throw new Error(text(body?.code || body?.error || `HTTP_${response.status}`));
        const live = ensureIdentity();
        if (!live || live.key !== key || requestGeneration !== generation) return { status: "failed", snapshot: failedSnapshot(owner.accountId, "STALE_ACCOUNT_PALETTE_RESPONSE"), code: "STALE_ACCOUNT_PALETTE_RESPONSE" };
        current = {
          accountId: owner.accountId,
          contractVersion: ACCOUNT_PALETTE_SESSION_CONTRACT,
          selection: library.selection,
          selectedPalette: current?.selectedPalette || library.palettes.find((item) => item.paletteId === library.selection.selection.paletteId) || null,
          library,
          bootstrapCompleted: true,
          libraryLoaded: true,
          lastError: null,
        };
        libraryLoaded.add(key);
        writeCache(storageLike, current);
        applySelectionToThemeManager(windowLike?.ThemeManager, current);
        return { status: "synced", snapshot: clone(current) };
      } catch (error) {
        const code = error instanceof Error ? error.message : "ACCOUNT_PALETTE_LIBRARY_FAILED";
        if (current) current = { ...current, lastError: code };
        return { status: "failed", snapshot: current ? clone(current) : bootstrapped.snapshot, code };
      }
    })().finally(() => libraryPromises.delete(key));
    libraryPromises.set(key, promise);
    return promise;
  }

  function reset(): void {
    if (current) writeStorage(sessionStorageLike, sessionMarkerKey(current.accountId), "");
    generation += 1;
    activeKey = "";
    current = null;
    bootstrapAttempted.clear();
    libraryLoaded.clear();
  }

  if (windowLike) {
    windowLike.addEventListener("auth-session-change", () => {
      if (activeKey && activeKey !== "guest") {
        const previousAccountId = Number(activeKey.split(":", 1)[0]);
        if (Number.isSafeInteger(previousAccountId)) writeStorage(sessionStorageLike, sessionMarkerKey(previousAccountId), "");
        bootstrapAttempted.delete(activeKey);
        libraryLoaded.delete(activeKey);
      }
      generation += 1;
      ensureIdentity();
    });
  }

  return {
    bootstrap,
    loadLibrary,
    snapshot: () => current ? clone(current) : null,
    applyToThemeManager: (themeManager) => current ? applySelectionToThemeManager(themeManager, current) : false,
    reset,
  };
}

let defaultController: AccountPaletteSessionController | null = null;

export function getAccountPaletteSessionController(): AccountPaletteSessionController {
  if (!defaultController) defaultController = createAccountPaletteSessionController();
  return defaultController;
}

export function resetAccountPaletteSessionController(): void {
  defaultController?.reset();
  defaultController = null;
}
