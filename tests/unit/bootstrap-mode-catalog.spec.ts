import { describe, expect, it } from "vitest";

import { resolveCatalogModeWithDefault } from "../../src/bootstrap/mode-catalog";

describe("bootstrap mode catalog", () => {
  it("returns preferred mode when available", () => {
    const catalog = {
      getMode(key: string) {
        if (key === "mode_a") return { key: "mode_a" };
        if (key === "default_mode") return { key: "default_mode" };
        return null;
      }
    };

    expect(resolveCatalogModeWithDefault(catalog, "mode_a", "default_mode")).toEqual({
      key: "mode_a"
    });
  });

  it("falls back to default mode key", () => {
    const catalog = {
      getMode(key: string) {
        if (key === "default_mode") return { key: "default_mode" };
        return null;
      }
    };

    expect(resolveCatalogModeWithDefault(catalog, "missing_mode", "default_mode")).toEqual({
      key: "default_mode"
    });
  });

  it("returns null when catalog is missing or invalid", () => {
    expect(resolveCatalogModeWithDefault(null, "mode_a", "default_mode")).toBeNull();
    expect(resolveCatalogModeWithDefault({ getMode: null }, "mode_a", "default_mode")).toBeNull();
  });
});
