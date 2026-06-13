import { describe, expect, it } from "vitest";

import {
  applyResponsiveRelayout,
  createResponsiveRelayoutRuntime,
  installResponsiveRelayoutRuntime,
  resolveResponsiveRelayoutRequest,
  type ResponsiveRelayoutRuntime
} from "../../src/bootstrap/responsive-relayout";

describe("bootstrap responsive-relayout runtime", () => {
  it("creates the legacy CoreResponsiveRelayoutRuntime shape from TypeScript functions", () => {
    const runtime = createResponsiveRelayoutRuntime();

    expect(runtime.resolveResponsiveRelayoutRequest).toBe(resolveResponsiveRelayoutRequest);
    expect(runtime.applyResponsiveRelayout).toBe(applyResponsiveRelayout);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreResponsiveRelayoutRuntime?: ResponsiveRelayoutRuntime } = {};

    const installed = installResponsiveRelayoutRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreResponsiveRelayoutRuntime);
    expect(installed?.resolveResponsiveRelayoutRequest).toBeTypeOf("function");
    expect(installed?.applyResponsiveRelayout).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createResponsiveRelayoutRuntime();
    const windowLike = { CoreResponsiveRelayoutRuntime: existing };

    const installed = installResponsiveRelayoutRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreResponsiveRelayoutRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installResponsiveRelayoutRuntime({ windowLike: null })).toBeNull();
  });
});
