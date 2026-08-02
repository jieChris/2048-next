import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CANONICAL_HOME = "https://2048next.cn/2048.html";

describe("search discovery contract", () => {
  it("keeps one canonical game URL and valid public metadata", () => {
    const home = readFileSync("2048.html", "utf8");
    const index = readFileSync("index.html", "utf8");

    expect(home).toContain(`<link rel="canonical" href="${CANONICAL_HOME}">`);
    expect(home).toContain(`<meta property="og:url" content="${CANONICAL_HOME}">`);
    expect(home).toContain(
      '<meta property="og:image" content="https://2048next.cn/meta/icon-512.png">'
    );
    expect(home).toMatch(/"url":\s*"https:\/\/2048next\.cn\/2048\.html"/u);
    expect(home).not.toContain('"@type": "FAQPage"');
    expect(index).toContain(`<link rel="canonical" href="${CANONICAL_HOME}" />`);
  });

  it("publishes distinct metadata for the modes landing page", () => {
    const modes = readFileSync("modes.html", "utf8");

    expect(modes).toContain("<title>2048 游戏模式大全 — 2048 NEXT</title>");
    expect(modes).toMatch(/<meta name="description" content="[^"]+">/u);
    expect(modes).toContain(
      '<link rel="canonical" href="https://2048next.cn/modes.html">'
    );
    expect(modes).toContain(
      '<meta property="og:url" content="https://2048next.cn/modes.html">'
    );
  });

  it("does not let the language runtime erase descriptive page titles", () => {
    const i18n = readFileSync("js/core_i18n_runtime.js", "utf8");
    const modesPage = readFileSync("src/pages/modes-page.ts", "utf8");

    expect(i18n).toContain(
      '"2048.html": { zh: "2048 NEXT — 免费在线 2048 多模式数字合并游戏", en: "2048 NEXT — Free Online 2048 Puzzle Game" }'
    );
    expect(i18n).toContain(
      '"modes.html": { zh: "2048 游戏模式大全 — 2048 NEXT", en: "2048 Game Modes — 2048 NEXT" }'
    );
    expect(modesPage).toContain('title: "2048 游戏模式大全 — 2048 NEXT"');
    expect(modesPage).toContain('title: "2048 Game Modes — 2048 NEXT"');
  });

  it("lists only canonical public landing pages in the sitemap", () => {
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu), (match) => match[1]);

    expect(urls).toEqual([
      "https://2048next.cn/2048.html",
      "https://2048next.cn/modes.html"
    ]);
    expect(sitemap).not.toMatch(/(?:play|history|index)\.html/u);
  });

  it("describes the launched product and keeps search crawlers allowed", () => {
    const llms = readFileSync("public/llms.txt", "utf8");
    const robots = readFileSync("public/robots.txt", "utf8");

    expect(llms).not.toMatch(/内测|Closed Beta/iu);
    expect(robots).toContain("User-agent: *\nAllow: /");
    expect(robots).toContain("Sitemap: https://2048next.cn/sitemap.xml");
  });

  it("redirects duplicate and insecure production entry points", () => {
    const nginx = readFileSync("deploy/nginx/2048-next.nginx.conf.example", "utf8");

    expect(nginx).toContain("map $http_cf_visitor $cloudflare_visitor_uses_http");
    expect(nginx).toContain('~*^\\{\\"scheme\\":\\"http\\"\\}$ 1;');
    const cloudflareHttpPattern = /^\{"scheme":"http"\}$/iu;
    expect(cloudflareHttpPattern.test('{"scheme":"http"}')).toBe(true);
    expect(cloudflareHttpPattern.test('{"scheme":"https"}')).toBe(false);
    expect(nginx).toContain(
      "if ($cloudflare_visitor_uses_http) {\n        return 308 https://2048next.cn$request_uri;\n    }"
    );
    expect(nginx).not.toContain('if ($http_x_forwarded_proto = "http")');
    expect(nginx).toContain(
      'if ($host = "www.2048next.cn") {\n        return 308 https://2048next.cn$request_uri;\n    }'
    );

    const redirects = new Map([
      ["/", "https://2048next.cn/2048.html$is_args$args"],
      ["/index.html", "https://2048next.cn/2048.html$is_args$args"],
      ["/beta-login.html", "https://2048next.cn/2048.html"],
      ["/beta-access.html", "https://2048next.cn/2048.html"]
    ]);
    for (const [path, target] of redirects) {
      expect(nginx).toContain(`location = ${path} {\n        return 308 ${target};\n    }`);
    }
    expect(nginx).toContain("location = /api {");
    expect(nginx).toContain("location = /health {");
  });
});
