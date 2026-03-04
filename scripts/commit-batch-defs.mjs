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
        "modes.html",
        "capped_2048.html",
        "undo_2048.html",
        "Practice_board.html",
        "js/core_index_ui_runtime_contract_runtime.js",
        "js/html_actuator.js",
        "js/index_ui.js",
        "js/local_score_manager.js",
        "js/replay_ui.js",
        "js/test_ui.js",
        "style/main.css",
        "style/main.scss",
        "src/core/replay-execution.ts",
        "src/bridge/adapter-shadow.ts"
      ].includes(file) ||
      /^src\/bootstrap\/(index-ui-page-actions-host|index-ui-runtime-contract|settings-modal-host|settings-modal-page-host)\.ts$/u.test(
        file
      ) ||
      /^src\/bootstrap\/index-ui-page-host\.ts$/u.test(file) ||
      /^js\/core_(index_ui_page_actions_host|settings_modal_host|settings_modal_page_host)_runtime\.js$/u.test(
        file
      ) ||
      /^js\/core_index_ui_page_host_runtime\.js$/u.test(file) ||
      /^js\/core_replay_(execution|export|lifecycle)_runtime\.js$/u.test(file) ||
      /^tests\/smoke\/history-.*\.smoke\.spec\.ts$/u.test(file) ||
      /^tests\/smoke\/index-ui-.*\.smoke\.spec\.ts$/u.test(file) ||
      /^tests\/smoke\/pages-adapter-rollout\.smoke\.spec\.ts$/u.test(file) ||
      /^tests\/smoke\/pages-replay-import\.smoke\.spec\.ts$/u.test(file) ||
      /^tests\/smoke\/pages-(announcement-settings|history-adapter-diagnostics|play-modes|replay-runtime)\.smoke\.spec\.ts$/u.test(
        file
      ) ||
      /^tests\/unit\/bootstrap-history-.*\.spec\.ts$/u.test(file) ||
      /^tests\/unit\/bootstrap-(index-ui-page-actions-host|index-ui-page-host|index-ui-runtime-contract|settings-modal-host|settings-modal-page-host)\.spec\.ts$/u.test(
        file
      ) ||
      /^tests\/unit\/bridge-adapter-shadow\.spec\.ts$/u.test(file) ||
      /^tests\/unit\/core-replay-execution\.spec\.ts$/u.test(file)
  },
  "4": {
    name: "batch-4-release-tooling",
    match: (file) =>
      [
        ".gitignore",
        ".github/workflows/smoke.yml",
        "playwright.config.ts",
        "package.json",
        "scripts/refactor-gate.mjs",
        "scripts/release-readiness-check.mjs",
        "scripts/refactor-progress-report.mjs",
        "scripts/burnin-log-report.mjs",
        "scripts/burnin-log-daily.mjs",
        "scripts/burnin-seed-json.mjs",
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
      ].includes(file) ||
      /^docs\/BURNIN_EXECUTION_LOG_\d{4}-\d{2}\.zh-CN\.md$/u.test(file)
  }
};

export const BATCHES = Object.values(BATCH_DEFS);
