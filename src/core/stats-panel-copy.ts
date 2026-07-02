export type StatsPanelLanguage = "en" | "zh";

export interface StatsPanelLanguageSources {
  i18nLanguage?: unknown;
  storageLanguage?: unknown;
  documentLanguage?: unknown;
}

export interface StatsPanelCopy {
  button: string;
  title: string;
  totalSteps: string;
  moveSteps: string;
  undoSteps: string;
  primarySpawns: string;
  secondarySpawns: string;
  secondaryRate: string;
  close: string;
}

export interface StatsPanelCopyRuntime {
  resolveStatsPanelCopy: typeof resolveStatsPanelCopy;
  resolveStatsPanelLanguage: typeof resolveStatsPanelLanguage;
}

export interface StatsPanelCopyWindowLike {
  CoreStatsPanelCopyRuntime?: StatsPanelCopyRuntime;
}

export interface StatsPanelCopyRuntimeInstallOptions {
  windowLike?: StatsPanelCopyWindowLike | null;
}

const EN_COPY: StatsPanelCopy = {
  button: "Stats",
  title: "Stats Summary",
  totalSteps: "Total Actions",
  moveSteps: "Effective Moves",
  undoSteps: "Undo Count",
  primarySpawns: "2 Spawns",
  secondarySpawns: "4 Spawns",
  secondaryRate: "Actual 4-Rate",
  close: "Close"
};

const ZH_COPY: StatsPanelCopy = {
  button: "统计",
  title: "统计汇总",
  totalSteps: "总操作数",
  moveSteps: "有效移动数",
  undoSteps: "撤回次数",
  primarySpawns: "出2数量",
  secondarySpawns: "出4数量",
  secondaryRate: "实际出4率",
  close: "关闭"
};

function normalizeStatsPanelLanguage(value: unknown): StatsPanelLanguage | "" {
  const lang = String(value || "").trim().toLowerCase();
  if (lang.indexOf("en") === 0) return "en";
  if (lang.indexOf("zh") === 0) return "zh";
  return "";
}

export function resolveStatsPanelLanguage(sources: StatsPanelLanguageSources = {}): StatsPanelLanguage {
  return (
    normalizeStatsPanelLanguage(sources.i18nLanguage) ||
    normalizeStatsPanelLanguage(sources.storageLanguage) ||
    normalizeStatsPanelLanguage(sources.documentLanguage) ||
    "zh"
  );
}

export function resolveStatsPanelCopy(lang: unknown): StatsPanelCopy {
  return { ...(normalizeStatsPanelLanguage(lang) === "en" ? EN_COPY : ZH_COPY) };
}

export function createStatsPanelCopyRuntime(): StatsPanelCopyRuntime {
  return {
    resolveStatsPanelCopy,
    resolveStatsPanelLanguage
  };
}

export function installStatsPanelCopyRuntime(
  options: StatsPanelCopyRuntimeInstallOptions = {}
): StatsPanelCopyRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as StatsPanelCopyWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreStatsPanelCopyRuntime) {
    target.CoreStatsPanelCopyRuntime = createStatsPanelCopyRuntime();
  }
  return target.CoreStatsPanelCopyRuntime;
}
