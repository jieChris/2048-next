const ZH_CN_MESSAGES = {
  "app.name": "2048 NEXT",
  "privacy.eyebrow": "应用基底预览",
  "privacy.title": "开始之前",
  "privacy.previewBadge": "交互预览 · 正式隐私政策尚未生效",
  "privacy.body": "联网功能用于账号、云记录、排行榜与成就。游客标准 4×4 可完全离线游玩。",
  "privacy.noticeTitle": "当前只记录预览选择",
  "privacy.noticeBody": "正式版本会在政策正文获批后再次询问；本页不会发起业务请求或发送诊断信息。",
  "privacy.onlineAction": "预览联网入口",
  "privacy.offlineAction": "仅离线体验",
  "home.eyebrow": "2048 NEXT",
  "home.title": "今天继续一局",
  "home.offlineState": "仅离线",
  "home.onlineState": "联网预览",
  "home.emptyLabel": "你的棋盘",
  "home.emptyTitle": "还没有进行中的游戏",
  "home.emptyBody": "标准 4×4 可离线游玩；其他模式将在登录后开放。",
  "nav.home": "首页",
  "nav.modes": "模式",
  "nav.records": "记录",
  "nav.me": "我的"
} as const;

export type MessageKey = keyof typeof ZH_CN_MESSAGES;

const EN_MESSAGES: Record<MessageKey, string> = {
  "app.name": "2048 NEXT",
  "privacy.eyebrow": "APP FOUNDATION PREVIEW",
  "privacy.title": "Before you begin",
  "privacy.previewBadge": "INTERACTION PREVIEW · FORMAL PRIVACY POLICY NOT YET ACTIVE",
  "privacy.body":
    "Online features power your account, cloud history, leaderboards, and achievements. Guest Standard 4×4 works completely offline.",
  "privacy.noticeTitle": "This stores a preview choice only",
  "privacy.noticeBody":
    "The release will ask again after the policy text is approved. This screen sends no service requests or diagnostics.",
  "privacy.onlineAction": "Preview online entry",
  "privacy.offlineAction": "Continue offline",
  "home.eyebrow": "2048 NEXT",
  "home.title": "Continue a game today",
  "home.offlineState": "Offline only",
  "home.onlineState": "Online preview",
  "home.emptyLabel": "YOUR BOARD",
  "home.emptyTitle": "No game in progress yet",
  "home.emptyBody":
    "Standard 4×4 works offline. Other modes unlock after you sign in.",
  "nav.home": "Home",
  "nav.modes": "Modes",
  "nav.records": "Records",
  "nav.me": "Me"
};

export const APP_MESSAGES = {
  "zh-CN": ZH_CN_MESSAGES,
  en: EN_MESSAGES
} as const;

export type AppLocale = keyof typeof APP_MESSAGES;

export function resolveSystemLocale(
  languages: readonly string[] =
    typeof navigator === "undefined" ? [] : navigator.languages
): AppLocale {
  const primaryLanguage = languages[0]?.trim().toLowerCase() ?? "";
  return primaryLanguage === "en" || primaryLanguage.startsWith("en-")
    ? "en"
    : "zh-CN";
}

export function createTranslator(locale: AppLocale) {
  const messages = APP_MESSAGES[locale];
  return (key: MessageKey): string => messages[key];
}
