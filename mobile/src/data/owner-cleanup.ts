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
  stopOwner(ownerKey: AppOwnerKey): MaybePromise;
  resumeOwner(ownerKey: AppOwnerKey): MaybePromise;
  clearMemoryAuth(ownerKey: AppOwnerKey): MaybePromise;
}

export type OwnerCleanupStartupResult =
  | { mode: "ready"; sessionEnvelope: string | null }
  | { mode: "offline_only"; error: unknown };

export interface RestoreOwnerCleanupAtStartupInput {
  database: StartupCleanupDatabase;
  secureStorage: Pick<SecureStorage, "get" | "delete">;
}

function assertAccountOwner(ownerKey: AppOwnerKey): void {
  if (ownerKey === "guest") {
    throw new AppDatabaseError("guest_clear_forbidden");
  }
}

async function recoverBeforeMarker(
  ownerKey: AppOwnerKey,
  resumeOwner: ClearConfirmedOwnerInput["resumeOwner"],
  originalError: unknown,
): Promise<never> {
  try {
    await resumeOwner(ownerKey);
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
  try {
    await input.stopOwner(input.ownerKey);
  } catch (error) {
    await recoverBeforeMarker(input.ownerKey, input.resumeOwner, error);
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
    await recoverBeforeMarker(input.ownerKey, input.resumeOwner, error);
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
