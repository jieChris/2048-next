import { describe, expect, it } from "vitest";

import {
  createPrettyTimeRuntime,
  formatPrettyTime,
  installPrettyTimeRuntime,
  type PrettyTimeRuntime
} from "../../src/bootstrap/pretty-time";

describe("bootstrap pretty-time runtime", () => {
  it("creates the legacy CorePrettyTimeRuntime shape from TypeScript functions", () => {
    const runtime = createPrettyTimeRuntime();

    expect(runtime.formatPrettyTime).toBe(formatPrettyTime);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CorePrettyTimeRuntime?: PrettyTimeRuntime } = {};

    const installed = installPrettyTimeRuntime({ windowLike });

    expect(installed).toBe(windowLike.CorePrettyTimeRuntime);
    expect(installed?.formatPrettyTime).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createPrettyTimeRuntime();
    const windowLike = { CorePrettyTimeRuntime: existing };

    const installed = installPrettyTimeRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CorePrettyTimeRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installPrettyTimeRuntime({ windowLike: null })).toBeNull();
  });
});
