export const ACCOUNT_PALETTE_OUTBOX_DB_NAME = "account_palette_outbox_v1";
export const ACCOUNT_PALETTE_OUTBOX_DB_VERSION = 1;
export const ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE = "operations";
export const ACCOUNT_PALETTE_OUTBOX_LEASE_STORE = "leases";

export type PaletteOutboxOperationKind =
  | "create"
  | "save"
  | "delete"
  | "selection"
  | "order";

export type PaletteOutboxOperationStatus =
  | "pending"
  | "sending"
  | "retry_wait"
  | "paused_account"
  | "saved"
  | "merged"
  | "unchanged"
  | "conflict_copy"
  | "duplicate_existing"
  | "capacity_full"
  | "base_revision_expired"
  | "deleted"
  | "expired_operation";

export type PaletteOutboxSendStatus =
  | "saved"
  | "merged"
  | "unchanged"
  | "conflict_copy"
  | "duplicate_existing"
  | "capacity_full"
  | "base_revision_expired"
  | "deleted"
  | "transient"
  | "paused_account"
  | "expired_operation";

export interface PaletteOutboxSendResult {
  status: PaletteOutboxSendStatus;
  revision?: number;
  palette?: unknown;
  paletteId?: string | null;
  existingPaletteId?: string | null;
  conflictCopyId?: string | null;
  selection?: { kind: string; paletteId: string | null };
  paletteIds?: string[];
  reason?: string | null;
  code?: string;
  [key: string]: unknown;
}

export interface PaletteOutboxOperation {
  key: string;
  accountId: number;
  paletteId: string;
  kind: PaletteOutboxOperationKind;
  operationId: string;
  requestHash: string;
  baseRevision: number;
  payload: Record<string, unknown>;
  status: PaletteOutboxOperationStatus;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  nextAttemptAt: number;
  sentAt: number | null;
  lastError: string | null;
  result: PaletteOutboxSendResult | null;
  pauseReason?: string | null;
}

export interface PaletteOutboxLease {
  key: string;
  ownerId: string;
  expiresAt: number;
}

export interface PaletteOutboxStore {
  list(accountId: number): Promise<PaletteOutboxOperation[]>;
  put(operation: PaletteOutboxOperation): Promise<void>;
  delete(key: string): Promise<void>;
  acquireLease(
    key: string,
    ownerId: string,
    now: number,
    leaseMs: number,
  ): Promise<boolean>;
  renewLease(
    key: string,
    ownerId: string,
    now: number,
    leaseMs: number,
  ): Promise<boolean>;
  releaseLease(key: string, ownerId: string): Promise<void>;
  close?(): void;
}

export interface PaletteOutboxWindowLike {
  BroadcastChannel?: typeof BroadcastChannel;
  navigator?: { onLine?: boolean };
  addEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
}

export interface AccountPaletteOutboxOptions {
  store?: PaletteOutboxStore;
  sender?: (
    operation: PaletteOutboxOperation,
  ) => Promise<PaletteOutboxSendResult>;
  ownerId: string;
  windowLike?: PaletteOutboxWindowLike | null;
  now?: () => number;
  retryBaseMs?: number;
  leaseMs?: number;
  isOnline?: () => boolean;
}

export interface PaletteOutboxChange {
  type: "enqueued" | "updated" | "paused" | "drained";
  operation: PaletteOutboxOperation;
}

export interface AccountPaletteOutbox {
  enqueue(operation: PaletteOutboxOperation): Promise<PaletteOutboxOperation>;
  list(accountId: number): Promise<PaletteOutboxOperation[]>;
  discardUnsent(
    accountId: number,
    paletteId: string,
    kinds?: PaletteOutboxOperationKind[],
  ): Promise<PaletteOutboxOperation[]>;
  setActiveAccount(accountId: number | null): void;
  pauseAccount(accountId: number, reason?: string): Promise<void>;
  drain(options?: { force?: boolean }): Promise<PaletteOutboxOperation[]>;
  subscribe(listener: (change: PaletteOutboxChange) => void): () => void;
  dispose(): void;
}

type IndexedDbLike = IDBFactory;

function clone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    throw new Error("palette_outbox_clone_failed", { cause: error });
  }
}

function integer(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function operationSort(
  left: PaletteOutboxOperation,
  right: PaletteOutboxOperation,
): number {
  const priority = (kind: PaletteOutboxOperationKind): number => {
    if (kind === "create" || kind === "save" || kind === "delete") return 0;
    if (kind === "order") return 1;
    return 2;
  };
  return (
    priority(left.kind) - priority(right.kind) ||
    left.createdAt - right.createdAt ||
    left.updatedAt - right.updatedAt ||
    left.key.localeCompare(right.key)
  );
}

function isDue(
  operation: PaletteOutboxOperation,
  now: number,
  force: boolean,
): boolean {
  return (
    (operation.status === "pending" || operation.status === "retry_wait") &&
    (force || operation.nextAttemptAt <= now)
  );
}

function isTerminalStatus(
  status: PaletteOutboxSendStatus,
): status is Exclude<
  PaletteOutboxSendStatus,
  "transient" | "paused_account" | "expired_operation"
> {
  return (
    status !== "transient" &&
    status !== "paused_account" &&
    status !== "expired_operation"
  );
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const source = error as Record<string, unknown>;
    if (source.code) return String(source.code);
    if (source.message) return String(source.message);
    if (source.name) return String(source.name);
  }
  return error instanceof Error
    ? error.message
    : String(error || "palette_outbox_send_failed");
}

function cloneOperation(
  operation: PaletteOutboxOperation,
): PaletteOutboxOperation {
  return clone(operation);
}

function canonicalOperationKey(
  operation: Pick<
    PaletteOutboxOperation,
    "accountId" | "paletteId" | "kind" | "operationId"
  >,
): string {
  return `${operation.accountId}:${operation.paletteId}:${operation.kind}:${operation.operationId}`;
}

function normalizeOperation(
  operation: PaletteOutboxOperation,
): PaletteOutboxOperation {
  if (!Number.isSafeInteger(operation.accountId) || operation.accountId < 0)
    throw new Error("palette_outbox_account_required");
  if (!operation.paletteId || !operation.operationId || !operation.requestHash)
    throw new Error("palette_outbox_operation_incomplete");
  if (!operation.key) throw new Error("palette_outbox_key_required");
  return {
    ...clone(operation),
    accountId: integer(operation.accountId),
    paletteId: String(operation.paletteId),
    kind: operation.kind,
    operationId: String(operation.operationId),
    requestHash: String(operation.requestHash),
    baseRevision: Math.max(0, integer(operation.baseRevision)),
    payload: clone(operation.payload || {}),
    attempts: Math.max(0, integer(operation.attempts)),
    createdAt: Math.max(0, integer(operation.createdAt, Date.now())),
    updatedAt: Math.max(0, integer(operation.updatedAt, Date.now())),
    nextAttemptAt: Math.max(0, integer(operation.nextAttemptAt)),
    sentAt:
      operation.sentAt == null ? null : Math.max(0, integer(operation.sentAt)),
    lastError: operation.lastError == null ? null : String(operation.lastError),
    result: operation.result ? clone(operation.result) : null,
    pauseReason:
      operation.pauseReason == null ? null : String(operation.pauseReason),
  };
}

function defaultStore(): PaletteOutboxStore {
  return createIndexedDbPaletteOutboxStore();
}

export function createAccountPaletteOutbox(
  options: AccountPaletteOutboxOptions,
): AccountPaletteOutbox {
  const store = options.store || defaultStore();
  const now = options.now || Date.now;
  const retryBaseMs = Math.max(50, Math.floor(options.retryBaseMs || 1_000));
  const leaseMs = Math.max(1_000, Math.floor(options.leaseMs || 15_000));
  const sender =
    options.sender ||
    (async () => {
      throw new Error("palette_outbox_sender_unconfigured");
    });
  const windowLike =
    options.windowLike || (typeof window === "undefined" ? null : window);
  const ownerId = String(options.ownerId || "palette-outbox-owner");
  const listeners = new Set<(change: PaletteOutboxChange) => void>();
  let activeAccountId: number | null = null;
  let draining = false;
  let transition: Promise<void> = Promise.resolve();
  let channel: BroadcastChannel | null = null;
  const onlineListener = () => void drain({ force: true });

  const online =
    options.isOnline || (() => windowLike?.navigator?.onLine !== false);

  function emit(
    type: PaletteOutboxChange["type"],
    operation: PaletteOutboxOperation,
  ): void {
    const change = {
      type,
      operation: cloneOperation(operation),
    } satisfies PaletteOutboxChange;
    listeners.forEach((listener) => listener(change));
  }

  function broadcast(message: Record<string, unknown>): void {
    try {
      channel?.postMessage(message);
    } catch {
      // BroadcastChannel is advisory; IndexedDB remains authoritative.
    }
  }

  async function list(accountId: number): Promise<PaletteOutboxOperation[]> {
    await transition;
    return (await store.list(accountId))
      .map(cloneOperation)
      .sort(operationSort);
  }

  async function discardUnsent(
    accountId: number,
    paletteId: string,
    kinds: PaletteOutboxOperationKind[] = ["create", "save", "delete"],
  ): Promise<PaletteOutboxOperation[]> {
    await transition;
    if (draining) throw new Error("PALETTE_OUTBOX_BUSY");
    const leaseKey = `account:${accountId}`;
    const acquired = await store.acquireLease(
      leaseKey,
      ownerId,
      now(),
      leaseMs,
    );
    if (!acquired) throw new Error("PALETTE_OUTBOX_BUSY");
    try {
      const allowedKinds = new Set(kinds);
      const removed: PaletteOutboxOperation[] = [];
      const operations = await store.list(accountId);
      for (const operation of operations) {
        if (
          operation.paletteId !== paletteId ||
          !allowedKinds.has(operation.kind) ||
          operation.sentAt !== null ||
          !["pending", "retry_wait", "paused_account"].includes(
            operation.status,
          )
        )
          continue;
        await store.delete(operation.key);
        removed.push(cloneOperation(operation));
      }
      return removed;
    } finally {
      await store.releaseLease(leaseKey, ownerId);
    }
  }

  async function pauseAccount(
    accountId: number,
    reason = "account_switch",
  ): Promise<void> {
    const operations = await store.list(accountId);
    for (const operation of operations) {
      if (
        operation.status !== "saved" &&
        operation.status !== "merged" &&
        operation.status !== "unchanged" &&
        operation.status !== "conflict_copy" &&
        operation.status !== "duplicate_existing" &&
        operation.status !== "capacity_full" &&
        operation.status !== "base_revision_expired" &&
        operation.status !== "deleted" &&
        operation.status !== "expired_operation"
      ) {
        const paused = {
          ...operation,
          status: "paused_account" as const,
          pauseReason: reason,
          updatedAt: now(),
        };
        await store.put(paused);
        emit("paused", paused);
      }
    }
  }

  async function resumeAccount(accountId: number): Promise<void> {
    const operations = await store.list(accountId);
    for (const operation of operations) {
      if (operation.status !== "paused_account") continue;
      const resumed = {
        ...operation,
        status: "pending" as const,
        pauseReason: null,
        updatedAt: now(),
      };
      await store.put(resumed);
      emit("updated", resumed);
    }
  }

  async function enqueue(
    input: PaletteOutboxOperation,
  ): Promise<PaletteOutboxOperation> {
    await transition;
    const operation = normalizeOperation({
      ...input,
      key: canonicalOperationKey(input),
      status: "pending",
      sentAt: input.sentAt == null ? null : input.sentAt,
      updatedAt: now(),
      nextAttemptAt: 0,
      lastError: null,
      result: null,
      pauseReason: null,
    });
    const existing = await store.list(operation.accountId);
    for (const candidate of existing) {
      if (
        candidate.operationId === operation.operationId &&
        candidate.requestHash !== operation.requestHash
      ) {
        throw new Error("PALETTE_OPERATION_HASH_CONFLICT");
      }
    }
    for (const candidate of existing) {
      if (
        candidate.paletteId === operation.paletteId &&
        candidate.kind === operation.kind &&
        candidate.sentAt === null &&
        (candidate.status === "pending" ||
          candidate.status === "retry_wait" ||
          candidate.status === "paused_account")
      ) {
        await store.delete(candidate.key);
      }
    }
    await store.put(operation);
    emit("enqueued", operation);
    broadcast({
      type: "account-palette-outbox-wake",
      accountId: operation.accountId,
    });
    return cloneOperation(operation);
  }

  async function sendOne(
    operation: PaletteOutboxOperation,
    currentNow: number,
  ): Promise<PaletteOutboxOperation> {
    const sending: PaletteOutboxOperation = {
      ...operation,
      status: "sending",
      attempts: operation.attempts + 1,
      sentAt: operation.sentAt ?? currentNow,
      updatedAt: currentNow,
      lastError: null,
    };
    await store.put(sending);
    emit("updated", sending);
    try {
      const result = await sender(cloneOperation(sending));
      if (isTerminalStatus(result.status)) {
        const completed: PaletteOutboxOperation = {
          ...sending,
          status: result.status,
          result: clone(result),
          updatedAt: now(),
          nextAttemptAt: 0,
          lastError: null,
        };
        await store.put(completed);
        emit("drained", completed);
        return completed;
      }
      if (result.status === "paused_account") {
        const paused = {
          ...sending,
          status: "paused_account" as const,
          pauseReason: result.code || "auth",
          result: clone(result),
          updatedAt: now(),
          lastError: result.code || null,
        };
        await store.put(paused);
        emit("paused", paused);
        return paused;
      }
      if (result.status === "expired_operation") {
        const expired = {
          ...sending,
          status: "expired_operation" as const,
          result: clone(result),
          updatedAt: now(),
          lastError: result.code || "expired_operation",
        };
        await store.put(expired);
        emit("drained", expired);
        return expired;
      }
      const retry = {
        ...sending,
        status: "retry_wait" as const,
        result: clone(result),
        updatedAt: now(),
        nextAttemptAt:
          now() +
          retryBaseMs * 2 ** Math.min(8, Math.max(0, sending.attempts - 1)),
        lastError: result.code || result.reason || "transient",
      };
      await store.put(retry);
      emit("updated", retry);
      return retry;
    } catch (error) {
      const code = errorCode(error);
      const upper = code.toUpperCase();
      if (
        [
          "TOKEN_EXPIRED",
          "SESSION_REVOKED",
          "ACCOUNT_INACTIVE",
          "INVALID_TOKEN",
          "UNAUTHORIZED",
        ].includes(upper)
      ) {
        const paused = {
          ...sending,
          status: "paused_account" as const,
          pauseReason: upper,
          updatedAt: now(),
          lastError: code,
        };
        await store.put(paused);
        emit("paused", paused);
        return paused;
      }
      if (
        upper === "PALETTE_OPERATION_EXPIRED" ||
        upper === "EXPIRED_OPERATION"
      ) {
        const expired = {
          ...sending,
          status: "expired_operation" as const,
          updatedAt: now(),
          lastError: code,
        };
        await store.put(expired);
        emit("drained", expired);
        return expired;
      }
      const retry = {
        ...sending,
        status: "retry_wait" as const,
        updatedAt: now(),
        nextAttemptAt:
          now() +
          retryBaseMs * 2 ** Math.min(8, Math.max(0, sending.attempts - 1)),
        lastError: code,
      };
      await store.put(retry);
      emit("updated", retry);
      return retry;
    }
  }

  async function drain(
    options: { force?: boolean } = {},
  ): Promise<PaletteOutboxOperation[]> {
    await transition;
    if (activeAccountId == null || draining || !online()) return [];
    const accountId = activeAccountId;
    const leaseKey = `account:${accountId}`;
    const acquired = await store.acquireLease(
      leaseKey,
      ownerId,
      now(),
      leaseMs,
    );
    if (!acquired) return [];
    draining = true;
    let leaseLost = false;
    const leaseHeartbeat = setInterval(
      () => {
        void store
          .renewLease(leaseKey, ownerId, now(), leaseMs)
          .then((renewed) => {
            if (!renewed) leaseLost = true;
          })
          .catch(() => {
            leaseLost = true;
          });
      },
      Math.max(250, Math.floor(leaseMs / 3)),
    );
    const completed: PaletteOutboxOperation[] = [];
    try {
      const operations = await store.list(accountId);
      for (const operation of operations.sort(operationSort)) {
        if (activeAccountId !== accountId) break;
        if (!isDue(operation, now(), options.force === true)) {
          if (
            [
              "saved",
              "merged",
              "unchanged",
              "conflict_copy",
              "duplicate_existing",
              "capacity_full",
              "base_revision_expired",
              "deleted",
              "expired_operation",
            ].includes(operation.status)
          )
            continue;
          break;
        }
        const result = await sendOne(operation, now());
        completed.push(cloneOperation(result));
        if (
          result.status === "retry_wait" ||
          result.status === "paused_account" ||
          leaseLost
        )
          break;
        const renewed = await store.renewLease(
          leaseKey,
          ownerId,
          now(),
          leaseMs,
        );
        if (!renewed) break;
      }
      return completed;
    } finally {
      clearInterval(leaseHeartbeat);
      draining = false;
      await store.releaseLease(leaseKey, ownerId);
    }
  }

  function setActiveAccount(accountId: number | null): void {
    const normalized =
      accountId == null || !Number.isSafeInteger(accountId) || accountId < 0
        ? null
        : accountId;
    const previous = activeAccountId;
    activeAccountId = normalized;
    transition = transition
      .then(async () => {
        if (previous != null && previous !== normalized)
          await pauseAccount(previous);
        if (normalized != null) await resumeAccount(normalized);
      })
      .catch(() => undefined);
  }

  function subscribe(
    listener: (change: PaletteOutboxChange) => void,
  ): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function dispose(): void {
    try {
      channel?.close();
    } catch {
      // no-op
    }
    channel = null;
    listeners.clear();
    windowLike?.removeEventListener?.("online", onlineListener);
    store.close?.();
  }

  if (windowLike?.BroadcastChannel) {
    try {
      channel = new windowLike.BroadcastChannel("account-palette-outbox-v1");
      channel.addEventListener("message", (event) => {
        const data = event.data as Record<string, unknown> | null;
        if (data?.type !== "account-palette-outbox-wake") return;
        if (Number(data.accountId) !== activeAccountId) return;
        void drain();
      });
    } catch {
      channel = null;
    }
  }
  if (windowLike?.addEventListener) {
    windowLike.addEventListener("online", onlineListener);
  }

  return {
    enqueue,
    list,
    discardUnsent,
    setActiveAccount,
    pauseAccount,
    drain,
    subscribe,
    dispose,
  };
}

function openOutboxDatabase(indexedDb: IndexedDbLike): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(
      ACCOUNT_PALETTE_OUTBOX_DB_NAME,
      ACCOUNT_PALETTE_OUTBOX_DB_VERSION,
    );
    request.onupgradeneeded = () => {
      const db = request.result;
      const operations = db.objectStoreNames.contains(
        ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE,
      )
        ? request.transaction!.objectStore(
            ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE,
          )
        : db.createObjectStore(ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE, {
            keyPath: "key",
          });
      if (!operations.indexNames.contains("accountId"))
        operations.createIndex("accountId", "accountId", { unique: false });
      if (!operations.indexNames.contains("accountPalette"))
        operations.createIndex("accountPalette", ["accountId", "paletteId"], {
          unique: false,
        });
      if (!operations.indexNames.contains("status"))
        operations.createIndex("status", "status", { unique: false });
      if (!db.objectStoreNames.contains(ACCOUNT_PALETTE_OUTBOX_LEASE_STORE)) {
        db.createObjectStore(ACCOUNT_PALETTE_OUTBOX_LEASE_STORE, {
          keyPath: "key",
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("palette_outbox_idb_open_failed"));
  });
}

function completeTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error || new Error("palette_outbox_idb_transaction_failed"),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ||
          new Error("palette_outbox_idb_transaction_aborted"),
      );
  });
}

export function createIndexedDbPaletteOutboxStore(
  options: { indexedDB?: IndexedDbLike } = {},
): PaletteOutboxStore {
  const indexedDb =
    options.indexedDB ||
    (typeof globalThis === "undefined" ? undefined : globalThis.indexedDB);
  if (!indexedDb) throw new Error("palette_outbox_indexeddb_unavailable");
  let databasePromise: Promise<IDBDatabase> | null = null;
  const database = (): Promise<IDBDatabase> =>
    databasePromise || (databasePromise = openOutboxDatabase(indexedDb));

  return {
    async list(accountId) {
      const db = await database();
      const transaction = db.transaction(
        ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE,
        "readonly",
      );
      const index = transaction
        .objectStore(ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE)
        .index("accountId");
      const result = await new Promise<PaletteOutboxOperation[]>(
        (resolve, reject) => {
          const request = index.getAll(accountId);
          request.onsuccess = () =>
            resolve(
              (request.result || []).map((item) => normalizeOperation(item)),
            );
          request.onerror = () =>
            reject(
              request.error || new Error("palette_outbox_idb_list_failed"),
            );
        },
      );
      await completeTransaction(transaction);
      return result;
    },
    async put(operation) {
      const db = await database();
      const transaction = db.transaction(
        ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE,
        "readwrite",
      );
      transaction
        .objectStore(ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE)
        .put(normalizeOperation(operation));
      await completeTransaction(transaction);
    },
    async delete(key) {
      const db = await database();
      const transaction = db.transaction(
        ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE,
        "readwrite",
      );
      transaction
        .objectStore(ACCOUNT_PALETTE_OUTBOX_OPERATION_STORE)
        .delete(key);
      await completeTransaction(transaction);
    },
    async acquireLease(key, ownerId, now, leaseMs) {
      const db = await database();
      const transaction = db.transaction(
        ACCOUNT_PALETTE_OUTBOX_LEASE_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(ACCOUNT_PALETTE_OUTBOX_LEASE_STORE);
      const acquired = await new Promise<boolean>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const existing = request.result as PaletteOutboxLease | undefined;
          if (
            existing &&
            existing.expiresAt > now &&
            existing.ownerId !== ownerId
          ) {
            resolve(false);
            return;
          }
          store.put({
            key,
            ownerId,
            expiresAt: now + leaseMs,
          } satisfies PaletteOutboxLease);
          resolve(true);
        };
        request.onerror = () =>
          reject(
            request.error || new Error("palette_outbox_idb_lease_read_failed"),
          );
      });
      await completeTransaction(transaction);
      return acquired;
    },
    async renewLease(key, ownerId, now, leaseMs) {
      const db = await database();
      const transaction = db.transaction(
        ACCOUNT_PALETTE_OUTBOX_LEASE_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(ACCOUNT_PALETTE_OUTBOX_LEASE_STORE);
      const renewed = await new Promise<boolean>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const existing = request.result as PaletteOutboxLease | undefined;
          if (!existing || existing.ownerId !== ownerId) {
            resolve(false);
            return;
          }
          store.put({ ...existing, expiresAt: now + leaseMs });
          resolve(true);
        };
        request.onerror = () =>
          reject(
            request.error || new Error("palette_outbox_idb_lease_read_failed"),
          );
      });
      await completeTransaction(transaction);
      return renewed;
    },
    async releaseLease(key, ownerId) {
      const db = await database();
      const transaction = db.transaction(
        ACCOUNT_PALETTE_OUTBOX_LEASE_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(ACCOUNT_PALETTE_OUTBOX_LEASE_STORE);
      const request = store.get(key);
      request.onsuccess = () => {
        const existing = request.result as PaletteOutboxLease | undefined;
        if (existing?.ownerId === ownerId) store.delete(key);
      };
      await completeTransaction(transaction);
    },
    close() {
      void databasePromise?.then((db) => db.close());
      databasePromise = null;
    },
  };
}

export function createInMemoryPaletteOutboxStore(): PaletteOutboxStore {
  const operations = new Map<string, PaletteOutboxOperation>();
  const leases = new Map<string, PaletteOutboxLease>();
  return {
    async list(accountId) {
      return Array.from(operations.values())
        .filter((item) => item.accountId === accountId)
        .map(cloneOperation);
    },
    async put(operation) {
      operations.set(operation.key, normalizeOperation(operation));
    },
    async delete(key) {
      operations.delete(key);
    },
    async acquireLease(key, ownerId, now, leaseMs) {
      const existing = leases.get(key);
      if (existing && existing.expiresAt > now && existing.ownerId !== ownerId)
        return false;
      leases.set(key, { key, ownerId, expiresAt: now + leaseMs });
      return true;
    },
    async renewLease(key, ownerId, now, leaseMs) {
      const existing = leases.get(key);
      if (!existing || existing.ownerId !== ownerId) return false;
      leases.set(key, { ...existing, expiresAt: now + leaseMs });
      return true;
    },
    async releaseLease(key, ownerId) {
      const existing = leases.get(key);
      if (existing?.ownerId === ownerId) leases.delete(key);
    },
  };
}
