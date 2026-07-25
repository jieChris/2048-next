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
});
