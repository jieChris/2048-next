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
  addEventListener(eventName: string, handler: () => void): void;
  dispatchEventName(eventName: string): void;
  listenerCount(eventName: string): number;
  querySelector(selector: string): MockNode | null;
  setAttribute(name: string, value: string): void;
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
    },
    querySelector(_selector: string) {
      return null;
    },
    setAttribute(_name: string, _value: string) {}
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
  const elementsById = new Map<string, MockNode>();
  const bgmToggle = createMockNode("bgm-toggle");
  elementsById.set("bgm-toggle", bgmToggle);

  return {
    readyState: "complete",
    getElementById(id: string) {
      return elementsById.get(String(id)) || null;
    },
    createElement(tagName: string) {
      const node = createMockNode();
      if (String(tagName).toLowerCase() === "audio") {
        Object.assign(node, {
          paused: true,
          canPlayType: vi.fn(() => "probably"),
          play: vi.fn(function (this: { paused: boolean }) {
            this.paused = false;
          }),
          pause: vi.fn(function (this: { paused: boolean }) {
            this.paused = true;
          })
        });
      }
      return node;
    },
    replaceElementById(id: string, node: MockNode) {
      elementsById.set(String(id), node);
      return node;
    }
  };
}

function createAudioMock() {
  return vi.fn(function (this: Record<string, unknown>) {
    this.preload = "";
    this.loop = false;
    this.volume = 0;
    this.paused = true;
    this.canPlayType = vi.fn(() => "probably");
    this.setAttribute = vi.fn();
    this.play = vi.fn(() => {
      this.paused = false;
    });
    this.pause = vi.fn(() => {
      this.paused = true;
    });
  });
}

function loadBgmRuntime(options?: { storageMap?: StorageMap }) {
  const scriptPath = path.resolve(process.cwd(), "js/core_bgm_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const { map, localStorage } = createStorage(options?.storageMap);
  const documentLike = createMockDocument();
  const listeners = new Map<string, Array<(event?: unknown) => void>>();
  const context = {
    console,
    document: documentLike,
    localStorage,
    location: { href: "https://example.test/2048.html" },
    Audio: createAudioMock(),
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
      CoreBgmRuntime: {
        syncBgmSettingsUI: () => void;
        getBgmRuntimeSnapshot: () => Record<string, unknown>;
      };
    },
    storageMap: map,
    documentLike
  };
}

describe("core bgm runtime", () => {
  it("rebinds the bgm toggle after settings modal content is rebuilt", () => {
    const runtime = loadBgmRuntime();
    const firstToggle = runtime.documentLike.getElementById("bgm-toggle");
    expect(firstToggle?.listenerCount("change")).toBe(1);

    const rebuiltToggle = createMockNode("bgm-toggle");
    runtime.documentLike.replaceElementById("bgm-toggle", rebuiltToggle);

    runtime.context.CoreBgmRuntime.syncBgmSettingsUI();
    rebuiltToggle.checked = true;
    rebuiltToggle.dispatchEventName("change");

    expect(rebuiltToggle.listenerCount("change")).toBe(1);
    expect(runtime.storageMap.get("settings_bgm_enabled_v1")).toBe("1");
    expect(runtime.context.CoreBgmRuntime.getBgmRuntimeSnapshot().enabled).toBe(true);
  });
});
