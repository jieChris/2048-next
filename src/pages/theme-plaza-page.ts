import { getAuthToken } from "../services/auth-session";
import { createPaletteUuidV4 } from "../features/palette/account-palette-editor";
import { getAccountPaletteSessionController } from "../features/palette/account-palette-session";
import {
  createBrowserStorageAccess,
  readStorageValue,
} from "../storage/browser-storage";
import {
  createThemePlazaClient,
  ThemePlazaClientError,
  type ThemePlazaCapabilities,
  type ThemePlazaListing,
  type ThemePlazaMyShare,
  type ThemePlazaSaveInput,
  type ThemePlazaSaveResult,
  type ThemePlazaSort,
} from "../features/theme-plaza/theme-plaza-client";
import {
  renderThemePlazaPalettePreview,
  type ThemePlazaPreviewFamily,
} from "../features/theme-plaza/palette-preview";

const client = createThemePlazaClient();
const browserStorage = createBrowserStorageAccess();
const localStorageLike = () => browserStorage.local();

const content = () =>
  document.getElementById("theme-plaza-content") as HTMLElement;
const statusNode = () =>
  document.getElementById("theme-plaza-status") as HTMLElement;

function isEnglish(): boolean {
  return String(readStorageValue(localStorageLike(), "ui_language_v1") || "zh")
    .toLowerCase()
    .startsWith("en");
}

function copy(zh: string, en: string): string {
  return isEnglish() ? en : zh;
}

function clear(node: HTMLElement): void {
  node.replaceChildren();
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat(isEnglish() ? "en" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function profileHref(item: ThemePlazaListing): string {
  const id = item.author.publicProfileId;
  if (id == null) return "#";
  const params = new URLSearchParams({
    id: String(id),
    nickname: item.author.nickname,
  });
  return `user.html?${params}`;
}

function setStatus(
  message: string,
  type: "info" | "error" | "success" = "info",
): void {
  const node = statusNode();
  node.textContent = message;
  node.dataset.statusType = type;
  node.hidden = !message;
}

function stat(label: string, value: number): HTMLElement {
  const node = element("span", "theme-plaza-stat");
  const strong = element("strong", "", String(value));
  node.append(strong, document.createTextNode(label));
  return node;
}

function actionButton(
  item: ThemePlazaListing,
  capabilities: ThemePlazaCapabilities,
): HTMLElement {
  if (item.viewer.owned)
    return element(
      "span",
      "theme-plaza-owned",
      copy("这是你的作品", "Your work"),
    );
  if (!getAuthToken({ storageLike: localStorageLike() })) {
    const link = element(
      "a",
      "replay-button theme-plaza-save",
      copy("登录后保存", "Sign in to save"),
    );
    link.href = `account_settings.html?return=${encodeURIComponent(`theme_plaza.html?id=${item.id}`)}`;
    return link;
  }
  const button = element(
    "button",
    "replay-button theme-plaza-save",
    item.viewer.saved
      ? copy("已保存", "Saved")
      : capabilities.saveEnabled
        ? copy("一键保存", "Save a copy")
        : copy("保存功能准备中", "Saving coming soon"),
  );
  button.type = "button";
  button.disabled = item.viewer.saved || !capabilities.saveEnabled;
  let pendingRequest: ThemePlazaSaveInput | null = null;
  const send = async (
    input?: ThemePlazaSaveInput,
  ): Promise<ThemePlazaSaveResult> => {
    if (input) pendingRequest = input;
    if (!pendingRequest) {
      pendingRequest = {
        operationId: createPaletteUuidV4(),
        paletteId: createPaletteUuidV4(),
        allowDuplicate: false,
      };
    }
    const result = await client.save(item.version.id, pendingRequest);
    pendingRequest = null;
    return result;
  };
  if (capabilities.saveEnabled && !item.viewer.saved) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      const original = button.textContent || "";
      button.textContent = copy("保存中…", "Saving…");
      try {
        let result = await send();
        if (result.status === "duplicate_existing") {
          const keepCopy = window.confirm(
            copy(
              "已存在视觉内容相同的色板。仍然保留为新色板吗？",
              "A visually identical palette exists. Keep a new copy anyway?",
            ),
          );
          if (keepCopy && result.paletteId) {
            result = await send({
              operationId: createPaletteUuidV4(),
              paletteId: result.paletteId,
              allowDuplicate: true,
            });
          } else if (result.existingPaletteId) {
            const useExisting = window.confirm(
              copy(
                "改用已有色板并记录本次保存吗？",
                "Use the existing palette and record this save?",
              ),
            );
            if (!useExisting) {
              button.disabled = false;
              button.textContent = original;
              return;
            }
            result = await send({
              operationId: createPaletteUuidV4(),
              existingPaletteId: result.existingPaletteId,
            });
          }
        }
        if (result.status === "capacity_full") {
          throw new Error(
            copy(
              "账号色板已达到十套上限；引用次数没有增加。",
              "Your account already has ten palettes; the save count was not increased.",
            ),
          );
        }
        if (result.status !== "saved" || !result.currentSaved) {
          throw new Error(copy("色板尚未保存。", "Palette was not saved."));
        }
        item.viewer.saved = true;
        item.stats.references += result.firstReference ? 1 : 0;
        button.textContent = copy("已保存", "Saved");
        getAccountPaletteSessionController().reset();
        setStatus(
          copy(
            "色板副本已保存；当前使用色板没有改变。",
            "Palette copy saved without changing the active palette.",
          ),
          "success",
        );
      } catch (error) {
        if (error instanceof ThemePlazaClientError) pendingRequest = null;
        button.disabled = false;
        button.textContent = original;
        setStatus(
          error instanceof Error ? error.message : String(error),
          "error",
        );
      }
    });
  }
  return button;
}
function listingCard(
  item: ThemePlazaListing,
  capabilities: ThemePlazaCapabilities,
): HTMLElement {
  const article = element("article", "theme-plaza-card card-surface");
  const previewLink = element("a", "theme-plaza-card-preview");
  previewLink.href = `theme_plaza.html?id=${item.id}`;
  previewLink.append(
    renderThemePlazaPalettePreview({ palette: item.version.palette }),
  );

  const body = element("div", "theme-plaza-card-body");
  const title = element("h2", "theme-plaza-card-title");
  const titleLink = element("a", "", item.version.title);
  titleLink.href = `theme_plaza.html?id=${item.id}`;
  title.append(titleLink);

  const author = element("a", "theme-plaza-author", item.author.nickname);
  author.href = profileHref(item);
  if (author.href.endsWith("#")) author.removeAttribute("href");
  const meta = element("div", "theme-plaza-card-meta");
  meta.append(
    author,
    document.createTextNode(` · ${formatDate(item.version.publishedAt)}`),
  );

  const stats = element("div", "theme-plaza-stats");
  stats.append(
    stat(copy("赞", " likes"), item.stats.likes),
    stat(copy("踩", " dislikes"), item.stats.dislikes),
    stat(copy("引用", " saves"), item.stats.references),
  );

  const actions = element("div", "theme-plaza-card-actions");
  const detail = element(
    "a",
    "replay-button",
    copy("查看详情", "View details"),
  );
  detail.href = `theme_plaza.html?id=${item.id}`;
  actions.append(detail, actionButton(item, capabilities));
  body.append(title, meta, stats, actions);
  article.append(previewLink, body);
  return article;
}

function renderDisabled(capabilities: ThemePlazaCapabilities): void {
  clear(content());
  const empty = element("section", "theme-plaza-empty card-surface");
  empty.append(
    element(
      "h2",
      "",
      copy("主题广场正在准备中", "Theme Plaza is being prepared"),
    ),
    element(
      "p",
      "",
      capabilities.paletteFormat3Enabled
        ? copy(
            "公开浏览暂未开放，已有色板不会受到影响。",
            "Public browsing is not open yet. Existing palettes are unaffected.",
          )
        : copy(
            "正在完善跨端色板兼容，分享和保存功能会保持关闭。",
            "Cross-device palette compatibility is being completed; sharing and saving remain disabled.",
          ),
    ),
  );
  content().append(empty);
  setStatus("");
}

async function renderList(): Promise<void> {
  const search = document.getElementById(
    "theme-plaza-query",
  ) as HTMLInputElement;
  const sort = document.getElementById("theme-plaza-sort") as HTMLSelectElement;
  setStatus(copy("正在加载主题广场…", "Loading Theme Plaza…"));
  const result = await client.list({
    query: search.value.trim(),
    sort: sort.value as ThemePlazaSort,
    limit: 20,
  });
  clear(content());
  if (result.items.length) {
    const grid = element("section", "theme-plaza-grid");
    result.items.forEach((item) =>
      grid.append(listingCard(item, result.capabilities)),
    );
    content().append(grid);
  } else {
    const empty = element("section", "theme-plaza-empty card-surface");
    empty.append(
      element("h2", "", copy("还没有公开作品", "No published palettes yet")),
      element(
        "p",
        "",
        copy(
          "调整搜索条件，或稍后再来看看。",
          "Try another search or return later.",
        ),
      ),
    );
    content().append(empty);
  }
  setStatus("");
}

function detailHeader(item: ThemePlazaListing): HTMLElement {
  const header = element("div", "theme-plaza-detail-header");
  const copyWrap = element("div");
  copyWrap.append(
    element(
      "p",
      "theme-plaza-kicker",
      copy(
        `第 ${item.version.revision} 版`,
        `Version ${item.version.revision}`,
      ),
    ),
    element("h1", "theme-plaza-detail-title", item.version.title),
  );
  const meta = element("p", "theme-plaza-detail-meta");
  const author = element("a", "", item.author.nickname);
  author.href = profileHref(item);
  meta.append(
    author,
    document.createTextNode(` · ${formatDate(item.version.publishedAt)}`),
  );
  copyWrap.append(meta);
  header.append(copyWrap);
  return header;
}

function engagementActions(
  item: ThemePlazaListing,
  capabilities: ThemePlazaCapabilities,
): HTMLElement {
  const group = element("div", "theme-plaza-engagement");
  const canAct =
    capabilities.reactionEnabled &&
    !!getAuthToken({ storageLike: localStorageLike() }) &&
    !item.viewer.owned;
  const voteButtons = new Map<-1 | 1, HTMLButtonElement>();
  const syncVoteButtons = () => {
    voteButtons.forEach((button, value) =>
      button.setAttribute("aria-pressed", String(item.viewer.vote === value)),
    );
  };
  for (const [value, label] of [
    [1, copy("点赞", "Like")],
    [-1, copy("点踩", "Dislike")],
  ] as const) {
    const button = element("button", "replay-button", label);
    button.type = "button";
    button.disabled = !canAct;
    voteButtons.set(value, button);
    button.addEventListener("click", async () => {
      const previous = item.viewer.vote;
      item.viewer.vote = previous === value ? 0 : value;
      syncVoteButtons();
      try {
        const result = await client.vote(item.version.id, item.viewer.vote);
        const stats =
          result.stats && typeof result.stats === "object"
            ? (result.stats as Record<string, unknown>)
            : {};
        item.stats.likes = Number(stats.likes) || 0;
        item.stats.dislikes = Number(stats.dislikes) || 0;
      } catch (error) {
        item.viewer.vote = previous;
        syncVoteButtons();
        setStatus(
          error instanceof Error ? error.message : String(error),
          "error",
        );
      }
    });
    group.append(button);
  }
  syncVoteButtons();
  const report = element("button", "replay-button", copy("举报", "Report"));
  report.type = "button";
  report.disabled = !canAct;
  report.addEventListener("click", async () => {
    const note = window.prompt(
      copy(
        "补充说明（可留空，最多 200 字）",
        "Optional details (up to 200 characters)",
      ),
      "",
    );
    if (note == null) return;
    try {
      await client.report(item.version.id, {
        category: "other",
        note: note.slice(0, 200),
      });
      setStatus(
        copy(
          "举报已提交，作品不会因举报数量自动下架。",
          "Report submitted; reports never hide a work automatically.",
        ),
        "success",
      );
      report.disabled = true;
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : String(error),
        "error",
      );
    }
  });
  group.append(report);
  return group;
}

function renderDetailView(
  item: ThemePlazaListing,
  capabilities: ThemePlazaCapabilities,
): void {
  clear(content());
  const section = element("section", "theme-plaza-detail card-surface");
  const previewHost = element("div", "theme-plaza-detail-preview");
  let family: ThemePlazaPreviewFamily = "pow2";
  const draw = () => {
    previewHost.replaceChildren(
      renderThemePlazaPalettePreview({
        palette: item.version.palette,
        family,
        className: "theme-plaza-preview--detail",
      }),
    );
  };
  const toggles = element("div", "theme-plaza-family-toggle");
  for (const value of ["pow2", "fibonacci"] as const) {
    const button = element(
      "button",
      "replay-button",
      value === "pow2" ? copy("2 的幂", "Powers of 2") : "Fibonacci",
    );
    button.type = "button";
    button.setAttribute("aria-pressed", String(value === family));
    button.addEventListener("click", () => {
      family = value;
      toggles
        .querySelectorAll("button")
        .forEach((node) =>
          node.setAttribute("aria-pressed", String(node === button)),
        );
      draw();
    });
    toggles.append(button);
  }
  draw();

  const stats = element("div", "theme-plaza-stats theme-plaza-stats--detail");
  stats.append(
    stat(copy("赞", " likes"), item.stats.likes),
    stat(copy("踩", " dislikes"), item.stats.dislikes),
    stat(copy("引用", " saves"), item.stats.references),
  );
  const note = element(
    "p",
    "theme-plaza-reference-note",
    copy(
      "引用次数按账号去重的成功保存次数计算。",
      "Save count is deduplicated by account.",
    ),
  );
  const actions = element("div", "theme-plaza-card-actions");
  actions.append(
    actionButton(item, capabilities),
    engagementActions(item, capabilities),
  );
  const back = element("a", "replay-button", copy("返回广场", "Back to Plaza"));
  back.href = "theme_plaza.html";
  actions.append(back);

  section.append(
    detailHeader(item),
    toggles,
    previewHost,
    stats,
    note,
    actions,
  );
  content().append(section);
  setStatus("");
}

async function renderDetail(id: number): Promise<void> {
  setStatus(copy("正在加载作品…", "Loading palette…"));
  const result = await client.detail(id);
  renderDetailView(result.item, result.capabilities);
}

function statusLabel(state: ThemePlazaMyShare | null): string {
  const status = state?.pending_status || state?.published_status || "none";
  const labels: Record<string, [string, string]> = {
    none: ["未分享", "Not shared"],
    pending_ai: ["AI 审核中", "AI review pending"],
    manual_review: ["待人工审核", "Manual review"],
    published: ["已发布", "Published"],
    rejected: ["未通过", "Rejected"],
    hidden: ["已下架", "Hidden"],
    withdrawn: ["已撤下", "Withdrawn"],
    cancelled: ["已取消", "Cancelled"],
  };
  return (labels[status] || [status, status])[isEnglish() ? 1 : 0];
}

async function renderMine(): Promise<void> {
  if (!getAuthToken({ storageLike: localStorageLike() })) {
    clear(content());
    const empty = element("section", "theme-plaza-empty card-surface");
    const login = element(
      "a",
      "replay-button",
      copy("登录后查看", "Sign in to view"),
    );
    login.href = `account_settings.html?return=${encodeURIComponent("theme_plaza.html?mine=1")}`;
    empty.append(element("h2", "", copy("我的分享", "My share")), login);
    content().append(empty);
    return;
  }
  setStatus(copy("正在加载分享状态…", "Loading share status…"));
  const result = await client.myShare();
  clear(content());
  const card = element("section", "theme-plaza-mine card-surface");
  card.append(
    element("p", "theme-plaza-kicker", copy("我的分享", "My share")),
    element("h1", "theme-plaza-detail-title", statusLabel(result.state)),
  );
  if (result.state?.published_title)
    card.append(
      element(
        "p",
        "",
        `${copy("公开作品", "Published")}: ${result.state.published_title}`,
      ),
    );
  if (result.state?.pending_title)
    card.append(
      element(
        "p",
        "",
        `${copy("待审核版本", "Pending")}: ${result.state.pending_title}`,
      ),
    );
  if (result.state?.pending_reason_code)
    card.append(
      element("p", "theme-plaza-warning", result.state.pending_reason_code),
    );
  const note = element(
    "p",
    "",
    result.capabilities.shareEnabled
      ? copy(
          "可以从色板中心更新分享。",
          "Update your share from the palette center.",
        )
      : copy(
          "分享写入尚未开放；当前页面仅展示状态。",
          "Sharing is not open yet; this page is read-only.",
        ),
  );
  const paletteLink = element(
    "a",
    "replay-button",
    copy("前往色板中心", "Open palette center"),
  );
  paletteLink.href = "palette.html#appearance-settings";
  card.append(note, paletteLink);
  content().append(card);
  setStatus("");
}

function renderError(error: unknown, retry: () => void): void {
  const message =
    error instanceof ThemePlazaClientError
      ? error.code === "THEME_PLAZA_DISABLED"
        ? copy("主题广场尚未开放。", "Theme Plaza is not open yet.")
        : error.message
      : error instanceof Error
        ? error.message
        : copy("加载失败", "Loading failed");
  setStatus(message, "error");
  clear(content());
  const card = element("section", "theme-plaza-empty card-surface");
  const button = element("button", "replay-button", copy("重试", "Retry"));
  button.type = "button";
  button.addEventListener("click", retry);
  card.append(element("p", "", message), button);
  content().append(card);
}

async function route(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  try {
    const capabilities = await client.capabilities();
    if (!capabilities.readEnabled) {
      renderDisabled(capabilities);
      return;
    }
    if (params.get("mine") === "1") {
      await renderMine();
      return;
    }
    const id = Number(params.get("id"));
    if (Number.isSafeInteger(id) && id > 0) {
      await renderDetail(id);
      return;
    }
    await renderList();
  } catch (error) {
    renderError(error, () => void route());
  }
}

function applyCopy(): void {
  document.documentElement.lang = isEnglish() ? "en" : "zh-CN";
  document.title = copy("主题广场 · 2048 NEXT", "Theme Plaza · 2048 NEXT");
  const map: Record<string, string> = {
    "theme-plaza-kicker": "2048 NEXT",
    "theme-plaza-page-title": copy("主题广场", "Theme Plaza"),
    "theme-plaza-page-subtitle": copy(
      "发现、预览并保存玩家创作的方块色板。",
      "Discover and preview community tile palettes.",
    ),
    "theme-plaza-nav-palette": copy("色板中心", "Palette Center"),
    "theme-plaza-nav-home": copy("回首页", "Home"),
    "theme-plaza-mine-link": copy("我的分享", "My Share"),
    "theme-plaza-search-label": copy("搜索", "Search"),
    "theme-plaza-search-btn": copy("查找", "Search"),
  };
  Object.entries(map).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  const query = document.getElementById(
    "theme-plaza-query",
  ) as HTMLInputElement | null;
  if (query)
    query.placeholder = copy("按标题或作者搜索", "Search title or author");
  const sort = document.getElementById(
    "theme-plaza-sort",
  ) as HTMLSelectElement | null;
  if (sort) {
    const labels = [
      copy("最新发布", "Latest"),
      copy("最多引用", "Most saved"),
      copy("最多好评", "Most liked"),
    ];
    Array.from(sort.options).forEach((option, index) => {
      option.textContent = labels[index] || option.value;
    });
  }
}

export function bootstrapThemePlazaPage(): void {
  document.body.dataset.pageFamily = "theme-plaza";
  applyCopy();
  const form = document.getElementById(
    "theme-plaza-search-form",
  ) as HTMLFormElement;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = (
      document.getElementById("theme-plaza-query") as HTMLInputElement
    ).value.trim();
    const sort = (
      document.getElementById("theme-plaza-sort") as HTMLSelectElement
    ).value;
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (sort !== "latest") params.set("sort", sort);
    history.replaceState(
      null,
      "",
      `theme_plaza.html${params.size ? `?${params}` : ""}`,
    );
    void route();
  });
  window.addEventListener("uilanguagechange", () => {
    applyCopy();
    void route();
  });
  void route();
}
