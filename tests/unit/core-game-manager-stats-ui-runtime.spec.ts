import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

function loadStatsUiRuntime(extraContext?: Record<string, unknown>) {
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_stats_ui_helpers_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    GameManager: {
      STATS_PANEL_VISIBLE_KEY: "statsPanelVisible"
    },
    console,
    resolveManagerDocumentLike() {
      return null;
    },
    ...(extraContext || {})
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);
  return context as {
    resolveStatsPanelCopy: (lang: string) => Record<string, string>;
    resolveStatsPanelLanguage: (manager: Record<string, unknown>, documentLike: Record<string, unknown>) => string;
  };
}

describe("core game manager stats ui runtime", () => {
  it("delegates language and copy resolution to the TypeScript runtime", () => {
    const resolveStatsPanelLanguage = vi.fn(() => "en");
    const resolveStatsPanelCopy = vi.fn(() => ({
      button: "Runtime Stats",
      title: "Runtime Summary"
    }));
    const runtime = loadStatsUiRuntime({
      CoreStatsPanelCopyRuntime: {
        resolveStatsPanelLanguage,
        resolveStatsPanelCopy
      }
    });
    const windowLike = {
      UII18N: {
        getLanguage: () => "zh-CN"
      },
      localStorage: {
        getItem: () => "en-US"
      }
    };
    const manager = {
      getWindowLike: () => windowLike
    };
    const documentLike = {
      documentElement: {
        getAttribute(name: string) {
          return name === "data-ui-lang" ? "zh-CN" : "";
        }
      }
    };

    expect(runtime.resolveStatsPanelLanguage(manager, documentLike)).toBe("en");
    expect(resolveStatsPanelLanguage).toHaveBeenCalledWith({
      i18nLanguage: "zh-CN",
      storageLanguage: "en-US",
      documentLanguage: "zh-CN"
    });
    expect(runtime.resolveStatsPanelCopy("en").title).toBe("Runtime Summary");
    expect(resolveStatsPanelCopy).toHaveBeenCalledWith("en");
  });
});
