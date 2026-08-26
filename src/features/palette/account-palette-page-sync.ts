import type { AccountPaletteSessionSnapshot } from "./account-palette-session";
import {
  canonicalPaletteJson,
  createPaletteUuidV4,
  sha256Hex,
} from "./account-palette-editor";
import type {
  AccountPaletteOutbox,
  PaletteOutboxOperation,
  PaletteOutboxOperationStatus,
  PaletteOutboxSendResult,
} from "./account-palette-outbox";

const TILE_VALUES = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
  65536,
] as const;
const BUILTIN_PALETTE_IDS = new Set([
  "cold-cyan-steps",
  "warm-glaze-steps",
  "jade-ochre",
]);
const PALETTE_STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u;
const TERMINAL_OUTBOX_STATUSES = new Set<PaletteOutboxOperationStatus>([
  "saved",
  "merged",
  "unchanged",
  "conflict_copy",
  "duplicate_existing",
  "capacity_full",
  "base_revision_expired",
  "deleted",
  "expired_operation",
]);

type JsonRecord = Record<string, unknown>;

export interface PalettePageThemeManager {
  getCustomTilePalettes?: () => unknown;
  getActiveTilePaletteId?: () => unknown;
  setActiveTilePalette?: (paletteId: string) => unknown;
  replaceCustomTilePalettes?: (
    palettes: unknown[],
    options?: JsonRecord,
  ) => unknown;
  saveTilePaletteDraft?: () => unknown;
  beginTilePaletteDraft?: () => unknown;
  discardTilePaletteDraft?: () => unknown;
  rekeyTilePaletteDraft?: (previousId: string, nextId: string) => unknown;
  getTilePaletteDraftState?: () => unknown;
  runWithStoredTilePaletteWrites?: (callback: () => unknown) => unknown;
}

export interface PalettePageSaveOutcome {
  status:
    | "saved"
    | "merged"
    | "conflict_copy"
    | "queued"
    | "paused_account"
    | "needs_action"
    | "duplicate_existing"
    | "capacity_full"
    | "base_revision_expired"
    | "expired_operation"
    | "deleted"
    | "failed"
    | "local_only"
    | "unchanged";
  results: PaletteOutboxSendResult[];
  code?: string;
  paletteId?: string;
  existingPaletteId?: string;
}

export interface AccountPalettePageSyncOptions {
  accountId: number | null;
  themeManager: PalettePageThemeManager;
  outbox: AccountPaletteOutbox;
  sessionSnapshot: () => AccountPaletteSessionSnapshot | null;
  now?: () => number;
  onStateChange?: (state: PalettePageSaveOutcome | null) => void;
}

export interface PaletteThemePlazaEligibility {
  eligible: boolean;
  status:
    | "eligible"
    | "guest"
    | "not_custom"
    | "dirty"
    | "pending_write"
    | "paused_account"
    | "duplicate_existing"
    | "capacity_full"
    | "base_revision_expired"
    | "expired_operation"
    | "local_only"
    | "deleted";
  paletteId: string | null;
  revision: number | null;
}

export interface AccountPalettePageSyncController {
  saveDraft(): Promise<PalettePageSaveOutcome>;
  retryPending(): Promise<PalettePageSaveOutcome>;
  confirmDuplicate(paletteId: string): Promise<PalettePageSaveOutcome>;
  useExistingPalette(
    paletteId: string,
    existingPaletteId: string,
  ): Promise<PalettePageSaveOutcome>;
  themePlazaEligibility(): Promise<PaletteThemePlazaEligibility>;
  reconcileOperation(
    operation: PaletteOutboxOperation,
    options?: { applyLocal?: boolean },
  ): { rekeyedPaletteId: string } | null;
  syncBaseline(options?: { resetDraft?: boolean }): void;
  activeAccountId(): number | null;
  status(): PalettePageSaveOutcome | null;
  dispose(): void;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function clone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    throw new Error("palette_page_sync_clone_failed", { cause: error });
  }
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function finiteInteger(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function canonicalColor(value: unknown): string {
  const normalized = text(value).trim();
  if (normalized.toLowerCase() === "transparent") return "transparent";
  return /^#[0-9a-f]{6}$/iu.test(normalized)
    ? normalized.toUpperCase()
    : normalized;
}

function paletteId(value: unknown): string {
  return text(record(value)?.id).trim();
}

function paletteName(value: unknown): string {
  return text(record(value)?.name).trim() || "自定义色板";
}

function normalizePaletteForApi(
  value: unknown,
  fallbackId = "",
): JsonRecord | null {
  const source = record(value);
  if (!source) return null;
  const id = paletteId(source) || fallbackId;
  if (!id) return null;
  const pow2 = array(source.pow2).map(canonicalColor).slice(0, 26);
  const fibonacci = array(source.fibonacci)
    .map(canonicalColor)
    .slice(0, 16);
  if (pow2.length < 26 || fibonacci.length < 16) return null;
  const colors: JsonRecord = {};
  TILE_VALUES.forEach((value, index) => {
    colors[String(value)] = pow2[index];
  });
  const normalized = clone(source);
  delete normalized.source;
  delete normalized.locked;
  delete normalized.createdAt;
  delete normalized.updatedAt;
  return {
    ...normalized,
    id,
    name: paletteName(source),
    baseSkin: text(source.baseSkin) || "web",
    colors,
    pow2,
    fibonacci,
    pow2Text: array(source.pow2Text)
      .map(canonicalColor)
      .slice(0, 26),
    fibonacciText: array(source.fibonacciText)
      .map(canonicalColor)
      .slice(0, 16),
    pow2Border: array(source.pow2Border)
      .map(canonicalColor)
      .slice(0, 26),
    fibonacciBorder: array(source.fibonacciBorder)
      .map(canonicalColor)
      .slice(0, 16),
    pow2Glow: array(source.pow2Glow)
      .map(canonicalColor)
      .slice(0, 26),
    fibonacciGlow: array(source.fibonacciGlow)
      .map(canonicalColor)
      .slice(0, 16),
    glowIntensity: Math.max(
      0,
      Math.min(100, finiteInteger(source.glowIntensity, 50)),
    ),
    glowMultipliers: array(source.glowMultipliers)
      .map((item) => Math.max(0, Math.min(200, finiteInteger(item, 100))))
      .slice(0, 26),
  };
}

function paletteComparable(value: unknown): string {
  const source = normalizePaletteForApi(value);
  if (!source) return "";
  const copy = { ...source };
  delete copy.source;
  delete copy.locked;
  delete copy.createdAt;
  delete copy.updatedAt;
  return canonicalPaletteJson(copy);
}

function sessionPaletteMap(
  snapshot: AccountPaletteSessionSnapshot | null,
): Map<string, { revision: number; palette: JsonRecord }> {
  const result = new Map<string, { revision: number; palette: JsonRecord }>();
  const records = [
    ...(snapshot?.library?.palettes || []),
    ...(snapshot?.selectedPalette ? [snapshot.selectedPalette] : []),
  ];
  for (const item of records) {
    const palette = normalizePaletteForApi(item.palette, item.paletteId);
    if (palette)
      result.set(item.paletteId, { revision: item.revision, palette });
  }
  return result;
}

function selectionPayload(
  activeId: string,
  customIds: Set<string>,
): JsonRecord | null {
  if (activeId === "follow-theme")
    return { kind: "follow_theme", paletteId: null };
  if (customIds.has(activeId)) return { kind: "custom", paletteId: activeId };
  if (BUILTIN_PALETTE_IDS.has(activeId))
    return { kind: "builtin", paletteId: activeId };
  return null;
}

function isTerminal(operation: PaletteOutboxOperation | undefined): boolean {
  return !!operation && TERMINAL_OUTBOX_STATUSES.has(operation.status);
}

function resultFromOperation(
  operation: PaletteOutboxOperation,
): PaletteOutboxSendResult {
  if (operation.result) return clone(operation.result);
  if (
    operation.status === "retry_wait" ||
    operation.status === "pending" ||
    operation.status === "sending"
  ) {
    return { status: "transient", code: operation.lastError || "queued" };
  }
  if (operation.status === "paused_account")
    return {
      status: "paused_account",
      code: operation.lastError || operation.pauseReason || "account_switch",
    };
  return {
    status: "expired_operation",
    code: operation.lastError || operation.status,
  };
}

function makeOperationKey(
  accountId: number,
  paletteIdValue: string,
  kind: PaletteOutboxOperation["kind"],
  operationId: string,
): string {
  return `${accountId}:${paletteIdValue}:${kind}:${operationId}`;
}

async function operationFor(
  accountId: number,
  paletteIdValue: string,
  kind: PaletteOutboxOperation["kind"],
  baseRevision: number,
  payload: JsonRecord,
  now: () => number,
): Promise<PaletteOutboxOperation> {
  const operationId = createPaletteUuidV4();
  const createdAt = now();
  let serverPayload: JsonRecord;
  if (kind === "create") {
    serverPayload = {
      paletteId: paletteIdValue,
      palette: payload.palette,
      allowDuplicate: payload.allowDuplicate === true,
    };
  } else if (kind === "save") {
    serverPayload = {
      paletteId: paletteIdValue,
      baseRevision,
      palette: payload.palette,
      allowDuplicate: payload.allowDuplicate === true,
    };
  } else if (kind === "delete") {
    serverPayload = { paletteId: paletteIdValue, baseRevision };
  } else if (kind === "selection") {
    const request = record(payload.request) || payload;
    const rawSelection = record(request.selection);
    const rawKind = text(rawSelection?.kind).trim();
    const selectionKind = rawKind === "follow-theme" ? "follow_theme" : rawKind;
    serverPayload = {
      establishPending: request.establishPending === true,
      selection: {
        kind: selectionKind,
        ref:
          selectionKind === "follow_theme"
            ? null
            : rawSelection?.paletteId == null
              ? null
              : text(rawSelection.paletteId).trim(),
      },
    };
  } else {
    const request = record(payload.request) || payload;
    const paletteIds = Array.from(
      new Set(
        array(request.paletteIds)
          .map((item) => text(item).trim())
          .filter((id) => PALETTE_STABLE_ID_PATTERN.test(id)),
      ),
    );
    serverPayload = { paletteIds };
  }
  const requestHash = await sha256Hex(
    kind === "selection" || kind === "order"
      ? { kind, operationId, payload: serverPayload }
      : { kind, payload: serverPayload },
  );
  return {
    key: makeOperationKey(accountId, paletteIdValue, kind, operationId),
    accountId,
    paletteId: paletteIdValue,
    kind,
    operationId,
    requestHash,
    baseRevision,
    payload: clone(payload),
    status: "pending",
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
    nextAttemptAt: 0,
    sentAt: null,
    lastError: null,
    result: null,
  };
}

export function createAccountPalettePageSyncController(
  options: AccountPalettePageSyncOptions,
): AccountPalettePageSyncController {
  const now = options.now || Date.now;
  let lastOperationCreatedAt = 0;
  const operationNow = (): number => {
    const candidate = Math.max(0, finiteInteger(now(), Date.now()));
    lastOperationCreatedAt = Math.max(candidate, lastOperationCreatedAt + 1);
    return lastOperationCreatedAt;
  };
  let latestStatus: PalettePageSaveOutcome | null = null;
  let disposed = false;
  let saving: Promise<PalettePageSaveOutcome> | null = null;
  const initialLocalPaletteIds = customPalettes().map((item) =>
    paletteId(item),
  );
  const preexistingLocalPaletteIds = new Set(initialLocalPaletteIds);
  const baselineVisiblePaletteIds = new Set(initialLocalPaletteIds);
  const accountOwnedPaletteIds = new Set<string>();
  const authorityOverrides = new Map<
    string,
    { revision: number; palette: JsonRecord }
  >();
  const deletedAuthorityIds = new Set<string>();
  let selectionOverride: JsonRecord | null = null;
  let orderOverride: string[] | null = null;

  function emit(state: PalettePageSaveOutcome | null): void {
    latestStatus = state;
    options.onStateChange?.(state);
  }

  function customPalettes(): JsonRecord[] {
    const value = options.themeManager.getCustomTilePalettes?.();
    return array(value)
      .map((item) => normalizePaletteForApi(item))
      .filter((item): item is JsonRecord => !!item);
  }

  function activeId(): string {
    return text(options.themeManager.getActiveTilePaletteId?.()).trim();
  }

  function applyAuthoritativeSelection(selection: JsonRecord): void {
    const setActive = options.themeManager.setActiveTilePalette;
    if (typeof setActive !== "function") return;
    const kind = text(selection.kind);
    const ref = text(selection.paletteId).trim();
    let targetId = "";
    if (kind === "follow_theme") targetId = "follow-theme";
    else if (kind === "builtin") targetId = ref;
    else if (kind === "custom") {
      if (!customPalettes().some((item) => paletteId(item) === ref)) {
        const authoritative = sessionPaletteMap(options.sessionSnapshot()).get(
          ref,
        );
        if (authoritative) {
          accountOwnedPaletteIds.add(ref);
          baselineVisiblePaletteIds.add(ref);
          applyAuthoritativePalette(authoritative.palette, "append", ref);
        }
      }
      if (customPalettes().some((item) => paletteId(item) === ref))
        targetId = ref;
    }
    if (!targetId) return;
    const run = options.themeManager.runWithStoredTilePaletteWrites;
    const invoke = () => setActive.call(options.themeManager, targetId);
    if (typeof run === "function") run.call(options.themeManager, invoke);
    else invoke();
  }

  function applyAuthoritativePalette(
    palette: JsonRecord,
    mode: "replace" | "append",
    activeOverride?: string,
  ): void {
    const replace = options.themeManager.replaceCustomTilePalettes;
    if (disposed || typeof replace !== "function") return;
    const current = customPalettes();
    const id = paletteId(palette);
    const existingIndex = current.findIndex((item) => paletteId(item) === id);
    const next =
      mode === "replace" && existingIndex >= 0
        ? current.map((item, index) =>
            index === existingIndex ? palette : item,
          )
        : [...current.filter((item) => paletteId(item) !== id), palette];
    const run = options.themeManager.runWithStoredTilePaletteWrites;
    const invoke = () =>
      replace.call(options.themeManager, next, {
        activePaletteId: activeOverride || activeId(),
        source: "account-sync",
      });
    if (typeof run === "function") run.call(options.themeManager, invoke);
    else invoke();
  }

  function rekeyLocalPalette(deletedPaletteId: string): string | null {
    const replace = options.themeManager.replaceCustomTilePalettes;
    if (disposed || typeof replace !== "function") return null;
    const current = customPalettes();
    const index = current.findIndex(
      (item) => paletteId(item) === deletedPaletteId,
    );
    if (index < 0) return null;
    const nextPaletteId = createPaletteUuidV4();
    const next = current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, id: nextPaletteId } : item,
    );
    const nextActiveId =
      activeId() === deletedPaletteId ? nextPaletteId : activeId();
    const run = options.themeManager.runWithStoredTilePaletteWrites;
    const invoke = () =>
      replace.call(options.themeManager, next, {
        activePaletteId: nextActiveId,
        source: "account-sync",
      });
    const replaced =
      typeof run === "function"
        ? run.call(options.themeManager, invoke)
        : invoke();
    if (replaced === false) return null;
    options.themeManager.rekeyTilePaletteDraft?.call(
      options.themeManager,
      deletedPaletteId,
      nextPaletteId,
    );
    return nextPaletteId;
  }

  function persistDraftLocally(): boolean {
    return options.themeManager.saveTilePaletteDraft?.() !== false;
  }

  function restartDraftFromSaved(): void {
    options.themeManager.discardTilePaletteDraft?.();
    options.themeManager.beginTilePaletteDraft?.();
  }

  async function findOrCreateOperation(
    accountId: number,
    paletteIdValue: string,
    kind: PaletteOutboxOperation["kind"],
    baseRevision: number,
    payload: JsonRecord,
  ): Promise<PaletteOutboxOperation> {
    const existing = await options.outbox.list(accountId);
    const requestFingerprint = canonicalPaletteJson({
      kind,
      baseRevision,
      payload,
    });
    const reusable = existing
      .filter(
        (item) =>
          item.paletteId === paletteIdValue &&
          item.kind === kind &&
          canonicalPaletteJson({
            kind,
            baseRevision: item.baseRevision,
            payload: item.payload,
          }) === requestFingerprint,
      )
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];
    if (reusable && !isTerminal(reusable)) return reusable;
    return operationFor(
      accountId,
      paletteIdValue,
      kind,
      baseRevision,
      payload,
      operationNow,
    );
  }

  async function queueOperation(
    operation: PaletteOutboxOperation,
  ): Promise<void> {
    const existing = await options.outbox.list(operation.accountId);
    if (existing.some((item) => item.operationId === operation.operationId))
      return;
    await options.outbox.enqueue(operation);
  }

  async function drainOperations(
    accountId: number,
    operations: PaletteOutboxOperation[],
  ): Promise<PaletteOutboxSendResult[]> {
    if (operations.length === 0) return [];
    await options.outbox.drain({ force: true });
    const current = await options.outbox.list(accountId);
    return operations.map((operation) => {
      const stored = current.find(
        (item) => item.operationId === operation.operationId,
      );
      return stored
        ? resultFromOperation(stored)
        : { status: "transient", code: "PALETTE_OUTBOX_OPERATION_MISSING" };
    });
  }

  async function send(
    operation: PaletteOutboxOperation,
  ): Promise<PaletteOutboxSendResult> {
    await queueOperation(operation);
    const results = await drainOperations(operation.accountId, [operation]);
    return (
      results[0] || {
        status: "transient",
        code: "PALETTE_OUTBOX_OPERATION_MISSING",
      }
    );
  }
  function applyPaletteResult(
    operation: PaletteOutboxOperation,
    result: PaletteOutboxSendResult,
    applyLocal = true,
  ): string | null {
    if (disposed) return null;
    if (
      result.status === "saved" ||
      result.status === "merged" ||
      result.status === "unchanged"
    ) {
      const authoritative = record(result.palette);
      const resultPaletteId = result.paletteId || operation.paletteId;
      if (authoritative && result.revision != null) {
        authorityOverrides.set(resultPaletteId, {
          revision: result.revision,
          palette: authoritative,
        });
        accountOwnedPaletteIds.add(resultPaletteId);
        baselineVisiblePaletteIds.add(resultPaletteId);
        const localStillUsesPalette = customPalettes().some(
          (item) => paletteId(item) === operation.paletteId,
        );
        if (applyLocal && localStillUsesPalette) {
          applyAuthoritativePalette(
            authoritative,
            "replace",
            resultPaletteId === operation.paletteId
              ? undefined
              : resultPaletteId,
          );
        }
      }
    } else if (result.status === "conflict_copy") {
      const authoritative = record(result.palette);
      const resultPaletteId =
        result.paletteId || result.conflictCopyId || operation.paletteId;
      if (authoritative && result.revision != null) {
        const localStillUsesPalette = customPalettes().some(
          (item) => paletteId(item) === operation.paletteId,
        );
        const original = sessionPaletteMap(options.sessionSnapshot()).get(
          operation.paletteId,
        );
        if (applyLocal && localStillUsesPalette && original) {
          applyAuthoritativePalette(original.palette, "replace");
        }
        authorityOverrides.set(resultPaletteId, {
          revision: result.revision,
          palette: authoritative,
        });
        accountOwnedPaletteIds.add(resultPaletteId);
        baselineVisiblePaletteIds.add(resultPaletteId);
        if (applyLocal && localStillUsesPalette) {
          applyAuthoritativePalette(authoritative, "append", resultPaletteId);
        }
      }
    } else if (result.status === "base_revision_expired") {
      const authoritative = record(result.palette);
      if (authoritative && result.revision != null) {
        authorityOverrides.set(operation.paletteId, {
          revision: result.revision,
          palette: authoritative,
        });
        accountOwnedPaletteIds.add(operation.paletteId);
      }
    } else if (
      result.status === "expired_operation" &&
      result.reason === "deleted_identity" &&
      (operation.kind === "create" || operation.kind === "save")
    ) {
      const nextPaletteId = rekeyLocalPalette(operation.paletteId);
      if (nextPaletteId) {
        deletedAuthorityIds.add(operation.paletteId);
        authorityOverrides.delete(operation.paletteId);
        accountOwnedPaletteIds.delete(operation.paletteId);
        baselineVisiblePaletteIds.delete(operation.paletteId);
        return nextPaletteId;
      }
    } else if (result.status === "deleted") {
      deletedAuthorityIds.add(operation.paletteId);
      authorityOverrides.delete(operation.paletteId);
      baselineVisiblePaletteIds.delete(operation.paletteId);
    }
    return null;
  }

  async function saveDraft(): Promise<PalettePageSaveOutcome> {
    if (disposed)
      return {
        status: "failed",
        results: [],
        code: "PALETTE_PAGE_SYNC_DISPOSED",
      };
    if (saving) return saving;
    saving = (async () => {
      const accountId = options.accountId;
      if (accountId == null) {
        if (!persistDraftLocally()) {
          const outcome = {
            status: "failed" as const,
            results: [],
            code: "LOCAL_PERSIST_FAILED",
          };
          emit(outcome);
          return outcome;
        }
        restartDraftFromSaved();
        const outcome = { status: "local_only" as const, results: [] };
        emit(outcome);
        return outcome;
      }

      const current = customPalettes();
      const snapshot = options.sessionSnapshot();
      const cloud = sessionPaletteMap(snapshot);
      for (const id of deletedAuthorityIds) cloud.delete(id);
      authorityOverrides.forEach((value, id) => {
        cloud.set(id, value);
      });
      cloud.forEach((_value, id) => accountOwnedPaletteIds.add(id));
      const baselineIds = new Set(cloud.keys());
      const currentIds = new Set(current.map((item) => paletteId(item)));
      const paletteOperations: PaletteOutboxOperation[] = [];
      const unsentCreateIdsToDiscard = new Set<string>();
      const unsentSaveIdsToDiscard = new Set<string>();

      try {
        const existingOperations = await options.outbox.list(accountId);
        const operationsForPalette = (id: string) =>
          existingOperations
            .filter(
              (item) =>
                item.paletteId === id &&
                (item.kind === "create" ||
                  item.kind === "save" ||
                  item.kind === "delete"),
            )
            .sort((left, right) => right.updatedAt - left.updatedAt);
        for (const palette of current) {
          const id = paletteId(palette);
          const cloudRecord = cloud.get(id);
          const boundOperations = operationsForPalette(id);
          const previousCreate = boundOperations.find(
            (item) => item.kind === "create",
          );
          if (
            !cloudRecord &&
            preexistingLocalPaletteIds.has(id) &&
            !accountOwnedPaletteIds.has(id) &&
            boundOperations.length === 0
          )
            continue;
          if (
            cloudRecord &&
            paletteComparable(palette) ===
              paletteComparable(cloudRecord.palette)
          )
            continue;
          const createMayExistRemotely =
            previousCreate?.sentAt != null &&
            ![
              "duplicate_existing",
              "capacity_full",
              "base_revision_expired",
              "expired_operation",
            ].includes(previousCreate.status);
          const kind: PaletteOutboxOperation["kind"] =
            cloudRecord || createMayExistRemotely ? "save" : "create";
          const baseRevision =
            cloudRecord?.revision ||
            finiteInteger(previousCreate?.result?.revision, 1) ||
            1;
          const operation = await findOrCreateOperation(
            accountId,
            id,
            kind,
            baseRevision,
            { palette, allowDuplicate: false },
          );
          paletteOperations.push(operation);
        }

        if (snapshot?.library && snapshot.libraryLoaded === true) {
          for (const [id, cloudRecord] of cloud.entries()) {
            if (
              !baselineIds.has(id) ||
              currentIds.has(id) ||
              !baselineVisiblePaletteIds.has(id)
            )
              continue;
            unsentSaveIdsToDiscard.add(id);
            const operation = await findOrCreateOperation(
              accountId,
              id,
              "delete",
              cloudRecord.revision,
              {},
            );
            paletteOperations.push(operation);
          }
        }

        const createOperations = existingOperations.filter(
          (item) => item.kind === "create" && !currentIds.has(item.paletteId),
        );
        for (const createOperation of createOperations) {
          if (cloud.has(createOperation.paletteId)) continue;
          if (createOperation.sentAt === null && !isTerminal(createOperation)) {
            unsentCreateIdsToDiscard.add(createOperation.paletteId);
            continue;
          }
          if (
            [
              "duplicate_existing",
              "capacity_full",
              "base_revision_expired",
              "expired_operation",
            ].includes(createOperation.status)
          )
            continue;
          const operation = await findOrCreateOperation(
            accountId,
            createOperation.paletteId,
            "delete",
            finiteInteger(createOperation.result?.revision, 1) || 1,
            {},
          );
          paletteOperations.push(operation);
        }
      } catch (error) {
        const outcome = {
          status: "failed" as const,
          results: [],
          code:
            error instanceof Error
              ? error.message
              : "PALETTE_OUTBOX_PREPARE_FAILED",
        };
        emit(outcome);
        return outcome;
      }

      if (!persistDraftLocally()) {
        const outcome = {
          status: "failed" as const,
          results: [],
          code: "LOCAL_PERSIST_FAILED",
        };
        emit(outcome);
        return outcome;
      }

      try {
        for (const id of unsentCreateIdsToDiscard) {
          await options.outbox.discardUnsent(accountId, id, ["create"]);
        }
        for (const id of unsentSaveIdsToDiscard) {
          await options.outbox.discardUnsent(accountId, id, ["save"]);
        }
        for (const operation of paletteOperations) {
          await queueOperation(operation);
        }
      } catch (error) {
        restartDraftFromSaved();
        const outcome = {
          status: "failed" as const,
          results: [],
          code:
            error instanceof Error
              ? error.message
              : "PALETTE_OUTBOX_PERSIST_FAILED",
        };
        emit(outcome);
        return outcome;
      }
      restartDraftFromSaved();

      let results: PaletteOutboxSendResult[];
      try {
        results = await drainOperations(accountId, paletteOperations);
      } catch (error) {
        const outcome = {
          status: "failed" as const,
          results: [],
          code:
            error instanceof Error
              ? error.message
              : "PALETTE_OUTBOX_DRAIN_FAILED",
        };
        emit(outcome);
        return outcome;
      }
      for (let index = 0; index < paletteOperations.length; index += 1) {
        applyPaletteResult(paletteOperations[index], results[index]);
      }
      if (!disposed) restartDraftFromSaved();

      const paletteAction = results.find(
        (result) =>
          result.status === "duplicate_existing" ||
          result.status === "capacity_full" ||
          result.status === "base_revision_expired" ||
          result.status === "expired_operation",
      );
      const paletteQueued = results.some(
        (result) =>
          result.status === "transient" || result.status === "paused_account",
      );
      if (disposed || paletteAction || paletteQueued) {
        const outcome = paletteAction
          ? {
              status: paletteAction.status as
                | "duplicate_existing"
                | "capacity_full"
                | "base_revision_expired"
                | "expired_operation",
              results,
              code:
                paletteAction.code ||
                paletteAction.reason ||
                paletteAction.status,
              paletteId: paletteAction.paletteId || undefined,
              existingPaletteId:
                paletteAction.existingPaletteId || undefined,
            }
          : {
              status: results.some(
                (result) => result.status === "paused_account",
              )
                ? ("paused_account" as const)
                : ("queued" as const),
              results,
              code: disposed
                ? "PALETTE_ACCOUNT_CHANGED"
                : "PALETTE_SAVED_TO_DEVICE",
            };
        emit(outcome);
        return outcome;
      }

      const afterPalette = customPalettes();
      const preferenceOperations: PaletteOutboxOperation[] = [];
      const order = orderOverride || snapshot?.library?.order.paletteIds || [];
      const visibleOrder = afterPalette
        .map((item) => paletteId(item))
        .filter(
          (id) =>
            Boolean(id) &&
            (accountOwnedPaletteIds.has(id) || cloud.has(id)),
        );
      const visibleIds = new Set(visibleOrder);
      const desiredOrder = order.filter(
        (id) => visibleIds.has(id) || !baselineVisiblePaletteIds.has(id),
      );
      for (const id of visibleOrder) {
        if (!desiredOrder.includes(id)) desiredOrder.push(id);
      }
      const orderChanged =
        snapshot?.library &&
        snapshot.libraryLoaded === true &&
        (desiredOrder.length !== order.length ||
          desiredOrder.some((id, index) => id !== order[index]));
      if (orderChanged) {
        const operation = await findOrCreateOperation(
          accountId,
          "__order__",
          "order",
          0,
          { request: { paletteIds: desiredOrder } },
        );
        await queueOperation(operation);
        preferenceOperations.push(operation);
      }

      const selectableIds = new Set<string>([
        ...accountOwnedPaletteIds,
        ...cloud.keys(),
      ]);
      const desiredSelection = selectionPayload(activeId(), selectableIds);
      const cloudSelection = selectionOverride || snapshot?.selection.selection;
      if (
        desiredSelection &&
        (!cloudSelection ||
          cloudSelection.kind !== desiredSelection.kind ||
          text(cloudSelection.paletteId) !== text(desiredSelection.paletteId))
      ) {
        const operation = await findOrCreateOperation(
          accountId,
          "__selection__",
          "selection",
          0,
          {
            request: {
              selection: desiredSelection,
              establishPending: cloudSelection?.kind === "pending",
            },
          },
        );
        await queueOperation(operation);
        preferenceOperations.push(operation);
      }

      try {
        const preferenceResults = await drainOperations(
          accountId,
          preferenceOperations,
        );
        results = [...results, ...preferenceResults];
        for (let index = 0; index < preferenceOperations.length; index += 1) {
          const operation = preferenceOperations[index];
          const result = preferenceResults[index];
          if (result.status === "saved" || result.status === "unchanged") {
            if (operation.kind === "selection" && desiredSelection) {
              const authoritativeSelection = record(result.selection);
              selectionOverride = authoritativeSelection || desiredSelection;
              if (authoritativeSelection)
                applyAuthoritativeSelection(authoritativeSelection);
            }
            if (operation.kind === "order")
              orderOverride = result.paletteIds || desiredOrder;
          }
        }
      } catch (error) {
        const outcome = {
          status: "failed" as const,
          results,
          code:
            error instanceof Error
              ? error.message
              : "PALETTE_OUTBOX_DRAIN_FAILED",
        };
        emit(outcome);
        return outcome;
      }

      const firstAction = results.find(
        (result) =>
          result.status === "duplicate_existing" ||
          result.status === "capacity_full" ||
          result.status === "base_revision_expired" ||
          result.status === "expired_operation",
      );
      const queued = results.some(
        (result) =>
          result.status === "transient" || result.status === "paused_account",
      );
      let successStatus: PalettePageSaveOutcome["status"] = results.length
        ? "saved"
        : "unchanged";
      if (results.some((result) => result.status === "conflict_copy"))
        successStatus = "conflict_copy";
      else if (results.some((result) => result.status === "merged"))
        successStatus = "merged";
      else if (results.some((result) => result.status === "deleted"))
        successStatus = "deleted";
      const outcome: PalettePageSaveOutcome = firstAction
        ? {
            status: firstAction.status as
              | "duplicate_existing"
              | "capacity_full"
              | "base_revision_expired"
              | "expired_operation",
            results,
            code: firstAction.code || firstAction.reason || firstAction.status,
            paletteId: firstAction.paletteId || undefined,
            existingPaletteId:
              firstAction.existingPaletteId || undefined,
          }
        : queued
          ? {
              status: results.some(
                (result) => result.status === "paused_account",
              )
                ? "paused_account"
                : "queued",
              results,
              code: "PALETTE_SAVED_TO_DEVICE",
            }
          : { status: successStatus, results };
      if (
        !disposed &&
        !record(
          options.themeManager.getTilePaletteDraftState?.call(
            options.themeManager,
          ),
        )?.dirty
      )
        restartDraftFromSaved();
      emit(outcome);
      return outcome;
    })()
      .catch((error) => {
        const outcome = {
          status: "failed" as const,
          results: [],
          code: error instanceof Error ? error.message : "PALETTE_SYNC_FAILED",
        };
        emit(outcome);
        return outcome;
      })
      .finally(() => {
        saving = null;
      });
    return saving;
  }

  function reconcileOperation(
    operation: PaletteOutboxOperation,
    reconcileOptions: { applyLocal?: boolean } = {},
  ): { rekeyedPaletteId: string } | null {
    if (disposed) return null;
    const result = resultFromOperation(operation);
    const rekeyedPaletteId = applyPaletteResult(
      operation,
      result,
      reconcileOptions.applyLocal !== false,
    );
    if (result.status === "saved" || result.status === "unchanged") {
      const request = record(operation.payload.request);
      if (operation.kind === "selection") {
        const authoritativeSelection = record(result.selection);
        selectionOverride =
          authoritativeSelection || record(request?.selection);
        if (authoritativeSelection)
          applyAuthoritativeSelection(authoritativeSelection);
      }
      if (operation.kind === "order") {
        orderOverride =
          result.paletteIds ||
          (Array.isArray(request?.paletteIds)
            ? request.paletteIds.map(text).filter(Boolean)
            : null);
      }
    }
    const draftState = record(
      options.themeManager.getTilePaletteDraftState?.call(options.themeManager),
    );
    if (
      draftState?.dirty !== true &&
      (result.status === "saved" ||
        result.status === "merged" ||
        result.status === "unchanged" ||
        result.status === "conflict_copy" ||
        result.status === "deleted")
    ) {
      restartDraftFromSaved();
    }
    return rekeyedPaletteId ? { rekeyedPaletteId } : null;
  }
  function syncBaseline(syncOptions: { resetDraft?: boolean } = {}): void {
    const snapshot = options.sessionSnapshot();
    const library = snapshot?.libraryLoaded ? snapshot.library : null;
    let libraryReplaced = false;
    const draftState = record(
      options.themeManager.getTilePaletteDraftState?.call(
        options.themeManager,
      ),
    );
    if (library && draftState?.dirty !== true) {
      const cloud = sessionPaletteMap(snapshot);
      const tombstoneIds = new Set(
        library.tombstones
          .map((item) => text(record(item)?.paletteId))
          .filter(Boolean),
      );
      const orderedCloud: JsonRecord[] = [];
      const included = new Set<string>();
      for (const id of library.order.paletteIds) {
        const record = cloud.get(id);
        if (!record || included.has(id)) continue;
        orderedCloud.push(record.palette);
        included.add(id);
      }
      for (const [id, record] of cloud.entries()) {
        if (included.has(id)) continue;
        orderedCloud.push(record.palette);
        included.add(id);
      }
      const localOnly = customPalettes().filter((item) => {
        const id = paletteId(item);
        return !included.has(id) && !tombstoneIds.has(id);
      });
      const merged = [...orderedCloud, ...localOnly];
      const replace = options.themeManager.replaceCustomTilePalettes;
      if (merged.length > 10) {
        emit({
          status: "capacity_full",
          results: [],
          code: "LOCAL_LIBRARY_OVER_CAPACITY",
        });
      } else if (typeof replace === "function") {
        const selection = library.selection.selection;
        const customActiveId =
          selection.kind === "custom" ? text(selection.paletteId) : "";
        const run = options.themeManager.runWithStoredTilePaletteWrites;
        const invoke = () => {
          const replaced = replace.call(options.themeManager, merged, {
            activePaletteId: customActiveId || activeId(),
            source: "account-sync",
          });
          if (replaced === false) return false;
          if (selection.kind === "follow_theme")
            options.themeManager.setActiveTilePalette?.call(
              options.themeManager,
              "follow-theme",
            );
          else if (selection.kind === "builtin")
            options.themeManager.setActiveTilePalette?.call(
              options.themeManager,
              text(selection.paletteId),
            );
          return true;
        };
        const replaced =
          typeof run === "function"
            ? run.call(options.themeManager, invoke)
            : invoke();
        if (replaced !== false) {
          libraryReplaced = true;
          cloud.forEach((_value, id) => accountOwnedPaletteIds.add(id));
        } else {
          emit({
            status: "failed",
            results: [],
            code: "LOCAL_PERSIST_FAILED",
          });
        }
      }
    }
    if (libraryReplaced || syncOptions.resetDraft !== false)
      restartDraftFromSaved();
    baselineVisiblePaletteIds.clear();
    customPalettes().forEach((item) =>
      baselineVisiblePaletteIds.add(paletteId(item)),
    );
  }

  function retryPending(): Promise<PalettePageSaveOutcome> {
    return saveDraft();
  }

  async function confirmDuplicate(
    paletteIdValue: string,
  ): Promise<PalettePageSaveOutcome> {
    const accountId = options.accountId;
    if (accountId == null) {
      const outcome = {
        status: "failed" as const,
        results: [],
        code: "PALETTE_ACCOUNT_REQUIRED",
      };
      emit(outcome);
      return outcome;
    }
    const candidates = (await options.outbox.list(accountId))
      .filter(
        (item) =>
          item.paletteId === paletteIdValue &&
          item.status === "duplicate_existing",
      )
      .sort((left, right) => right.updatedAt - left.updatedAt);
    const duplicate = candidates[0];
    if (!duplicate) {
      const outcome = {
        status: "failed" as const,
        results: [],
        code: "PALETTE_DUPLICATE_CONFIRMATION_NOT_AVAILABLE",
      };
      emit(outcome);
      return outcome;
    }
    const payload = { ...clone(duplicate.payload), allowDuplicate: true };
    const operation = await operationFor(
      accountId,
      paletteIdValue,
      duplicate.kind,
      duplicate.baseRevision,
      payload,
      operationNow,
    );
    const result = await send(operation);
    applyPaletteResult(operation, result);
    if (disposed) {
      const outcome = {
        status: "queued" as const,
        results: [result],
        code: "PALETTE_ACCOUNT_CHANGED",
      };
      emit(outcome);
      return outcome;
    }
    if (
      !record(
        options.themeManager.getTilePaletteDraftState?.call(
          options.themeManager,
        ),
      )?.dirty
    )
      restartDraftFromSaved();
    let confirmedStatus: PalettePageSaveOutcome["status"] = "saved";
    if (result.status === "merged") confirmedStatus = "merged";
    else if (result.status === "conflict_copy")
      confirmedStatus = "conflict_copy";
    else if (result.status === "deleted") confirmedStatus = "deleted";
    const outcome: PalettePageSaveOutcome =
      result.status === "duplicate_existing" ||
      result.status === "capacity_full" ||
      result.status === "base_revision_expired" ||
      result.status === "expired_operation"
        ? {
            status: result.status,
            results: [result],
            code: result.code || result.reason || result.status,
            paletteId: result.paletteId || paletteIdValue,
          }
        : result.status === "transient" || result.status === "paused_account"
          ? {
              status:
                result.status === "paused_account"
                  ? "paused_account"
                  : "queued",
              results: [result],
              code: "PALETTE_SAVED_TO_DEVICE",
            }
          : {
              status: confirmedStatus,
              results: [result],
              paletteId: result.paletteId || paletteIdValue,
            };
    emit(outcome);
    return outcome;
  }

  async function themePlazaEligibility(): Promise<PaletteThemePlazaEligibility> {
    const accountId = options.accountId;
    if (accountId == null)
      return {
        eligible: false,
        status: "guest",
        paletteId: null,
        revision: null,
      };
    const activePaletteId = activeId();
    const activePalette = customPalettes().find(
      (item) => paletteId(item) === activePaletteId,
    );
    if (!activePalette)
      return {
        eligible: false,
        status: "not_custom",
        paletteId: activePaletteId || null,
        revision: null,
      };
    const draftState = record(
      options.themeManager.getTilePaletteDraftState?.call(
        options.themeManager,
      ),
    );
    const dirtyPaletteIds = Array.isArray(draftState?.dirtyPaletteIds)
      ? draftState.dirtyPaletteIds.map(text)
      : [];
    if (dirtyPaletteIds.includes(activePaletteId))
      return {
        eligible: false,
        status: "dirty",
        paletteId: activePaletteId,
        revision: null,
      };
    if (deletedAuthorityIds.has(activePaletteId))
      return {
        eligible: false,
        status: "deleted",
        paletteId: activePaletteId,
        revision: null,
      };
    const operations = (await options.outbox.list(accountId))
      .filter(
        (operation) =>
          operation.paletteId === activePaletteId &&
          (operation.kind === "create" ||
            operation.kind === "save" ||
            operation.kind === "delete"),
      )
      .sort(
        (left, right) =>
          right.createdAt - left.createdAt ||
          right.key.localeCompare(left.key),
      );
    const latest = operations[0];
    if (latest) {
      if (
        latest.status === "pending" ||
        latest.status === "sending" ||
        latest.status === "retry_wait"
      )
        return {
          eligible: false,
          status: "pending_write",
          paletteId: activePaletteId,
          revision: null,
        };
      if (latest.status === "paused_account")
        return {
          eligible: false,
          status: "paused_account",
          paletteId: activePaletteId,
          revision: null,
        };
      if (
        latest.status === "duplicate_existing" ||
        latest.status === "capacity_full" ||
        latest.status === "base_revision_expired" ||
        latest.status === "expired_operation"
      )
        return {
          eligible: false,
          status: latest.status,
          paletteId: activePaletteId,
          revision: null,
        };
    }
    const cloud = sessionPaletteMap(options.sessionSnapshot());
    for (const id of deletedAuthorityIds) cloud.delete(id);
    authorityOverrides.forEach((value, id) => cloud.set(id, value));
    if (
      latest?.result?.palette &&
      latest.result.revision != null &&
      latest.status !== "deleted"
    ) {
      const palette = record(latest.result.palette);
      if (palette)
        cloud.set(activePaletteId, {
          revision: latest.result.revision,
          palette,
        });
    }
    const authority = cloud.get(activePaletteId);
    if (!authority)
      return {
        eligible: false,
        status: latest?.status === "deleted" ? "deleted" : "local_only",
        paletteId: activePaletteId,
        revision: null,
      };
    return {
      eligible: true,
      status: "eligible",
      paletteId: activePaletteId,
      revision: authority.revision,
    };
  }

  async function useExistingPalette(
    paletteIdValue: string,
    existingPaletteId: string,
  ): Promise<PalettePageSaveOutcome> {
    const accountId = options.accountId;
    if (accountId == null) {
      const outcome = {
        status: "failed" as const,
        results: [],
        code: "PALETTE_ACCOUNT_REQUIRED",
      };
      emit(outcome);
      return outcome;
    }
    const authority =
      authorityOverrides.get(existingPaletteId) ||
      sessionPaletteMap(options.sessionSnapshot()).get(existingPaletteId);
    const replace = options.themeManager.replaceCustomTilePalettes;
    if (!authority || typeof replace !== "function") {
      const outcome = {
        status: "failed" as const,
        results: [],
        code: "PALETTE_DUPLICATE_EXISTING_UNAVAILABLE",
      };
      emit(outcome);
      return outcome;
    }
    const current = customPalettes();
    if (!current.some((item) => paletteId(item) === paletteIdValue)) {
      const outcome = {
        status: "failed" as const,
        results: [],
        code: "PALETTE_DUPLICATE_LOCAL_NOT_FOUND",
      };
      emit(outcome);
      return outcome;
    }
    const next: JsonRecord[] = [];
    let insertedExisting = false;
    for (const item of current) {
      const id = paletteId(item);
      if (id === paletteIdValue) {
        if (!insertedExisting) {
          next.push(authority.palette);
          insertedExisting = true;
        }
        continue;
      }
      if (id === existingPaletteId) {
        if (!insertedExisting) {
          next.push(authority.palette);
          insertedExisting = true;
        }
        continue;
      }
      next.push(item);
    }
    const activeOverride =
      activeId() === paletteIdValue ? existingPaletteId : activeId();
    const run = options.themeManager.runWithStoredTilePaletteWrites;
    const invoke = () =>
      replace.call(options.themeManager, next, {
        activePaletteId: activeOverride,
        source: "account-sync",
      });
    const replaced =
      typeof run === "function"
        ? run.call(options.themeManager, invoke)
        : invoke();
    if (replaced === false) {
      const outcome = {
        status: "failed" as const,
        results: [],
        code: "LOCAL_PERSIST_FAILED",
      };
      emit(outcome);
      return outcome;
    }
    accountOwnedPaletteIds.add(existingPaletteId);
    baselineVisiblePaletteIds.add(existingPaletteId);
    restartDraftFromSaved();
    return saveDraft();
  }

  options.outbox.setActiveAccount(options.accountId);

  return {
    saveDraft,
    retryPending,
    confirmDuplicate,
    useExistingPalette,
    themePlazaEligibility,
    reconcileOperation,
    syncBaseline,
    activeAccountId: () => options.accountId,
    status: () => latestStatus,
    dispose: () => {
      disposed = true;
    },
  };
}
