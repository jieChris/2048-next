import { createAdminService } from "../services/admin-rescue";
import { createBrowserStorageAccess, readStorageValue } from "../storage/browser-storage";

type JsonRecord = Record<string, unknown>;
type TipState = "ok" | "err" | "busy" | "idle";

type RescueModeOption = {
  label: string;
  modeKey: string;
  modeBucket: string;
};

const ADMIN_DENIED_REDIRECT = "beta-login.html?admin_required=1&next=admin.html";
const UI_LANGUAGE_KEY = "ui_language_v1";
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const ADMIN_EN_REPLACEMENTS = ([
  ["查看 Postgres 表数据、执行查询、签发恢复对局。", "View Postgres table data, run queries, and issue rescue games."],
  ["使用当前登录 token 验证 Admin API。", "Verify Admin API with the current sign-in token."],
  ["选择表快速查看，或输入 SQL，支持导出结果。", "Select a table for quick viewing, or enter SQL and export results."],
  ["将邮箱加入受邀用户行列；用户之后注册同一邮箱即可获得内测资格。", "Add emails to the invited-user allowlist. Users can then register with the same email to gain beta access."],
  ["仅最高权限管理员可设立或罢黜其他超级管理员；ID 0 不可被撤销。", "Only the root administrator can appoint or revoke other super admins. ID 0 cannot be revoked."],
  ["为指定用户签发一份待确认的恢复盘面。", "Issue a pending rescue board for a specified user."],
  ["上传 replay-v1 文件，后端自动解析盘面、分数、统计和回放数据。", "Upload a replay-v1 file so the backend can parse board, score, stats, and replay data."],
  ["创建成就、维护规则、上传图标，并对用户手动发放或回填历史记录。", "Create achievements, maintain rules, upload icons, and manually grant or backfill user history."],
  ["规则会在保存时整体替换。可先保存草稿，再启用。", "Rules are fully replaced on save. Save as draft first, then activate."],
  ["输入 4x4 盘面 JSON，例如", "Enter 4x4 board JSON, for example"],
  ["简要说明为什么签发这份恢复单。", "Briefly explain why this rescue offer is being issued."],
  ["简要说明为什么签发这份恢复单", "Briefly explain why this rescue offer is being issued"],
  ["说明这个成就代表什么。", "Describe what this achievement represents."],
  ["确认执行成就回填？该操作应当由后端保证幂等。", "Run achievement backfill? The backend should guarantee idempotency."],
  ["权限状态", "Authorization Status"],
  ["管理后台", "Admin Console"],
  ["账户中心", "Account Center"],
  ["账号中心", "Account Center"],
  ["回到游戏", "Back To Game"],
  ["未验证", "Not Verified"],
  ["检查管理权限", "Check Admin Access"],
  ["刷新表列表", "Refresh Table List"],
  ["数据查询", "Data Query"],
  ["数据表", "Data Table"],
  ["每页条数", "Rows Per Page"],
  ["页码", "Page"],
  ["加载表数据", "Load Table Data"],
  ["导出查询结果", "Export Query Result"],
  ["自定义 SQL", "Custom SQL"],
  ["执行查询", "Run Query"],
  ["内测用户管理", "Beta User Management"],
  ["刷新名单", "Refresh Allowlist"],
  ["邮箱", "Email"],
  ["备注", "Note"],
  ["状态", "Status"],
  ["仅有效", "Active Only"],
  ["全部", "All"],
  ["已撤销", "Revoked"],
  ["加入内测", "Add To Beta"],
  ["超级管理员管理", "Super Admin Management"],
  ["刷新列表", "Refresh List"],
  ["用户 ID / 昵称", "User ID / Nickname"],
  ["用户 ID（可选）", "User ID (Optional)"],
  ["成就 ID（可选）", "Achievement ID (Optional)"],
  ["输入用户 ID", "Enter User ID"],
  ["例如 17 或 Jay", "Example: 17 or Jay"],
  ["用户 ID", "User ID"],
  ["输入要授权的用户 ID", "Enter user ID to authorize"],
  ["设为超级管理员", "Set As Super Admin"],
  ["签发恢复对局", "Issue Rescue Game"],
  ["分数", "Score"],
  ["时长", "Duration"],
  ["恢复起始分数", "Initial rescue score"],
  ["恢复起始时长", "Initial rescue duration"],
  ["过期小时", "Expiry Hours"],
  ["从回放文件签发", "Issue From Replay File"],
  ["回放文件", "Replay File"],
  ["或直接粘贴回放内容", "Or Paste Replay Content Directly"],
  ["上传并签发恢复单", "Upload And Issue Rescue Offer"],
  ["盘面 JSON", "Board JSON"],
  ["原因", "Reason"],
  ["签发恢复单", "Issue Rescue Offer"],
  ["查看恢复单", "View Rescue Offers"],
  ["成就管理", "Achievement Management"],
  ["刷新成就", "Refresh Achievements"],
  ["新建草稿", "New Draft"],
  ["搜索", "Search"],
  ["名称 / ID / 系列", "Name / ID / Series"],
  ["草稿", "Draft"],
  ["已启用", "Active"],
  ["已归档", "Archived"],
  ["名称", "Name"],
  ["例如：首次 2048", "Example: First 2048"],
  ["系列 ID", "Series ID"],
  ["例如：tile-2048", "Example: tile-2048"],
  ["等级", "Level"],
  ["排序", "Sort"],
  ["图标 URL", "Icon URL"],
  ["简介", "Description"],
  ["获得规则", "Unlock Rules"],
  ["规则类型", "Rule Type"],
  ["首次达成方块", "First Tile Reached"],
  ["第 N 次达成方块", "Nth Tile Reached"],
  ["活动排名", "Event Rank"],
  ["手动发放", "Manual Grant"],
  ["方块", "Tile"],
  ["次数", "Count"],
  ["可选 mode_key", "Optional mode_key"],
  ["活动 ID", "Event ID"],
  ["名次", "Rank"],
  ["添加规则", "Add Rule"],
  ["创建成就", "Create Achievement"],
  ["保存修改", "Save Changes"],
  ["选择图标", "Choose Icon"],
  ["上传图标", "Upload Icon"],
  ["历史回填", "History Backfill"],
  ["执行回填", "Run Backfill"],
  ["发放成就", "Grant Achievement"],
  ["来源", "Source"],
  ["来源 / 批次 / 说明", "Source / batch / note"],
  ["手动", "Manual"],
  ["活动", "Event"],
  ["回填", "Backfill"],
  ["检查中", "Checking"],
  ["已授权", "Authorized"],
  ["管理员权限正常", "Admin access OK"],
  ["未登录", "Not Signed In"],
  ["无权限", "No Access"],
  ["权限检查失败", "Access check failed"],
  ["正在加载数据表", "Loading tables"],
  ["加载表失败", "Failed to load table"],
  ["无可用数据表", "No tables available"],
  ["请先选择数据表", "Select a data table first"],
  ["正在加载", "Loading"],
  ["请输入 SQL", "Enter SQL"],
  ["正在执行 SQL", "Running SQL"],
  ["没有可导出的查询结果", "No query result to export"],
  ["已导出当前结果", "Current result exported"],
  ["盘面 JSON 必须是 4x4 数组", "Board JSON must be a 4x4 array"],
  ["请填写用户 ID 并选择模式", "Enter user ID and select a mode"],
  ["正在签发恢复单", "Issuing rescue offer"],
  ["签发失败", "Issue failed"],
  ["已签发恢复单", "Rescue offer issued"],
  ["请填写用户 ID / 昵称并选择模式", "Enter user ID / nickname and select a mode"],
  ["请选择回放文件或粘贴回放内容", "Select a replay file or paste replay content"],
  ["正在解析回放并签发恢复单", "Parsing replay and issuing rescue offer"],
  ["从回放签发失败", "Failed to issue from replay"],
  ["已从回放签发恢复单", "Rescue offer issued from replay"],
  ["正在查看恢复单", "Loading rescue offers"],
  ["查看失败", "View failed"],
  ["暂无恢复单记录", "No rescue offers"],
  ["签发时间", "Issued At"],
  ["恢复单状态", "Rescue Status"],
  ["对局状态", "Game Status"],
  ["恢复单", "Rescue Offer"],
  ["恢复分数", "Rescue Score"],
  ["恢复时长", "Rescue Duration"],
  ["最终分数", "Final Score"],
  ["最终记录", "Final Record"],
  ["会话", "Session"],
  ["接受时间", "Accepted At"],
  ["拒绝时间", "Rejected At"],
  ["结束时间", "Finished At"],
  ["待处理", "Pending"],
  ["已接受", "Accepted"],
  ["已应用", "Applied"],
  ["已拒绝", "Rejected"],
  ["已过期", "Expired"],
  ["未开始", "Not Started"],
  ["已接受未应用", "Accepted Not Applied"],
  ["已应用，未关联排位会话", "Applied, No Ranked Session"],
  ["游戏进行中", "Game In Progress"],
  ["已结束", "Finished"],
  ["已废弃", "Abandoned"],
  ["有效", "Active"],
  ["暂无内测名单记录", "No beta allowlist records"],
  ["撤销", "Revoke"],
  ["无操作", "No Action"],
  ["无备注", "No Note"],
  ["撤销于", "Revoked At"],
  ["当前有效", "Currently Active"],
  ["资格", "Access"],
  ["操作", "Actions"],
  ["暂无超级管理员记录", "No super admin records"],
  ["最高权限", "Root Admin"],
  ["未设置邮箱", "Email Not Set"],
  ["创建时间未知", "Creation Time Unknown"],
  ["暂无登录记录", "No Login Record"],
  ["创建", "Created"],
  ["最近登录", "Last Login"],
  ["正在加载超级管理员列表", "Loading super admins"],
  ["加载失败", "Load failed"],
  ["授权失败", "Authorization failed"],
  ["已设为超级管理员", "Super admin granted"],
  ["只有最高权限管理员可以设立超级管理员", "Only the root administrator can grant super admin access"],
  ["只有最高权限管理员可以撤销超级管理员", "Only the root administrator can revoke super admin access"],
  ["请填写有效用户 ID", "Enter a valid user ID"],
  ["最高权限管理员不可被撤销", "Root administrator cannot be revoked"],
  ["正在撤销超级管理员权限", "Revoking super admin access"],
  ["撤销失败", "Revoke failed"],
  ["已撤销超级管理员权限", "Super admin access revoked"],
  ["正在加载内测名单", "Loading beta allowlist"],
  ["加载名单失败", "Failed to load allowlist"],
  ["请填写有效邮箱", "Enter a valid email"],
  ["正在加入内测名单", "Adding to beta allowlist"],
  ["加入失败", "Add failed"],
  ["已加入内测名单", "Added to beta allowlist"],
  ["正在撤销内测资格", "Revoking beta access"],
  ["已撤销内测资格", "Beta access revoked"],
  ["暂无成就定义", "No achievement definitions"],
  ["暂无规则", "No rules"],
  ["删除", "Delete"],
  ["请填写成就名称和简介", "Enter achievement name and description"],
  ["正在加载成就", "Loading achievements"],
  ["加载成就失败", "Failed to load achievements"],
  ["正在创建成就", "Creating achievement"],
  ["创建失败", "Create failed"],
  ["成就已创建", "Achievement created"],
  ["请先选择一个成就，或点击创建成就", "Select an achievement first, or click Create Achievement"],
  ["正在保存成就", "Saving achievement"],
  ["保存失败", "Save failed"],
  ["规则保存失败", "Rule save failed"],
  ["成就已保存", "Achievement saved"],
  ["请先选择成就和图标文件", "Select an achievement and icon file first"],
  ["正在上传图标", "Uploading icon"],
  ["图标上传失败", "Icon upload failed"],
  ["图标已上传", "Icon uploaded"],
  ["请填写用户 ID 和成就 ID", "Enter user ID and achievement ID"],
  ["正在发放成就", "Granting achievement"],
  ["发放失败", "Grant failed"],
  ["成就已发放", "Achievement granted"],
  ["正在执行回填", "Running backfill"],
  ["回填失败", "Backfill failed"],
  ["回填任务已提交", "Backfill task submitted"],
  ["已切换到新建草稿", "Switched to new draft"],
  ["请选择模式", "Select mode"],
  ["无撤回", "No Undo"],
  ["有撤回", "Undo"],
  ["合成 2048 结束", "Reach 2048 End"],
  ["斐波那契", "Fibonacci"]
] as Array<[string, string]>).sort((a, b) => b[0].length - a[0].length);
const RESCUE_MODE_OPTIONS: RescueModeOption[] = [
  { label: "4x4 \u65e0\u64a4\u56de", modeKey: "standard_4x4_pow2_no_undo", modeBucket: "standard_no_undo" },
  { label: "4x4 \u6709\u64a4\u56de", modeKey: "classic_4x4_pow2_undo", modeBucket: "standard_undo" },
  { label: "4x4 \u5408\u6210 2048 \u7ed3\u675f", modeKey: "capped_4x4_pow2_no_undo", modeBucket: "capped" },
  { label: "3x3 \u65e0\u64a4\u56de", modeKey: "board_3x3_pow2_no_undo", modeBucket: "pow2_3x3" },
  { label: "3x3 \u6709\u64a4\u56de", modeKey: "board_3x3_pow2_undo", modeBucket: "pow2_3x3_undo" },
  { label: "4x2 \u65e0\u64a4\u56de", modeKey: "board_2x4_pow2_no_undo", modeBucket: "pow2_2x4" },
  { label: "4x2 \u6709\u64a4\u56de", modeKey: "board_2x4_pow2_undo", modeBucket: "pow2_2x4_undo" },
  { label: "4x3 \u65e0\u64a4\u56de", modeKey: "board_3x4_pow2_no_undo", modeBucket: "pow2_3x4" },
  { label: "4x3 \u6709\u64a4\u56de", modeKey: "board_3x4_pow2_undo", modeBucket: "pow2_3x4_undo" },
  { label: "\u6590\u6ce2\u90a3\u5951 4x4 \u65e0\u64a4\u56de", modeKey: "fib_4x4_no_undo", modeBucket: "fib_4x4" },
  { label: "\u6590\u6ce2\u90a3\u5951 4x4 \u6709\u64a4\u56de", modeKey: "fib_4x4_undo", modeBucket: "fib_4x4_undo" },
  { label: "\u6590\u6ce2\u90a3\u5951 3x3 \u65e0\u64a4\u56de", modeKey: "fib_3x3_no_undo", modeBucket: "fib_3x3" },
  { label: "\u6590\u6ce2\u90a3\u5951 3x3 \u6709\u64a4\u56de", modeKey: "fib_3x3_undo", modeBucket: "fib_3x3_undo" },
  { label: "\u6590\u6ce2\u90a3\u5951 4x3 \u65e0\u64a4\u56de", modeKey: "fib_4x3_no_undo", modeBucket: "fib_4x3" },
  { label: "\u6590\u6ce2\u90a3\u5951 4x3 \u6709\u64a4\u56de", modeKey: "fib_4x3_undo", modeBucket: "fib_4x3_undo" },
  { label: "\u6590\u6ce2\u90a3\u5951 4x2 \u65e0\u64a4\u56de", modeKey: "fib_4x2_no_undo", modeBucket: "fib_4x2" },
  { label: "\u6590\u6ce2\u90a3\u5951 4x2 \u6709\u64a4\u56de", modeKey: "fib_4x2_undo", modeBucket: "fib_4x2_undo" }
];

let latestResult: unknown = null;
let isAdminAuthorized = false;
let rescueSubmitInFlight = false;
let initialAccessCheckDone = false;
let canManageSuperAdmins = false;
let latestAchievementRows: JsonRecord[] = [];
let latestSuperAdminRows: JsonRecord[] = [];
let selectedAchievementId = "";
let selectedAchievementRules: JsonRecord[] = [];
const tipTimers = new WeakMap<HTMLElement, number>();
let adminEnglishObserver: MutationObserver | null = null;

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function isEnglishUi(): boolean {
  try {
    return toText(readStorageValue(createBrowserStorageAccess().local(), UI_LANGUAGE_KEY))
      .trim()
      .toLowerCase()
      .startsWith("en");
  } catch (_err) {
    return false;
  }
}

function translateAdminTextToEnglish(value: string): string {
  let out = String(value || "");
  if (!CJK_RE.test(out)) return out;
  for (const [zh, en] of ADMIN_EN_REPLACEMENTS) {
    out = out.split(zh).join(en);
  }
  out = out
    .replace(/已加载\s*(\d+)\s*张表/gu, "Loaded $1 table(s)")
    .replace(/已加载\s*(\d+)\s*行/gu, "Loaded $1 row(s)")
    .replace(/SQL 已返回\s*(\d+)\s*行/gu, "SQL returned $1 row(s)")
    .replace(/已返回\s*(\d+)\s*条恢复单/gu, "Returned $1 rescue offer(s)")
    .replace(/已加载\s*(\d+)\s*条记录/gu, "Loaded $1 record(s)")
    .replace(/已加载\s*(\d+)\s*个超级管理员/gu, "Loaded $1 super admin(s)")
    .replace(/已加载\s*(\d+)\s*个成就/gu, "Loaded $1 achievement(s)")
    .replace(/等级\s*(\d+)/gu, "Level $1")
    .replace(/(\d+)\s*条规则/gu, "$1 rule(s)")
    .replace(/分数\s*/gu, "Score ")
    .replace(/数组/gu, "array")
    .replace(/批次/gu, "batch")
    .replace(/说明/gu, "note")
    .replace(/起始/gu, "initial ")
    .replace(/未知/gu, "Unknown")
    .replace(/模式/gu, "Mode")
    .replace(/用户/gu, "User")
    .replace(/邮箱/gu, "Email")
    .replace(/状态/gu, "Status")
    .replace(/备注/gu, "Note")
    .replace(/操作/gu, "Actions")
    .replace(/恢复/gu, "Rescue")
    .replace(/成就/gu, "Achievement")
    .replace(/规则/gu, "Rule")
    .replace(/正在/gu, "")
    .replace(/失败/gu, "Failed")
    .replace(/成功/gu, "Succeeded")
    .replace(/：/gu, ": ")
    .replace(/（/gu, " (")
    .replace(/）/gu, ")")
    .replace(/，/gu, ", ")
    .replace(/。/gu, ".")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

function shouldSkipAdminTranslationNode(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  return !!parent.closest("script,style,textarea,input,pre,code");
}

function applyAdminEnglishText(root: ParentNode = document): void {
  if (!isEnglishUi()) return;
  document.documentElement.lang = "en";
  document.title = "2048 Admin Console";
  const walker = document.createTreeWalker(
    root as unknown as Node,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (shouldSkipAdminTranslationNode(node)) return NodeFilter.FILTER_REJECT;
        return CJK_RE.test(node.textContent || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }
  );
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  for (const node of textNodes) {
    node.textContent = translateAdminTextToEnglish(node.textContent || "");
  }
  const attrElements: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.matches("[placeholder],[title],[aria-label],[value],option")) {
    attrElements.push(root);
  }
  attrElements.push(...Array.from((root as ParentNode).querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label],[value],option")));
  attrElements.forEach((element) => {
    for (const attr of ["placeholder", "title", "aria-label", "value"]) {
      const value = element.getAttribute(attr);
      if (value && CJK_RE.test(value)) element.setAttribute(attr, translateAdminTextToEnglish(value));
    }
  });
}

function installAdminEnglishTranslator(): void {
  if (!isEnglishUi() || adminEnglishObserver) return;
  applyAdminEnglishText(document);
  adminEnglishObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!shouldSkipAdminTranslationNode(node) && CJK_RE.test(node.textContent || "")) {
            node.textContent = translateAdminTextToEnglish(node.textContent || "");
          }
          continue;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          applyAdminEnglishText(node as Element);
        }
      }
      if (mutation.type === "characterData") {
        const node = mutation.target;
        if (!shouldSkipAdminTranslationNode(node) && CJK_RE.test(node.textContent || "")) {
          node.textContent = translateAdminTextToEnglish(node.textContent || "");
        }
      }
      if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
        applyAdminEnglishText(mutation.target as Element);
      }
    }
  });
  adminEnglishObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label", "value"]
  });
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
  const input = byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
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

async function readSelectedFileText(id: string): Promise<string> {
  const input = byId<HTMLInputElement>(id);
  const file = input?.files?.[0];
  if (!file) return "";
  return (await file.text()).trim();
}

function getErrorMessage(result: JsonRecord | null | undefined, fallback: string): string {
  return toText(result?.error || result?.message || result?.code || fallback);
}

function createAdminPageService() {
  return createAdminService({
    windowLike: typeof window === "undefined" ? null : window
  });
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<JsonRecord> {
  return createAdminPageService().request(path, options);
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

function setAdminAccessState(state: "checking" | "granted" | "denied"): void {
  document.body.setAttribute("data-admin-access", state);
}

function redirectDeniedAdminAccess(): void {
  setAdminAccessState("denied");
  if (window.location.pathname.endsWith("/beta-login.html") || window.location.pathname.endsWith("/beta-login")) return;
  window.location.replace(ADMIN_DENIED_REDIRECT);
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

function formatDateTime(value: unknown): string {
  const text = toText(value).trim();
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatDurationMs(value: unknown): string {
  const ms = Math.floor(Number(value));
  if (!Number.isFinite(ms) || ms < 0) return "";
  const seconds = Math.floor(ms / 1000);
  const milli = String(ms % 1000).padStart(3, "0");
  const s = seconds % 60;
  const minutes = Math.floor(seconds / 60);
  const m = minutes % 60;
  const h = Math.floor(minutes / 60);
  if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + "." + milli;
  if (minutes > 0) return minutes + ":" + String(s).padStart(2, "0") + "." + milli;
  return s + "." + milli;
}

function rescueStatusLabel(status: unknown): string {
  switch (toText(status)) {
    case "pending": return "待处理";
    case "accepted": return "已接受";
    case "consumed": return "已应用";
    case "rejected": return "已拒绝";
    case "expired": return "已过期";
    default: return toText(status) || "未知";
  }
}

function gameProgressLabel(status: unknown): string {
  switch (toText(status)) {
    case "not_started": return "未开始";
    case "accepted_not_applied": return "已接受未应用";
    case "applied_no_ranked_session": return "已应用，未关联排位会话";
    case "in_progress": return "游戏进行中";
    case "finished": return "已结束";
    case "rejected": return "已拒绝";
    case "expired": return "已过期";
    case "abandoned": return "已废弃";
    default: return toText(status) || "未知";
  }
}

function renderStatusPill(text: string, rawStatus: unknown): string {
  const status = toText(rawStatus).replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || "unknown";
  return '<span class="admin-status-pill admin-status-' + escapeHtml(status) + '">' + escapeHtml(text) + '</span>';
}

function renderRescueOfferHistory(target: HTMLElement | null, payload: unknown): void {
  if (!target) return;
  const rows = normalizeRows(payload);
  if (!rows.length) {
    target.innerHTML = '<div class="admin-empty-state">暂无恢复单记录</div>';
    return;
  }
  const body = rows.map((row) => {
    const user = "#" + formatCell(row.user_id) + (row.target_nickname ? " / " + formatCell(row.target_nickname) : "");
    const rescueStatus = toText(row.rescue_status || row.status);
    const progressStatus = toText(row.game_progress_status);
    const finalScore = row.final_score == null || row.final_score === "" ? "" : formatCell(row.final_score);
    const finalRecordId = toText(row.final_record_id);
    const sessionId = toText(row.game_session_id || row.challenge_id);
    return "<tr>" +
      "<td>" + escapeHtml(formatDateTime(row.created_at)) + "</td>" +
      '<td class="admin-mono-cell" title="' + escapeHtml(toText(row.id)) + '">' + escapeHtml(toText(row.id)) + "</td>" +
      "<td>" + escapeHtml(user) + "</td>" +
      "<td>" + escapeHtml(formatCell(row.mode_key)) + "</td>" +
      "<td>" + escapeHtml(formatCell(row.score)) + "</td>" +
      "<td>" + escapeHtml(formatDurationMs(row.duration_ms)) + "</td>" +
      "<td>" + renderStatusPill(rescueStatusLabel(rescueStatus), rescueStatus) + "</td>" +
      "<td>" + renderStatusPill(gameProgressLabel(progressStatus), progressStatus) + "</td>" +
      "<td>" + escapeHtml(finalScore) + "</td>" +
      '<td class="admin-mono-cell" title="' + escapeHtml(finalRecordId) + '">' + escapeHtml(finalRecordId) + "</td>" +
      '<td class="admin-mono-cell" title="' + escapeHtml(sessionId) + '">' + escapeHtml(sessionId) + "</td>" +
      "<td>" + escapeHtml(formatDateTime(row.accepted_at)) + "</td>" +
      "<td>" + escapeHtml(formatDateTime(row.rejected_at)) + "</td>" +
      "<td>" + escapeHtml(formatDateTime(row.game_finished_at || row.final_ended_at)) + "</td>" +
    "</tr>";
  }).join("");
  target.innerHTML =
    '<table class="admin-result-table admin-rescue-history-table">' +
      "<thead><tr>" +
        "<th>签发时间</th><th>恢复单</th><th>用户</th><th>模式</th><th>恢复分数</th><th>恢复时长</th>" +
        "<th>恢复单状态</th><th>对局状态</th><th>最终分数</th><th>最终记录</th><th>会话</th>" +
        "<th>接受时间</th><th>拒绝时间</th><th>结束时间</th>" +
      "</tr></thead><tbody>" + body + "</tbody></table>";
}

function betaAccessStatusLabel(status: unknown): string {
  switch (toText(status)) {
    case "active": return "有效";
    case "revoked": return "已撤销";
    default: return toText(status) || "未知";
  }
}

function betaAccessListPath(): string {
  const status = getInputValue("admin-beta-access-status") || "active";
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  return "/admin/beta-access/allowlist" + (params.toString() ? "?" + params.toString() : "");
}

function renderBetaAccessAllowlist(payload: unknown): void {
  const target = byId("admin-beta-access-list");
  if (!target) return;
  const rows = normalizeRows(payload);
  if (!rows.length) {
    target.innerHTML = '<div class="admin-empty-state">暂无内测名单记录</div>';
    return;
  }
  const listRows = rows.map((row) => {
    const id = toText(row.id);
    const email = toText(row.email);
    const status = toText(row.status || "active");
    const note = toText(row.note);
    const createdAt = formatDateTime(row.created_at || row.createdAt);
    const revokedAt = formatDateTime(row.revoked_at || row.revokedAt);
    const action = status === "active"
      ? '<button class="replay-button" type="button" data-admin-beta-access-revoke="' + escapeHtml(id) + '">撤销</button>'
      : '<span class="admin-beta-access-meta">无操作</span>';
    return '<div class="admin-beta-access-row">' +
      '<div class="admin-beta-access-identity"><div class="admin-beta-access-email" title="' + escapeHtml(email) + '">' + escapeHtml(email) + '</div>' +
      '<div class="admin-beta-access-meta">ID ' + escapeHtml(id) + (createdAt ? " · " + escapeHtml(createdAt) : "") + '</div></div>' +
      '<div class="admin-beta-access-status">' + renderStatusPill(betaAccessStatusLabel(status), status) + '</div>' +
      '<div class="admin-beta-access-note" title="' + escapeHtml(note || "无备注") + '">' + escapeHtml(note || "无备注") + '</div>' +
      '<div class="admin-beta-access-lifecycle">' + escapeHtml(revokedAt ? "撤销于 " + revokedAt : "当前有效") + '</div>' +
      '<div class="admin-beta-access-actions">' + action + '</div>' +
    "</div>";
  }).join("");
  target.innerHTML =
    '<div class="admin-beta-access-table-head" aria-hidden="true">' +
      '<span>邮箱</span><span>状态</span><span>备注</span><span>资格</span><span>操作</span>' +
    '</div>' +
    listRows;
  bindBetaAccessListActions();
}

function setSuperAdminManagementState(enabled: boolean): void {
  canManageSuperAdmins = enabled;
  const card = byId<HTMLElement>("admin-super-admin-card");
  if (card) card.hidden = !enabled;
  if (!enabled) {
    latestSuperAdminRows = [];
    const list = byId("admin-super-admin-list");
    if (list) list.innerHTML = "";
    clearTip(byId("admin-super-admin-tip"));
  }
}

function superAdminDisplayName(row: JsonRecord): string {
  return toText(row.nickname || row.display_name || row.displayName || row.email || ("#" + toText(row.id))).trim();
}

function renderSuperAdminUsers(payload: unknown): void {
  const target = byId("admin-super-admin-list");
  if (!target) return;
  latestSuperAdminRows = normalizeRows(payload);
  if (!latestSuperAdminRows.length) {
    target.innerHTML = '<div class="admin-empty-state">暂无超级管理员记录</div>';
    return;
  }
  target.innerHTML = latestSuperAdminRows.map((row) => {
    const id = Number(row.id);
    const idText = toText(row.id);
    const email = toText(row.email);
    const displayName = superAdminDisplayName(row);
    const createdAt = formatDateTime(row.created_at || row.createdAt);
    const lastLoginAt = formatDateTime(row.last_login_at || row.lastLoginAt);
    const action = id === 0
      ? '<span class="admin-super-admin-root-badge">最高权限</span>'
      : '<button class="replay-button" type="button" data-admin-super-admin-revoke="' + escapeHtml(idText) + '">撤销</button>';
    return '<div class="admin-super-admin-row">' +
      '<div><div class="admin-beta-access-email">#' + escapeHtml(idText) + ' · ' + escapeHtml(displayName) + '</div>' +
      '<div class="admin-beta-access-meta">' + escapeHtml(email || "未设置邮箱") + '</div></div>' +
      '<div>' + renderStatusPill(id === 0 ? "Root" : "Super Admin", id === 0 ? "root" : "active") + '</div>' +
      '<div class="admin-beta-access-meta">' + escapeHtml(createdAt ? "创建 " + createdAt : "创建时间未知") + '</div>' +
      '<div class="admin-beta-access-meta">' + escapeHtml(lastLoginAt ? "最近登录 " + lastLoginAt : "暂无登录记录") + '</div>' +
      '<div class="admin-beta-access-actions">' + action + '</div>' +
    "</div>";
  }).join("");
  bindSuperAdminListActions();
}

async function loadSuperAdminUsers(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  if (!canManageSuperAdmins) return;
  setButtonBusy("admin-super-admin-refresh", true);
  setTip(byId("admin-super-admin-tip"), "正在加载超级管理员列表...", "busy");
  try {
    const result = await apiRequest("/admin/super-admins", { method: "GET" });
    if (result.success === false) {
      setTip(byId("admin-super-admin-tip"), "加载失败：" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    renderSuperAdminUsers(result);
    setTip(byId("admin-super-admin-tip"), "已加载 " + latestSuperAdminRows.length + " 个超级管理员", "ok", 3000);
  } finally {
    setButtonBusy("admin-super-admin-refresh", false);
  }
}

async function addSuperAdminUser(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  if (!canManageSuperAdmins) {
    setTip(byId("admin-super-admin-tip"), "只有最高权限管理员可以设立超级管理员", "err");
    return;
  }
  const userId = parsePositiveInt("admin-super-admin-user-id", 0);
  if (!userId) {
    setTip(byId("admin-super-admin-tip"), "请填写有效用户 ID", "err");
    return;
  }
  setButtonBusy("admin-super-admin-add", true);
  setTip(byId("admin-super-admin-tip"), "正在设为超级管理员...", "busy");
  try {
    const result = await apiRequest("/admin/super-admins", {
      method: "POST",
      body: JSON.stringify({ user_id: userId })
    });
    if (result.success === false) {
      setTip(byId("admin-super-admin-tip"), "授权失败：" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    setInputValue("admin-super-admin-user-id", "");
    setTip(byId("admin-super-admin-tip"), "已设为超级管理员", "ok", 3000);
    await loadSuperAdminUsers();
  } finally {
    setButtonBusy("admin-super-admin-add", false);
  }
}

async function revokeSuperAdminUser(id: string): Promise<void> {
  if (!(await ensureAdminReady())) return;
  if (!canManageSuperAdmins) {
    setTip(byId("admin-super-admin-tip"), "只有最高权限管理员可以撤销超级管理员", "err");
    return;
  }
  const normalizedId = toText(id).trim();
  if (!normalizedId || normalizedId === "0") {
    setTip(byId("admin-super-admin-tip"), "最高权限管理员不可被撤销", "err");
    return;
  }
  setTip(byId("admin-super-admin-tip"), "正在撤销超级管理员权限...", "busy");
  try {
    const result = await apiRequest("/admin/super-admins/" + encodeURIComponent(normalizedId), {
      method: "DELETE"
    });
    if (result.success === false) {
      setTip(byId("admin-super-admin-tip"), "撤销失败：" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    setTip(byId("admin-super-admin-tip"), "已撤销超级管理员权限", "ok", 3000);
    await loadSuperAdminUsers();
  } finally {
    setButtonBusy("admin-super-admin-refresh", false);
  }
}

function bindSuperAdminListActions(): void {
  byId("admin-super-admin-list")?.querySelectorAll<HTMLButtonElement>("[data-admin-super-admin-revoke]").forEach((button) => {
    button.addEventListener("click", () => {
      void revokeSuperAdminUser(button.dataset.adminSuperAdminRevoke || "");
    });
  });
}

async function loadBetaAccessAllowlist(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  setButtonBusy("admin-beta-access-refresh", true);
  setTip(byId("admin-beta-access-tip"), "正在加载内测名单...", "busy");
  try {
    const result = await apiRequest(betaAccessListPath(), { method: "GET" });
    renderBetaAccessAllowlist(result);
    const rowCount = normalizeRows(result).length;
    setTip(
      byId("admin-beta-access-tip"),
      result.success === false ? "加载名单失败：" + getErrorMessage(result, "unknown") : "已加载 " + rowCount + " 条记录",
      result.success === false ? "err" : "ok",
      result.success === false ? 0 : 3000
    );
  } finally {
    setButtonBusy("admin-beta-access-refresh", false);
  }
}

async function addBetaAccessAllowlist(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const email = getInputValue("admin-beta-access-email").toLowerCase();
  const note = getInputValue("admin-beta-access-note");
  if (!email || !email.includes("@")) {
    setTip(byId("admin-beta-access-tip"), "请填写有效邮箱", "err");
    return;
  }
  setButtonBusy("admin-beta-access-add", true);
  setTip(byId("admin-beta-access-tip"), "正在加入内测名单...", "busy");
  try {
    const result = await apiRequest("/admin/beta-access/allowlist", {
      method: "POST",
      body: JSON.stringify({ email, note })
    });
    if (result.success === false) {
      setTip(byId("admin-beta-access-tip"), "加入失败：" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    setInputValue("admin-beta-access-email", "");
    setTip(byId("admin-beta-access-tip"), "已加入内测名单", "ok", 3000);
    await loadBetaAccessAllowlist();
  } finally {
    setButtonBusy("admin-beta-access-add", false);
  }
}

async function revokeBetaAccessAllowlist(id: string): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const normalizedId = toText(id).trim();
  if (!normalizedId) return;
  setTip(byId("admin-beta-access-tip"), "正在撤销内测资格...", "busy");
  try {
    const result = await apiRequest("/admin/beta-access/allowlist/" + encodeURIComponent(normalizedId), {
      method: "DELETE"
    });
    if (result.success === false) {
      setTip(byId("admin-beta-access-tip"), "撤销失败：" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    setTip(byId("admin-beta-access-tip"), "已撤销内测资格", "ok", 3000);
    await loadBetaAccessAllowlist();
  } finally {
    setButtonBusy("admin-beta-access-refresh", false);
  }
}

function bindBetaAccessListActions(): void {
  byId("admin-beta-access-list")?.querySelectorAll<HTMLButtonElement>("[data-admin-beta-access-revoke]").forEach((button) => {
    button.addEventListener("click", () => {
      void revokeBetaAccessAllowlist(button.dataset.adminBetaAccessRevoke || "");
    });
  });
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

async function checkAuth(options: { redirectOnDeny?: boolean } = {}): Promise<boolean> {
  const output = byId("admin-auth-output");
  clearTip(byId("admin-query-tip"));
  setButtonBusy("admin-check-auth", true);
  setAuthState(false, "\u68c0\u67e5\u4e2d");
  renderOutput(output, { status: "checking" });
  try {
    const result = await apiRequest("/admin/me", { method: "GET" });
    renderOutput(output, result);
    const authData = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data as JsonRecord : {};
    const ok = result.success !== false && (result.admin === true || authData.admin === true);
    if (ok) {
      const user = (result.user && typeof result.user === "object" ? result.user : authData) as JsonRecord | undefined;
      const rootAdmin = authData.rootAdmin === true || authData.root_admin === true;
      const canManage = rootAdmin || authData.canManageSuperAdmins === true || authData.can_manage_super_admins === true;
      setAdminAccessState("granted");
      setSuperAdminManagementState(canManage);
      setAuthState(true, "\u5df2\u6388\u6743");
      setTip(byId("admin-query-tip"), "\u7ba1\u7406\u5458\u6743\u9650\u6b63\u5e38" + (user?.id ? " ID=" + user.id : ""), "ok", 3500);
      return true;
    }
    setSuperAdminManagementState(false);
    setAuthState(false, result.code === "NO_TOKEN" ? "\u672a\u767b\u5f55" : "\u65e0\u6743\u9650");
    setTip(byId("admin-query-tip"), getErrorMessage(result, "\u6743\u9650\u68c0\u67e5\u5931\u8d25"), "err");
    if (options.redirectOnDeny) redirectDeniedAdminAccess();
    return false;
  } finally {
    initialAccessCheckDone = true;
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
  renderRescueOfferHistory(byId("admin-rescue-history"), []);
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

async function createRescueOfferFromReplay(): Promise<void> {
  if (rescueSubmitInFlight) return;
  if (!(await ensureAdminReady())) return;
  clearTip(byId("admin-rescue-tip"));
  syncRescueModeFields();
  const targetUser = getInputValue("admin-rescue-target-user") || getInputValue("admin-rescue-user-id");
  const modeKey = getInputValue("admin-rescue-mode-key");
  const replayText = (await readSelectedFileText("admin-rescue-replay-file")) || getInputValue("admin-rescue-replay-text");
  if (!targetUser || !modeKey) {
    setTip(byId("admin-rescue-tip"), "\u8bf7\u586b\u5199\u7528\u6237 ID / \u6635\u79f0\u5e76\u9009\u62e9\u6a21\u5f0f", "err");
    return;
  }
  if (!replayText) {
    setTip(byId("admin-rescue-tip"), "\u8bf7\u9009\u62e9\u56de\u653e\u6587\u4ef6\u6216\u7c98\u8d34\u56de\u653e\u5185\u5bb9", "err");
    return;
  }
  const payload = {
    target_user: targetUser,
    mode_key: modeKey,
    replay_string: replayText,
    expires_in_hours: parsePositiveInt("admin-rescue-expires", 168),
    reason: getInputValue("admin-rescue-reason")
  };
  rescueSubmitInFlight = true;
  setButtonBusy("admin-create-rescue-from-replay", true);
  setTip(byId("admin-rescue-tip"), "\u6b63\u5728\u89e3\u6790\u56de\u653e\u5e76\u7b7e\u53d1\u6062\u590d\u5355...", "busy");
  renderRescueOfferHistory(byId("admin-rescue-history"), []);
  renderOutput(byId("admin-rescue-output"), { status: "submitting_replay", target_user: targetUser, mode_key: modeKey });
  try {
    const result = await apiRequest("/admin/rescue-offers/from-replay", { method: "POST", body: JSON.stringify(payload) });
    renderOutput(byId("admin-rescue-output"), result);
    if (result.success === false) {
      setTip(byId("admin-rescue-tip"), "\u4ece\u56de\u653e\u7b7e\u53d1\u5931\u8d25\uff1a" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    const data = result.data as JsonRecord | undefined;
    const summary = result.summary as JsonRecord | undefined;
    if (data) {
      setInputValue("admin-rescue-score", toText(data.score || ""));
      setInputValue("admin-rescue-duration", toText(data.duration_ms || ""));
      if (data.board) setInputValue("admin-rescue-board", stringify(data.board));
    }
    setTip(
      byId("admin-rescue-tip"),
      "\u5df2\u4ece\u56de\u653e\u7b7e\u53d1\u6062\u590d\u5355" +
        (data?.id ? " ID=" + data.id : "") +
        (summary?.score != null ? " / \u5206\u6570 " + summary.score : ""),
      "ok",
      6000
    );
  } finally {
    rescueSubmitInFlight = false;
    setButtonBusy("admin-create-rescue-from-replay", false);
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
    renderRescueOfferHistory(byId("admin-rescue-history"), result);
    renderOutput(byId("admin-rescue-output"), result);
    const rowCount = normalizeRows(result).length;
    setTip(byId("admin-rescue-tip"), result.success === false ? "\u67e5\u770b\u5931\u8d25\uff1a" + getErrorMessage(result, "unknown") : "\u5df2\u8fd4\u56de " + rowCount + " \u6761\u6062\u590d\u5355", result.success === false ? "err" : "ok", result.success === false ? 0 : 3500);
  } finally {
    setButtonBusy("admin-list-rescue", false);
  }
}

function achievementId(row: JsonRecord | null | undefined): string {
  return toText(row?.id || row?.achievement_id).trim();
}

function achievementStatusLabel(status: unknown): string {
  switch (toText(status)) {
    case "draft": return "草稿";
    case "active": return "已启用";
    case "archived": return "已归档";
    default: return toText(status) || "未知";
  }
}

function renderAchievementIcon(row: JsonRecord): string {
  const name = toText(row.name || row.title || row.id || "成");
  const iconUrl = toText(row.icon_url || row.iconUrl).trim();
  const fallback = escapeHtml(name.slice(0, 1) || "成");
  return '<span class="admin-achievement-icon">' +
    (iconUrl ? '<img src="' + escapeHtml(iconUrl) + '" alt="">' : fallback) +
    "</span>";
}

function filteredAchievementRows(): JsonRecord[] {
  const keyword = getInputValue("admin-achievement-search").toLowerCase();
  const status = getInputValue("admin-achievement-status-filter") || "all";
  return latestAchievementRows.filter((row) => {
    const haystack = [row.id, row.name, row.description, row.series_id].map(toText).join(" ").toLowerCase();
    const matchesKeyword = !keyword || haystack.includes(keyword);
    const matchesStatus = status === "all" || toText(row.status || "draft") === status;
    return matchesKeyword && matchesStatus;
  });
}

function renderAchievementList(): void {
  const target = byId("admin-achievement-list");
  if (!target) return;
  const rows = filteredAchievementRows();
  if (!rows.length) {
    target.innerHTML = '<div class="admin-empty-state">暂无成就定义</div>';
    return;
  }
  target.innerHTML = rows.map((row) => {
    const id = achievementId(row);
    const name = toText(row.name || id);
    const status = toText(row.status || "draft");
    const ruleCount = Array.isArray(row.rules) ? row.rules.length : 0;
    return '<button type="button" class="admin-achievement-item' + (id === selectedAchievementId ? " is-selected" : "") + '" data-achievement-id="' + escapeHtml(id) + '">' +
      renderAchievementIcon(row) +
      '<span><span class="admin-achievement-item-title"><strong>' + escapeHtml(name) + '</strong>' +
      renderStatusPill(achievementStatusLabel(status), status) +
      '</span><p>' + escapeHtml(id) + " · 等级 " + escapeHtml(toText(row.level || 1)) + " · " + ruleCount + " 条规则</p></span>" +
    "</button>";
  }).join("");
  target.querySelectorAll<HTMLButtonElement>(".admin-achievement-item").forEach((button) => {
    button.addEventListener("click", () => selectAchievement(button.dataset.achievementId || ""));
  });
}

function renderAchievementRules(): void {
  const target = byId("admin-achievement-rules");
  if (!target) return;
  if (!selectedAchievementRules.length) {
    target.innerHTML = '<div class="admin-empty-state">暂无规则</div>';
    return;
  }
  target.innerHTML = selectedAchievementRules.map((rule, index) => {
    const type = toText(rule.type || "manual_grant");
    const params = rule.params && typeof rule.params === "object" ? rule.params : {};
    return '<div class="admin-achievement-rule-row">' +
      '<code>' + escapeHtml(type + " " + stringify(params)) + '</code>' +
      '<button class="replay-button" type="button" data-rule-index="' + index + '">删除</button>' +
    "</div>";
  }).join("");
  target.querySelectorAll<HTMLButtonElement>("button[data-rule-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.ruleIndex);
      if (Number.isFinite(index)) {
        selectedAchievementRules.splice(index, 1);
        renderAchievementRules();
      }
    });
  });
}

function clearAchievementForm(): void {
  selectedAchievementId = "";
  selectedAchievementRules = [];
  setInputValue("admin-achievement-id", "");
  setInputValue("admin-achievement-name", "");
  setInputValue("admin-achievement-series", "");
  setInputValue("admin-achievement-level", "1");
  setInputValue("admin-achievement-status", "draft");
  setInputValue("admin-achievement-sort", "0");
  setInputValue("admin-achievement-icon-url", "");
  setInputValue("admin-achievement-description", "");
  setInputValue("admin-achievement-grant-id", "");
  renderAchievementRules();
  renderAchievementList();
}

function fillAchievementForm(row: JsonRecord): void {
  const id = achievementId(row);
  selectedAchievementId = id;
  selectedAchievementRules = Array.isArray(row.rules) ? row.rules.map(toRecordLike) : [];
  setInputValue("admin-achievement-id", id);
  setInputValue("admin-achievement-name", toText(row.name));
  setInputValue("admin-achievement-series", toText(row.series_id));
  setInputValue("admin-achievement-level", toText(row.level || 1));
  setInputValue("admin-achievement-status", toText(row.status || "draft"));
  setInputValue("admin-achievement-sort", toText(row.sort_order || 0));
  setInputValue("admin-achievement-icon-url", toText(row.icon_url));
  setInputValue("admin-achievement-description", toText(row.description));
  setInputValue("admin-achievement-grant-id", id);
  setInputValue("admin-achievement-backfill-id", id);
  renderAchievementRules();
  renderAchievementList();
}

function toRecordLike(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function selectAchievement(id: string): void {
  const row = latestAchievementRows.find((item) => achievementId(item) === id);
  if (row) fillAchievementForm(row);
}

function collectAchievementPayload(): JsonRecord | null {
  const name = getInputValue("admin-achievement-name");
  const description = getInputValue("admin-achievement-description");
  if (!name || !description) {
    setTip(byId("admin-achievement-tip"), "请填写成就名称和简介", "err");
    return null;
  }
  const payload: JsonRecord = {
    name,
    description,
    level: parsePositiveInt("admin-achievement-level", 1),
    status: getInputValue("admin-achievement-status") || "draft",
    sort_order: parseNonNegativeInt("admin-achievement-sort", 0),
    rules: selectedAchievementRules
  };
  const seriesId = getInputValue("admin-achievement-series");
  const iconUrl = getInputValue("admin-achievement-icon-url");
  if (seriesId) payload.series_id = seriesId;
  if (iconUrl) payload.icon_url = iconUrl;
  return payload;
}

function collectAchievementRule(): JsonRecord {
  const type = getInputValue("admin-achievement-rule-type") || "manual_grant";
  const params: JsonRecord = {};
  const tile = parseNonNegativeInt("admin-achievement-rule-tile", 0);
  const count = parseNonNegativeInt("admin-achievement-rule-count", 0);
  const modeKey = getInputValue("admin-achievement-rule-mode");
  const eventId = getInputValue("admin-achievement-rule-event");
  const rank = parseNonNegativeInt("admin-achievement-rule-rank", 0);
  if (tile > 0) params.tile = tile;
  if (count > 0) params.count = count;
  if (modeKey) params.mode_key = modeKey;
  if (eventId) params.event_id = eventId;
  if (rank > 0) params.rank = rank;
  return { type, params };
}

async function refreshAchievements(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  setButtonBusy("admin-achievement-refresh", true);
  setTip(byId("admin-achievement-tip"), "正在加载成就...", "busy");
  try {
    const result = await apiRequest("/admin/achievements", { method: "GET" });
    latestAchievementRows = normalizeRows(result);
    if (result.success === false) {
      setTip(byId("admin-achievement-tip"), "加载成就失败：" + getErrorMessage(result, "unknown"), "err");
    } else {
      setTip(byId("admin-achievement-tip"), "已加载 " + latestAchievementRows.length + " 个成就", "ok", 3000);
    }
    renderAchievementList();
    renderOutput(byId("admin-achievement-output"), result);
  } finally {
    setButtonBusy("admin-achievement-refresh", false);
  }
}

async function createAchievement(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const payload = collectAchievementPayload();
  if (!payload) return;
  setButtonBusy("admin-achievement-create", true);
  setTip(byId("admin-achievement-tip"), "正在创建成就...", "busy");
  try {
    const result = await apiRequest("/admin/achievements", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    renderOutput(byId("admin-achievement-output"), result);
    if (result.success === false) {
      setTip(byId("admin-achievement-tip"), "创建失败：" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    setTip(byId("admin-achievement-tip"), "成就已创建", "ok", 3000);
    await refreshAchievements();
  } finally {
    setButtonBusy("admin-achievement-create", false);
  }
}

async function saveAchievement(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const id = getInputValue("admin-achievement-id") || selectedAchievementId;
  if (!id) {
    setTip(byId("admin-achievement-tip"), "请先选择一个成就，或点击创建成就", "err");
    return;
  }
  const payload = collectAchievementPayload();
  if (!payload) return;
  setButtonBusy("admin-achievement-save", true);
  setTip(byId("admin-achievement-tip"), "正在保存成就...", "busy");
  try {
    const updateResult = await apiRequest("/admin/achievements/" + encodeURIComponent(id), {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    if (updateResult.success === false) {
      renderOutput(byId("admin-achievement-output"), updateResult);
      setTip(byId("admin-achievement-tip"), "保存失败：" + getErrorMessage(updateResult, "unknown"), "err");
      return;
    }
    const rulesResult = await apiRequest("/admin/achievements/" + encodeURIComponent(id) + "/rules", {
      method: "POST",
      body: JSON.stringify({ rules: selectedAchievementRules })
    });
    renderOutput(byId("admin-achievement-output"), { update: updateResult, rules: rulesResult });
    if (rulesResult.success === false) {
      setTip(byId("admin-achievement-tip"), "规则保存失败：" + getErrorMessage(rulesResult, "unknown"), "err");
      return;
    }
    setTip(byId("admin-achievement-tip"), "成就已保存", "ok", 3000);
    await refreshAchievements();
  } finally {
    setButtonBusy("admin-achievement-save", false);
  }
}

async function uploadAchievementIcon(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const id = getInputValue("admin-achievement-id") || selectedAchievementId;
  const file = byId<HTMLInputElement>("admin-achievement-icon-file")?.files?.[0];
  if (!id || !file) {
    setTip(byId("admin-achievement-tip"), "请先选择成就和图标文件", "err");
    return;
  }
  const formData = new FormData();
  formData.append("icon", file);
  setButtonBusy("admin-achievement-upload-icon", true);
  setTip(byId("admin-achievement-tip"), "正在上传图标...", "busy");
  try {
    const result = await apiRequest("/admin/achievements/" + encodeURIComponent(id) + "/icon", {
      method: "POST",
      body: formData
    });
    renderOutput(byId("admin-achievement-output"), result);
    if (result.success === false) {
      setTip(byId("admin-achievement-tip"), "图标上传失败：" + getErrorMessage(result, "unknown"), "err");
      return;
    }
    setTip(byId("admin-achievement-tip"), "图标已上传", "ok", 3000);
    await refreshAchievements();
  } finally {
    setButtonBusy("admin-achievement-upload-icon", false);
  }
}

async function grantAchievement(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const userId = parsePositiveInt("admin-achievement-grant-user", 0);
  const achievementIdValue = getInputValue("admin-achievement-grant-id");
  if (!userId || !achievementIdValue) {
    setTip(byId("admin-achievement-tip"), "请填写用户 ID 和成就 ID", "err");
    return;
  }
  const payload: JsonRecord = {
    user_id: userId,
    achievement_id: achievementIdValue,
    source: getInputValue("admin-achievement-grant-source") || "manual"
  };
  const note = getInputValue("admin-achievement-grant-note");
  if (note) payload.note = note;
  setButtonBusy("admin-achievement-grant", true);
  setTip(byId("admin-achievement-tip"), "正在发放成就...", "busy");
  try {
    const result = await apiRequest("/admin/achievements/grant", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    renderOutput(byId("admin-achievement-output"), result);
    setTip(
      byId("admin-achievement-tip"),
      result.success === false ? "发放失败：" + getErrorMessage(result, "unknown") : "成就已发放",
      result.success === false ? "err" : "ok",
      result.success === false ? 0 : 3000
    );
  } finally {
    setButtonBusy("admin-achievement-grant", false);
  }
}

async function backfillAchievements(): Promise<void> {
  if (!(await ensureAdminReady())) return;
  const userId = parsePositiveInt("admin-achievement-backfill-user", 0);
  const achievementIdValue = getInputValue("admin-achievement-backfill-id");
  const payload: JsonRecord = {};
  if (userId) payload.user_id = userId;
  if (achievementIdValue) payload.achievement_id = achievementIdValue;
  if (!window.confirm("确认执行成就回填？该操作应当由后端保证幂等。")) return;
  setButtonBusy("admin-achievement-backfill", true);
  setTip(byId("admin-achievement-tip"), "正在执行回填...", "busy");
  try {
    const result = await apiRequest("/admin/achievements/backfill", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    renderOutput(byId("admin-achievement-output"), result);
    setTip(
      byId("admin-achievement-tip"),
      result.success === false ? "回填失败：" + getErrorMessage(result, "unknown") : "回填任务已提交",
      result.success === false ? "err" : "ok",
      result.success === false ? 0 : 3000
    );
  } finally {
    setButtonBusy("admin-achievement-backfill", false);
  }
}

function addAchievementRule(): void {
  selectedAchievementRules = [...selectedAchievementRules, collectAchievementRule()];
  renderAchievementRules();
}

function bind(id: string, handler: () => void | Promise<void>): void {
  byId<HTMLButtonElement>(id)?.addEventListener("click", () => {
    Promise.resolve(handler()).catch((error) => {
      setTip(byId("admin-query-tip"), error instanceof Error ? error.message : String(error), "err");
    });
  });
}

function bindTipReset(): void {
  for (const id of ["admin-rescue-user-id", "admin-rescue-target-user", "admin-rescue-score", "admin-rescue-duration", "admin-rescue-expires", "admin-rescue-board", "admin-rescue-replay-text", "admin-rescue-reason"]) {
    byId<HTMLInputElement | HTMLTextAreaElement>(id)?.addEventListener("input", () => clearTip(byId("admin-rescue-tip")));
  }
  byId<HTMLInputElement>("admin-rescue-replay-file")?.addEventListener("change", () => clearTip(byId("admin-rescue-tip")));
  for (const id of ["admin-table-select", "admin-table-limit", "admin-table-page", "admin-sql"]) {
    byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id)?.addEventListener("input", () => clearTip(byId("admin-query-tip")));
    byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id)?.addEventListener("change", () => clearTip(byId("admin-query-tip")));
  }
  for (const id of ["admin-beta-access-email", "admin-beta-access-note", "admin-beta-access-status"]) {
    byId<HTMLInputElement | HTMLSelectElement>(id)?.addEventListener("input", () => clearTip(byId("admin-beta-access-tip")));
    byId<HTMLInputElement | HTMLSelectElement>(id)?.addEventListener("change", () => clearTip(byId("admin-beta-access-tip")));
  }
  byId<HTMLInputElement>("admin-super-admin-user-id")?.addEventListener("input", () => clearTip(byId("admin-super-admin-tip")));
  for (const id of [
    "admin-achievement-search",
    "admin-achievement-status-filter",
    "admin-achievement-name",
    "admin-achievement-series",
    "admin-achievement-level",
    "admin-achievement-status",
    "admin-achievement-sort",
    "admin-achievement-icon-url",
    "admin-achievement-description",
    "admin-achievement-rule-type",
    "admin-achievement-rule-tile",
    "admin-achievement-rule-count",
    "admin-achievement-rule-mode",
    "admin-achievement-rule-event",
    "admin-achievement-rule-rank",
    "admin-achievement-grant-user",
    "admin-achievement-grant-id",
    "admin-achievement-grant-source",
    "admin-achievement-grant-note",
    "admin-achievement-backfill-user",
    "admin-achievement-backfill-id"
  ]) {
    const node = byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
    node?.addEventListener("input", () => {
      clearTip(byId("admin-achievement-tip"));
      if (id === "admin-achievement-search") renderAchievementList();
    });
    node?.addEventListener("change", () => {
      clearTip(byId("admin-achievement-tip"));
      if (id === "admin-achievement-status-filter") renderAchievementList();
    });
  }
}

export function bootstrapAdminPage(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-page-system", "unified-page-system");
  installAdminEnglishTranslator();
  window.addEventListener("storage", (event) => {
    if (event.key === UI_LANGUAGE_KEY) installAdminEnglishTranslator();
  });
  if (!initialAccessCheckDone) setAdminAccessState("checking");
  initRescueModeSelect();
  clearAchievementForm();
  bindTipReset();
  bind("admin-check-auth", async () => { await checkAuth(); });
  bind("admin-refresh-tables", refreshTables);
  bind("admin-load-table", loadSelectedTable);
  bind("admin-run-sql", runSql);
  bind("admin-export-result", exportLatestResult);
  bind("admin-create-rescue", createRescueOffer);
  bind("admin-create-rescue-from-replay", createRescueOfferFromReplay);
  bind("admin-list-rescue", listRescueOffers);
  bind("admin-beta-access-refresh", loadBetaAccessAllowlist);
  bind("admin-beta-access-add", addBetaAccessAllowlist);
  bind("admin-super-admin-refresh", loadSuperAdminUsers);
  bind("admin-super-admin-add", addSuperAdminUser);
  bind("admin-achievement-refresh", refreshAchievements);
  bind("admin-achievement-new", () => {
    clearAchievementForm();
    setTip(byId("admin-achievement-tip"), "已切换到新建草稿", "ok", 2500);
  });
  bind("admin-achievement-create", createAchievement);
  bind("admin-achievement-save", saveAchievement);
  bind("admin-achievement-upload-icon", uploadAchievementIcon);
  bind("admin-achievement-add-rule", addAchievementRule);
  bind("admin-achievement-grant", grantAchievement);
  bind("admin-achievement-backfill", backfillAchievements);
  void checkAuth({ redirectOnDeny: true }).then((ok) => {
    if (ok) {
      void refreshAchievements();
      void loadBetaAccessAllowlist();
      if (canManageSuperAdmins) void loadSuperAdminUsers();
    }
  });
}
