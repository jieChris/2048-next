import { describe, expect, it, vi } from "vitest";
import {
  createAccountPaletteOutbox,
  createInMemoryPaletteOutboxStore,
  type PaletteOutboxOperation,
  type PaletteOutboxSendResult,
} from "../../src/features/palette/account-palette-outbox";

function operation(
  overrides: Partial<PaletteOutboxOperation> = {},
): PaletteOutboxOperation {
  const base: PaletteOutboxOperation = {
    key: "42:palette-1:save:op-1",
    accountId: 42,
    paletteId: "palette-1",
    kind: "save",
    operationId: "op-1",
    requestHash: "hash-1",
    baseRevision: 3,
    payload: { palette: { id: "palette-1", name: "Draft" } },
    status: "pending",
    attempts: 0,
    createdAt: 1,
    updatedAt: 1,
    nextAttemptAt: 0,
    sentAt: null,
    lastError: null,
    result: null,
  };
  return { ...base, ...overrides };
}

describe("account palette outbox", () => {
  it("folds unsent operations by account and stable palette id without changing a sent operation", async () => {
    const store = createInMemoryPaletteOutboxStore();
    const outbox = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      now: () => 10,
    });

    await outbox.enqueue(operation());
    await outbox.enqueue(
      operation({
        operationId: "op-2",
        requestHash: "hash-2",
        payload: { palette: { id: "palette-1", name: "Latest" } },
      }),
    );
    expect(await outbox.list(42)).toMatchObject([
      {
        operationId: "op-2",
        requestHash: "hash-2",
        payload: { palette: { name: "Latest" } },
      },
    ]);

    await store.put(
      operation({
        key: "42:palette-1:save:op-1",
        sentAt: 5,
        status: "retry_wait",
        updatedAt: 5,
      }),
    );
    await outbox.enqueue(
      operation({
        key: "42:palette-1:save:op-3",
        operationId: "op-3",
        requestHash: "hash-3",
      }),
    );
    expect((await outbox.list(42)).map((item) => item.operationId)).toEqual([
      "op-1",
      "op-3",
    ]);
  });

  it("discards only unsent operations when a local create is deleted", async () => {
    const store = createInMemoryPaletteOutboxStore();
    const outbox = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      now: () => 10,
    });
    await outbox.enqueue(
      operation({ kind: "create", operationId: "create-1" }),
    );

    await expect(
      outbox.discardUnsent(42, "palette-1", ["create"]),
    ).resolves.toMatchObject([{ operationId: "create-1" }]);
    expect(await outbox.list(42)).toEqual([]);

    await store.put(
      operation({
        kind: "create",
        operationId: "create-sent",
        sentAt: 5,
        status: "retry_wait",
      }),
    );
    await expect(
      outbox.discardUnsent(42, "palette-1", ["create"]),
    ).resolves.toEqual([]);
    expect(await outbox.list(42)).toMatchObject([
      { operationId: "create-sent", status: "retry_wait" },
    ]);
  });

  it("keeps each operation bound to its account and pauses the old account on switch", async () => {
    const store = createInMemoryPaletteOutboxStore();
    const outbox = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      now: () => 10,
    });
    await outbox.enqueue(operation());
    await outbox.enqueue(
      operation({
        key: "7:palette-2:save",
        accountId: 7,
        paletteId: "palette-2",
        operationId: "op-7",
      }),
    );

    outbox.setActiveAccount(42);
    outbox.setActiveAccount(7);
    expect((await outbox.list(42))[0]).toMatchObject({
      status: "paused_account",
    });
    expect((await outbox.list(7))[0]).toMatchObject({
      accountId: 7,
      status: "pending",
    });
  });

  it("resumes an auth-paused operation when the same account becomes active again", async () => {
    const store = createInMemoryPaletteOutboxStore();
    let calls = 0;
    const outbox = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      now: () => 10,
      sender: async () => {
        calls += 1;
        return calls === 1
          ? { status: "paused_account", code: "TOKEN_EXPIRED" }
          : { status: "saved", revision: 4 };
      },
    });
    outbox.setActiveAccount(42);
    await outbox.enqueue(operation());
    await outbox.drain();
    expect(await outbox.list(42)).toMatchObject([
      { status: "paused_account", pauseReason: "TOKEN_EXPIRED" },
    ]);

    outbox.setActiveAccount(42);
    expect(await outbox.list(42)).toMatchObject([{ status: "pending" }]);
    await outbox.drain({ force: true });
    expect(await outbox.list(42)).toMatchObject([{ status: "saved" }]);
  });

  it("uses a lease so only one drainer sends an operation, then preserves terminal result status", async () => {
    const store = createInMemoryPaletteOutboxStore();
    const sender = vi.fn(
      async (): Promise<PaletteOutboxSendResult> => ({
        status: "merged",
        revision: 4,
        palette: { id: "palette-1", name: "Merged" },
      }),
    );
    const first = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      now: () => 10,
      sender,
    });
    const second = createAccountPaletteOutbox({
      store,
      ownerId: "tab-b",
      now: () => 10,
      sender,
    });
    first.setActiveAccount(42);
    second.setActiveAccount(42);
    await first.enqueue(operation());

    await Promise.all([first.drain(), second.drain()]);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(await first.list(42)).toMatchObject([
      { status: "merged", operationId: "op-1", result: { revision: 4 } },
    ]);
  });

  it("renews the account lease while a slow request is in flight", async () => {
    vi.useFakeTimers();
    try {
      const store = createInMemoryPaletteOutboxStore();
      let clock = 0;
      let finish: ((result: PaletteOutboxSendResult) => void) | undefined;
      let markStarted: (() => void) | undefined;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const sender = vi.fn(
        async () =>
          new Promise<PaletteOutboxSendResult>((resolve) => {
            markStarted?.();
            finish = resolve;
          }),
      );
      const first = createAccountPaletteOutbox({
        store,
        ownerId: "tab-a",
        now: () => clock,
        leaseMs: 1_000,
        sender,
      });
      const second = createAccountPaletteOutbox({
        store,
        ownerId: "tab-b",
        now: () => clock,
        leaseMs: 1_000,
        sender,
      });
      first.setActiveAccount(42);
      second.setActiveAccount(42);
      await first.enqueue(operation());

      const pending = first.drain();
      await started;
      clock = 900;
      await vi.advanceTimersByTimeAsync(400);
      clock = 1_200;
      await expect(second.drain()).resolves.toEqual([]);
      expect(sender).toHaveBeenCalledTimes(1);

      finish?.({ status: "saved", revision: 4 });
      await pending;
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks transient failures for retry and keeps the frozen operation request", async () => {
    const store = createInMemoryPaletteOutboxStore();
    let calls = 0;
    const sender = vi.fn(async (): Promise<PaletteOutboxSendResult> => {
      calls += 1;
      if (calls === 1) throw new Error("offline");
      return { status: "saved", revision: 5 };
    });
    const outbox = createAccountPaletteOutbox({
      store,
      ownerId: "tab-a",
      now: () => 10,
      sender,
      retryBaseMs: 100,
    });
    outbox.setActiveAccount(42);
    await outbox.enqueue(operation());
    await outbox.drain();
    expect(await outbox.list(42)).toMatchObject([
      {
        status: "retry_wait",
        operationId: "op-1",
        requestHash: "hash-1",
        lastError: "offline",
      },
    ]);

    await outbox.drain({ force: true });
    expect(sender).toHaveBeenCalledTimes(2);
    expect(await outbox.list(42)).toMatchObject([
      { status: "saved", operationId: "op-1", requestHash: "hash-1" },
    ]);
  });
});
