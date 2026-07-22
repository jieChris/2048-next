import { describe, expect, it } from "vitest";

import {
  DEFAULT_HOME_MODE_KEY,
  createHomeModeRuntime,
  installHomeModeRuntime,
  resolveHomeModeKey,
  resolveHomeModeSelection,
  resolveHomeModeSelectionFromContext,
  type HomeModeRuntime
} from "../../src/bootstrap/home-mode";

function createCatalog(items: Record<string, Record<string, unknown>>) {
  return {
    getMode(key: string) {
      return items[key] || null;
    }
  };
}

describe("bootstrap home mode", () => {
  it("creates the legacy CoreHomeModeRuntime shape from TypeScript functions", () => {
    const runtime = createHomeModeRuntime();

    expect(runtime.DEFAULT_HOME_MODE_KEY).toBe(DEFAULT_HOME_MODE_KEY);
    expect(runtime.resolveHomeModeKey).toBe(resolveHomeModeKey);
    expect(runtime.resolveHomeModeSelection).toBe(resolveHomeModeSelection);
    expect(runtime.resolveHomeModeSelectionFromContext).toBe(resolveHomeModeSelectionFromContext);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreHomeModeRuntime?: HomeModeRuntime } = {};

    const installed = installHomeModeRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreHomeModeRuntime);
    expect(installed?.resolveHomeModeSelection).toBeTypeOf("function");
  });

  it("does not overwrite an existing home mode runtime", () => {
    const existing = createHomeModeRuntime();
    const windowLike = { CoreHomeModeRuntime: existing };

    const installed = installHomeModeRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreHomeModeRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installHomeModeRuntime({ windowLike: null })).toBeNull();
  });

  it("resolves home mode key from body data attribute", () => {
    expect(resolveHomeModeKey("practice")).toBe("practice");
    expect(resolveHomeModeKey("  capped_4x4_pow2_no_undo  ")).toBe("capped_4x4_pow2_no_undo");
    expect(resolveHomeModeKey("")).toBe(DEFAULT_HOME_MODE_KEY);
    expect(resolveHomeModeKey(null, "fallback_mode")).toBe("fallback_mode");
  });

  it("falls back to default mode when mode is missing", () => {
    const result = resolveHomeModeSelection({
      dataModeId: "missing_mode",
      defaultModeKey: "standard_4x4_pow2_no_undo",
      searchLike: "",
      modeCatalog: createCatalog({
        standard_4x4_pow2_no_undo: { key: "standard_4x4_pow2_no_undo", ruleset: "pow2" }
      })
    });

    expect(result.modeKey).toBe("missing_mode");
    expect(result.modeConfig).toEqual({
      key: "standard_4x4_pow2_no_undo",
      ruleset: "pow2"
    });
  });

  it("applies fibonacci practice ruleset when in practice mode", () => {
    const result = resolveHomeModeSelection({
      dataModeId: "practice",
      defaultModeKey: DEFAULT_HOME_MODE_KEY,
      searchLike: "?practice_ruleset=fibonacci",
      modeCatalog: createCatalog({
        practice: {
          key: "practice",
          ruleset: "pow2",
          mode_family: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        }
      })
    });

    expect(result.modeKey).toBe("practice");
    expect(result.modeConfig?.ruleset).toBe("fibonacci");
    expect(result.modeConfig?.mode_family).toBe("fibonacci");
    expect(result.modeConfig?.spawn_table).toEqual([
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ]);
  });

  it("ignores 6x6 and larger practice mode query selections", () => {
    const result = resolveHomeModeSelection({
      dataModeId: "practice",
      defaultModeKey: DEFAULT_HOME_MODE_KEY,
      searchLike: "?practice_mode_key=board_6x6_pow2_no_undo",
      modeCatalog: createCatalog({
        practice: {
          key: "practice",
          board_width: 4,
          board_height: 4,
          ruleset: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        },
        board_6x6_pow2_no_undo: {
          key: "board_6x6_pow2_no_undo",
          board_width: 6,
          board_height: 6,
          ruleset: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        }
      })
    });

    expect(result.modeKey).toBe("practice");
    expect(result.modeConfig?.key).toBe("practice");
    expect(result.modeConfig?.board_width).toBe(4);
    expect(result.modeConfig?.board_height).toBe(4);
  });

  it("does not modify non-practice mode config", () => {
    const result = resolveHomeModeSelection({
      dataModeId: "capped_4x4_pow2_no_undo",
      defaultModeKey: DEFAULT_HOME_MODE_KEY,
      searchLike: "?practice_ruleset=fibonacci",
      modeCatalog: createCatalog({
        capped_4x4_pow2_no_undo: {
          key: "capped_4x4_pow2_no_undo",
          ruleset: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        }
      })
    });

    expect(result.modeKey).toBe("capped_4x4_pow2_no_undo");
    expect(result.modeConfig).toEqual({
      key: "capped_4x4_pow2_no_undo",
      ruleset: "pow2",
      spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
    });
  });

  it("resolves home mode selection from body/location context safely", () => {
    const result = resolveHomeModeSelectionFromContext({
      bodyLike: {
        getAttribute(name: string) {
          return name === "data-mode-id" ? "practice" : null;
        }
      },
      locationLike: {
        search: "?practice_ruleset=fibonacci"
      },
      modeCatalog: createCatalog({
        practice: {
          key: "practice",
          ruleset: "pow2",
          mode_family: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        }
      })
    });
    expect(result.modeKey).toBe("practice");
    expect(result.modeConfig?.ruleset).toBe("fibonacci");

    const fallback = resolveHomeModeSelectionFromContext({
      bodyLike: null,
      locationLike: null,
      modeCatalog: createCatalog({
        [DEFAULT_HOME_MODE_KEY]: { key: DEFAULT_HOME_MODE_KEY, ruleset: "pow2" }
      })
    });
    expect(fallback.modeKey).toBe(DEFAULT_HOME_MODE_KEY);
    expect(fallback.modeConfig?.key).toBe(DEFAULT_HOME_MODE_KEY);
  });
});
