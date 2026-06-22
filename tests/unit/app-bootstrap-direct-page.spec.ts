import { afterEach, describe, expect, it, vi } from "vitest";

import { bootstrapDirectPage } from "../../src/app/bootstrap-direct-page";

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

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
  vi.restoreAllMocks();
  if (originalDocument === undefined) {
    delete (globalThis as { document?: Document }).document;
  } else {
    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      configurable: true,
      writable: true
    });
  }
  if (originalWindow === undefined) {
    delete (globalThis as { window?: Window }).window;
  } else {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true
    });
  }
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

  it("creates the shared account badge for direct pages", async () => {
    const appended: Array<{ textContent?: string | null; href?: string; className?: string; id?: string }> = [];
    const documentLike = {
      ...createDocumentLike(),
      body: {
        setAttribute: vi.fn(),
        appendChild(node: (typeof appended)[number]) {
          appended.push(node);
          return node;
        }
      },
      createElement() {
        return {
          setAttribute: vi.fn()
        };
      },
      getElementById() {
        return null;
      }
    } as unknown as Document;
    const windowLike = {
      addEventListener: vi.fn(),
      matchMedia: vi.fn(() => ({ matches: false })),
      navigator: {},
      localStorage: {
        getItem(key: string) {
          if (key === "2048_auth_userId_v1") return "19";
          if (key === "2048_auth_nickname_v1") return "Jay";
          return null;
        }
      }
    } as unknown as Window;
    Object.defineProperty(globalThis, "document", {
      value: documentLike,
      configurable: true,
      writable: true
    });
    Object.defineProperty(globalThis, "window", {
      value: windowLike,
      configurable: true,
      writable: true
    });

    await bootstrapDirectPage("modes");

    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({
      id: "home-user-display",
      className: "home-user-display home-user-display--global",
      textContent: "Jay",
      href: "user.html?id=19&nickname=Jay"
    });
  });

  it("rejects unknown page manifests", async () => {
    await expect(bootstrapDirectPage("not-a-page")).rejects.toThrow(/Unknown direct page manifest/);
  });
});
