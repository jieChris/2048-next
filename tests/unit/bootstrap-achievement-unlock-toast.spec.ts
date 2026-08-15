import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";

import {
  installAchievementUnlockToastRuntime,
  persistPendingAchievementUnlocks
} from "../../src/bootstrap/achievement-unlock-toast";

describe("achievement unlock toast runtime", () => {
  it("labels hidden manual-grant achievements as hidden achievements", () => {
    const dom = new JSDOM(
      "<!doctype html><html lang=\"zh-CN\"><body><div class=\"game-container\"></div></body></html>",
      { url: "https://2048next.test/2048.html" }
    );
    const timers = vi.fn(() => 1);
    const runtime = installAchievementUnlockToastRuntime({
      documentLike: dom.window.document as never,
      windowLike: {
        localStorage: dom.window.localStorage,
        requestAnimationFrame(handler: () => void) {
          handler();
          return 1;
        },
        setTimeout: timers,
        clearTimeout: vi.fn()
      } as never
    });

    runtime?.showAchievementUnlockToast({
      id: "lost_page_visited",
      name: "你也曾迷路",
      description: "你也曾迷路，但好在你又回来了。",
      series_id: "community-lost-page",
      rules: [{
        type: "manual_grant",
        params: {
          hidden: true,
          no_level: true
        }
      }]
    });

    expect(dom.window.document.body.innerHTML).toContain("隐藏成就");
    expect(dom.window.document.body.innerHTML).not.toContain("奖励领取");
    (timers.mock.calls.at(-1)?.[0] as (() => void) | undefined)?.();
  });

  it("keeps only the highest unlocked tier from one series in a toast batch", () => {
    const dom = new JSDOM(
      "<!doctype html><html lang=\"zh-CN\"><body><div class=\"game-container\"></div></body></html>",
      { url: "https://2048next.test/2048.html" }
    );
    const timers = vi.fn(() => 1);
    const runtime = installAchievementUnlockToastRuntime({
      documentLike: dom.window.document as never,
      windowLike: {
        localStorage: dom.window.localStorage,
        requestAnimationFrame(handler: () => void) {
          handler();
          return 1;
        },
        setTimeout: timers,
        clearTimeout: vi.fn()
      } as never
    });

    runtime?.showAchievementUnlockToasts([
      { id: "tile_2048_count_1", name: "首次 2048", series_id: "tile-2048", level: 1, rules: [] },
      { id: "tile_2048_count_10", name: "第 10 次 2048", series_id: "tile-2048", level: 2, rules: [] },
      { id: "tile_2048_count_100", name: "第 100 次 2048", series_id: "tile-2048", level: 3, rules: [] }
    ]);

    expect(dom.window.document.body.innerHTML).toContain("第 100 次 2048");
    expect(dom.window.document.body.innerHTML).not.toContain("第 10 次 2048");
    (timers.mock.calls.at(-1)?.[0] as (() => void) | undefined)?.();
  });

  it("consumes a pending beta pioneer login unlock as an achievement toast", () => {
    const dom = new JSDOM(
      "<!doctype html><html lang=\"zh-CN\"><body><div class=\"game-container\"></div></body></html>",
      { url: "https://2048next.test/2048.html" }
    );
    persistPendingAchievementUnlocks([{
      achievement: {
        id: "beta_pioneer",
        name: "内测先锋",
        description: "感谢你参与内测。",
        series_id: "community-beta",
        rules: []
      }
    }], dom.window.localStorage);

    installAchievementUnlockToastRuntime({
      documentLike: dom.window.document as never,
      windowLike: {
        localStorage: dom.window.localStorage,
        requestAnimationFrame(handler: () => void) {
          handler();
          return 1;
        },
        setTimeout: vi.fn(() => 1),
        clearTimeout: vi.fn()
      } as never
    });

    expect(dom.window.document.body.innerHTML).toContain("成就达成");
    expect(dom.window.document.body.innerHTML).toContain("内测先锋");
    expect(dom.window.localStorage.getItem("2048_pending_login_achievements_v1")).toBeNull();
  });
});
