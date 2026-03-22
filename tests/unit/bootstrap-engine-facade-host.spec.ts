import { describe, expect, it } from "vitest";

import { registerEngineFacade } from "../../src/bootstrap/engine-facade-host";

describe("bootstrap engine facade host", () => {
  it("registers the core engine facade on the window-like object", () => {
    const windowLike: { CoreEngineFacade?: unknown } = {};

    registerEngineFacade(windowLike);

    const facade = windowLike.CoreEngineFacade as Record<string, unknown>;
    expect(facade).toBeTruthy();
    expect(typeof facade.createUndoSnapshot).toBe("function");
    expect(typeof facade.computeUndoRestoreState).toBe("function");
  });

  it("does not override an existing compatible facade", () => {
    const existingFacade = {
      createUndoSnapshot() {},
      computeUndoRestoreState() {},
      marker: "keep"
    };
    const windowLike: { CoreEngineFacade?: unknown } = { CoreEngineFacade: existingFacade };

    registerEngineFacade(windowLike);

    expect(windowLike.CoreEngineFacade).toBe(existingFacade);
  });
});
