import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  RELEASE_SIGNING_PROPERTIES,
  RELEASE_TASK_ENTRY_POINTS,
} from "./android-release-signing-gate.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(projectRoot, "android");
const RELEASE_ASSET_FAILURE =
  "Release packaging requires production mobile assets";

function runReleaseTaskWithPlaceholderSigning({
  environment,
  taskName,
}) {
  const gradleArguments = [
    "--no-daemon",
    "--console=plain",
    "--dry-run",
    ...RELEASE_SIGNING_PROPERTIES.map(
      (propertyName) => `-P${propertyName}=release-assets-gate-placeholder`,
    ),
    taskName,
  ];
  return spawnSync("./gradlew", gradleArguments, {
    cwd: androidRoot,
    encoding: "utf8",
    env: environment,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000,
  });
}

function verifyDebugAssetsCannotEnterRelease({ environment = process.env } = {}) {
  const results = RELEASE_TASK_ENTRY_POINTS.map((taskName) => {
    const result = runReleaseTaskWithPlaceholderSigning({
      environment,
      taskName,
    });
    if (result.error) throw result.error;
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status === 0) {
      throw new Error(
        `[android-release-assets-gate] ${taskName} unexpectedly accepted non-production mobile assets`,
      );
    }
    if (!output.includes(RELEASE_ASSET_FAILURE)) {
      throw new Error(
        `[android-release-assets-gate] ${taskName} failed for the wrong reason\n${output}`,
      );
    }
    return { taskName, status: result.status, output };
  });

  console.log(
    `[android-release-assets-gate] PASS: non-production assets rejected across ${RELEASE_TASK_ENTRY_POINTS.length} release task entry points`,
  );
  return { results };
}

function isDirectCliExecution() {
  return Boolean(
    process.argv[1] && path.resolve(process.argv[1]) === __filename
  );
}

if (isDirectCliExecution()) {
  try {
    verifyDebugAssetsCannotEnterRelease();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

export {
  RELEASE_ASSET_FAILURE,
  runReleaseTaskWithPlaceholderSigning,
  verifyDebugAssetsCannotEnterRelease,
};
