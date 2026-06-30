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
  addEventListener?(eventName: string, handler: () => void): void;
  dispatchEventName?(eventName: string): void;
  listenerCount?(eventName: string): number;
};

function createMockNode(id?: string): MockNode {
  const listeners = new Map<string, Array<() => void>>();
  return {
    id,
    checked: false,
    style: {},
    parentNode: null,
    addEventListener(eventName: string, handler: () => void) {
      const key = String(eventName);
      const bucket = listeners.get(key) || [];
      bucket.push(handler);
      listeners.set(key, bucket);
    },
    dispatchEventName(eventName: string) {
      const bucket = listeners.get(String(eventName)) || [];
      for (const handler of bucket) {
        handler();
      }
    },
    listenerCount(eventName: string) {
      return (listeners.get(String(eventName)) || []).length;
    }
  };
}

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
  const nightToggle = createMockNode("night-bg-toggle");
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
    replaceElementById(id: string, node: MockNode) {
      elementsById.set(String(id), node);
      return node;
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

  vm.runInNewContext(script, context);

  return {
    context: context as {
      CoreNightModeRuntime: {
        setNightBackgroundEnabled: (enabled: boolean) => boolean;
        syncNightModeSettingsUI: () => void;
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
  it("auto-switches to midnight nebula the first time night mode is enabled", () => {
    let currentThemeId = "classic";
    let currentTilePaletteId = "follow-theme";
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
    const { context, storageMap } = loadNightModeRuntime({ themeManager });

    context.CoreNightModeRuntime.setNightBackgroundEnabled(true);
    const snapshot = context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();

    expect(themeManager.applyTheme).toHaveBeenCalledWith("midnight_nebula");
    expect(currentThemeId).toBe("midnight_nebula");
    expect(currentTilePaletteId).toBe("follow-theme");
    expect(storageMap.get("settings_night_background_enabled_v1")).toBe("1");
    expect(storageMap.get("settings_night_theme_auto_applied_v1")).toBe("1");
    expect(storageMap.get("settings_night_theme_pending_v1")).toBe("0");
    expect(storageMap.get("settings_day_theme_profile_v1")).toBe("classic");
    expect(storageMap.get("settings_night_theme_profile_v1")).toBe("midnight_nebula");
    expect(storageMap.get("settings_day_tile_palette_v1")).toBe("follow-theme");
    expect(storageMap.get("settings_night_tile_palette_v1")).toBe("follow-theme");
    expect(snapshot.autoThemeApplied).toBe(true);
    expect(snapshot.autoThemePending).toBe(false);
  });

  it("keeps a pending auto-switch until a page with ThemeManager is opened", () => {
    const sharedStorage = new Map<string, string>();
    const firstLoad = loadNightModeRuntime({ storageMap: sharedStorage });

    firstLoad.context.CoreNightModeRuntime.setNightBackgroundEnabled(true);

    expect(sharedStorage.get("settings_night_background_enabled_v1")).toBe("1");
    expect(sharedStorage.get("settings_night_theme_auto_applied_v1")).not.toBe("1");
    expect(sharedStorage.get("settings_night_theme_pending_v1")).toBe("1");
    expect(sharedStorage.get("settings_night_theme_profile_v1")).toBe("midnight_nebula");

    let currentThemeId = "classic";
    let currentTilePaletteId = "follow-theme";
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
    const secondLoad = loadNightModeRuntime({
      storageMap: sharedStorage,
      themeManager
    });
    const snapshot = secondLoad.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();

    expect(themeManager.applyTheme).toHaveBeenCalledWith("midnight_nebula");
    expect(currentThemeId).toBe("midnight_nebula");
    expect(currentTilePaletteId).toBe("follow-theme");
    expect(sharedStorage.get("settings_night_theme_auto_applied_v1")).toBe("1");
    expect(sharedStorage.get("settings_night_theme_pending_v1")).toBe("0");
    expect(snapshot.autoThemeApplied).toBe(true);
    expect(snapshot.autoThemePending).toBe(false);
  });

  it("does not override legacy users who already had night mode enabled before the auto-theme rollout", () => {
    const sharedStorage = new Map<string, string>([
      ["settings_night_background_enabled_v1", "1"]
    ]);
    let currentTilePaletteId = "night-paper";
    const themeManager = {
      getCurrentTheme: vi.fn(() => "ocean"),
      getActiveTilePaletteId: vi.fn(() => currentTilePaletteId),
      applyTheme: vi.fn(),
      setActiveTilePalette: vi.fn((paletteId: string) => {
        currentTilePaletteId = paletteId;
      })
    };
    const runtime = loadNightModeRuntime({
      storageMap: sharedStorage,
      themeManager
    });
    const snapshot = runtime.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();

    expect(themeManager.applyTheme).not.toHaveBeenCalled();
    expect(sharedStorage.get("settings_night_theme_auto_applied_v1")).toBe("1");
    expect(sharedStorage.get("settings_night_theme_pending_v1")).not.toBe("1");
    expect(sharedStorage.get("settings_night_theme_profile_v1")).toBe("ocean");
    expect(sharedStorage.get("settings_night_tile_palette_v1")).toBe("night-paper");
    expect(snapshot.enabled).toBe(true);
    expect(snapshot.autoThemeApplied).toBe(true);
    expect(snapshot.autoThemePending).toBe(false);
  });

  it("restores separate day and night tile appearances when switching modes", () => {
    let currentThemeId = "classic";
    let currentTilePaletteId = "follow-theme";
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
    const runtime = loadNightModeRuntime({ themeManager });

    runtime.context.CoreNightModeRuntime.setNightBackgroundEnabled(true);
    currentThemeId = "ocean";
    currentTilePaletteId = "night-paper";

    runtime.context.CoreNightModeRuntime.setNightBackgroundEnabled(false);

    expect(currentThemeId).toBe("classic");
    expect(currentTilePaletteId).toBe("follow-theme");
    expect(runtime.storageMap.get("settings_night_theme_profile_v1")).toBe("ocean");
    expect(runtime.storageMap.get("settings_night_tile_palette_v1")).toBe("night-paper");
    expect(runtime.storageMap.get("settings_day_theme_profile_v1")).toBe("classic");
    expect(runtime.storageMap.get("settings_day_tile_palette_v1")).toBe("follow-theme");

    runtime.context.CoreNightModeRuntime.setNightBackgroundEnabled(true);

    expect(currentThemeId).toBe("ocean");
    expect(currentTilePaletteId).toBe("night-paper");
  });

  it("syncs the checkbox state when another page changes night mode through storage", () => {
    const sharedStorage = new Map<string, string>([
      ["settings_night_background_enabled_v1", "0"]
    ]);
    const runtime = loadNightModeRuntime({
      storageMap: sharedStorage
    });

    const toggleBefore = runtime.documentLike.getElementById("night-bg-toggle") as MockNode | null;
    expect(toggleBefore?.checked).toBe(false);

    sharedStorage.set("settings_night_background_enabled_v1", "1");
    runtime.dispatchWindowEvent("storage", {
      key: "settings_night_background_enabled_v1"
    });

    const enabledSnapshot = runtime.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();
    const toggleAfterEnable = runtime.documentLike.getElementById("night-bg-toggle") as MockNode | null;

    expect(enabledSnapshot.enabled).toBe(true);
    expect(enabledSnapshot.dataAttribute).toBe("1");
    expect(toggleAfterEnable?.checked).toBe(true);

    sharedStorage.set("settings_night_background_enabled_v1", "0");
    runtime.dispatchWindowEvent("storage", {
      key: "settings_night_background_enabled_v1"
    });

    const disabledSnapshot = runtime.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();
    const toggleAfterDisable = runtime.documentLike.getElementById("night-bg-toggle") as MockNode | null;

    expect(disabledSnapshot.enabled).toBe(false);
    expect(disabledSnapshot.dataAttribute).toBe("");
    expect(toggleAfterDisable?.checked).toBe(false);
  });

  it("rebinds the night mode toggle after settings modal content is rebuilt", () => {
    const runtime = loadNightModeRuntime({
      storageMap: new Map<string, string>([
        ["settings_night_background_enabled_v1", "0"],
        ["theme_profile_v1", "classic"]
      ])
    });
    const firstToggle = runtime.documentLike.getElementById("night-bg-toggle") as MockNode | null;
    expect(firstToggle?.listenerCount?.("change")).toBe(1);

    const rebuiltToggle = createMockNode("night-bg-toggle");
    runtime.documentLike.replaceElementById("night-bg-toggle", rebuiltToggle);

    runtime.context.CoreNightModeRuntime.syncNightModeSettingsUI();
    rebuiltToggle.checked = true;
    rebuiltToggle.dispatchEventName?.("change");

    expect(rebuiltToggle.listenerCount?.("change")).toBe(1);
    expect(runtime.storageMap.get("settings_night_background_enabled_v1")).toBe("1");
    expect(runtime.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot().enabled).toBe(true);
  });
});
