# 2048-next 重构管理计划

## 1) 范围与非目标
- 范围：在保持旧版行为稳定的前提下，逐步抽离出可测试、可演进的 TypeScript 核心引擎。
- 非目标：在 M1-M4 阶段不进行视觉改版，也不主动调整玩法规则。

## 2) 分支与发布策略
- 长期开发分支：`feature/core-shell`
- 旧仓维护分支：`legacy-maintenance`（仅用于 hotfix）
- 合并策略：每个里程碑仅在 smoke 验收通过后合并。
- 发布标签：
  - `baseline-legacy-import`（已存在）
  - 里程碑标签：`refactor-m1`、`refactor-m2`、...

## 3) 里程碑

### M1 - 基线与防护栏（进行中）
目标：
- 为旧版多入口页面建立自动化回归防护。

交付物：
- 覆盖 8 个页面的 Playwright smoke 测试。
- push/PR 自动触发 smoke 的 CI 工作流。
- 统一本地脚本（`npm run test:smoke`）。

验收标准：
- 8 个页面加载过程无运行时 JS 错误。
- 启动契约稳定：
  - 游戏页面暴露 `window.game_manager`
  - 游戏页面暴露 `window.__legacyEngine`
- CI smoke 任务持续为绿。

回滚策略：
- 仅回滚测试/CI 提交，不影响线上运行逻辑。

### M2 - 启动流程收敛（进行中）
目标：
- 去重入口脚本启动逻辑，统一 bootstrap 路径。

交付物：
- `src/bootstrap/*`：承载模式解析与启动装配逻辑。
- 入口脚本轻量化：仅保留组装与调用。
- 当前进展：
  - 新增共享启动壳：`js/legacy_bootstrap_runtime.js`
  - `application/play/capped/replay` 统一走 `LegacyBootstrapRuntime.startGameOnAnimationFrame`
  - 新增 `src/bootstrap/play-query.ts` + `js/core_play_query_runtime.js`，`play_application.js` 委托 `mode_key/challenge_id` 解析
  - 新增 `src/bootstrap/play-header.ts` + `js/core_play_header_runtime.js`，`play_application.js` 委托顶部模式简介文案拼装
  - 新增 `src/bootstrap/practice-mode.ts` + `js/core_practice_mode_runtime.js`，`application.js` 委托 `practice_ruleset` 解析与模式投影
  - 新增 `src/bootstrap/mode-catalog.ts` + `js/core_mode_catalog_runtime.js`，`application.js` 与 `play_application.js` 共享 `ModeCatalog` 回退解析
  - 新增 `src/bootstrap/home-mode.ts` + `js/core_home_mode_runtime.js`，`application.js` 委托首页/练习页模式解析与 practice 模式装配
  - 新增 `src/bootstrap/play-custom-spawn.ts` + `js/core_play_custom_spawn_runtime.js`，`play_application.js` 委托自定义 4 率解析、提示、URL 同步与配置投影
  - 新增 `src/bootstrap/undo-action.ts` + `js/core_undo_action_runtime.js`，`application.js` 与 `index_ui.js` 共享撤回触发与可用性判定
  - 新增 `src/bootstrap/practice-transfer.ts` + `js/core_practice_transfer_runtime.js`，`index_ui.js` 委托练习板直通模式配置组装
  - `practice-transfer` 已继续承接 `practice_guide_seen` 判定与练习板 URL 组装，`index_ui.js` 保留存储与跳转编排
  - `practice-transfer` 已承接练习板 token 与 payload 组装（含 board 深拷贝），`index_ui.js` 仅保留持久化与跳转流程
  - `practice-transfer` 已承接 payload 持久化回退（localStorage -> sessionStorage），`index_ui.js` 仅按结果选择直跳或 URL fallback
  - 新增 `src/bootstrap/home-guide.ts` + `js/core_home_guide_runtime.js`，`index_ui.js` 委托首页判定与新手指引自动触发 gate
  - `home-guide` 已继续承接首页指引步骤清单构建（含移动端提示步骤插入），`index_ui.js` 改为透传 viewport 信息
  - `home-guide` 已承接已读状态读写（`readHomeGuideSeenValue`/`markHomeGuideSeen`），`index_ui.js` 不再直接读写 `localStorage`
  - `legacy_bootstrap_runtime.resolveModeConfig` 现可优先委托 `CoreModeCatalogRuntime.resolveCatalogModeWithDefault`（缺失时自动回退原逻辑）

验收标准：
- 模式选择、开局流程、页面启动行为与旧版保持一致。
- smoke 测试持续为绿。

回滚策略：
- 按提交粒度回退到入口重构前状态。

### M3 - 纯核心抽离（进行中）
目标：
- 将 `js/game_manager.js` 中可确定性计算逻辑拆到 `src/core`。

交付物：
- move/merge/spawn/outcome 等核心规则模块化。
- pow2 与 fibonacci 路径具备单元测试基线。
- 当前进展：
  - `src/core/rules.ts` + `js/core_rules_runtime.js`（合并/出生/理论封顶等）
  - `src/core/mode.ts` + `js/core_mode_runtime.js`（模式归一化）
  - `src/core/special-rules.ts` + `js/core_special_rules_runtime.js`
  - `src/core/direction-lock.ts` + `js/core_direction_lock_runtime.js`
  - `src/core/grid-scan.ts` + `js/core_grid_scan_runtime.js`
  - `src/core/move-scan.ts` + `js/core_move_scan_runtime.js`
  - `src/core/move-path.ts` + `js/core_move_path_runtime.js`
  - `src/core/scoring.ts` + `js/core_scoring_runtime.js`
  - `src/core/merge-effects.ts` + `js/core_merge_effects_runtime.js`
  - `src/core/post-move.ts` + `js/core_post_move_runtime.js`
  - `src/core/move-apply.ts` + `js/core_move_apply_runtime.js`
  - `src/core/post-move-record.ts` + `js/core_post_move_record_runtime.js`
  - `src/core/post-undo-record.ts` + `js/core_post_undo_record_runtime.js`
  - `src/core/undo-restore.ts` + `js/core_undo_restore_runtime.js`
  - `src/core/undo-snapshot.ts` + `js/core_undo_snapshot_runtime.js`
  - `src/core/undo-tile-snapshot.ts` + `js/core_undo_tile_snapshot_runtime.js`
  - `src/core/undo-tile-restore.ts` + `js/core_undo_tile_restore_runtime.js`
  - `src/core/undo-restore-payload.ts` + `js/core_undo_restore_payload_runtime.js`
  - `src/core/undo-stack-entry.ts` + `js/core_undo_stack_entry_runtime.js`
  - 回放链路：
    - `src/core/replay-codec.ts` + `js/core_replay_codec_runtime.js`
    - `src/core/replay-v4-actions.ts` + `js/core_replay_v4_actions_runtime.js`
    - `src/core/replay-legacy.ts` + `js/core_replay_legacy_runtime.js`
    - `src/core/replay-import.ts` + `js/core_replay_import_runtime.js`
    - `src/core/replay-execution.ts` + `js/core_replay_execution_runtime.js`
    - `src/core/replay-dispatch.ts` + `js/core_replay_dispatch_runtime.js`
    - `src/core/replay-lifecycle.ts` + `js/core_replay_lifecycle_runtime.js`
    - `src/core/replay-timer.ts` + `js/core_replay_timer_runtime.js`
    - `src/core/replay-flow.ts` + `js/core_replay_flow_runtime.js`
    - `src/core/replay-control.ts` + `js/core_replay_control_runtime.js`
    - `src/core/replay-loop.ts` + `js/core_replay_loop_runtime.js`

验收标准：
- 黄金向量下棋盘状态、分数、胜负状态与旧版一致。
- smoke 绿、unit 绿。

回滚策略：
- 保留 legacy 路径可调用，按模块提交回退。

### M4 - 适配层替换（进行中）
目标：
- 通过 adapter 接入 typed core，同时保持现有 UI 与存储契约不变。

交付物：
- 输入、渲染、持久化映射到新核心的适配层。
- A/B 与回滚开关。
- 当前进展：
  - `src/bridge/adapter-mode.ts` + `js/legacy_adapter_runtime.js`
  - `legacy_bootstrap_runtime` 可通过 `LegacyAdapterRuntime.attachLegacyBridgeWithAdapter` 挂桥
  - `adapterMode` 元数据接入 `__legacyEngine`
  - 修复桥接参数顺序，确保 `__legacyEngine.manager === window.game_manager`
  - `src/bridge/adapter-io.ts` + `js/legacy_adapter_io_runtime.js`，接入快照读写与 move-result 事件
  - `src/bridge/adapter-shadow.ts` + `js/core_adapter_shadow_runtime.js`，接入 shadow parity 统计
  - session parity report / A-B diff summary 可读、可持久化、可随提交上报
  - `history.html` 已支持 parity 诊断展示、筛选与导出
  - `LocalHistoryStore` 支持 parity 过滤与 burn-in 统计
  - canary 策略面板上线（默认 core、强制 legacy、解除回滚、重置基线）
  - burn-in gate 已支持 sustained window 判定
  - `src/bridge/burnin-gate.ts` + `js/core_burnin_gate_runtime.js` 抽离完成
  - play 页自定义 4 率抽离：`src/bootstrap/custom-spawn.ts` + `js/core_custom_spawn_runtime.js`
  - `GameManager.setup` 优先使用预加载 `window.GAME_MODE_CONFIG`，确保 bootstrap 注入模式首帧生效

验收标准：
- 关键指标（分数、胜负、封顶行为）会话级一致。
- smoke 绿、unit 绿。

回滚策略：
- 通过 adapter 策略开关快速切回 legacy。

### M5 - 切换与收口（待完成）
目标：
- 默认启用新核心路径，清理重复代码，形成稳定发布。

交付物：
- 死代码清理。
- 文档与运行手册更新。
- burn-in 结束后打稳定 tag。

验收标准：
- burn-in 窗口内无 P0 回归。

回滚策略：
- 按发布 tag 回退到 legacy 路径。

## 4) 风险清单
- R1：拆分 `game_manager` 导致行为漂移。
  - 缓解：先建 golden vector + smoke 基线，再分步抽离。
- R2：JS/TS 双实现漂移。
  - 缓解：运行时镜像保持薄层，后续逐步收敛为单源。
- R3：多入口页面启动逻辑再次分叉。
  - 缓解：M2 持续收敛 + smoke 契约化。

## 5) 每个 PR 的质量门禁
- Gate 1：`npm run test:smoke` 通过。
- Gate 2：无未计划的玩法规则变更。
- Gate 3：PR 描述中明确可回滚路径。

## 6) 立即执行项
1. 优先执行一键门禁：`npm run verify:refactor`（串行执行 unit/smoke/build）。
2. 继续削减入口脚本中的重复拼装逻辑，优先抽到 `src/bootstrap/*`。
3. 按 M5 执行 burn-in：设置 `engine_adapter_default_mode=core-adapter`，持续监控历史页 gate，并保留 `engine_adapter_force_legacy=1` 作为紧急回滚开关。
