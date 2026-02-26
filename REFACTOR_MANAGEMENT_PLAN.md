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
  - 新增 `src/bootstrap/simple-runtime-contract.ts` + `js/core_simple_runtime_contract_runtime.js`，`replay/capped` 入口委托通用 bootstrap 依赖契约校验
  - 新增 `src/bootstrap/simple-startup.ts` + `js/core_simple_startup_runtime.js`，`replay/capped` 入口委托固定模式启动 payload 组装
  - `application/play/capped/replay` 统一走 `LegacyBootstrapRuntime.startGameOnAnimationFrame`
  - 新增 `src/bootstrap/play-query.ts` + `js/core_play_query_runtime.js`，`play_application.js` 委托 `mode_key/challenge_id` 解析
  - 新增 `src/bootstrap/play-custom-spawn-host.ts` + `js/core_play_custom_spawn_host_runtime.js`，`play_application.js` 委托自定义 4 率桥接上下文（storage/prompt/alert/url replace）组装
  - 新增 `src/bootstrap/play-entry.ts` + `js/core_play_entry_runtime.js`，`play_application.js` 委托 play 页入口解析、模式回退与 challenge 上下文决策
  - 新增 `src/bootstrap/play-challenge-intro.ts` + `js/core_play_challenge_intro_runtime.js`，`play_application.js` 委托挑战简介显示模型（当前默认关闭，行为不变）
  - 新增 `src/bootstrap/play-challenge-intro-ui.ts` + `js/core_play_challenge_intro_ui_runtime.js`，`play_application.js` 委托挑战简介弹层展示态与绑定去重决策
  - 新增 `src/bootstrap/play-challenge-intro-action.ts` + `js/core_play_challenge_intro_action_runtime.js`，`play_application.js` 委托挑战简介弹层开关动作状态决策
  - 新增 `src/bootstrap/play-challenge-intro-host.ts` + `js/core_play_challenge_intro_host_runtime.js`，`play_application.js` 委托挑战简介弹层 DOM 读取、展示应用与事件绑定编排
  - 新增 `src/bootstrap/play-challenge-context.ts` + `js/core_play_challenge_context_runtime.js`，`play_application.js` 委托 `GAME_CHALLENGE_CONTEXT` 组装
  - 新增 `src/bootstrap/play-start-guard.ts` + `js/core_play_start_guard_runtime.js`，`play_application.js` 委托无效模式与自定义模式失败分支的告警/跳转决策
  - 新增 `src/bootstrap/play-startup-payload.ts` + `js/core_play_startup_payload_runtime.js`，`play_application.js` 委托启动返回载荷组装
  - 新增 `src/bootstrap/play-startup-context.ts` + `js/core_play_startup_context_runtime.js`，`play_application.js` 委托入口计划、guard 与自定义模式解析主流程编排
  - 新增 `src/bootstrap/play-startup-host.ts` + `js/core_play_startup_host_runtime.js`，`play_application.js` 委托开局回调主链编排（entry/startup/alert+redirect/window 上下文写入/header/startup payload fallback）
  - 新增 `src/bootstrap/play-runtime-contract.ts` + `js/core_play_runtime_contract_runtime.js`，`play_application.js` 委托 runtime 依赖契约校验与依赖对象收敛（保持原错误语义，现含 page-context runtime 校验）
  - 新增 `src/bootstrap/play-page-context.ts` + `js/core_play_page_context_runtime.js`，`play_application.js` 委托页面上下文编排（custom spawn 上下文桥接 + header/challenge intro host 串联）
  - `play_application.js` 已移除 `mode_key/challenge_id` 本地转发包装函数，入口回调直接消费 `play-query` runtime
  - 新增 `src/bootstrap/play-header.ts` + `js/core_play_header_runtime.js`，`play_application.js` 委托顶部模式简介文案拼装
  - 新增 `src/bootstrap/play-header-host.ts` + `js/core_play_header_host_runtime.js`，`play_application.js` 委托 play 页头 DOM 写入与挑战简介入口编排
  - `play-header` 已承接 play 页头渲染状态组装（`resolvePlayHeaderState`），`play_application.js` 不再本地拼装 `data-mode-id/data-ruleset/标题/简介` 字段
  - 新增 `src/bootstrap/practice-mode.ts` + `js/core_practice_mode_runtime.js`，`application.js` 委托 `practice_ruleset` 解析与模式投影
  - 新增 `src/bootstrap/mode-catalog.ts` + `js/core_mode_catalog_runtime.js`，`application.js` 与 `play_application.js` 共享 `ModeCatalog` 回退解析
  - 新增 `src/bootstrap/home-mode.ts` + `js/core_home_mode_runtime.js`，`application.js` 委托首页/练习页模式解析与 practice 模式装配
  - 新增 `src/bootstrap/home-runtime-contract.ts` + `js/core_home_runtime_contract_runtime.js`，`application.js` 委托首页 runtime 依赖契约校验（bootstrap/home-mode/undo-action）
  - 新增 `src/bootstrap/home-startup-host.ts` + `js/core_home_startup_host_runtime.js`，`application.js` 委托首页开局回调编排（上下文读取、`GAME_MODE_CONFIG` 注入与启动 payload 组装）
  - `home-mode` 已承接 body/location 上下文读取（`resolveHomeModeSelectionFromContext`），`application.js` 不再手工读取 `data-mode-id`/`location.search`
  - 新增 `src/bootstrap/play-custom-spawn.ts` + `js/core_play_custom_spawn_runtime.js`，`play_application.js` 委托自定义 4 率解析、提示、URL 同步与配置投影
  - `play_application.js` 的自定义 4 率存储读写已接入 `CoreStorageRuntime`，不再直接访问 `localStorage` 容错分支
  - 新增 `src/bootstrap/undo-action.ts` + `js/core_undo_action_runtime.js`，`application.js` 与 `index_ui.js` 共享撤回触发与可用性判定
  - `undo-action` 已承接页面模式标识读取（`resolveUndoModeIdFromBody`），`index_ui.js` 不再直接读取 `body[data-mode-id]`
  - `undo-action` 已承接上下文撤回能力判定（`resolveUndoCapabilityFromContext`），`index_ui.js` 不再本地拼装 `body/manager/globalMode` 输入
  - 新增 `src/bootstrap/practice-transfer.ts` + `js/core_practice_transfer_runtime.js`，`index_ui.js` 委托练习板直通模式配置组装
  - `practice-transfer` 已继续承接 `practice_guide_seen` 判定与练习板 URL 组装，`index_ui.js` 保留存储与跳转编排
  - `practice-transfer` 已承接练习板 token 与 payload 组装（含 board 深拷贝），`index_ui.js` 仅保留持久化与跳转流程
  - `practice-transfer` 已承接练习板跳转前置校验（`resolvePracticeTransferPrecheck`），`index_ui.js` 不再直接校验 `game_manager/getFinalBoardMatrix/board` 可用性
  - `practice-transfer` 已承接 payload 持久化回退（localStorage -> sessionStorage），`index_ui.js` 仅按结果选择直跳或 URL fallback
  - `practice-transfer` 已承接练习板直通导航计划组装（含 guide 判定、URL 构造、持久化与 fallback 决策），`index_ui.js` 仅保留盘面校验与 `window.open`
  - 新增 `src/bootstrap/home-guide.ts` + `js/core_home_guide_runtime.js`，`index_ui.js` 委托首页判定与新手指引自动触发 gate
  - `home-guide` 已继续承接首页指引步骤清单构建（含移动端提示步骤插入），`index_ui.js` 改为透传 viewport 信息
  - `home-guide` 已承接已读状态读写（`readHomeGuideSeenValue`/`markHomeGuideSeen`），`index_ui.js` 不再直接读写 `localStorage`
  - `home-guide` 已承接自动启动组合判定（`resolveHomeGuideAutoStart`）与设置态计算（`resolveHomeGuideSettingsState`），`index_ui.js` 改为消费结果渲染 UI
  - `home-guide` 已承接步骤展示状态计算（`resolveHomeGuideStepUiState`），`index_ui.js` 仅消费步骤文案/按钮状态模型
  - `home-guide` 已承接完成提示配置（`resolveHomeGuideDoneNotice`），`index_ui.js` 仅负责 toast DOM 渲染与定时器
  - `home-guide` 已承接完成提示样式模型（`resolveHomeGuideDoneNoticeStyle`），`index_ui.js` 不再硬编码 toast 样式常量
  - `home-guide` 已承接完成态策略（`resolveHomeGuideFinishState`），`index_ui.js` 不再硬编码 completed/skip 的提示策略
  - `home-guide` 已承接目标滚动策略（`resolveHomeGuideTargetScrollState`），`index_ui.js` 不再硬编码移动端 scrollIntoView 条件与参数
  - `home-guide` 已承接步骤游标/目标跳过判定（`resolveHomeGuideStepIndexState`/`resolveHomeGuideStepTargetState`），`index_ui.js` 不再硬编码步骤边界与缺失目标递进策略
  - `home-guide` 已承接控制按钮动作决策（`resolveHomeGuideControlAction`），`index_ui.js` 不再硬编码 prev/next/skip 的步进与结束原因
  - `home-guide` 已承接设置开关动作决策（`resolveHomeGuideToggleAction`），`index_ui.js` 不再硬编码开关触发的 resync/关闭弹窗/启动引导分支
  - `home-guide` 已承接会话生命周期与层显示态（`resolveHomeGuideLifecycleState`/`resolveHomeGuideLayerDisplayState`），`index_ui.js` 不再硬编码 start/finish 的状态写回与层显示切换
  - `home-guide` 已承接会话状态归一化（`resolveHomeGuideSessionState`），`index_ui.js` 的 start/finish 共用同一状态快照写回逻辑
  - `index_ui.js` 现直接消费 `home-guide` 生命周期主链模型（session/step index/target scroll/control/finish），不再重复本地空值 fallback 分支
  - `home-guide` 已承接路径读取容错（`resolveHomeGuidePathname`），`index_ui.js` 不再重复本地 `window.location.pathname` 的 `try/catch`
  - `home-guide` 已承接步骤渲染模型（`resolveHomeGuideStepRenderState`），`index_ui.js` 不再直接拼装 step/title/desc/按钮文案
  - `home-guide` 已承接高亮容器选择策略（`resolveHomeGuideElevationPlan`），`index_ui.js` 不再硬编码 `.top-action-buttons/.heading` 的优先级
  - `home-guide` 已承接事件绑定去重策略（`resolveHomeGuideBindingState`），`index_ui.js` 不再硬编码 `__homeGuideBound` 判定分支
  - `index_ui.js` 现直接消费 `home-guide` 设置/绑定/开关动作模型（`resolveHomeGuideSettingsState`/`resolveHomeGuideBindingState`/`resolveHomeGuideToggleAction`），不再重复本地空值 fallback 分支
  - `home-guide` 已承接引导面板/设置项模板（`buildHomeGuidePanelInnerHtml`/`buildHomeGuideSettingsRowInnerHtml`），`index_ui.js` 仅负责挂载 DOM
  - `home-guide` 已承接指引浮层位置计算（`resolveHomeGuidePanelLayout`），`index_ui.js` 仅传入窗口/目标几何信息并应用结果
  - `home-guide` 已承接指引目标可见性判定（`isHomeGuideTargetVisible`），`index_ui.js` 不再直接读 DOM 可见性样式
  - 新增 `src/bootstrap/mobile-hint.ts` + `js/core_mobile_hint_runtime.js`，`index_ui.js` 委托移动端提示文案抽取与去重逻辑
  - 新增 `src/bootstrap/timer-module.ts` + `js/core_timer_module_runtime.js`，`index_ui.js` 委托计时器设置项模板、展示态、绑定去重与开关视图模式决策
  - `timer-module` 已承接计时器视图模式应用回退（`resolveTimerModuleAppliedViewMode`），`index_ui.js` 不再硬编码 `setTimerModuleViewMode` 的兜底分支
  - `timer-module` 已承接初始化重试判定（`resolveTimerModuleInitRetryState`），`index_ui.js` 不再硬编码 `game_manager` 延迟就绪重试条件
  - `index_ui.js` 现直接消费 `timer-module` 安全状态模型（settings/binding/retry），不再重复本地空值 fallback 分支
  - `timer-module` 已承接当前视图模式读取回退（`resolveTimerModuleCurrentViewMode`），`index_ui.js` 不再直接读取 `game_manager.getTimerModuleViewMode` fallback
  - 新增 `src/bootstrap/theme-settings.ts` + `js/core_theme_settings_runtime.js`，`index_ui.js` 委托主题设置预览值格式化、预览值回退、下拉开关/绑定去重与选中态判定
  - `theme-settings` 已承接双预览区布局契约（`resolveThemePreviewLayout`），`index_ui.js` 不再硬编码预览容器 class、innerHTML 与选择器常量
  - `theme-settings` 已承接主题列表标准化（`resolveThemeOptions`），`index_ui.js` 不再直接消费 `ThemeManager.getThemes()` 的原始结构
  - `theme-settings` 已承接预览 CSS 选择器回退策略（`resolveThemePreviewCssSelectors`），`index_ui.js` 不再硬编码 `getPreviewCss` 的布局 fallback 分支
  - `index_ui.js` 现直接消费 `theme-settings` 的布局/选择器/绑定状态模型（preview/toggle/binding），不再重复本地空值 fallback 分支
  - `theme-settings` 已承接主题项值读取（`resolveThemeOptionValue`），`index_ui.js` 不再直接读取 `option.dataset.value` fallback
  - 清理 `index_ui.js` 未使用的 `getCurrentRuleset` 死代码，减少页面层冗余
  - 新增 `src/bootstrap/mobile-hint-ui.ts` + `js/core_mobile_hint_ui_runtime.js`，`index_ui.js` 委托移动端提示折叠文本区可见性判定与按钮展示态
  - `mobile-hint-ui` 已承接按钮应用状态模型（`resolveMobileHintUiState`），`index_ui.js` 不再硬编码折叠 class/关闭弹窗/按钮属性分支
  - `index_ui.js` 现直接消费 `resolveMobileHintUiState` 的安全模型，不再重复本地按钮与 class fallback 分支
  - 新增 `src/bootstrap/mobile-hint-modal.ts` + `js/core_mobile_hint_modal_runtime.js`，`index_ui.js` 委托移动端提示弹层 DOM 创建与关闭事件绑定
  - 新增 `src/bootstrap/mobile-timerbox.ts` + `js/core_mobile_timerbox_runtime.js`，`index_ui.js` 委托移动端计时器折叠态存储、图标与展示模型计算
  - `mobile-timerbox` 已承接折叠值归一化与展示态兜底（`resolveMobileTimerboxCollapsedValue`/`resolveMobileTimerboxAppliedModel`），`index_ui.js` 不再硬编码折叠判定与按钮属性 fallback
  - `index_ui.js` 现直接消费 `resolveMobileTimerboxAppliedModel` 的安全模型，不再重复本地按钮样式与 icon fallback 分支
  - 新增 `src/bootstrap/mobile-undo-top.ts` + `js/core_mobile_undo_top_runtime.js`，`index_ui.js` 委托移动端顶部撤回按钮展示态计算
  - `mobile-undo-top` 已承接按钮应用态兜底（`resolveMobileUndoTopAppliedModel`），`index_ui.js` 不再硬编码按钮样式与 aria fallback 分支
  - `index_ui.js` 现直接消费 `resolveMobileUndoTopAppliedModel` 的安全模型，不再重复本地样式兜底分支
  - 新增 `src/bootstrap/top-actions.ts` + `js/core_top_actions_runtime.js`，`index_ui.js` 委托移动端/练习页顶部按钮重排状态创建与同步
  - 新增 `src/bootstrap/mobile-top-buttons.ts` + `js/core_mobile_top_buttons_runtime.js`，`index_ui.js` 委托移动端撤回/提示按钮 DOM 创建与挂载顺序
  - 新增 `src/bootstrap/mobile-viewport.ts` + `js/core_mobile_viewport_runtime.js`，`index_ui.js` 委托紧凑视口/计时器折叠视口/移动端视口判定
  - `mobile-viewport` 已承接页面作用域判定（`resolvePageScopeValue`/`isGamePageScope`/`isPracticePageScope`/`isTimerboxMobileScope`），`index_ui.js` 不再直接读取 `body[data-page]`
  - 新增 `src/bootstrap/storage.ts` + `js/core_storage_runtime.js`，`index_ui.js` 委托 `localStorage/sessionStorage` 安全获取，不再内联存储访问容错逻辑
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
  - 新增 `src/bootstrap/history-canary-storage.ts` + `js/core_history_canary_storage_runtime.js`，`history_page.js` 委托 canary storage 读写回退（localStorage get/set/remove）逻辑
  - `history_page.js` 已移除本地 `getStorageValue/setStorageValue` 透传函数，直接注入 `history-canary-storage` runtime 读写方法
  - 新增 `src/bootstrap/history-canary-action.ts` + `js/core_history_canary_action_runtime.js`，`history_page.js` 委托 canary 策略执行器（按 action plan 写 default/forceLegacy）与应用反馈状态（成功/失败提示文案、reload 判定）
  - `history-canary-action` 已继续承接按动作名执行策略（`applyHistoryCanaryPolicyActionByName`），`history_page.js` 不再本地拼装 canary actionPlan
  - `history-canary-action` 已继续承接“按动作名执行 + 反馈态”一体化处理（`applyHistoryCanaryPolicyActionByNameWithFeedback`），`history_page.js` 不再本地串联 apply 与 feedback 计算
  - `history-canary-action` 已继续承接 canary 面板点击动作解析与执行反馈（`applyHistoryCanaryPanelAction`），`history_page.js` 不再本地解析 `data-action` 并拼装执行/提示入参
  - 新增 `src/bootstrap/history-canary-source.ts` + `js/core_history_canary_source_runtime.js`，`history_page.js` 委托 LegacyAdapterRuntime 的 canary policy/stored-keys 读取与对象归一化
  - `history-canary-source` 已继续承接 canary snapshot/stored 输入组装（`resolveHistoryCanaryPolicySnapshotInput`/`resolveHistoryCanaryStoredPolicyInput`），`history_page.js` 不再本地拼装 policy 输入
  - `history-canary-source` 已新增聚合读取入口（`resolveHistoryCanaryPolicyAndStoredState`），`history_page.js` 改为一次调用完成 policy + stored 解析并下发到 view runtime
  - 新增 `src/bootstrap/history-canary-panel.ts` + `js/core_history_canary_panel_runtime.js`，`history_page.js` 委托 canary 面板 HTML 渲染与 action 名称解析
  - 新增 `src/bootstrap/history-canary-host.ts` + `js/core_history_canary_host_runtime.js`，`history_page.js` 委托 canary 面板渲染编排与按钮点击执行反馈主链
  - `history-canary-host` 已继续承接 canary 面板一体化渲染入口（`applyHistoryCanaryPanelRender`），`history_page.js` 不再本地循环绑定 canary action 按钮
  - 新增 `src/bootstrap/history-canary-policy.ts` + `js/core_history_canary_policy_runtime.js`，`history_page.js` 委托 canary 策略快照解析、存储键归一化与动作决策/提示文案
  - 新增 `src/bootstrap/history-canary-view.ts` + `js/core_history_canary_view_runtime.js`，`history_page.js` 委托 canary 面板展示态（来源文案/模式文案/gate 样式/storage 文案）模型计算
  - 新增 `src/bootstrap/history-summary.ts` + `js/core_history_summary_runtime.js`，`history_page.js` 委托顶部汇总文案（总条数/分页/筛选标签）计算
  - 新增 `src/bootstrap/history-status.ts` + `js/core_history_status_runtime.js`，`history_page.js` 委托状态栏文案/颜色展示态（error 与 normal）模型计算
  - 新增 `src/bootstrap/history-view-host.ts` + `js/core_history_view_host_runtime.js`，`history_page.js` 委托状态栏与顶部汇总文案的 DOM 应用编排
  - 新增 `src/bootstrap/history-export.ts` + `js/core_history_export_runtime.js`，`history_page.js` 委托导出文件名生成与 mismatch 全量导出分页收集循环
  - `history-export` 已继续承接单条记录导出状态与 mismatch 导出源读取（`resolveHistorySingleRecordExportState`/`resolveHistoryMismatchExportRecordIds`），`history_page.js` 不再本地拼装导出源与 payload
  - `history-export` 已继续承接单条记录导出执行（`downloadHistorySingleRecord`），`history_page.js` 不再本地判断导出状态后调用 `LocalHistoryStore.download`
  - `history-export` 已继续承接“导出全部/导出 A/B 不一致”执行（`downloadHistoryAllRecords`/`downloadHistoryMismatchRecords`），`history_page.js` 不再本地拼接导出 payload、文件名与下载调用
  - 新增 `src/bootstrap/history-query.ts` + `js/core_history_query_runtime.js`，`history_page.js` 委托筛选状态归一化、list/burn-in 查询参数拼装与分页按钮状态计算
  - 新增 `src/bootstrap/history-filter-host.ts` + `js/core_history_filter_host_runtime.js`，`history_page.js` 委托筛选控件值读取与 `history-query` 状态回写编排
  - `history-query` 已继续承接筛选状态回写（`applyHistoryFilterState`），`history_page.js` 不再本地逐字段赋值 `state.modeKey/keyword/sortBy/...`
  - `history-query` 已继续承接列表结果源读取（`resolveHistoryListResultSource`），`history_page.js` 不再直接调用 `LocalHistoryStore.listRecords`
  - 新增 `src/bootstrap/history-load.ts` + `js/core_history_load_runtime.js`，`history_page.js` 委托列表查询、burn-in 汇总与分页状态的加载编排主链
  - 新增 `src/bootstrap/history-record-view.ts` + `js/core_history_record_view_runtime.js`，`history_page.js` 委托列表头展示态（mode/score/best/duration/ended）模型计算
  - `history-record-view` 已继续承接 `ModeCatalog` 标签解析（`resolveHistoryCatalogModeLabel`），`history_page.js` 不再本地读取 mode label
  - 新增 `src/bootstrap/history-record-item.ts` + `js/core_history_record_item_runtime.js`，`history_page.js` 委托历史记录卡片 HTML 模型拼装（头部信息/动作按钮/诊断区/终盘棋盘）
  - 新增 `src/bootstrap/history-record-list-host.ts` + `js/core_history_record_list_host_runtime.js`，`history_page.js` 委托历史记录列表渲染与单项动作绑定编排
  - `history-record-list-host` 已继续承接 `renderHistory` 逐项渲染与 replay/export/delete 绑定主链；并修复 DOM 方法 this 绑定（`querySelector/addEventListener/appendChild`）以避免浏览器非法调用
  - 新增 `src/bootstrap/history-import.ts` + `js/core_history_import_runtime.js`，`history_page.js` 委托导入动作决策（merge/replace/confirm）与导入成功/失败提示文案
  - `history-import` 已继续承接导入执行（`executeHistoryImport`），`history_page.js` 不再本地拼装 `merge` 后直接调用 `LocalHistoryStore.importRecords`
  - 新增 `src/bootstrap/history-import-file.ts` + `js/core_history_import_file_runtime.js`，`history_page.js` 委托导入文件选择、读取编码、payload 文本归一化与 input reset 值决策
  - 新增 `src/bootstrap/history-import-host.ts` + `js/core_history_import_host_runtime.js`，`history_page.js` 委托导入入口点击、文件读取成功/失败反馈与刷新判定编排
  - 新增 `src/bootstrap/history-import-bind-host.ts` + `js/core_history_import_bind_host_runtime.js`，`history_page.js` 委托导入控件绑定编排（merge/replace/file-change）
  - `history-import-bind-host` 已修复 DOM 方法 this 绑定（`addEventListener/click`），避免浏览器环境下导入按钮与文件选择事件绑定丢失
  - 新增 `src/bootstrap/history-record-actions.ts` + `js/core_history_record_actions_runtime.js`，`history_page.js` 委托记录项动作决策（回放链接、删除确认计划、删除成功/失败提示文案）
  - 新增 `src/bootstrap/history-record-host.ts` + `js/core_history_record_host_runtime.js`，`history_page.js` 委托记录项回放跳转、单条导出与删除执行反馈编排
  - `history-record-actions` 已继续承接记录删除执行（`executeHistoryDeleteRecord`），`history_page.js` 不再本地调用 `LocalHistoryStore.deleteById`
  - 新增 `src/bootstrap/history-toolbar.ts` + `js/core_history_toolbar_runtime.js`，`history_page.js` 委托工具栏动作决策（导出日期标签/文件名、mismatch 导出查询、清空确认计划与提示文案）
  - `history-toolbar` 已继续承接清空历史执行（`executeHistoryClearAll`），`history_page.js` 不再本地调用 `LocalHistoryStore.clearAll`
  - 新增 `src/bootstrap/history-toolbar-host.ts` + `js/core_history_toolbar_host_runtime.js`，`history_page.js` 委托工具栏导出/清空执行编排主链（export-all/mismatch/clear-all）
  - 新增 `src/bootstrap/history-toolbar-bind-host.ts` + `js/core_history_toolbar_bind_host_runtime.js`，`history_page.js` 委托工具栏按钮绑定编排（刷新/导出全部/导出不一致/清空）
  - 新增 `src/bootstrap/history-toolbar-events.ts` + `js/core_history_toolbar_events_runtime.js`，`history_page.js` 委托分页步进决策、筛选控件 reload 绑定列表与关键词 Enter 触发判定
  - 新增 `src/bootstrap/history-toolbar-events-host.ts` + `js/core_history_toolbar_events_host_runtime.js`，`history_page.js` 委托分页/筛选/关键词监听绑定编排
  - `history-toolbar-bind-host/history-toolbar-events-host` 已修复 DOM 方法 this 绑定（`addEventListener/preventDefault`），并补充单测防回归
  - 新增 `src/bootstrap/history-mode-filter.ts` + `js/core_history_mode_filter_runtime.js`，`history_page.js` 委托模式筛选下拉选项模型组装
  - 新增 `src/bootstrap/history-mode-filter-host.ts` + `js/core_history_mode_filter_host_runtime.js`，`history_page.js` 委托模式筛选下拉渲染编排（读取 catalog -> 组装 option -> append）
  - 新增 `src/bootstrap/history-board.ts` + `js/core_history_board_runtime.js`，`history_page.js` 委托历史记录终盘棋盘 HTML 渲染（网格尺寸推断、tile 样式类、super tile 标识）
  - 新增 `src/bootstrap/history-runtime-contract.ts` + `js/core_history_runtime_contract_runtime.js`，`history_page.js` 统一委托历史页 runtime 依赖契约校验并集中收敛依赖对象
  - `history-runtime-contract` 已纳入 `CoreHistoryRecordListHostRuntime` 依赖校验，历史页列表渲染编排改走统一契约注入
  - 新增 `src/bootstrap/history-adapter-diagnostics.ts` + `js/core_history_adapter_diagnostics_runtime.js`，`history_page.js` 委托 adapter 诊断徽标与文案行模型计算
  - 新增 `src/bootstrap/history-adapter-host.ts` + `js/core_history_adapter_host_runtime.js`，`history_page.js` 委托 adapter 诊断徽标/诊断区渲染编排
  - 新增 `src/bootstrap/history-load-host.ts` + `js/core_history_load_host_runtime.js`，`history_page.js` 委托 load 后渲染编排（列表/汇总/burn-in/canary/status/pager）
  - `history-load-host` 已继续承接列表加载一体化入口（`applyHistoryLoadWithPager`），`history_page.js` 不再本地读取分页按钮并手工应用禁用态
  - `history-load-host` 已继续承接分页按钮状态应用（`applyHistoryPagerButtonState`），`history_page.js` 不再本地写 `prev/next.disabled`
  - 新增 `src/bootstrap/history-startup-host.ts` + `js/core_history_startup_host_runtime.js`，`history_page.js` 委托 DOMContentLoaded 启动编排（store 校验/初始化/首屏加载）
  - `history-adapter-diagnostics` 已继续承接 adapter 诊断徽标/诊断区 HTML 拼装（`resolveHistoryAdapterBadgeHtml`/`resolveHistoryAdapterDiagnosticsHtml`），`history_page.js` 不再本地拼接诊断 HTML
  - `history-adapter-diagnostics` 已继续承接 parity 状态读取（`resolveHistoryAdapterParityStatus`），`history_page.js` 不再本地读取 `LocalHistoryStore.getAdapterParityStatus`
  - 新增 `src/bootstrap/history-burnin.ts` + `js/core_history_burnin_runtime.js`，`history_page.js` 委托 burn-in 汇总 gate 状态、百分比文案、连续窗口统计、面板 HTML 渲染与“仅看不一致”点击动作决策
  - 新增 `src/bootstrap/history-burnin-host.ts` + `js/core_history_burnin_host_runtime.js`，`history_page.js` 委托 burn-in 面板渲染与“仅看不一致”点击反馈编排
  - `history-burnin-host` 已继续承接 burn-in 面板一体化渲染入口（`applyHistoryBurnInSummaryRender`），`history_page.js` 不再本地绑定 mismatch 按钮动作
  - `history-burnin` 已继续承接 burn-in 汇总源读取（`resolveHistoryBurnInSummarySource`），`history_page.js` 不再本地判断 store/query 再调用 `getAdapterParityBurnInSummary`
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
