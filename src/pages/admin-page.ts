import { createAdminApi, adminQuery, type AdminApiResponse, type AdminRecord } from "../services/admin";
import { createBrowserStorageAccess, readStorageValue, writeStorageValue } from "../storage/browser-storage";

type ViewName = "dashboard" | "users" | "records" | "imports" | "achievements" | "rescue" | "governance" | "audit" | "tools";
type Language = "zh" | "en";

const ADMIN_DENIED_REDIRECT = "/404.html";
const UI_LANGUAGE_KEY = "ui_language_v1";
const api = createAdminApi();

const copy: Record<Language, Record<string, string>> = {
  zh: {
    product: "2048 运营控制台",
    environment: "统一管理账户、对局与运营数据",
    dashboard: "仪表盘",
    users: "用户中心",
    records: "游戏记录",
    imports: "成绩补录",
    achievements: "成就管理",
    rescue: "恢复单",
    governance: "管理员与权限",
    audit: "审计日志",
    tools: "数据工具",
    overview: "总览",
    userGame: "用户与游戏",
    operations: "运营",
    governanceGroup: "治理",
    system: "系统",
    searchUsers: "搜索用户 ID、邮箱或昵称",
    search: "搜索",
    refresh: "刷新",
    backGame: "返回游戏",
    loading: "正在加载…",
    noData: "暂无数据",
    totalUsers: "总用户",
    activeUsers: "启用账户",
    inactiveUsers: "停用账户",
    newUsers7d: "近 7 日新增",
    activeUsers7d: "近 7 日活跃",
    pendingRescue: "待处理恢复单",
    recentUsers: "最近注册用户",
    recentAudit: "最近管理员操作",
    recentEvents: "近期异常事件",
    user: "用户",
    email: "邮箱",
    role: "角色",
    status: "状态",
    createdAt: "注册时间",
    lastLogin: "最近登录",
    lastActive: "最近活跃",
    recordCount: "记录数",
    actions: "操作",
    view: "查看",
    allRoles: "全部角色",
    allStatuses: "全部状态",
    activityFilter: "最近活跃",
    allActivity: "全部活跃状态",
    active7d: "近 7 日活跃",
    active30d: "近 30 日活跃",
    neverActive: "从未活跃",
    sortBy: "排序",
    newest: "最近注册",
    recentActive: "最近活跃优先",
    mostRecords: "记录数优先",
    active: "启用",
    inactive: "停用",
    superAdmin: "超级管理员",
    boardAdmin: "板块管理员",
    player: "玩家",
    guest: "访客",
    previous: "上一页",
    next: "下一页",
    pageSummary: "第 {page} 页，共 {total} 条",
    profile: "账户资料",
    statistics: "游戏统计",
    bestRecords: "各模式最佳记录",
    earnedAchievements: "已获成就",
    rescueHistory: "恢复单历史",
    activity: "活动记录",
    editProfile: "修正资料",
    changeStatus: "启停账户",
    changeRole: "调整角色",
    revokeSessions: "强制注销",
    passwordReset: "发送密码重置",
    nickname: "昵称",
    displayName: "显示名",
    avatarUrl: "头像地址",
    save: "保存",
    cancel: "取消",
    confirm: "确认",
    dangerousConfirm: "确认执行",
    revokeSessionsHint: "目标用户的所有既有登录令牌将立即失效，密码本身不会改变。",
    passwordResetHint: "系统会向账户邮箱发送安全重置验证码，管理员无法查看或设置密码。",
    roleHint: "仅可在玩家与板块管理员之间调整；超级管理员在权限模块管理。",
    reason: "原因",
    reasonRequired: "请填写操作原因",
    importRecord: "补录对局",
    importTitle: "为用户补录正式对局",
    importWorkspaceHint: "为未正常上传的完整终局回放补录正式成绩。",
    importReplayOnly: "只接受可验证的完整终局回放，不允许手工填写或覆盖成绩。",
    importStepTarget: "指定目标用户",
    importStepTargetHint: "填写用户 ID；从用户详情进入时会自动带入。",
    importStepPreview: "上传并预校验",
    importStepPreviewHint: "提交回放与必填原因，由服务端计算成绩并检查重复。",
    importStepConfirm: "核对并确认写入",
    importStepConfirmHint: "确认后写入 official_v1，参与排行榜重算与成就评估。",
    prefilledUser: "已预填用户 #{id}",
    targetUserId: "目标用户 ID",
    replayFile: "回放文件",
    replayText: "或粘贴回放字符串",
    modeOptional: "模式（旧回放无法自动识别时填写）",
    clientRecordId: "client_record_id（可选）",
    preview: "预校验",
    previewResult: "服务端预校验结果",
    officialImportHint: "确认后写入 official_v1 正式记录，并重算排行榜、触发符合条件的成就。分数、盘面、步数和时长不可编辑。",
    mode: "模式",
    score: "分数",
    bestTile: "最大方块",
    steps: "步数",
    duration: "时长",
    endedAt: "结束时间",
    fingerprint: "回放指纹",
    source: "来源",
    adminImport: "管理员补录",
    verified: "有效",
    hidden: "已隐藏",
    accepted: "已接受",
    consumed: "已使用",
    expired: "已过期",
    rejected: "已拒绝",
    pending: "待处理",
    hideRecord: "隐藏记录",
    restoreRecord: "恢复记录",
    leaderboardBest: "当前榜首记录",
    filters: "筛选",
    recordId: "记录 ID",
    fromDate: "开始日期",
    toDate: "结束日期",
    finalBoard: "最终盘面",
    verification: "校验摘要",
    replay: "查看回放",
    achievementCatalog: "成就目录",
    newAchievement: "新建成就",
    name: "名称",
    description: "简介",
    series: "系列 ID",
    level: "等级",
    sort: "排序",
    iconUrl: "图标 URL",
    rulesJson: "规则 JSON",
    draft: "草稿",
    archived: "已归档",
    create: "创建",
    manualGrant: "手动发放",
    backfill: "历史回填",
    achievementId: "成就 ID",
    note: "备注",
    uploadIcon: "上传图标",
    issueRescue: "签发恢复单",
    issueFromReplay: "从回放签发",
    issueFromBoard: "从盘面签发",
    targetUser: "目标用户 ID 或昵称",
    modeKey: "mode_key",
    modeBucket: "mode_bucket",
    boardJson: "盘面 JSON",
    expiresHours: "有效小时",
    rescueStatus: "恢复单状态",
    expiresAt: "过期时间",
    adminList: "后台访问者",
    rootOnly: "仅最高权限管理员可授予或撤销超级管理员；ID 0 永久受保护。",
    grantSuperAdmin: "授予超级管理员",
    revoke: "撤销",
    rootAdmin: "最高权限",
    managementAudit: "管理操作",
    runtimeEvents: "运行事件",
    actor: "操作者",
    target: "目标用户",
    action: "动作",
    targetType: "对象类型",
    severity: "级别",
    eventType: "事件类型",
    details: "详情",
    tableBrowser: "表浏览",
    readonlySql: "只读 SQL",
    readonlyHint: "仅允许单条 SELECT；只读事务、5 秒超时、最多返回受控数据量。",
    table: "数据表",
    limit: "条数",
    load: "加载",
    run: "执行",
    export: "导出 JSON",
    success: "操作已完成",
    invalidRulesJson: "规则 JSON 格式无效",
    invalidBoardJson: "盘面 JSON 格式无效",
    checkingAccess: "正在验证管理员权限…",
    adminNav: "后台导航",
    language: "EN",
    closeDialog: "关闭对话框",
    closeNav: "关闭导航",
    openNav: "打开导航"
  },
  en: {
    product: "2048 Operations Console",
    environment: "Unified accounts, games, and operations",
    dashboard: "Dashboard",
    users: "Users",
    records: "Game Records",
    imports: "Record Import",
    achievements: "Achievements",
    rescue: "Rescue Offers",
    governance: "Admins & Access",
    audit: "Audit Logs",
    tools: "Data Tools",
    overview: "Overview",
    userGame: "Users & Games",
    operations: "Operations",
    governanceGroup: "Governance",
    system: "System",
    searchUsers: "Search user ID, email, or nickname",
    search: "Search",
    refresh: "Refresh",
    backGame: "Back to Game",
    loading: "Loading…",
    noData: "No data",
    totalUsers: "Total Users",
    activeUsers: "Active Accounts",
    inactiveUsers: "Inactive Accounts",
    newUsers7d: "New in 7 Days",
    activeUsers7d: "Active in 7 Days",
    pendingRescue: "Pending Rescue Offers",
    recentUsers: "Recent Users",
    recentAudit: "Recent Admin Actions",
    recentEvents: "Recent Incidents",
    user: "User",
    email: "Email",
    role: "Role",
    status: "Status",
    createdAt: "Created",
    lastLogin: "Last Login",
    lastActive: "Last Active",
    recordCount: "Records",
    actions: "Actions",
    view: "View",
    allRoles: "All Roles",
    allStatuses: "All Statuses",
    activityFilter: "Recent Activity",
    allActivity: "All Activity",
    active7d: "Active in 7 Days",
    active30d: "Active in 30 Days",
    neverActive: "Never Active",
    sortBy: "Sort",
    newest: "Newest Users",
    recentActive: "Recently Active",
    mostRecords: "Most Records",
    active: "Active",
    inactive: "Inactive",
    superAdmin: "Super Admin",
    boardAdmin: "Board Admin",
    player: "Player",
    guest: "Guest",
    previous: "Previous",
    next: "Next",
    pageSummary: "Page {page}, {total} total",
    profile: "Account Profile",
    statistics: "Game Statistics",
    bestRecords: "Best by Mode",
    earnedAchievements: "Earned Achievements",
    rescueHistory: "Rescue History",
    activity: "Activity",
    editProfile: "Edit Profile",
    changeStatus: "Account Status",
    changeRole: "Change Role",
    revokeSessions: "Revoke Sessions",
    passwordReset: "Send Password Reset",
    nickname: "Nickname",
    displayName: "Display Name",
    avatarUrl: "Avatar URL",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    dangerousConfirm: "Confirm Action",
    revokeSessionsHint: "All existing tokens for this user will be revoked. The password itself is unchanged.",
    passwordResetHint: "A secure reset code will be sent to the account email. Admins cannot see or set passwords.",
    roleHint: "Only player and board admin are available here. Super admins are managed in Access.",
    reason: "Reason",
    reasonRequired: "A reason is required",
    importRecord: "Import Record",
    importTitle: "Import an Official Game Record",
    importWorkspaceHint: "Restore an official result from a complete terminal replay that failed to upload.",
    importReplayOnly: "Only verifiable complete terminal replays are accepted. Scores cannot be entered or overridden manually.",
    importStepTarget: "Choose the user",
    importStepTargetHint: "Enter a user ID. Links from a user profile carry it automatically.",
    importStepPreview: "Upload and dry-run",
    importStepPreviewHint: "Submit the replay and required reason so the server can calculate and deduplicate it.",
    importStepConfirm: "Review and confirm",
    importStepConfirmHint: "Confirmation writes official_v1, rebuilds rankings, and evaluates achievements.",
    prefilledUser: "User #{id} prefilled",
    targetUserId: "Target User ID",
    replayFile: "Replay File",
    replayText: "Or paste replay string",
    modeOptional: "Mode (only when an old replay cannot self-identify)",
    clientRecordId: "client_record_id (optional)",
    preview: "Dry Run",
    previewResult: "Server Dry-Run Result",
    officialImportHint: "Confirmation writes an official_v1 record, rebuilds rankings, and evaluates achievements. Score, board, moves, and duration are read-only.",
    mode: "Mode",
    score: "Score",
    bestTile: "Best Tile",
    steps: "Moves",
    duration: "Duration",
    endedAt: "Ended At",
    fingerprint: "Replay Fingerprint",
    source: "Source",
    adminImport: "Admin Import",
    verified: "Verified",
    hidden: "Hidden",
    accepted: "Accepted",
    consumed: "Used",
    expired: "Expired",
    rejected: "Rejected",
    pending: "Pending",
    hideRecord: "Hide Record",
    restoreRecord: "Restore Record",
    leaderboardBest: "Current Best",
    filters: "Filters",
    recordId: "Record ID",
    fromDate: "From",
    toDate: "To",
    finalBoard: "Final Board",
    verification: "Verification",
    replay: "Replay",
    achievementCatalog: "Achievement Catalog",
    newAchievement: "New Achievement",
    name: "Name",
    description: "Description",
    series: "Series ID",
    level: "Level",
    sort: "Sort",
    iconUrl: "Icon URL",
    rulesJson: "Rules JSON",
    draft: "Draft",
    archived: "Archived",
    create: "Create",
    manualGrant: "Manual Grant",
    backfill: "Backfill",
    achievementId: "Achievement ID",
    note: "Note",
    uploadIcon: "Upload Icon",
    issueRescue: "Issue Rescue Offer",
    issueFromReplay: "Issue from Replay",
    issueFromBoard: "Issue from Board",
    targetUser: "Target User ID or nickname",
    modeKey: "mode_key",
    modeBucket: "mode_bucket",
    boardJson: "Board JSON",
    expiresHours: "Expiry Hours",
    rescueStatus: "Rescue Status",
    expiresAt: "Expires",
    adminList: "Console Administrators",
    rootOnly: "Only the root administrator can grant or revoke super admins. ID 0 is permanently protected.",
    grantSuperAdmin: "Grant Super Admin",
    revoke: "Revoke",
    rootAdmin: "Root Admin",
    managementAudit: "Admin Actions",
    runtimeEvents: "Runtime Events",
    actor: "Actor",
    target: "Target User",
    action: "Action",
    targetType: "Target Type",
    severity: "Severity",
    eventType: "Event Type",
    details: "Details",
    tableBrowser: "Table Browser",
    readonlySql: "Read-only SQL",
    readonlyHint: "One SELECT only, read-only transaction, five-second timeout, and bounded results.",
    table: "Table",
    limit: "Limit",
    load: "Load",
    run: "Run",
    export: "Export JSON",
    success: "Action completed",
    invalidRulesJson: "Invalid rules JSON",
    invalidBoardJson: "Invalid board JSON",
    checkingAccess: "Checking administrator access…",
    adminNav: "Admin navigation",
    language: "ZH",
    closeDialog: "Close dialog",
    closeNav: "Close navigation",
    openNav: "Open navigation"
  }
};

const navigation: Array<{ group: string; items: Array<{ view: ViewName; label: string; icon: string }> }> = [
  { group: "overview", items: [{ view: "dashboard", label: "dashboard", icon: "▦" }] },
  { group: "userGame", items: [{ view: "users", label: "users", icon: "◎" }, { view: "records", label: "records", icon: "▤" }, { view: "imports", label: "imports", icon: "↥" }] },
  { group: "operations", items: [{ view: "achievements", label: "achievements", icon: "◆" }, { view: "rescue", label: "rescue", icon: "↻" }] },
  { group: "governanceGroup", items: [{ view: "governance", label: "governance", icon: "♜" }, { view: "audit", label: "audit", icon: "≡" }] },
  { group: "system", items: [{ view: "tools", label: "tools", icon: "⌘" }] }
];

let language: Language = "zh";
let adminIdentity: AdminRecord = {};
let latestExport: unknown = null;
let renderVersion = 0;

function t(key: string, replacements: Record<string, string | number> = {}): string {
  let value = copy[language][key] || copy.zh[key] || key;
  for (const [name, replacement] of Object.entries(replacements)) value = value.replace(`{${name}}`, String(replacement));
  return value;
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing_admin_element:${id}`);
  return element as T;
}

function record(value: unknown): AdminRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AdminRecord : {};
}

function rows(value: unknown): AdminRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value: unknown): string {
  return text(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);
}

function formatDate(value: unknown): string {
  const parsed = Date.parse(text(value));
  if (!Number.isFinite(parsed)) return "—";
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function formatDuration(value: unknown): string {
  const ms = Math.max(0, number(value));
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return [hours, minutes % 60, seconds % 60].map((part, index) => index === 0 ? String(part) : String(part).padStart(2, "0")).join(":");
}

function prettyJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return text(value); }
}

function currentUrl(): URL {
  return new URL(window.location.href);
}

function currentView(): ViewName {
  const candidate = currentUrl().searchParams.get("view") as ViewName | null;
  return navigation.some((group) => group.items.some((item) => item.view === candidate)) ? candidate as ViewName : "dashboard";
}

function navigate(view: ViewName, params: Record<string, unknown> = {}, replace = false): void {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("view", view);
  for (const [key, value] of Object.entries(params)) if (value != null && value !== "") url.searchParams.set(key, String(value));
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
  void renderCurrentView();
}

function statusLabel(value: unknown): string {
  const key = text(value).toLowerCase();
  return t(key) || key;
}

function roleLabel(value: unknown): string {
  const role = text(value);
  if (role === "super_admin" || role === "owner" || role === "admin") return t("superAdmin");
  if (role === "board_admin" || role === "editor") return t("boardAdmin");
  if (role === "guest") return t("guest");
  return t("player");
}

function badge(label: string, tone = "secondary"): string {
  return `<span class="badge bg-${tone}-lt text-${tone}">${escapeHtml(label)}</span>`;
}

function pageHeader(title: string, subtitle = "", actions = ""): string {
  return `<div class="admin-page-head"><div><div class="admin-kicker">2048 NEXT ADMIN</div><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div><div class="admin-page-actions">${actions}</div></div>`;
}

function emptyState(message = t("noData")): string {
  return `<div class="admin-empty"><span>◇</span><p>${escapeHtml(message)}</p></div>`;
}

function table(headers: string[], body: string): string {
  return `<div class="table-responsive"><table class="table table-vcenter card-table admin-table"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}">${emptyState()}</td></tr>`}</tbody></table></div>`;
}

function card(title: string, body: string, extraClass = ""): string {
  return `<section class="card admin-card ${extraClass}"><div class="card-header"><h2 class="card-title">${escapeHtml(title)}</h2></div><div class="card-body">${body}</div></section>`;
}

async function request<T = unknown>(path: string, options?: RequestInit): Promise<AdminApiResponse<T>> {
  const response = await api.request<T>(path, options);
  if (response.success === false) throw new Error(text(response.error || response.code || "request_failed"));
  return response;
}

function toast(message: string, tone: "ok" | "error" = "ok"): void {
  const target = byId<HTMLDivElement>("admin-toast");
  target.className = `admin-toast is-${tone}`;
  target.textContent = message;
  target.hidden = false;
  window.setTimeout(() => { target.hidden = true; }, 3200);
}

function closeDialog(): void {
  const dialog = byId<HTMLDialogElement>("admin-dialog");
  if (dialog.open) dialog.close();
}

function openDialog(options: {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => Promise<boolean | void> | boolean | void;
}): void {
  const dialog = byId<HTMLDialogElement>("admin-dialog");
  byId("admin-dialog-title").textContent = options.title;
  byId("admin-dialog-body").innerHTML = options.body;
  const actions = byId("admin-dialog-actions");
  actions.innerHTML = `<button class="btn" type="button" data-dialog-cancel>${escapeHtml(t("cancel"))}</button>${options.onConfirm ? `<button class="btn ${options.danger ? "btn-danger" : "btn-primary"}" type="button" data-dialog-confirm>${escapeHtml(options.confirmLabel || t("confirm"))}</button>` : ""}`;
  actions.querySelector<HTMLElement>("[data-dialog-cancel]")?.addEventListener("click", closeDialog);
  actions.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    try {
      const result = await options.onConfirm?.();
      if (result !== false) closeDialog();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      button.disabled = false;
    }
  });
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function dialogValue(id: string): string {
  return (byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id).value || "").trim();
}

function setBusy(): void {
  byId("admin-content").innerHTML = `<div class="admin-loading"><span class="spinner-border" aria-hidden="true"></span><p>${escapeHtml(t("loading"))}</p></div>`;
}

function setPageError(error: unknown): void {
  byId("admin-content").innerHTML = pageHeader(t(currentView()), error instanceof Error ? error.message : String(error), `<button class="btn btn-primary" data-retry>${escapeHtml(t("refresh"))}</button>`) + `<div class="alert alert-danger">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
  byId("admin-content").querySelector("[data-retry]")?.addEventListener("click", () => void renderCurrentView());
}

function renderShell(): void {
  const sidebar = byId("admin-sidebar");
  sidebar.setAttribute("aria-label", t("adminNav"));
  document.querySelector<HTMLElement>("[data-dialog-close]")?.setAttribute("aria-label", t("closeDialog"));
  sidebar.innerHTML = `<div class="admin-brand"><span class="admin-brand-tile">2048</span><div><strong>${escapeHtml(t("product"))}</strong><small>${escapeHtml(t("environment"))}</small></div><button class="btn-close admin-nav-close" aria-label="${escapeHtml(t("closeNav"))}" data-close-nav></button></div><nav>${navigation.map((group) => `<div class="admin-nav-group"><span>${escapeHtml(t(group.group))}</span>${group.items.map((item) => `<button type="button" class="admin-nav-item" data-view="${item.view}"><i>${item.icon}</i><span>${escapeHtml(t(item.label))}</span></button>`).join("")}</div>`).join("")}</nav><div class="admin-sidebar-foot"><a class="btn btn-ghost-light w-100" href="index.html">← ${escapeHtml(t("backGame"))}</a></div>`;
  const topbar = byId("admin-topbar");
  topbar.innerHTML = `<button class="btn btn-icon admin-menu-button" type="button" aria-label="${escapeHtml(t("openNav"))}" data-open-nav>☰</button><form class="admin-global-search" data-global-search><input class="form-control" name="q" type="search" placeholder="${escapeHtml(t("searchUsers"))}" aria-label="${escapeHtml(t("searchUsers"))}"><button class="btn btn-primary" type="submit">${escapeHtml(t("search"))}</button></form><div class="admin-topbar-meta"><span class="status status-green"><span class="status-dot status-dot-animated"></span>API</span><button class="btn btn-ghost-secondary" type="button" data-language>${escapeHtml(t("language"))}</button><div class="admin-identity"><span>#${escapeHtml(adminIdentity.user_id)}</span><strong>${adminIdentity.rootAdmin === true ? escapeHtml(t("rootAdmin")) : escapeHtml(t("superAdmin"))}</strong></div></div>`;
  sidebar.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.addEventListener("click", () => {
    closeMobileNav();
    navigate(button.dataset.view as ViewName);
  }));
  sidebar.querySelector("[data-close-nav]")?.addEventListener("click", closeMobileNav);
  topbar.querySelector("[data-open-nav]")?.addEventListener("click", openMobileNav);
  topbar.querySelector("[data-language]")?.addEventListener("click", () => {
    language = language === "zh" ? "en" : "zh";
    writeStorageValue(createBrowserStorageAccess({ windowLike: window }).local(), UI_LANGUAGE_KEY, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    renderShell();
    void renderCurrentView();
  });
  topbar.querySelector<HTMLFormElement>("[data-global-search]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    navigate("users", { q: text(data.get("q")).trim() });
  });
  byId("admin-sidebar-backdrop").addEventListener("click", closeMobileNav);
}

function openMobileNav(): void {
  byId("admin-sidebar").classList.add("is-open");
  byId("admin-sidebar-backdrop").hidden = false;
}

function closeMobileNav(): void {
  byId("admin-sidebar").classList.remove("is-open");
  byId("admin-sidebar-backdrop").hidden = true;
}

function markActiveNavigation(): void {
  const view = currentView();
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((node) => node.classList.toggle("is-active", node.dataset.view === view));
}

async function renderDashboard(): Promise<void> {
  const response = await request<AdminRecord>("/admin/dashboard");
  const data = record(response.data);
  const metrics = record(data.metrics);
  const metricCards: Array<[string, unknown, string]> = [
    ["totalUsers", metrics.total_users, "2"], ["activeUsers", metrics.active_users, "4"], ["newUsers7d", metrics.new_users_7d, "8"],
    ["activeUsers7d", metrics.active_users_7d, "16"], ["inactiveUsers", metrics.inactive_users, "32"], ["pendingRescue", metrics.pending_rescue_offers, "64"]
  ];
  const recentUsers = rows(data.recent_users);
  const recentAudit = rows(data.recent_audit);
  const recentEvents = rows(data.recent_events);
  byId("admin-content").innerHTML = pageHeader(t("dashboard"), t("environment"), `<button class="btn btn-primary" data-refresh>${escapeHtml(t("refresh"))}</button>`) +
    `<div class="admin-metric-grid">${metricCards.map(([label, value, tile]) => `<button class="admin-metric tile-${tile}" data-metric="${label}"><span>${escapeHtml(t(label))}</span><strong>${number(value).toLocaleString()}</strong><i>${tile}</i></button>`).join("")}</div>` +
    `<div class="admin-dashboard-grid">${card(t("recentUsers"), table([t("user"), t("role"), t("createdAt")], recentUsers.map((user) => `<tr><td><button class="admin-link" data-user="${escapeHtml(user.id)}">${escapeHtml(user.nickname || user.display_name || user.email)}</button><small>${escapeHtml(user.email)}</small></td><td>${badge(roleLabel(user.role), "azure")}</td><td>${escapeHtml(formatDate(user.created_at))}</td></tr>`).join("")))}${card(t("recentAudit"), table([t("actor"), t("action"), t("createdAt")], recentAudit.map((item) => `<tr><td>${escapeHtml(item.actor_email || `#${item.actor_user_id}`)}</td><td><code>${escapeHtml(item.action)}</code></td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join("")))}${card(t("recentEvents"), table([t("severity"), t("eventType"), t("createdAt")], recentEvents.map((item) => `<tr><td>${badge(text(item.severity), item.severity === "critical" || item.severity === "error" ? "red" : "yellow")}</td><td><code>${escapeHtml(item.event_type)}</code></td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join("")), "admin-dashboard-events")}</div>`;
  byId("admin-content").querySelector("[data-refresh]")?.addEventListener("click", () => void renderCurrentView());
  byId("admin-content").querySelectorAll<HTMLElement>("[data-user]").forEach((node) => node.addEventListener("click", () => navigate("users", { user: node.dataset.user })));
  byId("admin-content").querySelectorAll<HTMLElement>("[data-metric]").forEach((node) => node.addEventListener("click", () => {
    const metric = node.dataset.metric;
    if (metric === "pendingRescue") navigate("rescue", { status: "pending" });
    else navigate("users", metric === "inactiveUsers" ? { status: "inactive" } : {});
  }));
}

function pagination(view: ViewName, response: AdminApiResponse, params: Record<string, unknown>): string {
  const page = number(response.page) || 1;
  const limit = number(response.limit) || 50;
  const total = number(response.total);
  const hasNext = page * limit < total;
  return `<div class="admin-pagination"><span>${escapeHtml(t("pageSummary", { page, total }))}</span><div><button class="btn" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>${escapeHtml(t("previous"))}</button><button class="btn" data-page="${page + 1}" ${hasNext ? "" : "disabled"}>${escapeHtml(t("next"))}</button></div></div><span hidden data-pagination-view="${view}" data-pagination-params="${escapeHtml(JSON.stringify(params))}"></span>`;
}

function bindPagination(): void {
  const meta = byId("admin-content").querySelector<HTMLElement>("[data-pagination-view]");
  if (!meta) return;
  const params = JSON.parse(meta.dataset.paginationParams || "{}") as Record<string, unknown>;
  byId("admin-content").querySelectorAll<HTMLButtonElement>("[data-page]").forEach((button) => button.addEventListener("click", () => navigate(meta.dataset.paginationView as ViewName, { ...params, page: button.dataset.page })));
}

async function renderUsers(): Promise<void> {
  const url = currentUrl();
  const userId = url.searchParams.get("user");
  if (userId) return renderUserDetail(userId);
  const params = {
    q: url.searchParams.get("q") || "",
    role: url.searchParams.get("role") || "",
    status: url.searchParams.get("status") || "",
    activity: url.searchParams.get("activity") || "",
    sort: url.searchParams.get("sort") || "newest",
    page: url.searchParams.get("page") || "1",
    limit: "50"
  };
  const response = await request<AdminRecord[]>(adminQuery("/admin/users", params));
  const list = rows(response.data);
  const body = list.map((user) => `<tr><td><button class="admin-user-cell" data-user="${escapeHtml(user.id)}"><span class="avatar avatar-sm">${escapeHtml(text(user.nickname || user.display_name || user.email).slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(user.nickname || user.display_name || `#${user.id}`)}</strong><small>${escapeHtml(user.email)}</small></span></button></td><td>${badge(roleLabel(user.role), user.role === "super_admin" ? "purple" : "azure")}</td><td>${badge(user.is_active === false ? t("inactive") : t("active"), user.is_active === false ? "red" : "green")}</td><td>${escapeHtml(formatDate(user.created_at))}</td><td>${escapeHtml(formatDate(user.last_login_at))}</td><td>${escapeHtml(formatDate(user.last_seen_at))}</td><td>${number(user.record_count).toLocaleString()}</td><td><button class="btn btn-sm" data-user="${escapeHtml(user.id)}">${escapeHtml(t("view"))}</button></td></tr>`).join("");
  byId("admin-content").innerHTML = pageHeader(t("users"), t("searchUsers"), `<button class="btn btn-primary" data-import>${escapeHtml(t("importRecord"))}</button>`) +
    `<section class="card admin-filter-card"><form class="card-body admin-filter-grid" data-user-filter><label>${escapeHtml(t("search"))}<input class="form-control" name="q" value="${escapeHtml(params.q)}" placeholder="${escapeHtml(t("searchUsers"))}"></label><label>${escapeHtml(t("role"))}<select class="form-select" name="role"><option value="">${escapeHtml(t("allRoles"))}</option>${["player", "board_admin", "super_admin", "guest"].map((role) => `<option value="${role}" ${params.role === role ? "selected" : ""}>${escapeHtml(roleLabel(role))}</option>`).join("")}</select></label><label>${escapeHtml(t("status"))}<select class="form-select" name="status"><option value="">${escapeHtml(t("allStatuses"))}</option><option value="active" ${params.status === "active" ? "selected" : ""}>${escapeHtml(t("active"))}</option><option value="inactive" ${params.status === "inactive" ? "selected" : ""}>${escapeHtml(t("inactive"))}</option></select></label><label>${escapeHtml(t("activityFilter"))}<select class="form-select" name="activity"><option value="">${escapeHtml(t("allActivity"))}</option><option value="7d" ${params.activity === "7d" ? "selected" : ""}>${escapeHtml(t("active7d"))}</option><option value="30d" ${params.activity === "30d" ? "selected" : ""}>${escapeHtml(t("active30d"))}</option><option value="never" ${params.activity === "never" ? "selected" : ""}>${escapeHtml(t("neverActive"))}</option></select></label><label>${escapeHtml(t("sortBy"))}<select class="form-select" name="sort"><option value="newest" ${params.sort === "newest" ? "selected" : ""}>${escapeHtml(t("newest"))}</option><option value="last_active" ${params.sort === "last_active" ? "selected" : ""}>${escapeHtml(t("recentActive"))}</option><option value="records" ${params.sort === "records" ? "selected" : ""}>${escapeHtml(t("mostRecords"))}</option></select></label><button class="btn btn-primary" type="submit">${escapeHtml(t("search"))}</button></form></section>` +
    card(t("users"), table([t("user"), t("role"), t("status"), t("createdAt"), t("lastLogin"), t("lastActive"), t("recordCount"), t("actions")], body)) + pagination("users", response, { q: params.q, role: params.role, status: params.status, activity: params.activity, sort: params.sort });
  byId("admin-content").querySelector<HTMLFormElement>("[data-user-filter]")?.addEventListener("submit", (event) => { event.preventDefault(); navigate("users", Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement).entries())); });
  byId("admin-content").querySelectorAll<HTMLElement>("[data-user]").forEach((node) => node.addEventListener("click", () => navigate("users", { user: node.dataset.user })));
  byId("admin-content").querySelector("[data-import]")?.addEventListener("click", () => openImportDialog());
  bindPagination();
}

async function renderUserDetail(userId: string): Promise<void> {
  const response = await request<AdminRecord>(`/admin/users/${encodeURIComponent(userId)}`);
  const data = record(response.data);
  const user = record(data.user);
  const stats = record(data.stats);
  const leaderboard = rows(data.leaderboard);
  const achievements = rows(data.achievements);
  const rescues = rows(data.rescue_offers);
  const auditRows = rows(data.audit);
  const section = currentUrl().searchParams.get("section") || "overview";
  let sectionBody = "";
  if (section === "records") {
    const recordsResponse = await request<AdminRecord[]>(adminQuery("/admin/records", { user_id: userId, limit: 50 }));
    sectionBody = recordsTable(rows(recordsResponse.data));
  } else if (section === "achievements") {
    sectionBody = `<div class="admin-two-column">${card(t("earnedAchievements"), achievements.length ? achievements.map((item) => `<div class="admin-list-row"><strong>${escapeHtml(item.name || item.achievement_id)}</strong><span>${escapeHtml(formatDate(item.earned_at))}</span></div>`).join("") : emptyState())}${card(t("rescueHistory"), rescues.length ? rescues.map((item) => `<div class="admin-list-row"><strong>${escapeHtml(item.mode_key)}</strong>${badge(statusLabel(item.rescue_status), "orange")}<span>${escapeHtml(formatDate(item.created_at))}</span></div>`).join("") : emptyState())}</div>`;
  } else if (section === "activity") {
    sectionBody = table([t("actor"), t("action"), t("details"), t("createdAt")], auditRows.map((item) => `<tr><td>${escapeHtml(item.actor_email || `#${item.actor_user_id}`)}</td><td><code>${escapeHtml(item.action)}</code></td><td><details><summary>${escapeHtml(t("details"))}</summary><pre>${escapeHtml(prettyJson(item.diff))}</pre></details></td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join(""));
  } else {
    sectionBody = `<div class="admin-two-column">${card(t("profile"), `<dl class="admin-definition"><dt>ID</dt><dd>#${escapeHtml(user.id)}</dd><dt>${escapeHtml(t("email"))}</dt><dd>${escapeHtml(user.email)}</dd><dt>${escapeHtml(t("nickname"))}</dt><dd>${escapeHtml(user.nickname || "—")}</dd><dt>${escapeHtml(t("displayName"))}</dt><dd>${escapeHtml(user.display_name || "—")}</dd><dt>${escapeHtml(t("role"))}</dt><dd>${escapeHtml(roleLabel(user.role))}</dd><dt>${escapeHtml(t("createdAt"))}</dt><dd>${escapeHtml(formatDate(user.created_at))}</dd><dt>${escapeHtml(t("lastLogin"))}</dt><dd>${escapeHtml(formatDate(user.last_login_at))}</dd></dl>`)}${card(t("statistics"), `<div class="admin-stat-list"><div><span>${escapeHtml(t("recordCount"))}</span><strong>${number(stats.total_records)}</strong></div><div><span>${escapeHtml(t("score"))}</span><strong>${number(stats.best_score).toLocaleString()}</strong></div><div><span>${escapeHtml(t("bestTile"))}</span><strong>${number(stats.best_tile).toLocaleString()}</strong></div><div><span>${escapeHtml(t("endedAt"))}</span><strong>${escapeHtml(formatDate(stats.latest_record_at))}</strong></div></div>`)}${card(t("bestRecords"), leaderboard.length ? table([t("mode"), t("score"), t("bestTile"), t("duration")], leaderboard.map((item) => `<tr><td><code>${escapeHtml(item.mode_key)}</code></td><td>${number(item.score).toLocaleString()}</td><td>${number(item.best_tile).toLocaleString()}</td><td>${escapeHtml(formatDuration(item.duration_ms))}</td></tr>`).join("")) : emptyState(), "admin-wide-card")}</div>`;
  }
  const isSelf = number(user.id) === number(adminIdentity.user_id);
  const protectedUser = number(user.id) === 0 || text(user.role) === "super_admin";
  byId("admin-content").innerHTML = pageHeader(text(user.nickname || user.display_name || user.email), `${text(user.email)} · #${text(user.id)}`, `<button class="btn" data-edit-profile>${escapeHtml(t("editProfile"))}</button><button class="btn btn-primary" data-import>${escapeHtml(t("importRecord"))}</button><div class="dropdown"><button class="btn btn-outline-danger dropdown-toggle" data-bs-toggle="dropdown" ${isSelf || number(user.id) === 0 ? "disabled" : ""}>${escapeHtml(t("actions"))}</button><div class="dropdown-menu dropdown-menu-end"><button class="dropdown-item" data-status ${protectedUser ? "disabled" : ""}>${escapeHtml(t("changeStatus"))}</button><button class="dropdown-item" data-role ${protectedUser ? "disabled" : ""}>${escapeHtml(t("changeRole"))}</button><button class="dropdown-item" data-revoke-sessions>${escapeHtml(t("revokeSessions"))}</button><button class="dropdown-item" data-password-reset>${escapeHtml(t("passwordReset"))}</button></div></div>`) +
    `<section class="card admin-user-hero"><div class="card-body"><span class="avatar avatar-xl">${escapeHtml(text(user.nickname || user.email).slice(0, 1).toUpperCase())}</span><div><h2>${escapeHtml(user.nickname || user.display_name || user.email)}</h2><p>${escapeHtml(user.email)} · #${escapeHtml(user.id)}</p><div class="d-flex gap-2">${badge(roleLabel(user.role), user.role === "super_admin" ? "purple" : "azure")}${badge(user.is_active === false ? t("inactive") : t("active"), user.is_active === false ? "red" : "green")}</div></div></div></section>` +
    `<div class="admin-tabs" role="tablist">${[["overview", t("overview")], ["records", t("records")], ["achievements", `${t("achievements")} / ${t("rescue")}`], ["activity", t("activity")]].map(([key, label]) => `<button class="${section === key ? "is-active" : ""}" data-section="${key}">${escapeHtml(label)}</button>`).join("")}</div><div class="admin-section-body">${sectionBody}</div>`;
  byId("admin-content").querySelectorAll<HTMLElement>("[data-section]").forEach((node) => node.addEventListener("click", () => navigate("users", { user: userId, section: node.dataset.section })));
  byId("admin-content").querySelector("[data-edit-profile]")?.addEventListener("click", () => editProfile(user));
  byId("admin-content").querySelector("[data-import]")?.addEventListener("click", () => openImportDialog(userId));
  byId("admin-content").querySelector("[data-status]")?.addEventListener("click", () => changeUserStatus(user));
  byId("admin-content").querySelector("[data-role]")?.addEventListener("click", () => changeUserRole(user));
  byId("admin-content").querySelector("[data-revoke-sessions]")?.addEventListener("click", () => revokeUserSessions(user));
  byId("admin-content").querySelector("[data-password-reset]")?.addEventListener("click", () => sendPasswordReset(user));
  bindRecordActions();
}

function editProfile(user: AdminRecord): void {
  openDialog({
    title: t("editProfile"),
    body: `<div class="mb-3"><label class="form-label">${escapeHtml(t("nickname"))}</label><input id="dialog-nickname" class="form-control" value="${escapeHtml(user.nickname)}"></div><div class="mb-3"><label class="form-label">${escapeHtml(t("displayName"))}</label><input id="dialog-display-name" class="form-control" value="${escapeHtml(user.display_name)}"></div><div><label class="form-label">${escapeHtml(t("avatarUrl"))}</label><input id="dialog-avatar" class="form-control" type="url" value="${escapeHtml(user.avatar_url)}"></div>`,
    confirmLabel: t("save"),
    onConfirm: async () => {
      await request(`/admin/users/${user.id}/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: dialogValue("dialog-nickname"), display_name: dialogValue("dialog-display-name"), avatar_url: dialogValue("dialog-avatar") }) });
      toast(t("success"));
      await renderCurrentView();
    }
  });
}

function changeUserStatus(user: AdminRecord): void {
  const nextActive = user.is_active === false;
  openDialog({ title: t("changeStatus"), body: `<p>${escapeHtml(nextActive ? t("active") : t("inactive"))}: <strong>${escapeHtml(user.email)}</strong></p>`, danger: !nextActive, confirmLabel: t("dangerousConfirm"), onConfirm: async () => { await request(`/admin/users/${user.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: nextActive }) }); toast(t("success")); await renderCurrentView(); } });
}

function changeUserRole(user: AdminRecord): void {
  openDialog({ title: t("changeRole"), body: `<p class="text-secondary">${escapeHtml(t("roleHint"))}</p><select id="dialog-role" class="form-select"><option value="player" ${user.role === "player" ? "selected" : ""}>${escapeHtml(t("player"))}</option><option value="board_admin" ${user.role === "board_admin" ? "selected" : ""}>${escapeHtml(t("boardAdmin"))}</option></select>`, confirmLabel: t("save"), onConfirm: async () => { await request(`/admin/users/${user.id}/role`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: dialogValue("dialog-role") }) }); toast(t("success")); await renderCurrentView(); } });
}

function revokeUserSessions(user: AdminRecord): void {
  openDialog({ title: t("revokeSessions"), body: `<div class="alert alert-warning">${escapeHtml(t("revokeSessionsHint"))}</div><p><strong>${escapeHtml(user.email)}</strong></p>`, danger: true, confirmLabel: t("dangerousConfirm"), onConfirm: async () => { await request(`/admin/users/${user.id}/revoke-sessions`, { method: "POST" }); toast(t("success")); } });
}

function sendPasswordReset(user: AdminRecord): void {
  openDialog({ title: t("passwordReset"), body: `<div class="alert alert-info">${escapeHtml(t("passwordResetHint"))}</div><p><strong>${escapeHtml(user.email)}</strong></p>`, confirmLabel: t("confirm"), onConfirm: async () => { await request(`/admin/users/${user.id}/password-reset`, { method: "POST" }); toast(t("success")); } });
}

function recordsTable(list: AdminRecord[]): string {
  return table([t("recordId"), t("user"), t("mode"), t("score"), t("bestTile"), t("duration"), t("source"), t("status"), t("endedAt"), t("actions")], list.map((item) => `<tr><td><code>${escapeHtml(item.id)}</code>${item.is_leaderboard_best ? `<small>${escapeHtml(t("leaderboardBest"))}</small>` : ""}</td><td><button class="admin-link" data-record-user="${escapeHtml(item.user_id)}">${escapeHtml(item.user_name || `#${item.user_id}`)}</button><small>${escapeHtml(item.email)}</small></td><td><code>${escapeHtml(item.mode_key)}</code></td><td>${number(item.score).toLocaleString()}</td><td>${number(item.best_tile).toLocaleString()}</td><td>${escapeHtml(formatDuration(item.duration_ms))}</td><td>${item.source === "admin" ? badge(t("adminImport"), "orange") : escapeHtml(item.source)}</td><td>${badge(statusLabel(item.status), item.status === "hidden" ? "red" : "green")}</td><td>${escapeHtml(formatDate(item.ended_at))}</td><td><div class="btn-list flex-nowrap"><button class="btn btn-sm" data-record-details="${escapeHtml(item.id)}">${escapeHtml(t("details"))}</button>${item.status === "hidden" ? `<button class="btn btn-sm btn-success" data-record-restore="${escapeHtml(item.id)}">${escapeHtml(t("restoreRecord"))}</button>` : `<button class="btn btn-sm btn-outline-danger" data-record-hide="${escapeHtml(item.id)}">${escapeHtml(t("hideRecord"))}</button>`}<a class="btn btn-sm" href="/api/records/${encodeURIComponent(text(item.id))}/replay" target="_blank" rel="noopener">${escapeHtml(t("replay"))}</a></div><template data-record-json="${escapeHtml(item.id)}">${escapeHtml(prettyJson(item))}</template></td></tr>`).join(""));
}

async function renderRecords(): Promise<void> {
  const url = currentUrl();
  const params = { user_id: url.searchParams.get("user_id") || "", mode_key: url.searchParams.get("mode_key") || "", status: url.searchParams.get("status") || "", record_id: url.searchParams.get("record_id") || "", from: url.searchParams.get("from") || "", to: url.searchParams.get("to") || "", page: url.searchParams.get("page") || "1", limit: "50" };
  const response = await request<AdminRecord[]>(adminQuery("/admin/records", params));
  latestExport = response.data;
  byId("admin-content").innerHTML = pageHeader(t("records"), t("officialImportHint"), `<button class="btn btn-primary" data-import>${escapeHtml(t("importRecord"))}</button>`) + `<section class="card admin-filter-card"><form class="card-body admin-record-filter" data-record-filter><label>${escapeHtml(t("targetUserId"))}<input class="form-control" name="user_id" value="${escapeHtml(params.user_id)}"></label><label>${escapeHtml(t("modeKey"))}<input class="form-control" name="mode_key" value="${escapeHtml(params.mode_key)}"></label><label>${escapeHtml(t("status"))}<select class="form-select" name="status"><option value="">${escapeHtml(t("allStatuses"))}</option>${["verified", "hidden", "pending", "rejected"].map((value) => `<option value="${value}" ${params.status === value ? "selected" : ""}>${escapeHtml(statusLabel(value))}</option>`).join("")}</select></label><label>${escapeHtml(t("recordId"))}<input class="form-control" name="record_id" value="${escapeHtml(params.record_id)}"></label><label>${escapeHtml(t("fromDate"))}<input class="form-control" type="date" name="from" value="${escapeHtml(params.from)}"></label><label>${escapeHtml(t("toDate"))}<input class="form-control" type="date" name="to" value="${escapeHtml(params.to)}"></label><button class="btn btn-primary" type="submit">${escapeHtml(t("search"))}</button></form></section>${card(t("records"), recordsTable(rows(response.data)))}${pagination("records", response, params)}`;
  byId("admin-content").querySelector<HTMLFormElement>("[data-record-filter]")?.addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); navigate("records", Object.fromEntries(data.entries())); });
  byId("admin-content").querySelector("[data-import]")?.addEventListener("click", () => openImportDialog(params.user_id));
  bindRecordActions();
  bindPagination();
}

function renderImports(): void {
  const userId = currentUrl().searchParams.get("user_id") || "";
  const steps: Array<[string, string]> = [
    ["importStepTarget", "importStepTargetHint"],
    ["importStepPreview", "importStepPreviewHint"],
    ["importStepConfirm", "importStepConfirmHint"]
  ];
  byId("admin-content").innerHTML = pageHeader(t("imports"), t("importWorkspaceHint"), `<button class="btn btn-primary" data-import>${escapeHtml(t("importRecord"))}</button>`) +
    `<section class="card admin-card"><div class="card-body"><div class="alert alert-info d-flex align-items-center justify-content-between gap-3 flex-wrap"><span>${escapeHtml(t("importReplayOnly"))}</span>${userId ? badge(t("prefilledUser", { id: userId }), "orange") : ""}</div><div class="row g-3">${steps.map(([title, hint], index) => `<div class="col-md-4"><div class="card card-sm h-100"><div class="card-body"><span class="badge bg-orange-lt text-orange mb-3">0${index + 1}</span><h2 class="h3">${escapeHtml(t(title))}</h2><p class="text-secondary mb-0">${escapeHtml(t(hint))}</p></div></div></div>`).join("")}</div></div></section>`;
  byId("admin-content").querySelector("[data-import]")?.addEventListener("click", () => openImportDialog(userId));
}

function bindRecordActions(): void {
  const root = byId("admin-content");
  root.querySelectorAll<HTMLElement>("[data-record-user]").forEach((node) => node.addEventListener("click", () => navigate("users", { user: node.dataset.recordUser, section: "records" })));
  root.querySelectorAll<HTMLElement>("[data-record-details]").forEach((node) => node.addEventListener("click", () => {
    const id = node.dataset.recordDetails || "";
    const template = root.querySelector<HTMLTemplateElement>(`template[data-record-json="${CSS.escape(id)}"]`);
    openDialog({ title: `${t("details")} · ${id}`, body: `<pre class="admin-json">${template?.innerHTML || ""}</pre>` });
  }));
  root.querySelectorAll<HTMLElement>("[data-record-hide]").forEach((node) => node.addEventListener("click", () => setRecordVisibility(node.dataset.recordHide || "", true)));
  root.querySelectorAll<HTMLElement>("[data-record-restore]").forEach((node) => node.addEventListener("click", () => setRecordVisibility(node.dataset.recordRestore || "", false)));
}

function setRecordVisibility(recordId: string, hidden: boolean): void {
  openDialog({ title: hidden ? t("hideRecord") : t("restoreRecord"), body: `<div class="alert alert-warning">${escapeHtml(t("officialImportHint"))}</div><label class="form-label">${escapeHtml(t("reason"))}</label><textarea id="dialog-reason" class="form-control" rows="3" required></textarea>`, danger: hidden, confirmLabel: t("dangerousConfirm"), onConfirm: async () => { const reason = dialogValue("dialog-reason"); if (!reason) { toast(t("reasonRequired"), "error"); return false; } await request(`/admin/records/${encodeURIComponent(recordId)}/${hidden ? "hide" : "restore"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); toast(t("success")); await renderCurrentView(); } });
}

function openImportDialog(fixedUserId = ""): void {
  openDialog({
    title: t("importTitle"),
    body: `<div class="alert alert-info">${escapeHtml(t("officialImportHint"))}</div>${fixedUserId ? `<input id="dialog-import-user" type="hidden" value="${escapeHtml(fixedUserId)}">` : `<div class="mb-3"><label class="form-label" for="dialog-import-user">${escapeHtml(t("targetUserId"))}</label><input id="dialog-import-user" class="form-control" type="number" min="1"></div>`}<div class="mb-3"><label class="form-label" for="dialog-import-file">${escapeHtml(t("replayFile"))}</label><input id="dialog-import-file" class="form-control" type="file" accept=".txt,.rpl,text/plain"></div><div class="mb-3"><label class="form-label" for="dialog-import-replay">${escapeHtml(t("replayText"))}</label><textarea id="dialog-import-replay" class="form-control admin-replay-input" rows="5"></textarea></div><div class="row g-3"><div class="col-md-6"><label class="form-label" for="dialog-import-mode">${escapeHtml(t("modeOptional"))}</label><input id="dialog-import-mode" class="form-control"></div><div class="col-md-6"><label class="form-label" for="dialog-import-client">${escapeHtml(t("clientRecordId"))}</label><input id="dialog-import-client" class="form-control"></div></div><div class="mt-3"><label class="form-label" for="dialog-import-reason">${escapeHtml(t("reason"))}</label><textarea id="dialog-import-reason" class="form-control" rows="3" required></textarea></div>`,
    confirmLabel: t("preview"),
    onConfirm: async () => {
      const userId = dialogValue("dialog-import-user");
      const file = byId<HTMLInputElement>("dialog-import-file").files?.[0];
      const replay = file ? (await file.text()).trim() : dialogValue("dialog-import-replay");
      const reason = dialogValue("dialog-import-reason");
      if (!userId || !replay || !reason) { toast(t("reasonRequired"), "error"); return false; }
      const payload: AdminRecord = { replay_string: replay, reason };
      const modeKey = dialogValue("dialog-import-mode");
      const clientRecordId = dialogValue("dialog-import-client");
      if (modeKey) payload.mode_key = modeKey;
      if (clientRecordId) payload.client_record_id = clientRecordId;
      const preview = await request<AdminRecord>(`/admin/users/${encodeURIComponent(userId)}/record-import/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      closeDialog();
      window.setTimeout(() => confirmImport(userId, payload, record(preview.data)), 0);
    }
  });
}

function confirmImport(userId: string, payload: AdminRecord, preview: AdminRecord): void {
  const summary: Array<[string, unknown]> = [["mode", preview.mode_key], ["score", preview.score], ["bestTile", preview.best_tile], ["steps", preview.steps], ["duration", formatDuration(preview.duration_ms)], ["endedAt", formatDate(preview.ended_at)], ["fingerprint", preview.replay_fingerprint]];
  openDialog({ title: t("previewResult"), body: `<div class="alert alert-warning">${escapeHtml(t("officialImportHint"))}</div><dl class="admin-definition">${summary.map(([label, value]) => `<dt>${escapeHtml(t(label))}</dt><dd><code>${escapeHtml(value)}</code></dd>`).join("")}</dl>`, danger: true, confirmLabel: t("dangerousConfirm"), onConfirm: async () => { const result = await request<AdminRecord>(`/admin/users/${encodeURIComponent(userId)}/record-import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); toast(`${t("success")}: ${text(record(result.data).record_id)}`); if (currentView() === "records" || currentView() === "users") await renderCurrentView(); } });
}

async function renderAchievements(): Promise<void> {
  const response = await request<AdminRecord[]>("/admin/achievements");
  const list = rows(response.data);
  const selectedId = currentUrl().searchParams.get("achievement") || "";
  const selected = list.find((item) => text(item.id) === selectedId) || null;
  const editor = selected || { name: "", description: "", series_id: "", level: 1, status: "draft", sort_order: 0, icon_url: "", rules: [] };
  byId("admin-content").innerHTML = pageHeader(t("achievements"), t("achievementCatalog"), `<button class="btn" data-grant>${escapeHtml(t("manualGrant"))}</button><button class="btn" data-backfill>${escapeHtml(t("backfill"))}</button><button class="btn btn-primary" data-new>${escapeHtml(t("newAchievement"))}</button>`) + `<div class="admin-achievement-layout">${card(t("achievementCatalog"), `<div class="admin-achievement-list">${list.length ? list.map((item) => `<button data-achievement="${escapeHtml(item.id)}" class="${selectedId === text(item.id) ? "is-active" : ""}"><span class="avatar avatar-sm">${escapeHtml(text(item.name || item.id).slice(0, 1))}</span><span><strong>${escapeHtml(item.name || item.id)}</strong><small>${escapeHtml(item.id)} · ${escapeHtml(statusLabel(item.status))}</small></span></button>`).join("") : emptyState()}</div>`)}${card(selected ? text(selected.name || selected.id) : t("newAchievement"), `<form data-achievement-form><div class="row g-3"><div class="col-md-8"><label class="form-label">${escapeHtml(t("name"))}</label><input class="form-control" name="name" value="${escapeHtml(editor.name)}" required></div><div class="col-md-4"><label class="form-label">${escapeHtml(t("status"))}</label><select class="form-select" name="status">${["draft", "active", "archived"].map((value) => `<option value="${value}" ${editor.status === value ? "selected" : ""}>${escapeHtml(statusLabel(value))}</option>`).join("")}</select></div><div class="col-12"><label class="form-label">${escapeHtml(t("description"))}</label><textarea class="form-control" name="description" rows="3" required>${escapeHtml(editor.description)}</textarea></div><div class="col-md-4"><label class="form-label">${escapeHtml(t("series"))}</label><input class="form-control" name="series_id" value="${escapeHtml(editor.series_id)}"></div><div class="col-md-2"><label class="form-label">${escapeHtml(t("level"))}</label><input class="form-control" type="number" min="1" name="level" value="${escapeHtml(editor.level || 1)}"></div><div class="col-md-2"><label class="form-label">${escapeHtml(t("sort"))}</label><input class="form-control" type="number" name="sort_order" value="${escapeHtml(editor.sort_order || 0)}"></div><div class="col-md-4"><label class="form-label">${escapeHtml(t("iconUrl"))}</label><input class="form-control" name="icon_url" value="${escapeHtml(editor.icon_url)}"></div><div class="col-12"><label class="form-label">${escapeHtml(t("rulesJson"))}</label><textarea class="form-control admin-json-input" name="rules" rows="10">${escapeHtml(prettyJson(editor.rules || []))}</textarea></div></div><div class="mt-3 d-flex gap-2"><button class="btn btn-primary" type="submit">${escapeHtml(selected ? t("save") : t("create"))}</button>${selected ? `<label class="btn"><input type="file" hidden data-icon-file accept="image/*">${escapeHtml(t("uploadIcon"))}</label>` : ""}</div></form>`)}</div>`;
  byId("admin-content").querySelectorAll<HTMLElement>("[data-achievement]").forEach((node) => node.addEventListener("click", () => navigate("achievements", { achievement: node.dataset.achievement })));
  byId("admin-content").querySelector("[data-new]")?.addEventListener("click", () => navigate("achievements"));
  byId("admin-content").querySelector<HTMLFormElement>("[data-achievement-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    let rules: unknown;
    try { rules = JSON.parse(text(formData.get("rules")) || "[]"); } catch { toast(t("invalidRulesJson"), "error"); return; }
    const payload = { name: formData.get("name"), description: formData.get("description"), series_id: formData.get("series_id"), level: number(formData.get("level")), status: formData.get("status"), sort_order: number(formData.get("sort_order")), icon_url: formData.get("icon_url"), rules };
    const saved = selected ? await request<AdminRecord>(`/admin/achievements/${encodeURIComponent(selectedId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }) : await request<AdminRecord>("/admin/achievements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const id = text(record(saved.data).id || selectedId);
    if (selected) await request(`/admin/achievements/${encodeURIComponent(id)}/rules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules }) });
    toast(t("success"));
    navigate("achievements", { achievement: id }, true);
  });
  byId("admin-content").querySelector<HTMLInputElement>("[data-icon-file]")?.addEventListener("change", async (event) => { const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file || !selectedId) return; const body = new FormData(); body.append("icon", file); await request(`/admin/achievements/${encodeURIComponent(selectedId)}/icon`, { method: "POST", body }); toast(t("success")); await renderCurrentView(); });
  byId("admin-content").querySelector("[data-grant]")?.addEventListener("click", grantAchievementDialog);
  byId("admin-content").querySelector("[data-backfill]")?.addEventListener("click", backfillAchievementDialog);
}

function grantAchievementDialog(): void {
  openDialog({ title: t("manualGrant"), body: `<div class="mb-3"><label class="form-label">${escapeHtml(t("targetUserId"))}</label><input id="dialog-grant-user" class="form-control" type="number" min="1"></div><div class="mb-3"><label class="form-label">${escapeHtml(t("achievementId"))}</label><input id="dialog-grant-achievement" class="form-control"></div><div><label class="form-label">${escapeHtml(t("note"))}</label><textarea id="dialog-grant-note" class="form-control"></textarea></div>`, confirmLabel: t("manualGrant"), onConfirm: async () => { await request("/admin/achievements/grant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: dialogValue("dialog-grant-user"), achievement_id: dialogValue("dialog-grant-achievement"), source: "manual", note: dialogValue("dialog-grant-note") }) }); toast(t("success")); } });
}

function backfillAchievementDialog(): void {
  openDialog({ title: t("backfill"), body: `<div class="mb-3"><label class="form-label">${escapeHtml(t("targetUserId"))}</label><input id="dialog-backfill-user" class="form-control" type="number" min="1"></div><div><label class="form-label">${escapeHtml(t("achievementId"))}</label><input id="dialog-backfill-achievement" class="form-control"></div>`, danger: true, confirmLabel: t("dangerousConfirm"), onConfirm: async () => { const payload: AdminRecord = {}; const userId = dialogValue("dialog-backfill-user"); const achievementId = dialogValue("dialog-backfill-achievement"); if (userId) payload.user_id = userId; if (achievementId) payload.achievement_id = achievementId; await request("/admin/achievements/backfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); toast(t("success")); } });
}

async function renderRescue(): Promise<void> {
  const url = currentUrl();
  const params = { user_id: url.searchParams.get("user_id") || "", status: url.searchParams.get("status") || "", from: url.searchParams.get("from") || "", to: url.searchParams.get("to") || "", limit: 100 };
  const response = await request<AdminRecord[]>(adminQuery("/admin/rescue-offers", params));
  const list = rows(response.data);
  byId("admin-content").innerHTML = pageHeader(t("rescue"), t("rescueHistory"), `<button class="btn" data-rescue-board>${escapeHtml(t("issueFromBoard"))}</button><button class="btn btn-primary" data-rescue-replay>${escapeHtml(t("issueFromReplay"))}</button>`) + `<section class="card admin-filter-card"><form class="card-body admin-record-filter" data-rescue-filter><label>${escapeHtml(t("targetUserId"))}<input class="form-control" name="user_id" value="${escapeHtml(params.user_id)}"></label><label>${escapeHtml(t("status"))}<select class="form-select" name="status"><option value="">${escapeHtml(t("allStatuses"))}</option>${["pending", "accepted", "rejected", "consumed", "expired"].map((value) => `<option value="${value}" ${params.status === value ? "selected" : ""}>${escapeHtml(statusLabel(value))}</option>`).join("")}</select></label><label>${escapeHtml(t("fromDate"))}<input class="form-control" type="date" name="from" value="${escapeHtml(params.from)}"></label><label>${escapeHtml(t("toDate"))}<input class="form-control" type="date" name="to" value="${escapeHtml(params.to)}"></label><button class="btn btn-primary" type="submit">${escapeHtml(t("search"))}</button></form></section>${card(t("rescueHistory"), table(["ID", t("user"), t("mode"), t("score"), t("rescueStatus"), t("createdAt"), t("expiresAt")], list.map((item) => `<tr><td><code>${escapeHtml(item.id)}</code></td><td><button class="admin-link" data-rescue-user="${escapeHtml(item.user_id)}">${escapeHtml(item.target_nickname || `#${item.user_id}`)}</button></td><td><code>${escapeHtml(item.mode_key)}</code></td><td>${number(item.score).toLocaleString()}</td><td>${badge(statusLabel(item.rescue_status || item.status), "orange")}</td><td>${escapeHtml(formatDate(item.created_at))}</td><td>${escapeHtml(formatDate(item.expires_at))}</td></tr>`).join("")))}`;
  byId("admin-content").querySelector<HTMLFormElement>("[data-rescue-filter]")?.addEventListener("submit", (event) => { event.preventDefault(); navigate("rescue", Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement).entries())); });
  byId("admin-content").querySelector("[data-rescue-replay]")?.addEventListener("click", openReplayRescueDialog);
  byId("admin-content").querySelector("[data-rescue-board]")?.addEventListener("click", openBoardRescueDialog);
  byId("admin-content").querySelectorAll<HTMLElement>("[data-rescue-user]").forEach((node) => node.addEventListener("click", () => navigate("users", { user: node.dataset.rescueUser, section: "achievements" })));
}

function openReplayRescueDialog(): void {
  openDialog({ title: t("issueFromReplay"), body: `<div class="mb-3"><label class="form-label">${escapeHtml(t("targetUser"))}</label><input id="dialog-rescue-target" class="form-control"></div><div class="mb-3"><label class="form-label">${escapeHtml(t("modeKey"))}</label><input id="dialog-rescue-mode" class="form-control" required></div><div class="mb-3"><label class="form-label">${escapeHtml(t("replayFile"))}</label><input id="dialog-rescue-file" class="form-control" type="file" accept=".txt,.rpl,text/plain"></div><div class="mb-3"><label class="form-label">${escapeHtml(t("replayText"))}</label><textarea id="dialog-rescue-replay" class="form-control" rows="5"></textarea></div><div><label class="form-label">${escapeHtml(t("reason"))}</label><textarea id="dialog-rescue-reason" class="form-control" required></textarea></div>`, confirmLabel: t("issueRescue"), onConfirm: async () => { const file = byId<HTMLInputElement>("dialog-rescue-file").files?.[0]; const replay = file ? await file.text() : dialogValue("dialog-rescue-replay"); await request("/admin/rescue-offers/from-replay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_user: dialogValue("dialog-rescue-target"), mode_key: dialogValue("dialog-rescue-mode"), replay_string: replay, reason: dialogValue("dialog-rescue-reason") }) }); toast(t("success")); await renderCurrentView(); } });
}

function openBoardRescueDialog(): void {
  openDialog({ title: t("issueFromBoard"), body: `<div class="row g-3"><div class="col-md-6"><label class="form-label">${escapeHtml(t("targetUserId"))}</label><input id="dialog-board-user" class="form-control" type="number" min="1"></div><div class="col-md-6"><label class="form-label">${escapeHtml(t("modeKey"))}</label><input id="dialog-board-mode" class="form-control"></div><div class="col-md-6"><label class="form-label">${escapeHtml(t("modeBucket"))}</label><input id="dialog-board-bucket" class="form-control"></div><div class="col-md-3"><label class="form-label">${escapeHtml(t("score"))}</label><input id="dialog-board-score" class="form-control" type="number" min="0" value="0"></div><div class="col-md-3"><label class="form-label">${escapeHtml(t("duration"))}</label><input id="dialog-board-duration" class="form-control" type="number" min="0" value="0"></div><div class="col-12"><label class="form-label">${escapeHtml(t("boardJson"))}</label><textarea id="dialog-board-json" class="form-control" rows="5">[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]</textarea></div><div class="col-md-4"><label class="form-label">${escapeHtml(t("expiresHours"))}</label><input id="dialog-board-expires" class="form-control" type="number" min="1" max="720" value="168"></div><div class="col-12"><label class="form-label">${escapeHtml(t("reason"))}</label><textarea id="dialog-board-reason" class="form-control"></textarea></div></div>`, confirmLabel: t("issueRescue"), onConfirm: async () => { let board: unknown; try { board = JSON.parse(dialogValue("dialog-board-json")); } catch { toast(t("invalidBoardJson"), "error"); return false; } await request("/admin/rescue-offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: dialogValue("dialog-board-user"), mode_key: dialogValue("dialog-board-mode"), mode_bucket: dialogValue("dialog-board-bucket"), score: dialogValue("dialog-board-score"), duration_ms: dialogValue("dialog-board-duration"), board, expires_at: Date.now() + number(dialogValue("dialog-board-expires")) * 3600000, reason: dialogValue("dialog-board-reason") }) }); toast(t("success")); await renderCurrentView(); } });
}

async function renderGovernance(): Promise<void> {
  const response = await request<AdminRecord[]>("/admin/super-admins");
  const list = rows(response.data);
  const canManage = adminIdentity.canManageSuperAdmins === true;
  byId("admin-content").innerHTML = pageHeader(t("governance"), t("rootOnly"), canManage ? `<button class="btn btn-primary" data-grant-admin>${escapeHtml(t("grantSuperAdmin"))}</button>` : "") + card(t("adminList"), table([t("user"), t("email"), t("status"), t("createdAt"), t("lastLogin"), t("actions")], list.map((item) => `<tr><td><strong>${number(item.id) === 0 ? escapeHtml(t("rootAdmin")) : escapeHtml(item.nickname || item.display_name || `#${item.id}`)}</strong><small>#${escapeHtml(item.id)}</small></td><td>${escapeHtml(item.email)}</td><td>${badge(item.is_active === false ? t("inactive") : t("active"), item.is_active === false ? "red" : "green")}</td><td>${escapeHtml(formatDate(item.created_at))}</td><td>${escapeHtml(formatDate(item.last_login_at))}</td><td>${canManage && number(item.id) !== 0 ? `<button class="btn btn-sm btn-outline-danger" data-revoke-admin="${escapeHtml(item.id)}">${escapeHtml(t("revoke"))}</button>` : "—"}</td></tr>`).join("")));
  byId("admin-content").querySelector("[data-grant-admin]")?.addEventListener("click", () => openDialog({ title: t("grantSuperAdmin"), body: `<label class="form-label">${escapeHtml(t("targetUserId"))}</label><input id="dialog-admin-user" class="form-control" type="number" min="1">`, danger: true, confirmLabel: t("dangerousConfirm"), onConfirm: async () => { await request("/admin/super-admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: dialogValue("dialog-admin-user") }) }); toast(t("success")); await renderCurrentView(); } }));
  byId("admin-content").querySelectorAll<HTMLElement>("[data-revoke-admin]").forEach((node) => node.addEventListener("click", () => openDialog({ title: t("revoke"), body: `<p>${escapeHtml(t("rootOnly"))}</p>`, danger: true, confirmLabel: t("dangerousConfirm"), onConfirm: async () => { await request(`/admin/super-admins/${node.dataset.revokeAdmin}`, { method: "DELETE" }); toast(t("success")); await renderCurrentView(); } })));
}

async function renderAudit(): Promise<void> {
  const url = currentUrl();
  const tab = url.searchParams.get("tab") === "events" ? "events" : "actions";
  if (tab === "events") {
    const severity = url.searchParams.get("severity") || "";
    const userId = url.searchParams.get("user_id") || "";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const response = await request<AdminRecord[]>(adminQuery("/admin/events", { severity, user_id: userId, from, to, page: url.searchParams.get("page") || 1, limit: 50 }));
    byId("admin-content").innerHTML = pageHeader(t("audit"), t("runtimeEvents")) + auditTabs(tab) + `<section class="card admin-filter-card"><form class="card-body admin-record-filter" data-event-filter><label>${escapeHtml(t("severity"))}<select class="form-select" name="severity"><option value="">${escapeHtml(t("allStatuses"))}</option>${["info", "warning", "error", "critical"].map((value) => `<option value="${value}" ${severity === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>${escapeHtml(t("targetUserId"))}<input class="form-control" name="user_id" value="${escapeHtml(userId)}"></label><label>${escapeHtml(t("fromDate"))}<input class="form-control" type="date" name="from" value="${escapeHtml(from)}"></label><label>${escapeHtml(t("toDate"))}<input class="form-control" type="date" name="to" value="${escapeHtml(to)}"></label><button class="btn btn-primary">${escapeHtml(t("search"))}</button></form></section>${card(t("runtimeEvents"), table([t("severity"), t("eventType"), t("user"), t("recordId"), t("details"), t("createdAt")], rows(response.data).map((item) => `<tr><td>${badge(text(item.severity), item.severity === "error" || item.severity === "critical" ? "red" : "yellow")}</td><td><code>${escapeHtml(item.event_type)}</code></td><td>#${escapeHtml(item.user_id || "—")}</td><td><code>${escapeHtml(item.record_id || "—")}</code></td><td><details><summary>${escapeHtml(t("details"))}</summary><pre>${escapeHtml(prettyJson(item.details))}</pre></details></td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join("")))}${pagination("audit", response, { tab, severity, user_id: userId, from, to })}`;
    byId("admin-content").querySelector<HTMLFormElement>("[data-event-filter]")?.addEventListener("submit", (event) => { event.preventDefault(); navigate("audit", { tab: "events", ...Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement).entries()) }); });
  } else {
    const params = { actor: url.searchParams.get("actor") || "", target: url.searchParams.get("target") || "", action: url.searchParams.get("action") || "", target_type: url.searchParams.get("target_type") || "", from: url.searchParams.get("from") || "", to: url.searchParams.get("to") || "", page: url.searchParams.get("page") || 1, limit: 50 };
    const response = await request<AdminRecord[]>(adminQuery("/admin/audit", params));
    byId("admin-content").innerHTML = pageHeader(t("audit"), t("managementAudit")) + auditTabs(tab) + `<section class="card admin-filter-card"><form class="card-body admin-record-filter" data-audit-filter><label>${escapeHtml(t("actor"))}<input class="form-control" name="actor" value="${escapeHtml(params.actor)}"></label><label>${escapeHtml(t("target"))}<input class="form-control" name="target" value="${escapeHtml(params.target)}"></label><label>${escapeHtml(t("action"))}<input class="form-control" name="action" value="${escapeHtml(params.action)}"></label><label>${escapeHtml(t("targetType"))}<input class="form-control" name="target_type" value="${escapeHtml(params.target_type)}"></label><label>${escapeHtml(t("fromDate"))}<input class="form-control" type="date" name="from" value="${escapeHtml(params.from)}"></label><label>${escapeHtml(t("toDate"))}<input class="form-control" type="date" name="to" value="${escapeHtml(params.to)}"></label><button class="btn btn-primary">${escapeHtml(t("search"))}</button></form></section>${card(t("managementAudit"), table([t("actor"), t("action"), t("target"), t("details"), t("createdAt")], rows(response.data).map((item) => `<tr><td>${escapeHtml(item.actor_email || `#${item.actor_user_id}`)}</td><td><code>${escapeHtml(item.action)}</code></td><td>${escapeHtml(item.target_email || `${item.target_type} #${item.target_id || "—"}`)}</td><td><details><summary>${escapeHtml(t("details"))}</summary><pre>${escapeHtml(prettyJson(item.diff))}</pre></details></td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join("")))}${pagination("audit", response, { tab, ...params })}`;
    byId("admin-content").querySelector<HTMLFormElement>("[data-audit-filter]")?.addEventListener("submit", (event) => { event.preventDefault(); navigate("audit", { tab: "actions", ...Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement).entries()) }); });
  }
  byId("admin-content").querySelectorAll<HTMLElement>("[data-audit-tab]").forEach((node) => node.addEventListener("click", () => navigate("audit", { tab: node.dataset.auditTab })));
  bindPagination();
}

function auditTabs(active: string): string {
  return `<div class="admin-tabs"><button data-audit-tab="actions" class="${active === "actions" ? "is-active" : ""}">${escapeHtml(t("managementAudit"))}</button><button data-audit-tab="events" class="${active === "events" ? "is-active" : ""}">${escapeHtml(t("runtimeEvents"))}</button></div>`;
}

async function renderTools(): Promise<void> {
  const tablesResponse = await request<string[]>("/admin/tables");
  const tableNames = Array.isArray(tablesResponse.data) ? tablesResponse.data.map(text) : [];
  const selectedTable = currentUrl().searchParams.get("table") || tableNames[0] || "";
  let tableResult: AdminApiResponse<unknown> | null = null;
  if (selectedTable) tableResult = await request(adminQuery(`/admin/table/${encodeURIComponent(selectedTable)}`, { limit: 50 }));
  latestExport = tableResult?.data || null;
  byId("admin-content").innerHTML = pageHeader(t("tools"), t("readonlyHint"), `<button class="btn" data-export>${escapeHtml(t("export"))}</button>`) + `<div class="admin-two-column admin-tools-grid">${card(t("tableBrowser"), `<form data-table-form class="admin-inline-filter"><label>${escapeHtml(t("table"))}<select class="form-select" name="table">${tableNames.map((name) => `<option value="${escapeHtml(name)}" ${selectedTable === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label><button class="btn btn-primary">${escapeHtml(t("load"))}</button></form><div class="admin-raw-result">${renderRawRows(tableResult?.data)}</div>`)}${card(t("readonlySql"), `<div class="alert alert-warning">${escapeHtml(t("readonlyHint"))}</div><form data-sql-form><textarea class="form-control admin-sql" name="sql" rows="12" spellcheck="false">SELECT id, email, role, is_active, created_at FROM users ORDER BY id DESC LIMIT 20</textarea><button class="btn btn-primary mt-3" type="submit">${escapeHtml(t("run"))}</button></form><div class="admin-raw-result" data-sql-result></div>`)}</div>`;
  byId("admin-content").querySelector<HTMLFormElement>("[data-table-form]")?.addEventListener("submit", (event) => { event.preventDefault(); navigate("tools", { table: new FormData(event.currentTarget as HTMLFormElement).get("table") }); });
  byId("admin-content").querySelector<HTMLFormElement>("[data-sql-form]")?.addEventListener("submit", async (event) => { event.preventDefault(); const sql = text(new FormData(event.currentTarget as HTMLFormElement).get("sql")); const result = await request("/admin/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sql }) }); latestExport = result.data; const target = byId("admin-content").querySelector<HTMLElement>("[data-sql-result]"); if (target) target.innerHTML = renderRawRows(result.data); });
  byId("admin-content").querySelector("[data-export]")?.addEventListener("click", exportLatest);
}

function renderRawRows(value: unknown): string {
  const list = rows(value);
  if (!list.length) return emptyState();
  const keys = Array.from(new Set(list.flatMap((item) => Object.keys(item))));
  return table(keys, list.map((item) => `<tr>${keys.map((key) => `<td>${typeof item[key] === "object" && item[key] !== null ? `<pre>${escapeHtml(prettyJson(item[key]))}</pre>` : escapeHtml(item[key])}</td>`).join("")}</tr>`).join(""));
}

function exportLatest(): void {
  if (latestExport == null) return;
  const blob = new Blob([prettyJson(latestExport)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `2048-admin-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function renderCurrentView(): Promise<void> {
  const version = ++renderVersion;
  markActiveNavigation();
  setBusy();
  try {
    switch (currentView()) {
      case "dashboard": await renderDashboard(); break;
      case "users": await renderUsers(); break;
      case "records": await renderRecords(); break;
      case "imports": renderImports(); break;
      case "achievements": await renderAchievements(); break;
      case "rescue": await renderRescue(); break;
      case "governance": await renderGovernance(); break;
      case "audit": await renderAudit(); break;
      case "tools": await renderTools(); break;
    }
    if (version !== renderVersion) return;
    markActiveNavigation();
    byId("admin-content").focus({ preventScroll: true });
  } catch (error) {
    if (version === renderVersion) setPageError(error);
  }
}

async function authorize(): Promise<boolean> {
  const response = await api.request<AdminRecord>("/admin/me", { method: "GET" });
  if (response.success === false || record(response.data).admin !== true) return false;
  adminIdentity = record(response.data);
  return true;
}

export function bootstrapAdminPage(): void {
  if (typeof document === "undefined") return;
  language = readStorageValue(createBrowserStorageAccess({ windowLike: window }).local(), UI_LANGUAGE_KEY)?.toLowerCase().startsWith("en") ? "en" : "zh";
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  byId("admin-gate-text").textContent = t("checkingAccess");
  window.addEventListener("popstate", () => void renderCurrentView());
  void authorize().then((allowed) => {
    if (!allowed) {
      window.location.replace(ADMIN_DENIED_REDIRECT);
      return;
    }
    document.body.dataset.adminAccess = "granted";
    byId("admin-gate").hidden = true;
    byId("admin-shell").hidden = false;
    renderShell();
    if (!currentUrl().searchParams.has("view")) navigate("dashboard", {}, true);
    else void renderCurrentView();
  }).catch(() => window.location.replace(ADMIN_DENIED_REDIRECT));
}
