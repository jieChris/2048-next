import { fillRandomValues } from "../../utils/crypto-random";

export type PaletteEditorStatus =
  | "clean"
  | "dirty"
  | "saving"
  | "saved"
  | "queued"
  | "needs_action"
  | "local_persistence_failed"
  | "failed";

export type PaletteEditorSaveResult<T> = {
  status:
    | "saved"
    | "merged"
    | "unchanged"
    | "conflict_copy"
    | "duplicate_existing"
    | "capacity_full"
    | "base_revision_expired"
    | "deleted"
    | "queued";
  palette?: T;
  revision?: number;
  code?: string;
  reason?: string | null;
  existingPaletteId?: string | null;
  conflictCopyId?: string | null;
};

export interface PaletteDraftOperation<T> {
  accountId: number;
  paletteId: string;
  baseRevision: number;
  operationId: string;
  requestHash: string;
  palette: T;
  allowDuplicate: boolean;
  createdAt: number;
}

export interface AccountPaletteEditorSnapshot<T> {
  accountId: number | null;
  paletteId: string;
  saved: T;
  draft: T;
  baseRevision: number;
  dirty: boolean;
  status: PaletteEditorStatus;
  operation: PaletteDraftOperation<T> | null;
  localPersistenceFailed: boolean;
  lastResult: PaletteEditorSaveResult<T> | null;
  lastError: string | null;
}

export interface AccountPaletteEditorOptions<T> {
  accountId: number | null;
  paletteId: string;
  baseRevision: number;
  saved: T;
  allowDuplicate?: boolean;
  clone?: (value: T) => T;
  createOperationId?: () => string;
  hash?: (value: unknown) => Promise<string>;
  persist?: (operation: PaletteDraftOperation<T>) => Promise<void> | void;
  submit?: (
    operation: PaletteDraftOperation<T>,
  ) => Promise<PaletteEditorSaveResult<T>>;
  onChange?: (snapshot: AccountPaletteEditorSnapshot<T>) => void;
}

export interface AccountPaletteEditorController<T> {
  snapshot(): AccountPaletteEditorSnapshot<T>;
  setDraft(value: T): AccountPaletteEditorSnapshot<T>;
  updateDraft(updater: (draft: T) => T): AccountPaletteEditorSnapshot<T>;
  save(): Promise<PaletteEditorSaveResult<T>>;
  retry(): Promise<PaletteEditorSaveResult<T>>;
  discardDraft(): AccountPaletteEditorSnapshot<T>;
  canLeave(): boolean;
  leave(decision: "save" | "discard" | "cancel"): Promise<boolean>;
  acceptResult(
    result: PaletteEditorSaveResult<T>,
  ): AccountPaletteEditorSnapshot<T>;
  confirmDuplicate(): Promise<PaletteEditorSaveResult<T>>;
  reset(input: {
    accountId: number | null;
    paletteId: string;
    baseRevision: number;
    saved: T;
  }): AccountPaletteEditorSnapshot<T>;
}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    throw new Error("palette_editor_clone_failed", { cause: error });
  }
}

export function canonicalPaletteJson(value: unknown): string {
  const normalize = (input: unknown): JsonValue => {
    if (
      input === null ||
      typeof input === "string" ||
      typeof input === "boolean"
    )
      return input;
    if (typeof input === "number") {
      if (!Number.isFinite(input))
        throw new Error("invalid_palette_json_number");
      return input;
    }
    if (Array.isArray(input)) return input.map(normalize);
    if (isJsonRecord(input)) {
      return Object.fromEntries(
        Object.keys(input)
          .sort((left, right) => left.localeCompare(right))
          .map((key) => [key, normalize(input[key])]),
      );
    }
    throw new Error("invalid_palette_json_value");
  };
  return JSON.stringify(normalize(value));
}

export async function sha256Hex(value: unknown): Promise<string> {
  if (
    typeof crypto === "undefined" ||
    !crypto.subtle ||
    typeof TextEncoder === "undefined"
  ) {
    throw new Error("palette_request_hash_unavailable");
  }
  const bytes = new TextEncoder().encode(canonicalPaletteJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function uuidFromBytes(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createPaletteUuidV4(): string {
  const randomUuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID.bind(crypto)
      : null;
  if (randomUuid) return randomUuid().toLowerCase();
  return uuidFromBytes(fillRandomValues(new Uint8Array(16)));
}

function defaultClone<T>(value: T): T {
  return cloneJson(value);
}

function defaultOperationPayload<T>(
  operation: PaletteDraftOperation<T>,
): Record<string, unknown> {
  return {
    kind: "save",
    payload: {
      paletteId: operation.paletteId,
      baseRevision: operation.baseRevision,
      palette: operation.palette,
      allowDuplicate: operation.allowDuplicate,
    },
  };
}

function isCloudSuccess<T>(result: PaletteEditorSaveResult<T>): boolean {
  return (
    result.status === "saved" ||
    result.status === "merged" ||
    result.status === "unchanged" ||
    result.status === "conflict_copy" ||
    result.status === "deleted"
  );
}

function isNeedsAction<T>(result: PaletteEditorSaveResult<T>): boolean {
  return (
    result.status === "duplicate_existing" ||
    result.status === "capacity_full" ||
    result.status === "base_revision_expired"
  );
}

export function createAccountPaletteEditorController<T>(
  options: AccountPaletteEditorOptions<T>,
): AccountPaletteEditorController<T> {
  const clone = options.clone || defaultClone;
  const submit =
    options.submit ||
    (async () => {
      throw new Error("palette_editor_submit_unconfigured");
    });
  const createOperationId = options.createOperationId || createPaletteUuidV4;
  const hash = options.hash || sha256Hex;
  let accountId = options.accountId;
  let paletteId = String(options.paletteId || "");
  let baseRevision = Math.max(0, Math.floor(Number(options.baseRevision) || 0));
  let saved = clone(options.saved);
  let draft = clone(options.saved);
  let status: PaletteEditorStatus = "clean";
  let operation: PaletteDraftOperation<T> | null = null;
  let localPersistenceFailed = false;
  let lastResult: PaletteEditorSaveResult<T> | null = null;
  let lastError: string | null = null;
  let dispatchPromise: Promise<PaletteEditorSaveResult<T>> | null = null;
  let allowDuplicate = options.allowDuplicate === true;

  function snapshot(): AccountPaletteEditorSnapshot<T> {
    return {
      accountId,
      paletteId,
      saved: clone(saved),
      draft: clone(draft),
      baseRevision,
      dirty:
        status === "dirty" ||
        status === "saving" ||
        status === "needs_action" ||
        status === "failed" ||
        localPersistenceFailed,
      status,
      operation: operation
        ? { ...operation, palette: clone(operation.palette) }
        : null,
      localPersistenceFailed,
      lastResult: lastResult
        ? {
            ...lastResult,
            palette:
              lastResult.palette === undefined
                ? undefined
                : clone(lastResult.palette),
          }
        : null,
      lastError,
    };
  }

  function emit(): AccountPaletteEditorSnapshot<T> {
    const current = snapshot();
    options.onChange?.(current);
    return current;
  }

  function markDraftChanged(): AccountPaletteEditorSnapshot<T> {
    operation = null;
    allowDuplicate = options.allowDuplicate === true;
    localPersistenceFailed = false;
    lastResult = null;
    lastError = null;
    status = "dirty";
    return emit();
  }

  async function createOperation(): Promise<PaletteDraftOperation<T>> {
    if (
      accountId == null ||
      !Number.isSafeInteger(accountId) ||
      accountId < 0
    ) {
      throw new Error("palette_account_required");
    }
    if (!paletteId) throw new Error("palette_id_required");
    const operationId = String(createOperationId()).toLowerCase();
    const base: Omit<PaletteDraftOperation<T>, "requestHash"> = {
      accountId,
      paletteId,
      baseRevision,
      operationId,
      palette: clone(draft),
      allowDuplicate,
      createdAt: Date.now(),
    };
    const requestHash = await hash(
      defaultOperationPayload(base as PaletteDraftOperation<T>),
    );
    return { ...base, requestHash };
  }

  async function dispatch(
    existing?: PaletteDraftOperation<T>,
  ): Promise<PaletteEditorSaveResult<T>> {
    if (dispatchPromise) return dispatchPromise;
    const currentOperation = existing || operation;
    if (!currentOperation) throw new Error("palette_operation_missing");
    operation = {
      ...currentOperation,
      palette: clone(currentOperation.palette),
    };
    status = "saving";
    localPersistenceFailed = false;
    lastError = null;
    emit();
    dispatchPromise = (async () => {
      try {
        const result = await submit({
          ...currentOperation,
          palette: clone(currentOperation.palette),
        });
        acceptResult(result);
        return result;
      } catch (error) {
        status = "failed";
        lastError = error instanceof Error ? error.message : String(error);
        emit();
        throw error;
      } finally {
        dispatchPromise = null;
      }
    })();
    return dispatchPromise;
  }

  function acceptResult(
    result: PaletteEditorSaveResult<T>,
  ): AccountPaletteEditorSnapshot<T> {
    lastResult =
      result.palette === undefined
        ? { ...result }
        : { ...result, palette: clone(result.palette) };
    if (result.status === "queued") {
      saved = clone(draft);
      status = "queued";
      lastError = result.code || null;
      localPersistenceFailed = false;
      return emit();
    }
    if (isCloudSuccess(result)) {
      if (result.palette === undefined) saved = clone(draft);
      else saved = clone(result.palette);
      if (
        result.revision !== undefined &&
        Number.isSafeInteger(result.revision)
      )
        baseRevision = result.revision;
      draft = clone(saved);
      status = result.status === "conflict_copy" ? "saved" : "saved";
      operation = null;
      localPersistenceFailed = false;
      lastError = null;
      return emit();
    }
    if (isNeedsAction(result)) {
      status = "needs_action";
      localPersistenceFailed = false;
      lastError = result.code || result.reason || result.status;
      return emit();
    }
    status = "failed";
    lastError = result.code || result.status;
    return emit();
  }

  async function save(): Promise<PaletteEditorSaveResult<T>> {
    if (!accountId && accountId !== 0)
      throw new Error("palette_account_required");
    if (status === "needs_action" && lastResult)
      return {
        ...lastResult,
        palette:
          lastResult.palette === undefined
            ? undefined
            : clone(lastResult.palette),
      };
    if (!snapshot().dirty) {
      return {
        status: "unchanged",
        palette: clone(saved),
        revision: baseRevision,
      };
    }
    if (!operation) {
      operation = await createOperation();
    }
    if (localPersistenceFailed || status === "local_persistence_failed") {
      try {
        await options.persist?.({
          ...operation,
          palette: clone(operation.palette),
        });
        localPersistenceFailed = false;
      } catch (error) {
        localPersistenceFailed = true;
        status = "local_persistence_failed";
        lastError = error instanceof Error ? error.message : String(error);
        emit();
        throw error;
      }
    } else if (status === "dirty") {
      try {
        await options.persist?.({
          ...operation,
          palette: clone(operation.palette),
        });
      } catch (error) {
        localPersistenceFailed = true;
        status = "local_persistence_failed";
        lastError = error instanceof Error ? error.message : String(error);
        emit();
        throw error;
      }
    }
    return dispatch();
  }

  async function retry(): Promise<PaletteEditorSaveResult<T>> {
    if (!operation) return save();
    if (localPersistenceFailed || status === "local_persistence_failed") {
      return save();
    }
    return dispatch(operation);
  }

  async function confirmDuplicate(): Promise<PaletteEditorSaveResult<T>> {
    if (lastResult?.status !== "duplicate_existing") {
      throw new Error("palette_duplicate_confirmation_not_available");
    }
    allowDuplicate = true;
    operation = null;
    status = "dirty";
    lastResult = null;
    lastError = null;
    return save();
  }

  function setDraft(value: T): AccountPaletteEditorSnapshot<T> {
    draft = clone(value);
    return markDraftChanged();
  }

  function updateDraft(
    updater: (value: T) => T,
  ): AccountPaletteEditorSnapshot<T> {
    return setDraft(updater(clone(draft)));
  }

  function discardDraft(): AccountPaletteEditorSnapshot<T> {
    draft = clone(saved);
    operation = null;
    allowDuplicate = options.allowDuplicate === true;
    status = "clean";
    localPersistenceFailed = false;
    lastResult = null;
    lastError = null;
    return emit();
  }

  function canLeave(): boolean {
    const current = snapshot();
    return (
      !current.dirty &&
      current.status !== "saving" &&
      !current.localPersistenceFailed
    );
  }

  async function leave(
    decision: "save" | "discard" | "cancel",
  ): Promise<boolean> {
    if (canLeave()) return true;
    if (decision === "cancel") return false;
    if (decision === "discard") {
      discardDraft();
      return true;
    }
    try {
      const result = await save();
      return (
        result.status !== "capacity_full" &&
        result.status !== "duplicate_existing" &&
        result.status !== "base_revision_expired"
      );
    } catch {
      return false;
    }
  }

  function reset(input: {
    accountId: number | null;
    paletteId: string;
    baseRevision: number;
    saved: T;
  }): AccountPaletteEditorSnapshot<T> {
    accountId = input.accountId;
    paletteId = String(input.paletteId || "");
    baseRevision = Math.max(0, Math.floor(Number(input.baseRevision) || 0));
    saved = clone(input.saved);
    draft = clone(input.saved);
    operation = null;
    allowDuplicate = options.allowDuplicate === true;
    status = "clean";
    localPersistenceFailed = false;
    lastResult = null;
    lastError = null;
    return emit();
  }

  return {
    snapshot,
    setDraft,
    updateDraft,
    save,
    retry,
    discardDraft,
    canLeave,
    leave,
    acceptResult,
    confirmDuplicate,
    reset,
  };
}
