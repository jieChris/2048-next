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
    name: "batch-2-history-core",
    match: (file) =>
      file === "history.html" ||
      file === "js/history_page.js" ||
      file === "js/local_history_store.js" ||
      file === "js/refactor_cutover_migration.js" ||
      file === "tests/unit/refactor-cutover-migration.spec.ts"
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
        "src/core/replay-execution.ts"
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
      /^tests\/smoke\/history-records-.*\.smoke\.spec\.ts$/u.test(file) ||
      /^tests\/smoke\/index-ui-.*\.smoke\.spec\.ts$/u.test(file) ||
      /^tests\/smoke\/pages-replay-import\.smoke\.spec\.ts$/u.test(file) ||
      /^tests\/smoke\/pages-(announcement-settings|play-modes|replay-runtime)\.smoke\.spec\.ts$/u.test(
        file
      ) ||
      /^tests\/unit\/bootstrap-(index-ui-page-actions-host|index-ui-page-host|index-ui-runtime-contract|settings-modal-host|settings-modal-page-host)\.spec\.ts$/u.test(
        file
      ) ||
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
        "scripts/refactor-closure-audit.mjs",
        "scripts/commit-split-check.mjs",
        "scripts/stage-commit-batch.mjs",
        "scripts/commit-batch-defs.mjs",
        "REFACTOR_MANAGEMENT_PLAN.md",
        "docs/RELEASE_STABLE_CHECKLIST.zh-CN.md",
        "docs/COMMIT_SPLIT_PLAN.zh-CN.md",
        "docs/REFACTOR_PROGRESS_LOG.zh-CN.md"
      ].includes(file) ||
      /^docs\/archive\/BURNIN_EXECUTION_LOG_\d{4}-\d{2}\.zh-CN\.md$/u.test(file)
  }
};

export const BATCHES = Object.values(BATCH_DEFS);
