const AUTH_NICKNAME_STORAGE_KEY = "2048_auth_nickname_v1";
const AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";
const DEFAULT_GUEST_LABEL = "游客";

type StorageLike = {
  getItem?: (key: string) => string | null;
};

type DocumentLike = {
  getElementById?: (id: string) => { href?: string; textContent?: string | null } | null;
};

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

export function syncHomeUserDisplay(input: {
  documentLike?: unknown;
  storageLike?: unknown;
}): boolean {
  const documentLike = toRecord(input.documentLike) as DocumentLike;
  if (typeof documentLike.getElementById !== "function") return false;

  const node = documentLike.getElementById("home-user-display");
  if (!node) return false;

  node.textContent = resolveHomeUserDisplayName({ storageLike: input.storageLike });
  if ("href" in node) {
    node.href = resolveHomeUserDisplayHref({ storageLike: input.storageLike });
  }
  return true;
}

export function bindHomeUserDisplay(input: {
  documentLike?: unknown;
  windowLike?: unknown;
  storageLike?: unknown;
}): boolean {
  const synced = syncHomeUserDisplay({
    documentLike: input.documentLike,
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
        storageLike: input.storageLike
      });
    }
  });

  return synced;
}
