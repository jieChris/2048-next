import { describe, expect, it } from "vitest";
import {
  ACCOUNT_PALETTE_SESSION_CONTRACT,
  createAccountPaletteSessionController,
} from "../../src/features/palette/account-palette-session";

class MemoryStorage {
  #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }
}

function palette(id: string, name = "云端色板") {
  const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
  const colors = Object.fromEntries(values.map((value, index) => [String(value), `#${String(index + 1).padStart(6, "0")}`]));
  const pow2 = Object.values(colors);
  return {
    id,
    name,
    baseSkin: "web",
    colors,
    pow2: [...pow2, ...Array.from({ length: 10 }, () => pow2.at(-1)!)],
    fibonacci: pow2.slice(0, 16),
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

function bootstrapBody(kind: "custom" | "follow_theme" = "custom") {
  const selected = kind === "custom" ? {
    paletteId: "p-cloud",
    revision: 3,
    palette: palette("p-cloud"),
    contentHash: "a".repeat(64),
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-26T00:00:00Z",
  } : null;
  return {
    success: true,
    data: {
      selection: {
        selection: { kind, paletteId: kind === "custom" ? "p-cloud" : null },
        revision: 4,
        updatedAt: "2026-08-26T00:00:00Z",
      },
      selectedPalette: selected,
      capabilities: {
        readEnabled: true,
        writeEnabled: false,
        legacyPutEnabled: true,
        maxActivePalettes: 10,
        contractVersion: ACCOUNT_PALETTE_SESSION_CONTRACT,
      },
    },
  };
}

function libraryBody() {
  return {
    success: true,
    data: {
      palettes: [bootstrapBody().data.selectedPalette],
      order: { paletteIds: ["p-cloud"], revision: 2, updatedAt: "2026-08-26T00:00:00Z" },
      selection: bootstrapBody().data.selection,
      tombstones: [],
      changes: [],
      nextCursor: "8",
      hasMore: false,
      resetRequired: false,
      capabilities: bootstrapBody().data.capabilities,
    },
  };
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("account palette session bootstrap", () => {
  it("deduplicates concurrent bootstrap calls and applies one selected custom palette", async () => {
    const storage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    const deferred: { resolve?: (value: Response) => void } = {};
    let calls = 0;
    const manager = {
      getCustomTilePalettes: () => [{ ...palette("local") }],
      replaceCustomTilePalettes: (items: unknown[], options: Record<string, unknown>) => {
        manager.applied = { items, options };
        return true;
      },
      applied: null as unknown,
    };
    const controller = createAccountPaletteSessionController({
      accountId: 42,
      storageLike: storage,
      sessionStorageLike: sessionStorage,
      windowLike: { addEventListener: () => undefined, ThemeManager: manager },
      bases: ["https://api.example"],
      fetchLike: async () => {
        calls += 1;
        return new Promise<Response>((resolve) => { deferred.resolve = resolve; });
      },
    });

    const first = controller.bootstrap();
    const second = controller.bootstrap();
    expect(calls).toBe(1);
    deferred.resolve?.(response(bootstrapBody()));
    const [one, two] = await Promise.all([first, second]);

    expect(one.status).toBe("synced");
    expect(two.status).toBe("synced");
    expect(controller.snapshot()).toMatchObject({ accountId: 42, selection: { selection: { kind: "custom", paletteId: "p-cloud" } }, selectedPalette: { paletteId: "p-cloud" } });
    expect(manager.applied).toMatchObject({ options: { activePaletteId: "p-cloud", source: "account-sync" } });
  });

  it("uses the session marker and account cache on page navigation without a second bootstrap request", async () => {
    const storage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    let calls = 0;
    const fetchLike = async () => {
      calls += 1;
      return response(bootstrapBody("follow_theme"));
    };
    const first = createAccountPaletteSessionController({ accountId: 7, storageLike: storage, sessionStorageLike: sessionStorage, bases: ["https://api.example"], fetchLike });
    await expect(first.bootstrap()).resolves.toMatchObject({ status: "synced" });
    const second = createAccountPaletteSessionController({ accountId: 7, storageLike: storage, sessionStorageLike: sessionStorage, bases: ["https://api.example"], fetchLike });

    await expect(second.bootstrap()).resolves.toMatchObject({ status: "cached" });
    expect(calls).toBe(1);
    expect(second.snapshot()).toMatchObject({ accountId: 7, bootstrapCompleted: true, selectedPalette: null });
  });

  it("does not load the full library until explicitly requested", async () => {
    const storage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    const paths: string[] = [];
    const controller = createAccountPaletteSessionController({
      accountId: 8,
      storageLike: storage,
      sessionStorageLike: sessionStorage,
      bases: ["https://api.example"],
      fetchLike: async (input) => {
        paths.push(String(input));
        return response(paths.length === 1 ? bootstrapBody("follow_theme") : libraryBody());
      },
    });

    await controller.bootstrap();
    expect(paths).toEqual(["https://api.example/me/palette-sync/bootstrap"]);
    expect(controller.snapshot()?.library).toBeNull();
    await controller.loadLibrary();
    expect(paths).toEqual([
      "https://api.example/me/palette-sync/bootstrap",
      "https://api.example/me/palettes",
    ]);
    expect(controller.snapshot()).toMatchObject({ libraryLoaded: true, library: { nextCursor: "8" } });
  });

  it("retries a full library snapshot when the server requires a cursor reset", async () => {
    const calls: string[] = [];
    const controller = createAccountPaletteSessionController({
      accountId: 9,
      storageLike: new MemoryStorage(),
      sessionStorageLike: new MemoryStorage(),
      bases: ["https://api.example"],
      fetchLike: async (input) => {
        calls.push(String(input));
        if (calls.length === 1) return response(bootstrapBody("follow_theme"));
        if (calls.length === 2) return response({ ...libraryBody(), data: { ...libraryBody().data, resetRequired: true } });
        return response(libraryBody());
      },
    });

    await controller.loadLibrary();

    expect(calls).toEqual([
      "https://api.example/me/palette-sync/bootstrap",
      "https://api.example/me/palettes",
      "https://api.example/me/palettes",
    ]);
    expect(controller.snapshot()).toMatchObject({ libraryLoaded: true, library: { resetRequired: false } });
  });
  it("drops a late response after the authenticated account changes", async () => {
    const storage = new MemoryStorage();
    storage.setItem("2048_auth_token_v1", "token");
    storage.setItem("2048_auth_userId_v1", "41");
    let notify: (() => void) | undefined;
    const deferred: { resolve?: (value: Response) => void } = {};
    const controller = createAccountPaletteSessionController({
      storageLike: storage,
      sessionStorageLike: new MemoryStorage(),
      windowLike: { addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => { notify = listener as () => void; } },
      bases: ["https://api.example"],
      fetchLike: async () => new Promise<Response>((resolve) => { deferred.resolve = resolve; }),
    });
    const pending = controller.bootstrap();
    storage.setItem("2048_auth_userId_v1", "42");
    notify?.();
    deferred.resolve?.(response(bootstrapBody()));
    const result = await pending;

    if (result.status !== "failed") return;
    expect(result.code).toBe("STALE_ACCOUNT_PALETTE_RESPONSE");
    expect(controller.snapshot()).toBeNull();
  });
});
