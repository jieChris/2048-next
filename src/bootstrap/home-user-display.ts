const AUTH_NICKNAME_STORAGE_KEY = "2048_auth_nickname_v1";
const AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";
const DEFAULT_GUEST_LABEL = "游客";

type StorageLike = {
  getItem?: (key: string) => string | null;
};

type DocumentLike = {
  body?: {
    appendChild?: <T>(node: T) => T;
  } | null;
  createElement?: (tagName: string) => HomeUserDisplayNodeLike;
  getElementById?: (id: string) => HomeUserDisplayNodeLike | null;
  querySelector?: (selector: string) => HomeUserDisplayParentLike | null;
};

type HomeUserDisplayParentLike = {
  appendChild?: <T>(node: T) => T;
};

type HomeUserDisplayNodeLike = {
  className?: string;
  href?: string;
  id?: string;
  setAttribute?: (name: string, value: string) => void;
  textContent?: string | null;
};

const GLOBAL_HOME_USER_DISPLAY_EXCLUDED_PAGE_IDS = new Set([
  "admin",
  "index_test",
  "pku2048",
  "practice",
  "replay",
  "stone-2k-monitor"
]);

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readNickname(storageLike: unknown): string {
  const storage = toRecord(storageLike) as StorageLike;
  if (typeof storage.getItem !== "function") return "";
  try {
    return String(storage.getItem(AUTH_NICKNAME_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function readUserId(storageLike: unknown): string {
  const storage = toRecord(storageLike) as StorageLike;
  if (typeof storage.getItem !== "function") return "";
  try {
    return String(storage.getItem(AUTH_USER_ID_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function resolveHomeUserDisplayName(input: { storageLike?: unknown }): string {
  return readNickname(input.storageLike) || DEFAULT_GUEST_LABEL;
}

export function resolveHomeUserDisplayHref(input: { storageLike?: unknown }): string {
  const userId = readUserId(input.storageLike);
  const nickname = readNickname(input.storageLike);
  if (!userId) return "account.html";
  const query = new URLSearchParams({ id: userId });
  if (nickname) query.set("nickname", nickname);
  return `user.html?${query.toString()}`;
}

export function shouldShowHomeUserDisplayForPage(pageId?: string | null): boolean {
  if (!pageId) return false;
  return !GLOBAL_HOME_USER_DISPLAY_EXCLUDED_PAGE_IDS.has(pageId);
}

function shouldCreateGlobalHomeUserDisplay(pageId?: string | null): boolean {
  return shouldShowHomeUserDisplayForPage(pageId) && pageId !== "index";
}

function createGlobalHomeUserDisplay(input: {
  documentLike: DocumentLike;
  pageId?: string | null;
}): HomeUserDisplayNodeLike | null {
  if (!shouldCreateGlobalHomeUserDisplay(input.pageId)) return null;
  if (typeof input.documentLike.createElement !== "function") return null;
  const headingParent =
    typeof input.documentLike.querySelector === "function"
      ? input.documentLike.querySelector(".heading")
      : null;
  const parent =
    headingParent && typeof headingParent.appendChild === "function"
      ? headingParent
      : input.documentLike.body;
  if (!parent || typeof parent.appendChild !== "function") return null;

  const node = input.documentLike.createElement("a");
  node.id = "home-user-display";
  node.className = parent === headingParent ? "home-user-display" : "home-user-display home-user-display--global";
  node.href = "";
  if (typeof node.setAttribute === "function") {
    node.setAttribute("aria-live", "polite");
  }
  return parent.appendChild(node);
}

export function syncHomeUserDisplay(input: {
  documentLike?: unknown;
  storageLike?: unknown;
  pageId?: string | null;
}): boolean {
  if (input.pageId && !shouldShowHomeUserDisplayForPage(input.pageId)) return false;
  const documentLike = toRecord(input.documentLike) as DocumentLike;
  if (typeof documentLike.getElementById !== "function") return false;

  const node =
    documentLike.getElementById("home-user-display") ||
    createGlobalHomeUserDisplay({ documentLike, pageId: input.pageId });
  if (!node) return false;

  node.textContent = resolveHomeUserDisplayName({ storageLike: input.storageLike });
  if ("href" in node) {
    node.href = resolveHomeUserDisplayHref({ storageLike: input.storageLike });
  }
  return true;
}

export function bindHomeUserDisplay(input: {
  documentLike?: unknown;
  pageId?: string | null;
  windowLike?: unknown;
  storageLike?: unknown;
}): boolean {
  const synced = syncHomeUserDisplay({
    documentLike: input.documentLike,
    pageId: input.pageId,
    storageLike: input.storageLike
  });
  const windowRecord = toRecord(input.windowLike) as {
    addEventListener?: (type: string, listener: (event: { key?: string | null }) => void) => void;
    __homeUserDisplayBound?: boolean;
  };

  if (windowRecord.__homeUserDisplayBound || typeof windowRecord.addEventListener !== "function") {
    return synced;
  }

  windowRecord.__homeUserDisplayBound = true;
  windowRecord.addEventListener("storage", (event) => {
    if (!event || !event.key || event.key === AUTH_NICKNAME_STORAGE_KEY || event.key === AUTH_USER_ID_STORAGE_KEY) {
      syncHomeUserDisplay({
        documentLike: input.documentLike,
        pageId: input.pageId,
        storageLike: input.storageLike
      });
    }
  });

  return synced;
}
