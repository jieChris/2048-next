import { describe, expect, it } from "vitest";

import {
  bindHomeUserDisplay,
  resolveHomeUserDisplayHref,
  resolveHomeUserDisplayName,
  syncHomeUserDisplay
} from "../../src/bootstrap/home-user-display";

describe("bootstrap home user display", () => {
  it("uses guest text when nickname storage is empty", () => {
    expect(resolveHomeUserDisplayName({ storageLike: null })).toBe("游客");
  });

  it("uses English guest text when the UI language is English", () => {
    const storageLike = {
      getItem(key: string) {
        return key === "ui_language_v1" ? "en" : null;
      }
    };

    expect(resolveHomeUserDisplayName({ storageLike })).toBe("Guest");
  });

  it("uses stored nickname when available", () => {
    const storageLike = {
      getItem(key: string) {
        return key === "2048_auth_nickname_v1" ? "SmokeUser" : null;
      }
    };

    expect(resolveHomeUserDisplayName({ storageLike })).toBe("SmokeUser");
  });

  it("links guests to the account settings login page", () => {
    expect(resolveHomeUserDisplayHref({ storageLike: null })).toBe("account_settings.html");
  });

  it("links signed-in users to their profile page", () => {
    const storageLike = {
      getItem(key: string) {
        if (key === "2048_auth_userId_v1") return "42";
        if (key === "2048_public_profile_id_v1") return "9";
        if (key === "2048_auth_token_v1") return "token";
        if (key === "2048_auth_nickname_v1") return "Smoke User";
        return null;
      }
    };

    expect(resolveHomeUserDisplayHref({ storageLike })).toBe("user.html?id=9&nickname=Smoke+User");
  });

  it("links a cached cookie-auth identity to its public profile before token restore", () => {
    const storageLike = {
      getItem(key: string) {
        if (key === "2048_public_profile_id_v1") return "23";
        if (key === "2048_auth_nickname_v1") return "Jay";
        return null;
      }
    };

    expect(resolveHomeUserDisplayHref({ storageLike })).toBe("user.html?id=23&nickname=Jay");
  });

  it("links authenticated sessions without a cached user id to the current user profile", () => {
    const storageLike = {
      getItem(key: string) {
        return key === "2048_auth_token_v1" ? "session-token" : null;
      }
    };

    expect(resolveHomeUserDisplayHref({ storageLike })).toBe("user.html");
  });

  it("syncs the label element text and href", () => {
    const label = { textContent: "", href: "" };
    const documentLike = {
      getElementById(id: string) {
        return id === "home-user-display" ? label : null;
      }
    };
    const storageLike = {
      getItem(key: string) {
        if (key === "2048_public_profile_id_v1") return "7";
        if (key === "2048_auth_token_v1") return "token";
        if (key === "2048_auth_nickname_v1") return "Alice";
        return null;
      }
    };

    expect(syncHomeUserDisplay({ documentLike, storageLike })).toBe(true);
    expect(label.textContent).toBe("Alice");
    expect(label.href).toBe("user.html?id=7&nickname=Alice");
  });

  it("syncs the top profile button href with the same destination", () => {
    const label = { textContent: "", href: "" };
    const profileButton = { href: "" };
    const documentLike = {
      getElementById(id: string) {
        if (id === "home-user-display") return label;
        if (id === "top-user-profile-btn") return profileButton;
        return null;
      }
    };
    const storageLike = {
      getItem(key: string) {
        if (key === "2048_public_profile_id_v1") return "12";
        if (key === "2048_auth_token_v1") return "token";
        if (key === "2048_auth_nickname_v1") return "Codex 测试";
        return null;
      }
    };

    expect(syncHomeUserDisplay({ documentLike, storageLike })).toBe(true);
    expect(label.href).toBe("user.html?id=12&nickname=Codex+%E6%B5%8B%E8%AF%95");
    expect(profileButton.href).toBe(label.href);
  });

  it("does not create a profile button on the practice board", () => {
    const appended: Array<{
      className?: string;
      href?: string;
      id?: string;
      innerHTML?: string;
      attrs?: Record<string, string>;
    }> = [];
    const topActions = {
      firstChild: { id: "stats-panel-toggle" },
      insertBefore(node: (typeof appended)[number]) {
        appended.push(node);
        return node;
      }
    };
    const documentLike = {
      createElement(tagName: string) {
        expect(tagName).toBe("a");
        return {
          attrs: {},
          setAttribute(name: string, value: string) {
            this.attrs![name] = value;
          }
        } as (typeof appended)[number] & {
          setAttribute(name: string, value: string): void;
        };
      },
      getElementById() {
        return null;
      },
      querySelector(selector: string) {
        return selector === ".top-action-buttons" ? topActions : null;
      }
    };
    const storageLike = {
      getItem(key: string) {
        if (key === "2048_public_profile_id_v1") return "19";
        if (key === "2048_auth_token_v1") return "token";
        if (key === "2048_auth_nickname_v1") return "Jay";
        return null;
      }
    };

    expect(syncHomeUserDisplay({ documentLike, storageLike, pageId: "practice" })).toBe(false);
    expect(appended).toHaveLength(0);
  });

  it("creates a global label for regular pages without an existing node", () => {
    const appended: Array<{ textContent?: string | null; href?: string; className?: string; id?: string }> = [];
    const documentLike = {
      body: {
        appendChild(node: (typeof appended)[number]) {
          appended.push(node);
          return node;
        }
      },
      createElement(tagName: string) {
        expect(tagName).toBe("a");
        return {
          setAttribute(name: string, value: string) {
            if (name === "aria-live") this.ariaLive = value;
          }
        } as { ariaLive?: string; textContent?: string | null; href?: string; className?: string; id?: string; setAttribute(name: string, value: string): void };
      },
      getElementById() {
        return null;
      }
    };
    const storageLike = {
      getItem(key: string) {
        if (key === "2048_public_profile_id_v1") return "19";
        if (key === "2048_auth_token_v1") return "token";
        if (key === "2048_auth_nickname_v1") return "Jay";
        return null;
      }
    };

    expect(bindHomeUserDisplay({ documentLike, storageLike, pageId: "relay-5x5" })).toBe(true);
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({
      id: "home-user-display",
      className: "home-user-display home-user-display--global",
      textContent: "Jay",
      href: "user.html?id=19&nickname=Jay"
    });
  });

  it("creates a heading-aligned label for game pages with a heading container", () => {
    const bodyAppended: unknown[] = [];
    const headingAppended: Array<{ textContent?: string | null; href?: string; className?: string; id?: string }> = [];
    const heading = {
      appendChild(node: (typeof headingAppended)[number]) {
        headingAppended.push(node);
        return node;
      }
    };
    const documentLike = {
      body: {
        appendChild(node: unknown) {
          bodyAppended.push(node);
          return node;
        }
      },
      createElement() {
        return {
          setAttribute() {}
        } as { textContent?: string | null; href?: string; className?: string; id?: string; setAttribute(name: string, value: string): void };
      },
      getElementById() {
        return null;
      },
      querySelector(selector: string) {
        return selector === ".heading" ? heading : null;
      }
    };
    const storageLike = {
      getItem(key: string) {
        if (key === "2048_public_profile_id_v1") return "19";
        if (key === "2048_auth_token_v1") return "token";
        if (key === "2048_auth_nickname_v1") return "Jay";
        return null;
      }
    };

    expect(bindHomeUserDisplay({ documentLike, storageLike, pageId: "play" })).toBe(true);
    expect(bodyAppended).toHaveLength(0);
    expect(headingAppended).toHaveLength(1);
    expect(headingAppended[0]).toMatchObject({
      id: "home-user-display",
      className: "home-user-display",
      textContent: "Jay",
      href: "user.html?id=19&nickname=Jay"
    });
  });

  it("resyncs a cached home user display when the page is shown or focused again", () => {
    const values = new Map<string, string>();
    const label = { textContent: "", href: "" };
    const profileButton = { href: "" };
    const listeners = new Map<string, () => void>();
    const documentLike = {
      getElementById(id: string) {
        if (id === "home-user-display") return label;
        if (id === "top-user-profile-btn") return profileButton;
        return null;
      }
    };
    const windowLike = {
      addEventListener(type: string, listener: () => void) {
        listeners.set(type, listener);
      }
    };
    const storageLike = {
      getItem(key: string) {
        return values.get(key) ?? null;
      }
    };

    expect(bindHomeUserDisplay({ documentLike, windowLike, storageLike, pageId: "index" })).toBe(true);
    expect(label.textContent).toBe("游客");

    values.set("2048_auth_token_v1", "restored-token");
    values.set("2048_public_profile_id_v1", "23");
    values.set("2048_auth_nickname_v1", "Jay");
    listeners.get("pageshow")?.();

    expect(label.textContent).toBe("Jay");
    expect(label.href).toBe("user.html?id=23&nickname=Jay");
    expect(profileButton.href).toBe(label.href);

    values.set("2048_auth_nickname_v1", "Alice");
    listeners.get("focus")?.();
    expect(label.textContent).toBe("Alice");
    expect(label.href).toBe("user.html?id=23&nickname=Alice");
  });

  it("does not create a global label on excluded utility pages and hub pages", () => {
    const appended: unknown[] = [];
    const documentLike = {
      body: {
        appendChild(node: unknown) {
          appended.push(node);
          return node;
        }
      },
      createElement() {
        return {};
      },
      getElementById() {
        return null;
      }
    };

    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "practice" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "replay" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "account" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "account-hub" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "account-settings" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "achievements" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "history" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "palette" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "palette-hub" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "modes" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "password" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "register" })).toBe(false);
    expect(bindHomeUserDisplay({ documentLike, storageLike: null, pageId: "user-profile" })).toBe(false);
    expect(appended).toHaveLength(0);
  });
});
