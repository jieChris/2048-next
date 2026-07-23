import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageManifest = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8")
) as { scripts?: Record<string, string> };

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function compact(value: string): string {
  return value.replace(/\s+/gu, " ");
}

describe("Android native foundation", () => {
  it("commits the controlled Gradle wrapper and Android module", () => {
    expect(existsSync(resolve(root, "android/gradlew"))).toBe(true);
    expect(existsSync(resolve(root, "android/gradlew.bat"))).toBe(true);
    expect(
      existsSync(resolve(root, "android/gradle/wrapper/gradle-wrapper.jar"))
    ).toBe(true);
    expect(
      readProjectFile("android/gradle/wrapper/gradle-wrapper.properties")
    ).toMatch(/distributionUrl=.*gradle-8\.14\.3-(?:bin|all)\.zip/u);
    expect(readProjectFile("android/settings.gradle")).toContain(
      "include ':app'"
    );
    expect(readProjectFile("android/build.gradle")).toContain(
      "com.android.tools.build:gradle:8.13.0"
    );
  });

  it("uses Android 10 as the floor and SDK 36 for compile and target", () => {
    const variables = readProjectFile("android/variables.gradle");

    expect(variables).toMatch(/minSdkVersion\s*=\s*29\b/u);
    expect(variables).toMatch(/compileSdkVersion\s*=\s*36\b/u);
    expect(variables).toMatch(/targetSdkVersion\s*=\s*36\b/u);
    expect(variables).toMatch(/buildToolsVersion\s*=\s*['"]36\.0\.0['"]/u);
  });

  it("keeps release and debug identities and data spaces separate", () => {
    const appGradle = compact(readProjectFile("android/app/build.gradle"));
    const releaseStrings = readProjectFile(
      "android/app/src/main/res/values/strings.xml"
    );
    const debugStrings = readProjectFile(
      "android/app/src/debug/res/values/strings.xml"
    );

    expect(appGradle).toMatch(
      /namespace\s*(?:=\s*)?["']cn\.next2048\.app["']/u
    );
    expect(appGradle).toMatch(/applicationId\s+["']cn\.next2048\.app["']/u);
    expect(appGradle).toMatch(
      /debug\s*\{[^}]*applicationIdSuffix\s+["']\.debug["'][^}]*versionNameSuffix\s+["']-debug["']/u
    );
    expect(appGradle).not.toContain("productFlavors");
    expect(releaseStrings).toContain(
      '<string name="app_name">2048 NEXT</string>'
    );
    expect(debugStrings).toContain(
      '<string name="app_name">2048 NEXT Dev</string>'
    );
    expect(debugStrings).toContain(
      '<string name="title_activity_main">2048 NEXT Dev</string>'
    );
  });

  it("locks the activity to portrait with hardware acceleration", () => {
    const manifest = compact(
      readProjectFile("android/app/src/main/AndroidManifest.xml")
    );

    expect(manifest).toMatch(/<application\b[^>]*android:hardwareAccelerated="true"/u);
    expect(manifest).toMatch(/<application\b[^>]*android:usesCleartextTraffic="false"/u);
    expect(manifest).toMatch(/<application\b[^>]*android:allowBackup="false"/u);
    expect(manifest).toMatch(/<activity\b[^>]*android:screenOrientation="portrait"/u);
  });

  it("allows local cleartext only in the debug manifest overlay", () => {
    const debugManifest = compact(
      readProjectFile("android/app/src/debug/AndroidManifest.xml")
    );

    expect(debugManifest).toMatch(
      /<application\b[^>]*android:usesCleartextTraffic="true"/u
    );
  });

  it("enables WebView debugging from BuildConfig.DEBUG instead of release config", () => {
    const activityPath = [
      "android/app/src/main/java/cn/next2048/app/MainActivity.java",
      "android/app/src/main/kotlin/cn/next2048/app/MainActivity.kt"
    ].find((candidate) => existsSync(resolve(root, candidate)));

    expect(activityPath).toBeDefined();
    const activity = readProjectFile(activityPath ?? "missing-main-activity");
    expect(activity).toMatch(
      /WebView\.setWebContentsDebuggingEnabled\(BuildConfig\.DEBUG\)/u
    );
  });

  it("uses fitted insets before Android 15 and CSS insets from Android 15", () => {
    const activity = compact(
      readProjectFile("android/app/src/main/java/cn/next2048/app/MainActivity.java")
    );

    expect(activity).toMatch(
      /if \(Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.VANILLA_ICE_CREAM\) \{ return; \} try \{ config .*getPluginConfiguration\("SystemBars"\).*put\("insetsHandling", "disable"\)/u
    );
    expect(activity.indexOf("configureInsetsPolicy();")).toBeLessThan(
      activity.indexOf("super.onCreate(savedInstanceState);")
    );
  });

  it("declares only internet and vibration permissions", () => {
    const manifests = [
      readProjectFile("android/app/src/main/AndroidManifest.xml"),
      readProjectFile("android/app/src/debug/AndroidManifest.xml")
    ].join("\n");
    const permissions = [...manifests.matchAll(/<uses-permission\s+android:name="([^"]+)"/gu)]
      .map((match) => match[1])
      .sort();

    expect(permissions).toEqual([
      "android.permission.INTERNET",
      "android.permission.VIBRATE"
    ]);
  });

  it("shares only the dedicated replay cache subtree", () => {
    const filePaths = compact(
      readProjectFile("android/app/src/main/res/xml/file_paths.xml")
    );

    expect(filePaths).toContain(
      '<cache-path name="replay_share_cache" path="replay-share/" />'
    );
    expect(filePaths).not.toMatch(
      /external-path|external-cache-path|external-files-path|files-path/u
    );
    expect(filePaths.match(/<(?:cache-path)\b/gu)).toHaveLength(1);
  });

  it("contains no Google Services or Firebase wiring", () => {
    const gradleFiles = [
      readProjectFile("android/build.gradle"),
      readProjectFile("android/app/build.gradle")
    ].join("\n");

    expect(gradleFiles).not.toMatch(/google-services|firebase/iu);
  });

  it("requires explicit release signing and never falls back to the debug key", () => {
    const appGradle = compact(readProjectFile("android/app/build.gradle"));
    const requiredProperties = [
      "NEXT2048_RELEASE_STORE_FILE",
      "NEXT2048_RELEASE_STORE_PASSWORD",
      "NEXT2048_RELEASE_KEY_ALIAS",
      "NEXT2048_RELEASE_KEY_PASSWORD"
    ];

    for (const propertyName of requiredProperties) {
      expect(appGradle).toContain(propertyName);
    }
    expect(appGradle).toContain("Release signing configuration is required");
    expect(appGradle).toContain("gradle.taskGraph.whenReady");
    expect(appGradle).toContain("assembleRelease");
    expect(appGradle).toContain("bundleRelease");
    expect(appGradle).not.toContain("gradle.startParameter.taskNames");
    expect(appGradle).not.toMatch(
      /release\s*\{[^}]*signingConfig\s+signingConfigs\.debug/u
    );
  });

  it("rejects non-production mobile assets from every release packaging graph", () => {
    const appGradle = compact(readProjectFile("android/app/build.gradle"));

    expect(appGradle).toContain("groovy.json.JsonSlurper");
    expect(appGradle).toContain("mobile-build-flags.json");
    expect(appGradle).toContain("https://2048next.cn/api");
    expect(appGradle).toContain("Release packaging requires production mobile assets");
    expect(appGradle).toContain("verifyReleaseMobileAssets");
    expect(appGradle).toMatch(
      /releasePackagingRequested[^}]*verifyReleaseMobileAssets\(\)/u
    );
    expect(packageManifest.scripts?.["audit:android:release-assets"]).toContain(
      "android-release-assets-gate.mjs"
    );
    expect(packageManifest.scripts?.["android:check"]).toContain(
      "audit:android:release-assets"
    );
  });

  it("ignores local SDK, build and signing material without ignoring the wrapper", () => {
    const rootIgnore = readProjectFile(".gitignore");
    const androidIgnore = readProjectFile("android/.gitignore");

    expect(`${rootIgnore}\n${androidIgnore}`).toMatch(/local\.properties/u);
    expect(`${rootIgnore}\n${androidIgnore}`).toMatch(/\*\.jks/u);
    expect(`${rootIgnore}\n${androidIgnore}`).toMatch(/\*\.keystore/u);
    expect(`${rootIgnore}\n${androidIgnore}`).toMatch(/release-signing\.properties/u);
    expect(androidIgnore).toMatch(/\.gradle\//u);
    expect(androidIgnore).toMatch(/build\//u);
    expect(androidIgnore).not.toMatch(/gradle\/wrapper/u);
  });

  it("provides repeatable sync, native audit and Android check commands", () => {
    expect(packageManifest.scripts?.["android:sync"]).toBeUndefined();
    expect(packageManifest.scripts?.["android:sync:debug"]).toContain("cap sync android");
    expect(packageManifest.scripts?.["android:sync:release"]).toContain("cap sync android");
    expect(packageManifest.scripts?.["audit:android"]).toContain(
      "android-project-audit.mjs"
    );
    expect(packageManifest.scripts?.["android:check"]).toMatch(
      /:app:lintDebug.*:app:testDebugUnitTest.*:app:assembleDebug.*:app:assembleDebugAndroidTest.*:app:processReleaseMainManifest/u
    );
    expect(packageManifest.scripts?.["android:test:instrumented"]).toContain(
      ":app:connectedDebugAndroidTest"
    );
    expect(packageManifest.scripts?.["android:check"]).toContain(
      "audit:android:release-signing"
    );
    expect(packageManifest.scripts?.["android:check"]).toContain(
      "android:sync:debug"
    );
    expect(packageManifest.scripts?.["android:check"]).toContain(
      "android:sync:release"
    );
    expect(packageManifest.scripts?.["android:check"]).toContain(
      "test:unit:app:production"
    );
  });
});
