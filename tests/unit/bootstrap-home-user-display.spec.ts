import { describe, expect, it } from "vitest";

import {
  resolveHomeUserDisplayHref,
  resolveHomeUserDisplayName,
  syncHomeUserDisplay
} from "../../src/bootstrap/home-user-display";

describe("bootstrap home user display", () => {
  it("uses guest text when nickname storage is empty", () => {
    expect(resolveHomeUserDisplayName({ storageLike: null })).toBe("游客");
  });

  it("uses stored nickname when available", () => {
    const storageLike = {
      getItem(key: string) {
        return key === "2048_auth_nickname_v1" ? "SmokeUser" : null;
      }
    };

    expect(resolveHomeUserDisplayName({ storageLike })).toBe("SmokeUser");
  });

  it("links guests to the account login page", () => {
    expect(resolveHomeUserDisplayHref({ storageLike: null })).toBe("account.html");
  });

  it("links signed-in users to their profile page", () => {
    const storageLike = {
      getItem(key: string) {
        if (key === "2048_auth_userId_v1") return "42";
        if (key === "2048_auth_nickname_v1") return "Smoke User";
        return null;
      }
    };

    expect(resolveHomeUserDisplayHref({ storageLike })).toBe("user.html?id=42&nickname=Smoke+User");
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
        if (key === "2048_auth_userId_v1") return "7";
        if (key === "2048_auth_nickname_v1") return "Alice";
        return null;
      }
    };

    expect(syncHomeUserDisplay({ documentLike, storageLike })).toBe(true);
    expect(label.textContent).toBe("Alice");
    expect(label.href).toBe("user.html?id=7&nickname=Alice");
  });
});
