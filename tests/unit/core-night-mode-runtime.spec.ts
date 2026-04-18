import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type StorageMap = Map<string, string>;

type MockNode = {
  id?: string;
  textContent?: string;
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
  const context = {
    console,
    document: documentLike,
    localStorage,
    ThemeManager: options?.themeManager,
    addEventListener: vi.fn()
  } as Record<string, unknown>;
  context.window = context;

  vm.runInNewContext(script, context);

  return {
    context: context as {
      CoreNightModeRuntime: {
        setNightBackgroundEnabled: (enabled: boolean) => boolean;
        getNightModeRuntimeSnapshot: () => Record<string, unknown>;
      };
    },
    storageMap: map,
    documentLike
  };
}

describe("core night mode runtime", () => {
  it("auto-switches to midnight nebula the first time night mode is enabled", () => {
    let currentThemeId = "classic";
    const themeManager = {
      getCurrentTheme: vi.fn(() => currentThemeId),
      applyTheme: vi.fn((themeId: string) => {
        currentThemeId = themeId;
      })
    };
    const { context, storageMap } = loadNightModeRuntime({ themeManager });

    context.CoreNightModeRuntime.setNightBackgroundEnabled(true);
    const snapshot = context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();

    expect(themeManager.applyTheme).toHaveBeenCalledWith("midnight_nebula");
    expect(currentThemeId).toBe("midnight_nebula");
    expect(storageMap.get("settings_night_background_enabled_v1")).toBe("1");
    expect(storageMap.get("settings_night_theme_auto_applied_v1")).toBe("1");
    expect(storageMap.get("settings_night_theme_pending_v1")).toBe("0");
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

    let currentThemeId = "classic";
    const themeManager = {
      getCurrentTheme: vi.fn(() => currentThemeId),
      applyTheme: vi.fn((themeId: string) => {
        currentThemeId = themeId;
      })
    };
    const secondLoad = loadNightModeRuntime({
      storageMap: sharedStorage,
      themeManager
    });
    const snapshot = secondLoad.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();

    expect(themeManager.applyTheme).toHaveBeenCalledWith("midnight_nebula");
    expect(currentThemeId).toBe("midnight_nebula");
    expect(sharedStorage.get("settings_night_theme_auto_applied_v1")).toBe("1");
    expect(sharedStorage.get("settings_night_theme_pending_v1")).toBe("0");
    expect(snapshot.autoThemeApplied).toBe(true);
    expect(snapshot.autoThemePending).toBe(false);
  });

  it("does not override legacy users who already had night mode enabled before the auto-theme rollout", () => {
    const sharedStorage = new Map<string, string>([
      ["settings_night_background_enabled_v1", "1"]
    ]);
    const themeManager = {
      getCurrentTheme: vi.fn(() => "ocean"),
      applyTheme: vi.fn()
    };
    const runtime = loadNightModeRuntime({
      storageMap: sharedStorage,
      themeManager
    });
    const snapshot = runtime.context.CoreNightModeRuntime.getNightModeRuntimeSnapshot();

    expect(themeManager.applyTheme).not.toHaveBeenCalled();
    expect(sharedStorage.get("settings_night_theme_auto_applied_v1")).toBe("1");
    expect(sharedStorage.get("settings_night_theme_pending_v1")).not.toBe("1");
    expect(snapshot.enabled).toBe(true);
    expect(snapshot.autoThemeApplied).toBe(true);
    expect(snapshot.autoThemePending).toBe(false);
  });
});
