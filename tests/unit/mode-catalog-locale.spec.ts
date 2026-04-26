import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as vm from "node:vm";
import { describe, expect, it } from "vitest";

function loadModeCatalog(lang: "zh" | "en") {
  const code = readFileSync(resolve(process.cwd(), "js/mode_catalog.js"), "utf8");
  const sandbox: Record<string, unknown> = {
    window: {
      UII18N: {
        getLanguage: () => lang
      }
    },
    document: { documentElement: { getAttribute: () => "" } },
    localStorage: { getItem: () => null },
    module: { exports: {} },
    exports: {}
  };
  sandbox.global = sandbox.window;
  sandbox.self = sandbox.window;
  vm.runInNewContext(code, sandbox, { filename: "mode_catalog.js" });
  const windowLike = sandbox.window as { ModeCatalog?: { getMode?: (key: string) => { label?: string } | null; listModes?: () => Array<{ key?: string; label?: string }> } };
  return windowLike.ModeCatalog || (sandbox.module as { exports: unknown }).exports as { getMode?: (key: string) => { label?: string } | null; listModes?: () => Array<{ key?: string; label?: string }> };
}

describe("mode catalog localization", () => {
  it("returns localized diagonal labels by language", () => {
    const zhCatalog = loadModeCatalog("zh");
    const enCatalog = loadModeCatalog("en");

    expect(zhCatalog.getMode?.("diag_2x4_pow2_no_undo")?.label).toBe("斜向 4x2");
    expect(enCatalog.getMode?.("diag_2x4_pow2_no_undo")?.label).toBe("Diagonal 4x2");
  });

  it("returns localized fibonacci labels by language", () => {
    const zhCatalog = loadModeCatalog("zh");
    const enCatalog = loadModeCatalog("en");

    expect(zhCatalog.getMode?.("fib_4x2_no_undo")?.label).toBe("斐波那契 4x2");
    expect(enCatalog.getMode?.("fib_4x2_no_undo")?.label).toBe("Fibonacci 4x2");
  });

  it("returns localized generated special mode labels by language", () => {
    const zhCatalog = loadModeCatalog("zh");
    const enCatalog = loadModeCatalog("en");

    expect(zhCatalog.getMode?.("spawn_custom_4x4_pow2_no_undo")?.label).toBe("4x4 自定义4率（无撤回）");
    expect(enCatalog.getMode?.("spawn_custom_4x4_pow2_no_undo")?.label).toBe("4x4 Custom 4-Rate");
    expect(enCatalog.getMode?.("limit3_4x4_pow2_no_undo")?.label).toBe("Limited Undo 4x4 (3)");
    expect(enCatalog.getMode?.("combo_4x4_pow2_no_undo")?.label).toBe("Combo Scoring 4x4");
  });

  it("does not expose removed 4x4 probability variants", () => {
    const zhCatalog = loadModeCatalog("zh");
    const keys = (zhCatalog.listModes?.() || []).map((mode) => mode.key);

    expect(zhCatalog.getMode?.("spawn95_4x4_pow2_undo")).toBeNull();
    expect(zhCatalog.getMode?.("spawn95_4x4_pow2_no_undo")).toBeNull();
    expect(zhCatalog.getMode?.("spawn80_4x4_pow2_undo")).toBeNull();
    expect(zhCatalog.getMode?.("spawn80_4x4_pow2_no_undo")).toBeNull();
    expect(keys).not.toContain("spawn95_4x4_pow2_undo");
    expect(keys).not.toContain("spawn95_4x4_pow2_no_undo");
    expect(keys).not.toContain("spawn80_4x4_pow2_undo");
    expect(keys).not.toContain("spawn80_4x4_pow2_no_undo");
  });
});

