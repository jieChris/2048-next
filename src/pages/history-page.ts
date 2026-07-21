import { runRefactorCutoverMigration } from "../bootstrap/refactor-cutover-migration";
import { resolveHistoryLocalStore } from "../bootstrap/history-local-store";
import { resolveHistoryModeCatalog } from "../bootstrap/history-mode-catalog";
import { createHistoryStorageRuntime } from "../bootstrap/history-storage-runtime";
import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";
import { bootstrapHistoryPageRuntime } from "./history-page-runtime";

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";
const UI_LANGUAGE_KEY = "ui_language_v1";

type HistoryStaticLang = "en" | "zh";

const HISTORY_STATIC_COPY: Record<
  HistoryStaticLang,
  {
    pageTitle: string;
    title: string;
    navHome: string;
    navModes: string;
    navReplay: string;
    undo: string;
    undoDisabled: string;
    undoEnabled: string;
    mode: string;
    owner: string;
    allOwners: string;
    keyword: string;
    keywordPlaceholder: string;
    sort: string;
    sortEndedDesc: string;
    sortEndedAsc: string;
    sortScoreDesc: string;
    sortBoardSumDesc: string;
    refresh: string;
    exportAll: string;
    clearAll: string;
    prev: string;
    next: string;
  }
> = {
  zh: {
    pageTitle: "2048 本地历史记录",
    title: "本地历史",
    navHome: "首页",
    navModes: "模式",
    navReplay: "回放",
    undo: "撤回",
    undoDisabled: "无撤回",
    undoEnabled: "可撤回",
    mode: "模式",
    owner: "归属",
    allOwners: "全部归属",
    keyword: "关键词",
    keywordPlaceholder: "模式/分数/盘面和/编号",
    sort: "排序",
    sortEndedDesc: "按时间（新到旧）",
    sortEndedAsc: "按时间（旧到新）",
    sortScoreDesc: "按分数（高到低）",
    sortBoardSumDesc: "按盘面和（高到低）",
    refresh: "刷新",
    exportAll: "导出全部",
    clearAll: "清空全部",
    prev: "上一页",
    next: "下一页"
  },
  en: {
    pageTitle: "2048 Local History",
    title: "Local History",
    navHome: "Home",
    navModes: "Modes",
    navReplay: "Replay",
    undo: "Undo",
    undoDisabled: "No Undo",
    undoEnabled: "Undo",
    mode: "Mode",
    owner: "Owner",
    allOwners: "All Owners",
    keyword: "Keyword",
    keywordPlaceholder: "Mode / Score / Board Sum / ID",
    sort: "Sort",
    sortEndedDesc: "By Time (Newest First)",
    sortEndedAsc: "By Time (Oldest First)",
    sortScoreDesc: "By Score (High to Low)",
    sortBoardSumDesc: "By Board Sum (High to Low)",
    refresh: "Refresh",
    exportAll: "Export All",
    clearAll: "Clear All",
    prev: "Prev",
    next: "Next"
  }
};

function readNightBackgroundPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  return (
    safeReadStorageItem({
      storageLike,
      key: NIGHT_BACKGROUND_STORAGE_KEY
    }) === "1"
  );
}

function normalizeHistoryStaticLang(value: unknown): HistoryStaticLang | "" {
  const lang = String(value || "").trim().toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("zh")) return "zh";
  return "";
}

function resolveHistoryStaticLang(): HistoryStaticLang {
  if (typeof window !== "undefined") {
    try {
      const i18n = (window as any).UII18N;
      const fromI18n = normalizeHistoryStaticLang(
        i18n && typeof i18n.getLanguage === "function" ? i18n.getLanguage() : ""
      );
      if (fromI18n) return fromI18n;
    } catch (_errI18n) {}
    try {
      const storageLike = resolveStorageByName({
        windowLike: window as unknown as Record<string, unknown>,
        storageName: "localStorage"
      });
      const fromStorage = normalizeHistoryStaticLang(
        safeReadStorageItem({
          storageLike,
          key: UI_LANGUAGE_KEY
        })
      );
      if (fromStorage) return fromStorage;
    } catch (_errStorage) {}
  }
  if (typeof document !== "undefined" && document.documentElement) {
    const fromDocument = normalizeHistoryStaticLang(
      document.documentElement.getAttribute("data-ui-lang") || document.documentElement.getAttribute("lang")
    );
    if (fromDocument) return fromDocument;
  }
  return "zh";
}

function setText(selector: string, text: string): void {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function setSelectOptionText(selector: string, text: string): void {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function applyHistoryTitleText(text: string): void {
  const title = document.querySelector(".portal-header .title");
  if (!title) return;
  let updated = false;
  title.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = " " + text;
      updated = true;
    }
  });
  if (!updated) title.appendChild(document.createTextNode(" " + text));
}

function applyHistoryPageLanguage(): void {
  const lang = resolveHistoryStaticLang();
  const copy = HISTORY_STATIC_COPY[lang];
  document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-CN");
  document.documentElement.setAttribute("data-ui-lang", lang);
  document.title = copy.pageTitle;
  applyHistoryTitleText(copy.title);
  setText("#history-page-back", copy.navHome);
  const navLinks = document.querySelectorAll(".portal-nav a");
  if (navLinks[0]) navLinks[0].textContent = copy.navModes;
  if (navLinks[1]) navLinks[1].textContent = copy.navReplay;

  const labels = document.querySelectorAll(".portal-card .portal-actions-inline label");
  if (labels[0]) labels[0].textContent = copy.undo;
  if (labels[1]) labels[1].textContent = copy.mode;
  if (labels[2]) labels[2].textContent = copy.owner;
  if (labels[3]) labels[3].textContent = copy.keyword;
  if (labels[4]) labels[4].textContent = copy.sort;

  setSelectOptionText("#history-undo option[value='no_undo']", copy.undoDisabled);
  setSelectOptionText("#history-undo option[value='undo']", copy.undoEnabled);
  setSelectOptionText("#history-owner option[value='']", copy.allOwners);
  const keyword = document.getElementById("history-keyword") as HTMLInputElement | null;
  if (keyword) keyword.placeholder = copy.keywordPlaceholder;
  setSelectOptionText("#history-sort option[value='ended_desc']", copy.sortEndedDesc);
  setSelectOptionText("#history-sort option[value='ended_asc']", copy.sortEndedAsc);
  setSelectOptionText("#history-sort option[value='score_desc']", copy.sortScoreDesc);
  setSelectOptionText("#history-sort option[value='board_sum_desc']", copy.sortBoardSumDesc);
  setText("#history-load-btn", copy.refresh);
  setText("#history-export-all-btn", copy.exportAll);
  setText("#history-clear-all-btn", copy.clearAll);
  setText("#history-prev-page", copy.prev);
  setText("#history-next-page", copy.next);
}

function syncNightBackgroundAttribute(): void {
  if (typeof document === "undefined" || !document.documentElement) {
    return;
  }
  if (readNightBackgroundPreference()) {
    document.documentElement.setAttribute("data-night-background", "1");
    return;
  }
  document.documentElement.removeAttribute("data-night-background");
}

export function bootstrapHistoryPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  syncNightBackgroundAttribute();
  applyHistoryPageLanguage();
  runRefactorCutoverMigration(window);
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "history");
  }
  if (typeof window !== "undefined") {
    window.addEventListener("uilanguagechange", () => {
      applyHistoryPageLanguage();
    });
    window.addEventListener("storage", (event) => {
      if (!event || !event.key || event.key === NIGHT_BACKGROUND_STORAGE_KEY) {
        syncNightBackgroundAttribute();
      }
      if (!event || !event.key || event.key === UI_LANGUAGE_KEY) {
        applyHistoryPageLanguage();
      }
    });
  }
  bootstrapHistoryPageRuntime({
    windowLike: window,
    documentLike: document,
    modeCatalog: resolveHistoryModeCatalog(window),
    storageRuntime: createHistoryStorageRuntime(),
    historyStore: resolveHistoryLocalStore(window)
  });
}
