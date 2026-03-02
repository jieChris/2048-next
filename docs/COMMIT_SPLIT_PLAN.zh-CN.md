# 提交拆分执行清单（当前工作区）

## 目标
- 把当前大工作区拆成可回滚的小批次提交。
- 每个提交只覆盖一个主题，降低回归排查成本。
- 不执行 `git push -u origin feature/core-shell`。

## 提交顺序（建议 4 批）

### 批次 1：`game_manager` 壳化与 helper 拆分
范围：`game_manager` 相关 runtime helper 与审计脚本。

```bash
git add \
  js/core_game_manager_bindings_runtime.js \
  js/core_game_manager_common_runtime.js \
  js/core_game_manager_base_helpers_runtime.js \
  js/core_game_manager_env_helpers_runtime.js \
  js/core_game_manager_mode_rules_helpers_runtime.js \
  js/core_game_manager_move_input_helpers_runtime.js \
  js/core_game_manager_panel_timer_helpers_runtime.js \
  js/core_game_manager_replay_helpers_runtime.js \
  js/core_game_manager_restart_setup_helpers_runtime.js \
  js/core_game_manager_runtime_accessor_helpers_runtime.js \
  js/core_game_manager_runtime_call_helpers_runtime.js \
  js/core_game_manager_saved_state_helpers_runtime.js \
  js/core_game_manager_session_init_helpers_runtime.js \
  js/core_game_manager_setup_timer_ui_helpers_runtime.js \
  js/core_game_manager_stats_display_helpers_runtime.js \
  js/core_game_manager_stats_ui_helpers_runtime.js \
  js/core_game_manager_undo_stats_helpers_runtime.js \
  scripts/game-manager-audit.mjs
```

建议提交信息：
```text
refactor(game-manager): split runtime helpers and keep shell contract stable
```

提交前建议检查：
```bash
npm run audit:game-manager
npm run test:unit:core
```

### 批次 2：history host/runtime 委托收口
范围：`src/bootstrap/history-*` + 对应 `js/core_history_*` + `history.html`。

```bash
git add \
  history.html \
  src/bootstrap/history-adapter-diagnostics.ts \
  src/bootstrap/history-burnin.ts \
  src/bootstrap/history-canary-host.ts \
  src/bootstrap/history-canary-policy.ts \
  src/bootstrap/history-canary-storage.ts \
  src/bootstrap/history-canary-view.ts \
  src/bootstrap/history-controls-host.ts \
  src/bootstrap/history-filter-host.ts \
  src/bootstrap/history-load-entry-host.ts \
  src/bootstrap/history-load.ts \
  src/bootstrap/history-page-host.ts \
  src/bootstrap/history-query.ts \
  src/bootstrap/history-runtime-contract.ts \
  src/bootstrap/history-startup-host.ts \
  src/bootstrap/history-toolbar-events.ts \
  js/core_history_adapter_diagnostics_runtime.js \
  js/core_history_burnin_runtime.js \
  js/core_history_canary_host_runtime.js \
  js/core_history_canary_policy_runtime.js \
  js/core_history_canary_storage_runtime.js \
  js/core_history_canary_view_runtime.js \
  js/core_history_controls_host_runtime.js \
  js/core_history_filter_host_runtime.js \
  js/core_history_load_entry_host_runtime.js \
  js/core_history_load_runtime.js \
  js/core_history_page_host_runtime.js \
  js/core_history_query_runtime.js \
  js/core_history_runtime_contract_runtime.js \
  js/core_history_startup_host_runtime.js \
  js/core_history_toolbar_events_runtime.js
```

建议提交信息：
```text
refactor(history): converge host/runtime delegation and burn-in/canary contracts
```

提交前建议检查：
```bash
npm run test:unit
npm run test:smoke:burnin
npm run test:smoke:canary
```
注意：
- `test:smoke:burnin` 与 `test:smoke:canary` 请串行执行，避免同时占用 `4173` 端口。

### 批次 3：多页面接线与 smoke/unit 同步
范围：多页面 HTML 接线、smoke 与 unit 契约更新。

```bash
git add \
  index.html play.html replay.html capped_2048.html undo_2048.html Practice_board.html \
  tests/smoke/history-burnin-readiness.smoke.spec.ts \
  tests/smoke/history-burnin-runtime.smoke.spec.ts \
  tests/smoke/history-core-host-controls.smoke.spec.ts \
  tests/smoke/history-core-load.smoke.spec.ts \
  tests/smoke/pages-announcement-settings.smoke.spec.ts \
  tests/smoke/pages-history-adapter-diagnostics.smoke.spec.ts \
  tests/smoke/pages-replay-runtime.smoke.spec.ts \
  tests/unit/bootstrap-history-adapter-diagnostics.spec.ts \
  tests/unit/bootstrap-history-burnin.spec.ts \
  tests/unit/bootstrap-history-canary-host.spec.ts \
  tests/unit/bootstrap-history-canary-policy.spec.ts \
  tests/unit/bootstrap-history-canary-storage.spec.ts \
  tests/unit/bootstrap-history-canary-view.spec.ts \
  tests/unit/bootstrap-history-controls-host.spec.ts \
  tests/unit/bootstrap-history-filter-host.spec.ts \
  tests/unit/bootstrap-history-load-entry-host.spec.ts \
  tests/unit/bootstrap-history-load.spec.ts \
  tests/unit/bootstrap-history-page-host.spec.ts \
  tests/unit/bootstrap-history-query.spec.ts \
  tests/unit/bootstrap-history-runtime-contract.spec.ts \
  tests/unit/bootstrap-history-startup-host.spec.ts \
  tests/unit/bootstrap-history-toolbar-events.spec.ts
```

建议提交信息：
```text
test(smoke): align history/page contracts after runtime delegation
```

提交前建议检查：
```bash
npm run verify:iterate
```

### 批次 4：发布收口工具链与文档
范围：门禁脚本、CI、发布与执行文档、计划更新。

```bash
git add \
  .github/workflows/smoke.yml \
  playwright.config.ts \
  package.json \
  scripts/refactor-gate.mjs \
  scripts/release-readiness-check.mjs \
  scripts/refactor-progress-report.mjs \
  scripts/commit-split-check.mjs \
  scripts/stage-commit-batch.mjs \
  scripts/commit-batch-defs.mjs \
  REFACTOR_MANAGEMENT_PLAN.md \
  docs/BURNIN_CUTOVER_RUNBOOK.zh-CN.md \
  docs/BURNIN_EXECUTION_LOG_TEMPLATE.zh-CN.md \
  docs/RELEASE_CUTOVER_CHECKLIST.zh-CN.md \
  docs/COMMIT_SPLIT_PLAN.zh-CN.md
```

建议提交信息：
```text
chore(release): add release gates rollback drill and progress reporting
```

提交前建议检查：
```bash
npm run verify:release
```

## 执行提示
- 一键检查当前改动是否都能归入 4 批提交：
```bash
npm run report:commit-split-check
```
- 预览某一批会命中的文件（示例：批次 1）：
```bash
npm run report:commit-batch -- --batch=1
```
- 直接暂存某一批（示例：批次 1）：
```bash
npm run report:commit-batch -- --batch=1 --stage
```
- 最终提交前可一键执行：
```bash
npm run verify:submit-ready
```
- 每批提交后执行一次：
```bash
git status --short
```
- 若 `git commit` 被 VS Code editor pipe 问题阻塞，使用：
```bash
git commit -m "<你的提交信息>"
```
- 若某批次需要回退暂存（不改动文件）：
```bash
git restore --staged <file>
```
- Playwright smoke 命令不要并行跑（同一台机器同端口会冲突）。
- 如需并行开第二组 smoke，可改端口执行（bash）：
```bash
PW_WEB_PORT=4174 npm run test:smoke:canary
```
