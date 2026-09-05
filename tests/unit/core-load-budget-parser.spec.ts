import { brotliCompressSync, gzipSync } from "node:zlib";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  analyzeCoreLoadDist,
  validateCoreLoadConfig,
} from "../../scripts/core-load-budget-check.mjs";
import { parseCssDependencies } from "../../scripts/core-load-budget/css-parser.mjs";
import { parseBuiltHtml } from "../../scripts/core-load-budget/html-parser.mjs";
import { parseJavaScriptModule } from "../../scripts/core-load-budget/javascript-parser.mjs";
import {
  REQUIRED_LEGACY_METRICS,
  REQUIRED_PAGE_METRICS,
} from "../../scripts/core-load-budget/schema.mjs";

type Violation = { code: string; path?: string | null };
type MetricRecord = { actual: number; encoding: string; path: string | null };
type CoreAnalysis = {
  pages: Record<
    string,
    {
      criticalCssDependencyPaths: string[];
      deferredDynamicPaths: string[];
      metrics: Record<string, MetricRecord>;
    }
  >;
  discoveryViolations: Violation[];
};
type ParsedHtml = {
  entries: string[];
  directResources: Array<{ requestUrl: string }>;
  preloads: string[];
  embedded: Array<{ policy: string }>;
  violations: Violation[];
};
type ParsedJavaScript = {
  staticImports: string[];
  dynamicImports: string[];
  viteDependencies: string[];
  violations: Violation[];
};
type ParsedCss = {
  imports: string[];
  assets: string[];
  violations: Violation[];
};
const parseCss = parseCssDependencies as unknown as (
  source: string,
  requestUrl: string,
) => ParsedCss;
const parseHtml = parseBuiltHtml as unknown as (
  html: string,
  requestUrl: string,
) => ParsedHtml;
const parseJavaScript = parseJavaScriptModule as unknown as (
  source: string,
  requestUrl: string,
) => ParsedJavaScript;
const analyzeDist = analyzeCoreLoadDist as unknown as (input: {
  distRoot: string;
  pageConfigs: Record<string, { html: string }>;
  compression: {
    preferred: "br";
    fallback: "gzip";
    requireBrotli: boolean;
  };
}) => Promise<CoreAnalysis>;

async function writeCompressed(
  root: string,
  relativePath: string,
  content: string | Buffer,
) {
  const target = path.join(root, relativePath);
  const raw = Buffer.isBuffer(content) ? content : Buffer.from(content);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, raw);
  await writeFile(`${target}.br`, brotliCompressSync(raw));
  await writeFile(`${target}.gz`, gzipSync(raw));
}

async function createPageFixture(html: string) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "core-load-parser-"));
  const distRoot = path.join(projectRoot, "dist");
  await writeCompressed(distRoot, "play.html", html);
  return { projectRoot, distRoot };
}

function completeConfig() {
  const metrics = (names: readonly string[]) =>
    Object.fromEntries(names.map((name) => [name, 0]));
  const page = (
    html: string,
  ): {
    html: string;
    criticalPreloads: string[];
    max: Record<string, number>;
  } => ({ html, criticalPreloads: [], max: metrics(REQUIRED_PAGE_METRICS) });
  return {
    schemaVersion: 1,
    distPath: "dist",
    compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    graphPolicy: {
      staticImports: "included",
      dynamicImports: "deferred-separate",
      navigationHrefs: "excluded",
      cssDependencies: "transitive",
      dataAndFragmentUrls: "embedded-excluded",
      queryStrings: "request-identity",
    },
    pages: {
      home: page("2048.html"),
      play: page("play.html"),
      replay: page("replay.html"),
    },
    legacyBundles: {
      startup: {
        path: "js/home_standard_startup_bundle.js",
        max: metrics(REQUIRED_LEGACY_METRICS),
      },
      deferred: {
        path: "js/home_standard_deferred_bundle.js",
        max: metrics(REQUIRED_LEGACY_METRICS),
      },
    },
  };
}

describe("exact built HTML parsing", () => {
  it("uses exact attributes rather than data-* shadows", () => {
    const parsed = parseHtml(
      `
      <script data-src="fake.js" src="real.js" type="module" data-nomodule></script>
      <link data-href="fake.css" href="real.css" rel="stylesheet">
      <img data-src="fake.png" src="real.png">
      <a href="navigation.html">nav</a>`,
      "play.html",
    );

    expect(parsed.entries).toEqual(["real.js"]);
    expect(
      parsed.directResources.map((item) => item.requestUrl).sort(),
    ).toEqual(["real.css", "real.js", "real.png"]);
  });

  it("fails closed for downloadable external, protocol-relative, and drive URLs", () => {
    const parsed = parseHtml(
      `
      <script type="module" src="https://cdn.example/app.js"></script>
      <link rel="stylesheet" href="//cdn.example/app.css">
      <img src="C:\\images\\logo.png">
      <iframe src="../escape.html"></iframe>`,
      "play.html",
    );

    expect(parsed.violations).toHaveLength(4);
    expect(
      parsed.violations.every((item) => item.code === "unsafe-resource-url"),
    ).toBe(true);
  });

  it("collects srcset candidates but explicitly excludes data and fragments", () => {
    const parsed = parseHtml(
      `
      <img srcset="small.png?v=1 1x, large.png?v=2 2x" src="data:image/png;base64,AAAA">
      <source srcset="responsive.webp 1x">
      <video poster="#embedded"></video>`,
      "play.html",
    );

    expect(
      parsed.directResources.map((item) => item.requestUrl).sort(),
    ).toEqual(["large.png?v=2", "responsive.webp", "small.png?v=1"]);
    expect(parsed.embedded.map((item) => item.policy)).toEqual(
      expect.arrayContaining(["data-excluded", "fragment-excluded"]),
    );
  });

  it("collects responsive image preload DPR candidates and deduplicates href", () => {
    const parsed = parseHtml(
      `
      <link rel="preload" as="image" href="tiny.png?v=1#hero"
        imagesrcset="tiny.png?v=1 1x, huge.png?v=2 2x">`,
      "play.html",
    );

    expect(
      parsed.directResources.map((item) => item.requestUrl).sort(),
    ).toEqual(["huge.png?v=2", "tiny.png?v=1"]);
  });

  it("fails closed for unsafe responsive image preload candidates", () => {
    const parsed = parseHtml(
      `
      <link rel="preload" as="image" href="tiny.png"
        imagesrcset="tiny.png 1x, https://cdn.example/huge.png 2x">`,
      "play.html",
    );

    expect(parsed.directResources.map((item) => item.requestUrl)).toEqual([
      "tiny.png",
    ]);
    expect(parsed.violations).toContainEqual(
      expect.objectContaining({
        code: "unsafe-resource-url",
        path: "https://cdn.example/huge.png",
      }),
    );
  });

  it("counts distinct query cache keys as distinct bytes and requests", async () => {
    const fixture = await createPageFixture(`
      <script type="module" src="entry.js?v=1"></script>
      <link rel="modulepreload" href="entry.js?v=1">
      <img src="entry.js?v=2">`);
    const raw = "export {};";
    await writeCompressed(fixture.distRoot, "entry.js", raw);
    const compressedBytes = brotliCompressSync(Buffer.from(raw)).length;
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });

    expect(result.pages.play.metrics.directResourceRequests.actual).toBe(2);
    expect(result.pages.play.metrics.directResourceBytes.actual).toBe(
      compressedBytes * 2,
    );
  });

  it("preserves query cache keys and deduplicates only identical request URLs", () => {
    const parsed = parseHtml(
      `
      <script type="module" src="app.js?v=1#fragment"></script>
      <link rel="modulepreload" href="app.js?v=1">
      <img src="app.js?v=2">`,
      "play.html",
    );

    expect(
      parsed.directResources.map((item) => item.requestUrl).sort(),
    ).toEqual(["app.js?v=1", "app.js?v=2"]);
    expect(parsed.preloads).toEqual(["app.js?v=1"]);
  });
});

describe("CSS resource escape policy", () => {
  it.each([
    ["quoted escaped scheme", '@import "\\68 ttps://cdn.example/a.css";'],
    [
      "unquoted escaped scheme",
      ".a{background:url(\\68 ttps://cdn.example/a.png)}",
    ],
    ["escaped traversal separator", '@import "..\\/secret.css";'],
    ["hex escape", ".a{background:url(icons/\\2e png)}"],
    ["escaped control", '.a{background:url("bad\\\nname.png")}'],
  ])(
    "fails closed for %s without returning a cooked dependency",
    (_label, css) => {
      const parsed = parseCss(css, "main.css");

      expect(parsed.imports).toEqual([]);
      expect(parsed.assets).toEqual([]);
      expect(parsed.violations).toContainEqual(
        expect.objectContaining({
          code: "unsupported-css-escape",
          path: "main.css",
        }),
      );
    },
  );

  it.each([
    ["hex escaped at-keyword", '@\\69mport "huge.css";'],
    [
      "hex escape with terminating whitespace and mixed case",
      '@\\000069 mPoRt "huge.css";',
    ],
    ["simple escaped function name", ".bad{background:u\\rl(huge.png)}"],
    ["case-variant escaped function name", ".bad{background:U\\52L(huge.png)}"],
    ["escaped newline in at-keyword", '@\\\nimport "huge.css";'],
    [
      "escaped control in function name",
      ".bad{background:u\\\u0001rl(huge.png)}",
    ],
  ])(
    "rejects %s and recovers later literal dependencies",
    (_label, escapedResource) => {
      const parsed = parseCss(
        `${escapedResource}@import "later.css";.good{background:url(later.png)}`,
        "main.css",
      );

      expect(parsed.imports).toEqual(["later.css"]);
      expect(parsed.assets).toEqual(["later.png"]);
      expect(parsed.violations).toContainEqual(
        expect.objectContaining({
          code: "unsupported-css-escape",
          path: "main.css",
        }),
      );
    },
  );

  it("keeps literal case-insensitive @import and url behavior", () => {
    const parsed = parseCss(
      '@IMPORT "normal.css";.good{background:URL(normal.png)}',
      "main.css",
    );

    expect(parsed.imports).toEqual(["normal.css"]);
    expect(parsed.assets).toEqual(["normal.png"]);
    expect(parsed.violations).toEqual([]);
  });

  it("does not reject unrelated escapes and recovers subsequent dependencies", () => {
    const parsed = parseCss(
      '.icon\\+active::before{content:"\\2713"}.bad{background:url("bad\\2e png")}.good{background:url(good.png)}',
      "main.css",
    );

    expect(parsed.assets).toEqual(["good.png"]);
    expect(parsed.violations).toContainEqual(
      expect.objectContaining({ code: "unsupported-css-escape" }),
    );
  });
});

describe("TypeScript AST module parsing", () => {
  it("finds static imports, re-exports, literals, and current Vite map deps", () => {
    const parsed = parseJavaScript(
      `
      const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./lazy.css","./lazy.js"])))=>i.map(i=>d[i]);
      import "./side.js";
      import value from "./value.js";
      export { value as other } from "./reexport.js";
      import("./dynamic.js");`,
      "entry.js",
    );

    expect(parsed.staticImports.sort()).toEqual([
      "./reexport.js",
      "./side.js",
      "./value.js",
    ]);
    expect(parsed.dynamicImports).toEqual(["./dynamic.js"]);
    expect(parsed.viteDependencies).toEqual(["./lazy.css", "./lazy.js"]);
    expect(parsed.violations).toEqual([]);
  });

  it("rejects identifier and interpolated-template dynamic imports", () => {
    const parsed = parseJavaScript(
      "const target='./x.js'; import(target); import(`./${target}.js`);",
      "entry.js",
    );
    expect(
      parsed.violations.filter(
        (item) => item.code === "non-literal-dynamic-import",
      ),
    ).toHaveLength(2);
  });

  it("fails closed when a Vite helper reference has no resolvable mapping", () => {
    const parsed = parseJavaScript(
      "const load=(i)=>__vite__mapDeps(i);",
      "entry.js",
    );
    expect(parsed.violations).toContainEqual(
      expect.objectContaining({ code: "unresolved-vite-map-deps" }),
    );
  });
});

describe("transitive CSS and compression graph", () => {
  it("includes cyclic @import, queried fonts, and images exactly once per request URL", async () => {
    const fixture = await createPageFixture(`
      <script type="module" src="entry.js"></script>
      <link rel="stylesheet" href="main.css?v=1">`);
    await writeCompressed(fixture.distRoot, "entry.js", "export {};");
    await writeCompressed(
      fixture.distRoot,
      "main.css",
      '@import "nested.css?v=1";@font-face{src:url("font.woff?v=1")}body{background:url(image.png?v=2)}.embedded{background:url(data:image/png;base64,AAAA)}.fragment{filter:url(#shadow)}',
    );
    await writeCompressed(
      fixture.distRoot,
      "nested.css",
      '@import "main.css?v=1";.x{background:url(image.png?v=2)}',
    );
    await writeFile(path.join(fixture.distRoot, "font.woff"), Buffer.alloc(37));
    await writeFile(path.join(fixture.distRoot, "image.png"), Buffer.alloc(41));

    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });
    const paths = result.pages.play.criticalCssDependencyPaths;
    expect(paths).toEqual(
      expect.arrayContaining([
        "font.woff?v=1",
        "image.png?v=2",
        "main.css?v=1",
        "nested.css?v=1",
      ]),
    );
    expect(paths.filter((item) => item === "image.png?v=2")).toHaveLength(1);
    expect(result.pages.play.metrics.largestCriticalFontBytes.actual).toBe(37);
    expect(result.discoveryViolations).toEqual([]);
  });

  it("requires gzip across deferred resources", async () => {
    const fixture = await createPageFixture(
      '<script type="module" src="entry.js"></script>',
    );
    await writeCompressed(
      fixture.distRoot,
      "entry.js",
      'import("deferred.js")',
    );
    const deferredPath = path.join(fixture.distRoot, "deferred.js");
    const raw = Buffer.from("export default 1");
    await writeFile(deferredPath, raw);
    await writeFile(`${deferredPath}.br`, brotliCompressSync(raw));

    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });
    expect(result.pages.play.deferredDynamicPaths).toContain("deferred.js");
    expect(result.discoveryViolations).toContainEqual(
      expect.objectContaining({
        code: "missing-gzip-sidecar",
        path: "deferred.js",
      }),
    );
  });

  it.each([
    ["br", "invalid-brotli-sidecar"],
    ["gz", "invalid-gzip-sidecar"],
  ])("rejects corrupt or mismatched %s sidecars", async (extension, code) => {
    const fixture = await createPageFixture(
      '<script type="module" src="entry.js"></script>',
    );
    await writeCompressed(fixture.distRoot, "entry.js", "export {};");
    await writeFile(
      path.join(fixture.distRoot, `entry.js.${extension}`),
      Buffer.from("wrong"),
    );
    const result = await analyzeDist({
      distRoot: fixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });
    expect(result.discoveryViolations).toContainEqual(
      expect.objectContaining({ code }),
    );
  });
});

describe("resource realpath containment", () => {
  it("rejects raw and sidecar symlink escapes", async () => {
    const rawFixture = await createPageFixture(
      '<script type="module" src="escape.js"></script>',
    );
    const outsideRaw = path.join(rawFixture.projectRoot, "outside.js");
    await writeFile(outsideRaw, "export {};");
    await symlink(outsideRaw, path.join(rawFixture.distRoot, "escape.js"));
    const rawResult = await analyzeDist({
      distRoot: rawFixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });
    expect(rawResult.discoveryViolations).toContainEqual(
      expect.objectContaining({ code: "unsafe-resource-path" }),
    );

    const sidecarFixture = await createPageFixture(
      '<script type="module" src="entry.js"></script>',
    );
    const raw = Buffer.from("export {};");
    await mkdir(sidecarFixture.distRoot, { recursive: true });
    await writeFile(path.join(sidecarFixture.distRoot, "entry.js"), raw);
    await writeFile(
      path.join(sidecarFixture.distRoot, "entry.js.gz"),
      gzipSync(raw),
    );
    const outsideBr = path.join(sidecarFixture.projectRoot, "outside.br");
    await writeFile(outsideBr, brotliCompressSync(raw));
    await symlink(outsideBr, path.join(sidecarFixture.distRoot, "entry.js.br"));
    const sidecarResult = await analyzeDist({
      distRoot: sidecarFixture.distRoot,
      pageConfigs: { play: { html: "play.html" } },
      compression: { preferred: "br", fallback: "gzip", requireBrotli: true },
    });
    expect(sidecarResult.discoveryViolations).toContainEqual(
      expect.objectContaining({ code: "invalid-brotli-sidecar" }),
    );
  });
});

describe("bootstrap schema ownership", () => {
  it.each([
    [
      "missing page",
      (config: ReturnType<typeof completeConfig>) =>
        Reflect.deleteProperty(config.pages, "home"),
    ],
    [
      "wrong page",
      (config: ReturnType<typeof completeConfig>) => {
        config.pages.play.html = "other.html";
      },
    ],
    [
      "missing bundle",
      (config: ReturnType<typeof completeConfig>) =>
        Reflect.deleteProperty(config.legacyBundles, "startup"),
    ],
    [
      "invalid preload",
      (config: ReturnType<typeof completeConfig>) => {
        config.pages.play.criticalPreloads = ["https://cdn.example/app.js"];
      },
    ],
    [
      "duplicate preload",
      (config: ReturnType<typeof completeConfig>) => {
        config.pages.play.criticalPreloads = [
          "assets/app-<hash>.js",
          "assets/app-<hash>.js",
        ];
      },
    ],
    [
      "missing page metric",
      (config: ReturnType<typeof completeConfig>) =>
        Reflect.deleteProperty(config.pages.play.max, "criticalLoadBytes"),
    ],
    [
      "missing legacy metric",
      (config: ReturnType<typeof completeConfig>) =>
        Reflect.deleteProperty(config.legacyBundles.startup.max, "gzipBytes"),
    ],
  ])("rejects %s", (_label, mutate) => {
    const config = completeConfig();
    mutate(config);
    expect(validateCoreLoadConfig(config).map((item) => item.code)).toContain(
      "invalid-config",
    );
  });
});
