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
  "@capacitor/share",
  "@capacitor/status-bar"
]);
const APPROVED_PERMISSIONS = Object.freeze([
  "android.permission.INTERNET"
]);
const DYNAMIC_RECEIVER_PERMISSION_SUFFIX =
  ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION";

function invariant(condition, message) {
  if (!condition) throw new Error(`[android-project-audit] ${message}`);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function stripJavaComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/(^|[^:])\/\/.*$/gmu, "$1");
}

function assertSecureStorageSource({
  mainActivity,
  secureStorage,
  secureStoragePlugin
}) {
  const activityCode = stripJavaComments(mainActivity);
  const storageCode = stripJavaComments(secureStorage);
  const pluginCode = stripJavaComments(secureStoragePlugin);

  invariant(
    /\bregisterPlugin\s*\(\s*Next2048SecureStoragePlugin\.class\s*\)\s*;/u.test(activityCode),
    "the native secure-storage plugin must be registered explicitly"
  );
  const requiredStoragePatterns = [
    /KEYSTORE_PROVIDER\s*=\s*"AndroidKeyStore"\s*;/u,
    /CIPHER_TRANSFORMATION\s*=\s*"AES\/GCM\/NoPadding"\s*;/u,
    /getSharedPreferences\s*\(\s*PREFERENCES_NAME\s*,\s*Context\.MODE_PRIVATE\s*\)/u,
    /KeyGenerator\.getInstance\s*\(\s*KeyProperties\.KEY_ALGORITHM_AES\s*,\s*KEYSTORE_PROVIDER\s*\)/u,
    /Cipher\.getInstance\s*\(\s*CIPHER_TRANSFORMATION\s*\)/u,
    /setRandomizedEncryptionRequired\s*\(\s*true\s*\)/u,
    /setKeySize\s*\(\s*AES_KEY_BITS\s*\)/u
  ];
  for (const pattern of requiredStoragePatterns) {
    invariant(
      pattern.test(storageCode),
      `secure-storage implementation is missing ${pattern}`
    );
  }
  invariant(
    (storageCode.match(/cipher\.updateAAD\s*\(\s*aadFor\s*\(\s*key\s*\)\s*\)\s*;/gu) ?? []).length >= 2,
    "secure storage must bind both encryption and decryption to the logical key with AAD"
  );

  const requiredPluginPatterns = [
    /@CapacitorPlugin\s*\(\s*name\s*=\s*"Next2048SecureStorage"\s*\)/u,
    /storage\s*=\s*new\s+SecureStorage\s*\(\s*getContext\s*\(\s*\)\s*\)\s*;/u,
    /storage\.get\s*\(\s*call\.getString\s*\(\s*"key"\s*\)\s*\)/u,
    /storage\.set\s*\(\s*call\.getString\s*\(\s*"key"\s*\)\s*,\s*call\.getString\s*\(\s*"value"\s*\)\s*\)/u,
    /storage\.delete\s*\(\s*call\.getString\s*\(\s*"key"\s*\)\s*\)/u
  ];
  for (const pattern of requiredPluginPatterns) {
    invariant(
      pattern.test(pluginCode),
      `secure-storage plugin is missing ${pattern}`
    );
  }
  invariant(
    (pluginCode.match(/@PluginMethod\b/gu) ?? []).length === 3,
    "secure-storage plugin must expose exactly get/set/delete"
  );
  invariant(
    !/\b(?:SharedPreferences|getSharedPreferences|Log\.)\b/u.test(pluginCode),
    "secure-storage plugin must delegate persistence without a plaintext side channel"
  );
}

function assertSystemHapticsSource({ mainActivity, systemHapticsPlugin }) {
  const activityCode = stripJavaComments(mainActivity);
  const pluginCode = stripJavaComments(systemHapticsPlugin);
  invariant(
    /\bregisterPlugin\s*\(\s*Next2048SystemHapticsPlugin\.class\s*\)\s*;/u.test(activityCode),
    "the system-haptics plugin must be registered explicitly"
  );
  invariant(
    /@CapacitorPlugin\s*\(\s*name\s*=\s*"Next2048SystemHaptics"\s*\)/u.test(pluginCode),
    "the system-haptics plugin name drifted"
  );
  invariant(
    (pluginCode.match(/@PluginMethod\b/gu) ?? []).length === 1,
    "the system-haptics plugin must expose only impact"
  );
  invariant(
    /performHapticFeedback\s*\(\s*feedback\s*\)/u.test(pluginCode),
    "system haptics must use the Android view feedback path"
  );
  invariant(
    !/FLAG_IGNORE_GLOBAL_SETTING|\bVibrator(?:Manager)?\b|VibrationEffect/u.test(pluginCode),
    "system haptics must respect the Android global feedback setting"
  );
  for (const kind of ["merge", "milestone", "finish"]) {
    invariant(pluginCode.includes(`"${kind}"`), `system haptics is missing ${kind}`);
  }
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
  invariant(
    generatedConfig.android?.loggingBehavior === "none",
    "generated config must disable Capacitor logging so plugin arguments cannot reach logcat"
  );
  invariant(
    generatedConfig.plugins?.SystemBars?.insetsHandling === "css",
    "generated config must keep SystemBars CSS inset handling enabled"
  );
  invariant(
    generatedConfig.plugins?.StatusBar?.overlaysWebView === false,
    "generated config must keep the legacy status bar outside the WebView"
  );

  const generatedPlugins = await readJson(
    path.join(generatedAssets, "capacitor.plugins.json")
  );
  assertExactValues(
    generatedPlugins.map((plugin) => plugin.pkg),
    APPROVED_PLUGINS,
    "Capacitor plugin set"
  );

  const mainActivity = await readFile(
    path.join(rootDir, "android", "app", "src", "main", "java", "cn", "next2048", "app", "MainActivity.java"),
    "utf8"
  );
  const secureStorage = await readFile(
    path.join(rootDir, "android", "app", "src", "main", "java", "cn", "next2048", "app", "SecureStorage.java"),
    "utf8"
  );
  const secureStoragePlugin = await readFile(
    path.join(rootDir, "android", "app", "src", "main", "java", "cn", "next2048", "app", "Next2048SecureStoragePlugin.java"),
    "utf8"
  );
  assertSecureStorageSource({
    mainActivity,
    secureStorage,
    secureStoragePlugin
  });
  const systemHapticsPlugin = await readFile(
    path.join(rootDir, "android", "app", "src", "main", "java", "cn", "next2048", "app", "Next2048SystemHapticsPlugin.java"),
    "utf8"
  );
  assertSystemHapticsSource({ mainActivity, systemHapticsPlugin });

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
  assertSecureStorageSource,
  assertSystemHapticsSource,
  auditAndroidProject,
  resolveApkAnalyzer,
  runAndroidProjectAudit,
  sortedUnique,
  stripJavaComments
};
