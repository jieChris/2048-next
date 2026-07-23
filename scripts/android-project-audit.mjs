import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditMobileBoundary } from "./mobile-boundary-audit.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const APPROVED_PLUGINS = Object.freeze([
  "@capacitor/app",
  "@capacitor/filesystem",
  "@capacitor/haptics",
  "@capacitor/share",
  "@capacitor/status-bar"
]);
const APPROVED_PERMISSIONS = Object.freeze([
  "android.permission.INTERNET",
  "android.permission.VIBRATE"
]);
const DYNAMIC_RECEIVER_PERMISSION_SUFFIX =
  ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION";

function invariant(condition, message) {
  if (!condition) throw new Error(`[android-project-audit] ${message}`);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function assertExactValues(actual, expected, label) {
  const normalizedActual = sortedUnique(actual);
  const normalizedExpected = sortedUnique(expected);
  invariant(
    JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected),
    `${label} mismatch; expected=${normalizedExpected.join(",")}, actual=${normalizedActual.join(",")}`
  );
}

function extractUsesPermissions(manifest) {
  return [...manifest.matchAll(/<uses-permission\b[^>]*android:name="([^"]+)"[^>]*>/gu)]
    .map((match) => match[1]);
}

function assertPermissionBoundary({ manifest, applicationId, label }) {
  const usesPermissions = extractUsesPermissions(manifest);
  const platformPermissions = usesPermissions.filter((permission) =>
    permission.startsWith("android.permission.")
  );
  const customPermissions = usesPermissions.filter(
    (permission) => !permission.startsWith("android.permission.")
  );
  const expectedCustomPermission =
    `${applicationId}${DYNAMIC_RECEIVER_PERMISSION_SUFFIX}`;

  assertExactValues(
    platformPermissions,
    APPROVED_PERMISSIONS,
    `${label} platform permissions`
  );
  assertExactValues(
    customPermissions,
    [expectedCustomPermission],
    `${label} custom permissions`
  );

  const escapedPermission = expectedCustomPermission.replace(
    /[.*+?^${}()|[\]\\]/gu,
    "\\$&"
  );
  const declarationPattern = new RegExp(
    `<permission\\b(?=[^>]*android:name="${escapedPermission}")(?=[^>]*android:protectionLevel="(?:signature|0x2)")[^>]*>`,
    "u"
  );
  invariant(
    declarationPattern.test(manifest),
    `${label} dynamic receiver permission must be app-scoped and signature protected`
  );

  return {
    platformPermissions: sortedUnique(platformPermissions),
    customPermission: expectedCustomPermission
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function requireFile(filePath) {
  await access(filePath);
  return filePath;
}

function resolveApkAnalyzer(environment = process.env) {
  const sdkRoot =
    environment.ANDROID_SDK_ROOT ||
    environment.ANDROID_HOME ||
    path.join(os.homedir(), "Library", "Android", "sdk");
  return path.join(sdkRoot, "cmdline-tools", "latest", "bin", "apkanalyzer");
}

function runApkAnalyzer(apkAnalyzer, apkPath, subject, verb) {
  return execFileSync(apkAnalyzer, [subject, verb, apkPath], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
  }).trim();
}

async function auditAndroidProject({
  rootDir = projectRoot,
  apkPath = path.join(
    rootDir,
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "debug",
    "app-debug.apk"
  ),
  environment = process.env
} = {}) {
  const generatedAssets = path.join(
    rootDir,
    "android",
    "app",
    "src",
    "main",
    "assets"
  );
  const generatedConfig = await readJson(
    path.join(generatedAssets, "capacitor.config.json")
  );
  invariant(generatedConfig.appId === "cn.next2048.app", "generated appId drifted");
  invariant(generatedConfig.appName === "2048 NEXT", "generated appName drifted");
  invariant(generatedConfig.webDir === "dist-app", "generated webDir drifted");
  invariant(!Object.hasOwn(generatedConfig, "server"), "generated config contains a remote server block");
  invariant(
    generatedConfig.android?.allowMixedContent === false,
    "generated config must keep mixed content disabled"
  );
  invariant(
    generatedConfig.android?.useLegacyBridge === false,
    "generated config must keep the legacy bridge disabled"
  );

  const generatedPlugins = await readJson(
    path.join(generatedAssets, "capacitor.plugins.json")
  );
  assertExactValues(
    generatedPlugins.map((plugin) => plugin.pkg),
    APPROVED_PLUGINS,
    "Capacitor plugin set"
  );

  const copiedWebAudit = await auditMobileBoundary({
    mobileDir: path.join(rootDir, "mobile"),
    distDir: path.join(generatedAssets, "public")
  });

  const apkAnalyzer = await requireFile(resolveApkAnalyzer(environment));
  await requireFile(apkPath);

  const applicationId = runApkAnalyzer(
    apkAnalyzer,
    apkPath,
    "manifest",
    "application-id"
  );
  const minSdk = runApkAnalyzer(apkAnalyzer, apkPath, "manifest", "min-sdk");
  const targetSdk = runApkAnalyzer(
    apkAnalyzer,
    apkPath,
    "manifest",
    "target-sdk"
  );
  const debuggable = runApkAnalyzer(
    apkAnalyzer,
    apkPath,
    "manifest",
    "debuggable"
  );
  const permissions = runApkAnalyzer(
    apkAnalyzer,
    apkPath,
    "manifest",
    "permissions"
  )
    .split(/\r?\n/u)
    .map((permission) => permission.trim())
    .filter(Boolean);
  const mergedManifest = runApkAnalyzer(
    apkAnalyzer,
    apkPath,
    "manifest",
    "print"
  );

  invariant(
    applicationId === "cn.next2048.app.debug",
    `debug applicationId mismatch: ${applicationId}`
  );
  invariant(minSdk === "29", `debug minSdk mismatch: ${minSdk}`);
  invariant(targetSdk === "36", `debug targetSdk mismatch: ${targetSdk}`);
  invariant(debuggable === "true", "debug APK must be debuggable");
  const debugPermissionBoundary = assertPermissionBoundary({
    manifest: mergedManifest,
    applicationId,
    label: "debug APK"
  });
  assertExactValues(
    permissions,
    [
      ...APPROVED_PERMISSIONS,
      debugPermissionBoundary.customPermission
    ],
    "apkanalyzer permission output"
  );
  invariant(
    /android:allowBackup="false"/u.test(mergedManifest),
    "merged APK must disable Android backup"
  );
  invariant(
    /android:hardwareAccelerated="true"/u.test(mergedManifest),
    "merged APK must enable hardware acceleration"
  );
  invariant(
    /android:usesCleartextTraffic="true"/u.test(mergedManifest),
    "debug APK must explicitly allow local cleartext traffic"
  );
  invariant(
    /android:screenOrientation="(?:portrait|1)"/u.test(mergedManifest),
    "merged APK activity must stay portrait"
  );

  const releaseManifestPath = path.join(
    rootDir,
    "android",
    "app",
    "build",
    "intermediates",
    "merged_manifest",
    "release",
    "processReleaseMainManifest",
    "AndroidManifest.xml"
  );
  const releaseManifest = await readFile(
    await requireFile(releaseManifestPath),
    "utf8"
  );
  const releasePermissionBoundary = assertPermissionBoundary({
    manifest: releaseManifest,
    applicationId: "cn.next2048.app",
    label: "release merged manifest"
  });
  invariant(
    /android:allowBackup="false"/u.test(releaseManifest),
    "release merged manifest must disable Android backup"
  );
  invariant(
    /android:hardwareAccelerated="true"/u.test(releaseManifest),
    "release merged manifest must enable hardware acceleration"
  );
  invariant(
    /android:usesCleartextTraffic="false"/u.test(releaseManifest),
    "release merged manifest must reject cleartext traffic"
  );
  invariant(
    /android:screenOrientation="portrait"/u.test(releaseManifest),
    "release merged manifest activity must stay portrait"
  );
  invariant(
    !/android:debuggable="true"/u.test(releaseManifest),
    "release merged manifest must not be debuggable"
  );

  return {
    applicationId,
    minSdk,
    targetSdk,
    permissions: debugPermissionBoundary.platformPermissions,
    debugCustomPermission: debugPermissionBoundary.customPermission,
    releaseCustomPermission: releasePermissionBoundary.customPermission,
    pluginCount: APPROVED_PLUGINS.length,
    copiedWebFileCount: copiedWebAudit.distFileCount,
    apkPath
  };
}

async function runAndroidProjectAudit(options = {}) {
  const result = await auditAndroidProject(options);
  console.log(
    `[android-project-audit] PASS: ${result.applicationId} min=${result.minSdk} target=${result.targetSdk} permissions=${result.permissions.join(",")} plugins=${result.pluginCount} webFiles=${result.copiedWebFileCount}`
  );
  return result;
}

function isDirectCliExecution() {
  return Boolean(
    process.argv[1] && path.resolve(process.argv[1]) === __filename
  );
}

if (isDirectCliExecution()) {
  runAndroidProjectAudit().catch((error) => {
    console.error(
      `[android-project-audit] FAIL: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  });
}

export {
  APPROVED_PERMISSIONS,
  APPROVED_PLUGINS,
  DYNAMIC_RECEIVER_PERMISSION_SUFFIX,
  assertExactValues,
  assertPermissionBoundary,
  auditAndroidProject,
  resolveApkAnalyzer,
  runAndroidProjectAudit,
  sortedUnique
};
