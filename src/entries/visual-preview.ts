import { resolveStorageByName, safeReadStorageItem } from "../bootstrap/storage";

type PreviewPageKey = "game" | "practice" | "account" | "account-settings" | "achievements" | "relay";
type PreviewDevice = "desktop" | "mobile";
type PreviewTheme = "light" | "night";
interface PreviewPageDefinition {
  path: string;
  zh: string;
  en: string;
}

const PREVIEW_PAGES: Record<PreviewPageKey, PreviewPageDefinition> = {
  game: { path: "2048.html", zh: "标准游戏", en: "Standard Game" },
  practice: { path: "Practice_board.html", zh: "练习板", en: "Practice Board" },
  account: { path: "account.html", zh: "排行榜", en: "Leaderboard" },
  "account-settings": { path: "account_settings.html", zh: "账号设置", en: "Account Settings" },
  achievements: { path: "medal-wall.html", zh: "成就", en: "Achievements" },
  relay: { path: "relay_5x5.html", zh: "接力工具", en: "Relay Tools" }
};

const COPY = {
  zh: {
    documentTitle: "2048 NEXT 经典棋盘工坊预览",
    title: "经典棋盘工坊",
    readonly: "只读预览",
    previewControls: "预览控制",
    pagePicker: "预览页面",
    devicePicker: "预览设备",
    themePicker: "预览主题",
    pageGame: "标准游戏",
    pagePractice: "练习板",
    pageAccount: "排行榜",
    pageSettings: "账号设置",
    pageAchievements: "成就",
    pageRelay: "接力工具",
    desktop: "桌面",
    mobile: "移动",
    light: "浅色",
    night: "夜间",
    candidate: "经典棋盘工坊",
    candidateFrameTitle: "经典棋盘工坊候选样式"
  },
  en: {
    documentTitle: "2048 NEXT Classic Workshop Preview",
    title: "Classic Workshop",
    readonly: "Read-only Preview",
    previewControls: "Preview Controls",
    pagePicker: "Preview Page",
    devicePicker: "Preview Device",
    themePicker: "Preview Theme",
    pageGame: "Standard Game",
    pagePractice: "Practice Board",
    pageAccount: "Leaderboard",
    pageSettings: "Account Settings",
    pageAchievements: "Achievements",
    pageRelay: "Relay Tools",
    desktop: "Desktop",
    mobile: "Mobile",
    light: "Light",
    night: "Night",
    candidate: "Classic Workshop",
    candidateFrameTitle: "Classic Workshop Candidate Preview"
  }
} as const;

const state: { page: PreviewPageKey; device: PreviewDevice; theme: PreviewTheme } = {
  page: "game",
  device: "desktop",
  theme: "light"
};

const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>("[data-preview-frame]"));
const stage = document.querySelector<HTMLElement>("[data-preview-stage]");

function currentLanguage(): "zh" | "en" {
  const storageLike = resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage"
  });
  return String(safeReadStorageItem({ storageLike, key: "ui_language_v1" }) || "")
    .toLowerCase()
    .startsWith("en") ? "en" : "zh";
}

function applyLanguage(): void {
  const language = currentLanguage();
  const messages = COPY[language];
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  document.title = messages.documentTitle;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n as keyof typeof messages | undefined;
    if (key && messages[key]) node.textContent = messages[key];
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((node) => {
    const key = node.dataset.i18nAria as keyof typeof messages | undefined;
    if (key && messages[key]) node.setAttribute("aria-label", messages[key]);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((node) => {
    const key = node.dataset.i18nTitle as keyof typeof messages | undefined;
    if (key && messages[key]) node.setAttribute("title", messages[key]);
  });
}

function previewPageUrl(pageKey: PreviewPageKey): string {
  return `${PREVIEW_PAGES[pageKey].path}?visual_preview=1`;
}

function applyTheme(documentLike: Document): void {
  if (state.theme === "night") {
    documentLike.documentElement.setAttribute("data-night-background", "1");
    documentLike.documentElement.style.colorScheme = "dark";
  } else {
    documentLike.documentElement.removeAttribute("data-night-background");
    documentLike.documentElement.style.colorScheme = "light";
  }
}

function blockEvent(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function installSafety(documentLike: Document): void {
  const root = documentLike.documentElement;
  if (root.dataset.previewSafetyBound === "1") return;
  root.dataset.previewSafetyBound = "1";

  documentLike.addEventListener("submit", blockEvent, true);
  documentLike.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (!target || typeof target.closest !== "function") return;
    if (target.closest("a[href]")) {
      blockEvent(event);
      return;
    }
    const filter = target.closest<HTMLButtonElement>(".achievement-filter");
    if (filter) {
      blockEvent(event);
      filter.parentElement?.querySelectorAll(".achievement-filter").forEach((node) => {
        node.classList.toggle("is-active", node === filter);
      });
      return;
    }
    const button = target.closest<HTMLButtonElement>("button");
    if (!button) return;
    if (button.matches([
      "#top-settings-btn",
      "#stats-panel-toggle",
      "#top-announcement-btn",
      "#top-mode-intro-btn",
      "#top-actions-expand-toggle",
      "#timerbox-toggle-btn",
      "#top-mobile-hint-btn",
      "#practice-mode-picker-btn",
      "#practice-board-code-btn",
      "#stats-panel-close",
      "#announcement-close-btn",
      "#mode-intro-close-btn",
      "#practice-mode-close",
      "#mobile-hint-close-btn",
      "[id$='-close']",
      "[id$='-close-btn']"
    ].join(","))) return;
    blockEvent(event);
  }, true);
}

function accountFixture(documentLike: Document): void {
  const host = documentLike.getElementById("account-board-list");
  if (!host) return;
  const rows = [
    ["1", "Classic-2048", "458216", "今天"],
    ["2", "NEXT-Player", "262144", "昨天"],
    ["3", "Workshop", "131072", "3 天前"]
  ];
  host.innerHTML = rows.map((row, index) =>
    `<div class="account-board-row is-rank-top${index + 1}">` +
      `<span class="account-rank">${row[0]}</span>` +
      `<span class="account-name">${row[1]}</span>` +
      `<span class="account-score">${row[2]}</span>` +
      `<span class="account-date">${row[3]}</span>` +
    "</div>"
  ).join("");
  host.setAttribute("data-board-state", "ready");
  const values: Record<string, string> = {
    "account-summary-user": "预览用户",
    "account-summary-mode": "4x4 无撤回",
    "account-summary-refresh": "刚刚"
  };
  Object.entries(values).forEach(([id, value]) => {
    const node = documentLike.getElementById(id);
    if (node) node.textContent = value;
  });
  const tip = documentLike.getElementById("account-board-tip");
  if (tip) tip.textContent = "";
}

function achievementFixture(documentLike: Document): void {
  const list = documentLike.getElementById("achievements-list");
  if (!list) return;
  const items = [
    ["初见 2048", "首次合成 2048 方块", "已获得", "2048"],
    ["速度练习", "在限定时间内达到 512", "已获得", "512"],
    ["棋盘工坊", "完成一次自定义练习", "已获得", "练"],
    ["更远一步", "等待下一次突破", "未获得", "?"]
  ];
  list.innerHTML = items.map((item, index) =>
    `<button class="achievement-card${index === 3 ? " is-locked" : ""}" type="button">` +
      `<span class="achievement-light-state">${item[2]}</span>` +
      `<span class="achievement-medal-face"><span class="achievement-badge">${item[3]}</span></span>` +
      `<span class="achievement-name">${item[0]}</span>` +
      `<span class="achievement-desc">${item[1]}</span>` +
      `<span class="achievement-meta">${index === 3 ? "等待达成" : "预览记录"}</span>` +
    "</button>"
  ).join("");
  const stats = documentLike.getElementById("achievements-stats");
  if (stats) {
    stats.innerHTML = [
      ["3", "已获得"],
      ["4", "总成就"],
      ["75%", "完成度"]
    ].map(([value, label]) => `<div class="achievement-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  }
  const status = documentLike.getElementById("achievements-status");
  if (status) status.textContent = "预览";
  const summary = documentLike.getElementById("achievements-summary-copy");
  if (summary) summary.textContent = "当前已点亮 3 项成就。";
}

function relayFixture(documentLike: Document): void {
  const body = documentLike.getElementById("relay-case-table-body");
  if (!body) return;
  body.innerHTML = [
    ["NEXT-01", "预览玩家", "刚刚", "可申请"],
    ["NEXT-02", "Classic", "12 分钟前", "进行中"]
  ].map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
  const note = documentLike.getElementById("relay-note");
  if (note) note.textContent = "只读示例状态";
}

function applyFixture(documentLike: Document): void {
  documentLike.documentElement.dataset.previewFixture = "1";
  if (state.page === "account") accountFixture(documentLike);
  if (state.page === "achievements") achievementFixture(documentLike);
  if (state.page === "relay") relayFixture(documentLike);
}

function prepareFrame(frame: HTMLIFrameElement): void {
  const documentLike = frame.contentDocument;
  if (!documentLike?.documentElement) return;
  documentLike.documentElement.dataset.visualPreviewFrame = "candidate";
  applyTheme(documentLike);
  installSafety(documentLike);
  applyFixture(documentLike);
  window.setTimeout(() => {
    applyTheme(documentLike);
    applyFixture(documentLike);
  }, 500);
  window.setTimeout(() => {
    applyTheme(documentLike);
    applyFixture(documentLike);
  }, 1400);
}

function syncViewportSizes(): void {
  if (!stage) return;
  const width = state.device === "mobile" ? 390 : 1180;
  const height = state.device === "mobile" ? 844 : 760;
  stage.dataset.activeDevice = state.device;
  document.querySelectorAll<HTMLElement>("[data-preview-viewport]").forEach((viewport) => {
    const frame = viewport.querySelector<HTMLIFrameElement>("iframe");
    if (!frame) return;
    viewport.style.width = `${width}px`;
    viewport.style.height = `${height}px`;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.transform = "none";
  });
}

function syncLabels(): void {
  const language = currentLanguage();
  const label = PREVIEW_PAGES[state.page][language];
  document.querySelectorAll<HTMLElement>("[data-preview-candidate-label]").forEach((node) => {
    node.textContent = label;
  });
}

function loadPage(pageKey: PreviewPageKey): void {
  state.page = pageKey;
  const src = previewPageUrl(pageKey);
  frames.forEach((frame) => {
    frame.src = src;
  });
  document.querySelectorAll<HTMLButtonElement>("[data-preview-page-key]").forEach((button) => {
    const active = button.dataset.previewPageKey === pageKey;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  syncLabels();
}

function setDevice(device: PreviewDevice): void {
  state.device = device;
  document.querySelectorAll<HTMLButtonElement>("[data-preview-device]").forEach((button) => {
    const active = button.dataset.previewDevice === device;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  syncViewportSizes();
}

function setTheme(theme: PreviewTheme): void {
  state.theme = theme;
  document.querySelectorAll<HTMLButtonElement>("[data-preview-theme]").forEach((button) => {
    const active = button.dataset.previewTheme === theme;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  frames.forEach((frame) => {
    if (frame.contentDocument) applyTheme(frame.contentDocument);
  });
}

frames.forEach((frame) => frame.addEventListener("load", () => prepareFrame(frame)));
document.querySelectorAll<HTMLButtonElement>("[data-preview-page-key]").forEach((button) => {
  button.addEventListener("click", () => loadPage(button.dataset.previewPageKey as PreviewPageKey));
});
document.querySelectorAll<HTMLButtonElement>("[data-preview-device]").forEach((button) => {
  button.addEventListener("click", () => setDevice(button.dataset.previewDevice as PreviewDevice));
});
document.querySelectorAll<HTMLButtonElement>("[data-preview-theme]").forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.previewTheme as PreviewTheme));
});

applyLanguage();
syncLabels();
syncViewportSizes();
frames.forEach((frame) => {
  if (frame.contentDocument?.readyState === "complete") prepareFrame(frame);
});
window.addEventListener("resize", syncViewportSizes);
if (typeof ResizeObserver === "function" && stage) new ResizeObserver(syncViewportSizes).observe(stage);
