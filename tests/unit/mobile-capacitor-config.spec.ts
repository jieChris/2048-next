import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import capacitorConfig from "../../capacitor.config";
import {
  MOBILE_PRODUCTION_API_BASE,
  resolveMobileBuildFlags,
} from "../../mobile/src/app/build-flags-contract";

interface PackageManifest {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const packageManifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8")
) as PackageManifest;
const mobileTokens = readFileSync(
  resolve(process.cwd(), "mobile/src/styles/tokens.css"),
  "utf8"
);
const mobileMain = readFileSync(
  resolve(process.cwd(), "mobile/src/main.ts"),
  "utf8"
);

const approvedCapacitorPackages = [
  "@capacitor/android",
  "@capacitor/app",
  "@capacitor/cli",
  "@capacitor/core",
  "@capacitor/filesystem",
  "@capacitor/share",
  "@capacitor/status-bar"
] as const;

const approvedCapacitorVersions: Record<
  (typeof approvedCapacitorPackages)[number],
  string
> = {
  "@capacitor/android": "8.4.2",
  "@capacitor/app": "8.1.1",
  "@capacitor/cli": "8.4.2",
  "@capacitor/core": "8.4.2",
  "@capacitor/filesystem": "8.1.2",
  "@capacitor/share": "8.0.1",
  "@capacitor/status-bar": "8.0.3"
};

describe("mobile Capacitor configuration", () => {
  it("pins only the approved Capacitor 8 runtime and official plugins", () => {
    const allDependencies = {
      ...packageManifest.dependencies,
      ...packageManifest.devDependencies
    };
    const installedCapacitorPackages = Object.keys(allDependencies)
      .filter((packageName) => packageName.startsWith("@capacitor/"))
      .sort();

    expect(installedCapacitorPackages).toEqual([...approvedCapacitorPackages]);
    for (const packageName of approvedCapacitorPackages) {
      expect(allDependencies[packageName], packageName).toBe(
        approvedCapacitorVersions[packageName]
      );
    }
    expect(packageManifest.devDependencies?.["@capacitor/cli"]).toMatch(
      /^8\.\d+\.\d+$/u
    );
    expect(packageManifest.dependencies?.["@capacitor/core"]).toMatch(
      /^8\.\d+\.\d+$/u
    );
  });

  it("packages the local mobile build under the permanent Android identity", () => {
    expect(capacitorConfig).toMatchObject({
      appId: "cn.next2048.app",
      appName: "2048 NEXT",
      webDir: "dist-app",
      android: {
        allowMixedContent: false,
        useLegacyBridge: false,
        loggingBehavior: "none"
      },
      plugins: {
        SystemBars: {
          insetsHandling: "css"
        },
        StatusBar: {
          overlaysWebView: false,
          style: "LIGHT",
          backgroundColor: "#f3ede1"
        }
      }
    });
    expect(mobileMain).toContain("StatusBar.setBackgroundColor");
    expect(mobileMain).toContain("theme === \"dark\" ? Style.Dark : Style.Light");
  });

  it("consumes Capacitor safe-area values with browser env fallbacks", () => {
    for (const edge of ["top", "right", "bottom", "left"]) {
      expect(mobileTokens).toContain(
        `--safe-area-${edge}: var(--safe-area-inset-${edge}, env(safe-area-inset-${edge}, 0px));`
      );
    }
  });

  it("cannot load a remote site as the application shell", () => {
    expect(capacitorConfig).not.toHaveProperty("server");
  });

  it("keeps loopback HTTP out of the production-like App build mode", () => {
    expect(packageManifest.scripts?.["build:app"]).not.toContain(
      "--mode android-debug",
    );
    expect(packageManifest.scripts?.["build:app:android-debug"]).toContain(
      "--mode android-debug",
    );
    expect(packageManifest.scripts?.["android:sync"]).toBeUndefined();
    expect(packageManifest.scripts?.["android:sync:debug"]).toContain(
      "android-build-mode-audit.mjs android-debug",
    );
    expect(packageManifest.scripts?.["android:sync:release"]).toContain(
      "android-build-mode-audit.mjs production",
    );
    expect(resolveMobileBuildFlags("production")).toEqual({
      apiBase: MOBILE_PRODUCTION_API_BASE,
      allowApiBaseOverride: false,
      allowDebugLoopbackHttp: false,
    });
  });
});
