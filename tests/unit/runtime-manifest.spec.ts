import { describe, expect, it } from "vitest";

import {
  PAGE_MANIFESTS,
  getPageManifest,
  getProductionPages,
  getAllDeclaredCapabilities,
  validateManifestCapabilities
} from "../../src/entries/runtime-manifest";

describe("runtime-manifest: PAGE_MANIFESTS", () => {
  it("has 12 page entries", () => {
    expect(PAGE_MANIFESTS.length).toBe(12);
  });

  it("all entries have unique pageId", () => {
    const ids = PAGE_MANIFESTS.map((m) => m.pageId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all entries have non-empty capabilities", () => {
    for (const entry of PAGE_MANIFESTS) {
      expect(entry.capabilities.length).toBeGreaterThan(0);
    }
  });

  it("all entries have htmlFile ending in .html", () => {
    for (const entry of PAGE_MANIFESTS) {
      expect(entry.htmlFile).toMatch(/\.html$/);
    }
  });
});

describe("runtime-manifest: getPageManifest", () => {
  it("returns manifest for known page", () => {
    const manifest = getPageManifest("index");
    expect(manifest).toBeDefined();
    expect(manifest!.htmlFile).toBe("index.html");
  });

  it("returns undefined for unknown page", () => {
    expect(getPageManifest("nonexistent")).toBeUndefined();
  });
});

describe("runtime-manifest: getProductionPages", () => {
  it("excludes devOnly pages", () => {
    const prod = getProductionPages();
    expect(prod.every((p) => !p.devOnly)).toBe(true);
    expect(prod.length).toBe(11);
  });
});

describe("runtime-manifest: validateManifestCapabilities", () => {
  it("returns no errors when all capabilities are known", () => {
    const known = getAllDeclaredCapabilities();
    for (const entry of PAGE_MANIFESTS) {
      const errors = validateManifestCapabilities(entry, known);
      expect(errors).toEqual([]);
    }
  });

  it("reports unknown capabilities", () => {
    const smallSet = new Set<never>();
    const entry = PAGE_MANIFESTS[0];
    const errors = validateManifestCapabilities(entry, smallSet);
    expect(errors.length).toBeGreaterThan(0);
  });
});
