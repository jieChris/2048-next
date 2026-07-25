import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultApk = path.join(
  projectRoot,
  "android/app/build/outputs/apk/release/app-release.apk"
);
const defaultAab = path.join(
  projectRoot,
  "android/app/build/outputs/bundle/release/app-release.aab"
);
const defaultOutput = path.join(projectRoot, "artifacts/android-release");

function fail(message) {
  throw new Error(`[android-release-artifacts] ${message}`);
}

function normalizeCertificateSha256(value) {
  const normalized = String(value || "")
    .replace(/[^0-9a-f]/giu, "")
    .toUpperCase();
  if (normalized.length !== 64) fail("certificate SHA-256 must contain 64 hexadecimal characters");
  return normalized;
}

function parseApkCertificateSha256(output) {
  const match = /certificate SHA-256 digest:\s*([0-9a-f:]+)/iu.exec(output);
  if (!match) fail("apksigner output omitted the certificate SHA-256 digest");
  return normalizeCertificateSha256(match[1]);
}

function parseAabCertificateSha256(output) {
  const match = /SHA256:\s*([0-9a-f:]+)/iu.exec(output);
  if (!match) fail("keytool output omitted the certificate SHA-256 fingerprint");
  return normalizeCertificateSha256(match[1]);
}

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function toolPath(relativePath, fallback) {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  return androidHome ? path.join(androidHome, relativePath) : fallback;
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C", LANG: "C" },
    maxBuffer: 4 * 1024 * 1024
  }).trim();
}

function resolveCommitSha() {
  const head = run("git", ["rev-parse", "HEAD"]);
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== head) {
    fail(`GITHUB_SHA does not match HEAD: ${process.env.GITHUB_SHA} != ${head}`);
  }
  const trackedChanges = run("git", [
    "status",
    "--porcelain",
    "--untracked-files=no"
  ]);
  if (trackedChanges) fail("tracked worktree changes must be committed before release packaging");
  return head;
}

async function fileMetadata(file) {
  const bytes = await readFile(file);
  return {
    bytes: (await stat(file)).size,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

async function verifyAndroidReleaseArtifacts({
  apkPath = defaultApk,
  aabPath = defaultAab,
  outputPath = defaultOutput,
  expectedCertificateSha256 = process.env.NEXT2048_RELEASE_CERT_SHA256
} = {}) {
  const expectedCertificate = normalizeCertificateSha256(expectedCertificateSha256);
  const apksigner = toolPath("build-tools/36.0.0/apksigner", "apksigner");
  const apkanalyzer = toolPath("cmdline-tools/latest/bin/apkanalyzer", "apkanalyzer");
  const keytool = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, "bin/keytool")
    : "keytool";
  const jarsigner = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, "bin/jarsigner")
    : "jarsigner";
  const apk = path.resolve(apkPath);
  const aab = path.resolve(aabPath);
  const commitSha = resolveCommitSha();

  const apkCertificate = parseApkCertificateSha256(
    run(apksigner, ["verify", "--verbose", "--print-certs", apk])
  );
  run(jarsigner, ["-verify", aab]);
  const aabCertificate = parseAabCertificateSha256(
    run(keytool, ["-printcert", "-jarfile", aab])
  );
  if (apkCertificate !== expectedCertificate || aabCertificate !== expectedCertificate) {
    fail(
      `signer mismatch: expected=${expectedCertificate} apk=${apkCertificate} aab=${aabCertificate}`
    );
  }

  const applicationId = run(apkanalyzer, ["manifest", "application-id", apk]);
  if (applicationId !== "cn.next2048.app") fail(`unexpected application ID: ${applicationId}`);
  const versionCode = Number.parseInt(
    run(apkanalyzer, ["manifest", "version-code", apk]),
    10
  );
  if (!Number.isSafeInteger(versionCode) || versionCode < 1) fail("invalid versionCode");
  const versionName = run(apkanalyzer, ["manifest", "version-name", apk]);
  if (!versionName) fail("missing versionName");
  if (
    process.env.NEXT2048_EXPECTED_VERSION_CODE &&
    String(versionCode) !== process.env.NEXT2048_EXPECTED_VERSION_CODE
  ) {
    fail(`versionCode mismatch: ${versionCode} != ${process.env.NEXT2048_EXPECTED_VERSION_CODE}`);
  }
  if (
    process.env.NEXT2048_EXPECTED_VERSION_NAME &&
    versionName !== process.env.NEXT2048_EXPECTED_VERSION_NAME
  ) {
    fail(`versionName mismatch: ${versionName} != ${process.env.NEXT2048_EXPECTED_VERSION_NAME}`);
  }

  const output = path.resolve(outputPath);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const safeVersionName = versionName.replace(/[^0-9A-Za-z._-]/gu, "-");
  const apkFilename = `2048-next-${safeVersionName}.apk`;
  const aabFilename = `2048-next-${safeVersionName}.aab`;
  const copiedApk = path.join(output, apkFilename);
  const copiedAab = path.join(output, aabFilename);
  await Promise.all([copyFile(apk, copiedApk), copyFile(aab, copiedAab)]);

  const metadata = {
    schema: 1,
    commitSha,
    sourceRef: process.env.GITHUB_REF || null,
    createdAt: new Date().toISOString(),
    applicationId,
    versionCode,
    versionName,
    certificateSha256: expectedCertificate,
    apk: { filename: apkFilename, ...(await fileMetadata(copiedApk)) },
    aab: { filename: aabFilename, ...(await fileMetadata(copiedAab)) }
  };
  await writeFile(
    path.join(output, "metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8"
  );
  console.log(JSON.stringify(metadata));
  return metadata;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyAndroidReleaseArtifacts({
    apkPath: argument("apk", defaultApk),
    aabPath: argument("aab", defaultAab),
    outputPath: argument("output", defaultOutput),
    expectedCertificateSha256: argument(
      "expected-certificate-sha256",
      process.env.NEXT2048_RELEASE_CERT_SHA256
    )
  }).catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}

export {
  normalizeCertificateSha256,
  parseAabCertificateSha256,
  parseApkCertificateSha256,
  resolveCommitSha,
  verifyAndroidReleaseArtifacts
};
