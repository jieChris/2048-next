import "../../js/api_shared_utils.js";

type JsonRecord = Record<string, unknown>;

type ApiSharedUtilsLike = {
  buildApiBaseCandidates?: () => string[];
};

type AdminWindow = Window & {
  ApiSharedUtils?: ApiSharedUtilsLike;
};

type RescueModeOption = {
  label: string;
  modeKey: string;
  modeBucket: string;
};

const AUTH_TOKEN_KEY = "2048_auth_token_v1";
const REMOTE_API_BASE = "https://taihe.fun/api";
const RESCUE_MODE_OPTIONS: RescueModeOption[] = [
  { label: "4x4 \u65e0\u64a4\u56de", modeKey: "standard_4x4_pow2_no_undo", modeBucket: "standard_no_undo" },
  { label: "4x4 \u6709\u64a4\u56de", modeKey: "classic_4x4_pow2_undo", modeBucket: "standard_undo" },
  { label: "4x4 \u5408\u6210 2048 \u7ed3\u675f", modeKey: "capped_4x4_pow2_no_undo", modeBucket: "standard_no_undo" },
  { label: "3x3 \u65e0\u64a4\u56de", modeKey: "board_3x3_pow2_no_undo", modeBucket: "pow2_3x3" },
  { label: "3x3 \u6709\u64a4\u56de", modeKey: "board_3x3_pow2_undo", modeBucket: "pow2_3x3" },
  { label: "4x2 \u65e0\u64a4\u56de", modeKey: "board_2x4_pow2_no_undo", modeBucket: "pow2_2x4" },
  { label: "4x2 \u6709\u64a4\u56de", modeKey: "board_2x4_pow2_undo", modeBucket: "pow2_2x4" },
  { label: "4x3 \u65e0\u64a4\u56de", modeKey: "board_3x4_pow2_no_undo", modeBucket: "pow2_3x4" },
  { label: "4x3 \u6709\u64a4\u56de", modeKey: "board_3x4_pow2_undo", modeBucket: "pow2_3x4" },
  { label: "\u6590\u6ce2\u90a3\u5951 3x3 \u65e0\u64a4\u56de", modeKey: "fib_3x3_no_undo", modeBucket: "fib_3x3" },
  { label: "\u6590\u6ce2\u90a3\u5951 3x3 \u6709\u64a4\u56de", modeKey: "fib_3x3_undo", modeBucket: "fib_3x3" }
];

let latestResult: unknown = null;

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function getApiBases(): string[] {
  const win = window as AdminWindow;
  const bases = [...(win.ApiSharedUtils?.buildApiBaseCandidates?.() || [])];
  if (!bases.includes(REMOTE_API_BASE)) bases.push(REMOTE_API_BASE);
  return bases.length ? bases : [window.location.origin + "/api", REMOTE_API_BASE];
}

function getAuthToken(): string {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch (_err) {
    return "";
  }
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<JsonRecord> {
  const token = getAuthToken();
  let lastError = "api_unavailable";
  for (const base of getApiBases()) {
    try {
      const headers = new Headers(options.headers || {});
      if (token) headers.set("Authorization", "Bearer " + token);
      if (options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      const response = await fetch(base + path, { ...options, headers });
      const data = (await response.json().catch(() => null)) as JsonRecord | null;
      if (response.ok && data) return data;
      lastError = toText(data?.error || data?.message || data?.code || response.statusText || response.status);
      if (data) return data;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { success: false, error: lastError };
}

function setTip(node: HTMLElement | null, message: string, state: "ok" | "err" | "idle" = "idle"): void {
  if (!node) return;
  node.textContent = message;
  if (state === "idle") node.removeAttribute("data-state");
  else node.setAttribute("data-state", state);
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_err) {
    return String(value);
  }
}

function renderOutput(node: HTMLElement | null, value: unknown): void {
  if (node) node.textContent = stringify(value);
}

function normalizeRows(data: unknown): JsonRecord[] {
  if (Array.isArray(data)) return data.filter((row): row is JsonRecord => !!row && typeof row === "object" && !Array.isArray(row));
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as JsonRecord;
    for (const key of ["rows", "data", "results", "items"]) {
      const value = record[key];
      if (Array.isArray(value)) return normalizeRows(value);
    }
  }
  return [];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

function formatCell(value: unknown): string {
  if (value && typeof value === "object") return stringify(value);
  return String(value ?? "");
}

function renderTable(target: HTMLElement | null, payload: unknown): void {
  latestResult = payload;
  if (!target) return;
  const rows = normalizeRows(payload);
  if (!rows.length) {
    target.innerHTML = '<pre class="admin-output">' + escapeHtml(stringify(payload)) + '</pre>';
    return;
  }
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const head = columns.map((column) => "<th>" + escapeHtml(column) + "</th>").join("");
  const body = rows.map((row) => "<tr>" + columns.map((column) => {
    const cell = escapeHtml(formatCell(row[column]));
    return '<td title="' + cell + '">' + cell + '</td>';
  }).join("") + "</tr>").join("");
  target.innerHTML = '<table class="admin-result-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
}

function fillTableSelect(payload: unknown): void {
  const select = byId<HTMLSelectElement>("admin-table-select");
  if (!select) return;
  const rows = normalizeRows(payload);
  const names = rows.map((row) => toText(row.name || row.table_name || row.tbl_name)).filter(Boolean);
  const tables = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as JsonRecord : {};
  const fallback = Array.isArray(tables.tables) ? tables.tables.map(toText) : [];
  const allNames = Array.from(new Set([...names, ...fallback].filter(Boolean))).sort();
  select.innerHTML = allNames.map((name) => '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>').join("");
}

function initRescueModeSelect(): void {
  const select = byId<HTMLSelectElement>("admin-rescue-mode-select");
  if (!select) return;
  select.innerHTML = [
    '<option value="">\u8bf7\u9009\u62e9\u6a21\u5f0f</option>',
    ...RESCUE_MODE_OPTIONS.map((option) => '<option value="' + escapeHtml(option.modeKey) + '">' + escapeHtml(option.label) + ' - ' + escapeHtml(option.modeKey) + '</option>')
  ].join("");
  select.addEventListener("change", syncRescueModeFields);
  syncRescueModeFields();
}

function syncRescueModeFields(): void {
  const modeKey = getInputValue("admin-rescue-mode-select");
  const option = RESCUE_MODE_OPTIONS.find((item) => item.modeKey === modeKey);
  setInputValue("admin-rescue-mode-key", option?.modeKey || "");
  setInputValue("admin-rescue-mode-bucket", option?.modeBucket || "");
}

function getInputValue(id: string): string {
  return toText((byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id)?.value || "").trim());
}

function setInputValue(id: string, value: string): void {
  const input = byId<HTMLInputElement>(id);
  if (input) input.value = value;
}

function parsePositiveInt(id: string, fallback: number): number {
  const parsed = Number.parseInt(getInputValue(id), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(id: string, fallback: number): number {
  const parsed = Number.parseInt(getInputValue(id), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function checkAuth(): Promise<void> {
  const output = byId("admin-auth-output");
  const result = await apiRequest("/admin/me", { method: "GET" });
  renderOutput(output, result);
  const ok = result.success !== false && !!result.admin;
  const state = byId("admin-auth-state");
  if (state) {
    state.textContent = ok ? "\u5df2\u6388\u6743" : "\u672a\u6388\u6743/\u672a\u767b\u5f55";
    state.classList.toggle("admin-state-ok", ok);
  }
}

async function refreshTables(): Promise<void> {
  const output = byId("admin-auth-output");
  const result = await apiRequest("/admin/tables", { method: "GET" });
  renderOutput(output, result);
  fillTableSelect(result);
  const tableCount = normalizeRows(result).length;
  if (result.success === false) setTip(byId("admin-query-tip"), "\u52a0\u8f7d\u8868\u5931\u8d25\uff1a" + toText(result.error || result.code || "unknown"), "err");
  else if (tableCount <= 0) setTip(byId("admin-query-tip"), "\u672a\u8fd4\u56de\u6570\u636e\u8868\uff0c\u8bf7\u68c0\u67e5\u662f\u5426\u5df2\u767b\u5f55\u7ba1\u7406\u5458\u8d26\u53f7\u3002", "err");
  else setTip(byId("admin-query-tip"), "\u5df2\u52a0\u8f7d " + tableCount + " \u5f20\u8868", "ok");
}

async function loadSelectedTable(): Promise<void> {
  const table = getInputValue("admin-table-select");
  const limit = Math.min(parsePositiveInt("admin-table-limit", 50), 200);
  const page = parsePositiveInt("admin-table-page", 1);
  if (!table) {
    setTip(byId("admin-query-tip"), "\u8bf7\u5148\u9009\u62e9\u6570\u636e\u8868", "err");
    return;
  }
  const result = await apiRequest("/admin/table/" + encodeURIComponent(table) + "?limit=" + limit + "&page=" + page, { method: "GET" });
  renderTable(byId("admin-result"), result);
  setTip(byId("admin-query-tip"), result.success === false ? "\u52a0\u8f7d\u8868\u5931\u8d25" : "\u8868\u6570\u636e\u5df2\u52a0\u8f7d", result.success === false ? "err" : "ok");
}

async function runSql(): Promise<void> {
  const sql = getInputValue("admin-sql");
  if (!sql) {
    setTip(byId("admin-query-tip"), "\u8bf7\u8f93\u5165 SQL", "err");
    return;
  }
  const result = await apiRequest("/admin/query", { method: "POST", body: JSON.stringify({ sql }) });
  renderTable(byId("admin-result"), result);
  setTip(byId("admin-query-tip"), "\u67e5\u8be2\u5df2\u8fd4\u56de", result.success === false ? "err" : "ok");
}

function exportLatestResult(): void {
  const blob = new Blob([stringify(latestResult)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "2048-admin-result-" + Date.now() + ".json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseBoard(): number[][] | null {
  try {
    const parsed = JSON.parse(getInputValue("admin-rescue-board")) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 4) return null;
    const board = parsed.map((row) => Array.isArray(row) ? row.map((cell) => Math.floor(Number(cell) || 0)) : []);
    if (board.some((row) => row.length !== 4 || row.some((cell) => cell < 0))) return null;
    return board;
  } catch (_err) {
    return null;
  }
}

async function createRescueOffer(): Promise<void> {
  syncRescueModeFields();
  const board = parseBoard();
  if (!board) {
    setTip(byId("admin-rescue-tip"), "\u76d8\u9762 JSON \u5fc5\u987b\u662f 4x4 \u6570\u7ec4", "err");
    return;
  }
  const payload = {
    user_id: parsePositiveInt("admin-rescue-user-id", 0),
    mode_key: getInputValue("admin-rescue-mode-key"),
    mode_bucket: getInputValue("admin-rescue-mode-bucket"),
    board,
    score: parseNonNegativeInt("admin-rescue-score", 0),
    duration_ms: parseNonNegativeInt("admin-rescue-duration", 0),
    expires_in_hours: parsePositiveInt("admin-rescue-expires", 168),
    reason: getInputValue("admin-rescue-reason")
  };
  if (!payload.user_id || !payload.mode_key || !payload.mode_bucket) {
    setTip(byId("admin-rescue-tip"), "\u8bf7\u586b\u5199\u7528\u6237 ID \u5e76\u9009\u62e9\u6a21\u5f0f", "err");
    return;
  }
  const result = await apiRequest("/admin/rescue-offers", { method: "POST", body: JSON.stringify(payload) });
  renderOutput(byId("admin-rescue-output"), result);
  setTip(byId("admin-rescue-tip"), result.success === false ? "\u7b7e\u53d1\u5931\u8d25" : "\u5df2\u7b7e\u53d1\u6062\u590d\u5355", result.success === false ? "err" : "ok");
}

async function listRescueOffers(): Promise<void> {
  const userId = parsePositiveInt("admin-rescue-user-id", 0);
  const path = userId ? "/admin/rescue-offers?user_id=" + userId : "/admin/rescue-offers";
  const result = await apiRequest(path, { method: "GET" });
  renderOutput(byId("admin-rescue-output"), result);
}

function bind(id: string, handler: () => void | Promise<void>): void {
  byId<HTMLButtonElement>(id)?.addEventListener("click", () => {
    Promise.resolve(handler()).catch((error) => {
      setTip(byId("admin-query-tip"), error instanceof Error ? error.message : String(error), "err");
    });
  });
}

export function bootstrapAdminPage(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  initRescueModeSelect();
  bind("admin-check-auth", checkAuth);
  bind("admin-refresh-tables", refreshTables);
  bind("admin-load-table", loadSelectedTable);
  bind("admin-run-sql", runSql);
  bind("admin-export-result", exportLatestResult);
  bind("admin-create-rescue", createRescueOffer);
  bind("admin-list-rescue", listRescueOffers);
  void checkAuth();
  void refreshTables();
}
