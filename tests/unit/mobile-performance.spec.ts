import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { summarizeDebugFrameSample } from "../../mobile/src/performance/debug-frame-sampler";

describe("mobile performance instrumentation", () => {
  it("summarizes debug RAF samples without rounding a 120 Hz stream down to 60", () => {
    const timestamps = Array.from({ length: 121 }, (_, index) => index * (1_000 / 120));
    const arrayAt = Array.prototype.at;
    const sample = (() => {
      Reflect.deleteProperty(Array.prototype, "at");
      try {
        return summarizeDebugFrameSample(timestamps);
      } finally {
        Object.defineProperty(Array.prototype, "at", {
          configurable: true,
          writable: true,
          value: arrayAt,
        });
      }
    })();
    expect(sample).toMatchObject({
      frameCount: 121,
      effectiveFps: 120,
      medianIntervalMs: 8.33,
    });
  });

  it("keeps the RAF sampler in development and Android debug builds", () => {
    const source = readFileSync("mobile/src/main.ts", "utf8");
    expect(source).toContain(
      'if (import.meta.env.DEV || import.meta.env.MODE === "android-debug")',
    );
    expect(source).toContain('import("./performance/debug-frame-sampler")');
  });

  it("keeps cloud data, replay, and export features out of the static entry graph", () => {
    const main = readFileSync("mobile/src/main.ts", "utf8");
    const controller = readFileSync("mobile/src/app/app-controller.ts", "utf8");
    expect(main).toContain('import("./data/mobile-cloud-data")');
    expect(main).toContain('import("./platform/replay-share")');
    expect(main).toMatch(/import\(\s*"\.\/platform\/diagnostic-export"\s*\)/u);
    expect(main).not.toContain(
      'import { MobileCloudData } from "./data/mobile-cloud-data"',
    );
    expect(controller).toContain('import("../game/replay-timeline")');
    expect(controller).not.toMatch(
      /import\s*\{[^}]*buildReplayTimeline[^}]*\}\s*from\s*"\.\.\/game\/replay-timeline"/su,
    );
  });
});
