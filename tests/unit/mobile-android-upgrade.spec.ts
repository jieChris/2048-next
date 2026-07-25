import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  isSignatureMismatchInstallOutput,
  parseInstalledVersionCode,
} from "../../scripts/android-upgrade-rehearsal.mjs";

describe("Android upgrade rehearsal", () => {
  it("recognizes signer rejection and the surviving installed version", () => {
    expect(
      isSignatureMismatchInstallOutput(
        "Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package signatures do not match]",
      ),
    ).toBe(true);
    expect(parseInstalledVersionCode("versionCode=1000002 minSdk=29")).toBe(
      1_000_002,
    );
  });

  it("keeps the rehearsal on an isolated package with production assets", () => {
    const source = readFileSync(
      "scripts/android-upgrade-rehearsal.mjs",
      "utf8",
    );
    expect(source).toContain('"cn.next2048.app.upgrade"');
    expect(source).toContain('"android:sync:release"');
    expect(source).toContain(":app:assembleUpgradeTest");
    expect(source).toContain("Next2048SecureStorage");
    expect(source).toContain("android_upgrade_changed_indexeddb_save");
    expect(source).toContain("trackedWorktreeClean");
  });
});
