import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  adb,
  adbBinary,
  click,
  connectWebView,
  moveBoard,
  readBoard,
  startActivity,
  waitFor,
  waitForAppReady,
  waitForRoute,
} from "./android-emulator-smoke.mjs";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const androidRoot = path.join(projectRoot, "android");
const upgradeApk = path.join(
  androidRoot,
  "app/build/outputs/apk/upgradeTest/app-upgradeTest.apk",
);
const packageName = "cn.next2048.app.upgrade";
const activityName = "cn.next2048.app.MainActivity";
const secureKey = "upgrade.smoke";
const secureValue = "keystore-survives-upgrade";
const localStorageKey = "2048-next.upgrade-smoke-v1";
const baseVersionCode = 1_000_001;
const upgradeVersionCode = baseVersionCode + 1;
const wrongSignatureVersionCode = baseVersionCode + 2;

function parseArgs(argv) {
  const apiLevel = argv
    .find((value) => value.startsWith("--api-level="))
    ?.slice("--api-level=".length);
  return { apiLevel: apiLevel || "unknown" };
}

async function hostRun(file, args, options = {}) {
  try {
    return await execFileAsync(file, args, {
      cwd: options.cwd ?? projectRoot,
      encoding: "utf8",
      env: options.env ?? process.env,
      maxBuffer: 16 * 1024 * 1024,
      timeout: options.timeout ?? 300_000,
    });
  } catch (error) {
    const stdout = typeof error?.stdout === "string" ? error.stdout.trim() : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
    throw new Error(
      `${path.basename(file)} ${args.join(" ")} failed${stdout ? `\n${stdout}` : ""}${stderr ? `\n${stderr}` : ""}`,
      { cause: error },
    );
  }
}

async function runNpm(args) {
  if (process.env.npm_execpath) {
    return hostRun(process.execPath, [process.env.npm_execpath, ...args]);
  }
  return hostRun("npm", args);
}

function javaTool(name) {
  return process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, "bin", name)
    : name;
}

async function createTestKey(directory, alias) {
  const store = path.join(directory, `${alias}.p12`);
  const password = randomBytes(24).toString("hex");
  await hostRun(javaTool("keytool"), [
    "-genkeypair",
    "-storetype",
    "PKCS12",
    "-keystore",
    store,
    "-storepass",
    password,
    "-keypass",
    password,
    "-alias",
    alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "1",
    "-dname",
    `CN=2048 NEXT Upgrade Test ${alias},O=Local Verification,C=CN`,
  ]);
  return { store, password, alias };
}

async function buildUpgradeApk({ key, versionCode, versionName, destination }) {
  await hostRun(
    path.join(androidRoot, "gradlew"),
    ["--no-daemon", "--console=plain", ":app:assembleUpgradeTest"],
    {
      cwd: androidRoot,
      env: {
        ...process.env,
        ORG_GRADLE_PROJECT_NEXT2048_RELEASE_STORE_FILE: key.store,
        ORG_GRADLE_PROJECT_NEXT2048_RELEASE_STORE_PASSWORD: key.password,
        ORG_GRADLE_PROJECT_NEXT2048_RELEASE_KEY_ALIAS: key.alias,
        ORG_GRADLE_PROJECT_NEXT2048_RELEASE_KEY_PASSWORD: key.password,
        ORG_GRADLE_PROJECT_NEXT2048_VERSION_CODE: String(versionCode),
        ORG_GRADLE_PROJECT_NEXT2048_VERSION_NAME: versionName,
      },
    },
  );
  await copyFile(upgradeApk, destination);
}

async function setUpgradeSentinels(session) {
  const stored = await session.client.evaluate(`(async () => {
    const plugin = globalThis.Capacitor?.Plugins?.Next2048SecureStorage;
    if (!plugin) return false;
    await plugin.set({ key: ${JSON.stringify(secureKey)}, value: ${JSON.stringify(secureValue)} });
    localStorage.setItem(${JSON.stringify(localStorageKey)}, "web-storage-survives-upgrade");
    return true;
  })()`);
  assert.equal(stored, true, "android_upgrade_secure_storage_plugin_unavailable");
}

async function readUpgradeSentinels(session) {
  return session.client.evaluate(`(async () => {
    const plugin = globalThis.Capacitor?.Plugins?.Next2048SecureStorage;
    if (!plugin) return null;
    const secure = await plugin.get({ key: ${JSON.stringify(secureKey)} });
    return {
      secure: secure.value,
      local: localStorage.getItem(${JSON.stringify(localStorageKey)}),
    };
  })()`);
}

function isSignatureMismatchInstallOutput(output) {
  return /INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match/iu.test(
    String(output || ""),
  );
}

function parseInstalledVersionCode(output) {
  const value = Number.parseInt(/versionCode=(\d+)/u.exec(output)?.[1] ?? "", 10);
  if (!Number.isSafeInteger(value)) throw new Error("android_upgrade_missing_version_code");
  return value;
}

async function installExpectingSignatureMismatch(apk) {
  try {
    await execFileAsync(adbBinary(), ["install", "-r", apk], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
    });
  } catch (error) {
    const output = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`;
    if (isSignatureMismatchInstallOutput(output)) return output.trim();
    throw error;
  }
  throw new Error("android_upgrade_wrong_signature_unexpectedly_installed");
}

async function fileMetadata(file) {
  const bytes = await readFile(file);
  return {
    bytes: (await stat(file)).size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function sourceState() {
  const [head, status] = await Promise.all([
    hostRun("git", ["rev-parse", "HEAD"]),
    hostRun("git", ["status", "--porcelain", "--untracked-files=no"]),
  ]);
  return {
    commitSha: head.stdout.trim(),
    trackedWorktreeClean: status.stdout.trim() === "",
  };
}

function reportPath(apiLevel) {
  return path.resolve(
    "artifacts",
    `android-upgrade-smoke-api-${apiLevel}.json`,
  );
}

async function writeReport(apiLevel, report) {
  const output = reportPath(apiLevel);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  return output;
}

async function runUpgradeRehearsal({ apiLevel }) {
  const temporary = await mkdtemp(path.join(tmpdir(), "next2048-upgrade-"));
  const baseApk = path.join(temporary, "base.apk");
  const upgradedApk = path.join(temporary, "upgrade.apk");
  const wrongApk = path.join(temporary, "wrong-signature.apk");
  let session;
  try {
    await runNpm(["run", "android:sync:release"]);
    const matchingKey = await createTestKey(temporary, "matching-key");
    const wrongKey = await createTestKey(temporary, "wrong-key");
    await buildUpgradeApk({
      key: matchingKey,
      versionCode: baseVersionCode,
      versionName: "upgrade-smoke-base",
      destination: baseApk,
    });
    await buildUpgradeApk({
      key: matchingKey,
      versionCode: upgradeVersionCode,
      versionName: "upgrade-smoke-next",
      destination: upgradedApk,
    });
    await buildUpgradeApk({
      key: wrongKey,
      versionCode: wrongSignatureVersionCode,
      versionName: "upgrade-smoke-wrong",
      destination: wrongApk,
    });

    const actualApiLevel = await adb("shell", "getprop", "ro.build.version.sdk");
    if (/^\d+$/u.test(apiLevel)) assert.equal(actualApiLevel, apiLevel);
    const device = {
      apiLevel: actualApiLevel,
      androidVersion: await adb("shell", "getprop", "ro.build.version.release"),
      model: await adb("shell", "getprop", "ro.product.model"),
    };

    await adb("uninstall", packageName).catch(() => undefined);
    await adb("install", "-r", baseApk);
    await adb("shell", "pm", "clear", packageName);
    await adb("shell", "am", "force-stop", packageName);
    await startActivity(packageName, activityName);
    session = await connectWebView(packageName);
    await waitForRoute(session, "privacy");
    await waitForAppReady(session);
    await click(session, "[data-consent='offline']");
    await waitForRoute(session, "home");
    await click(session, "[data-home-primary]");
    await waitForRoute(session, "game");
    const initialBoard = await waitFor(() => readBoard(session), "upgrade-initial-board");
    const movedBoard = await moveBoard(session, initialBoard);
    await setUpgradeSentinels(session);
    await adb("shell", "input", "keyevent", "4");
    await waitForRoute(session, "home");
    await session.close();
    session = undefined;
    await adb("shell", "am", "force-stop", packageName);

    await adb("install", "-r", upgradedApk);
    await startActivity(packageName, activityName);
    session = await connectWebView(packageName);
    await waitForRoute(session, "home");
    await waitForAppReady(session);
    const sentinels = await readUpgradeSentinels(session);
    assert.deepEqual(sentinels, {
      secure: secureValue,
      local: "web-storage-survives-upgrade",
    });
    await click(session, "[data-home-primary]");
    await waitForRoute(session, "game");
    const restoredBoard = await readBoard(session);
    assert.deepEqual(
      restoredBoard?.values,
      movedBoard.values,
      "android_upgrade_changed_indexeddb_save",
    );
    await session.close();
    session = undefined;

    const wrongSignatureFailure = await installExpectingSignatureMismatch(wrongApk);
    const installedVersionCode = parseInstalledVersionCode(
      await adb("shell", "dumpsys", "package", packageName),
    );
    assert.equal(installedVersionCode, upgradeVersionCode);

    const report = {
      success: true,
      apiLevel,
      device,
      source: await sourceState(),
      packageName,
      baseVersionCode,
      upgradeVersionCode,
      wrongSignatureVersionCode,
      installedVersionCode,
      indexedDbSavePreserved: true,
      secureStoragePreserved: true,
      localStoragePreserved: true,
      wrongSignatureRejected: true,
      wrongSignatureFailure,
      movedBoard: movedBoard.values,
      baseApk: await fileMetadata(baseApk),
      upgradedApk: await fileMetadata(upgradedApk),
      wrongSignatureApk: await fileMetadata(wrongApk),
    };
    const output = await writeReport(apiLevel, report);
    console.log(`[android-upgrade-rehearsal] PASS api=${apiLevel} report=${output}`);
    return report;
  } finally {
    await session?.close().catch(() => undefined);
    await adb("uninstall", packageName).catch(() => undefined);
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  runUpgradeRehearsal(options).catch(async (error) => {
    const output = await writeReport(options.apiLevel, {
      success: false,
      apiLevel: options.apiLevel,
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
    console.error(`[android-upgrade-rehearsal] FAIL api=${options.apiLevel} report=${output}`);
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}

export {
  isSignatureMismatchInstallOutput,
  parseInstalledVersionCode,
  runUpgradeRehearsal,
};
