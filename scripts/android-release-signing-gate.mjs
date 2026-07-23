import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(projectRoot, "android");

const RELEASE_SIGNING_PROPERTIES = Object.freeze([
  "NEXT2048_RELEASE_STORE_FILE",
  "NEXT2048_RELEASE_STORE_PASSWORD",
  "NEXT2048_RELEASE_KEY_ALIAS",
  "NEXT2048_RELEASE_KEY_PASSWORD"
]);
const RELEASE_TASK_ENTRY_POINTS = Object.freeze([
  ":app:assembleRelease",
  ":app:assemble",
  ":app:bundleRelease"
]);

function runUnsignedReleaseTask({
  environment,
  taskName
}) {
  const gradleArguments = [
    "--no-daemon",
    "--console=plain",
    "--dry-run",
    ...RELEASE_SIGNING_PROPERTIES.map((propertyName) => `-P${propertyName}=`),
    taskName
  ];
  return spawnSync("./gradlew", gradleArguments, {
    cwd: androidRoot,
    encoding: "utf8",
    env: environment,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000
  });
}

function verifyMissingReleaseSigningFails({ environment = process.env } = {}) {
  const isolatedEnvironment = { ...environment };
  for (const propertyName of RELEASE_SIGNING_PROPERTIES) {
    delete isolatedEnvironment[propertyName];
    delete isolatedEnvironment[`ORG_GRADLE_PROJECT_${propertyName}`];
  }

  const results = RELEASE_TASK_ENTRY_POINTS.map((taskName) => {
    const result = runUnsignedReleaseTask({
      environment: isolatedEnvironment,
      taskName
    });
    if (result.error) throw result.error;
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status === 0) {
      throw new Error(
        `[android-release-signing-gate] ${taskName} unexpectedly succeeded without signing properties`
      );
    }
    if (!output.includes("Release signing configuration is required")) {
      throw new Error(
        `[android-release-signing-gate] ${taskName} failed for the wrong reason\n${output}`
      );
    }
    for (const propertyName of RELEASE_SIGNING_PROPERTIES) {
      if (!output.includes(propertyName)) {
        throw new Error(
          `[android-release-signing-gate] ${taskName} failure omitted missing property ${propertyName}`
        );
      }
    }
    return { taskName, status: result.status, output };
  });

  console.log(
    `[android-release-signing-gate] PASS: unsigned release rejected across ${RELEASE_TASK_ENTRY_POINTS.length} task entry points with all ${RELEASE_SIGNING_PROPERTIES.length} required properties`
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
    verifyMissingReleaseSigningFails();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : String(error)
    );
    process.exitCode = 1;
  }
}

export {
  RELEASE_SIGNING_PROPERTIES,
  RELEASE_TASK_ENTRY_POINTS,
  runUnsignedReleaseTask,
  verifyMissingReleaseSigningFails
};
