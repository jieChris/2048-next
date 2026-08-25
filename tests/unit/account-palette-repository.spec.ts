import { describe, expect, it, vi } from "vitest";

import {
  APP_PALETTE_MAX_PROFILES,
  AccountPaletteRepository,
  emptyAccountPaletteDocument,
  mergeUnknownAccountPaletteFields,
  parseAccountPaletteDocument,
  type AccountPaletteDocument,
  type AccountPaletteRemoteState,
  type AccountPaletteTransport,
} from "../../src/features/palette/account-palette-repository";

const TILE_VALUES = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
  65536,
];

function colors(length: number, offset = 0): string[] {
  return Array.from(
    { length },
    (_, index) => `#${String(offset + index + 1).padStart(6, "0")}`,
  );
}

function palette(id = "sunset") {
  const pow2 = colors(26);
  return {
    id,
    name: "晚霞",
    baseSkin: "web",
    colors: Object.fromEntries(
      TILE_VALUES.map((value, index) => [String(value), pow2[index]]),
    ),
    pow2,
    fibonacci: colors(16, 100),
    pow2Text: colors(26, 200),
    fibonacciText: colors(16, 300),
    pow2Border: Array.from({ length: 26 }, () => "transparent"),
    fibonacciBorder: Array.from({ length: 16 }, () => "transparent"),
    pow2Glow: Array.from({ length: 26 }, () => "transparent"),
    fibonacciGlow: Array.from({ length: 16 }, () => "transparent"),
    glowIntensity: 64,
    glowMultipliers: Array.from({ length: 26 }, (_, index) => 90 + index),
    futurePaletteField: { preserve: true },
  };
}

function document(palettes = [palette()]): AccountPaletteDocument {
  return {
    schema: 1,
    format: 3,
    activePaletteId: palettes[0]?.id ?? null,
    palettes,
    futureDocumentField: { preserve: true },
  } as AccountPaletteDocument;
}

function remote(
  overrides: Partial<AccountPaletteRemoteState> = {},
): AccountPaletteRemoteState {
  return {
    document: document(),
    revision: 3,
    updatedAt: null,
    supportedFormats: [2, 3],
    ...overrides,
  };
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function transport(
  options: {
    read?: AccountPaletteRemoteState;
    write?: ReturnType<AccountPaletteTransport["write"]>;
  } = {},
): AccountPaletteTransport & {
  read: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
} {
  return {
    read: vi.fn(async () => options.read ?? remote()),
    write: vi.fn(
      async () =>
        options.write ?? {
          status: "saved" as const,
          data: remote({ revision: 4 }),
        },
    ),
  };
}

describe("account palette repository", () => {
  it("round-trips the complete format-3 palette including unknown extension fields", () => {
    const parsed = parseAccountPaletteDocument(document());
    expect(parsed).toMatchObject({
      format: 3,
      futureDocumentField: { preserve: true },
      palettes: [
        {
          glowIntensity: 64,
          glowMultipliers: { length: 26 },
          futurePaletteField: { preserve: true },
        },
      ],
    });
  });

  it("preserves cloud-only extension fields when a dirty local document uploads", async () => {
    const storage = new MemoryStorage();
    const cloud = remote();
    const local = document();
    delete local.futureDocumentField;
    delete local.palettes[0].futurePaletteField;
    local.palettes[0].name = "本地改名";
    const api = transport({ read: cloud });
    const repository = new AccountPaletteRepository({
      storage,
      ownerKey: "user:42",
      transport: api,
    });
    repository.setDocument(local);

    await expect(repository.sync()).resolves.toBe("synced");
    expect(api.write).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        futureDocumentField: { preserve: true },
        palettes: [
          expect.objectContaining({
            name: "本地改名",
            futurePaletteField: { preserve: true },
          }),
        ],
      }),
    );
  });

  it("returns a conflict without applying either side automatically", async () => {
    const storage = new MemoryStorage();
    const applied: Array<{ source: string; name: string }> = [];
    const conflict = remote({
      revision: 8,
      document: document([{ ...palette(), name: "云端版本" }]),
    });
    const api = transport({
      write: Promise.resolve({ status: "conflict", data: conflict }),
    });
    const repository = new AccountPaletteRepository({
      storage,
      ownerKey: "user:42",
      transport: api,
      applyDocument(value, source) {
        applied.push({ source, name: value.palettes[0]?.name ?? "" });
      },
    });
    const local = document([{ ...palette(), name: "本地版本" }]);
    repository.setDocument(local);

    await expect(repository.sync()).resolves.toBe("conflict");
    expect(repository.snapshot()).toMatchObject({
      revision: 0,
      dirty: true,
      document: { palettes: [{ name: "本地版本" }] },
      conflict: { revision: 8, document: { palettes: [{ name: "云端版本" }] } },
    });
    expect(applied.at(-1)).toEqual({ source: "local", name: "本地版本" });
  });

  it("rejects documents beyond the shared eight-palette limit", () => {
    expect(APP_PALETTE_MAX_PROFILES).toBe(8);
    expect(
      parseAccountPaletteDocument(
        document(
          Array.from({ length: 9 }, (_, index) => palette(`p-${index}`)),
        ),
      ),
    ).toBeNull();
  });

  it("does not apply a cloud document until sync succeeds", async () => {
    const storage = new MemoryStorage();
    const applied: string[] = [];
    const api = transport({
      read: remote({ document: document([{ ...palette(), name: "云端" }]) }),
    });
    const repository = new AccountPaletteRepository({
      storage,
      ownerKey: "user:42",
      transport: api,
      applyDocument(value) {
        applied.push(value.palettes[0]?.name ?? "empty");
      },
    });

    expect(applied).toEqual(["empty"]);
    await expect(repository.sync()).resolves.toBe("synced");
    expect(applied).toEqual(["empty", "云端"]);
  });

  it("merges unknown fields by palette ID without resurrecting deleted palettes", () => {
    const cloud = document([palette("keep"), palette("deleted")]);
    const local = document([{ ...palette("keep"), name: "本地" }]);
    const merged = mergeUnknownAccountPaletteFields(local, cloud);
    expect(merged.palettes).toHaveLength(1);
    expect(merged.palettes[0]).toMatchObject({
      id: "keep",
      name: "本地",
      futurePaletteField: { preserve: true },
    });
  });

  it("promotes guest palettes into a new empty account without losing them", () => {
    const storage = new MemoryStorage();
    const guest = new AccountPaletteRepository({
      storage,
      ownerKey: "guest",
      transport: transport(),
    });
    guest.setDocument(document([{ ...palette(), name: "游客创作" }]));

    guest.switchOwner("user:42", true);
    expect(guest.snapshot()).toMatchObject({
      ownerKey: "user:42",
      revision: 0,
      dirty: true,
      document: { palettes: [{ name: "游客创作" }] },
    });
  });

  it("starts guest owners with an empty, unsynced document", async () => {
    const repository = new AccountPaletteRepository({
      storage: new MemoryStorage(),
      ownerKey: "guest",
      transport: transport(),
    });
    expect(repository.snapshot()).toMatchObject({
      document: emptyAccountPaletteDocument(),
      revision: 0,
      dirty: false,
    });
    await expect(repository.sync()).resolves.toBe("guest");
  });
});
