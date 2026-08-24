import {
  resolveStorageByName,
  safeReadStorageItem,
  safeSetStorageItem,
} from "../../bootstrap/storage";

export interface ContextualGuideText {
  zh: string;
  en: string;
}

export interface ContextualGuideContext {
  pageId?: string;
  modeKey?: string;
  modeConfig?: Record<string, unknown> | null;
  ruleset?: string;
  compact?: boolean;
  currentUrl?: string;
}

export interface ContextualGuideStep {
  selector?: string;
  title: string;
  body: string;
}

export interface ContextualGuideLocalizedStep {
  selector?: string;
  title: ContextualGuideText;
  body: ContextualGuideText;
}

export interface ContextualGuideDefinition {
  id: string;
  pageId: string;
  title: ContextualGuideText;
  description: ContextualGuideText;
  autoOpen?: boolean;
  matches?: (context: ContextualGuideContext) => boolean;
  buildSteps: (
    context: ContextualGuideContext,
  ) => readonly ContextualGuideLocalizedStep[];
  buildTargetUrl: (context: ContextualGuideContext) => string;
}

export interface ContextualGuideOptions {
  id: string;
  label: string;
  steps: readonly ContextualGuideStep[];
  onClose?: () => void;
}

type Placement = "above" | "below";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

const VIEWPORT_GUTTER = 12;
const TARGET_PADDING = 8;
const TARGET_CARD_GAP = 14;

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function isEnglish(): boolean {
  return document.documentElement.lang.toLowerCase().startsWith("en");
}

function text(zh: string, en: string): ContextualGuideText {
  return { zh, en };
}

function localize(value: ContextualGuideText, english = isEnglish()): string {
  return english ? value.en : value.zh;
}

function isDiagonalContext(context: ContextualGuideContext): boolean {
  const modeKey = String(context.modeKey || context.modeConfig?.key || "").toLowerCase();
  const rules = context.modeConfig?.special_rules;
  return (
    modeKey.startsWith("diag_") ||
    (isRecord(rules) && rules.allow_diagonal_moves === true)
  );
}

function isFibonacciContext(context: ContextualGuideContext): boolean {
  return (
    String(context.ruleset || context.modeConfig?.ruleset || "").toLowerCase() ===
      "fibonacci" ||
    String(context.modeKey || context.modeConfig?.key || "")
      .toLowerCase()
      .startsWith("fib_")
  );
}

function currentUrl(context: ContextualGuideContext): string {
  if (context.currentUrl) return context.currentUrl;
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  return "";
}

function buildGuidePageUrl(
  context: ContextualGuideContext,
  targetPage: string,
  guideId: string,
  preserveSearch = false,
): string {
  const source = preserveSearch ? currentUrl(context) : targetPage;
  const hashIndex = source.indexOf("#");
  const hash = hashIndex >= 0 ? source.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? source.slice(0, hashIndex) : source;
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const params = new URLSearchParams(
    queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "",
  );
  params.set("guide", guideId);
  const query = params.toString();
  return `${pathname || targetPage}${query ? `?${query}` : ""}${hash}`;
}

function modeKeyFromContext(context: ContextualGuideContext): string {
  if (context.modeKey) return String(context.modeKey);
  const fromConfig = context.modeConfig?.key;
  if (typeof fromConfig === "string" && fromConfig) return fromConfig;
  try {
    return new URLSearchParams(currentUrl(context).split("?", 2)[1] || "").get(
      "mode_key",
    ) || "";
  } catch (_error) {
    return "";
  }
}

function buildPracticeGuideUrl(context: ContextualGuideContext): string {
  const sourceParams = new URLSearchParams(
    currentUrl(context).split("?", 2)[1]?.split("#", 1)[0] || "",
  );
  const params = new URLSearchParams();
  const modeKey =
    sourceParams.get("practice_mode_key") ||
    (context.pageId === "practice" ? modeKeyFromContext(context) : "");
  const ruleset =
    sourceParams.get("practice_ruleset") ||
    (context.pageId === "practice" ? String(context.ruleset || "") : "");
  if (modeKey) params.set("practice_mode_key", modeKey);
  if (ruleset) params.set("practice_ruleset", ruleset);
  const query = params.toString();
  return buildGuidePageUrl(
    {
      ...context,
      currentUrl: `Practice_board.html${query ? `?${query}` : ""}`,
    },
    "Practice_board.html",
    "practice-board-v1",
    true,
  );
}

const CONTEXTUAL_GUIDES: readonly ContextualGuideDefinition[] = [
  {
    id: "practice-board-v1",
    pageId: "practice",
    title: text("练习板入门", "Practice board"),
    description: text("摆放、清除与 0 的循环", "Place, clear, and use the 0 cycle"),
    autoOpen: true,
    buildSteps: (context) => {
      const fibonacci = isFibonacciContext(context);
      const steps: ContextualGuideLocalizedStep[] = [
        {
          selector: "#selection-grid",
          title: text("先选择一个棋子", "Choose a tile"),
          body: text(
            "在这里选择准备放置的棋子。放大的棋子，就是当前选中的棋子。",
            "Pick the tile you want to place. The enlarged tile is your current selection.",
          ),
        },
        {
          selector: "#test-grid-container .grid-cell",
          title: text("再点击棋盘位置", "Place it on the board"),
          body: text(
            "点击任意格即可放置当前棋子。指引只负责说明，不会替你改变盘面。",
            "Click any cell to place the selected tile. This guide only points—it never changes your board.",
          ),
        },
        {
          selector: '#selection-grid [data-value="0"]',
          title: text("0 还有一个隐藏循环", "The hidden 0 cycle"),
          body: text(
            fibonacci
              ? "选中 0 后反复点击同一格：清除 → 不可合成砖块 → 1 → 2 → 3…"
              : "选中 0 后反复点击同一格：清除 → 不可合成砖块 → 2 → 4 → 8…",
            fibonacci
              ? "Select 0, then click the same cell repeatedly: clear → brick → 1 → 2 → 3…"
              : "Select 0, then click the same cell repeatedly: clear → brick → 2 → 4 → 8…",
          ),
        },
      ];
      if (context.compact) {
        steps.push({
          selector: ".scores-container",
          title: text("窄屏可切换手势模式", "Switch to gesture mode on narrow screens"),
          body: text(
            "点击分数／计时区域可切换手势模式；此时滑动棋盘进行移动，不会放置砖块。",
            "Tap the score or timer area to switch to gesture mode. Swipe the board to move instead of placing tiles.",
          ),
        });
      }
      return steps;
    },
    buildTargetUrl: buildPracticeGuideUrl,
  },
  {
    id: "diagonal-moves-v1",
    pageId: "play",
    title: text("八方向操作", "Eight-direction moves"),
    description: text("斜向移动与键位说明", "Diagonal moves and key mapping"),
    autoOpen: true,
    matches: isDiagonalContext,
    buildSteps: (context) => {
      const steps: ContextualGuideLocalizedStep[] = [
        {
          selector: ".grid-container",
          title: text("八个方向都可以移动", "Move in eight directions"),
          body: text(
            "除了上、下、左、右，还支持左上、右上、左下、右下四个斜向。",
            "Besides up, down, left, and right, this mode supports all four diagonal directions.",
          ),
        },
        {
          selector: ".game-container",
          title: text("键盘映射", "Keyboard mapping"),
          body: text(
            "E=右上，C=右下，Z=左下，Q=左上；小键盘 9、3、1、7 也分别对应这四个斜向。",
            "E=up-right, C=down-right, Z=down-left, Q=up-left. Numpad 9, 3, 1, and 7 map to the same directions.",
          ),
        },
        {
          selector: ".grid-container",
          title: text("注意 Z 的含义", "Remember what Z means"),
          body: text(
            "在八方向模式中，Z 是左下的斜向移动，不是撤回；无撤回输入仍按页面实际规则处理。",
            "In eight-direction mode, Z moves down-left—it is not undo. Undo remains governed by the current mode rules.",
          ),
        },
      ];
      if (context.compact) {
        steps.push({
          selector: ".diagonal-assist-touch-btn",
          title: text("触屏斜向辅助", "Touch diagonal assist"),
          body: text(
            "窄屏可按住斜向辅助按钮，再滑动棋盘，更容易触发斜向移动。",
            "On a narrow screen, hold the diagonal-assist button while swiping to make diagonal moves easier to trigger.",
          ),
        });
      }
      return steps;
    },
    buildTargetUrl: (context) => {
      const key = modeKeyFromContext(context);
      const diagonalKey = key.toLowerCase().startsWith("diag_") ? key : "diag_4x4_pow2_no_undo";
      return buildGuidePageUrl(
        { ...context, currentUrl: `play.html?mode_key=${encodeURIComponent(diagonalKey)}` },
        "play.html",
        "diagonal-moves-v1",
        true,
      );
    },
  },
  {
    id: "replay-controls-v1",
    pageId: "replay",
    title: text("回放入门", "Replay controls"),
    description: text("播放、定位、速度与导入", "Play, seek, speed, and import"),
    autoOpen: true,
    buildSteps: () => [
      {
        selector: "#replay-pause-btn",
        title: text("播放与暂停", "Play and pause"),
        body: text("这里可以暂停或继续当前回放，不会改写原始记录。", "Pause or resume the replay here. The original record is never rewritten."),
      },
      {
        selector: "#replay-open-speed-btn",
        title: text("选择播放速度", "Choose a playback speed"),
        body: text("固定速度适合快速浏览；按原速回放会尽量使用记录中的每步时间。", "Fixed speed is useful for browsing; original-speed playback follows each recorded step time when available."),
      },
      {
        selector: "#replay-progress",
        title: text("拖动进度条定位", "Seek with the progress bar"),
        body: text("拖动进度条，或使用退 1／退 10／进 1／进 10 定位。它们只改变查看位置。", "Drag the progress bar or use -1/-10/+1/+10 to seek. These controls only change the viewing position."),
      },
      {
        selector: "#import-replay-file-btn",
        title: text("导入与查看统计", "Import and inspect"),
        body: text("可导入 .txt、.vrs、.rpl，或粘贴回放字符串；统计信息按钮可查看记录摘要。", "Import .txt, .vrs, or .rpl files, or paste a replay string. The statistics button shows a summary."),
      },
    ],
    buildTargetUrl: (context) => buildGuidePageUrl(context, "replay.html", "replay-controls-v1"),
  },
  {
    id: "game-basics-v1",
    pageId: "index",
    title: text("普通游戏基础", "Game basics"),
    description: text("合并、移动与恢复状态", "Merging, moving, and restoring"),
    buildSteps: () => [
      {
        title: text("相同数字会合并", "Equal tiles merge"),
        body: text("相同数字的方块碰到一起会合并成更大的方块，目标方块和计时规则取决于当前模式。", "Equal tiles merge into a larger tile. The target and timing rules depend on the current mode."),
      },
      {
        title: text("选择你的移动方式", "Choose your controls"),
        body: text("可以使用方向键、WASD、HJKL 或触屏滑动；可撤回与不可撤回模式的规则不同。", "Use arrow keys, WASD, HJKL, or touch swipes. Undo and no-undo modes follow different rules."),
      },
      {
        title: text("新游戏与刷新不是一回事", "Restart and refresh are different"),
        body: text("新游戏会创建一局新的状态；刷新页面会尝试恢复当前保存状态，恢复结果以本地记录为准。", "New Game creates a new state. Refresh tries to restore the saved current state, using the local record as the source."),
      },
    ],
    buildTargetUrl: (context) => buildGuidePageUrl(context, "/", "game-basics-v1"),
  },
  {
    id: "mode-selection-v1",
    pageId: "modes",
    title: text("模式选择说明", "Mode selection"),
    description: text("看懂棋盘、规则与特殊玩法", "Understand boards, rules, and variants"),
    buildSteps: () => [
      {
        title: text("先看棋盘与规则", "Start with board and rules"),
        body: text("模式名称会说明棋盘尺寸、幂 2 或斐波那契规则，以及是否允许撤回。", "Mode names describe the board size, power-of-two or Fibonacci rules, and whether undo is allowed."),
      },
      {
        title: text("再看特殊条件", "Then check special conditions"),
        body: text("封顶、八方向、障碍、方向锁、连击、道具和计时等条件都会改变玩法；进入模式前先读简介。", "Capped targets, eight directions, obstacles, direction locks, combos, items, and timers change the rules. Read the intro before entering."),
      },
      {
        title: text("排行榜范围以页面为准", "Check leaderboard availability"),
        body: text("有排行榜的模式会在对应模式中展示成绩；其他模式也可以正常游玩并保留本地记录。", "Modes with leaderboards show scores in that mode. Other modes remain playable and keep local history."),
      },
    ],
    buildTargetUrl: (context) => buildGuidePageUrl(context, "modes.html", "mode-selection-v1"),
  },
  {
    id: "palette-settings-v1",
    pageId: "palette",
    title: text("色板中心说明", "Palette center"),
    description: text("计时器、配色与发光设置", "Timers, colors, and glow settings"),
    buildSteps: () => [
      {
        title: text("计时器规则会从下一局生效", "Timer rules apply next game"),
        body: text("母计时器和子计时器可以分别设置；保存后从下一局开始使用。", "Configure parent and sub-timers separately. Saved rules apply from the next game."),
      },
      {
        title: text("外观与色板分开管理", "Appearance and palettes are separate"),
        body: text("主题决定整体界面风格，色板决定方块的背景、文字、边框和发光；边框和发光都可以选择无。", "Themes control the interface style. Palettes control tile background, text, border, and glow; border and glow can both be empty."),
      },
      {
        title: text("整体与单个发光强度", "Global and per-tile glow"),
        body: text("整体强度是统一倍率，单个方块倍率是在此基础上的调整；HEX、RGB、系统色板和预设颜色都可使用。", "Global intensity is the shared multiplier; each tile can adjust its own multiplier on top. HEX, RGB, system colors, and presets are supported."),
      },
      {
        title: text("色板可以备份和迁移", "Back up and move palettes"),
        body: text("自定义色板可创建副本、重命名、导入和导出；界面语言设置会作用于整个网站。", "Custom palettes can be copied, renamed, imported, and exported. The interface language setting applies across the site."),
      },
    ],
    buildTargetUrl: (context) => buildGuidePageUrl(context, "palette.html", "palette-settings-v1"),
  },
  {
    id: "relay-5x5-v1",
    pageId: "relay-5x5",
    title: text("5×5 接力说明", "5x5 relay"),
    description: text("档案、接档与回放边界", "Profiles, handoffs, and replay boundaries"),
    buildSteps: () => [
      {
        title: text("先登录并创建档案", "Sign in and create a profile"),
        body: text("接力需要账号；创建档案后才能提交当前进度。", "Relay requires an account. Create a profile before submitting progress."),
      },
      {
        title: text("读取后再提交当前进度", "Load before submitting progress"),
        body: text("读取档案会载入当前接力状态；提交当前进度会写入服务器，操作前先确认档案和盘面。", "Loading a profile restores its current relay state. Submitting progress writes to the server, so confirm the profile and board first."),
      },
      {
        title: text("接档需要三方确认", "A handoff has three stages"),
        body: text("新玩家申请接档，当前持有者批准，再由被指定用户确认；这些操作都会写入服务器，指引不会替你执行。", "A new player requests the handoff, the current holder approves it, and the selected recipient confirms it. Each action writes to the server, and this guide never performs them for you."),
      },
      {
        title: text("分清三种查看材料", "Know the three replay views"),
        body: text("整档回放覆盖完整接力，分段回放只看某一段，终盘快照只显示最后盘面。", "A whole-run replay covers the entire relay, a segment replay shows one portion, and the final snapshot only shows the ending board."),
      },
      {
        title: text("销档不可恢复", "Deleting a profile is permanent"),
        body: text("销档会删除服务器上的接力档案；确认不再需要后再执行，删除后不能恢复。", "Deleting removes the relay profile from the server. Only proceed when it is no longer needed; deletion cannot be undone."),
      },
    ],
    buildTargetUrl: (context) => buildGuidePageUrl(context, "relay_5x5.html", "relay-5x5-v1"),
  },
  {
    id: "records-and-leaderboards-v1",
    pageId: "history",
    title: text("记录与排行榜", "Records and leaderboards"),
    description: text("本地历史、上传状态与筛选", "Local history, uploads, and filters"),
    buildSteps: () => [
      {
        title: text("本地和服务器是两份数据", "Local and server history are separate"),
        body: text("本地历史保存在浏览器中；账号历史和排行榜来自服务器，上传成功后才会在那里出现。", "Local history lives in this browser. Account history and leaderboards come from the server after a successful upload."),
      },
      {
        title: text("先确认上传状态", "Check upload status first"),
        body: text("上传成功后记录才会出现在账号历史和相应排行榜；等待上传或上传失败时，应先保留本地记录和导出文件。", "A record appears in account history and the relevant leaderboard only after a successful upload. Keep the local record and exported file while an upload is pending or failed."),
      },
      {
        title: text("筛选和指标只改变视图", "Filters and metrics change the view"),
        body: text("模式、指标、归属、关键词和排序只改变当前显示，不会修改或删除原始记录。", "Mode, metric, owner, keyword, and sort controls only change the current view; they do not modify or delete the original record."),
      },
      {
        title: text("导出与清空不是一回事", "Exporting and clearing are different"),
        body: text("导出全部会保留一份文件；清空全部不可恢复。打开回放或用户页面也不会改写原始成绩。", "Export All keeps a file copy; Clear All cannot be undone. Opening a replay or profile does not rewrite the original score."),
      },
    ],
    buildTargetUrl: (context) => buildGuidePageUrl(context, "history.html", "records-and-leaderboards-v1"),
  },
] as const;

export function getContextualGuideCatalog(): readonly ContextualGuideDefinition[] {
  return CONTEXTUAL_GUIDES;
}

export function getContextualGuideDefinition(
  id: string,
): ContextualGuideDefinition | null {
  return CONTEXTUAL_GUIDES.find((guide) => guide.id === id) || null;
}

export function buildContextualGuideUrl(baseUrl: string, guideId: string): string {
  return buildGuidePageUrl({ currentUrl: baseUrl }, baseUrl, guideId, true);
}

export function contextualGuideStorageKey(guideId: string): string {
  return `guide_seen_v1:${guideId}`;
}

export function hasContextualGuideBeenSeen(
  guideId: string,
  storageLike?: { getItem?(key: string): string | null } | null,
): boolean {
  return (
    safeReadStorageItem({
      storageLike,
      key: contextualGuideStorageKey(guideId),
    }) === "1"
  );
}

export function markContextualGuideSeen(
  guideId: string,
  storageLike?: { setItem?(key: string, value: string): void } | null,
): boolean {
  return safeSetStorageItem({
    storageLike,
    key: contextualGuideStorageKey(guideId),
    value: "1",
  });
}

export function shouldAutoOpenContextualGuide(input: {
  guideId: string;
  storageLike?: { getItem?(key: string): string | null } | null;
  isMatchingContext: boolean;
}): boolean {
  return input.isMatchingContext && !hasContextualGuideBeenSeen(input.guideId, input.storageLike);
}

function resolveTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  try {
    return document.querySelector<HTMLElement>(selector);
  } catch (_error) {
    return null;
  }
}

function positionCard(
  card: HTMLElement,
  targetRect: DOMRect | null,
): Placement {
  const cardRect = card.getBoundingClientRect();
  const maxLeft = Math.max(
    VIEWPORT_GUTTER,
    window.innerWidth - cardRect.width - VIEWPORT_GUTTER,
  );
  const left = targetRect
    ? clamp(
        targetRect.left + targetRect.width / 2 - cardRect.width / 2,
        VIEWPORT_GUTTER,
        maxLeft,
      )
    : clamp((window.innerWidth - cardRect.width) / 2, VIEWPORT_GUTTER, maxLeft);

  if (!targetRect) {
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round((window.innerHeight - cardRect.height) / 2)}px`;
    card.dataset.placement = "below";
    return "below";
  }

  const below = targetRect.bottom + TARGET_CARD_GAP;
  const above = targetRect.top - cardRect.height - TARGET_CARD_GAP;
  const canFitBelow =
    below + cardRect.height <= window.innerHeight - VIEWPORT_GUTTER;
  const canFitAbove = above >= VIEWPORT_GUTTER;
  const placement: Placement = canFitBelow || !canFitAbove ? "below" : "above";
  const preferredTop = placement === "below" ? below : above;
  const top = clamp(
    preferredTop,
    VIEWPORT_GUTTER,
    Math.max(
      VIEWPORT_GUTTER,
      window.innerHeight - cardRect.height - VIEWPORT_GUTTER,
    ),
  );

  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
  card.dataset.placement = placement;
  return placement;
}

export function openContextualGuide(
  options: ContextualGuideOptions,
): () => void {
  const steps = options.steps.filter(
    (step) => step && step.title && step.body,
  );
  if (
    steps.length === 0 ||
    document.querySelector(
      `.contextual-guide-root[data-contextual-guide-id="${options.id}"]`,
    )
  ) {
    return () => {};
  }

  const previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const previousOverflow = document.documentElement.style.overflow;
  let currentStep = 0;
  let closed = false;

  const root = createElement("div", "contextual-guide-root");
  root.dataset.contextualGuideId = options.id;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");

  const backdrop = createElement("div", "contextual-guide-backdrop");
  const spotlight = createElement("div", "contextual-guide-spotlight");
  const card = createElement("section", "contextual-guide-card");
  const header = createElement("div", "contextual-guide-header");
  const stepTile = createElement("span", "contextual-guide-step-tile");
  const kicker = createElement(
    "span",
    "contextual-guide-kicker",
    options.label,
  );
  const progressLabel = createElement(
    "span",
    "contextual-guide-progress-label",
  );
  const title = createElement("h2", "contextual-guide-title");
  const body = createElement("p", "contextual-guide-body");
  const route = createElement("div", "contextual-guide-route");
  const actions = createElement("div", "contextual-guide-actions");
  const skipButton = createElement("button", "contextual-guide-button is-skip");
  const previousButton = createElement("button", "contextual-guide-button");
  const nextButton = createElement(
    "button",
    "contextual-guide-button is-primary",
  );

  const titleId = `${options.id}-title`;
  const bodyId = `${options.id}-body`;
  title.id = titleId;
  body.id = bodyId;
  root.setAttribute("aria-labelledby", titleId);
  root.setAttribute("aria-describedby", bodyId);
  skipButton.type = "button";
  previousButton.type = "button";
  nextButton.type = "button";
  skipButton.textContent = isEnglish() ? "Skip" : "跳过";
  previousButton.textContent = isEnglish() ? "Back" : "上一步";

  const routeDots = steps.map(() => {
    const dot = createElement("span", "contextual-guide-route-dot");
    dot.setAttribute("aria-hidden", "true");
    route.appendChild(dot);
    return dot;
  });

  header.append(stepTile, kicker, progressLabel);
  actions.append(skipButton, previousButton, nextButton);
  card.append(header, title, body, route, actions);
  root.append(backdrop, spotlight, card);
  document.body.appendChild(root);
  document.documentElement.style.overflow = "hidden";

  function updatePosition(): void {
    if (closed) return;
    const target = resolveTarget(steps[currentStep].selector);
    const rect = target?.getBoundingClientRect() || null;
    if (rect && rect.width > 0 && rect.height > 0) {
      spotlight.hidden = false;
      spotlight.style.left = `${Math.round(rect.left - TARGET_PADDING)}px`;
      spotlight.style.top = `${Math.round(rect.top - TARGET_PADDING)}px`;
      spotlight.style.width = `${Math.round(rect.width + TARGET_PADDING * 2)}px`;
      spotlight.style.height = `${Math.round(rect.height + TARGET_PADDING * 2)}px`;
    } else {
      spotlight.hidden = true;
    }
    positionCard(card, rect);
  }

  function render(): void {
    const step = steps[currentStep];
    const target = resolveTarget(step.selector);
    target?.scrollIntoView({ block: "center", inline: "nearest" });
    stepTile.textContent = String(currentStep + 1);
    progressLabel.textContent = `${currentStep + 1} / ${steps.length}`;
    title.textContent = step.title;
    body.textContent = step.body;
    previousButton.disabled = currentStep === 0;
    nextButton.textContent =
      currentStep === steps.length - 1
        ? isEnglish()
          ? "Done"
          : "完成"
        : isEnglish()
          ? "Next"
          : "下一步";
    routeDots.forEach((dot, index) =>
      dot.classList.toggle("is-current", index === currentStep),
    );
    window.requestAnimationFrame(() => {
      updatePosition();
      nextButton.focus({ preventScroll: true });
    });
  }

  function close(): void {
    if (closed) return;
    closed = true;
    window.removeEventListener("resize", updatePosition);
    window.removeEventListener("scroll", updatePosition, true);
    document.removeEventListener("keydown", onKeyDown);
    root.remove();
    document.documentElement.style.overflow = previousOverflow;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    options.onClose?.();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [skipButton, previousButton, nextButton].filter(
      (button) => !button.disabled,
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  backdrop.addEventListener("click", close);
  skipButton.addEventListener("click", close);
  previousButton.addEventListener("click", () => {
    if (currentStep === 0) return;
    currentStep -= 1;
    render();
  });
  nextButton.addEventListener("click", () => {
    if (currentStep === steps.length - 1) {
      close();
      return;
    }
    currentStep += 1;
    render();
  });
  window.addEventListener("resize", updatePosition);
  window.addEventListener("scroll", updatePosition, true);
  document.addEventListener("keydown", onKeyDown);

  render();
  return close;
}

export interface StartContextualGuideOptions {
  guideId: string;
  context?: ContextualGuideContext | (() => ContextualGuideContext);
  autoOpen?: boolean;
  ready?: () => boolean;
  storageLike?: { getItem?(key: string): string | null; setItem?(key: string, value: string): void } | null;
}

function resolveGuideContext(
  context: ContextualGuideContext | (() => ContextualGuideContext) | undefined,
): ContextualGuideContext {
  if (typeof context === "function") {
    try {
      return context() || {};
    } catch (_error) {
      return {};
    }
  }
  return context || {};
}

function resolveGuideStorage(storageLike?: StartContextualGuideOptions["storageLike"]):
  | { getItem?(key: string): string | null; setItem?(key: string, value: string): void }
  | null {
  if (storageLike) return storageLike;
  if (typeof window === "undefined") return null;
  return resolveStorageByName({
    windowLike: window as unknown as Record<string, unknown>,
    storageName: "localStorage",
  });
}

export function openRegisteredContextualGuide(
  guideId: string,
  context: ContextualGuideContext = {},
  storageLike?: StartContextualGuideOptions["storageLike"],
): (() => void) | null {
  const definition = getContextualGuideDefinition(guideId);
  if (!definition || (definition.matches && !definition.matches(context))) return null;
  const english = isEnglish();
  const steps = definition.buildSteps(context).map((step) => ({
    selector: step.selector,
    title: localize(step.title, english),
    body: localize(step.body, english),
  }));
  return openContextualGuide({
    id: definition.id,
    label: localize(definition.title, english),
    steps,
    onClose: () => {
      markContextualGuideSeen(definition.id, resolveGuideStorage(storageLike));
    },
  });
}

function clearGuideQueryParameter(expectedGuideId: string): boolean {
  if (typeof window === "undefined" || !window.location || !window.history) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("guide") !== expectedGuideId) return false;
  params.delete("guide");
  const nextSearch = params.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
  );
  return true;
}

function scheduleGuideAttempt(
  run: () => void,
  ready?: () => boolean,
  attempts = 0,
): void {
  if (ready?.() || attempts >= 24) {
    run();
    return;
  }
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    run();
    return;
  }
  window.requestAnimationFrame(() => scheduleGuideAttempt(run, ready, attempts + 1));
}

export function startContextualGuide(
  options: StartContextualGuideOptions,
): void {
  const definition = getContextualGuideDefinition(options.guideId);
  if (!definition) return;
  const explicit = clearGuideQueryParameter(options.guideId);
  const storageLike = resolveGuideStorage(options.storageLike);
  const run = () => {
    const context = resolveGuideContext(options.context);
    if (definition.matches && !definition.matches(context)) return;
    if (
      !explicit &&
      (options.autoOpen === false || definition.autoOpen !== true ||
        !shouldAutoOpenContextualGuide({
          guideId: definition.id,
          storageLike,
          isMatchingContext: true,
        }))
    ) {
      return;
    }
    openRegisteredContextualGuide(definition.id, context, storageLike);
  };
  scheduleGuideAttempt(run, options.ready);
}
