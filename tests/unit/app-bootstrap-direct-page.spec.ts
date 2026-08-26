import { afterEach, describe, expect, it, vi } from "vitest";

import { bootstrapDirectPage } from "../../src/app/bootstrap-direct-page";
import { runBetaAccessGate } from "../../src/bootstrap/access-gate";

vi.mock("../../src/bootstrap/access-gate", () => ({
  runBetaAccessGate: vi.fn(async () => ({ allowed: true })),
  shouldRunBetaAccessGate: vi.fn((pageId: string) => !["admin", "beta-login", "beta-access", "cache-reset"].includes(pageId))
}));
vi.mock("../../src/services/auth-session", () => ({
  restoreAuthSession: vi.fn(async () => ({ status: "guest" })),
  getAuthToken: vi.fn((options?: { storageLike?: Pick<Storage, "getItem"> | null }) =>
    options?.storageLike?.getItem("2048_auth_token_v1") || null,
  ),
}));
vi.mock("../../src/features/palette/account-palette-session", () => ({
  getAccountPaletteSessionController: () => ({
    bootstrap: vi.fn(async () => ({ status: "guest", snapshot: null })),
  }),
}));

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
  vi.mocked(runBetaAccessGate).mockResolvedValue({ allowed: true });
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
          if (key === "2048_auth_token_v1") return "token";
          if (key === "2048_public_profile_id_v1") return "19";
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

    await bootstrapDirectPage("relay-5x5");

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

  it("stops direct page initialization when beta access gate blocks the page", async () => {
    vi.mocked(runBetaAccessGate).mockResolvedValueOnce({ allowed: false });
    const init = vi.fn();

    const result = await bootstrapDirectPage("history", init);

    expect(runBetaAccessGate).toHaveBeenCalledWith("history");
    expect(init).not.toHaveBeenCalled();
    expect(result).toEqual({ pageId: "history", architecture: "manifest-bootstrap" });
  });

  it("runs beta access gate for account direct page", async () => {
    const init = vi.fn();

    await bootstrapDirectPage("account", init);

    expect(runBetaAccessGate).toHaveBeenCalledWith("account");
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("returns shared arrow buttons to the previous internal page", async () => {
    let clickListener: ((event: MouseEvent) => void) | null = null;
    const documentLike = {
      ...createDocumentLike(),
      referrer: "http://127.0.0.1:5173/modes.html",
      addEventListener(type: string, listener: EventListener) {
        if (type === "click") clickListener = listener as (event: MouseEvent) => void;
      },
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ setAttribute: vi.fn() })),
      body: {
        setAttribute: vi.fn(),
        appendChild: vi.fn()
      }
    } as unknown as Document;
    const back = vi.fn();
    const windowLike = {
      addEventListener: vi.fn(),
      matchMedia: vi.fn(() => ({ matches: false })),
      navigator: {},
      localStorage: { getItem: vi.fn(() => null) },
      location: {
        href: "http://127.0.0.1:5173/account.html",
        origin: "http://127.0.0.1:5173"
      },
      history: { back, length: 2 }
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

    await bootstrapDirectPage("account");

    const link = {
      dataset: {},
      closest: vi.fn((selector: string) => selector === "a.page-back-button[href]" ? link : null)
    };
    const preventDefault = vi.fn();
    expect(clickListener).not.toBeNull();
    clickListener?.({
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      target: link,
      preventDefault
    } as unknown as MouseEvent);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("keeps fixed back links on their declared destination", async () => {
    let clickListener: ((event: MouseEvent) => void) | null = null;
    const documentLike = {
      ...createDocumentLike(),
      referrer: "http://127.0.0.1:5173/modes.html",
      addEventListener(type: string, listener: EventListener) {
        if (type === "click") clickListener = listener as (event: MouseEvent) => void;
      },
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ setAttribute: vi.fn() })),
      body: {
        setAttribute: vi.fn(),
        appendChild: vi.fn()
      }
    } as unknown as Document;
    const back = vi.fn();
    const windowLike = {
      addEventListener: vi.fn(),
      matchMedia: vi.fn(() => ({ matches: false })),
      navigator: {},
      localStorage: { getItem: vi.fn(() => null) },
      location: {
        href: "http://127.0.0.1:5173/palette.html#appearance-settings",
        origin: "http://127.0.0.1:5173"
      },
      history: { back, length: 3 }
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

    await bootstrapDirectPage("palette");

    const link = {
      dataset: { backNavigation: "fixed" },
      closest: vi.fn((selector: string) => selector === "a.page-back-button[href]" ? link : null)
    };
    const preventDefault = vi.fn();
    expect(clickListener).not.toBeNull();
    clickListener?.({
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      target: link,
      preventDefault
    } as unknown as MouseEvent);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  });
});
