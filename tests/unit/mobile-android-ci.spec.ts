import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  boardChanged,
  parseActivityStartOutput,
} from "../../scripts/android-emulator-smoke.mjs";

describe("Android CI", () => {
  it("parses activity starts and detects a real board transition", () => {
    expect(
      parseActivityStartOutput("Status: ok\nLaunchState: COLD\nTotalTime: 636\n"),
    ).toEqual({ launchState: "COLD", totalTimeMs: 636 });
    expect(boardChanged([2, 0, 0, 2], [0, 0, 2, 4])).toBe(true);
    expect(boardChanged([2, 0], [2, 0])).toBe(false);
  });

  it("keeps Android gates independent from Web deployment", () => {
    const workflow = readFileSync(".github/workflows/android.yml", "utf8");
    expect(workflow).toContain("npm run verify:app");
    expect(workflow).toContain("npm run android:check");
    expect(workflow).toContain("git diff --exit-code -- android");
    expect(workflow).toContain("api-level: [29, 36]");
    expect(workflow).toContain("npm run android:smoke:emulator");
    expect(workflow).toContain("npm run android:smoke:upgrade");
    expect(workflow).toContain("android-upgrade-smoke-api-29.json");
    expect(workflow).not.toContain("deploy-self-hosted");
  });
});
