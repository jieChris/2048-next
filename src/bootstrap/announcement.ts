interface StorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): unknown;
}

interface WindowLike {
  localStorage?: StorageLike | null;
}

interface AnnouncementRecordLike {
  id?: unknown;
  date?: unknown;
}

function toAnnouncementRecords(value: unknown): AnnouncementRecordLike[] {
  if (!Array.isArray(value)) return [];
  return value;
}

function compareAnnouncementRecords(a: AnnouncementRecordLike, b: AnnouncementRecordLike): number {
  const ad = String((a && a.date) || "");
  const bd = String((b && b.date) || "");
  if (ad === bd) {
    const aid = String((a && a.id) || "");
    const bid = String((b && b.id) || "");
    if (aid < bid) return 1;
    if (aid > bid) return -1;
    return 0;
  }
  return ad < bd ? 1 : -1;
}

function resolveLocalStorage(windowLike: unknown): StorageLike | null {
  const win = windowLike as WindowLike | null | undefined;
  if (!win) return null;
  const storage = win.localStorage;
  if (!storage) return null;
  return storage;
}

export function resolveAnnouncementRecords(options: {
  records?: unknown;
}): AnnouncementRecordLike[] {
  const opts = options || {};
  const records = toAnnouncementRecords(opts.records);
  return records.slice().sort(compareAnnouncementRecords);
}

export function resolveLatestAnnouncementId(options: {
  records?: unknown;
}): string {
  const records = resolveAnnouncementRecords({
    records: options && options.records
  });
  if (!records.length) return "";
  const latestId = records[0] && records[0].id;
  return latestId ? String(latestId) : "";
}

export function readAnnouncementSeenFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
}): string | null {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return null;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const value = storage.getItem(key);
    return typeof value === "string" ? value : null;
  } catch (_err) {
    return null;
  }
}

export function hasUnreadAnnouncementFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  records?: unknown;
}): boolean {
  const opts = options || {};
  const latestId = resolveLatestAnnouncementId({
    records: opts.records
  });
  if (!latestId) return false;
  const stored = readAnnouncementSeenFromContext({
    windowLike: opts.windowLike,
    key: opts.key
  });
  return stored !== latestId;
}

export function markAnnouncementSeenFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  records?: unknown;
  latestId?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return false;
  const latestId =
    typeof opts.latestId === "string"
      ? opts.latestId
      : resolveLatestAnnouncementId({
          records: opts.records
        });
  if (!latestId) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, latestId);
    return true;
  } catch (_err) {
    return false;
  }
}
