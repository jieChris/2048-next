import "../../js/api_shared_utils.js";

type ApiSharedUtilsLike = {
  buildApiBaseCandidates?: () => string[];
};

type MonitorWindow = Window & {
  ApiSharedUtils?: ApiSharedUtilsLike;
};

type StoneRun = {
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

const REMOTE_API_BASE = "https://taihe.fun/api";
const REFRESH_INTERVAL_MS = 15000;

let latestRows: StoneRun[] = [];
let selectedId = "";
let refreshTimer = 0;
let refreshInFlight = false;

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatInteger(value: unknown): string {
  return Math.floor(toNumber(value, 0)).toLocaleString("zh-CN");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

function getInputValue(id: string): string {
  return toText((byId<HTMLInputElement>(id)?.value || "").trim());
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

function setButtonBusy(id: string, busy: boolean): void {
  const button = byId<HTMLButtonElement>(id);
  if (!button) return;
  button.disabled = busy;
  button.toggleAttribute("aria-busy", busy);
}

function getApiBases(): string[] {
  const win = window as MonitorWindow;
  const bases = [...(win.ApiSharedUtils?.buildApiBaseCandidates?.() || [])];
  if (!bases.includes(REMOTE_API_BASE)) bases.push(REMOTE_API_BASE);
  return bases.length ? bases : [window.location.origin + "/api", REMOTE_API_BASE];
}

async function apiGet(path: string): Promise<ApiResult> {
  let lastError = "api_unavailable";
  for (const base of getApiBases()) {
    try {
      const response = await fetch(base + path, { method: "GET" });
      const data = (await response.json().catch(() => null)) as ApiResult | null;
      if (data) return data;
      lastError = toText(response.statusText || response.status);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { success: false, error: lastError };
}

function normalizeRows(payload: ApiResult): StoneRun[] {
  const raw = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.rows) ? payload.rows : [];
  return raw.filter((row): row is StoneRun => !!row && typeof row === "object" && !Array.isArray(row));
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
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatDuration(value: unknown): string {
  const ms = Math.max(0, Math.floor(toNumber(value, 0)));
  if (ms <= 0) return "--";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}时 ${minutes}分 ${seconds}秒`;
  if (minutes > 0) return `${minutes}分 ${seconds}秒`;
  return `${seconds}秒`;
}

function getRunId(row: StoneRun, index: number): string {
  return toText(row.id).trim() || [row.user_id, row.nickname, row.score, row.ended_at, index].map(toText).join("|");
}

function tileClass(value: number): string {
  if (value <= 0) return "stone-tile";
  if (value > 2048) return "stone-tile vsuper";
  return "stone-tile v" + value;
}

function renderBoard(row: StoneRun | null): void {
  const target = byId("stone-board-preview");
  if (!target) return;
  const board = normalizeBoard(row?.final_board);
  if (!board.length) {
    target.className = "stone-board-preview empty";
    target.textContent = "暂无盘面";
    return;
  }
  target.className = "stone-board-preview";
  target.style.gridTemplateColumns = `repeat(${board[0]?.length || 4}, minmax(0, 1fr))`;
  target.innerHTML = board.flatMap((line) => line).map((value) => {
    const label = value > 0 ? formatInteger(value) : "";
    return `<span class="${tileClass(value)}">${escapeHtml(label)}</span>`;
  }).join("");
}

function renderSelected(row: StoneRun | null): void {
  renderBoard(row);
  setText("stone-preview-meta", row ? `#${escapeHtml(toText(row.id).slice(0, 10) || toText(row.user_id))}` : "选择一条成绩查看详情。");
  setText("stone-detail-nickname", row ? toText(row.nickname) || "--" : "--");
  setText("stone-detail-score", row ? formatInteger(row.score) : "--");
  setText("stone-detail-duration", row ? formatDuration(row.duration_ms) : "--");
  setText("stone-detail-ended", row ? formatDateTime(row.ended_at || row.created_at) : "--");
}

function renderStats(rows: StoneRun[]): void {
  const bestScore = rows.reduce((max, row) => Math.max(max, toNumber(row.score, 0)), 0);
  const bestTile = rows.reduce((max, row) => Math.max(max, toNumber(row.best_tile, 0)), 0);
  const latest = rows.reduce<StoneRun | null>((best, row) => {
    if (!best) return row;
    return new Date(toText(row.created_at || row.ended_at)).getTime() > new Date(toText(best.created_at || best.ended_at)).getTime() ? row : best;
  }, null);
  setText("stone-stat-count", formatInteger(rows.length));
  setText("stone-stat-best-score", bestScore > 0 ? formatInteger(bestScore) : "--");
  setText("stone-stat-best-tile", bestTile > 0 ? formatInteger(bestTile) : "--");
  setText("stone-stat-latest", latest ? formatDateTime(latest.created_at || latest.ended_at) : "--");
}

function renderTable(rows: StoneRun[]): void {
  const target = byId("stone-table-wrap");
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = '<div class="stone-empty">暂无成绩，可调整昵称筛选或等待用户上传。</div>';
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
    <th>#</th><th>玩家</th><th>分数</th><th>最大砖块</th><th>耗时</th><th>时间</th><th>原因</th>
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

function buildQueryPath(): string {
  const params = new URLSearchParams();
  const names = getInputValue("stone-filter-names");
  const limit = Math.max(1, Math.min(200, Math.floor(toNumber(getInputValue("stone-filter-limit"), 50))));
  params.set("limit", String(limit));
  if (names) params.set("names", names);
  if (isChecked("stone-filter-latest")) params.set("latest_only", "true");
  return "/stone-2k/runs?" + params.toString();
}

async function refreshRuns(): Promise<void> {
  if (refreshInFlight) return;
  refreshInFlight = true;
  setButtonBusy("stone-refresh", true);
  setStatus("正在刷新 2K Stone 成绩…", "busy");
  try {
    const result = await apiGet(buildQueryPath());
    if (result.success !== true) {
      throw new Error(toText(result.error || result.message || result.code || "加载失败"));
    }
    latestRows = normalizeRows(result);
    renderStats(latestRows);
    renderTable(latestRows);
    setStatus(`已加载 ${latestRows.length} 条成绩，最后刷新：${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`, "ok");
  } catch (error) {
    setStatus("加载失败：" + (error instanceof Error ? error.message : String(error)), "err");
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
  link.download = "stone-2k-runs.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function restartAutoRefresh(): void {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = 0;
  if (!isChecked("stone-auto-refresh")) return;
  refreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") void refreshRuns();
  }, REFRESH_INTERVAL_MS);
}

export function bootstrapStone2kMonitorPage(): void {
  byId("stone-refresh")?.addEventListener("click", () => void refreshRuns());
  byId("stone-export")?.addEventListener("click", downloadJson);
  byId("stone-auto-refresh")?.addEventListener("change", restartAutoRefresh);
  byId("stone-filter-latest")?.addEventListener("change", () => void refreshRuns());
  byId("stone-filter-limit")?.addEventListener("change", () => void refreshRuns());
  byId("stone-filter-names")?.addEventListener("keydown", (event) => {
    if (event instanceof KeyboardEvent && event.key === "Enter") void refreshRuns();
  });
  restartAutoRefresh();
  void refreshRuns();
}
