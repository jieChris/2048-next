import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ALLOWED_SHARED_ASSET_PATHS,
  auditMobileBoundary,
  extractImportSpecifiers,
  FORBIDDEN_MARKERS,
  parseCliOptions,
  RELEASE_CANDIDATE_FORBIDDEN_MARKERS,
} from "../../scripts/mobile-boundary-audit.mjs";

const temporaryRoots: string[] = [];

async function createFixtureRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "2048next-mobile-boundary-"));
  temporaryRoots.push(root);
  return root;
}

async function writeFixture(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("mobile-boundary-audit", () => {
  it("extracts static, side-effect, re-export and dynamic import specifiers", () => {
    const source = [
      'import { createGame } from "../../../src/core/engine";',
      'import "./styles/app.css";',
      'export { createReplay } from "../../../src/contracts/replay";',
      'const settings = await import("./pages/settings-page");',
    ].join("\n");

    expect(extractImportSpecifiers(source)).toEqual([
      "../../../src/core/engine",
      "./styles/app.css",
      "../../../src/contracts/replay",
      "./pages/settings-page",
    ]);
  });

  it("accepts an isolated mobile source tree and a single-entry build", async () => {
    const root = await createFixtureRoot();
    await writeFixture(
      root,
      "mobile/index.html",
      '<main id="app"></main><script type="module" src="./src/main.ts"></script>',
    );
    await writeFixture(
      root,
      "mobile/src/main.ts",
      [
        'import { createGame } from "../../src/core/engine";',
        'const loadSettings = () => import("./pages/settings-page");',
        "void createGame;",
        "void loadSettings;",
      ].join("\n"),
    );
    await writeFixture(
      root,
      "mobile/src/pages/settings-page.ts",
      "export const page = 'settings';",
    );
    await writeFixture(
      root,
      "dist-app/index.html",
      '<main id="app"></main><script type="module" src="./assets/index-a1.js"></script>',
    );
    await writeFixture(
      root,
      "dist-app/assets/index-a1.js",
      "const appName='2048 NEXT';",
    );

    await expect(
      auditMobileBoundary({
        mobileDir: path.join(root, "mobile"),
        distDir: path.join(root, "dist-app"),
      }),
    ).resolves.toEqual({
      sourceFileCount: 3,
      distFileCount: 2,
      distHtmlFiles: ["index.html"],
    });
  });

  it("allows only the two approved shared ClearSans font assets", async () => {
    expect([...ALLOWED_SHARED_ASSET_PATHS]).toEqual([
      "style/fonts/ClearSans-Regular-webfont.woff",
      "style/fonts/ClearSans-Bold-webfont.woff",
    ]);

    const root = await createFixtureRoot();
    await writeFixture(
      root,
      "mobile/index.html",
      '<script type="module" src="./src/main.ts"></script>',
    );
    await writeFixture(
      root,
      "mobile/src/main.ts",
      'import "./styles/tokens.css";',
    );
    await writeFixture(
      root,
      "mobile/src/styles/tokens.css",
      [
        '@font-face { src: url("../../../style/fonts/ClearSans-Regular-webfont.woff"); }',
        '@font-face { src: url("../../../style/fonts/ClearSans-Bold-webfont.woff"); }',
      ].join("\n"),
    );
    await writeFixture(
      root,
      "dist-app/index.html",
      '<link rel="stylesheet" href="./assets/app.css">',
    );
    await writeFixture(
      root,
      "dist-app/assets/app.css",
      '@font-face { src: url("./ClearSans-Regular-a1.woff"); }',
    );
    await writeFixture(
      root,
      "dist-app/assets/ClearSans-Regular-a1.woff",
      "fixture-font-bytes",
    );

    await expect(
      auditMobileBoundary({
        mobileDir: path.join(root, "mobile"),
        distDir: path.join(root, "dist-app"),
      }),
    ).resolves.toMatchObject({ distHtmlFiles: ["index.html"] });
  });

  it.each([
    "../../../style/fonts/ClearSans-Light-webfont.woff",
    "../../../style/fonts/ClearSans-Regular-webfont.woff2",
    "../../../style/main.css",
  ])(
    "rejects unapproved shared Web asset reference %s",
    async (assetReference) => {
      const root = await createFixtureRoot();
      await writeFixture(
        root,
        "mobile/index.html",
        '<script type="module" src="./src/main.ts"></script>',
      );
      await writeFixture(
        root,
        "mobile/src/main.ts",
        'import "./styles/tokens.css";',
      );
      await writeFixture(
        root,
        "mobile/src/styles/tokens.css",
        `.sample { background: url(${JSON.stringify(assetReference)}); }`,
      );
      await writeFixture(root, "dist-app/index.html", "<main>2048 NEXT</main>");

      await expect(
        auditMobileBoundary({
          mobileDir: path.join(root, "mobile"),
          distDir: path.join(root, "dist-app"),
        }),
      ).rejects.toThrow(/mobile-source.*web-asset-reference.*style\//iu);
    },
  );

  it("keeps the unapproved policy marker legal in the default foundation audit", async () => {
    const root = await createFixtureRoot();
    await writeFixture(root, "mobile/index.html", "<main>2048 NEXT</main>");
    await writeFixture(
      root,
      "mobile/src/privacy.ts",
      'export const policyVersion = "unapproved-draft";',
    );
    await writeFixture(root, "dist-app/index.html", "<main>2048 NEXT</main>");
    await writeFixture(
      root,
      "dist-app/assets/app.js",
      'const policyVersion="unapproved-draft";',
    );

    await expect(
      auditMobileBoundary({
        mobileDir: path.join(root, "mobile"),
        distDir: path.join(root, "dist-app"),
      }),
    ).resolves.toMatchObject({ distHtmlFiles: ["index.html"] });
  });

  it.each(["mobile-source", "dist-app"])(
    "rejects the unapproved policy marker in %s for release candidates",
    async (markerLocation) => {
      expect(RELEASE_CANDIDATE_FORBIDDEN_MARKERS).toEqual(["unapproved-draft"]);
      const root = await createFixtureRoot();
      await writeFixture(root, "mobile/index.html", "<main>2048 NEXT</main>");
      await writeFixture(
        root,
        "mobile/src/privacy.ts",
        markerLocation === "mobile-source"
          ? 'export const policyVersion = "unapproved-draft";'
          : 'export const policyVersion = "approved-v1";',
      );
      await writeFixture(root, "dist-app/index.html", "<main>2048 NEXT</main>");
      await writeFixture(
        root,
        "dist-app/assets/app.js",
        markerLocation === "dist-app"
          ? 'const policyVersion="unapproved-draft";'
          : 'const policyVersion="approved-v1";',
      );

      await expect(
        auditMobileBoundary({
          mobileDir: path.join(root, "mobile"),
          distDir: path.join(root, "dist-app"),
          releaseCandidate: true,
        }),
      ).rejects.toThrow(
        new RegExp(
          `release-candidate.*${markerLocation}.*unapproved-draft`,
          "iu",
        ),
      );
    },
  );

  it("parses the release-candidate CLI switch and rejects unknown arguments", () => {
    expect(parseCliOptions([])).toEqual({ releaseCandidate: false });
    expect(parseCliOptions(["--release-candidate"])).toEqual({
      releaseCandidate: true,
    });
    expect(() => parseCliOptions(["--unknown"])).toThrow(/unknown argument/iu);
  });

  it("rejects static and dynamic imports from legacy Web JavaScript", async () => {
    const root = await createFixtureRoot();
    await writeFixture(
      root,
      "mobile/index.html",
      '<script type="module" src="./src/main.ts"></script>',
    );
    await writeFixture(
      root,
      "mobile/src/main.ts",
      [
        'import { GameManager } from "../../../js/game_manager.js";',
        'const legacyTheme = () => import("../../../js/theme_manager.js");',
        "void GameManager;",
        "void legacyTheme;",
      ].join("\n"),
    );
    await writeFixture(
      root,
      "dist-app/index.html",
      '<script type="module" src="./assets/app.js"></script>',
    );
    await writeFixture(
      root,
      "dist-app/assets/app.js",
      "const appName='2048 NEXT';",
    );

    await expect(
      auditMobileBoundary({
        mobileDir: path.join(root, "mobile"),
        distDir: path.join(root, "dist-app"),
      }),
    ).rejects.toThrow(
      /forbidden.*mobile-source.*legacy-js-import.*js\/game_manager\.js/iu,
    );
  });

  it.each(FORBIDDEN_MARKERS)(
    "rejects the legacy marker %s in built text",
    async (marker) => {
      const root = await createFixtureRoot();
      await writeFixture(
        root,
        "mobile/index.html",
        '<script type="module" src="./src/main.ts"></script>',
      );
      await writeFixture(
        root,
        "mobile/src/main.ts",
        "export const appName = '2048 NEXT';",
      );
      await writeFixture(
        root,
        "dist-app/index.html",
        '<script type="module" src="./assets/app.js"></script>',
      );
      await writeFixture(
        root,
        "dist-app/assets/app.js",
        `const leakedLegacyReference = ${JSON.stringify(marker)};`,
      );

      await expect(
        auditMobileBoundary({
          mobileDir: path.join(root, "mobile"),
          distDir: path.join(root, "dist-app"),
        }),
      ).rejects.toThrow(
        new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "iu"),
      );
    },
  );

  it("rejects forbidden legacy artifact filenames recursively", async () => {
    const root = await createFixtureRoot();
    await writeFixture(
      root,
      "mobile/index.html",
      '<script type="module" src="./src/main.ts"></script>',
    );
    await writeFixture(
      root,
      "mobile/src/main.ts",
      "export const appName = '2048 NEXT';",
    );
    await writeFixture(
      root,
      "dist-app/index.html",
      '<script type="module" src="./assets/app.js"></script>',
    );
    await writeFixture(
      root,
      "dist-app/assets/home_standard_startup_bundle.js",
      "export {};",
    );

    await expect(
      auditMobileBoundary({
        mobileDir: path.join(root, "mobile"),
        distDir: path.join(root, "dist-app"),
      }),
    ).rejects.toThrow(
      /forbidden.*dist-app.*forbidden-path.*home_standard_startup_bundle\.js/iu,
    );
  });

  it("rejects Web multi-page HTML in dist-app", async () => {
    const root = await createFixtureRoot();
    await writeFixture(
      root,
      "mobile/index.html",
      '<script type="module" src="./src/main.ts"></script>',
    );
    await writeFixture(
      root,
      "mobile/src/main.ts",
      "export const appName = '2048 NEXT';",
    );
    await writeFixture(
      root,
      "dist-app/index.html",
      '<script type="module" src="./assets/app.js"></script>',
    );
    await writeFixture(
      root,
      "dist-app/play.html",
      '<script type="module" src="./assets/app.js"></script>',
    );
    await writeFixture(
      root,
      "dist-app/assets/app.js",
      "const appName='2048 NEXT';",
    );

    await expect(
      auditMobileBoundary({
        mobileDir: path.join(root, "mobile"),
        distDir: path.join(root, "dist-app"),
      }),
    ).rejects.toThrow(
      /dist-app must contain exactly one root index\.html.*index\.html, play\.html/iu,
    );
  });
});
