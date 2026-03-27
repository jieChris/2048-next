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
});

