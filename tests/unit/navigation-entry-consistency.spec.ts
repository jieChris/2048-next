import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function readHtml(path: string): string {
  return readFileSync(path, "utf8");
}

describe("navigation entry consistency", () => {
  it("keeps core pages reachable without browser-only navigation", () => {
    const replayHtml = readHtml("replay.html");
    expect(replayHtml).toContain('href="2048.html"');
    expect(replayHtml).toContain('href="history.html"');

    const accountHtml = readHtml("account.html");
    expect(accountHtml).toContain('id="account-nav-settings"');
    expect(accountHtml).toContain('href="account_settings.html"');

    const userHtml = readHtml("user.html");
    expect(userHtml).toContain('id="user-nav-replay"');
    expect(userHtml).toContain('href="replay.html"');
  });

  it("uses same-tab navigation for internal mode links", () => {
    for (const path of [
      "2048.html",
      "undo_2048.html",
      "capped_2048.html",
      "play.html",
      "Practice_board.html",
      "PKU2048.html",
      "relay_5x5.html"
    ]) {
      const html = readHtml(path);
      expect(html).not.toMatch(/href="modes\.html"[^>]*target="_blank"/);
    }

    expect(readHtml("src/bootstrap/top-action-bindings-host.ts")).not.toContain(
      "enforceModesButtonOpenInNewPage"
    );
    expect(readHtml("js/core_top_action_bindings_host_runtime.js")).not.toContain(
      'setAttrIfChanged(modeBtn, "target", "_blank")'
    );
  });

  it("routes login links to account settings and exposes the supported PKU practice page", () => {
    for (const path of ["register.html", "password.html"]) {
      const html = readHtml(path);
      expect(html).not.toMatch(/href="account\.html"[^>]*>返回登录</);
      expect(html).toContain('href="account_settings.html"');
    }

    const modesHtml = readHtml("modes.html");
    const toolEntries = [
      'href="history.html"',
      'href="replay.html"',
      'href="Practice_board.html?practice_fresh=1"',
      'href="PKU2048.html?practice_fresh=1"',
      'href="palette.html"',
      'href="account.html"'
    ];
    let previousIndex = -1;
    for (const entry of toolEntries) {
      const entryIndex = modesHtml.indexOf(entry, previousIndex + 1);
      expect(entryIndex).toBeGreaterThan(previousIndex);
      previousIndex = entryIndex;
    }
  });
});
