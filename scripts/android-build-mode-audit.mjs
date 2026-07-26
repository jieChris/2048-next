import { readFile } from "node:fs/promises";
import path from "node:path";

const expectedMode = String(process.argv[2] || "").trim();
if (expectedMode !== "android-debug" && expectedMode !== "production") {
  throw new Error("expected build mode must be android-debug or production");
}

const expected = {
  schema: 3,
  mode: expectedMode,
  policyVersion: "2026-08-01",
  apiBase: "https://2048next.cn/api",
  allowApiBaseOverride: expectedMode === "android-debug",
  allowDebugLoopbackHttp: expectedMode === "android-debug",
};
const root = process.cwd();
const paths = [
  path.join(root, "dist-app", "mobile-build-flags.json"),
  path.join(
    root,
    "android",
    "app",
    "src",
    "main",
    "assets",
    "public",
    "mobile-build-flags.json",
  ),
];

for (const manifestPath of paths) {
  const actual = JSON.parse(await readFile(manifestPath, "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `mobile build mode mismatch at ${path.relative(root, manifestPath)}`,
    );
  }
}

console.log(
  `[android-build-mode-audit] PASS: mode=${expected.mode} loopbackHttp=${expected.allowDebugLoopbackHttp}`,
);
