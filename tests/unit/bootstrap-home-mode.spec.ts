import { describe, expect, it } from "vitest";

import {
  DEFAULT_HOME_MODE_KEY,
  resolveHomeModeKey,
  resolveHomeModeSelection,
  resolveHomeModeSelectionFromContext
} from "../../src/bootstrap/home-mode";

function createCatalog(items: Record<string, Record<string, unknown>>) {
  return {
    getMode(key: string) {
      return items[key] || null;
    }
  };
}

describe("bootstrap home mode", () => {
  it("resolves home mode key from body data attribute", () => {
    expect(resolveHomeModeKey("practice_legacy")).toBe("practice_legacy");
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
      dataModeId: "practice_legacy",
      defaultModeKey: DEFAULT_HOME_MODE_KEY,
      searchLike: "?practice_ruleset=fibonacci",
      modeCatalog: createCatalog({
        practice_legacy: {
          key: "practice_legacy",
          ruleset: "pow2",
          mode_family: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        }
      })
    });

    expect(result.modeKey).toBe("practice_legacy");
    expect(result.modeConfig?.ruleset).toBe("fibonacci");
    expect(result.modeConfig?.mode_family).toBe("fibonacci");
    expect(result.modeConfig?.spawn_table).toEqual([
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ]);
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
          return name === "data-mode-id" ? "practice_legacy" : null;
        }
      },
      locationLike: {
        search: "?practice_ruleset=fibonacci"
      },
      modeCatalog: createCatalog({
        practice_legacy: {
          key: "practice_legacy",
          ruleset: "pow2",
          mode_family: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        }
      })
    });
    expect(result.modeKey).toBe("practice_legacy");
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
