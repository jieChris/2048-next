import { describe, expect, it } from "vitest";
import { createAccountPaletteV2Client } from "../../src/features/palette/account-palette-v2-client";
import type { PaletteOutboxOperation } from "../../src/features/palette/account-palette-outbox";

function operation(
  overrides: Partial<PaletteOutboxOperation> = {},
): PaletteOutboxOperation {
  return {
    key: "42:p1:save:op-1",
    accountId: 42,
    paletteId: "p1",
    kind: "save",
    operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    requestHash: "hash",
    baseRevision: 3,
    payload: { palette: { id: "p1", name: "Draft" }, allowDuplicate: false },
    status: "pending",
    attempts: 0,
    createdAt: 1,
    updatedAt: 1,
    nextAttemptAt: 0,
    sentAt: null,
    lastError: null,
    result: null,
    ...overrides,
  };
}

describe("account palette V2 client", () => {
  it("maps frozen save operations to the canonical route and returns the authoritative revision", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const client = createAccountPaletteV2Client({
      bases: ["https://api.example"],
      fetchLike: async (input, init) => {
        requestUrl = input;
        requestInit = init;
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: "merged",
              operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              paletteId: "p1",
              palette: {
                paletteId: "p1",
                revision: 4,
                palette: { id: "p1", name: "Merged" },
              },
              reason: null,
              existingPaletteId: null,
              conflictCopyId: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    await expect(client.send(operation())).resolves.toMatchObject({
      status: "merged",
      revision: 4,
      palette: { name: "Merged" },
    });
    expect(requestUrl).toBe("https://api.example/me/palettes/p1");
    expect(requestInit?.method).toBe("PUT");
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      operationId: operation().operationId,
      baseRevision: 3,
      palette: { name: "Draft" },
    });
  });

  it("keeps an in-progress idempotent operation retryable", async () => {
    const client = createAccountPaletteV2Client({
      bases: ["https://api.example"],
      fetchLike: async () =>
        new Response(
          JSON.stringify({
            success: false,
            code: "PALETTE_OPERATION_IN_PROGRESS",
            error: "operation is still running",
          }),
          { status: 409 },
        ),
    });

    await expect(client.send(operation())).resolves.toMatchObject({
      status: "transient",
      code: "PALETTE_OPERATION_IN_PROGRESS",
    });
  });

  it("classifies auth failures as account-paused rather than transient network retries", async () => {
    const client = createAccountPaletteV2Client({
      bases: ["https://api.example"],
      fetchLike: async () =>
        new Response(
          JSON.stringify({
            success: false,
            code: "ACCOUNT_INACTIVE",
            error: "inactive",
          }),
          { status: 401 },
        ),
    });
    await expect(client.send(operation())).resolves.toMatchObject({
      status: "paused_account",
      code: "ACCOUNT_INACTIVE",
    });
  });

  it("maps create, delete, selection, and order operations to their V2 resources", async () => {
    const calls: Array<{
      url: string;
      method: string;
      body: Record<string, unknown>;
    }> = [];
    const client = createAccountPaletteV2Client({
      bases: ["https://api.example"],
      fetchLike: async (input, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        calls.push({
          url: String(input),
          method: String(init?.method),
          body,
        });
        const path = new URL(String(input)).pathname;
        const preference =
          path.endsWith("/palette-selection") || path.endsWith("/palette-order");
        return new Response(
          JSON.stringify({
            success: true,
            data: preference
              ? { revision: 4 }
              : {
                  status: init?.method === "DELETE" ? "deleted" : "saved",
                  operationId: body.operationId,
                  paletteId: body.paletteId || "p1",
                },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    await client.send(
      operation({
        kind: "create",
        paletteId: "p-new",
        payload: {
          palette: { id: "p-new", name: "Created" },
          allowDuplicate: true,
        },
      }),
    );
    await client.send(operation({ kind: "delete", payload: {} }));
    await client.send(
      operation({
        kind: "selection",
        paletteId: "__selection__",
        payload: {
          request: {
            selection: { kind: "follow_theme", paletteId: null },
            establishPending: true,
          },
        },
      }),
    );
    await client.send(
      operation({
        kind: "order",
        paletteId: "__order__",
        payload: { request: { paletteIds: ["p-new", "p1"] } },
      }),
    );

    expect(calls).toMatchObject([
      {
        url: "https://api.example/me/palettes",
        method: "POST",
        body: {
          operationId: operation().operationId,
          paletteId: "p-new",
          palette: { id: "p-new", name: "Created" },
          allowDuplicate: true,
        },
      },
      {
        url: "https://api.example/me/palettes/p1",
        method: "DELETE",
        body: { operationId: operation().operationId, baseRevision: 3 },
      },
      {
        url: "https://api.example/me/palette-selection",
        method: "PUT",
        body: {
          operationId: operation().operationId,
          selection: { kind: "follow_theme", paletteId: null },
          establishPending: true,
        },
      },
      {
        url: "https://api.example/me/palette-order",
        method: "PUT",
        body: {
          operationId: operation().operationId,
          paletteIds: ["p-new", "p1"],
        },
      },
    ]);
  });

  it.each([
    ["PALETTE_NOT_FOUND", 404],
    ["PALETTE_ID_TOMBSTONED", 409],
    ["PALETTE_OPERATION_HASH_CONFLICT", 409],
  ] as const)("classifies %s as an expired operation", async (code, status) => {
    const client = createAccountPaletteV2Client({
      bases: ["https://api.example"],
      fetchLike: async () =>
        new Response(
          JSON.stringify({ success: false, code, error: code }),
          { status },
        ),
    });

    await expect(client.send(operation())).resolves.toMatchObject({
      status: "expired_operation",
      code,
    });
  });


  it("distinguishes an expired idempotency record from a deleted palette identity", async () => {
    const client = createAccountPaletteV2Client({
      bases: ["https://api.example"],
      fetchLike: async () =>
        new Response(
          JSON.stringify({
            success: false,
            code: "PALETTE_OPERATION_EXPIRED",
            error: "expired",
          }),
          { status: 409 },
        ),
    });

    await expect(client.send(operation())).resolves.toMatchObject({
      status: "expired_operation",
      code: "PALETTE_OPERATION_EXPIRED",
      reason: "operation_expired",
    });
  });


  it("returns authoritative selection and canonical order preference payloads", async () => {
    const client = createAccountPaletteV2Client({
      bases: ["https://api.example"],
      fetchLike: async (input) => {
        const path = new URL(String(input)).pathname;
        return new Response(
          JSON.stringify({
            success: true,
            data: path.endsWith("/palette-selection")
              ? {
                  selection: { kind: "builtin", paletteId: "jade-ochre" },
                  revision: 5,
                }
              : {
                  paletteIds: ["p1", "p-concurrent"],
                  revision: 6,
                },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    await expect(
      client.send(
        operation({
          kind: "selection",
          paletteId: "__selection__",
          payload: {
            request: {
              selection: { kind: "builtin", paletteId: "warm-glaze-steps" },
            },
          },
        }),
      ),
    ).resolves.toMatchObject({
      status: "saved",
      selection: { kind: "builtin", paletteId: "jade-ochre" },
      revision: 5,
    });
    await expect(
      client.send(
        operation({
          kind: "order",
          paletteId: "__order__",
          payload: { request: { paletteIds: ["p1"] } },
        }),
      ),
    ).resolves.toMatchObject({
      status: "saved",
      paletteIds: ["p1", "p-concurrent"],
      revision: 6,
    });
  });

});
