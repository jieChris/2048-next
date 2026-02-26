import { describe, expect, it, vi } from "vitest";

import {
  hasUnreadAnnouncementFromContext,
  markAnnouncementSeenFromContext,
  readAnnouncementSeenFromContext,
  resolveAnnouncementRecords,
  resolveLatestAnnouncementId
} from "../../src/bootstrap/announcement";

describe("bootstrap announcement", () => {
  it("sorts records by date desc and id desc", () => {
    const result = resolveAnnouncementRecords({
      records: [
        { id: "2026-02-21-v1.8", date: "2026-02-21" },
        { id: "2026-02-22-v1.9", date: "2026-02-22" },
        { id: "2026-02-21-v1.81", date: "2026-02-21" }
      ]
    });

    expect(result.map((item) => String(item.id))).toEqual([
      "2026-02-22-v1.9",
      "2026-02-21-v1.81",
      "2026-02-21-v1.8"
    ]);
  });

  it("resolves latest announcement id from records", () => {
    const latestId = resolveLatestAnnouncementId({
      records: [
        { id: "a", date: "2026-01-01" },
        { id: "b", date: "2026-02-01" }
      ]
    });

    expect(latestId).toBe("b");
  });

  it("reads seen id from local storage safely", () => {
    const getItem = vi.fn(() => "2026-02-22-v1.9");
    const result = readAnnouncementSeenFromContext({
      windowLike: {
        localStorage: {
          getItem
        }
      },
      key: "announcement_last_read_id_v1"
    });

    expect(getItem).toHaveBeenCalledWith("announcement_last_read_id_v1");
    expect(result).toBe("2026-02-22-v1.9");
  });

  it("detects unread state using runtime context", () => {
    const hasUnread = hasUnreadAnnouncementFromContext({
      windowLike: {
        localStorage: {
          getItem: () => "2026-02-21-v1.8"
        }
      },
      key: "announcement_last_read_id_v1",
      records: [{ id: "2026-02-22-v1.9", date: "2026-02-22" }]
    });

    expect(hasUnread).toBe(true);
  });

  it("marks latest announcement as seen via storage context", () => {
    const setItem = vi.fn();
    const result = markAnnouncementSeenFromContext({
      windowLike: {
        localStorage: {
          setItem
        }
      },
      key: "announcement_last_read_id_v1",
      records: [{ id: "2026-02-22-v1.9", date: "2026-02-22" }]
    });

    expect(setItem).toHaveBeenCalledWith("announcement_last_read_id_v1", "2026-02-22-v1.9");
    expect(result).toBe(true);
  });
});
