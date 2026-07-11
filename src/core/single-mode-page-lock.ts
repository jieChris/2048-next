import { randomId } from "../utils/crypto-random";

export interface StorageLike {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

export interface WindowLike {
  location?: { pathname?: string; search?: string; href?: string };
  localStorage?: StorageLike | null;
  sessionStorage?: StorageLike | null;
  navigator?: {
    locks?: {
      request?: (
        name: string,
        options: { mode: "exclusive"; ifAvailable: true },
        callback: (lock: unknown | null) => Promise<void> | void
      ) => Promise<unknown>;
    } | null;
  } | null;
  __playSinglePageTabId?: string;
  __playSinglePageWindowInstanceId?: string;
  __playSinglePageModeLockState?: SingleModePageLockState | null;
  __playSinglePageBrowserLockModeKey?: string;
  __playSinglePageBrowserLockRelease?: (() => void) | null;
  __playSinglePageBrowserLockPageHideHandler?: (() => void) | null;
  addEventListener?: (name: string, listener: (event?: unknown) => void) => void;
  removeEventListener?: (name: string, listener: (event?: unknown) => void) => void;
  setInterval?: (listener: () => void, timeout: number) => unknown;
  clearInterval?: (id: unknown) => void;
}

export interface SingleModePageLockManagerLike {
  modeKey?: unknown;
  mode?: unknown;
  singleModePageLockState?: SingleModePageLockState | null;
  getWindowLike?: () => WindowLike | null;
  getWebStorageByName?: (name: string) => StorageLike | null;
}

export interface SingleModePageLockRecord {
  tabId: string;
  token: string;
  modeKey: string;
  instanceId: string;
  updatedAt: number;
}

export interface SingleModePageLockState {
  windowLike: WindowLike | null;
  storageLike: StorageLike | null;
  lockKey: string;
  modeKey: string;
  tabId: string;
  token: string;
  instanceId: string;
  heartbeatId: unknown;
  beforeUnloadHandler: (() => void) | null;
  pageHideHandler: (() => void) | null;
  storageHandler: ((event?: unknown) => void) | null;
  conflictHandled: boolean;
}

export interface SingleModePageLockOptions {
  nowMs?: number;
  createId?: (prefix: string) => string;
  keyPrefix?: string;
  tabIdSessionKey?: string;
  ttlMs?: number;
  heartbeatMs?: number;
}

export interface SingleModePageLockRuntime {
  acquireSingleModeBrowserLock: typeof acquireSingleModeBrowserLock;
  ensureSingleModePageLock: typeof ensureSingleModePageLock;
  releaseSingleModePageLock: typeof releaseSingleModePageLock;
  releaseSingleModePageLockStateObject: typeof releaseSingleModePageLockStateObject;
  resolveSingleModePageTabId: typeof resolveSingleModePageTabId;
}

export interface SingleModePageLockRuntimeWindowLike {
  CoreSingleModePageLockRuntime?: SingleModePageLockRuntime;
}

function createDefaultId(prefix: string): string {
  return randomId(prefix, { length: 10 });
}

function resolveWindowLike(manager: SingleModePageLockManagerLike | null | undefined): WindowLike | null {
  return manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
}

function resolveLocalStorage(
  manager: SingleModePageLockManagerLike | null | undefined,
  windowLike: WindowLike | null
): StorageLike | null {
  if (manager && typeof manager.getWebStorageByName === "function") {
    const storage = manager.getWebStorageByName("localStorage");
    if (storage) return storage;
  }
  try {
    return windowLike && windowLike.localStorage ? windowLike.localStorage : null;
  } catch (_error) {
    return null;
  }
}

function resolveSessionStorage(windowLike: WindowLike | null): StorageLike | null {
  try {
    return windowLike && windowLike.sessionStorage ? windowLike.sessionStorage : null;
  } catch (_error) {
    return null;
  }
}

function readStorageItemSafe(storageLike: StorageLike | null, key: string): string | null {
  if (!(storageLike && typeof storageLike.getItem === "function")) return null;
  try {
    return storageLike.getItem(key);
  } catch (_error) {
    return null;
  }
}

function writeStorageItemSafe(storageLike: StorageLike | null, key: string, value: string): boolean {
  if (!(storageLike && typeof storageLike.setItem === "function")) return false;
  try {
    storageLike.setItem(key, value);
    return true;
  } catch (_error) {
    return false;
  }
}

function removeStorageItemSafe(storageLike: StorageLike | null, key: string): boolean {
  if (!(storageLike && typeof storageLike.removeItem === "function")) return false;
  try {
    storageLike.removeItem(key);
    return true;
  } catch (_error) {
    return false;
  }
}

function resolveLockKeyPrefix(options: SingleModePageLockOptions): string {
  return typeof options.keyPrefix === "string" && options.keyPrefix
    ? options.keyPrefix
    : "playModeSinglePageLock:v1:";
}

function resolveTabIdSessionKey(options: SingleModePageLockOptions): string {
  return typeof options.tabIdSessionKey === "string" && options.tabIdSessionKey
    ? options.tabIdSessionKey
    : "playModeSinglePageTabId:v1";
}

function resolveLockKey(modeKey: string, options: SingleModePageLockOptions): string {
  return resolveLockKeyPrefix(options) + String(modeKey || "");
}

function resolveTtlMs(options: SingleModePageLockOptions): number {
  const value = Number(options.ttlMs);
  if (!Number.isFinite(value) || value <= 0) return 12000;
  return Math.floor(value);
}

function resolveHeartbeatMs(options: SingleModePageLockOptions): number {
  const value = Number(options.heartbeatMs);
  if (!Number.isFinite(value) || value <= 0) return 3000;
  return Math.floor(value);
}

function resolveTabId(windowLike: WindowLike | null, options: SingleModePageLockOptions): string {
  if (windowLike && typeof windowLike.__playSinglePageTabId === "string" && windowLike.__playSinglePageTabId) {
    return windowLike.__playSinglePageTabId;
  }
  const sessionStorageLike = resolveSessionStorage(windowLike);
  const sessionKey = resolveTabIdSessionKey(options);
  const createId = options.createId || createDefaultId;
  let tabId = readStorageItemSafe(sessionStorageLike, sessionKey);
  if (!(typeof tabId === "string" && tabId)) {
    tabId = createId("tab");
    writeStorageItemSafe(sessionStorageLike, sessionKey, tabId);
  }
  if (windowLike) windowLike.__playSinglePageTabId = tabId;
  return tabId;
}

export function resolveSingleModePageTabId(
  windowLike: WindowLike | null,
  options: SingleModePageLockOptions = {}
): string {
  return resolveTabId(windowLike, options);
}

function resolveWindowInstanceId(windowLike: WindowLike | null, options: SingleModePageLockOptions): string {
  if (
    windowLike &&
    typeof windowLike.__playSinglePageWindowInstanceId === "string" &&
    windowLike.__playSinglePageWindowInstanceId
  ) {
    return windowLike.__playSinglePageWindowInstanceId;
  }
  const instanceId = (options.createId || createDefaultId)("win");
  if (windowLike) windowLike.__playSinglePageWindowInstanceId = instanceId;
  return instanceId;
}

function normalizeLockRecord(value: unknown): SingleModePageLockRecord | null {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
  if (!source) return null;
  const tabId = typeof source.tab_id === "string" ? source.tab_id : "";
  const token = typeof source.token === "string" ? source.token : "";
  const modeKey = typeof source.mode_key === "string" ? source.mode_key : "";
  const instanceId = typeof source.instance_id === "string" ? source.instance_id : "";
  const updatedAt = Math.floor(Number(source.updated_at) || 0);
  if (!(tabId && token && modeKey && updatedAt > 0)) return null;
  return { tabId, token, modeKey, instanceId, updatedAt };
}

function readLockRecord(storageLike: StorageLike | null, lockKey: string): SingleModePageLockRecord | null {
  const raw = readStorageItemSafe(storageLike, lockKey);
  if (!(typeof raw === "string" && raw)) return null;
  try {
    return normalizeLockRecord(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
}

function writeLockRecord(
  storageLike: StorageLike | null,
  lockKey: string,
  record: SingleModePageLockRecord
): boolean {
  const payload = {
    tab_id: record.tabId,
    token: record.token,
    mode_key: record.modeKey,
    instance_id: record.instanceId,
    updated_at: record.updatedAt
  };
  try {
    return writeStorageItemSafe(storageLike, lockKey, JSON.stringify(payload));
  } catch (_error) {
    return false;
  }
}

function isLockOwnedBy(record: SingleModePageLockRecord | null, tabId: string, token: string, instanceId: string): boolean {
  if (!record) return false;
  if (record.tabId !== tabId || record.token !== token) return false;
  if (!(typeof record.instanceId === "string" && record.instanceId)) return true;
  return record.instanceId === instanceId;
}

function isLockFresh(record: SingleModePageLockRecord | null, nowMs: number, ttlMs: number): boolean {
  if (!record) return false;
  return nowMs - record.updatedAt <= ttlMs;
}

function shouldSkipWindowLock(windowLike: WindowLike | null): boolean {
  let pathname = "";
  let search = "";
  try {
    pathname =
      windowLike && windowLike.location && typeof windowLike.location.pathname === "string"
        ? windowLike.location.pathname
        : "";
    search =
      windowLike && windowLike.location && typeof windowLike.location.search === "string"
        ? windowLike.location.search
        : "";
  } catch (_error) {
    pathname = "";
    search = "";
  }
  const normalizedPath = String(pathname || "").toLowerCase();
  const isVisualPreview = new URLSearchParams(search).get("visual_preview") === "1";
  return isVisualPreview || normalizedPath.indexOf("replay.html") !== -1 || normalizedPath.indexOf("practice_board.html") !== -1;
}

function shouldSkipLock(manager: SingleModePageLockManagerLike | null | undefined): boolean {
  return !manager || shouldSkipWindowLock(resolveWindowLike(manager));
}

export function releaseSingleModeBrowserLock(windowLike: WindowLike | null | undefined): void {
  if (!windowLike) return;
  const pageHideHandler = windowLike.__playSinglePageBrowserLockPageHideHandler;
  if (pageHideHandler && typeof windowLike.removeEventListener === "function") {
    windowLike.removeEventListener("beforeunload", pageHideHandler);
    windowLike.removeEventListener("pagehide", pageHideHandler);
  }
  const release = windowLike.__playSinglePageBrowserLockRelease;
  windowLike.__playSinglePageBrowserLockModeKey = undefined;
  windowLike.__playSinglePageBrowserLockRelease = null;
  windowLike.__playSinglePageBrowserLockPageHideHandler = null;
  if (typeof release === "function") release();
}

export async function acquireSingleModeBrowserLock(
  windowLike: WindowLike | null | undefined,
  modeKeyInput: unknown
): Promise<boolean> {
  const modeKey = String(modeKeyInput || "");
  if (!windowLike || !modeKey || shouldSkipWindowLock(windowLike)) return true;
  if (windowLike.__playSinglePageBrowserLockModeKey === modeKey) return true;
  const locks = windowLike.navigator?.locks;
  const request = locks?.request;
  if (typeof request !== "function") return true;
  releaseSingleModeBrowserLock(windowLike);

  return new Promise<boolean>((resolve) => {
    let resolved = false;
    const finish = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };
    try {
      Promise.resolve(
        request.call(
          locks,
          `playModeBrowserLock:v1:${modeKey}`,
          { mode: "exclusive", ifAvailable: true },
          (lock) => {
            if (!lock) {
              finish(false);
              return;
            }
            const hold = new Promise<void>((release) => {
              windowLike.__playSinglePageBrowserLockRelease = release;
            });
            const releaseOnPageHide = () => releaseSingleModeBrowserLock(windowLike);
            windowLike.__playSinglePageBrowserLockModeKey = modeKey;
            windowLike.__playSinglePageBrowserLockPageHideHandler = releaseOnPageHide;
            if (typeof windowLike.addEventListener === "function") {
              windowLike.addEventListener("beforeunload", releaseOnPageHide);
              windowLike.addEventListener("pagehide", releaseOnPageHide);
            }
            finish(true);
            return hold;
          }
        )
      ).catch(() => finish(true));
    } catch (_error) {
      finish(true);
    }
  });
}

function createLockState(input: {
  windowLike: WindowLike | null;
  storageLike: StorageLike | null;
  lockKey: string;
  modeKey: string;
  tabId: string;
  token: string;
  instanceId: string;
}): SingleModePageLockState {
  return {
    ...input,
    heartbeatId: 0,
    beforeUnloadHandler: null,
    pageHideHandler: null,
    storageHandler: null,
    conflictHandled: false
  };
}

export function releaseSingleModePageLockStateObject(lockState: SingleModePageLockState | null | undefined): void {
  if (!lockState) return;
  const windowLike = lockState.windowLike;
  if (lockState.heartbeatId && windowLike && typeof windowLike.clearInterval === "function") {
    windowLike.clearInterval(lockState.heartbeatId);
    lockState.heartbeatId = 0;
  }
  if (windowLike && typeof windowLike.removeEventListener === "function") {
    if (typeof lockState.beforeUnloadHandler === "function") {
      windowLike.removeEventListener("beforeunload", lockState.beforeUnloadHandler);
    }
    if (typeof lockState.pageHideHandler === "function") {
      windowLike.removeEventListener("pagehide", lockState.pageHideHandler);
    }
    if (typeof lockState.storageHandler === "function") {
      windowLike.removeEventListener("storage", lockState.storageHandler);
    }
  }
  const latest = readLockRecord(lockState.storageLike, lockState.lockKey);
  if (isLockOwnedBy(latest, lockState.tabId, lockState.token, lockState.instanceId)) {
    removeStorageItemSafe(lockState.storageLike, lockState.lockKey);
  }
  if (windowLike && windowLike.__playSinglePageModeLockState === lockState) {
    windowLike.__playSinglePageModeLockState = null;
  }
}

export function releaseSingleModePageLock(manager: SingleModePageLockManagerLike | null | undefined): void {
  if (!manager) return;
  if (manager.singleModePageLockState) {
    releaseSingleModePageLockStateObject(manager.singleModePageLockState);
    manager.singleModePageLockState = null;
  }
}

function attachLockHandlers(
  manager: SingleModePageLockManagerLike,
  lockState: SingleModePageLockState,
  options: SingleModePageLockOptions
): void {
  const windowLike = lockState.windowLike;
  const heartbeatMs = resolveHeartbeatMs(options);
  const releaseCurrentState = () => {
    releaseSingleModePageLockStateObject(lockState);
    if (manager.singleModePageLockState === lockState) manager.singleModePageLockState = null;
  };
  const handleOwnershipConflict = () => {
    if (lockState.conflictHandled) return;
    lockState.conflictHandled = true;
    releaseCurrentState();
  };
  const heartbeatLock = () => {
    const latest = readLockRecord(lockState.storageLike, lockState.lockKey);
    if (!isLockOwnedBy(latest, lockState.tabId, lockState.token, lockState.instanceId)) {
      handleOwnershipConflict();
      return;
    }
    writeLockRecord(lockState.storageLike, lockState.lockKey, {
      tabId: lockState.tabId,
      token: lockState.token,
      modeKey: lockState.modeKey,
      instanceId: lockState.instanceId,
      updatedAt: Date.now()
    });
  };
  const onStorageChanged = (eventLike?: unknown) => {
    const eventRecord = eventLike && typeof eventLike === "object" ? eventLike as { key?: unknown } : {};
    if (eventRecord.key !== lockState.lockKey) return;
    const latest = readLockRecord(lockState.storageLike, lockState.lockKey);
    if (!isLockOwnedBy(latest, lockState.tabId, lockState.token, lockState.instanceId)) {
      handleOwnershipConflict();
    }
  };
  lockState.beforeUnloadHandler = releaseCurrentState;
  lockState.pageHideHandler = releaseCurrentState;
  lockState.storageHandler = onStorageChanged;
  if (windowLike && typeof windowLike.addEventListener === "function") {
    windowLike.addEventListener("beforeunload", lockState.beforeUnloadHandler);
    windowLike.addEventListener("pagehide", lockState.pageHideHandler);
    windowLike.addEventListener("storage", lockState.storageHandler);
  }
  if (windowLike && typeof windowLike.setInterval === "function") {
    lockState.heartbeatId = windowLike.setInterval(heartbeatLock, heartbeatMs);
  }
}

export function ensureSingleModePageLock(
  manager: SingleModePageLockManagerLike | null | undefined,
  options: SingleModePageLockOptions = {}
): boolean {
  if (!manager) return true;
  if (shouldSkipLock(manager)) {
    releaseSingleModePageLock(manager);
    return true;
  }
  const modeKey = String(manager.modeKey || manager.mode || "");
  if (!modeKey) return true;
  const windowLike = resolveWindowLike(manager);
  const storageLike = resolveLocalStorage(manager, windowLike);
  if (!storageLike) return true;
  if (manager.singleModePageLockState?.modeKey === modeKey) return true;
  if (manager.singleModePageLockState) releaseSingleModePageLock(manager);
  const windowState = windowLike?.__playSinglePageModeLockState || null;
  if (windowState?.modeKey === modeKey) {
    manager.singleModePageLockState = windowState;
    return true;
  }
  if (windowState) releaseSingleModePageLockStateObject(windowState);
  const nowMs = Number.isFinite(options.nowMs) ? Number(options.nowMs) : Date.now();
  const lockKey = resolveLockKey(modeKey, options);
  const tabId = resolveTabId(windowLike, options);
  const instanceId = resolveWindowInstanceId(windowLike, options);
  const token = (options.createId || createDefaultId)("lock");
  const currentRecord = readLockRecord(storageLike, lockKey);
  if (
    currentRecord &&
    windowLike?.__playSinglePageBrowserLockModeKey !== modeKey &&
    currentRecord.tabId !== tabId &&
    currentRecord.instanceId !== instanceId &&
    isLockFresh(currentRecord, nowMs, resolveTtlMs(options))
  ) {
    return false;
  }
  const nextRecord = { tabId, token, modeKey, instanceId, updatedAt: nowMs };
  if (!writeLockRecord(storageLike, lockKey, nextRecord)) return true;
  const confirmedRecord = readLockRecord(storageLike, lockKey);
  if (!isLockOwnedBy(confirmedRecord, tabId, token, instanceId)) return false;
  const lockState = createLockState({ windowLike, storageLike, lockKey, modeKey, tabId, token, instanceId });
  attachLockHandlers(manager, lockState, options);
  if (windowLike) windowLike.__playSinglePageModeLockState = lockState;
  manager.singleModePageLockState = lockState;
  return true;
}

export function createSingleModePageLockRuntime(): SingleModePageLockRuntime {
  return {
    acquireSingleModeBrowserLock,
    ensureSingleModePageLock,
    releaseSingleModePageLock,
    releaseSingleModePageLockStateObject,
    resolveSingleModePageTabId
  };
}

export function installSingleModePageLockRuntime(options: {
  windowLike?: SingleModePageLockRuntimeWindowLike | null | undefined;
} = {}): SingleModePageLockRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as SingleModePageLockRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreSingleModePageLockRuntime) {
    windowLike.CoreSingleModePageLockRuntime = createSingleModePageLockRuntime();
  }
  return windowLike.CoreSingleModePageLockRuntime || null;
}
