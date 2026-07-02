import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const HTML_WITH_MANIFEST = [
  "2048.html",
  "Practice_board.html",
  "PKU2048.html",
  "account.html",
  "account_settings.html",
  "capped_2048.html",
  "history.html",
  "index.html",
  "index_test.html",
  "medal-wall.html",
  "modes.html",
  "palette.html",
  "password.html",
  "play.html",
  "register.html",
  "relay_5x5.html",
  "replay.html",
  "undo_2048.html",
  "user.html"
];

describe("PWA manifest", () => {
  it("uses a root manifest URL on every installable page", () => {
    for (const htmlPath of HTML_WITH_MANIFEST) {
      const html = readFileSync(htmlPath, "utf8");
      expect(html, htmlPath).toContain(
        '<link rel="manifest" href="/site.webmanifest?v=20260703-pwa-root">'
      );
      expect(html, htmlPath).not.toContain('href="site.webmanifest');
      expect(html, htmlPath).not.toContain('href="./assets/site-');
    }
  });

  it("keeps install URLs rooted at the site origin, not the build assets directory", () => {
    const manifest = JSON.parse(readFileSync("public/site.webmanifest", "utf8"));

    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/2048.html");
    expect(manifest.scope).toBe("/");
    expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual([
      "/meta/icon-192.png?v=20260703-pwa-root",
      "/meta/icon-512.png?v=20260703-pwa-root"
    ]);
    expect(existsSync("public/meta/icon-192.png")).toBe(true);
    expect(existsSync("public/meta/icon-512.png")).toBe(true);
  });
});
