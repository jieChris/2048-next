import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";

import { installAchievementUnlockToastRuntime } from "../../src/bootstrap/achievement-unlock-toast";

describe("achievement unlock toast runtime", () => {
  it("labels hidden manual-grant achievements as hidden achievements", () => {
    const dom = new JSDOM(
      "<!doctype html><html lang=\"zh-CN\"><body><div class=\"game-container\"></div></body></html>",
      { url: "https://2048next.test/2048.html" }
    );
    const runtime = installAchievementUnlockToastRuntime({
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
  });
});
