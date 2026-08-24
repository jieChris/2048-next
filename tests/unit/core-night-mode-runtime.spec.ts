import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type StorageMap = Map<string, string>;

type MockNode = {
  id?: string;
  textContent?: string;
  checked?: boolean;
  style: Record<string, string>;
  parentNode: MockNode | null;
};

function createStorage(storageMap?: StorageMap) {
  const map = storageMap || new Map<string, string>();
  return {
    map,
    localStorage: {
      getItem(key: string) {
        return map.has(key) ? String(map.get(key)) : null;
      },
      setItem(key: string, value: string) {
        map.set(String(key), String(value));
      }
    }
  };
}

function createMockDocument() {
  const attrs = new Map<string, string>();
  const elementsById = new Map<string, MockNode>();
  const nightToggle = {
    id: "night-bg-toggle",
    checked: false,
    style: {},
    parentNode: null
  } as MockNode;
  elementsById.set("night-bg-toggle", nightToggle);

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
    appendChild(node: MockNode) {
      node.parentNode = head as unknown as MockNode;
      if (node.id) {
        elementsById.set(String(node.id), node);
      }
      return node;
    }
  };

  return {
    readyState: "complete",
    head,
    documentElement,
    getElementById(id: string) {
      return elementsById.get(String(id)) || null;
    },
    createElement(_tagName: string) {
      return {
        id: "",
        textContent: "",
        style: {},
        parentNode: null
      } as MockNode;
    }
  };
}

function loadNightModeRuntime(options?: {
  storageMap?: StorageMap;
  themeManager?: Record<string, unknown>;
}) {
  const scriptPath = path.resolve(process.cwd(), "js/core_night_mode_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const { map, localStorage } = createStorage(options?.storageMap);
  const documentLike = createMockDocument();
  const listeners = new Map<string, Array<(event?: unknown) => void>>();
  const context = {
    console,
    document: documentLike,
    localStorage,
    ThemeManager: options?.themeManager,
    addEventListener: vi.fn((eventName: string, handler: (event?: unknown) => void) => {
      const key = String(eventName);
      const bucket = listeners.get(key) || [];
      bucket.push(handler);
      listeners.set(key, bucket);
    })
  } as Record<string, unknown>;
  context.window = context;

  vm.runInNewContext(readFileSync(path.resolve(process.cwd(), "js/core_game_settings_storage_runtime.js"), "utf8"), context);
  vm.runInNewContext(script, context);

  return {
    context: context as {
      CoreNightModeRuntime: {
        setNightBackgroundEnabled: (enabled: boolean) => boolean;
        setDisplayMode: (mode: "auto" | "day" | "night") => string;
        getNightModeRuntimeSnapshot: () => Record<string, unknown>;
      };
    },
    storageMap: map,
    documentLike,
    dispatchWindowEvent(eventName: string, event?: unknown) {
      const bucket = listeners.get(String(eventName)) || [];
      for (const handler of bucket) {
        handler(event);
      }
    }
  };
}

describe("core night mode runtime", () => {
  it("keeps the active theme and tile palette unchanged across display modes", () => {
    let currentThemeId = "classic";
    let currentTilePaletteId = "cold-cyan-steps";
    const themeManager = {
      getCurrentTheme: vi.fn(() => currentThemeId),
      getActiveTilePaletteId: vi.fn(() => currentTilePaletteId),
      applyTheme: vi.fn((themeId: string) => {
        currentThemeId = themeId;
      }),
      setActiveTilePalette: vi.fn((paletteId: string) => {
        currentTilePaletteId = paletteId;
      })
    };
    const sharedStorage = new Map<string, string>([
      ["theme_profile_v1", currentThemeId],
      ["tile_palette_active_v1", currentTilePaletteId],
      ["settings_day_theme_profile_v1", "mist_cyan"],
      ["settings_night_theme_profile_v1", "midnight_nebula"],
      ["settings_day_tile_palette_v1", "follow-theme"],
      ["settings_night_tile_palette_v1", "follow-theme"]
    ]);
    const { context, storageMap } = loadNightModeRuntime({
      storageMap: sharedStorage,
      themeManager
    });

    context.CoreNightModeRuntime.setDisplayMode("night");
    context.CoreNightModeRuntime.setDisplayMode("day");
    context.CoreNightModeRuntime.setDisplayMode("auto");

    expect(themeManager.applyTheme).not.toHaveBeenCalled();
    expect(themeManager.setActiveTilePalette).not.toHaveBeenCalled();
    expect(currentThemeId).toBe("classic");
    expect(currentTilePaletteId).toBe("cold-cyan-steps");
    expect(storageMap.get("theme_profile_v1")).toBe("classic");
    expect(storageMap.get("tile_palette_active_v1")).toBe("cold-cyan-steps");
    expect(storageMap.get("settings_day_theme_profile_v1")).toBe("mist_cyan");
    expect(storageMap.get("settings_night_theme_profile_v1")).toBe("midnight_nebula");
    expect(storageMap.get("settings_day_tile_palette_v1")).toBe("follow-theme");
    expect(storageMap.get("settings_night_tile_palette_v1")).toBe("follow-theme");
    expect(storageMap.get("settings_display_mode_v2")).toBe("auto");
    expect(storageMap.get("settings_night_background_enabled_v1")).toBe("0");
  });

  it("syncs the checkbox state when another v2 page changes display mode", () => {
    const sharedStorage = new Map<string, string>([
      ["settings_night_background_enabled_v1", "0"]
    ]);
    const runtime = loadNightModeRuntime({
      storageMap: sharedStorage
    });

    const toggleBefore = runtime.documentLike.getElementById("night-bg-toggle") as MockNode | null;
    expect(toggleBefore?.checked).toBe(false);

    sharedStorage.set("settings_display_mode_v2", "night");
    runtime.dispatchWindowEvent("storage", {
      key: "settings_display_mode_v2"
    });

    const enabledSnapshot = runtime.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();
    const toggleAfterEnable = runtime.documentLike.getElementById("night-bg-toggle") as MockNode | null;

    expect(enabledSnapshot.enabled).toBe(true);
    expect(enabledSnapshot.dataAttribute).toBe("1");
    expect(toggleAfterEnable?.checked).toBe(true);

    sharedStorage.set("settings_display_mode_v2", "day");
    runtime.dispatchWindowEvent("storage", {
      key: "settings_display_mode_v2"
    });

    const disabledSnapshot = runtime.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();
    const toggleAfterDisable = runtime.documentLike.getElementById("night-bg-toggle") as MockNode | null;

    expect(disabledSnapshot.enabled).toBe(false);
    expect(disabledSnapshot.dataAttribute).toBe("");
    expect(toggleAfterDisable?.checked).toBe(false);
  });

  it("keeps v2 auto authoritative when a compatibility-key storage event arrives", () => {
    const sharedStorage = new Map<string, string>();
    const runtime = loadNightModeRuntime({ storageMap: sharedStorage });

    runtime.context.CoreNightModeRuntime.setDisplayMode("auto");
    expect(sharedStorage.get("settings_display_mode_v2")).toBe("auto");

    sharedStorage.set("settings_night_background_enabled_v1", "1");
    runtime.dispatchWindowEvent("storage", { key: "settings_night_background_enabled_v1" });

    expect(sharedStorage.get("settings_display_mode_v2")).toBe("auto");
    expect(runtime.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot()).toMatchObject({
      displayMode: "auto"
    });
  });
});
