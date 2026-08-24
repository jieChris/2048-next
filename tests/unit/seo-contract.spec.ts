import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CANONICAL_HOME = "https://2048next.cn/";

describe("search discovery contract", () => {
  it("keeps one canonical game URL and valid public metadata", () => {
    const home = readFileSync("2048.html", "utf8");
    const index = readFileSync("index.html", "utf8");

    expect(home).toContain(`<link rel="canonical" href="${CANONICAL_HOME}">`);
    expect(home).toContain(`<meta property="og:url" content="${CANONICAL_HOME}">`);
    expect(home).toContain(
      '<meta property="og:image" content="https://2048next.cn/meta/icon-512.png">'
    );
    expect(home).toMatch(/"url":\s*"https:\/\/2048next\.cn\/"/u);
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
      "https://2048next.cn/",
      "https://2048next.cn/modes.html"
    ]);
    expect(sitemap).toContain("<lastmod>2026-08-24</lastmod>");
    expect(sitemap).not.toMatch(/(?:play|history|index)\.html/u);
  });

  it("describes the launched product and keeps search crawlers allowed", () => {
    const llms = readFileSync("public/llms.txt", "utf8");
    const robots = readFileSync("public/robots.txt", "utf8");

    expect(llms).not.toMatch(/内测|Closed Beta/iu);
    expect(robots).toContain("User-agent: *\nAllow: /");
    expect(robots).toContain("Sitemap: https://2048next.cn/sitemap.xml");
  });

  it("keeps Baidu and Bing ownership files published", () => {
    expect(
      readFileSync("public/baidu_verify_codeva-nWQw1M3I49.html", "utf8").trim()
    ).toBe("15e3c771012a7e508a357aee6a60553f");
    expect(
      readFileSync("public/e0b946e4e0f13886f35f1f28e09bcd88.txt", "utf8").trim()
    ).toBe("e0b946e4e0f13886f35f1f28e09bcd88");
  });

  it("redirects duplicates, excludes application pages, and preserves the API upstream", () => {
    const nginx = readFileSync("deploy/nginx/2048-next.nginx.conf.example", "utf8");

    expect(nginx).toContain("server 2048-game-api:3001;");
    expect(nginx).not.toContain("server 127.0.0.1:3010;");
    expect(nginx).toContain("map $http_cf_visitor $cloudflare_visitor_uses_http");
    expect(nginx).toContain('~*^\\{\\"scheme\\":\\"http\\"\\}$ 1;');
    const cloudflareHttpPattern = /^\{"scheme":"http"\}$/iu;
    expect(cloudflareHttpPattern.test('{"scheme":"http"}')).toBe(true);
    expect(cloudflareHttpPattern.test('{"scheme":"https"}')).toBe(false);
    expect(nginx).toContain("map $uri $search_robots");
    expect(nginx).toContain('"noindex, follow";');
    expect(nginx).toContain("add_header X-Robots-Tag $search_robots always;");

    expect(nginx).toContain("location = / {\n        try_files /2048.html =404;\n    }");

    const redirects = new Map([
      ["/2048.html", "https://2048next.cn/$is_args$args"],
      ["/index.html", "https://2048next.cn/$is_args$args"],
      ["/beta-login.html", "https://2048next.cn/"],
      ["/beta-access.html", "https://2048next.cn/"]
    ]);
    for (const [path, target] of redirects) {
      expect(nginx).toContain(`location = ${path} {\n        return 308 ${target};\n    }`);
    }
    expect(nginx).toContain("location = /api {");
    expect(nginx).toContain("location = /health {");
  });
});
