import "../../js/mode_catalog.js";

import type { HistoryModeCatalog } from "../features/history/history-record-normalize";

interface HistoryModeCatalogHost {
  ModeCatalog?: HistoryModeCatalog | null | undefined;
}

export function resolveHistoryModeCatalog(
  windowLike: unknown
): HistoryModeCatalog | null {
  const host = windowLike && typeof windowLike === "object" ? (windowLike as HistoryModeCatalogHost) : null;
  const catalog = host?.ModeCatalog || null;
  if (!catalog || (typeof catalog.getMode !== "function" && typeof catalog.listModes !== "function")) {
    return null;
  }
  return catalog;
}
