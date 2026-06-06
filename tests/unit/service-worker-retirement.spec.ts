import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("retired horse cache service worker", () => {
  it("does not register a page-level service worker from the theme manager", () => {
    const themeManager = readFileSync("js/theme_manager.js", "utf8");

    expect(themeManager).not.toContain("navigator.serviceWorker.register");
    expect(themeManager).not.toContain("registerHorseCacheServiceWorker");
  });

  it("turns the legacy service worker endpoint into a cache cleanup script", () => {
    const serviceWorker = readFileSync("public/horse-cache-sw.js", "utf8");

    expect(serviceWorker).toContain("caches.delete(name)");
    expect(serviceWorker).toContain("self.registration.unregister()");
    expect(serviceWorker).not.toMatch(/addEventListener\("fetch"/);
    expect(serviceWorker).not.toContain("horse-theme-assets-v1");
  });
});
