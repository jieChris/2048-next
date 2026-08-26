import { describe, expect, it, vi } from "vitest";
import { sha256Hex } from "../../src/features/palette/account-palette-editor";
import { createAccountPalettePageSyncController } from "../../src/features/palette/account-palette-page-sync";
import {
  createAccountPaletteOutbox,
  createInMemoryPaletteOutboxStore,
  type PaletteOutboxOperation,
  type PaletteOutboxSendResult,
} from "../../src/features/palette/account-palette-outbox";
import type { AccountPaletteSessionSnapshot } from "../../src/features/palette/account-palette-session";

function palette(name: string, id = "p1"): Record<string, unknown> {
  const colors = Array.from(
    { length: 26 },
    (_, index) => `#${String(index + 1).padStart(6, "0")}`,
  );
  return {
    id,
    name,
    baseSkin: "web",
    pow2: colors,
    fibonacci: colors.slice(0, 16),
    pow2Text: Array.from({ length: 26 }, () => "#F9F6F2"),
    fibonacciText: Array.from({ length: 16 }, () => "#F9F6F2"),
    pow2Border: Array.from({ length: 26 }, () => "transparent"),
    fibonacciBorder: Array.from({ length: 16 }, () => "transparent"),
    pow2Glow: Array.from({ length: 26 }, () => "transparent"),
    fibonacciGlow: Array.from({ length: 16 }, () => "transparent"),
    glowIntensity: 50,
    glowMultipliers: Array.from({ length: 26 }, () => 100),
  };
}

function snapshot(
  _localPalette: Record<string, unknown>,
): AccountPaletteSessionSnapshot {
  const cloudPalette = palette("Cloud", "p1");
  return {
    accountId: 42,
    contractVersion: "account-palette-sync-v2.1",
    selection: {
      selection: { kind: "custom", paletteId: "p1" },
      revision: 2,
      updatedAt: null,
    },
    selectedPalette: {
      paletteId: "p1",
      revision: 3,
      palette: cloudPalette,
      contentHash: "a",
      createdAt: null,
      updatedAt: null,
    },
    library: {
      palettes: [
        {
          paletteId: "p1",
          revision: 3,
          palette: cloudPalette,
          contentHash: "a",
          createdAt: null,
          updatedAt: null,
        },
      ],
      order: { paletteIds: ["p1"], revision: 1, updatedAt: null },
      selection: {
        selection: { kind: "custom", paletteId: "p1" },
        revision: 2,
        updatedAt: null,
      },
      tombstones: [],
      changes: [],
      nextCursor: "2",
      hasMore: false,
      resetRequired: false,
    },
    bootstrapCompleted: true,
    libraryLoaded: true,
    lastError: null,
  };
}

function noCloudSnapshot(): AccountPaletteSessionSnapshot {
  return {
    accountId: 42,
    contractVersion: "account-palette-sync-v2.1",
    selection: {
      selection: { kind: "follow_theme", paletteId: null },
      revision: 1,
      updatedAt: null,
    },
    selectedPalette: null,
    library: null,
    bootstrapCompleted: true,
    libraryLoaded: false,
    lastError: null,
  };
}

describe("account palette page sync", () => {
  it("saves an edited draft through the V2 outbox and leaves no API work during editing", async () => {
    const local = palette("Local");
    const guest = palette("Guest", "guest-palette");
    const changed = { ...local, name: "Edited" };
    let current: Record<string, unknown>[] = [changed, guest];
    const manager = {
      getCustomTilePalettes: () => current,
      getActiveTilePaletteId: () => "p1",
      saveTilePaletteDraft: () => true,
      beginTilePaletteDraft: () => undefined,
      discardTilePaletteDraft: () => undefined,
      replaceCustomTilePalettes: (items: unknown[]) => {
        current = items as Record<string, unknown>[];
        return true;
      },
    };
    const sent: string[] = [];
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation.kind);
        return { status: "saved", revision: 4, palette: changed };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: manager,
      outbox,
      sessionSnapshot: () => snapshot(local) as AccountPaletteSessionSnapshot,
    });

    expect(sent).toEqual([]);
    const savedOutcome = await sync.saveDraft();
    expect(savedOutcome).toMatchObject({ status: "saved" });
    expect(sent).toContain("save");
    expect(sent).not.toContain("create");
    expect(current.find((item) => item.id === "p1")?.name).toBe("Edited");
  });

  it("reports queued when the API is offline and keeps the operation available for retry", async () => {
    const local = palette("Edited");
    let attempts = 0;
    const manager = {
      getCustomTilePalettes: () => [local],
      getActiveTilePaletteId: () => "p1",
      saveTilePaletteDraft: () => true,
      beginTilePaletteDraft: () => undefined,
      discardTilePaletteDraft: () => undefined,
    };
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (): Promise<PaletteOutboxSendResult> => {
        attempts += 1;
        throw new Error("offline");
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: manager,
      outbox,
      sessionSnapshot: () => snapshot(palette("Cloud")),
    });

    const queuedOutcome = await sync.saveDraft();
    expect(queuedOutcome).toMatchObject({ status: "queued" });
    expect(attempts).toBe(1);
    expect(await outbox.list(42)).toMatchObject([
      { status: "retry_wait", requestHash: expect.any(String) },
    ]);
  });

  it("does not apply a late account response after the page controller is disposed", async () => {
    const local = palette("Edited");
    let resolveSender: ((result: PaletteOutboxSendResult) => void) | undefined;
    let senderStarted: (() => void) | undefined;
    let applied = 0;
    const manager = {
      getCustomTilePalettes: () => [local],
      getActiveTilePaletteId: () => "p1",
      saveTilePaletteDraft: () => true,
      beginTilePaletteDraft: () => undefined,
      discardTilePaletteDraft: () => undefined,
      replaceCustomTilePalettes: () => {
        applied += 1;
        return true;
      },
    };
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async () =>
        new Promise<PaletteOutboxSendResult>((resolve) => {
          senderStarted?.();
          resolveSender = resolve;
        }),
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: manager,
      outbox,
      sessionSnapshot: () => snapshot(palette("Cloud")),
    });

    const senderStartedPromise = new Promise<void>((resolve) => {
      senderStarted = resolve;
    });
    const pending = sync.saveDraft();
    await senderStartedPromise;
    sync.dispose();
    resolveSender?.({ status: "saved", revision: 4, palette: local });
    await expect(pending).resolves.toMatchObject({
      status: "queued",
      code: "PALETTE_ACCOUNT_CHANGED",
    });
    expect(applied).toBe(0);
  });
  it("requires explicit confirmation before retaining a duplicate palette", async () => {
    const local = palette("Cloud");
    let current: Record<string, unknown>[] = [];
    const manager = {
      getCustomTilePalettes: () => current,
      getActiveTilePaletteId: () => "p1",
      saveTilePaletteDraft: () => true,
      beginTilePaletteDraft: () => undefined,
      discardTilePaletteDraft: () => undefined,
      replaceCustomTilePalettes: () => true,
    };
    let allowDuplicate = false;
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        allowDuplicate = operation.payload.allowDuplicate === true;
        return allowDuplicate
          ? { status: "saved", revision: 1, palette: local, paletteId: "p-new" }
          : {
              status: "duplicate_existing",
              paletteId: "p1",
              existingPaletteId: "p-existing",
              reason: "duplicate_content",
            };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: manager,
      outbox,
      sessionSnapshot: () => ({
        ...snapshot(local),
        library: null,
        selectedPalette: null,
        selection: {
          selection: { kind: "follow_theme", paletteId: null },
          revision: 1,
          updatedAt: null,
        },
      }),
    });

    current = [local];
    const duplicateOutcome = await sync.saveDraft();
    expect(duplicateOutcome).toMatchObject({ status: "duplicate_existing" });
    const confirmedOutcome = await sync.confirmDuplicate("p1");
    expect(confirmedOutcome).toMatchObject({ status: "saved" });
    expect(allowDuplicate).toBe(true);
  });

  it("persists the device snapshot before writing or sending an outbox operation", async () => {
    const changed = palette("Edited");
    const events: string[] = [];
    const manager = {
      getCustomTilePalettes: () => [changed],
      getActiveTilePaletteId: () => "p1",
      saveTilePaletteDraft: () => {
        events.push("local");
        return true;
      },
      beginTilePaletteDraft: () => undefined,
      discardTilePaletteDraft: () => undefined,
      replaceCustomTilePalettes: () => true,
    };
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (): Promise<PaletteOutboxSendResult> => {
        events.push("network");
        return { status: "saved", revision: 4, palette: changed };
      },
    });
    const enqueue = outbox.enqueue.bind(outbox);
    vi.spyOn(outbox, "enqueue").mockImplementation(async (operation) => {
      events.push("outbox");
      return enqueue(operation);
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: manager,
      outbox,
      sessionSnapshot: () => snapshot(palette("Cloud")),
    });

    await expect(sync.saveDraft()).resolves.toMatchObject({ status: "saved" });
    expect(events.indexOf("local")).toBeLessThan(events.indexOf("outbox"));
    expect(events.indexOf("outbox")).toBeLessThan(events.indexOf("network"));
  });

  it("does not enqueue or send when the device snapshot cannot be persisted", async () => {
    const changed = palette("Edited");
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: vi.fn(async () => ({ status: "saved" as const })),
    });
    const enqueue = vi.spyOn(outbox, "enqueue");
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => [changed],
        getActiveTilePaletteId: () => "p1",
        saveTilePaletteDraft: () => false,
      },
      outbox,
      sessionSnapshot: () => snapshot(palette("Cloud")),
    });

    await expect(sync.saveDraft()).resolves.toMatchObject({
      status: "failed",
      code: "LOCAL_PERSIST_FAILED",
    });
    expect(enqueue).not.toHaveBeenCalled();
    expect(await outbox.list(42)).toEqual([]);
  });

  it("hashes selection writes with the server-normalized selection shape", async () => {
    const local = palette("Cloud");
    let capturedOperation: PaletteOutboxOperation | undefined;
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        capturedOperation = operation;
        return { status: "saved", revision: 3 };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => [local],
        getActiveTilePaletteId: () => "follow-theme",
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox,
      sessionSnapshot: () => snapshot(local),
    });

    await sync.saveDraft();
    expect(capturedOperation?.kind).toBe("selection");
    if (!capturedOperation) throw new Error("selection operation missing");
    const expectedHash = await sha256Hex({
      kind: "selection",
      operationId: capturedOperation.operationId,
      payload: {
        establishPending: false,
        selection: { kind: "follow_theme", ref: null },
      },
    });
    expect(capturedOperation.requestHash).toBe(expectedHash);
  });

  it("folds a reloaded unsent create and cancels it when the local palette is deleted", async () => {
    const store = createInMemoryPaletteOutboxStore();
    const outbox = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      isOnline: () => false,
    });
    let current: Record<string, unknown>[] = [];
    const manager = {
      getCustomTilePalettes: () => current,
      getActiveTilePaletteId: () => "follow-theme",
      saveTilePaletteDraft: () => true,
      beginTilePaletteDraft: () => undefined,
      discardTilePaletteDraft: () => undefined,
    };
    const first = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: manager,
      outbox,
      sessionSnapshot: noCloudSnapshot,
    });

    current = [palette("First", "new-palette")];
    await expect(first.saveDraft()).resolves.toMatchObject({
      status: "queued",
    });
    expect(await outbox.list(42)).toMatchObject([
      { kind: "create", payload: { palette: { name: "First" } } },
    ]);
    first.dispose();

    current = [palette("Second", "new-palette")];
    const reloaded = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: manager,
      outbox,
      sessionSnapshot: noCloudSnapshot,
    });
    await expect(reloaded.saveDraft()).resolves.toMatchObject({
      status: "queued",
    });
    expect(await outbox.list(42)).toMatchObject([
      { kind: "create", payload: { palette: { name: "Second" } } },
    ]);

    current = [];
    await reloaded.saveDraft();
    expect(await outbox.list(42)).toEqual([]);
  });

  it("queues a follow-up save instead of rewriting a create that was already sent", async () => {
    const store = createInMemoryPaletteOutboxStore();
    await store.put({
      key: "42:new-palette:create:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountId: 42,
      paletteId: "new-palette",
      kind: "create",
      operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestHash: "frozen-create-hash",
      baseRevision: 1,
      payload: {
        palette: palette("First", "new-palette"),
        allowDuplicate: false,
      },
      status: "retry_wait",
      attempts: 1,
      createdAt: 1,
      updatedAt: 2,
      nextAttemptAt: 10,
      sentAt: 2,
      lastError: "offline",
      result: null,
    });
    const outbox = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      isOnline: () => false,
    });
    const current = [palette("Second", "new-palette")];
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => "follow-theme",
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox,
      sessionSnapshot: noCloudSnapshot,
    });

    await expect(sync.saveDraft()).resolves.toMatchObject({ status: "queued" });
    const operations = await outbox.list(42);
    expect(operations.map((operation) => operation.kind)).toEqual([
      "create",
      "save",
    ]);
    expect(operations[0]).toMatchObject({
      operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestHash: "frozen-create-hash",
    });
    expect(operations[1]).toMatchObject({
      baseRevision: 1,
      payload: { palette: { name: "Second" } },
      sentAt: null,
    });
  });

  it("selects the authoritative conflict copy after preserving it locally", async () => {
    const cloud = palette("Cloud", "p1");
    const edited = palette("Edited", "p1");
    const conflict = palette("Edited (conflict)", "p-conflict");
    let current = [edited];
    let activeId = "p1";
    const sent: PaletteOutboxOperation[] = [];
    const manager = {
      getCustomTilePalettes: () => current,
      getActiveTilePaletteId: () => activeId,
      saveTilePaletteDraft: () => true,
      beginTilePaletteDraft: () => undefined,
      discardTilePaletteDraft: () => undefined,
      replaceCustomTilePalettes: (
        items: unknown[],
        options?: Record<string, unknown>,
      ) => {
        current = items as Record<string, unknown>[];
        activeId = String(options?.activePaletteId || activeId);
        return true;
      },
    };
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation);
        if (operation.kind === "save") {
          return {
            status: "conflict_copy",
            revision: 1,
            palette: conflict,
            paletteId: "p-conflict",
            conflictCopyId: "p-conflict",
          };
        }
        return { status: "saved", revision: 3 };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: manager,
      outbox,
      sessionSnapshot: () => snapshot(cloud),
    });

    await expect(sync.saveDraft()).resolves.toMatchObject({
      status: "conflict_copy",
    });
    expect(activeId).toBe("p-conflict");
    expect(current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "p1", name: "Cloud" }),
        expect.objectContaining({
          id: "p-conflict",
          name: "Edited (conflict)",
        }),
      ]),
    );
    expect(sent.map((operation) => operation.kind)).toEqual([
      "save",
      "order",
      "selection",
    ]);
    expect(sent.at(-1)?.payload).toMatchObject({
      request: {
        selection: { kind: "custom", paletteId: "p-conflict" },
      },
    });
  });

  it.each(["capacity_full", "expired_operation"] as const)(
    "keeps a local create pending without changing selection on %s",
    async (terminalStatus) => {
      let current: Record<string, unknown>[] = [];
      const sent: PaletteOutboxOperation[] = [];
      const manager = {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => "new-palette",
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      };
      const outbox = createAccountPaletteOutbox({
        store: createInMemoryPaletteOutboxStore(),
        ownerId: "tab-a",
        sender: async (operation): Promise<PaletteOutboxSendResult> => {
          sent.push(operation);
          return { status: terminalStatus, paletteId: operation.paletteId };
        },
      });
      const sync = createAccountPalettePageSyncController({
        accountId: 42,
        themeManager: manager,
        outbox,
        sessionSnapshot: noCloudSnapshot,
      });
      current = [palette("Local pending", "new-palette")];

      await expect(sync.saveDraft()).resolves.toMatchObject({
        status: terminalStatus,
      });
      expect(current).toMatchObject([
        { id: "new-palette", name: "Local pending" },
      ]);
      expect(sent.map((operation) => operation.kind)).toEqual(["create"]);
    },
  );


  it("drops an unsent save when a synced palette is explicitly deleted", async () => {
    const store = createInMemoryPaletteOutboxStore();
    await store.put({
      key: "42:p1:save:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountId: 42,
      paletteId: "p1",
      kind: "save",
      operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestHash: "unsent-save-hash",
      baseRevision: 3,
      payload: {
        palette: palette("Offline edit", "p1"),
        allowDuplicate: false,
      },
      status: "pending",
      attempts: 0,
      createdAt: 1,
      updatedAt: 1,
      nextAttemptAt: 0,
      sentAt: null,
      lastError: null,
      result: null,
    });
    const outbox = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      isOnline: () => false,
    });
    let current = [palette("Cloud", "p1")];
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => "follow-theme",
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox,
      sessionSnapshot: () => snapshot(palette("Cloud", "p1")),
    });
    current = [];

    await expect(sync.saveDraft()).resolves.toMatchObject({ status: "queued" });
    expect(await outbox.list(42)).toMatchObject([
      { kind: "delete", paletteId: "p1", sentAt: null },
    ]);
  });


  it("reconciles an earlier save revision without reviving a newer local delete", async () => {
    const cloud = palette("Cloud", "p1");
    let current: Record<string, unknown>[] = [];
    const sent: PaletteOutboxOperation[] = [];
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation);
        return { status: "deleted", paletteId: operation.paletteId };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => "follow-theme",
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
        replaceCustomTilePalettes: (items: unknown[]) => {
          current = items as Record<string, unknown>[];
          return true;
        },
      },
      outbox,
      sessionSnapshot: () => snapshot(cloud),
    });
    sync.reconcileOperation({
      key: "42:p1:save:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountId: 42,
      paletteId: "p1",
      kind: "save",
      operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestHash: "saved-hash",
      baseRevision: 3,
      payload: { palette: palette("Offline edit", "p1") },
      status: "saved",
      attempts: 1,
      createdAt: 1,
      updatedAt: 2,
      nextAttemptAt: 0,
      sentAt: 1,
      lastError: null,
      result: {
        status: "saved",
        revision: 4,
        palette: palette("Remote saved", "p1"),
        paletteId: "p1",
      },
    });

    expect(current).toEqual([]);
    await expect(sync.saveDraft()).resolves.toMatchObject({ status: "deleted" });
    expect(sent.find((operation) => operation.kind === "delete")).toMatchObject({
      kind: "delete",
      paletteId: "p1",
      baseRevision: 4,
    });
  });


  it("records an older authoritative revision without overwriting a newer local intent", async () => {
    const cloud = palette("Cloud", "p1");
    let current = [palette("Latest local", "p1")];
    const sent: PaletteOutboxOperation[] = [];
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation);
        return { status: "capacity_full", paletteId: operation.paletteId };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => "p1",
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
        replaceCustomTilePalettes: (items: unknown[]) => {
          current = items as Record<string, unknown>[];
          return true;
        },
      },
      outbox,
      sessionSnapshot: () => snapshot(cloud),
    });
    sync.reconcileOperation(
      {
        key: "42:p1:save:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        accountId: 42,
        paletteId: "p1",
        kind: "save",
        operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        requestHash: "older-save-hash",
        baseRevision: 3,
        payload: { palette: palette("Older local", "p1") },
        status: "saved",
        attempts: 1,
        createdAt: 1,
        updatedAt: 2,
        nextAttemptAt: 0,
        sentAt: 1,
        lastError: null,
        result: {
          status: "saved",
          revision: 4,
          palette: palette("Older authority", "p1"),
          paletteId: "p1",
        },
      },
      { applyLocal: false },
    );

    expect(current).toMatchObject([{ name: "Latest local" }]);
    await expect(sync.saveDraft()).resolves.toMatchObject({
      status: "capacity_full",
    });
    expect(sent).toMatchObject([
      {
        kind: "save",
        paletteId: "p1",
        baseRevision: 4,
        payload: { palette: { name: "Latest local" } },
      },
    ]);
  });


  it("rekeys a locally edited tombstoned identity before the next upload", async () => {
    const cloud = palette("Cloud", "p1");
    let current = [palette("Offline edit", "p1")];
    let activeId = "p1";
    let deletedIdentity = true;
    const sent: PaletteOutboxOperation[] = [];
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation);
        if (operation.kind === "save" && deletedIdentity) {
          deletedIdentity = false;
          return {
            status: "expired_operation",
            code: "PALETTE_ID_TOMBSTONED",
            reason: "deleted_identity",
            paletteId: operation.paletteId,
          };
        }
        if (operation.kind === "create") {
          return {
            status: "saved",
            revision: 1,
            palette: operation.payload.palette,
            paletteId: operation.paletteId,
          };
        }
        return { status: "saved", revision: 1 };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => activeId,
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
        replaceCustomTilePalettes: (
          items: unknown[],
          options?: Record<string, unknown>,
        ) => {
          current = items as Record<string, unknown>[];
          activeId = String(options?.activePaletteId || activeId);
          return true;
        },
      },
      outbox,
      sessionSnapshot: () => snapshot(cloud),
    });

    await expect(sync.saveDraft()).resolves.toMatchObject({
      status: "expired_operation",
    });
    expect(current).toHaveLength(1);
    expect(current[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(current[0].id).not.toBe("p1");
    expect(activeId).toBe(current[0].id);

    await expect(sync.saveDraft()).resolves.toMatchObject({ status: "saved" });
    const create = sent.find((operation) => operation.kind === "create");
    expect(create).toMatchObject({
      paletteId: current[0].id,
      payload: { palette: { id: current[0].id, name: "Offline edit" } },
    });
  });


  it("accepts the authoritative winner when establishing a pending selection", async () => {
    let activeId = "warm-glaze-steps";
    const sent: PaletteOutboxOperation[] = [];
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation);
        return {
          status: "saved",
          revision: 2,
          selection: { kind: "builtin", paletteId: "jade-ochre" },
        };
      },
    });
    const pendingSnapshot: AccountPaletteSessionSnapshot = {
      ...noCloudSnapshot(),
      selection: {
        selection: { kind: "pending", paletteId: null },
        revision: 0,
        updatedAt: null,
      },
    };
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => [],
        getActiveTilePaletteId: () => activeId,
        setActiveTilePalette: (paletteId) => {
          activeId = paletteId;
          return paletteId;
        },
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox,
      sessionSnapshot: () => pendingSnapshot,
    });

    await expect(sync.saveDraft()).resolves.toMatchObject({ status: "saved" });
    expect(sent).toMatchObject([
      {
        kind: "selection",
        payload: {
          request: {
            establishPending: true,
            selection: { kind: "builtin", paletteId: "warm-glaze-steps" },
          },
        },
      },
    ]);
    expect(activeId).toBe("jade-ochre");

    await expect(sync.saveDraft()).resolves.toMatchObject({
      status: "unchanged",
    });
    expect(sent).toHaveLength(1);
  });


  it("hydrates an authoritative custom selection winner from the loaded library", () => {
    const cloud = palette("Cloud winner", "p1");
    let current: Record<string, unknown>[] = [];
    let activeId = "follow-theme";
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => activeId,
        setActiveTilePalette: (paletteId) => {
          activeId = paletteId;
          return paletteId;
        },
        replaceCustomTilePalettes: (
          items: unknown[],
          options?: Record<string, unknown>,
        ) => {
          current = items as Record<string, unknown>[];
          activeId = String(options?.activePaletteId || activeId);
          return true;
        },
      },
      outbox,
      sessionSnapshot: () => snapshot(cloud),
    });

    sync.reconcileOperation({
      key: "42:__selection__:selection:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountId: 42,
      paletteId: "__selection__",
      kind: "selection",
      operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestHash: "selection-hash",
      baseRevision: 0,
      payload: {
        request: {
          selection: { kind: "builtin", paletteId: "warm-glaze-steps" },
        },
      },
      status: "saved",
      attempts: 1,
      createdAt: 1,
      updatedAt: 2,
      nextAttemptAt: 0,
      sentAt: 1,
      lastError: null,
      result: {
        status: "saved",
        revision: 3,
        selection: { kind: "custom", paletteId: "p1" },
      },
    });

    expect(current).toMatchObject([{ id: "p1", name: "Cloud" }]);
    expect(activeId).toBe("p1");
  });


  it("rebases a delete retry from the authoritative base-expired response", async () => {
    const cloud = palette("Cloud", "p1");
    let current = [cloud];
    let deleteAttempts = 0;
    const sent: PaletteOutboxOperation[] = [];
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation);
        if (operation.kind !== "delete")
          return { status: "saved", revision: 1 };
        deleteAttempts += 1;
        return deleteAttempts === 1
          ? {
              status: "base_revision_expired",
              revision: 4,
              palette: palette("Remote revision 4", "p1"),
              paletteId: "p1",
            }
          : { status: "deleted", paletteId: "p1" };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => "follow-theme",
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox,
      sessionSnapshot: () => snapshot(cloud),
    });
    current = [];

    await expect(sync.saveDraft()).resolves.toMatchObject({
      status: "base_revision_expired",
    });
    await expect(sync.saveDraft()).resolves.toMatchObject({ status: "deleted" });
    expect(
      sent
        .filter((operation) => operation.kind === "delete")
        .map((operation) => operation.baseRevision),
    ).toEqual([3, 4]);
  });


  it("can replace a duplicate local identity with the existing authority", async () => {
    const cloud = palette("Cloud", "p1");
    const local = palette("Duplicate local", "p-new");
    let current: Record<string, unknown>[] = [];
    let activeId = "p-new";
    const sent: PaletteOutboxOperation[] = [];
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation);
        return {
          status: "duplicate_existing",
          paletteId: operation.paletteId,
          existingPaletteId: "p1",
          reason: "duplicate_content",
        };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => activeId,
        replaceCustomTilePalettes: (
          items: unknown[],
          options?: Record<string, unknown>,
        ) => {
          current = items as Record<string, unknown>[];
          activeId = String(options?.activePaletteId || activeId);
          return true;
        },
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox,
      sessionSnapshot: () => snapshot(cloud),
    });
    current = [local];

    await expect(sync.saveDraft()).resolves.toMatchObject({
      status: "duplicate_existing",
      paletteId: "p-new",
      existingPaletteId: "p1",
    });
    await expect(sync.useExistingPalette("p-new", "p1")).resolves.toMatchObject({
      status: "unchanged",
    });
    expect(current).toMatchObject([{ id: "p1", name: "Cloud" }]);
    expect(activeId).toBe("p1");
    expect(sent.map((operation) => operation.kind)).toEqual(["create"]);
  });


  it("preserves hidden cloud order entries that were never visible for deletion", async () => {
    const first = palette("Cloud", "p1");
    const hidden = palette("Hidden", "p2");
    const base = snapshot(first);
    const fullSnapshot: AccountPaletteSessionSnapshot = {
      ...base,
      library: {
        ...base.library!,
        palettes: [
          base.library!.palettes[0],
          {
            paletteId: "p2",
            revision: 2,
            palette: hidden,
            contentHash: "b",
            createdAt: null,
            updatedAt: null,
          },
        ],
        order: {
          paletteIds: ["p2", "p1"],
          revision: 2,
          updatedAt: null,
        },
      },
    };
    const sent: PaletteOutboxOperation[] = [];
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
      sender: async (operation): Promise<PaletteOutboxSendResult> => {
        sent.push(operation);
        return { status: "saved", revision: 3 };
      },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => [first],
        getActiveTilePaletteId: () => "p1",
        saveTilePaletteDraft: () => true,
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox,
      sessionSnapshot: () => fullSnapshot,
    });

    await expect(sync.saveDraft()).resolves.toMatchObject({
      status: "unchanged",
    });
    expect(sent).toEqual([]);
  });


  it("hydrates the delayed cloud library in authority order while preserving local-only palettes", () => {
    const first = palette("First", "p1");
    const second = palette("Second", "p2");
    const local = palette("Local only", "local-1");
    const base = snapshot(first);
    const fullSnapshot: AccountPaletteSessionSnapshot = {
      ...base,
      selection: {
        selection: { kind: "custom", paletteId: "p2" },
        revision: 3,
        updatedAt: null,
      },
      selectedPalette: {
        paletteId: "p2",
        revision: 2,
        palette: second,
        contentHash: "b",
        createdAt: null,
        updatedAt: null,
      },
      library: {
        ...base.library!,
        palettes: [
          {
            paletteId: "p1",
            revision: 3,
            palette: first,
            contentHash: "a",
            createdAt: null,
            updatedAt: null,
          },
          {
            paletteId: "p2",
            revision: 2,
            palette: second,
            contentHash: "b",
            createdAt: null,
            updatedAt: null,
          },
        ],
        order: {
          paletteIds: ["p2", "p1"],
          revision: 3,
          updatedAt: null,
        },
        selection: {
          selection: { kind: "custom", paletteId: "p2" },
          revision: 3,
          updatedAt: null,
        },
      },
    };
    let current = [local];
    let activeId = "local-1";
    const outbox = createAccountPaletteOutbox({
      store: createInMemoryPaletteOutboxStore(),
      ownerId: "tab-a",
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => activeId,
        setActiveTilePalette: (paletteId) => {
          activeId = paletteId;
          return paletteId;
        },
        replaceCustomTilePalettes: (
          items: unknown[],
          options?: Record<string, unknown>,
        ) => {
          current = items as Record<string, unknown>[];
          activeId = String(options?.activePaletteId || activeId);
          return true;
        },
        getTilePaletteDraftState: () => ({ dirty: false }),
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox,
      sessionSnapshot: () => fullSnapshot,
    });

    sync.syncBaseline();
    expect(current.map((item) => item.id)).toEqual(["p2", "p1", "local-1"]);
    expect(activeId).toBe("p2");
  });

  it("does not overwrite local storage when delayed library hydration would exceed ten palettes", () => {
    const cloud = Array.from({ length: 10 }, (_, index) =>
      palette(`Cloud ${index + 1}`, `p${index + 1}`),
    );
    const records = cloud.map((item, index) => ({
      paletteId: String(item.id),
      revision: 1,
      palette: item,
      contentHash: String(index),
      createdAt: null,
      updatedAt: null,
    }));
    const fullSnapshot: AccountPaletteSessionSnapshot = {
      ...noCloudSnapshot(),
      libraryLoaded: true,
      library: {
        palettes: records,
        order: {
          paletteIds: records.map((item) => item.paletteId),
          revision: 1,
          updatedAt: null,
        },
        selection: {
          selection: { kind: "follow_theme", paletteId: null },
          revision: 1,
          updatedAt: null,
        },
        tombstones: [],
        changes: [],
        nextCursor: "1",
        hasMore: false,
        resetRequired: false,
      },
    };
    const local = palette("Local pending", "local-pending");
    let current = [local];
    let replacements = 0;
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => current,
        getActiveTilePaletteId: () => "local-pending",
        replaceCustomTilePalettes: (items: unknown[]) => {
          replacements += 1;
          current = items as Record<string, unknown>[];
          return true;
        },
        getTilePaletteDraftState: () => ({ dirty: false }),
        beginTilePaletteDraft: () => undefined,
        discardTilePaletteDraft: () => undefined,
      },
      outbox: createAccountPaletteOutbox({
        store: createInMemoryPaletteOutboxStore(),
        ownerId: "tab-a",
      }),
      sessionSnapshot: () => fullSnapshot,
    });

    sync.syncBaseline();
    expect(replacements).toBe(0);
    expect(current).toEqual([local]);
    expect(sync.status()).toMatchObject({
      status: "capacity_full",
      code: "LOCAL_LIBRARY_OVER_CAPACITY",
    });
  });


  it("evaluates Theme Plaza eligibility only from the active palette state", async () => {
    const cloud = palette("Cloud", "p1");
    const other = palette("Other", "p2");
    let dirtyPaletteIds = ["p2"];
    const store = createInMemoryPaletteOutboxStore();
    await store.put({
      key: "42:p2:create:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountId: 42,
      paletteId: "p2",
      kind: "create",
      operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestHash: "other-capacity",
      baseRevision: 1,
      payload: { palette: other },
      status: "capacity_full",
      attempts: 1,
      createdAt: 1,
      updatedAt: 2,
      nextAttemptAt: 0,
      sentAt: 1,
      lastError: null,
      result: { status: "capacity_full", paletteId: "p2" },
    });
    const sync = createAccountPalettePageSyncController({
      accountId: 42,
      themeManager: {
        getCustomTilePalettes: () => [cloud, other],
        getActiveTilePaletteId: () => "p1",
        getTilePaletteDraftState: () => ({
          dirty: dirtyPaletteIds.length > 0,
          dirtyPaletteIds,
        }),
      },
      outbox: createAccountPaletteOutbox({ store, ownerId: "tab-a" }),
      sessionSnapshot: () => snapshot(cloud),
    });

    await expect(sync.themePlazaEligibility()).resolves.toEqual({
      eligible: true,
      status: "eligible",
      paletteId: "p1",
      revision: 3,
    });

    dirtyPaletteIds = ["p1"];
    await expect(sync.themePlazaEligibility()).resolves.toMatchObject({
      eligible: false,
      status: "dirty",
      paletteId: "p1",
    });

    dirtyPaletteIds = [];
    await store.put({
      key: "42:p1:save:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      accountId: 42,
      paletteId: "p1",
      kind: "save",
      operationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      requestHash: "active-pending",
      baseRevision: 3,
      payload: { palette: cloud },
      status: "pending",
      attempts: 0,
      createdAt: 3,
      updatedAt: 3,
      nextAttemptAt: 0,
      sentAt: null,
      lastError: null,
      result: null,
    });
    await expect(sync.themePlazaEligibility()).resolves.toMatchObject({
      eligible: false,
      status: "pending_write",
      paletteId: "p1",
    });
  });

});
