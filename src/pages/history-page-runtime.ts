import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { createHistoryPageController } from "./history-page-controller";
import type { HistoryDiagnosticsIndexEntry, HistoryRecordViewModel } from "../features/history/history-record-normalize";
import type { HistoryFilterState, HistoryFilterStateDefaults } from "../features/history/history-filter-state";

export interface HistoryPageRuntimeOptions {
  windowLike?: Window | null | undefined;
  documentLike?: Document | null | undefined;
}

const UI_LANGUAGE_KEY = "ui_language_v1";

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function escapeHtml(value: unknown): string {
  return toText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getUiLang(storageLike: Storage | null): "en" | "zh" {
  try {
    const raw = toText(
      safeReadStorageItem({
        storageLike: storageLike || null,
        key: UI_LANGUAGE_KEY
      })
    )
      .trim()
      .toLowerCase();
    return raw === "en" ? "en" : "zh";
  } catch (_err) {
    return "zh";
  }
}

function getGuestOwnerLabel(lang: "en" | "zh"): string {
  return lang === "en" ? "Guest" : "\u6e38\u5ba2";
}

function getAllOwnersLabel(lang: "en" | "zh"): string {
  return lang === "en" ? "All Owners" : "\u5168\u90e8\u5f52\u5c5e";
}

function getUnknownOwnerLabel(lang: "en" | "zh"): string {
  return lang === "en" ? "Unknown User" : "\u672a\u77e5\u7528\u6237";
}

function normalizeOwnerDisplay(item: HistoryRecordViewModel, lang: "en" | "zh") {
  const ownerType = toText(item.owner_type).trim().toLowerCase();
  const ownerUserId = toText(item.owner_user_id).trim();
  const ownerNickname = toText(item.owner_nickname).trim();
  let ownerKey = toText(item.owner_key).trim();

  if (!ownerKey) {
    if (ownerType === "guest" || (!ownerUserId && !ownerNickname)) {
      ownerKey = "guest";
    } else if (ownerUserId) {
      ownerKey = "user:" + ownerUserId;
    } else {
      ownerKey = "nick:" + ownerNickname.toLowerCase();
    }
  }

  const isGuest = ownerType === "guest" || ownerKey === "guest" || (!ownerUserId && !ownerNickname);
  const label = isGuest
    ? getGuestOwnerLabel(lang)
    : ownerNickname || (ownerUserId ? "ID:" + ownerUserId : getUnknownOwnerLabel(lang));

  return {
    key: ownerKey || "guest",
    isGuest,
    label
  };
}

function setStatus(documentLike: Document, text: string, isError: boolean): void {
  const node = documentLike.getElementById("history-status");
  if (!node) return;
  node.textContent = text;
  (node as HTMLElement).style.color = isError ? "#ff7f7f" : "";
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return !!value && (typeof value === "object" || typeof value === "function") && typeof (value as any).then === "function";
}

async function callStore(windowLike: Window, methodName: string, ...args: unknown[]) {
  const store = (windowLike as any).LocalHistoryStore;
  if (!store) {
    throw new Error("local_history_store_missing");
  }
  let method = store[methodName];
  if (typeof method !== "function") {
    const preferredAsyncName = methodName + "Async";
    method = store[preferredAsyncName];
  }
  if (typeof method !== "function") {
    throw new Error("local_history_method_missing:" + methodName);
  }
  return await method.apply(store, args);
}

function formatDuration(ms: number): string {
  let value = Number(ms);
  if (!Number.isFinite(value) || value < 0) value = 0;
  const totalSec = Math.floor(value / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return h + "h " + m + "m " + s + "s";
  if (m > 0) return m + "m " + s + "s";
  return s + "s";
}

function formatEndedAt(value: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function resolveHistorySecondaryPlacementDiagnosticsEntry(
  item: HistoryRecordViewModel
): HistoryDiagnosticsIndexEntry | null {
  const entries = Array.isArray(item.diagnostics_index_entries) ? item.diagnostics_index_entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    if (entries[i].key === "secondaryTimerPlacement") return entries[i];
  }
  return null;
}

function resolveHistoryDiagnosticsNumeric(payload: unknown, key: string): number {
  if (!payload || typeof payload !== "object") return 0;
  return Number((payload as Record<string, unknown>)[key]) || 0;
}

function buildHistorySecondaryPlacementDiagnosticsSummaryText(entry: HistoryDiagnosticsIndexEntry): string {
  const payload = entry ? entry.payload : null;
  const validCount = resolveHistoryDiagnosticsNumeric(payload, "validPlacementDescriptors");
  const placedCount = resolveHistoryDiagnosticsNumeric(payload, "placed");
  const duplicateCount = resolveHistoryDiagnosticsNumeric(payload, "skippedDuplicate");
  const missingAnchorCount = resolveHistoryDiagnosticsNumeric(payload, "skippedMissingAnchor");
  const keyKinds = resolveHistoryDiagnosticsNumeric(payload, "dedupeKeyKinds");
  return (
    "\u8bca\u65ad secondaryTimerPlacement(v" +
    String(entry.schemaVersion) +
    ")\u00b7 \u6709\u6548 " +
    String(validCount) +
    " \u00b7 \u653e\u7f6e " +
    String(placedCount) +
    " \u00b7 \u53bb\u91cd\u8df3\u8fc7 " +
    String(duplicateCount) +
    " \u00b7 \u951a\u70b9\u7f3a\u5931 " +
    String(missingAnchorCount) +
    " \u00b7 \u53bb\u91cd\u952e\u7c7b " +
    String(keyKinds)
  );
}

function resolveHistoryDiagnosticsSampleText(payload: unknown): string {
  const samples = payload && Array.isArray((payload as any).dedupeKeySamples) ? (payload as any).dedupeKeySamples : [];
  const normalized: string[] = [];
  for (let i = 0; i < samples.length; i += 1) {
    const value = typeof samples[i] === "string" ? samples[i].trim() : "";
    if (!value) continue;
    normalized.push(value);
    if (normalized.length >= 3) break;
  }
  if (!normalized.length) return "";
  return "\u6837\u672c: " + normalized.join(" | ");
}

function appendHistoryDiagnosticsSummary(documentLike: Document, node: HTMLElement, item: HistoryRecordViewModel): void {
  const secondaryPlacementEntry = resolveHistorySecondaryPlacementDiagnosticsEntry(item);
  if (!secondaryPlacementEntry) return;
  const summaryNode = documentLike.createElement("div");
  summaryNode.className = "history-item-diagnostics";
  summaryNode.textContent = buildHistorySecondaryPlacementDiagnosticsSummaryText(secondaryPlacementEntry);
  node.appendChild(summaryNode);

  const sampleText = resolveHistoryDiagnosticsSampleText(secondaryPlacementEntry.payload);
  if (!sampleText) return;
  const sampleNode = documentLike.createElement("div");
  sampleNode.className = "history-item-diagnostics-samples";
  sampleNode.textContent = sampleText;
  node.appendChild(sampleNode);
}

function renderSummary(documentLike: Document, result: Record<string, unknown>, state: HistoryFilterState): void {
  const node = documentLike.getElementById("history-summary");
  if (!node) return;
  const total = Number(result.total) || 0;
  const page = Number(result.page) || Number(state.page) || 1;
  const pageSize = Number(result.page_size) || Number(state.pageSize) || 30;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  node.textContent = "\u5171" + total + " \u6761 \u00b7 \u7b2c " + page + "/" + maxPage + " \u9875";

  const prev = documentLike.getElementById("history-prev-page") as HTMLButtonElement | null;
  const next = documentLike.getElementById("history-next-page") as HTMLButtonElement | null;
  if (prev) prev.disabled = page <= 1;
  if (next) next.disabled = page >= maxPage;
}

function renderList(
  windowLike: Window,
  documentLike: Document,
  items: unknown[],
  controller: ReturnType<typeof createHistoryPageController>,
  lang: "en" | "zh",
  loadHistory: (resetPage: boolean) => Promise<void>
): void {
  const list = documentLike.getElementById("history-list");
  if (!list) return;
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML =
      "<div class='history-item'>" +
      "\u6682\u65e0\u5386\u53f2\u8bb0\u5f55\u3002\u4f60\u53ef\u4ee5\u5f00\u59cb\u4e00\u5c40\u6e38\u620f\u540e\u518d\u56de\u6765\u67e5\u770b\u3002" +
      "</div>";
    return;
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = controller.normalizeRecord(items[i]);
    const modeText = controller.resolveModeLabel(item.mode_key, item.mode);
    const ownerDisplay = normalizeOwnerDisplay(item, lang);
    const node = documentLike.createElement("div");
    node.className = "history-item";
    node.innerHTML =
      "<div class='history-item-head'>" +
        "<strong>" + escapeHtml(modeText) + "</strong>" +
        "<span class='history-owner-tag'>" + escapeHtml(ownerDisplay.label) + "</span>" +
        "<span>\u5206\u6570: " + escapeHtml(Number(item.score) || 0) + "</span>" +
        "<span>\u6700\u5927\u5757: " + escapeHtml(Number(item.best_tile) || 0) + "</span>" +
        "<span>\u65f6\u957f: " + escapeHtml(formatDuration(item.duration_ms)) + "</span>" +
        "<span>\u7ed3\u675f: " + escapeHtml(formatEndedAt(item.ended_at)) + "</span>" +
      "</div>" +
      "<div class='history-item-actions'>" +
        "<button class='replay-button history-replay-btn'>\u56de\u653e</button>" +
        "<button class='replay-button history-export-btn'>\u5bfc\u51fa</button>" +
        "<button class='replay-button history-delete-btn'>\u5220\u9664</button>" +
      "</div>";

    appendHistoryDiagnosticsSummary(documentLike, node, item);

    const boardNode = controller.createBoardPreview(item.final_board);
    if (boardNode) {
      node.appendChild(boardNode);
    }

    const replayBtn = node.querySelector(".history-replay-btn") as HTMLButtonElement | null;
    if (replayBtn) {
      replayBtn.addEventListener("click", () => {
        windowLike.location.href = "replay.html?local_history_id=" + encodeURIComponent(item.id);
      });
    }

    const exportBtn = node.querySelector(".history-export-btn") as HTMLButtonElement | null;
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        try {
          const store = (windowLike as any).LocalHistoryStore;
          const result = store.exportRecords([item.id]);
          const onPayload = (payload: unknown) => {
            const safeMode = toText(item.mode_key || "mode").replace(/[^a-zA-Z0-9_-]/g, "_");
            const filenamePrefix = "history_" + safeMode + "_" + item.id;
            const payloadText = toText(payload);
            store.download(filenamePrefix + ".json", payloadText);
            const replayCode = controller.resolveReplayCode(item.replay_string);
            if (replayCode.trim()) {
              store.download(filenamePrefix + ".txt", replayCode, "text/plain;charset=utf-8");
              setStatus(
                documentLike,
                "\u5df2\u5bfc\u51fa 1 \u6761\u8bb0\u5f55\uff08TXT + JSON\uff09",
                false
              );
              return;
            }
            setStatus(
              documentLike,
              "\u8be5\u8bb0\u5f55\u7f3a\u5c11\u53ef\u5bfc\u5165\u7684\u56de\u653e\u7801\uff0c\u5df2\u5bfc\u51fa JSON",
              true
            );
          };
          if (isPromiseLike(result)) {
            result.then(onPayload).catch(() => {
              setStatus(documentLike, "瀵煎嚭澶辫触", true);
            });
            return;
          }
          onPayload(result);
        } catch (_err) {
          setStatus(documentLike, "瀵煎嚭澶辫触", true);
        }
      });
    }

    const deleteBtn = node.querySelector(".history-delete-btn") as HTMLButtonElement | null;
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!windowLike.confirm("\u786e\u8ba4\u5220\u9664\u8fd9\u6761\u8bb0\u5f55\uff1f")) return;
        const ok = await callStore(windowLike, "deleteById", item.id);
        if (!ok) {
          setStatus(documentLike, "鍒犻櫎澶辫触", true);
          return;
        }
        setStatus(documentLike, "\u5df2\u5220\u9664\u8bb0\u5f55", false);
        await loadHistory(false);
      });
    }

    list.appendChild(node);
  }
}

function readControls(documentLike: Document, state: HistoryFilterState): void {
  const mode = documentLike.getElementById("history-mode") as HTMLSelectElement | null;
  const owner = documentLike.getElementById("history-owner") as HTMLSelectElement | null;
  const keyword = documentLike.getElementById("history-keyword") as HTMLInputElement | null;
  const sort = documentLike.getElementById("history-sort") as HTMLSelectElement | null;
  state.modeKey = mode ? toText(mode.value) : "";
  state.ownerKey = owner ? toText(owner.value) : "";
  state.keyword = keyword ? toText(keyword.value) : "";
  state.sortBy = sort ? toText(sort.value || "ended_desc") : "ended_desc";
}

function applyControls(documentLike: Document, state: HistoryFilterState): void {
  const mode = documentLike.getElementById("history-mode") as HTMLSelectElement | null;
  const owner = documentLike.getElementById("history-owner") as HTMLSelectElement | null;
  const keyword = documentLike.getElementById("history-keyword") as HTMLInputElement | null;
  const sort = documentLike.getElementById("history-sort") as HTMLSelectElement | null;
  if (mode) mode.value = toText(state.modeKey);
  if (owner) owner.value = toText(state.ownerKey);
  if (keyword) keyword.value = toText(state.keyword);
  if (sort) sort.value = toText(state.sortBy || "ended_desc");
}

function initModeFilter(windowLike: Window, documentLike: Document): void {
  const modeSelect = documentLike.getElementById("history-mode") as HTMLSelectElement | null;
  if (!modeSelect) return;
  const catalog = (windowLike as any).ModeCatalog;
  const listModes =
    catalog && typeof catalog.listModes === "function"
      ? catalog.listModes()
      : [];
  for (let i = 0; i < listModes.length; i += 1) {
    const mode = listModes[i] || {};
    if (!mode.key || !mode.label) continue;
    const option = documentLike.createElement("option");
    option.value = String(mode.key);
    option.textContent = String(mode.label);
    modeSelect.appendChild(option);
  }
}

function clearSelectOptions(selectNode: HTMLSelectElement | null): void {
  if (!selectNode) return;
  while (selectNode.options.length > 0) {
    selectNode.remove(0);
  }
}

function sortOwnerEntries(entries: Array<{ isGuest: boolean; label: string }>): void {
  entries.sort((a, b) => {
    if (a.isGuest && !b.isGuest) return 1;
    if (!a.isGuest && b.isGuest) return -1;
    const aLabel = toText(a.label);
    const bLabel = toText(b.label);
    return aLabel.localeCompare(bLabel, "zh-Hans-CN");
  });
}

async function rebuildOwnerFilterOptions(
  windowLike: Window,
  documentLike: Document,
  controller: ReturnType<typeof createHistoryPageController>,
  lang: "en" | "zh",
  selectedOwnerKey: string
): Promise<void> {
  const ownerSelect = documentLike.getElementById("history-owner") as HTMLSelectElement | null;
  if (!ownerSelect) return;

  let records: unknown[] = [];
  try {
    const all = await callStore(windowLike, "getAll");
    records = Array.isArray(all) ? all : [];
  } catch (_err) {
    records = [];
  }

  const ownerMap: Record<string, ReturnType<typeof normalizeOwnerDisplay>> = {};
  for (let i = 0; i < records.length; i += 1) {
    const normalizedRecord = controller.normalizeRecord(records[i]);
    const display = normalizeOwnerDisplay(normalizedRecord, lang);
    if (!display.key) continue;
    if (!ownerMap[display.key]) ownerMap[display.key] = display;
  }

  const owners = Object.keys(ownerMap).map((key) => ownerMap[key]);
  sortOwnerEntries(owners);

  clearSelectOptions(ownerSelect);

  const allOption = documentLike.createElement("option");
  allOption.value = "";
  allOption.textContent = getAllOwnersLabel(lang);
  ownerSelect.appendChild(allOption);

  for (let i = 0; i < owners.length; i += 1) {
    const option = documentLike.createElement("option");
    option.value = owners[i].key;
    option.textContent = owners[i].label;
    ownerSelect.appendChild(option);
  }

  const preferredValue = toText(selectedOwnerKey).trim();
  if (preferredValue) {
    let found = false;
    for (let idx = 0; idx < ownerSelect.options.length; idx += 1) {
      if (toText(ownerSelect.options[idx].value) === preferredValue) {
        found = true;
        break;
      }
    }
    if (!found) {
      const stale = documentLike.createElement("option");
      stale.value = preferredValue;
      stale.textContent = preferredValue === "guest" ? getGuestOwnerLabel(lang) : preferredValue;
      ownerSelect.appendChild(stale);
    }
    ownerSelect.value = preferredValue;
    return;
  }

  ownerSelect.value = "";
}

function bindImport(
  windowLike: Window,
  documentLike: Document,
  loadHistory: (resetPage: boolean) => Promise<void>
): void {
  const importBtn = documentLike.getElementById("history-import-btn") as HTMLButtonElement | null;
  const importReplaceBtn = documentLike.getElementById("history-import-replace-btn") as HTMLButtonElement | null;
  const fileInput = documentLike.getElementById("history-import-file") as HTMLInputElement | null;
  if (!importBtn || !importReplaceBtn || !fileInput) return;
  const fileInputEl = fileInput;

  let merge = true;

  function openPicker(nextMerge: boolean) {
    merge = !!nextMerge;
    fileInputEl.value = "";
    fileInputEl.click();
  }

  importBtn.addEventListener("click", () => {
    openPicker(true);
  });

  importReplaceBtn.addEventListener("click", () => {
    if (!windowLike.confirm("纭瀵煎叆骞舵浛鎹㈠叏閮ㄥ綋鍓嶅巻鍙茶褰曪紵")) return;
    openPicker(false);
  });

  fileInputEl.addEventListener("change", () => {
    const file = fileInputEl.files && fileInputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const result = await callStore(windowLike, "importRecords", text, { merge });
        setStatus(
          documentLike,
          merge
            ? "\u5bfc\u5165\u5b8c\u6210\uff1a\u65b0\u589e " + result.imported + "\uff0c\u66ff\u6362 " + result.replaced
            : "\u5bfc\u5165\u5e76\u66ff\u6362\u5b8c\u6210\uff1a\u603b\u8ba1 " + result.total + " \u6761",
          false
        );
        await loadHistory(true);
      } catch (_err) {
        setStatus(documentLike, "瀵煎叆澶辫触锛氭枃浠舵牸寮忎笉姝ｇ‘", true);
      }
    };
    reader.onerror = () => {
      setStatus(documentLike, "\u5bfc\u5165\u5931\u8d25\uff1a\u6587\u4ef6\u8bfb\u53d6\u9519\u8bef", true);
    };
    reader.readAsText(file, "utf-8");
  });
}

export function bootstrapHistoryPageRuntime(options?: HistoryPageRuntimeOptions): void {
  const windowLike = options?.windowLike || (typeof window !== "undefined" ? window : null);
  const documentLike = options?.documentLike || (typeof document !== "undefined" ? document : null);
  if (!windowLike || !documentLike) return;

  const controller = createHistoryPageController({ windowLike, documentLike });
  const storageLike = resolveStorageByName({
    windowLike: windowLike as unknown as Record<string, unknown>,
    storageName: "localStorage"
  }) as Storage | null;
  const resolveLang = () => getUiLang(storageLike);

  const defaults: HistoryFilterStateDefaults = {
    page: 1,
    pageSize: 30,
    modeKey: "",
    ownerKey: "",
    keyword: "",
    sortBy: "ended_desc"
  };
  const state = controller.readFilterState(defaults);

  const loadHistory = async (resetPage: boolean) => {
    readControls(documentLike, state);
    controller.persistFilterState(state, defaults);
    if (resetPage) state.page = 1;

    try {
      const result = await callStore(windowLike, "listRecords", {
        mode_key: state.modeKey,
        owner_key: state.ownerKey,
        keyword: state.keyword,
        sort_by: state.sortBy,
        page: state.page,
        page_size: state.pageSize
      });
      renderList(
        windowLike,
        documentLike,
        Array.isArray(result.items) ? result.items : [],
        controller,
        resolveLang(),
        loadHistory
      );
      renderSummary(documentLike, result || {}, state);
      await rebuildOwnerFilterOptions(windowLike, documentLike, controller, resolveLang(), state.ownerKey);
      setStatus(documentLike, "", false);
    } catch (_err) {
      setStatus(documentLike, "鍔犺浇鍘嗗彶澶辫触", true);
    }
  };

  const bootstrap = () => {
    if (!(windowLike as any).LocalHistoryStore) {
      setStatus(documentLike, "\u672c\u5730\u5386\u53f2\u6a21\u5757\u672a\u52a0\u8f7d", true);
      return;
    }

    initModeFilter(windowLike, documentLike);
    rebuildOwnerFilterOptions(windowLike, documentLike, controller, resolveLang(), state.ownerKey)
      .then(() => {
        applyControls(documentLike, state);
        loadHistory(true);
      })
      .catch(() => {
        applyControls(documentLike, state);
        loadHistory(true);
      });

    const loadBtn = documentLike.getElementById("history-load-btn") as HTMLButtonElement | null;
    if (loadBtn) {
      loadBtn.addEventListener("click", () => {
        loadHistory(true);
      });
    }

    const mode = documentLike.getElementById("history-mode");
    const owner = documentLike.getElementById("history-owner");
    const sort = documentLike.getElementById("history-sort");
    const keyword = documentLike.getElementById("history-keyword");
    if (mode) mode.addEventListener("change", () => { loadHistory(true); });
    if (owner) owner.addEventListener("change", () => { loadHistory(true); });
    if (sort) sort.addEventListener("change", () => { loadHistory(true); });
    if (keyword) {
      keyword.addEventListener("keydown", (event) => {
        if ((event as KeyboardEvent).key !== "Enter") return;
        event.preventDefault();
        loadHistory(true);
      });
    }

    const prevBtn = documentLike.getElementById("history-prev-page") as HTMLButtonElement | null;
    const nextBtn = documentLike.getElementById("history-next-page") as HTMLButtonElement | null;
    if (prevBtn) {
      prevBtn.addEventListener("click", async () => {
        if (state.page <= 1) return;
        state.page -= 1;
        await loadHistory(false);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", async () => {
        state.page += 1;
        await loadHistory(false);
      });
    }

    const exportAllBtn = documentLike.getElementById("history-export-all-btn") as HTMLButtonElement | null;
    if (exportAllBtn) {
      exportAllBtn.addEventListener("click", () => {
        try {
          const store = (windowLike as any).LocalHistoryStore;
          const result = store.exportRecords();
          const handlePayload = (payload: unknown) => {
            const dateTag = new Date().toISOString().slice(0, 10);
            store.download("2048_local_history_" + dateTag + ".json", toText(payload));
            setStatus(documentLike, "\u5df2\u5bfc\u51fa\u5168\u90e8\u5386\u53f2\u8bb0\u5f55", false);
          };
          if (isPromiseLike(result)) {
            result.then(handlePayload).catch(() => {
              setStatus(documentLike, "瀵煎嚭澶辫触", true);
            });
            return;
          }
          handlePayload(result);
        } catch (_err) {
          setStatus(documentLike, "瀵煎嚭澶辫触", true);
        }
      });
    }

    const clearAllBtn = documentLike.getElementById("history-clear-all-btn") as HTMLButtonElement | null;
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", async () => {
        if (
          !windowLike.confirm(
            "\u786e\u8ba4\u6e05\u7a7a\u5168\u90e8\u672c\u5730\u5386\u53f2\u8bb0\u5f55\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002"
          )
        ) {
          return;
        }
        try {
          await callStore(windowLike, "clearAll");
          setStatus(documentLike, "\u5df2\u6e05\u7a7a\u5168\u90e8\u5386\u53f2\u8bb0\u5f55", false);
          await loadHistory(true);
        } catch (_err) {
          setStatus(documentLike, "娓呯┖澶辫触", true);
        }
      });
    }

    bindImport(windowLike, documentLike, loadHistory);
  };

  if (documentLike.readyState === "loading") {
    documentLike.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
}

