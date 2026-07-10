import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";

const NIGHT_BACKGROUND_STORAGE_KEY = "settings_night_background_enabled_v1";
const UI_LANGUAGE_KEY = "ui_language_v1";

type ModesPageLang = "en" | "zh";

const MODES_PAGE_COPY: Record<
  ModesPageLang,
  {
    title: string;
    homeAria: string;
    logoAlt: string;
    brandTitle: string;
    frequentTitle: string;
    tabListAria: string;
    priority: Record<string, { title: string; subtitle: string }>;
    tabs: Record<string, string>;
    groups: string[];
    links: Record<string, string>;
  }
> = {
  zh: {
    title: "2048 模式选择",
    homeAria: "返回首页",
    logoAlt: "2048 标志",
    brandTitle: "模式选择",
    frequentTitle: "常用模式",
    tabListAria: "模式分类",
    priority: {
      "2048.html": { title: "标准 4×4", subtitle: "不可撤回" },
      "undo_2048.html": { title: "经典 4×4", subtitle: "可撤回" },
      "play.html?mode_key=board_5x5_pow2_no_undo": { title: "5×5", subtitle: "不可撤回" },
      "relay_5x5.html": { title: "5×5 接力", subtitle: "测试版" }
    },
    tabs: {
      standard: "标准",
      fibonacci: "斐波那契",
      diagonal: "八方向",
      capped: "封顶",
      special: "特殊玩法",
      tools: "记录与工具"
    },
    groups: [
      "经典 - 无撤回",
      "经典 - 可撤回",
      "斐波那契 - 无撤回",
      "斐波那契 - 可撤回",
      "八方向模式",
      "封顶模式",
      "禁止目标",
      "规则魔改",
      "记录与工具"
    ],
    links: {
      "2048.html": "4×4",
      "undo_2048.html": "4×4",
      "play.html?mode_key=fib_4x4_no_undo": "斐波那契 4×4",
      "play.html?mode_key=fib_3x3_no_undo": "斐波那契 3×3",
      "play.html?mode_key=fib_4x3_no_undo": "斐波那契 4×3",
      "play.html?mode_key=fib_4x2_no_undo": "斐波那契 4×2",
      "play.html?mode_key=fib_4x4_undo": "斐波那契 4×4",
      "play.html?mode_key=fib_3x3_undo": "斐波那契 3×3",
      "play.html?mode_key=fib_4x3_undo": "斐波那契 4×3",
      "play.html?mode_key=fib_4x2_undo": "斐波那契 4×2",
      "play.html?mode_key=board_3x3_pow2_no_undo": "3×3",
      "play.html?mode_key=board_3x4_pow2_no_undo": "4×3",
      "play.html?mode_key=board_2x4_pow2_no_undo": "4×2",
      "play.html?mode_key=board_5x5_pow2_no_undo": "5×5",
      "play.html?mode_key=board_6x6_pow2_no_undo": "6×6",
      "play.html?mode_key=board_7x7_pow2_no_undo": "7×7",
      "play.html?mode_key=board_8x8_pow2_no_undo": "8×8",
      "play.html?mode_key=board_9x9_pow2_no_undo": "9×9",
      "play.html?mode_key=board_10x10_pow2_no_undo": "10×10",
      "play.html?mode_key=board_3x3_pow2_undo": "3×3",
      "play.html?mode_key=board_3x4_pow2_undo": "4×3",
      "play.html?mode_key=board_2x4_pow2_undo": "4×2",
      "play.html?mode_key=board_5x5_pow2_undo": "5×5",
      "play.html?mode_key=board_6x6_pow2_undo": "6×6",
      "play.html?mode_key=board_7x7_pow2_undo": "7×7",
      "play.html?mode_key=board_8x8_pow2_undo": "8×8",
      "play.html?mode_key=board_9x9_pow2_undo": "9×9",
      "play.html?mode_key=board_10x10_pow2_undo": "10×10",
      "play.html?mode_key=spawn_custom_4x4_pow2_no_undo": "4×4 自定义4率",
      "play.html?mode_key=spawn50_3x3_pow2_no_undo": "3×3 概率50/50",
      "play.html?mode_key=limit3_4x4_pow2_no_undo": "限次撤回（3次）",
      "play.html?mode_key=limit5_4x4_pow2_no_undo": "限次撤回（5次）",
      "play.html?mode_key=combo_4x4_pow2_no_undo": "连击加分",
      "play.html?mode_key=dirlock5_4x4_pow2_no_undo": "方向锁",
      "play.html?mode_key=obstacle_4x4_pow2_no_undo": "障碍墙",
      "play.html?mode_key=item_4x4_pow2_no_undo": "4×4 道具模式",
      "play.html?mode_key=stone_4x4_pow2_no_undo": "4×4 石头模式",
      "play.html?mode_key=timed5s_4x4_pow2_no_undo": "4×4 限时5秒",
      "play.html?mode_key=nox_4x4_pow2_no_undo": "No X（64~32k）",
      "relay_5x5.html": "5×5 接力模式",
      "play.html?mode_key=diag_3x3_pow2_no_undo": "3×3 八方向",
      "play.html?mode_key=diag_4x4_pow2_no_undo": "4×4 八方向",
      "play.html?mode_key=diag_3x4_pow2_no_undo": "4×3 八方向",
      "play.html?mode_key=diag_2x4_pow2_no_undo": "4×2 八方向",
      "play.html?mode_key=capped_4x4_pow2_64_no_undo": "4×4 封顶64",
      "play.html?mode_key=capped_4x4_pow2_1024_no_undo": "4×4 封顶1024",
      "play.html?mode_key=capped_4x4_pow2_no_undo": "4×4 封顶2048",
      "play.html?mode_key=capped_4x4_pow2_4096_no_undo": "4×4 封顶4096",
      "Practice_board.html?practice_fresh=1": "练习板",
      "PKU2048.html?practice_fresh=1": "PKU2048 练习板",
      "history.html": "历史",
      "replay.html": "回放",
      "palette.html": "主题色板",
      "account.html": "排行榜"
    }
  },
  en: {
    title: "2048 Modes",
    homeAria: "Back to Home",
    logoAlt: "2048 Logo",
    brandTitle: "Mode Selection",
    frequentTitle: "Common Modes",
    tabListAria: "Mode categories",
    priority: {
      "2048.html": { title: "Standard 4x4", subtitle: "No Undo" },
      "undo_2048.html": { title: "Classic 4x4", subtitle: "Undo" },
      "play.html?mode_key=board_5x5_pow2_no_undo": { title: "5x5", subtitle: "No Undo" },
      "relay_5x5.html": { title: "5x5 Relay", subtitle: "Beta" }
    },
    tabs: {
      standard: "Standard",
      fibonacci: "Fibonacci",
      diagonal: "8 Directions",
      capped: "Capped",
      special: "Special",
      tools: "Records & Tools"
    },
    groups: [
      "Classic - No Undo",
      "Classic - Undo",
      "Fibonacci - No Undo",
      "Fibonacci - Undo",
      "8-Direction Modes",
      "Capped Modes",
      "Target Ban",
      "Rule Variants",
      "Records & Tools"
    ],
    links: {
      "2048.html": "4x4",
      "undo_2048.html": "4x4",
      "play.html?mode_key=fib_4x4_no_undo": "Fibonacci 4x4",
      "play.html?mode_key=fib_3x3_no_undo": "Fibonacci 3x3",
      "play.html?mode_key=fib_4x3_no_undo": "Fibonacci 4x3",
      "play.html?mode_key=fib_4x2_no_undo": "Fibonacci 4x2",
      "play.html?mode_key=fib_4x4_undo": "Fibonacci 4x4",
      "play.html?mode_key=fib_3x3_undo": "Fibonacci 3x3",
      "play.html?mode_key=fib_4x3_undo": "Fibonacci 4x3",
      "play.html?mode_key=fib_4x2_undo": "Fibonacci 4x2",
      "play.html?mode_key=spawn_custom_4x4_pow2_no_undo": "4x4 Custom 4-Rate",
      "play.html?mode_key=spawn50_3x3_pow2_no_undo": "3x3 Spawn 50/50",
      "play.html?mode_key=limit3_4x4_pow2_no_undo": "Limited Undo (3)",
      "play.html?mode_key=limit5_4x4_pow2_no_undo": "Limited Undo (5)",
      "play.html?mode_key=combo_4x4_pow2_no_undo": "Combo Scoring",
      "play.html?mode_key=dirlock5_4x4_pow2_no_undo": "Direction Lock",
      "play.html?mode_key=obstacle_4x4_pow2_no_undo": "Obstacle Blocks",
      "play.html?mode_key=item_4x4_pow2_no_undo": "4x4 Item Mode",
      "play.html?mode_key=stone_4x4_pow2_no_undo": "4x4 Stone Mode",
      "play.html?mode_key=timed5s_4x4_pow2_no_undo": "4x4 Timed 5s",
      "play.html?mode_key=nox_4x4_pow2_no_undo": "NO X (64-32k)",
      "relay_5x5.html": "5x5 Relay Mode",
      "play.html?mode_key=diag_3x3_pow2_no_undo": "3x3 8-Direction",
      "play.html?mode_key=diag_4x4_pow2_no_undo": "4x4 8-Direction",
      "play.html?mode_key=diag_3x4_pow2_no_undo": "4x3 8-Direction",
      "play.html?mode_key=diag_2x4_pow2_no_undo": "4x2 8-Direction",
      "play.html?mode_key=capped_4x4_pow2_64_no_undo": "4x4 Capped 64",
      "play.html?mode_key=capped_4x4_pow2_1024_no_undo": "4x4 Capped 1024",
      "play.html?mode_key=capped_4x4_pow2_no_undo": "4x4 Capped 2048",
      "play.html?mode_key=capped_4x4_pow2_4096_no_undo": "4x4 Capped 4096",
      "Practice_board.html?practice_fresh=1": "Practice Board",
      "PKU2048.html?practice_fresh=1": "PKU2048 Practice Board",
      "history.html": "History",
      "replay.html": "Replay",
      "palette.html": "Theme Palette",
      "account.html": "Leaderboard"
    }
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
  return safeReadStorageItem({
    storageLike,
    key: NIGHT_BACKGROUND_STORAGE_KEY
  }) === "1";
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

function normalizeModesPageLang(value: unknown): ModesPageLang | "" {
  const lang = String(value || "").trim().toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("zh")) return "zh";
  return "";
}

function resolveModesPageLang(): ModesPageLang {
  if (typeof window !== "undefined") {
    try {
      const i18n = (window as any).UII18N;
      const fromI18n = normalizeModesPageLang(
        i18n && typeof i18n.getLanguage === "function" ? i18n.getLanguage() : ""
      );
      if (fromI18n) return fromI18n;
    } catch (_errI18n) {}
    try {
      const storageLike = resolveStorageByName({
        windowLike: window as unknown as Record<string, unknown>,
        storageName: "localStorage"
      });
      const fromStorage = normalizeModesPageLang(
        safeReadStorageItem({
          storageLike,
          key: UI_LANGUAGE_KEY
        })
      );
      if (fromStorage) return fromStorage;
    } catch (_errStorage) {}
  }
  if (typeof document !== "undefined" && document.documentElement) {
    const fromDocument = normalizeModesPageLang(
      document.documentElement.getAttribute("data-ui-lang") || document.documentElement.getAttribute("lang")
    );
    if (fromDocument) return fromDocument;
  }
  return "zh";
}

function resolveRelayLinkLabel(): string {
  return resolveModesPageLang() === "en" ? "5x5 Relay Mode (MVP)" : "5×5 接力模式（试用版）";
}

function applyPriorityCardCopy(card: Element, copy: (typeof MODES_PAGE_COPY)[ModesPageLang]): void {
  const href = card.getAttribute("href") || "";
  const item = copy.priority[href];
  if (!item) return;
  const title = card.querySelector("strong");
  const subtitle = card.querySelector("small");
  if (title) title.textContent = item.title;
  if (subtitle) subtitle.textContent = item.subtitle;
}

function applyModesPageLanguage(): void {
  if (typeof document === "undefined") return;
  const lang = resolveModesPageLang();
  const copy = MODES_PAGE_COPY[lang];
  document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-CN");
  document.documentElement.setAttribute("data-ui-lang", lang);
  document.title = copy.title;

  const homeLink = document.querySelector(".mode-brand-panel a");
  if (homeLink) homeLink.setAttribute("aria-label", copy.homeAria);
  const logo = document.querySelector(".mode-brand-logo");
  if (logo) logo.setAttribute("alt", copy.logoAlt);
  const title = document.querySelector(".mode-brand-title");
  if (title) title.textContent = copy.brandTitle;
  const frequent = document.querySelector(".mode-frequent-title");
  if (frequent) frequent.textContent = copy.frequentTitle;
  const tabList = document.querySelector(".mode-tab-bar");
  if (tabList) tabList.setAttribute("aria-label", copy.tabListAria);

  document.querySelectorAll(".mode-priority-card").forEach((card) => {
    applyPriorityCardCopy(card, copy);
  });
  document.querySelectorAll(".mode-tab-button[data-tab-target]").forEach((button) => {
    const key = button.getAttribute("data-tab-target") || "";
    if (copy.tabs[key]) button.textContent = copy.tabs[key];
  });
  document.querySelectorAll(".mode-group-title").forEach((node, index) => {
    if (copy.groups[index]) node.textContent = copy.groups[index];
  });
  document.querySelectorAll(".mode-hub-btn").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (copy.links[href]) link.textContent = copy.links[href];
  });
}

function ensureRelayModeEntry(): void {
  if (typeof document === "undefined") return;
  const existing = document.querySelector("a[data-mode-relay='5x5']");
  if (existing) return;
  const actionRow = document.querySelector(".mode-key-actions");
  if (!actionRow) return;
  const link = document.createElement("a");
  link.className = "mode-hub-btn";
  link.href = "relay_5x5.html";
  link.setAttribute("data-mode-relay", "5x5");
  link.textContent = resolveRelayLinkLabel();
  actionRow.appendChild(link);
}

export function bootstrapModesPage(): void {
  if (typeof document === "undefined") {
    return;
  }

  syncNightBackgroundAttribute();
  applyModesPageLanguage();
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  if (document.body) {
    document.body.setAttribute("data-page-family", "modes");
  }
  ensureRelayModeEntry();

  window.addEventListener("uilanguagechange", () => {
    applyModesPageLanguage();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === NIGHT_BACKGROUND_STORAGE_KEY) {
      syncNightBackgroundAttribute();
    }
    if (!event.key || event.key === UI_LANGUAGE_KEY) {
      applyModesPageLanguage();
    }
  });
}
