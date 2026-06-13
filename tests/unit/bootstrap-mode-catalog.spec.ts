import { describe, expect, it } from "vitest";

import {
  createModeCatalogRuntime,
  installModeCatalogRuntime,
  resolveCatalogModeWithDefault,
  type ModeCatalogRuntime
} from "../../src/bootstrap/mode-catalog";

describe("bootstrap mode catalog", () => {
  it("creates the legacy CoreModeCatalogRuntime shape from TypeScript functions", () => {
    const runtime = createModeCatalogRuntime();

    expect(runtime.resolveCatalogModeWithDefault).toBe(resolveCatalogModeWithDefault);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreModeCatalogRuntime?: ModeCatalogRuntime } = {};

    const installed = installModeCatalogRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreModeCatalogRuntime);
    expect(installed?.resolveCatalogModeWithDefault).toBeTypeOf("function");
  });

  it("does not overwrite an existing mode catalog runtime", () => {
    const existing = createModeCatalogRuntime();
    const windowLike = { CoreModeCatalogRuntime: existing };

    const installed = installModeCatalogRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreModeCatalogRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installModeCatalogRuntime({ windowLike: null })).toBeNull();
  });

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
