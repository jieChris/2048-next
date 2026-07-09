import { describe, expect, it, vi } from "vitest";

import {
  bindBreakoutEasterEgg,
  createBreakoutEasterEggRuntime,
  installBreakoutEasterEggRuntime,
  openBreakoutEasterEgg,
  type BreakoutEasterEggBinding,
  type BreakoutEasterEggRuntime
} from "../../src/bootstrap/breakout-easter-egg";

type Listener = (event?: any) => void;

class FakeClassList {
  values = new Set<string>();

  add(value: string): void {
    this.values.add(value);
  }

  remove(value: string): void {
    this.values.delete(value);
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }
}

class FakeElement {
  attributes = new Map<string, string>();
  children: FakeElement[] = [];
  classList = new FakeClassList();
  contentWindow: { postMessage: ReturnType<typeof vi.fn> } | null = null;
  listeners = new Map<string, Listener[]>();
  parentNode: FakeElement | null = null;
  style: Record<string, string> = {};
  textContent = "";

  constructor(public readonly tagName = "div") {}

  appendChild(child: FakeElement): FakeElement {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: FakeElement): FakeElement {
    this.children = this.children.filter((current) => current !== child);
    child.parentNode = null;
    return child;
  }

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(
      type,
      listeners.filter((current) => current !== listener)
    );
  }

  dispatch(type: string, event?: any): void {
    const listeners = this.listeners.get(type) || [];
    for (const listener of listeners) listener(event);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name) || "" : null;
  }

  querySelector(selector: string): FakeElement | null {
    const matches = (node: FakeElement): boolean => {
      if (selector === "#breakout-achievement-toast-host") {
        return node.getAttribute("id") === "breakout-achievement-toast-host";
      }
      if (selector === 'link[data-achievement-unlock-toast-style="1"]') {
        return node.tagName.toLowerCase() === "link" && node.getAttribute("data-achievement-unlock-toast-style") === "1";
      }
      if (selector === "[data-breakout-easter-egg-overlay=\"1\"]") {
        return node.getAttribute("data-breakout-easter-egg-overlay") === "1";
      }
      if (
        selector === "link[rel~=\"icon\"][href]" ||
        selector === "link[rel=\"icon\"][href]"
      ) {
        const rel = node.getAttribute("rel") || "";
        return (
          node.tagName.toLowerCase() === "link" &&
          rel.split(/\s+/).includes("icon") &&
          !!node.getAttribute("href")
        );
      }
      if (selector === ".breakout-easter-egg-frame") {
        return node.classList.contains("breakout-easter-egg-frame");
      }
      if (selector === ".breakout-easter-egg-close") {
        return node.classList.contains("breakout-easter-egg-close");
      }
      return false;
    };
    const visit = (node: FakeElement): FakeElement | null => {
      if (matches(node)) return node;
      for (const child of node.children) {
        const found = visit(child);
        if (found) return found;
      }
      return null;
    };
    return visit(this);
  }

  focus = vi.fn();
}

function createDocumentLike() {
  const body = new FakeElement("body");
  const head = new FakeElement("head");
  const documentElement = new FakeElement("html");
  documentElement.appendChild(head);
  documentElement.appendChild(body);
  return {
    body,
    head,
    documentElement,
    createElement(tagName: string) {
      return new FakeElement(tagName);
    },
    querySelector(selector: string) {
      return documentElement.querySelector(selector);
    }
  };
}

function findFrame(overlay: FakeElement | null): FakeElement | null {
  return overlay?.querySelector(".breakout-easter-egg-frame") || null;
}

function createWindowLike() {
  const listeners = new Map<string, Listener[]>();
  return {
    listeners,
    CoreFlyingClickEffectRuntime: {
      triggerFlyingClickEffect: vi.fn()
    },
    fetch: vi.fn(() => Promise.resolve({})),
    localStorage: null as {
      getItem?: (key: string) => string | null;
      setItem?: (key: string, value: string) => unknown;
      removeItem?: (key: string) => unknown;
    } | null,
    location: { origin: "http://127.0.0.1:5174" },
    UII18N: null as { getLanguage?: () => string } | null,
    addEventListener: vi.fn((type: string, listener: Listener) => {
      const current = listeners.get(type) || [];
      current.push(listener);
      listeners.set(type, current);
    }),
    removeEventListener: vi.fn((type: string, listener: Listener) => {
      const current = listeners.get(type) || [];
      listeners.set(
        type,
        current.filter((entry) => entry !== listener)
      );
    }),
    dispatch(type: string, event?: any) {
      for (const listener of listeners.get(type) || []) listener(event);
    }
  };
}

describe("breakout easter egg", () => {
  it("opens the isolated iframe overlay on the nineteenth target click", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));
    let currentTime = 1_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 19,
      enableClickEffect: true,
      gameUrl: "./easter-eggs/breakout/index.html"
    });

    for (let index = 0; index < 18; index += 1) {
      currentTime += 100;
      target.dispatch("click");
    }

    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();
    expect(windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect).toHaveBeenCalledTimes(18);
    expect(windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect).toHaveBeenLastCalledWith({
      root: target
    });

    currentTime += 100;
    target.dispatch("click");

    const overlay = documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]");
    expect(windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect).toHaveBeenCalledTimes(19);
    expect(windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        root: target,
        particleKind: "image",
        imageSrc: "./favicon.ico",
        imageAlt: "2048",
        imageBurst: true,
        cleanupTimeoutMs: 1200,
        onComplete: expect.any(Function)
      })
    );
    expect(overlay).toBeNull();
    expect(target.classList.contains("breakout-easter-egg-trigger-pending")).toBe(true);

    target.dispatch("click");
    expect(windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect).toHaveBeenCalledTimes(19);
    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();

    const triggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[18]?.[0] as {
      onComplete?: () => void;
    };
    triggerArgs.onComplete?.();

    const completedOverlay = documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]");
    const frame = completedOverlay?.querySelector(".breakout-easter-egg-frame");
    expect(completedOverlay?.classList.contains("breakout-easter-egg-overlay")).toBe(true);
    expect(target.classList.contains("breakout-easter-egg-trigger-pending")).toBe(false);
    expect(completedOverlay?.getAttribute("role")).toBe("dialog");
    expect(completedOverlay?.getAttribute("aria-modal")).toBe("true");
    expect(frame?.tagName).toBe("iframe");
    expect(frame?.getAttribute("src")).toBe("./easter-eggs/breakout/index.html");
    expect(frame?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");
    expect(frame?.getAttribute("allowtransparency")).toBe("true");
    expect(frame?.focus).toHaveBeenCalledTimes(1);
    expect(documentLike.body.classList.contains("breakout-easter-egg-open")).toBe(true);
    expect(documentLike.documentElement.classList.contains("breakout-easter-egg-open")).toBe(true);
    nowSpy.mockRestore();
  });

  it("minimizes the iframe overlay on child message and restores it with one target click", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    const overlay = openBreakoutEasterEgg({
      documentLike,
      windowLike
    }) as FakeElement;
    const frame = findFrame(overlay);
    if (frame) frame.contentWindow = { postMessage: vi.fn() };

    windowLike.dispatch("message", {
      data: {
        type: "2048-next-breakout-easter-egg",
        action: "minimize"
      }
    });

    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBe(overlay);
    expect(overlay.classList.contains("is-minimized")).toBe(true);
    expect(documentLike.body.classList.contains("breakout-easter-egg-open")).toBe(false);
    expect(documentLike.documentElement.classList.contains("breakout-easter-egg-open")).toBe(false);

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 19
    });
    target.dispatch("click");

    expect(overlay.classList.contains("is-minimized")).toBe(false);
    expect(documentLike.body.classList.contains("breakout-easter-egg-open")).toBe(true);
    expect(documentLike.documentElement.classList.contains("breakout-easter-egg-open")).toBe(true);
    expect(frame?.contentWindow?.postMessage).toHaveBeenCalledWith(
      {
        type: "2048-next-breakout-easter-egg",
        action: "restore"
      },
      "*"
    );
  });

  it("closes and removes the iframe overlay on child close message", () => {
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();

    openBreakoutEasterEgg({
      documentLike,
      windowLike
    });

    windowLike.dispatch("message", {
      data: {
        type: "2048-next-breakout-easter-egg",
        action: "close"
      }
    });

    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();
    expect(documentLike.body.classList.contains("breakout-easter-egg-open")).toBe(false);
    expect(documentLike.documentElement.classList.contains("breakout-easter-egg-open")).toBe(false);
  });

  it("opens immediately when the logo burst effect runtime is unavailable", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect = undefined;

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      gameUrl: "./easter-eggs/breakout/index.html"
    });

    target.dispatch("click");

    const overlay = documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]");
    const frame = overlay?.querySelector(".breakout-easter-egg-frame");
    expect(overlay?.classList.contains("breakout-easter-egg-overlay")).toBe(true);
    expect(frame?.getAttribute("src")).toBe("./easter-eggs/breakout/index.html");
  });

  it("submits the hidden discovery achievement event after the game opens", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    windowLike.localStorage = {
      getItem: vi.fn((key: string) => key === "2048_auth_token_v1" ? "auth-token" : null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    windowLike.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true })
    }));
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      enableClickEffect: true
    });

    target.dispatch("click");
    expect(windowLike.fetch).not.toHaveBeenCalled();

    const triggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[0]?.[0] as {
      onComplete?: () => void;
    };
    triggerArgs.onComplete?.();

    expect(windowLike.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = windowLike.fetch.mock.calls[0] || [];
    const headers = init?.headers as Headers;
    expect(url).toBe("http://127.0.0.1:5174/api/user/me/achievement-events");
    expect(init?.method).toBe("POST");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer auth-token");
    expect(init?.body).toBe(JSON.stringify({ event_id: "breakout_easter_egg_discovered" }));
  });

  it("shows the discovery achievement toast after a successful event response", async () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    const setItem = vi.fn();
    windowLike.localStorage = {
      getItem: vi.fn((key: string) => key === "2048_auth_token_v1" ? "auth-token" : null),
      setItem,
      removeItem: vi.fn()
    };
    windowLike.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true })
    }));
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      enableClickEffect: true
    });

    target.dispatch("click");
    const triggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[0]?.[0] as {
      onComplete?: () => void;
    };
    triggerArgs.onComplete?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const host = documentLike.body.querySelector("#breakout-achievement-toast-host");
    expect(host?.innerHTML).toContain("发现彩蛋");
    expect(host?.innerHTML).toContain("隐藏成就");
    expect(host?.innerHTML).toContain("unlock-toast--easter-egg");
    expect(host?.innerHTML).toContain("egg-yolk-easter_egg_breakout_discovered");
    expect(host?.innerHTML).toContain("achievement-easter-egg-full");
    expect(host?.innerHTML).toContain("打开排行榜里的弹球彩蛋。");
    expect(host?.innerHTML).not.toContain("Reward Claimed");
    expect(host?.style.zIndex).toBe("10060");
    expect(setItem).toHaveBeenCalledWith("breakout_easter_egg_discovery_toast_seen_v1", "1");
  });

  it("uses the global achievement toast runtime when it is installed", async () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    const showAchievementUnlockToast = vi.fn();
    (windowLike as any).AchievementUnlockToastRuntime = { showAchievementUnlockToast };
    windowLike.localStorage = {
      getItem: vi.fn((key: string) => key === "2048_auth_token_v1" ? "auth-token" : null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    windowLike.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true })
    }));
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      enableClickEffect: true
    });

    target.dispatch("click");
    const triggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[0]?.[0] as {
      onComplete?: () => void;
    };
    triggerArgs.onComplete?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showAchievementUnlockToast).toHaveBeenCalledWith(expect.objectContaining({
      id: "easter_egg_breakout_discovered",
      name: "发现彩蛋",
      series_id: "community-easter-egg"
    }));
    expect(documentLike.body.querySelector("#breakout-achievement-toast-host")).toBeNull();
  });

  it("still submits the discovery event when a previous local toast marker exists", async () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    windowLike.localStorage = {
      getItem: vi.fn((key: string) => {
        if (key === "2048_auth_token_v1") return "auth-token";
        if (key === "breakout_easter_egg_discovery_toast_seen_v1") return "1";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    windowLike.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true, newly_granted: true })
    }));
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      enableClickEffect: true
    });

    target.dispatch("click");
    const triggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[0]?.[0] as {
      onComplete?: () => void;
    };
    triggerArgs.onComplete?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(windowLike.fetch).toHaveBeenCalledTimes(1);
    expect(documentLike.body.querySelector("#breakout-achievement-toast-host")?.innerHTML).toContain("发现彩蛋");
  });

  it("does not let a stale local toast marker suppress a successful legacy event response", async () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    windowLike.localStorage = {
      getItem: vi.fn((key: string) => {
        if (key === "2048_auth_token_v1") return "auth-token";
        if (key === "breakout_easter_egg_discovery_toast_seen_v1") return "1";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    windowLike.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true })
    }));
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      enableClickEffect: true
    });

    target.dispatch("click");
    const triggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[0]?.[0] as {
      onComplete?: () => void;
    };
    triggerArgs.onComplete?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(windowLike.fetch).toHaveBeenCalledTimes(1);
    expect(documentLike.body.querySelector("#breakout-achievement-toast-host")?.innerHTML).toContain("发现彩蛋");
  });

  it("does not show a duplicate discovery toast when the backend reports an existing achievement", async () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    const setItem = vi.fn();
    windowLike.localStorage = {
      getItem: vi.fn((key: string) => key === "2048_auth_token_v1" ? "auth-token" : null),
      setItem,
      removeItem: vi.fn()
    };
    windowLike.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true, newly_granted: false })
    }));
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      enableClickEffect: true
    });

    target.dispatch("click");
    const triggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[0]?.[0] as {
      onComplete?: () => void;
    };
    triggerArgs.onComplete?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(windowLike.fetch).toHaveBeenCalledTimes(1);
    expect(documentLike.body.querySelector("#breakout-achievement-toast-host")).toBeNull();
    expect(setItem).not.toHaveBeenCalledWith("breakout_easter_egg_discovery_toast_seen_v1", "1");
  });

  it("uses English copy for the discovery toast on English pages", async () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    windowLike.localStorage = {
      getItem: vi.fn((key: string) => key === "2048_auth_token_v1" ? "auth-token" : null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    windowLike.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true })
    }));
    windowLike.UII18N = {
      getLanguage: () => "en"
    };
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      enableClickEffect: true
    });

    target.dispatch("click");
    const triggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[0]?.[0] as {
      onComplete?: () => void;
    };
    triggerArgs.onComplete?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const html = documentLike.body.querySelector("#breakout-achievement-toast-host")?.innerHTML || "";
    expect(html).toContain("Secret Found");
    expect(html).toContain("Easter Egg Found");
    expect(html).toContain("Opened the hidden Breakout in the leaderboard.");
    expect(html).not.toContain("发现彩蛋");
  });

  it("unlocks a fresh hidden sequence after the burst callback opens the game", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mockReturnValue(new FakeElement("div"));

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      enableClickEffect: true
    });

    target.dispatch("click");
    const firstTriggerArgs = windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect.mock.calls[0]?.[0] as {
      onComplete?: () => void;
    };
    firstTriggerArgs.onComplete?.();
    documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")?.querySelector(".breakout-easter-egg-close")?.dispatch("click");

    target.dispatch("click");

    expect(windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect).toHaveBeenCalledTimes(2);
    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();
  });

  it("reads fallback logo metadata from the current favicon link", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    const favicon = new FakeElement("link");
    favicon.setAttribute("rel", "shortcut icon");
    favicon.setAttribute("href", "/assets/favicon-current.svg?v=20260626");
    documentLike.head.appendChild(favicon);

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      logoAlt: "custom"
    });

    target.dispatch("click");

    expect(windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect).toHaveBeenCalledWith({
      root: target,
      particleKind: "image",
      imageSrc: "/assets/favicon-current.svg?v=20260626",
      imageAlt: "custom",
      imageBurst: true,
      cleanupTimeoutMs: 1200,
      onComplete: expect.any(Function)
    });
  });

  it("lets an explicit logo source override the current favicon link", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    const favicon = new FakeElement("link");
    favicon.setAttribute("rel", "icon");
    favicon.setAttribute("href", "/assets/favicon-current.svg");
    documentLike.head.appendChild(favicon);

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 1,
      logoSrc: "custom.svg",
      logoAlt: "custom"
    });

    target.dispatch("click");

    expect(windowLike.CoreFlyingClickEffectRuntime.triggerFlyingClickEffect).toHaveBeenCalledWith({
      root: target,
      particleKind: "image",
      imageSrc: "custom.svg",
      imageAlt: "custom",
      imageBurst: true,
      cleanupTimeoutMs: 1200,
      onComplete: expect.any(Function)
    });
  });

  it("resets the hidden counter after 1.5 seconds without a click", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    let currentTime = 2_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 19,
      gameUrl: "./easter-eggs/breakout/index.html"
    });

    for (let index = 0; index < 17; index += 1) {
      currentTime += 100;
      target.dispatch("click");
    }

    currentTime += 1_600;
    target.dispatch("click");
    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();

    for (let index = 0; index < 17; index += 1) {
      currentTime += 100;
      target.dispatch("click");
    }

    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();

    currentTime += 100;
    target.dispatch("click");

    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).not.toBeNull();
    nowSpy.mockRestore();
  });

  it("closes the overlay and lets the counter start a fresh hidden sequence", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();

    bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike,
      triggerCount: 2
    });

    target.dispatch("click");
    target.dispatch("click");

    const firstOverlay = documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]");
    firstOverlay?.querySelector(".breakout-easter-egg-close")?.dispatch("click");

    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();
    expect(documentLike.body.classList.contains("breakout-easter-egg-open")).toBe(false);

    target.dispatch("click");
    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();

    target.dispatch("click");
    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).not.toBeNull();
  });

  it("blocks parent-page key handling while the overlay is open", () => {
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();

    openBreakoutEasterEgg({
      documentLike,
      windowLike
    });

    const event = {
      key: "ArrowLeft",
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn(),
      stopPropagation: vi.fn()
    };
    windowLike.dispatch("keydown", event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing overlay instead of stacking multiple game frames", () => {
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();

    const first = openBreakoutEasterEgg({ documentLike, windowLike });
    const second = openBreakoutEasterEgg({ documentLike, windowLike });

    expect(second).toBe(first);
    expect(documentLike.body.children).toHaveLength(1);
  });

  it("can destroy its click binding without removing other click behavior", () => {
    const target = new FakeElement("button");
    const documentLike = createDocumentLike();
    const clickSpy = vi.fn();
    target.addEventListener("click", clickSpy);

    const binding: BreakoutEasterEggBinding = bindBreakoutEasterEgg(target, {
      documentLike,
      windowLike: createWindowLike(),
      triggerCount: 1
    });

    binding.destroy();
    target.dispatch("click");

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).toBeNull();
  });

  it("installs a runtime without overwriting an existing one", () => {
    const runtime = createBreakoutEasterEggRuntime();
    const windowLike: { CoreBreakoutEasterEggRuntime?: BreakoutEasterEggRuntime } = {
      CoreBreakoutEasterEggRuntime: runtime
    };

    expect(installBreakoutEasterEggRuntime({ windowLike })).toBe(runtime);
    expect(windowLike.CoreBreakoutEasterEggRuntime).toBe(runtime);
  });

  it("binds an existing timer self rank tile when the runtime installs after leaderboard render", () => {
    const documentLike = createDocumentLike();
    const windowLike = createWindowLike();
    const rankTile = new FakeElement("div");
    const originalQuerySelector = documentLike.querySelector;
    documentLike.querySelector = (selector: string) => {
      if (selector === ".timer-leaderboard-row.is-self .timer-leaderboard-rank-tile") return rankTile;
      return originalQuerySelector(selector);
    };

    installBreakoutEasterEggRuntime({ documentLike, windowLike });
    for (let index = 0; index < 19; index += 1) {
      rankTile.dispatch("click");
    }

    expect(documentLike.body.querySelector("[data-breakout-easter-egg-overlay=\"1\"]")).not.toBeNull();
    expect((rankTile as unknown as Record<string, unknown>).__timerLeaderboardSelfRankBreakoutEasterEggBinding).toBeTruthy();
  });
});
