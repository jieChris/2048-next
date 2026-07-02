import {
  createBrowserStorageAccess,
  readStorageValue,
  removeStorageValue,
  writeStorageValue
} from "../storage/browser-storage";
import { createStone2kMonitorService } from "../services/stone-2k-monitor";

type Capped2kRun = {
  id?: unknown;
  user_id?: unknown;
  nickname?: unknown;
  score?: unknown;
  best_tile?: unknown;
  duration_ms?: unknown;
  ended_at?: unknown;
  end_reason?: unknown;
  final_board?: unknown;
  created_at?: unknown;
};

type ApiResult = {
  success?: unknown;
  data?: unknown;
  rows?: unknown;
  error?: unknown;
  message?: unknown;
  code?: unknown;
  total?: unknown;
};

type StatusState = "idle" | "busy" | "ok" | "err";
type LockState = "locked" | "unlocked";
type PageLang = "zh" | "en";

const REFRESH_INTERVAL_MS = 15000;
const MONITOR_ACCESS_PASSCODE = "stone2k-_gjWBeZM7fDtML0SaQDr7ZKE3oa7c6pwi2f4qN13B7w";
const MONITOR_ACCESS_STORAGE_KEY = "stone-2k-monitor.access-granted";
const UI_LANGUAGE_KEY = "ui_language_v1";

const COPY: Record<PageLang, Record<string, string>> = {
  zh: {
    title: "2K 封顶成绩监测",
    gateHeading: "输入访问口令",
    gateCopy: "该页面仅供内部查看。输入正确口令后，才会加载监测内容。",
    passcode: "访问口令",
    passcodePlaceholder: "请输入访问口令",
    passcodeError: "口令错误，请重新输入。",
    enterMonitor: "进入监测页",
    backModes: "返回模式列表",
    heroTitle: "2K 封顶成绩监测",
    heroCopy: "独立查看 4x4 2048 封顶模式上传的隐藏统计，不进入公开排行榜。",
    badgeLocked: "需要访问口令",
    badgeUnlocked: "已验证访问口令",
    hintLocked: "输入访问口令后，才会加载该监测页的数据。",
    hintUnlocked: "当前会话已解锁，可查看实时成绩、盘面和筛选结果。",
    relock: "重新上锁",
    navAria: "页面导航",
    modes: "模式列表",
    startCapped: "开始封顶模式",
    filterAria: "筛选与刷新",
    names: "玩家昵称列表",
    namesPlaceholder: "留空查看全部；多个昵称可用换行、逗号、中文逗号分隔。",
    namesHelp: "支持单个昵称精查，也支持一次监控多个玩家。",
    limit: "条数",
    sort: "排序",
    scoreDesc: "分数降序",
    scoreAsc: "分数升序",
    timeDesc: "时间降序",
    timeAsc: "时间升序",
    startAt: "开始时间",
    endAt: "结束时间",
    latestOnly: "每人仅最高一条",
    autoRefresh: "自动刷新",
    refresh: "刷新数据",
    preparing: "正在准备数据源…",
    statsAria: "概览统计",
    count: "记录数",
    bestScore: "最高分",
    bestTile: "最高砖块",
    latest: "最近上传",
    runsTitle: "实时成绩",
    runsCopy: "按分数降序展示，点击一行可预览最终盘面。",
    exportJson: "导出 JSON",
    previewTitle: "盘面预览",
    previewMeta: "选择一条成绩查看详情。",
    noBoard: "暂无盘面",
    player: "玩家",
    score: "分数",
    duration: "耗时",
    time: "时间",
    reason: "原因",
    maxTile: "最大砖块",
    noRows: "暂无成绩，可调整昵称筛选、时间范围，或等待用户上传。",
    refreshing: "正在刷新 2K 封顶成绩…",
    loadFailed: "加载失败",
    loadedPrefix: "已加载 ",
    loadedSuffix: " 条成绩，最后刷新：",
    emptyPasscode: "请输入访问口令。",
    passcodeWrongStatus: "访问口令错误。",
    passcodeOk: "口令正确，正在加载数据…",
    relocked: "页面已重新上锁，请输入访问口令。",
    relockedStatus: "页面已上锁。",
    lockedPrompt: "请输入访问口令以进入监测页。",
    lockedStatus: "该页面已上锁，请先输入访问口令。",
    hours: "时",
    minutes: "分",
    seconds: "秒"
  },
  en: {
    title: "2K Capped Run Monitor",
    gateHeading: "Enter Access Passcode",
    gateCopy: "This internal page loads monitoring data only after the correct passcode is entered.",
    passcode: "Access Passcode",
    passcodePlaceholder: "Enter access passcode",
    passcodeError: "Incorrect passcode. Please try again.",
    enterMonitor: "Enter Monitor",
    backModes: "Back To Modes",
    heroTitle: "2K Capped Run Monitor",
    heroCopy: "View hidden stats uploaded from 4x4 2048 capped mode without publishing them to the public leaderboard.",
    badgeLocked: "Passcode Required",
    badgeUnlocked: "Passcode Verified",
    hintLocked: "Enter the passcode before loading monitor data.",
    hintUnlocked: "This session is unlocked. Real-time runs, boards, and filters are available.",
    relock: "Lock Again",
    navAria: "Page navigation",
    modes: "Modes",
    startCapped: "Start Capped Mode",
    filterAria: "Filters and refresh",
    names: "Player Nicknames",
    namesPlaceholder: "Leave blank for all; separate multiple nicknames with new lines or commas.",
    namesHelp: "Supports exact lookup for one nickname or monitoring multiple players at once.",
    limit: "Limit",
    sort: "Sort",
    scoreDesc: "Score Descending",
    scoreAsc: "Score Ascending",
    timeDesc: "Time Descending",
    timeAsc: "Time Ascending",
    startAt: "Start Time",
    endAt: "End Time",
    latestOnly: "Best run only per player",
    autoRefresh: "Auto Refresh",
    refresh: "Refresh Data",
    preparing: "Preparing data source...",
    statsAria: "Overview statistics",
    count: "Records",
    bestScore: "Best Score",
    bestTile: "Best Tile",
    latest: "Latest Upload",
    runsTitle: "Live Runs",
    runsCopy: "Sorted by score descending. Click a row to preview the final board.",
    exportJson: "Export JSON",
    previewTitle: "Board Preview",
    previewMeta: "Select a run to view details.",
    noBoard: "No board",
    player: "Player",
    score: "Score",
    duration: "Duration",
    time: "Time",
    reason: "Reason",
    maxTile: "Max Tile",
    noRows: "No runs yet. Adjust nickname or time filters, or wait for uploads.",
    refreshing: "Refreshing 2K capped runs...",
    loadFailed: "Load failed",
    loadedPrefix: "Loaded ",
    loadedSuffix: " runs, last refresh: ",
    emptyPasscode: "Please enter the access passcode.",
    passcodeWrongStatus: "Incorrect access passcode.",
    passcodeOk: "Passcode accepted. Loading data...",
    relocked: "Page is locked again. Enter the access passcode.",
    relockedStatus: "Page locked.",
    lockedPrompt: "Enter the access passcode to open the monitor.",
    lockedStatus: "This page is locked. Enter the access passcode first.",
    hours: "h",
    minutes: "m",
    seconds: "s"
  }
};

let latestRows: Capped2kRun[] = [];
let selectedId = "";
let refreshTimer = 0;
let refreshInFlight = false;

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function currentLang(): PageLang {
  try {
    const raw = toText(window.localStorage.getItem(UI_LANGUAGE_KEY)).trim().toLowerCase();
    if (raw.startsWith("en")) return "en";
  } catch (_err) {}
  return "zh";
}

function t(key: string): string {
  const lang = currentLang();
  return COPY[lang][key] || COPY.zh[key] || key;
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatInteger(value: unknown): string {
  return Math.floor(toNumber(value, 0)).toLocaleString(currentLang() === "en" ? "en-US" : "zh-CN");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

function getInputValue(id: string): string {
  return toText((byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id)?.value || "").trim());
}

function isChecked(id: string): boolean {
  return byId<HTMLInputElement>(id)?.checked === true;
}

function setText(id: string, value: string): void {
  const node = byId(id);
  if (node) node.textContent = value;
}

function setStatus(message: string, state: StatusState = "idle"): void {
  const node = byId("stone-status");
  if (!node) return;
  node.textContent = message;
  if (state === "idle") node.removeAttribute("data-state");
  else node.setAttribute("data-state", state);
}

function setLabelText(selector: string, text: string): void {
  const label = document.querySelector<HTMLElement>(selector);
  if (!label) return;
  const first = label.childNodes[0];
  if (first && first.nodeType === Node.TEXT_NODE) first.textContent = text;
  else label.insertBefore(document.createTextNode(text), label.firstChild);
}

function applyStaticCopy(): void {
  const lang = currentLang();
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  document.title = t("title");
  setText("stone-status", t("preparing"));
  const bySelector = (selector: string, text: string): void => {
    const node = document.querySelector<HTMLElement>(selector);
    if (node) node.textContent = text;
  };
  bySelector(".stone-access-card h2", t("gateHeading"));
  bySelector(".stone-access-copy", t("gateCopy"));
  bySelector("#stone-access-submit", t("enterMonitor"));
  bySelector(".stone-access-actions a", t("backModes"));
  bySelector(".stone-hero h1", t("heroTitle"));
  bySelector(".stone-hero-copy p:not(.stone-kicker)", t("heroCopy"));
  bySelector("#stone-change-key", t("relock"));
  bySelector(".stone-nav a[href='modes.html']", t("modes"));
  bySelector(".stone-nav a[href='capped_2048.html']", t("startCapped"));
  bySelector(".stone-field-help", t("namesHelp"));
  bySelector("#stone-refresh", t("refresh"));
  bySelector("#stone-export", t("exportJson"));
  bySelector(".stone-table-panel h2", t("runsTitle"));
  bySelector(".stone-table-panel .stone-panel-head p", t("runsCopy"));
  bySelector(".stone-preview-panel h2", t("previewTitle"));
  bySelector("#stone-preview-meta", t("previewMeta"));
  bySelector("#stone-board-preview", t("noBoard"));
  setLabelText("label[for='stone-access-key']", t("passcode"));
  setLabelText("label[for='stone-filter-names']", t("names"));
  setLabelText("label[for='stone-filter-limit']", t("limit"));
  setLabelText("label[for='stone-sort-by']", t("sort"));
  setLabelText("label[for='stone-start-at']", t("startAt"));
  setLabelText("label[for='stone-end-at']", t("endAt"));
  const passcodeInput = byId<HTMLInputElement>("stone-access-key");
  if (passcodeInput) passcodeInput.placeholder = t("passcodePlaceholder");
  const namesInput = byId<HTMLTextAreaElement>("stone-filter-names");
  if (namesInput) namesInput.placeholder = t("namesPlaceholder");
  const errorNode = byId("stone-access-error");
  if (errorNode) errorNode.textContent = t("passcodeError");
  const nav = document.querySelector<HTMLElement>(".stone-nav");
  if (nav) nav.setAttribute("aria-label", t("navAria"));
  const control = document.querySelector<HTMLElement>(".stone-control-card");
  if (control) control.setAttribute("aria-label", t("filterAria"));
  const stats = document.querySelector<HTMLElement>(".stone-stats-grid");
  if (stats) stats.setAttribute("aria-label", t("statsAria"));
  const latestLabel = document.querySelectorAll<HTMLElement>(".stone-check span");
  if (latestLabel[0]) latestLabel[0].textContent = t("latestOnly");
  if (latestLabel[1]) latestLabel[1].textContent = t("autoRefresh");
  const options = byId<HTMLSelectElement>("stone-sort-by")?.options;
  if (options) {
    if (options[0]) options[0].textContent = t("scoreDesc");
    if (options[1]) options[1].textContent = t("scoreAsc");
    if (options[2]) options[2].textContent = t("timeDesc");
    if (options[3]) options[3].textContent = t("timeAsc");
  }
  const statLabels = document.querySelectorAll<HTMLElement>(".stone-stat-card span");
  if (statLabels[0]) statLabels[0].textContent = t("count");
  if (statLabels[1]) statLabels[1].textContent = t("bestScore");
  if (statLabels[2]) statLabels[2].textContent = t("bestTile");
  if (statLabels[3]) statLabels[3].textContent = t("latest");
  const detailLabels = document.querySelectorAll<HTMLElement>(".stone-detail-list dt");
  if (detailLabels[0]) detailLabels[0].textContent = t("player");
  if (detailLabels[1]) detailLabels[1].textContent = t("score");
  if (detailLabels[2]) detailLabels[2].textContent = t("duration");
  if (detailLabels[3]) detailLabels[3].textContent = t("time");
}

function setButtonBusy(id: string, busy: boolean): void {
  const button = byId<HTMLButtonElement>(id);
  if (!button) return;
  button.disabled = busy;
  button.toggleAttribute("aria-busy", busy);
}

function createMonitorService() {
  return createStone2kMonitorService({
    windowLike: typeof window === "undefined" ? null : window
  });
}

function hasStoredAccess(): boolean {
  const storageAccess = createBrowserStorageAccess({
    windowLike: typeof window === "undefined" ? null : window
  });
  return readStorageValue(storageAccess.session(), MONITOR_ACCESS_STORAGE_KEY) === "granted";
}

function setStoredAccess(granted: boolean): void {
  const storageAccess = createBrowserStorageAccess({
    windowLike: typeof window === "undefined" ? null : window
  });
  const storageLike = storageAccess.session();
  if (granted) {
    writeStorageValue(storageLike, MONITOR_ACCESS_STORAGE_KEY, "granted");
    return;
  }
  removeStorageValue(storageLike, MONITOR_ACCESS_STORAGE_KEY);
}

function getLockState(): LockState {
  return document.body.getAttribute("data-stone-monitor-locked") === "unlocked" ? "unlocked" : "locked";
}

function setLockState(state: LockState): void {
  document.body.setAttribute("data-stone-monitor-locked", state);
  byId("stone-monitor-shell")?.setAttribute("aria-hidden", String(state !== "unlocked"));
}

function setGateBusy(busy: boolean): void {
  setButtonBusy("stone-access-submit", busy);
  const input = byId<HTMLInputElement>("stone-access-key");
  if (input) input.disabled = busy;
}

function setGateError(message = ""): void {
  const errorNode = byId("stone-access-error");
  if (!errorNode) return;
  if (message) {
    errorNode.hidden = false;
    errorNode.textContent = message;
  } else {
    errorNode.hidden = true;
    errorNode.textContent = "";
  }
}

function setAccessMeta(state: LockState, message = ""): void {
  const badge = byId("stone-access-badge");
  const hint = byId("stone-access-hint");
  if (badge) {
    badge.setAttribute("data-state", state);
    badge.textContent = state === "unlocked" ? t("badgeUnlocked") : t("badgeLocked");
  }
  if (hint) {
    hint.textContent = state === "unlocked"
      ? t("hintUnlocked")
      : message || t("hintLocked");
  }
}

function clearMonitorData(): void {
  latestRows = [];
  selectedId = "";
  renderStats([], null);
  renderTable([]);
}

function lockMonitor(message = t("lockedPrompt"), clearInput = false): void {
  clearMonitorData();
  setLockState("locked");
  setAccessMeta("locked", message);
  setGateError("");
  const input = byId<HTMLInputElement>("stone-access-key");
  if (input) {
    if (clearInput) input.value = "";
    window.setTimeout(() => input.focus(), 0);
  }
}

function unlockMonitor(): void {
  setLockState("unlocked");
  setAccessMeta("unlocked");
  setGateError("");
}

function normalizeRows(payload: ApiResult): Capped2kRun[] {
  const raw = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.rows) ? payload.rows : [];
  return raw.filter((row): row is Capped2kRun => !!row && typeof row === "object" && !Array.isArray(row));
}

function normalizeBoard(raw: unknown): number[][] {
  if (!Array.isArray(raw)) return [];
  const board = raw.map((row) => Array.isArray(row) ? row.map((cell) => Math.floor(toNumber(cell, 0))) : []);
  if (!board.length || board.some((row) => row.length !== board[0]?.length)) return [];
  return board;
}

function formatDateTime(value: unknown): string {
  const text = toText(value).trim();
  if (!text) return "--";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString(currentLang() === "en" ? "en-US" : "zh-CN", { hour12: false });
}

function formatDuration(value: unknown): string {
  const ms = Math.max(0, Math.floor(toNumber(value, 0)));
  if (ms <= 0) return "--";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (currentLang() === "en") {
    if (hours > 0) return `${hours}${t("hours")} ${minutes}${t("minutes")} ${seconds}${t("seconds")}`;
    if (minutes > 0) return `${minutes}${t("minutes")} ${seconds}${t("seconds")}`;
    return `${seconds}${t("seconds")}`;
  }
  if (hours > 0) return `${hours}${t("hours")} ${minutes}${t("minutes")} ${seconds}${t("seconds")}`;
  if (minutes > 0) return `${minutes}${t("minutes")} ${seconds}${t("seconds")}`;
  return `${seconds}${t("seconds")}`;
}

function getRunId(row: Capped2kRun, index: number): string {
  return toText(row.id).trim() || [row.user_id, row.nickname, row.score, row.ended_at, index].map(toText).join("|");
}

function tileClass(value: number): string {
  if (value <= 0) return "stone-tile";
  if (value > 2048) return "stone-tile vsuper";
  return "stone-tile v" + value;
}

function renderBoard(row: Capped2kRun | null): void {
  const target = byId("stone-board-preview");
  if (!target) return;
  const board = normalizeBoard(row?.final_board);
  if (!board.length) {
    target.className = "stone-board-preview empty";
    target.textContent = t("noBoard");
    return;
  }
  target.className = "stone-board-preview";
  target.style.gridTemplateColumns = `repeat(${board[0]?.length || 4}, minmax(0, 1fr))`;
  target.innerHTML = board.flatMap((line) => line).map((value) => {
    const label = value > 0 ? formatInteger(value) : "";
    return `<span class="${tileClass(value)}">${escapeHtml(label)}</span>`;
  }).join("");
}

function renderSelected(row: Capped2kRun | null): void {
  renderBoard(row);
  setText("stone-preview-meta", row ? `#${escapeHtml(toText(row.id).slice(0, 10) || toText(row.user_id))}` : t("previewMeta"));
  setText("stone-detail-nickname", row ? toText(row.nickname) || "--" : "--");
  setText("stone-detail-score", row ? formatInteger(row.score) : "--");
  setText("stone-detail-duration", row ? formatDuration(row.duration_ms) : "--");
  setText("stone-detail-ended", row ? formatDateTime(row.ended_at || row.created_at) : "--");
}

function renderStats(rows: Capped2kRun[], total: number | null): void {
  const bestScore = rows.reduce((max, row) => Math.max(max, toNumber(row.score, 0)), 0);
  const bestTile = rows.reduce((max, row) => Math.max(max, toNumber(row.best_tile, 0)), 0);
  const latest = rows.reduce<Capped2kRun | null>((best, row) => {
    if (!best) return row;
    return new Date(toText(row.created_at || row.ended_at)).getTime() > new Date(toText(best.created_at || best.ended_at)).getTime() ? row : best;
  }, null);
  setText("stone-stat-count", typeof total === "number" && total >= 0 ? formatInteger(total) : formatInteger(rows.length));
  setText("stone-stat-best-score", bestScore > 0 ? formatInteger(bestScore) : "--");
  setText("stone-stat-best-tile", bestTile > 0 ? formatInteger(bestTile) : "--");
  setText("stone-stat-latest", latest ? formatDateTime(latest.created_at || latest.ended_at) : "--");
}

function renderTable(rows: Capped2kRun[]): void {
  const target = byId("stone-table-wrap");
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = '<div class="stone-empty">' + escapeHtml(t("noRows")) + '</div>';
    renderSelected(null);
    return;
  }
  const body = rows.map((row, index) => {
    const id = getRunId(row, index);
    const active = id === selectedId ? " active" : "";
    return `<tr class="${active.trim()}" data-run-id="${escapeHtml(id)}">
      <td><span class="stone-rank">${index + 1}</span></td>
      <td class="stone-player">${escapeHtml(toText(row.nickname) || "--")}</td>
      <td class="stone-score">${formatInteger(row.score)}</td>
      <td>${formatInteger(row.best_tile)}</td>
      <td>${formatDuration(row.duration_ms)}</td>
      <td>${escapeHtml(formatDateTime(row.ended_at || row.created_at))}</td>
      <td>${escapeHtml(toText(row.end_reason) || "--")}</td>
    </tr>`;
  }).join("");
  target.innerHTML = `<table class="stone-runs-table"><thead><tr>
    <th>#</th><th>${escapeHtml(t("player"))}</th><th>${escapeHtml(t("score"))}</th><th>${escapeHtml(t("maxTile"))}</th><th>${escapeHtml(t("duration"))}</th><th>${escapeHtml(t("time"))}</th><th>${escapeHtml(t("reason"))}</th>
  </tr></thead><tbody>${body}</tbody></table>`;
  target.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((rowNode) => {
    rowNode.addEventListener("click", () => {
      selectedId = rowNode.dataset.runId || "";
      const selected = latestRows.find((row, index) => getRunId(row, index) === selectedId) || null;
      renderTable(latestRows);
      renderSelected(selected);
    });
  });
  const selected = latestRows.find((row, index) => getRunId(row, index) === selectedId) || rows[0] || null;
  selectedId = selected ? getRunId(selected, latestRows.indexOf(selected)) : "";
  renderSelected(selected);
}

async function refreshRuns(): Promise<boolean> {
  if (refreshInFlight || getLockState() !== "unlocked") return false;
  refreshInFlight = true;
  setButtonBusy("stone-refresh", true);
  setStatus(t("refreshing"), "busy");
  try {
    const result = await createMonitorService().listRuns({
      names: getInputValue("stone-filter-names"),
      sortValue: getInputValue("stone-sort-by") || "score_desc",
      startAt: getInputValue("stone-start-at"),
      endAt: getInputValue("stone-end-at"),
      limit: Math.floor(toNumber(getInputValue("stone-filter-limit"), 50)),
      latestOnly: isChecked("stone-filter-latest")
    });
    if (result.success !== true) {
      throw new Error(toText(result.error || result.message || result.code || t("loadFailed")));
    }
    latestRows = normalizeRows(result);
    const total = typeof result.total === "number" ? Number(result.total) : null;
    renderStats(latestRows, Number.isFinite(total) ? total : null);
    renderTable(latestRows);
    setStatus(`${t("loadedPrefix")}${formatInteger(typeof total === "number" ? total : latestRows.length)}${t("loadedSuffix")}${new Date().toLocaleTimeString(currentLang() === "en" ? "en-US" : "zh-CN", { hour12: false })}`, "ok");
    return true;
  } catch (error) {
    setStatus(t("loadFailed") + ": " + (error instanceof Error ? error.message : String(error)), "err");
    return false;
  } finally {
    refreshInFlight = false;
    setButtonBusy("stone-refresh", false);
  }
}

function downloadJson(): void {
  const blob = new Blob([JSON.stringify(latestRows, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "capped-2k-runs.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function restartAutoRefresh(): void {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = 0;
  if (!isChecked("stone-auto-refresh") || getLockState() !== "unlocked") return;
  refreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") void refreshRuns();
  }, REFRESH_INTERVAL_MS);
}

async function submitAccessKey(): Promise<void> {
  const key = getInputValue("stone-access-key");
  if (!key) {
    setGateError(t("emptyPasscode"));
    byId<HTMLInputElement>("stone-access-key")?.focus();
    return;
  }
  if (key !== MONITOR_ACCESS_PASSCODE) {
    setGateError(t("passcodeError"));
    setStatus(t("passcodeWrongStatus"), "err");
    byId<HTMLInputElement>("stone-access-key")?.focus();
    return;
  }
  setGateBusy(true);
  setStoredAccess(true);
  unlockMonitor();
  restartAutoRefresh();
  setStatus(t("passcodeOk"), "busy");
  await refreshRuns();
  setGateBusy(false);
}

function resetAccessKey(): void {
  setStoredAccess(false);
  lockMonitor(t("relocked"), true);
  restartAutoRefresh();
  setStatus(t("relockedStatus"), "idle");
}

export function bootstrapStone2kMonitorPage(): void {
  applyStaticCopy();
  byId("stone-refresh")?.addEventListener("click", () => void refreshRuns());
  byId("stone-export")?.addEventListener("click", downloadJson);
  byId("stone-auto-refresh")?.addEventListener("change", restartAutoRefresh);
  byId("stone-filter-latest")?.addEventListener("change", () => void refreshRuns());
  byId("stone-filter-limit")?.addEventListener("change", () => void refreshRuns());
  byId("stone-sort-by")?.addEventListener("change", () => void refreshRuns());
  byId("stone-start-at")?.addEventListener("change", () => void refreshRuns());
  byId("stone-end-at")?.addEventListener("change", () => void refreshRuns());
  byId("stone-change-key")?.addEventListener("click", resetAccessKey);
  byId<HTMLFormElement>("stone-access-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitAccessKey();
  });
  byId("stone-filter-names")?.addEventListener("keydown", (event) => {
    if (event instanceof KeyboardEvent && event.key === "Enter" && (event.ctrlKey || event.metaKey)) void refreshRuns();
  });

  if (hasStoredAccess()) {
    unlockMonitor();
    restartAutoRefresh();
    void refreshRuns();
    return;
  }

  lockMonitor(t("lockedPrompt"), true);
  restartAutoRefresh();
  setStatus(t("lockedStatus"), "idle");
}
