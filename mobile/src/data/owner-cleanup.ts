import {
  AppDatabaseError,
  type AppDatabase,
  type AppOwnerKey,
} from "./app-database";
import type { SecureStorage } from "../platform/secure-storage";

/**
 * The sole v1 secure envelope for account tokens, persisted signed-in identity,
 * and ranked challenge tokens. Clearing account state stays atomic by keeping
 * all three under this one key instead of independently cleared secure keys.
 */
export const ACCOUNT_SESSION_SECURE_KEY = "account.session.v1";

type MaybePromise = void | Promise<void>;
type AccountOwnerKey = Exclude<AppOwnerKey, "guest">;
type ConfirmedCleanupDatabase = Pick<
  AppDatabase,
  "beginOwnerClear" | "listPendingOwnerClears" | "completeOwnerClear"
>;
type StartupCleanupDatabase = Pick<
  AppDatabase,
  "open" | "listPendingOwnerClears" | "completeOwnerClear"
>;

export interface ClearConfirmedOwnerInput {
  ownerKey: AppOwnerKey;
  createdAt: number;
  database: ConfirmedCleanupDatabase;
  secureStorage: Pick<SecureStorage, "delete">;
  workGate: OwnerCleanupWorkGate;
  clearMemoryAuth(ownerKey: AppOwnerKey): MaybePromise;
}

export type OwnerCleanupStartupResult =
  | { mode: "ready"; sessionEnvelope: string | null }
  | { mode: "offline_only"; error: unknown };

export interface RestoreOwnerCleanupAtStartupInput {
  database: StartupCleanupDatabase;
  secureStorage: Pick<SecureStorage, "get" | "delete">;
}

function assertAccountOwner(
  ownerKey: AppOwnerKey,
): asserts ownerKey is AccountOwnerKey {
  if (ownerKey === "guest") {
    throw new AppDatabaseError("guest_clear_forbidden");
  }
}

/**
 * All account-scoped persistence and outbox work must enter through `run`.
 * Cleanup closes the gate synchronously, drains registered work, and keeps it
 * closed after success so removing the IndexedDB marker cannot revive an owner.
 */
export class OwnerCleanupWorkGate {
  readonly #stopped = new Set<AccountOwnerKey>();
  readonly #pending = new Map<AccountOwnerKey, Set<Promise<unknown>>>();

  run<T>(ownerKey: AccountOwnerKey, work: () => T | Promise<T>): Promise<T> {
    assertAccountOwner(ownerKey);
    if (this.#stopped.has(ownerKey)) {
      return Promise.reject(new AppDatabaseError("owner_work_stopped"));
    }

    const operation = Promise.resolve().then(work);
    let pending = this.#pending.get(ownerKey);
    if (!pending) {
      pending = new Set();
      this.#pending.set(ownerKey, pending);
    }
    pending.add(operation);
    const release = (): void => {
      const current = this.#pending.get(ownerKey);
      current?.delete(operation);
      if (current?.size === 0) this.#pending.delete(ownerKey);
    };
    void operation.then(release, release);
    return operation;
  }

  async stopAndDrain(ownerKey: AccountOwnerKey): Promise<void> {
    assertAccountOwner(ownerKey);
    this.#stopped.add(ownerKey);
    const pending = this.#pending.get(ownerKey);
    if (pending?.size) await Promise.allSettled([...pending]);
  }

  resume(ownerKey: AccountOwnerKey): void {
    assertAccountOwner(ownerKey);
    if (this.#pending.get(ownerKey)?.size) {
      throw new AppDatabaseError("owner_work_not_drained");
    }
    this.#stopped.delete(ownerKey);
  }

  isStopped(ownerKey: AccountOwnerKey): boolean {
    assertAccountOwner(ownerKey);
    return this.#stopped.has(ownerKey);
  }
}

async function recoverBeforeMarker(
  ownerKey: AccountOwnerKey,
  workGate: OwnerCleanupWorkGate,
  originalError: unknown,
): Promise<never> {
  try {
    workGate.resume(ownerKey);
  } catch (resumeError) {
    throw new AggregateError(
      [originalError, resumeError],
      "owner_cleanup_recovery_failed",
    );
  }
  throw originalError;
}

export async function clearConfirmedOwner(
  input: ClearConfirmedOwnerInput,
): Promise<void> {
  assertAccountOwner(input.ownerKey);
  const ownerKey = input.ownerKey;
  try {
    await input.workGate.stopAndDrain(ownerKey);
  } catch (error) {
    await recoverBeforeMarker(ownerKey, input.workGate, error);
  }
  try {
    await input.database.beginOwnerClear(input.ownerKey, input.createdAt);
  } catch (error) {
    let pendingOwners: AppOwnerKey[];
    try {
      pendingOwners = await input.database.listPendingOwnerClears();
    } catch (listError) {
      throw new AggregateError(
        [error, listError],
        "owner_cleanup_marker_state_unknown",
      );
    }
    if (pendingOwners.includes(input.ownerKey)) throw error;
    await recoverBeforeMarker(ownerKey, input.workGate, error);
  }

  await input.clearMemoryAuth(input.ownerKey);
  await input.secureStorage.delete(ACCOUNT_SESSION_SECURE_KEY);
  await input.database.completeOwnerClear(input.ownerKey);
}

export async function restoreOwnerCleanupAtStartup(
  input: RestoreOwnerCleanupAtStartupInput,
): Promise<OwnerCleanupStartupResult> {
  try {
    await input.database.open();
    const pendingOwners = [
      ...new Set(await input.database.listPendingOwnerClears()),
    ];
    for (const ownerKey of pendingOwners) assertAccountOwner(ownerKey);

    if (pendingOwners.length > 0) {
      await input.secureStorage.delete(ACCOUNT_SESSION_SECURE_KEY);
      for (const ownerKey of pendingOwners) {
        await input.database.completeOwnerClear(ownerKey);
      }
    }

    return {
      mode: "ready",
      sessionEnvelope: await input.secureStorage.get(
        ACCOUNT_SESSION_SECURE_KEY,
      ),
    };
  } catch (error) {
    return { mode: "offline_only", error };
  }
}
