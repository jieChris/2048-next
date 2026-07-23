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

function verifyMissingReleaseSigningFails({ environment = process.env } = {}) {
  const isolatedEnvironment = { ...environment };
  for (const propertyName of RELEASE_SIGNING_PROPERTIES) {
    delete isolatedEnvironment[propertyName];
    delete isolatedEnvironment[`ORG_GRADLE_PROJECT_${propertyName}`];
  }

  const gradleArguments = [
    "--no-daemon",
    "--console=plain",
    ...RELEASE_SIGNING_PROPERTIES.map((propertyName) => `-P${propertyName}=`),
    ":app:assembleRelease"
  ];
  const result = spawnSync("./gradlew", gradleArguments, {
    cwd: androidRoot,
    encoding: "utf8",
    env: isolatedEnvironment,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000
  });

  if (result.error) throw result.error;
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status === 0) {
    throw new Error(
      "[android-release-signing-gate] release build unexpectedly succeeded without signing properties"
    );
  }
  if (!output.includes("Release signing configuration is required")) {
    throw new Error(
      `[android-release-signing-gate] release failed for the wrong reason\n${output}`
    );
  }
  for (const propertyName of RELEASE_SIGNING_PROPERTIES) {
    if (!output.includes(propertyName)) {
      throw new Error(
        `[android-release-signing-gate] failure omitted missing property ${propertyName}`
      );
    }
  }

  console.log(
    `[android-release-signing-gate] PASS: unsigned release rejected with all ${RELEASE_SIGNING_PROPERTIES.length} required properties`
  );
  return { status: result.status, output };
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

export { RELEASE_SIGNING_PROPERTIES, verifyMissingReleaseSigningFails };
