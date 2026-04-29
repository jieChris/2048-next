import "../../js/api_shared_utils.js";

type JsonRecord = Record<string, unknown>;
type TipState = "ok" | "err" | "busy" | "idle";

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
  { label: "4x4 \u5408\u6210 2048 \u7ed3\u675f", modeKey: "capped_4x4_pow2_no_undo", modeBucket: "capped" },
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
let isAdminAuthorized = false;
let rescueSubmitInFlight = false;
const tipTimers = new WeakMap<HTMLElement, number>();

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_err) {
    return String(value);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

function formatCell(value: unknown): string {
  if (value && typeof value === "object") return stringify(value);
  return String(value ?? "");
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

function getAuthToken(): string {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch (_err) {
    return "";
  }
}

function getApiBases(): string[] {
  const win = window as AdminWindow;
  const bases = [...(win.ApiSharedUtils?.buildApiBaseCandidates?.() || [])];
  if (!bases.includes(REMOTE_API_BASE)) bases.push(REMOTE_API_BASE);
  return bases.length ? bases : [window.location.origin + "/api", REMOTE_API_BASE];
}

function getErrorMessage(result: JsonRecord | null | undefined, fallback: string): string {
  return toText(result?.error || result?.message || result?.code || fallback);
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<JsonRecord> {
  const token = getAuthToken();
  if (!token) return { success: false, code: "NO_TOKEN", error: "\u672a\u767b\u5f55\u6216 token \u4e0d\u5b58\u5728" };
  let lastError = "api_unavailable";
  for (const base of getApiBases()) {
    try {
      const headers = new Headers(options.headers || {});
      headers.set("Authorization", "Bearer " + token);
      if (options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      const response = await fetch(base + path, { ...options, headers });
      const data = (await response.json().catch(() => null)) as JsonRecord | null;
      if (data) return data;
      lastError = toText(response.statusText || response.status);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { success: false, error: lastError };
}

function clearTip(node: HTMLElement | null): void {
  if (!node) return;
  const existing = tipTimers.get(node);
  if (existing) window.clearTimeout(existing);
  tipTimers.delete(node);
  node.textContent = "";
  node.removeAttribute("data-state");
}

function setTip(node: HTMLElement | null, message: string, state: TipState = "idle", autoClearMs = 0): void {
  if (!node) return;
  const existing = tipTimers.get(node);
  if (existing) window.clearTimeout(existing);
  tipTimers.delete(node);
  node.textContent = message;
  if (state === "idle") node.removeAttribute("data-state");
  else node.setAttribute("data-state", state);
  if (autoClearMs > 0) {
    const timer = window.setTimeout(() => clearTip(node), autoClearMs);
    tipTimers.set(node, timer);
  }
}

function setButtonBusy(id: string, busy: boolean): void {
  const button = byId<HTMLButtonElement>(id);
  if (!button) return;
  button.disabled = busy;
  button.toggleAttribute("aria-busy", busy);
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
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as JsonRecord : {};
  const fallback = Array.isArray(record.tables) ? record.tables.map(toText) : [];
  const allNames = Array.from(new Set([...names, ...fallback].filter(Boolean))).sort();
  select.innerHTML = allNames.length
    ? allNames.map((name) => '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>').join("")
    : '<option value="">\u65e0\u53ef\u7528\u6570\u636e\u8868</option>';
}

function initRescueModeSelect(): void {
  const select = byId<HTMLSelectElement>("admin-rescue-mode-select");
  if (!select) return;
  select.innerHTML = [
    '<option value="">\u8bf7\u9009\u62e9\u6a21\u5f0f</option>',
    ...RESCUE_MODE_OPTIONS.map((option) => '<option value="' + escapeHtml(option.modeKey) + '">' + escapeHtml(option.label) + ' | ' + escapeHtml(option.modeKey) + '</option>')
  ].join("");
  select.addEventListener("change", () => {
    syncRescueModeFields();
    clearTip(byId("admin-rescue-tip"));
  });
  syncRescueModeFields();
}

function syncRescueModeFields(): void {
  const modeKey = getInputValue("admin-rescue-mode-select");
  const option = RESCUE_MODE_OPTIONS.find((item) => item.modeKey === modeKey);
  setInputValue("admin-rescue-mode-key", option?.modeKey || "");
  setInputValue("admin-rescue-mode-bucket", option?.modeBucket || "");
}

function setAuthState(ok: boolean, label: string): void {
  isAdminAuthorized = ok;
  const state = byId("admin-auth-state");
  if (state) {
    state.textContent = label;
    state.classList.toggle("admin-state-ok", ok);
    state.classList.toggle("admin-state-err", !ok);
  }
}

async function checkAuth(): Promise<boolean> {
  const output = byId("admin-auth-output");
  clearTip(byId("admin-query-tip"));
  setButtonBusy("admin-check-auth", true);
  setAuthState(false, "\u68c0\u67e5\u4e2d");
  renderOutput(output, { status: "checking" });
  try {
    const result = await apiRequest("/admin/me", { method: "GET" });
    renderOutput(output, result);
    const ok = result.success !== false && result.admin === true;
    if (ok) {
      const user = result.user as JsonRecord | undefined;
      setAuthState(true, "\u5df2\u6388\u6743");
      setTip(byId("admin-query-tip"), "\u7ba1\u7406\u5458\u6743\u9650\u6b63\u5e38" + (user?.id ? " ID=" + user.id : ""), "ok", 3500);
      return true;
    }
    setAuthState(false, result.code === "NO_TOKEN" ? "\u672a\u767b\u5f55" : "\u65e0\u6743\u9650");
    setTip(byId("admin-query-tip"), getErrorMessage(result, "\u6743\u9650\u68c0\u67e5\u5931\u8d25"), "err");
    return false;
  } finally {
    setButtonBusy("admin-check-auth", false);
  }
}

async function ensureAdminReady(): Promise<boolean> {
  if (isAdminAuthorized) return true;
  return checkAuth();
}

async function refreshTables(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const output = byId("admin-auth-output");
  const tip = byId("admin-query-tip");
  setButtonBusy("admin-refresh-tables", true);
  setTip(tip, "\u6b63\u5728\u52a0\u8f7d\u6570\u636e\u8868...", "busy");
  try {
    const result = await apiRequest("/admin/tables", { method: "GET" });
    renderOutput(output, result);
    fillTableSelect(result);
    const tableCount = normalizeRows(result).length;
    if (result.success === false) setTip(tip, "\u52a0\u8f7d\u8868\u5931\u8d25\uff1a" + getErrorMessage(result, "unknown"), "err");
    else setTip(tip, "\u5df2\u52a0\u8f7d " + tableCount + " \u5f20\u8868", "ok", 3500);
  } finally {
    setButtonBusy("admin-refresh-tables", false);
  }
}

async function loadSelectedTable(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const table = getInputValue("admin-table-select");
  const limit = Math.min(parsePositiveInt("admin-table-limit", 50), 200);
  const page = parsePositiveInt("admin-table-page", 1);
  const tip = byId("admin-query-tip");
  if (!table) {
    setTip(tip, "\u8bf7\u5148\u9009\u62e9\u6570\u636e\u8868", "err");
    return;
  }
  setButtonBusy("admin-load-table", true);
  setTip(tip, "\u6b63\u5728\u52a0\u8f7d " + table + "...", "busy");
  try {
    const result = await apiRequest("/admin/table/" + encodeURIComponent(table) + "?limit=" + limit + "&page=" + page, { method: "GET" });
    renderTable(byId("admin-result"), result);
    const rowCount = normalizeRows(result).length;
    setTip(tip, result.success === false ? "\u52a0\u8f7d\u8868\u5931\u8d25\uff1a" + getErrorMessage(result, "unknown") : "\u5df2\u52a0\u8f7d " + rowCount + " \u884c", result.success === false ? "err" : "ok", result.success === false ? 0 : 3500);
  } finally {
    setButtonBusy("admin-load-table", false);
  }
}

async function runSql(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const sql = getInputValue("admin-sql");
  const tip = byId("admin-query-tip");
  if (!sql) {
    setTip(tip, "\u8bf7\u8f93\u5165 SQL", "err");
    return;
  }
  setButtonBusy("admin-run-sql", true);
  setTip(tip, "\u6b63\u5728\u6267\u884c SQL...", "busy");
  try {
    const result = await apiRequest("/admin/query", { method: "POST", body: JSON.stringify({ sql }) });
    renderTable(byId("admin-result"), result);
    const rowCount = normalizeRows(result).length;
    setTip(tip, result.success === false ? "SQL \u5931\u8d25\uff1a" + getErrorMessage(result, "unknown") : "SQL \u5df2\u8fd4\u56de " + rowCount + " \u884c", result.success === false ? "err" : "ok", result.success === false ? 0 : 3500);
  } finally {
    setButtonBusy("admin-run-sql", false);
  }
}

function exportLatestResult(): void {
  if (!latestResult) {
    setTip(byId("admin-query-tip"), "\u6ca1\u6709\u53ef\u5bfc\u51fa\u7684\u67e5\u8be2\u7ed3\u679c", "err");
    return;
  }
  const blob = new Blob([stringify(latestResult)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "2048-admin-result-" + Date.now() + ".json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setTip(byId("admin-query-tip"), "\u5df2\u5bfc\u51fa\u5f53\u524d\u7ed3\u679c", "ok", 2500);
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
  if (rescueSubmitInFlight) return;
  if (!(await ensureAdminReady())) return;
  clearTip(byId("admin-rescue-tip"));
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
  rescueSubmitInFlight = true;
  setButtonBusy("admin-create-rescue", true);
  setTip(byId("admin-rescue-tip"), "\u6b63\u5728\u7b7e\u53d1\u6062\u590d\u5355...", "busy");
  renderOutput(byId("admin-rescue-output"), { status: "submitting", payload });
  try {
    const result = await apiRequest("/admin/rescue-offers", { method: "POST", body: JSON.stringify(payload) });
    renderOutput(byId("admin-rescue-output"), result);
    if (result.success === false) {
      setTip(byId("admin-rescue-tip"), "\u7b7e\u53d1\u5931\u8d25\uff1a" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    const data = result.data as JsonRecord | undefined;
    setTip(byId("admin-rescue-tip"), "\u5df2\u7b7e\u53d1\u6062\u590d\u5355" + (data?.id ? " ID=" + data.id : ""), "ok", 5000);
  } finally {
    rescueSubmitInFlight = false;
    setButtonBusy("admin-create-rescue", false);
  }
}

async function listRescueOffers(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const userId = parsePositiveInt("admin-rescue-user-id", 0);
  const path = userId ? "/admin/rescue-offers?user_id=" + userId : "/admin/rescue-offers";
  setButtonBusy("admin-list-rescue", true);
  setTip(byId("admin-rescue-tip"), "\u6b63\u5728\u67e5\u770b\u6062\u590d\u5355...", "busy");
  try {
    const result = await apiRequest(path, { method: "GET" });
    renderOutput(byId("admin-rescue-output"), result);
    const rowCount = normalizeRows(result).length;
    setTip(byId("admin-rescue-tip"), result.success === false ? "\u67e5\u770b\u5931\u8d25\uff1a" + getErrorMessage(result, "unknown") : "\u5df2\u8fd4\u56de " + rowCount + " \u6761\u6062\u590d\u5355", result.success === false ? "err" : "ok", result.success === false ? 0 : 3500);
  } finally {
    setButtonBusy("admin-list-rescue", false);
  }
}

function bind(id: string, handler: () => void | Promise<void>): void {
  byId<HTMLButtonElement>(id)?.addEventListener("click", () => {
    Promise.resolve(handler()).catch((error) => {
      setTip(byId("admin-query-tip"), error instanceof Error ? error.message : String(error), "err");
    });
  });
}

function bindTipReset(): void {
  for (const id of ["admin-rescue-user-id", "admin-rescue-score", "admin-rescue-duration", "admin-rescue-expires", "admin-rescue-board", "admin-rescue-reason"]) {
    byId<HTMLInputElement | HTMLTextAreaElement>(id)?.addEventListener("input", () => clearTip(byId("admin-rescue-tip")));
  }
  for (const id of ["admin-table-select", "admin-table-limit", "admin-table-page", "admin-sql"]) {
    byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id)?.addEventListener("input", () => clearTip(byId("admin-query-tip")));
    byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id)?.addEventListener("change", () => clearTip(byId("admin-query-tip")));
  }
}

export function bootstrapAdminPage(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  initRescueModeSelect();
  bindTipReset();
  bind("admin-check-auth", async () => { await checkAuth(); });
  bind("admin-refresh-tables", refreshTables);
  bind("admin-load-table", loadSelectedTable);
  bind("admin-run-sql", runSql);
  bind("admin-export-result", exportLatestResult);
  bind("admin-create-rescue", createRescueOffer);
  bind("admin-list-rescue", listRescueOffers);
  void checkAuth();
}
