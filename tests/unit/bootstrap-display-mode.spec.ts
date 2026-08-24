import { describe, expect, it, vi } from "vitest";

import {
  bindDisplayModeSync,
  readDisplayModePreference,
  resolveDisplayMode,
  syncDisplayModeAttributes,
} from "../../src/bootstrap/display-mode";

function runtime(initial: Record<string, string> = {}, prefersDark = false) {
  const values = new Map(Object.entries(initial));
  const listeners = new Map<string, Array<() => void>>();
  const mediaListeners: Array<() => void> = [];
  const attrs = new Map<string, string>();
  const windowLike = {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    matchMedia: vi.fn(() => ({
      matches: prefersDark,
      addEventListener: (_type: string, listener: () => void) => mediaListeners.push(listener),
    })),
    addEventListener: (type: string, listener: () => void) => {
      const bucket = listeners.get(type) || [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
  };
  const documentLike = {
    documentElement: {
      setAttribute: (name: string, value: string) => attrs.set(name, value),
      removeAttribute: (name: string) => attrs.delete(name),
    },
  };
  return { values, attrs, windowLike, documentLike, listeners, mediaListeners };
}

describe("display mode state machine", () => {
  it.each([
    ["1", "night"],
    ["0", "day"],
  ] as const)("migrates legacy %s without reversing it", (legacy, expected) => {
    const host = runtime({ settings_night_background_enabled_v1: legacy });

    expect(readDisplayModePreference(host.windowLike)).toBe(expected);
    expect(host.values.get("settings_display_mode_v2")).toBe(expected);
  });

  it("resolves auto from the system without replacing the stored preference", () => {
    const host = runtime({ settings_display_mode_v2: "auto" }, true);

    expect(resolveDisplayMode(host.windowLike)).toEqual({ mode: "auto", isNight: true });
    expect(syncDisplayModeAttributes(host.documentLike, host.windowLike)).toEqual({ mode: "auto", isNight: true });
    expect(host.attrs).toMatchObject(new Map([
      ["data-display-mode", "auto"],
      ["data-night-background", "1"],
    ]));
    expect(host.values.get("settings_display_mode_v2")).toBe("auto");
  });

  it("resyncs auto when the system preference changes", () => {
    const host = runtime({ settings_display_mode_v2: "auto" }, false);
    const onChange = vi.fn();

    bindDisplayModeSync({ documentLike: host.documentLike, windowLike: host.windowLike, onChange });
    host.mediaListeners[0]?.();

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith({ mode: "auto", isNight: false });
  });
});
