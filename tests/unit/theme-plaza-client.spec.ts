import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  createThemePlazaClient,
  parseThemePlazaCapabilities,
  parseThemePlazaListing,
} from "../../src/features/theme-plaza/theme-plaza-client";
import { renderThemePlazaPalettePreview } from "../../src/features/theme-plaza/palette-preview";

const TILE_VALUES = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
  65536,
];

function palette() {
  const pow2 = Array.from(
    { length: 26 },
    (_, index) => `#${String(index + 1).padStart(6, "0")}`,
  );
  return {
    id: "public",
    name: "public",
    baseSkin: "web",
    colors: Object.fromEntries(
      TILE_VALUES.map((value, index) => [String(value), pow2[index]]),
    ),
    pow2,
    fibonacci: pow2.slice(0, 16),
    pow2Text: Array.from({ length: 26 }, () => "#F9F6F2"),
    fibonacciText: Array.from({ length: 16 }, () => "#F9F6F2"),
    pow2Border: Array.from({ length: 26 }, () => "transparent"),
    fibonacciBorder: Array.from({ length: 16 }, () => "transparent"),
    pow2Glow: Array.from({ length: 26 }, () => "#00AAFF"),
    fibonacciGlow: Array.from({ length: 16 }, () => "#00AAFF"),
    glowIntensity: 50,
    glowMultipliers: Array.from({ length: 26 }, () => 100),
  };
}

describe("Theme Plaza client model", () => {
  it("parses stable capabilities with every write disabled", () => {
    expect(
      parseThemePlazaCapabilities({
        readEnabled: true,
        writeEnabled: false,
        reactionEnabled: false,
        saveEnabled: false,
        shareEnabled: false,
        autoPublishEnabled: false,
        paletteFormat3Enabled: true,
      }),
    ).toEqual({
      readEnabled: true,
      writeEnabled: false,
      reactionEnabled: false,
      saveEnabled: false,
      shareEnabled: false,
      autoPublishEnabled: false,
      paletteFormat3Enabled: true,
    });
  });

  it("parses independently enabled Theme Plaza capabilities without widening legacy writes", () => {
    expect(
      parseThemePlazaCapabilities({
        readEnabled: true,
        writeEnabled: false,
        reactionEnabled: true,
        saveEnabled: false,
        shareEnabled: false,
        autoPublishEnabled: false,
        paletteFormat3Enabled: true,
      }),
    ).toMatchObject({
      writeEnabled: false,
      reactionEnabled: true,
      saveEnabled: false,
      shareEnabled: false,
    });
  });

  it("accepts only complete format-3 published listing payloads", () => {
    const listing = parseThemePlazaListing({
      id: 7,
      version: {
        id: 12,
        revision: 2,
        title: "青瓷夜色",
        palette: palette(),
        publishedAt: "2026-08-25T00:00:00Z",
      },
      author: { nickname: "Jay", publicProfileId: 19 },
      stats: { likes: 8, dislikes: 2, references: 5 },
      viewer: { vote: 0, saved: false, owned: false },
    });
    expect(listing).toMatchObject({
      id: 7,
      version: {
        palette: { glowIntensity: 50, glowMultipliers: { length: 26 } },
      },
      stats: { likes: 8, dislikes: 2, references: 5 },
    });
    expect(
      parseThemePlazaListing({ id: 7, version: { palette: {} } }),
    ).toBeNull();
  });

  it("sends typed submission, vote, and report requests only through the Theme Plaza client", async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    const fetchLike = async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      requests.push({
        url: String(input),
        method: String(init?.method || "GET"),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response(
        JSON.stringify({
          success: true,
          data: { status: "ok" },
          capabilities: {
            readEnabled: true,
            writeEnabled: true,
            autoPublishEnabled: false,
            paletteFormat3Enabled: true,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    const client = createThemePlazaClient({
      bases: ["https://example.test/api"],
      fetchLike: fetchLike as typeof fetch,
    });

    await client.submit({ paletteId: "p-1", title: "青瓷夜色", revision: 3 });
    await client.vote(12, -1);
    await client.report(12, { category: "other", note: "说明" });

    expect(requests).toEqual([
      {
        url: "https://example.test/api/theme-plaza/me/submissions",
        method: "POST",
        body: { palette_id: "p-1", title: "青瓷夜色", revision: 3 },
      },
      {
        url: "https://example.test/api/theme-plaza/versions/12/vote",
        method: "PUT",
        body: { value: -1 },
      },
      {
        url: "https://example.test/api/theme-plaza/versions/12/reports",
        method: "POST",
        body: { category: "other", note: "说明" },
      },
    ]);
  });

  it("renders a real 4x4 preview with text, border, background, and glow styles", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const preview = renderThemePlazaPalettePreview({
      palette: palette(),
      documentLike: dom.window.document,
    });
    const tiles = preview.querySelectorAll<HTMLElement>(
      ".theme-plaza-preview-tile",
    );
    expect(tiles).toHaveLength(16);
    expect(tiles[0]).toMatchObject({ textContent: "2" });
    expect(tiles[0].style.backgroundColor).not.toBe("");
    expect(tiles[0].style.color).not.toBe("");
    expect(tiles[0].style.boxShadow).toContain("rgba");
    dom.window.close();
  });

  it("saves a public version through V2 operation and palette IDs", async () => {
    let request: { url: string; headers: Headers; body: Record<string, unknown> } | null = null;
    const client = createThemePlazaClient({
      bases: ["https://example.test/api"],
      fetchLike: (async (input, init) => {
        request = {
          url: String(input),
          headers: new Headers(init?.headers),
          body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        };
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: "saved",
              operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              paletteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              existingPaletteId: null,
              palette: {
                paletteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                revision: 1,
                palette: {
                  ...palette(),
                  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                  name: "青瓷夜色",
                },
                contentHash: "a".repeat(64),
                createdAt: null,
                updatedAt: null,
              },
              copyCreated: true,
              firstReference: true,
              currentSaved: true,
              reason: null,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch,
    });

    await expect(
      client.save(12, {
        operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        paletteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        allowDuplicate: false,
      }),
    ).resolves.toMatchObject({
      status: "saved",
      paletteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      palette: { revision: 1, palette: { name: "青瓷夜色" } },
      copyCreated: true,
      firstReference: true,
    });
    expect(request).not.toBeNull();
    expect(request!.url).toBe(
      "https://example.test/api/theme-plaza/versions/12/save",
    );
    expect(request!.headers.get("Idempotency-Key")).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(request!.body).toEqual({
      operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      paletteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      allowDuplicate: false,
    });
  });

});
