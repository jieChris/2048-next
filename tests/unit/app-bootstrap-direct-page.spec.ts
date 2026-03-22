import { afterEach, describe, expect, it, vi } from "vitest";

import { bootstrapDirectPage } from "../../src/app/bootstrap-direct-page";

const originalDocument = globalThis.document;

function createDocumentLike() {
  return {
    documentElement: {
      setAttribute: vi.fn()
    },
    body: {
      setAttribute: vi.fn()
    }
  } as unknown as Document;
}

afterEach(() => {
  if (originalDocument === undefined) {
    delete (globalThis as { document?: Document }).document;
    return;
  }
  Object.defineProperty(globalThis, "document", {
    value: originalDocument,
    configurable: true,
    writable: true
  });
});

describe("app: bootstrap-direct-page", () => {
  it("runs the shared manifest bootstrap for direct pages", async () => {
    const documentLike = createDocumentLike();
    Object.defineProperty(globalThis, "document", {
      value: documentLike,
      configurable: true,
      writable: true
    });

    const init = vi.fn();
    const result = await bootstrapDirectPage("modes", init);

    expect(result).toEqual({
      pageId: "modes",
      architecture: "manifest-bootstrap"
    });
    expect(documentLike.documentElement.setAttribute).toHaveBeenCalledWith("data-page-id", "modes");
    expect(documentLike.documentElement.setAttribute).toHaveBeenCalledWith(
      "data-page-entry-architecture",
      "manifest-bootstrap"
    );
    expect(documentLike.body.setAttribute).toHaveBeenCalledWith("data-page-manifest-id", "modes");
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown page manifests", async () => {
    await expect(bootstrapDirectPage("not-a-page")).rejects.toThrow(/Unknown direct page manifest/);
  });
});
