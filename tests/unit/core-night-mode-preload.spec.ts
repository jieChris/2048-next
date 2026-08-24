import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

type MockNode = {
  id?: string;
  textContent?: string;
  parentNode?: MockNode | null;
  style: Record<string, string>;
};

function createMockDocument() {
  const attrs = new Map<string, string>();
  const elementsById = new Map<string, MockNode>();
  const headChildren: MockNode[] = [];

  const documentElement = {
    style: {} as Record<string, string>,
    setAttribute(name: string, value: string) {
      attrs.set(String(name), String(value));
    },
    removeAttribute(name: string) {
      attrs.delete(String(name));
    },
    getAttribute(name: string) {
      return attrs.has(String(name)) ? String(attrs.get(String(name))) : null;
    }
  };

  const head = {
    style: {} as Record<string, string>,
    appendChild(node: MockNode) {
      node.parentNode = head as unknown as MockNode;
      headChildren.push(node);
      if (node.id) {
        elementsById.set(String(node.id), node);
      }
      return node;
    }
  };

  const doc = {
    head,
    documentElement,
    getElementById(id: string) {
      return elementsById.get(String(id)) || null;
    },
    createElement(_tagName: string) {
      const node = {
        style: {} as Record<string, string>,
        parentNode: null,
        textContent: "",
        id: ""
      } satisfies MockNode;
      return node;
    }
  };

  return {
    doc,
    documentElement,
    headChildren
  };
}

function runNightModePreload(
  storageValue: string | null,
  shouldThrow = false,
  options: {
    storageValues?: Record<string, string | null>;
    pathname?: string;
    search?: string;
  } = {}
) {
  const scriptPath = path.resolve(process.cwd(), "public/js/core_night_mode_preload.js");
  const script = readFileSync(scriptPath, "utf8");
  const { doc, documentElement, headChildren } = createMockDocument();
  const localStorage = {
    getItem(key: string) {
      if (shouldThrow) {
        throw new Error("storage unavailable");
      }
      if (options.storageValues && Object.prototype.hasOwnProperty.call(options.storageValues, key)) {
        return options.storageValues[key];
      }
      return storageValue;
    }
  };
  const context = {
    console,
    document: doc,
    localStorage,
    URLSearchParams,
    location: {
      pathname: options.pathname || "/2048.html",
      search: options.search || ""
    }
  } as Record<string, unknown>;
  context.window = context;

  vm.runInNewContext(script, context);

  return {
    documentElement,
    headChildren,
    getStyleNode() {
      return doc.getElementById("night-background-style") as MockNode | null;
    }
  };
}

describe("core night mode preload", () => {
  it("sets the active theme before page styles render", () => {
    const result = runNightModePreload("0", false, {
      storageValues: {
        settings_night_background_enabled_v1: "0",
        theme_profile_v1: "classic"
      }
    });

    expect(result.documentElement.getAttribute("data-theme")).toBe("classic");
  });

  it("ignores stale per-mode theme snapshots when night mode is enabled", () => {
    const result = runNightModePreload("1", false, {
      storageValues: {
        settings_night_background_enabled_v1: "1",
        settings_day_theme_profile_v1: "classic",
        settings_night_theme_profile_v1: "midnight_nebula",
        theme_profile_v1: "mist_cyan"
      }
    });

    expect(result.documentElement.getAttribute("data-theme")).toBe("mist_cyan");
  });

  it("avoids the legacy automatic midnight theme during the initial migration", () => {
    const result = runNightModePreload("1", false, {
      storageValues: {
        settings_night_background_enabled_v1: "1",
        settings_night_theme_profile_v1: "midnight_nebula",
        settings_night_theme_auto_applied_v1: "1",
        settings_day_theme_profile_v1: "mist_cyan",
        theme_profile_v1: "midnight_nebula"
      }
    });

    expect(result.documentElement.getAttribute("data-theme")).toBe("mist_cyan");
  });

  it("injects the night-mode style sheet before runtime when the saved flag is enabled", () => {
    const result = runNightModePreload("1");
    const styleNode = result.getStyleNode();

    expect(result.documentElement.getAttribute("data-night-background")).toBe("1");
    expect(result.documentElement.style.colorScheme).toBe("dark");
    expect(styleNode).not.toBeNull();
    expect(styleNode?.textContent).toContain("html[data-night-background='1']");
    expect(styleNode?.textContent).toContain("--night-page-bg:#0a1220");
    expect(styleNode?.textContent).toContain("body::before");
  });

  it("keeps the default state untouched when the saved flag is disabled", () => {
    const result = runNightModePreload(null, false, {
      storageValues: { settings_night_background_enabled_v1: "0" }
    });

    expect(result.documentElement.getAttribute("data-theme")).toBe("mist_cyan");
    expect(result.documentElement.getAttribute("data-night-background")).toBeNull();
    expect(result.documentElement.style.colorScheme).toBe("");
    expect(result.getStyleNode()).toBeNull();
    expect(result.headChildren).toHaveLength(0);
  });

  it("fails closed when storage access throws", () => {
    const result = runNightModePreload(null, true);

    expect(result.documentElement.getAttribute("data-night-background")).toBeNull();
    expect(result.documentElement.style.colorScheme).toBe("");
    expect(result.getStyleNode()).toBeNull();
  });

  it("marks initial leaderboard view when the current ranked mode is saved as hidden", () => {
    const result = runNightModePreload("0", false, {
      storageValues: {
        settings_night_background_enabled_v1: "0",
        settings_timer_module_view_by_mode_v1: JSON.stringify({
          standard_4x4_pow2_no_undo: "hidden"
        })
      },
      pathname: "/2048.html"
    });

    expect(result.documentElement.getAttribute("data-initial-timer-leaderboard")).toBe("1");
  });

  it("does not mark initial leaderboard view when the current ranked mode is saved as timer", () => {
    const result = runNightModePreload("0", false, {
      storageValues: {
        settings_night_background_enabled_v1: "0",
        settings_timer_module_view_by_mode_v1: JSON.stringify({
          standard_4x4_pow2_no_undo: "timer"
        })
      },
      pathname: "/2048.html"
    });

    expect(result.documentElement.getAttribute("data-initial-timer-leaderboard")).toBeNull();
  });

  it("resolves play.html mode keys from the query before marking the initial leaderboard view", () => {
    const result = runNightModePreload("0", false, {
      storageValues: {
        settings_night_background_enabled_v1: "0",
        settings_timer_module_view_by_mode_v1: JSON.stringify({
          classic_4x4_pow2_undo: "hidden"
        })
      },
      pathname: "/play.html",
      search: "?mode_key=classic_4x4_pow2_undo"
    });

    expect(result.documentElement.getAttribute("data-initial-timer-leaderboard")).toBe("1");
  });

  it("marks initial leaderboard view for ranked board variants such as 3x3 undo", () => {
    const result = runNightModePreload("0", false, {
      storageValues: {
        settings_night_background_enabled_v1: "0",
        settings_timer_module_view_by_mode_v1: JSON.stringify({
          board_3x3_pow2_undo: "hidden"
        })
      },
      pathname: "/play.html",
      search: "?mode_key=board_3x3_pow2_undo"
    });

    expect(result.documentElement.getAttribute("data-initial-timer-leaderboard")).toBe("1");
  });
});
