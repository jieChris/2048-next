type UnlockVariant =
  | "codepen"
  | "codepen-milestone"
  | "codepen-reward"
  | "jesse-glacken"
  | "trophy"
  | "react-trophies"
  | "engine"
  | "notyf"
  | "playdate"
  | "react-achievements"
  | "sonner"
  | "react-hot-toast"
  | "izitoast"
  | "toastify-js"
  | "sweetalert2"
  | "noty"
  | "push-js"
  | "react-toastify"
  | "toastup";

interface UnlockDemo {
  id: UnlockVariant;
  buttonTitle: string;
  buttonHint: string;
  buttonIcon: string;
  title: string;
  name: string;
  description: string;
  badge: string;
  durationMs?: number;
  progress?: { current: number; target: number };
  sourceNote?: string;
  sparkCount?: number;
}

const DEMOS: UnlockDemo[] = [
  {
    id: "codepen",
    buttonTitle: "TigerDX 成就",
    buttonHint: "单个成就解锁",
    buttonIcon: "CP",
    title: "Achievement Unlocked",
    name: "2048 达成",
    description: "首次合成 2048，已点亮里程碑成就。",
    badge: "2048",
    sparkCount: 10
  },
  {
    id: "codepen-milestone",
    buttonTitle: "TigerDX 里程碑",
    buttonHint: "阶段进度推进",
    buttonIcon: "MS",
    title: "Milestone Progress",
    name: "4096 里程碑",
    description: "第 3 / 10 次达成",
    badge: "4096",
    progress: { current: 3, target: 10 },
    sparkCount: 6
  },
  {
    id: "codepen-reward",
    buttonTitle: "TigerDX 奖励",
    buttonHint: "获得奖励提示",
    buttonIcon: "RW",
    title: "Reward Claimed",
    name: "限定头像框",
    description: "活动第一名奖励已到账",
    badge: "冠",
    sparkCount: 12
  },
  {
    id: "jesse-glacken",
    buttonTitle: "Jesse Glacken CodePen",
    buttonHint: "Xbox 胶囊横幅展开",
    buttonIcon: "JG",
    title: "Achievement unlocked",
    name: "25G - Exercised self-restraint",
    description: "",
    badge: "🏆",
    durationMs: 5200
  },
  {
    id: "trophy",
    buttonTitle: "Trophy UI Kit",
    buttonHint: "Achievement Unlocked 弹窗",
    buttonIcon: "UI",
    title: "Earned 6 Jul 2026",
    name: "Task Champion",
    description: "Complete a task 30 days in a row. Congratulations!!",
    badge: "🏆",
    sparkCount: 6
  },
  {
    id: "react-trophies",
    buttonTitle: "react-trophies",
    buttonHint: "Sonner custom toast 内容",
    buttonIcon: "RT",
    title: "Achievement Unlocked!",
    name: "连锁合成",
    description: "单局完成 10 次连续合成。",
    badge: "🏆",
    sparkCount: 8
  },
  {
    id: "engine",
    buttonTitle: "achievements-engine",
    buttonHint: "非 UI 库：只发解锁事件",
    buttonIcon: "{}",
    title: "UI not included",
    name: "achievement:unlocked",
    description: "该项目是 framework-agnostic 规则引擎；真实弹窗需要业务 UI 自己实现。",
    badge: "{}",
    sourceNote: "engine.on('achievement:unlocked', handler)"
  },
  {
    id: "notyf",
    buttonTitle: "Notyf",
    buttonHint: "官方 success toast + ripple",
    buttonIcon: "OK",
    title: "",
    name: "Your achievement has been unlocked!",
    description: "",
    badge: "✓"
  },
  {
    id: "playdate",
    buttonTitle: "pd-achievements",
    buttonHint: "Playdate OS 风格 toast",
    buttonIcon: "PD",
    title: "Achievement unlocked!",
    name: "Mini Master",
    description: "Clear a board without undo.",
    badge: "★"
  },
  {
    id: "react-achievements",
    buttonTitle: "react-achievements",
    buttonHint: "内置 gamified notification",
    buttonIcon: "RA",
    title: "Achievement Unlocked!",
    name: "65536 挑战者",
    description: "高分挑战成就已加入个人资料。",
    badge: "⭐",
    sparkCount: 10
  },
  {
    id: "sonner",
    buttonTitle: "Sonner",
    buttonHint: "参考风格：极简 stack toast",
    buttonIcon: "SO",
    title: "Achievement",
    name: "2048 Unlocked",
    description: "Milestone saved to your medal wall.",
    badge: "✓"
  },
  {
    id: "react-hot-toast",
    buttonTitle: "React Hot Toast",
    buttonHint: "参考风格：产品级 custom toast",
    buttonIcon: "HT",
    title: "Achievement unlocked",
    name: "Combo Builder",
    description: "A clean JSX-style completion toast.",
    badge: "🔥"
  },
  {
    id: "izitoast",
    buttonTitle: "iziToast",
    buttonHint: "参考风格：强 UI / 进度条",
    buttonIcon: "IZ",
    title: "Success",
    name: "New Achievement",
    description: "2048 milestone completed.",
    badge: "★"
  },
  {
    id: "toastify-js",
    buttonTitle: "Toastify JS",
    buttonHint: "参考风格：原生渐变条",
    buttonIcon: "TJ",
    title: "",
    name: "Achievement unlocked",
    description: "Vanilla toast style, easy to embed.",
    badge: "⚡"
  },
  {
    id: "sweetalert2",
    buttonTitle: "SweetAlert2",
    buttonHint: "参考风格：奖励弹窗",
    buttonIcon: "SA",
    title: "Legendary Achievement",
    name: "65536 Challenger",
    description: "Rare milestone completed. Reward claimed.",
    badge: "🏆",
    sparkCount: 8
  },
  {
    id: "noty",
    buttonTitle: "Noty",
    buttonHint: "参考风格：队列通知",
    buttonIcon: "NY",
    title: "Achievement queue",
    name: "Chain Merge",
    description: "Queued notification style for multiple unlocks.",
    badge: "◆"
  },
  {
    id: "push-js",
    buttonTitle: "Push.js",
    buttonHint: "参考风格：系统通知",
    buttonIcon: "PS",
    title: "2048 Next",
    name: "Achievement unlocked",
    description: "Background-style browser notification preview.",
    badge: "🔔"
  },
  {
    id: "react-toastify",
    buttonTitle: "react-toastify",
    buttonHint: "参考风格：React toast",
    buttonIcon: "TF",
    title: "Achievement Unlocked",
    name: "Rare Tile",
    description: "Queue-ready toast with progress bar.",
    badge: "✓"
  },
  {
    id: "toastup",
    buttonTitle: "toastup",
    buttonHint: "参考风格：游戏化 UI",
    buttonIcon: "TU",
    title: "Level reward",
    name: "Epic Merge",
    description: "Game-style toast with glow and bounce.",
    badge: "✦",
    sparkCount: 10
  }
];

const TOAST_DURATION_MS = 3600;
let cleanupTimer = 0;
let toastGeneration = 0;

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className = "",
  text = ""
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function mountButtons(): void {
  const buttons = document.getElementById("unlock-showcase-buttons");
  if (!buttons) return;

  for (const demo of DEMOS) {
    const button = createElement("button", "unlock-source-button");
    button.type = "button";
    button.dataset.variant = demo.id;

    const icon = createElement("span", "unlock-source-icon", demo.buttonIcon);
    const copy = createElement("span", "unlock-source-copy");
    copy.append(createElement("strong", "", demo.buttonTitle));
    copy.append(createElement("span", "", demo.buttonHint));
    button.append(icon, copy);
    button.addEventListener("click", () => showToast(demo));
    buttons.append(button);
  }
}

function createToast(demo: UnlockDemo): HTMLElement {
  if (demo.id === "jesse-glacken") return createJesseGlackenToast(demo);

  const toast = createElement("article", getToastClassName(demo));
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-label", `${demo.buttonTitle} 成就完成提示`);

  const card = createElement("div", "unlock-toast-card");
  const badge = createElement("span", "unlock-badge", demo.badge);
  const content = createElement("div", "unlock-toast-content");
  if (demo.title) content.append(createElement("p", "unlock-toast-title", demo.title));
  content.append(createElement("h2", "unlock-toast-name", demo.name));
  if (demo.description) content.append(createElement("p", "unlock-toast-desc", demo.description));
  if (demo.progress) {
    const progress = createElement("span", "unlock-codepen-progress");
    const bar = createElement("span");
    bar.style.width = `${Math.min(100, Math.max(0, (demo.progress.current / demo.progress.target) * 100))}%`;
    progress.append(bar);
    content.append(progress);
  }
  if (demo.sourceNote) content.append(createElement("code", "unlock-toast-code", demo.sourceNote));
  if (demo.id === "trophy") {
    const actions = createElement("div", "unlock-toast-actions");
    actions.append(createElement("span", "unlock-toast-action", "Share"));
    actions.append(createElement("span", "unlock-toast-action unlock-toast-action-primary", "Awesome!"));
    content.append(actions);
  }
  if (demo.id === "notyf") {
    card.append(createElement("span", "unlock-notyf-ripple"));
  }
  card.append(badge, content);
  toast.append(card);
  addSparks(toast, demo.sparkCount || 0);
  return toast;
}

function getToastClassName(demo: UnlockDemo): string {
  if (demo.id === "codepen-milestone" || demo.id === "codepen-reward") {
    return `unlock-toast unlock-toast--codepen unlock-toast--${demo.id}`;
  }
  return `unlock-toast unlock-toast--${demo.id}`;
}

function createJesseGlackenToast(demo: UnlockDemo): HTMLElement {
  const toast = createElement("article", "unlock-toast unlock-toast--jesse-glacken");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-label", `${demo.buttonTitle} 成就完成提示`);

  const banner = createElement("div", "unlock-jesse-banner");
  const icon = createElement("div", "unlock-jesse-icon");
  const iconInner = createElement("span", "unlock-jesse-icon-inner");
  iconInner.append(createElement("span", "unlock-jesse-trophy-mark", demo.badge));
  icon.append(iconInner);

  const text = createElement("div", "unlock-jesse-text");
  text.append(createElement("p", "unlock-jesse-notification", demo.title));
  text.append(createElement("p", "unlock-jesse-name", demo.name));

  banner.append(icon, text);
  toast.append(banner);
  return toast;
}

function addSparks(toast: HTMLElement, count: number): void {
  for (let index = 1; index <= count; index += 1) {
    toast.append(createElement("span", `unlock-spark unlock-spark--${index}`));
  }
}

function showToast(demo: UnlockDemo): void {
  const host = document.getElementById("unlock-toast-host");
  if (!host) return;
  const generation = (toastGeneration += 1);
  window.clearTimeout(cleanupTimer);
  host.replaceChildren(createToast(demo));
  cleanupTimer = window.setTimeout(() => {
    if (generation === toastGeneration) host.replaceChildren();
  }, demo.durationMs || TOAST_DURATION_MS);
}

mountButtons();
