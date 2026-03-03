export const BATCH_DEFS = {
  "1": {
    name: "batch-1-game-manager",
    match: (file) =>
      file === "scripts/game-manager-audit.mjs" ||
      file === "js/core_game_manager_bindings_runtime.js" ||
      file === "js/core_game_manager_common_runtime.js" ||
      /^js\/core_game_manager_.*_runtime\.js$/u.test(file)
  },
  "2": {
    name: "batch-2-history-runtime",
    match: (file) =>
      file === "history.html" ||
      /^src\/bootstrap\/history-.*\.ts$/u.test(file) ||
      /^js\/core_history_.*_runtime\.js$/u.test(file)
  },
  "3": {
    name: "batch-3-pages-tests",
    match: (file) =>
      [
        "index.html",
        "play.html",
        "replay.html",
        "capped_2048.html",
        "undo_2048.html",
        "Practice_board.html"
      ].includes(file) ||
      /^tests\/smoke\/history-.*\.smoke\.spec\.ts$/u.test(file) ||
      /^tests\/smoke\/pages-(announcement-settings|history-adapter-diagnostics|replay-runtime)\.smoke\.spec\.ts$/u.test(
        file
      ) ||
      /^tests\/unit\/bootstrap-history-.*\.spec\.ts$/u.test(file)
  },
  "4": {
    name: "batch-4-release-tooling",
    match: (file) =>
      [
        ".github/workflows/smoke.yml",
        "playwright.config.ts",
        "package.json",
        "scripts/refactor-gate.mjs",
        "scripts/release-readiness-check.mjs",
        "scripts/refactor-progress-report.mjs",
        "scripts/refactor-closure-audit.mjs",
        "scripts/commit-split-check.mjs",
        "scripts/stage-commit-batch.mjs",
        "scripts/commit-batch-defs.mjs",
        "REFACTOR_MANAGEMENT_PLAN.md",
        "docs/BURNIN_CUTOVER_RUNBOOK.zh-CN.md",
        "docs/BURNIN_EXECUTION_LOG_TEMPLATE.zh-CN.md",
        "docs/RELEASE_CUTOVER_CHECKLIST.zh-CN.md",
        "docs/COMMIT_SPLIT_PLAN.zh-CN.md",
        "docs/REFACTOR_PROGRESS_LOG.zh-CN.md"
      ].includes(file)
  }
};

export const BATCHES = Object.values(BATCH_DEFS);
