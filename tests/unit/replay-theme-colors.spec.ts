import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { expect, test } from "vitest";

const tokens = readFileSync(resolve("style/tokens/base.css"), "utf8");
const replayCss = readFileSync(resolve("style/replay_page_rebuild.css"), "utf8");
const nightCss = readFileSync(resolve("style/preferences/night-background-base.css"), "utf8");
const themeManager = readFileSync(resolve("js/theme_manager.js"), "utf8");

test("classic replay links, buttons and metric cards keep the same readable color roles", () => {
  const dom = new JSDOM(`<!doctype html><html><head><style>${tokens}</style><style>${replayCss}</style></head>
    <body data-page="replay">
      <a id="link" class="replay-control-btn import-replay-button">导入回放</a>
      <button id="button" class="replay-control-btn">播放</button>
      <div id="metric" class="replay-metric-card"><span class="replay-metric-label">分数</span><span class="replay-metric-value">2048</span></div>
    </body></html>`, { runScripts: "outside-only", url: "https://example.test/replay.html" });

  dom.window.localStorage.setItem("theme_profile_v1", "classic");
  dom.window.eval(themeManager);

  const style = (selector: string) => dom.window.getComputedStyle(dom.window.document.querySelector(selector)!);
  expect(style("#link").color).toBe(style("#button").color);
  expect(style("#link").backgroundColor).toBe("rgb(143, 122, 102)");
  expect(replayCss).toMatch(
    /html\[data-theme="classic"\][^{]+\.replay-metric-card\s*\{[^}]*background:\s*var\(--app-surface-board\)/
  );
  expect(replayCss).toMatch(
    /html\[data-theme="classic"\][^{]+\.replay-metric-value\s*\{[^}]*color:\s*var\(--app-text-on-action\)/
  );
  expect(nightCss).toContain(":not(.replay-control-btn):not(.import-replay-button)");

  dom.window.close();
});
