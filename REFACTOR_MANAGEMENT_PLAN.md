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

## 2.1) 当前收敛快照（2026-02）
- `js/game_manager.js` 已收敛为 12 行壳文件，仅保留构造器与两条初始化调用：
  - `applyGameManagerStaticConfiguration()`
  - `bindGameManagerPrototypeRuntime()`
- `game_manager` 逻辑分层已落地：
  - `js/core_game_manager_common_runtime.js`：纯逻辑函数（禁止 `GameManager.prototype` 绑定）
  - `js/core_game_manager_static_runtime.js`：`GameManager` 静态常量/模式配置装配
  - `js/core_game_manager_bindings_runtime.js`：`GameManager.prototype` 绑定与 runtime accessor 注册
- 页面脚本加载顺序已统一为：
  - `core_game_manager_common_runtime.js` → `core_game_manager_static_runtime.js` → `core_game_manager_bindings_runtime.js` → `game_manager.js`
- 门禁脚本 `scripts/game-manager-audit.mjs` 已升级，新增以下强约束：
  - 壳文件行数与结构检查（constructor-only）
  - common/bindings 职责边界检查
  - bindings 重复原型绑定检查
  - 六个页面脚本顺序检查

## 3) 里程碑

### M1 - 基线与防护栏（进行中）
目标：
- 为旧版多入口页面建立自动化回归防护。

交付物：
- 覆盖 8 个页面的 Playwright smoke 测试。
- push/PR 自动触发 smoke 的 CI 工作流。
- 统一本地脚本（`npm run test:smoke`）。
- 测试结构按页面域逐步拆分：
  - 已完成按领域拆分（history/index-ui/pages-* 共 30+ 文件），不再依赖单个超大 smoke 文件。
  - 当前跨页加载契约统一在 `tests/smoke/pages-runtime-contract.smoke.spec.ts`。

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
  - 新增 `src/bootstrap/simple-page-host.ts` + `js/core_simple_page_host_runtime.js`，`replay/capped` 入口委托 page 级 runtime 契约解析与启动编排
  - `replay_application.js` / `capped_application.js` 已收敛为单一 `CoreSimplePageHostRuntime.applySimplePageBootstrap` 调用
  - 新增 `src/bootstrap/replay-guide.ts` + `js/core_replay_guide_runtime.js`，`replay_ui.js` 委托回放页首访指引已读判定与落标记
  - `replay_ui.js` 的回放页指引流程已改为 `CoreReplayGuideRuntime` 调用，页面层移除 `localStorage` 直接读写
  - 新增 `src/bootstrap/announcement.ts` + `js/core_announcement_runtime.js`，`announcement_manager.js` 委托公告未读判定与已读落标记
  - `announcement_manager.js` 的公告未读流程已改为 `CoreAnnouncementRuntime` 调用，页面层移除 `localStorage` 直接读写
  - 新增 `src/bootstrap/capped-timer-scroll.ts` + `js/core_capped_timer_scroll_runtime.js`，`capped_timer_scroll.js` 委托 capped/practice 计时滚动模式上下文判定
  - `capped_timer_scroll.js` 已通过 `resolveTimerScrollModeFromContext` 下沉 `data-mode-id/GAME_MODE_CONFIG` 读取
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
  - 新增 `src/bootstrap/play-page-host.ts` + `js/core_play_page_host_runtime.js`，`play_application.js` 委托 page 级 runtime 契约解析与启动编排主链
  - `play_application.js` 已收敛为单一 `CorePlayPageHostRuntime.applyPlayPageBootstrap` 调用
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
  - 新增 `src/bootstrap/home-page-host.ts` + `js/core_home_page_host_runtime.js`，`application.js` 委托页面级 runtime 契约解析、开局编排与撤回动作转发
  - `application.js` 已收敛为 `CoreHomePageHostRuntime.applyHomePageBootstrap/applyHomePageUndo` 调用
  - `home-mode` 已承接 body/location 上下文读取（`resolveHomeModeSelectionFromContext`），`application.js` 不再手工读取 `data-mode-id`/`location.search`
  - 新增 `src/bootstrap/play-custom-spawn.ts` + `js/core_play_custom_spawn_runtime.js`，`play_application.js` 委托自定义 4 率解析、提示、URL 同步与配置投影
  - `play_application.js` 的自定义 4 率存储读写已接入 `CoreStorageRuntime`，不再直接访问 `localStorage` 容错分支
  - 新增 `src/bootstrap/undo-action.ts` + `js/core_undo_action_runtime.js`，`application.js` 与 `index_ui.js` 共享撤回触发与可用性判定
  - `undo-action` 已承接页面模式标识读取（`resolveUndoModeIdFromBody`），`index_ui.js` 不再直接读取 `body[data-mode-id]`
  - `undo-action` 已承接上下文撤回能力判定（`resolveUndoCapabilityFromContext`），`index_ui.js` 不再本地拼装 `body/manager/globalMode` 输入
  - `undo-action` 已承接撤回触发 `manager` 上下文解析（`tryTriggerUndoFromContext`），`index_ui.js` 不再页面层读取 `window.game_manager`
  - 新增 `src/bootstrap/practice-transfer.ts` + `js/core_practice_transfer_runtime.js`，`index_ui.js` 委托练习板直通模式配置组装
  - `practice-transfer` 已继续承接 `practice_guide_seen` 判定与练习板 URL 组装，`index_ui.js` 保留存储与跳转编排
  - `practice-transfer` 已承接练习板 token 与 payload 组装（含 board 深拷贝），`index_ui.js` 仅保留持久化与跳转流程
  - `practice-transfer` 已承接练习板跳转前置校验（`resolvePracticeTransferPrecheck`），`index_ui.js` 不再直接校验 `game_manager/getFinalBoardMatrix/board` 可用性
  - `practice-transfer` 已承接 payload 持久化回退（localStorage -> sessionStorage），`index_ui.js` 仅按结果选择直跳或 URL fallback
  - `practice-transfer` 已承接练习板直通导航计划组装（含 guide 判定、URL 构造、持久化与 fallback 决策），`index_ui.js` 仅保留盘面校验与 `window.open`
  - 新增 `src/bootstrap/practice-transfer-host.ts` + `js/core_practice_transfer_host_runtime.js`，`index_ui.js` 委托练习板直通主流程编排（precheck/计划生成/失败提示/新窗口打开）
  - 新增 `src/bootstrap/practice-transfer-page-host.ts` + `js/core_practice_transfer_page_host_runtime.js`，`index_ui.js` 委托练习板直通页面侧上下文编排（storage 解析 + host runtime 入参组装）
  - `practice-transfer-page-host` 已扩展 action resolver（`createPracticeTransferPageActionResolvers`），`index_ui.js` 的 `openPracticeBoardFromCurrent` 改为消费 resolver 返回函数
  - `index_ui.js` 的 `openPracticeBoardFromCurrent` 已改为 `CorePracticeTransferPageHostRuntime.applyPracticeTransferPageAction` 调用，页面层不再直接拼装 transfer host 参数
  - `practice-transfer-page-host` 已承接 `window.game_manager/GAME_MODE_CONFIG` 上下文读取（`applyPracticeTransferPageActionFromContext`），`index_ui.js` 不再页面层读取 manager/mode config
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
  - 新增 `src/bootstrap/timer-module-settings-host.ts` + `js/core_timer_module_settings_host_runtime.js`，`index_ui.js` 委托计时器设置项容器挂载与旧撤回设置项清理（`undo-enabled-toggle`）DOM 编排
  - `index_ui.js` 的 `removeLegacyUndoSettingsUI/ensureTimerModuleSettingsDom` 已收敛为 `CoreTimerModuleSettingsHostRuntime` 调用（页面层移除 settings-row 的插入/删除分支）
  - `timer-module-settings-host` 已承接计时器设置初始化主链（`applyTimerModuleSettingsUi`），`index_ui.js` 不再内联重试调度、同步函数注入与 toggle 变更绑定分支
  - 新增 `src/bootstrap/timer-module-settings-page-host.ts` + `js/core_timer_module_settings_page_host_runtime.js`，`index_ui.js` 委托计时器设置页上下文编排（toggle/note 查询 + retry 调度回调注入）
  - `index_ui.js` 的 `initTimerModuleSettingsUI` 已收敛为 `CoreTimerModuleSettingsPageHostRuntime.applyTimerModuleSettingsPageInit` 调用，页面层移除 `ensureTimerModuleSettingsDom` 包装函数
  - 新增 `src/bootstrap/theme-settings.ts` + `js/core_theme_settings_runtime.js`，`index_ui.js` 委托主题设置预览值格式化、预览值回退、下拉开关/绑定去重与选中态判定
  - 新增 `src/bootstrap/theme-settings-host.ts` + `js/core_theme_settings_host_runtime.js`，`index_ui.js` 委托主题设置 UI 编排主链（双预览渲染、下拉交互绑定、themechange 同步）
  - 新增 `src/bootstrap/theme-settings-page-host.ts` + `js/core_theme_settings_page_host_runtime.js`，`index_ui.js` 委托主题设置页上下文编排（window.ThemeManager 解析 + host runtime 入参组装）
  - `index_ui.js` 的 `initThemeSettingsUI` 已收敛为 `CoreThemeSettingsPageHostRuntime.applyThemeSettingsPageInit` 调用，页面层移除 `themeManager` 直连拼装分支
  - 新增 `src/bootstrap/replay-modal.ts` + `js/core_replay_modal_runtime.js`，`index_ui.js` 委托回放弹窗与设置弹窗的 DOM 开关/动作绑定编排
  - `index_ui.js` 顶部弹窗逻辑已改为 `CoreReplayModalRuntime` 调用（`showReplayModal/closeReplayModal/openSettingsModal/closeSettingsModal`）
  - 新增 `src/bootstrap/replay-page-host.ts` + `js/core_replay_page_host_runtime.js`，`index_ui.js` 委托回放弹窗/回放导出页面级编排（modal/export runtime 入参组装）
  - `index_ui.js` 的 `showReplayModal/closeReplayModal/exportReplay` 已收敛为 `CoreReplayPageHostRuntime` 调用，页面层移除 replay modal/export host 入参拼装分支
  - `replay-page-host` 已承接导出链路 `manager` 上下文解析（`applyReplayExportPageActionFromContext`），`index_ui.js` 不再页面层读取 `window.game_manager`
  - `replay-page-host` 已扩展 action resolver（`createReplayPageActionResolvers`），`index_ui.js` 不再本地声明 replay modal/export 包装函数
  - 新增 `src/bootstrap/settings-modal-host.ts` + `js/core_settings_modal_host_runtime.js`，`index_ui.js` 委托设置弹窗开关主链编排（modal 开关 + 主题/计时器/引导设置初始化）
  - 新增 `src/bootstrap/settings-modal-page-host.ts` + `js/core_settings_modal_page_host_runtime.js`，`index_ui.js` 委托设置弹窗页面级编排（host runtime 入参组装）
  - `settings-modal-page-host` 已扩展初始化 resolver（`initThemeSettingsUI/removeLegacyUndoSettingsUI/initTimerModuleSettingsUI`），`index_ui.js` 不再本地声明这三个 settings 初始化包装函数
  - `settings-modal-page-host` 已扩展 action resolver（`createSettingsModalActionResolvers`），`index_ui.js` 的 `openSettingsModal/closeSettingsModal` 已改为消费 resolver 返回函数
  - `index_ui.js` 的 `openSettingsModal/closeSettingsModal` 已收敛为 `CoreSettingsModalPageHostRuntime` 调用，页面层移除 settings modal host 入参拼装分支
  - 新增 `src/bootstrap/replay-export.ts` + `js/core_replay_export_runtime.js`，`index_ui.js` 委托回放导出与剪贴板复制回退（clipboard/fallback）逻辑
  - `index_ui.js` 已移除本地 `copyToClipboard/fallbackCopy`，`window.exportReplay` 收敛为 `CoreReplayExportRuntime.applyReplayExport` 调用
  - 新增 `src/bootstrap/pretty-time.ts` + `js/core_pretty_time_runtime.js`，`index_ui.js` 委托计时展示格式化（`window.pretty`）
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
  - 新增 `src/bootstrap/mobile-hint-host.ts` + `js/core_mobile_hint_host_runtime.js`，`index_ui.js` 委托移动端提示按钮初始化（scope gate + click 绑定去重 + 初始同步）编排
  - 新增 `src/bootstrap/mobile-hint-open-host.ts` + `js/core_mobile_hint_open_host_runtime.js`，`index_ui.js` 委托移动端提示弹层打开编排（scope/viewport gate + 文案收集 + DOM 渲染 + overlay 展示）
  - 新增 `src/bootstrap/mobile-hint-ui-host.ts` + `js/core_mobile_hint_ui_host_runtime.js`，`index_ui.js` 委托移动端提示 UI 同步编排（文本折叠同步 + intro 显隐 + 按钮态应用 + 关闭弹层）
  - 新增 `src/bootstrap/mobile-hint-page-host.ts` + `js/core_mobile_hint_page_host_runtime.js`，`index_ui.js` 委托移动端提示页面级 resolver 创建（ensure/open/close）
  - `mobile-hint-page-host` 已扩展页面级 resolver（`syncMobileHintUI/initMobileHintToggle`），`index_ui.js` 不再本地声明移动端提示同步与初始化包装函数
  - 新增 `src/bootstrap/mobile-timerbox.ts` + `js/core_mobile_timerbox_runtime.js`，`index_ui.js` 委托移动端计时器折叠态存储、图标与展示模型计算
  - `mobile-timerbox` 已承接折叠值归一化与展示态兜底（`resolveMobileTimerboxCollapsedValue`/`resolveMobileTimerboxAppliedModel`），`index_ui.js` 不再硬编码折叠判定与按钮属性 fallback
  - 新增 `src/bootstrap/mobile-timerbox-host.ts` + `js/core_mobile_timerbox_host_runtime.js`，`index_ui.js` 委托移动端计时器按钮初始化（click 绑定去重 + 启动同步链 + 重排触发）编排
  - `mobile-timerbox-host` 已承接移动端计时器 UI 同步主链（`applyMobileTimerboxUiSync`），`index_ui.js` 的 `syncMobileTimerboxUI` 不再内联 DOM 状态编排与持久化分支
  - `mobile-timerbox-host` 已承接折叠态 `localStorage` 上下文解析（`applyMobileTimerboxUiSyncFromContext`），`index_ui.js` 不再页面层读取/写入 `localStorage`
  - 新增 `src/bootstrap/mobile-timerbox-page-host.ts` + `js/core_mobile_timerbox_page_host_runtime.js`，`index_ui.js` 委托移动端计时器页面级 resolver 创建（sync/init）
  - `mobile-timerbox-page-host` 已扩展页面级 resolver（`requestResponsiveGameRelayout`），`index_ui.js` 不再本地声明重排请求包装函数
  - `index_ui.js` 的 `syncMobileTimerboxUI/initMobileTimerboxToggle` 已收敛为 `CoreMobileTimerboxPageHostRuntime` 调用，页面层移除 `document.getElementById` 与 host 入参拼装分支
  - `index_ui.js` 现直接消费 `resolveMobileTimerboxAppliedModel` 的安全模型，不再重复本地按钮样式与 icon fallback 分支
  - 新增 `src/bootstrap/mobile-undo-top.ts` + `js/core_mobile_undo_top_runtime.js`，`index_ui.js` 委托移动端顶部撤回按钮展示态计算
  - `mobile-undo-top` 已承接按钮应用态兜底（`resolveMobileUndoTopAppliedModel`），`index_ui.js` 不再硬编码按钮样式与 aria fallback 分支
  - 新增 `src/bootstrap/mobile-undo-top-host.ts` + `js/core_mobile_undo_top_host_runtime.js`，`index_ui.js` 委托移动端顶部撤回按钮初始化（scope gate + click 绑定去重 + 初始同步）编排
  - 新增 `src/bootstrap/mobile-undo-top-availability-host.ts` + `js/core_mobile_undo_top_availability_host_runtime.js`，`index_ui.js` 委托移动端顶部撤回按钮可用态同步（能力判定 + 展示模型应用 + label/aria 写回）
  - `mobile-undo-top-availability-host` 已承接页面上下文能力判定回退（`undoActionRuntime.resolveUndoCapabilityFromContext`），`index_ui.js` 移除本地 `resolveUndoCapabilityState` 包装函数
  - `mobile-undo-top-availability-host` 已承接 `manager/GAME_MODE_CONFIG` 上下文解析（`applyMobileUndoTopAvailabilitySyncFromContext`），`index_ui.js` 不再页面层读取撤回能力输入
  - `index_ui.js` 现直接消费 `resolveMobileUndoTopAppliedModel` 的安全模型，不再重复本地样式兜底分支
  - 新增 `src/bootstrap/top-actions.ts` + `js/core_top_actions_runtime.js`，`index_ui.js` 委托移动端/练习页顶部按钮重排状态创建与同步
  - 新增 `src/bootstrap/top-actions-host.ts` + `js/core_top_actions_host_runtime.js`，`index_ui.js` 委托顶部重排状态创建与同步编排（game/practice 作用域 gate + state 复用）
  - 新增 `src/bootstrap/top-actions-page-host.ts` + `js/core_top_actions_page_host_runtime.js`，`index_ui.js` 委托顶部重排页面级 resolver 创建（内部持有 mobile/practice placement state）
  - `index_ui.js` 的 `syncMobileTopActionsPlacement/syncPracticeTopActionsPlacement` 已收敛为 `CoreTopActionsHostRuntime` 调用，页面层移除重排 state 创建与 DOM 选择器编排分支
  - 新增 `src/bootstrap/mobile-top-buttons.ts` + `js/core_mobile_top_buttons_runtime.js`，`index_ui.js` 委托移动端撤回/提示按钮 DOM 创建与挂载顺序
  - 新增 `src/bootstrap/mobile-top-buttons-page-host.ts` + `js/core_mobile_top_buttons_page_host_runtime.js`，`index_ui.js` 委托移动端顶部按钮页面级 resolver 创建（基于 page scope 的 ensure-undo/ensure-hint）
  - `mobile-top-buttons-page-host` 已扩展页面级 resolver（`syncMobileUndoTopButtonAvailability/initMobileUndoTopButton`），`index_ui.js` 不再本地声明顶部撤回按钮同步与初始化包装函数
  - 新增 `src/bootstrap/mobile-viewport.ts` + `js/core_mobile_viewport_runtime.js`，`index_ui.js` 委托紧凑视口/计时器折叠视口/移动端视口判定
  - `mobile-viewport` 已承接页面作用域判定（`resolvePageScopeValue`/`isGamePageScope`/`isPracticePageScope`/`isTimerboxMobileScope`），`index_ui.js` 不再直接读取 `body[data-page]`
  - 新增 `src/bootstrap/mobile-viewport-page-host.ts` + `js/core_mobile_viewport_page_host_runtime.js`，`index_ui.js` 委托页面级 scope/viewport resolver 创建（game/practice/timerbox/mobile/compact 判定函数）
  - 新增 `src/bootstrap/responsive-relayout.ts` + `js/core_responsive_relayout_runtime.js`，`index_ui.js` 委托重排调度决策与重排执行链（sync + manager 视觉刷新）
  - `index_ui.js` 的 `requestResponsiveGameRelayout` 已改为 `CoreResponsiveRelayoutHostRuntime` 调用（内部委托 `CoreResponsiveRelayoutRuntime`），页面层不再内联重排判定、timer 调度与 manager 刷新分支
  - 新增 `src/bootstrap/responsive-relayout-host.ts` + `js/core_responsive_relayout_host_runtime.js`，`index_ui.js` 委托移动端重排请求主链（request state 解析、timer 清理与调度、回调执行）编排
  - `responsive-relayout-host` 已承接 `manager` 上下文解析（`applyResponsiveRelayoutRequestFromContext`），`index_ui.js` 不再页面层读取 `window.game_manager`
  - 新增 `src/bootstrap/top-action-bindings-host.ts` + `js/core_top_action_bindings_host_runtime.js`，`index_ui.js` 委托顶部按钮与设置弹层事件绑定（undo/export/practice/settings）
  - `index_ui.js` 的 `DOMContentLoaded` 顶部动作绑定已收敛为 `CoreTopActionBindingsHostRuntime.applyTopActionBindings` 调用
  - 新增 `src/bootstrap/game-over-undo-host.ts` + `js/core_game_over_undo_host_runtime.js`，`index_ui.js` 委托 game-over 撤回按钮（click/touch 防重）绑定
  - `index_ui.js` 的 `undo-btn-gameover` 绑定已收敛为 `CoreGameOverUndoHostRuntime.bindGameOverUndoControl` 调用
  - 新增 `src/bootstrap/index-ui-startup-host.ts` + `js/core_index_ui_startup_host_runtime.js`，`index_ui.js` 委托 `DOMContentLoaded` 启动编排主链（顶部绑定/设置初始化/重排监听）
  - `index_ui.js` 的 DOMContentLoaded 主流程已收敛为 `CoreIndexUiStartupHostRuntime.applyIndexUiStartup` 调用
  - 新增 `src/bootstrap/index-ui-runtime-contract.ts` + `js/core_index_ui_runtime_contract_runtime.js`，`index_ui.js` 委托 replay/settings 弹层 runtime 依赖契约校验
  - `index_ui.js` 顶部 replay/settings runtime 校验已改为 `resolveIndexUiModalRuntimeContracts` 统一解析，页面层移除重复方法判定分支
  - `index-ui-runtime-contract` 已扩展 home-guide 依赖契约解析（`CoreHomeGuideRuntime` + startup/settings/page/dom/done-notice/highlight/panel/finish/start/controls/step-flow/step/step-view host runtimes）
  - `index-ui-runtime-contract` home-guide 契约已纳入 `CoreHomeGuidePageHostRuntime.createHomeGuidePageResolvers` 校验
  - `index_ui.js` 顶部 home-guide runtime 校验已改为 `resolveIndexUiHomeGuideRuntimeContracts` 统一解析，页面层移除分散的 host 方法判定分支
  - `index-ui-runtime-contract` 已扩展 core 依赖契约解析（timer/theme/practice-transfer/undo/mobile/top-actions/storage/relayout/startup）
  - `index-ui-runtime-contract` core 契约已纳入 `CoreMobileHintPageHostRuntime.createMobileHintPageResolvers` 校验
  - `index-ui-runtime-contract` core 契约已纳入 `CoreMobileTimerboxPageHostRuntime.createMobileTimerboxPageResolvers` 校验
  - `index-ui-runtime-contract` core 契约已纳入 `CoreTopActionsPageHostRuntime.createTopActionsPageResolvers` 校验
  - `index-ui-runtime-contract` core 契约已纳入 `CoreMobileViewportPageHostRuntime.createMobileViewportPageResolvers` 校验，`index_ui.js` 顶部不再本地声明 6 个 mobile-viewport 包装函数
  - `index-ui-runtime-contract` core 契约已纳入 `CoreMobileTopButtonsPageHostRuntime.createMobileTopButtonsPageResolvers` 校验，`index_ui.js` 顶部不再本地声明 mobile top button 的 `ensure*` 包装函数
  - 新增 `src/bootstrap/index-ui-page-host.ts` + `js/core_index_ui_page_host_runtime.js`，`index_ui.js` 委托页面级全局函数导出绑定与 `DOMContentLoaded` 启动入口编排
  - `index_ui.js` 已移除页面层 `tryUndoFromUi`、`window.*` 绑定与 `DOMContentLoaded` 内联主流程，统一走 `CoreIndexUiPageHostRuntime.createIndexUiTryUndoHandler/applyIndexUiPageBootstrap` 调用
  - 新增 `src/bootstrap/index-ui-page-resolvers-host.ts` + `js/core_index_ui_page_resolvers_host_runtime.js`，`index_ui.js` 委托 mobile resolver 聚合装配（viewport/top-buttons/top-actions/hint/timerbox）与契约校验
  - `index-ui-runtime-contract` core 契约已纳入 `CoreIndexUiPageResolversHostRuntime.createIndexUiMobileResolvers` 校验，`index_ui.js` 页面层移除大段 mobile resolver 创建与方法判定样板
  - 新增 `src/bootstrap/index-ui-page-actions-host.ts` + `js/core_index_ui_page_actions_host_runtime.js`，`index_ui.js` 委托 settings/practice/home-guide/replay 页面动作 resolver 聚合装配与契约校验
  - `index-ui-runtime-contract` core 契约已纳入 `CoreIndexUiPageActionsHostRuntime.createIndexUiPageActionResolvers` 校验，避免页面层重复 action resolver 构建与校验样板
  - `index_ui.js` 已移除 settings/practice/home-guide/replay 大段页面组装样板，当前行数从 374 继续收敛到 203（已达阶段目标 <=220）
  - `index_ui.js` 顶部 core runtime 校验已改为 `resolveIndexUiCoreRuntimeContracts` 统一解析，页面层移除大段分散方法判定分支
  - 新增 `src/bootstrap/home-guide-settings-host.ts` + `js/core_home_guide_settings_host_runtime.js`，`index_ui.js` 委托首页指引设置项插入/同步/绑定编排
  - `index_ui.js` 的 `initHomeGuideSettingsUI` 已收敛为 `CoreHomeGuideSettingsHostRuntime.applyHomeGuideSettingsUi` 调用
  - 新增 `src/bootstrap/home-guide-dom-host.ts` + `js/core_home_guide_dom_host_runtime.js`，`index_ui.js` 委托首页指引浮层 DOM 创建与状态回写编排
  - `index_ui.js` 的 `ensureHomeGuideDom` 已收敛为 `CoreHomeGuideDomHostRuntime.applyHomeGuideDomEnsure` 调用
  - 新增 `src/bootstrap/home-guide-done-notice-host.ts` + `js/core_home_guide_done_notice_host_runtime.js`，`index_ui.js` 委托引导完成提示的 toast 渲染与计时器编排
  - `index_ui.js` 的 `showHomeGuideDoneNotice` 已收敛为 `CoreHomeGuideDoneNoticeHostRuntime.applyHomeGuideDoneNotice` 调用
  - 新增 `src/bootstrap/home-guide-finish-host.ts` + `js/core_home_guide_finish_host_runtime.js`，`index_ui.js` 委托引导结束生命周期状态回写（active/steps/index/fromSettings）与层显示编排
  - `index_ui.js` 的 `finishHomeGuide` 已收敛为 `CoreHomeGuideFinishHostRuntime.applyHomeGuideFinishFromContext` 调用（含 seen 标记、设置同步与完成提示触发）
  - `home-guide-finish-host` 已承接结束态 `localStorage` 上下文解析（`applyHomeGuideFinishFromContext`），`index_ui.js` 不再页面层读取 `localStorage`
  - 新增 `src/bootstrap/home-guide-start-host.ts` + `js/core_home_guide_start_host_runtime.js`，`index_ui.js` 委托引导启动生命周期状态装配（首页 gate、steps 装配、overlay/panel 展示态应用）
  - 新增 `src/bootstrap/home-guide-controls-host.ts` + `js/core_home_guide_controls_host_runtime.js`，`index_ui.js` 委托引导控制按钮绑定与动作派发（prev/next/skip）以及首步触发/设置同步编排
  - `index_ui.js` 的 `startHomeGuide` 已收敛为 `CoreHomeGuideStartHostRuntime.applyHomeGuideStart + CoreHomeGuideControlsHostRuntime.applyHomeGuideControls` 串联调用（页面层移除按钮绑定与 skip 完成态分支）
  - 新增 `src/bootstrap/home-guide-step-view-host.ts` + `js/core_home_guide_step_view_host_runtime.js`，`index_ui.js` 委托引导步骤文案/按钮状态渲染与面板重定位调度编排
  - `index_ui.js` 的 `showHomeGuideStep` 已移除本地 DOM 渲染分支，改为 `CoreHomeGuideStepViewHostRuntime.applyHomeGuideStepView` 调用（渲染模型仍由 `home-guide` runtime 提供）
  - 新增 `src/bootstrap/home-guide-step-flow-host.ts` + `js/core_home_guide_step_flow_host_runtime.js`，`index_ui.js` 委托引导步骤流程决策（边界/完成/目标跳过）与目标副作用编排（滚动/高亮/层提升）
  - `index_ui.js` 的 `showHomeGuideStep` 已收敛为 `CoreHomeGuideStepFlowHostRuntime.applyHomeGuideStepFlow + CoreHomeGuideStepViewHostRuntime.applyHomeGuideStepView` 串联调用（页面层移除 completed/target/scroll 分支）
  - 新增 `src/bootstrap/home-guide-step-host.ts` + `js/core_home_guide_step_host_runtime.js`，`index_ui.js` 委托单步编排主链（flow/view 串联、递进决策与完成态短路）
  - `home-guide-step-host` 已承接步骤递进循环编排（`applyHomeGuideStepOrchestration`），`index_ui.js` 的 `showHomeGuideStep` 不再保留页面层递归触发分支
  - 新增 `src/bootstrap/home-guide-highlight-host.ts` + `js/core_home_guide_highlight_host_runtime.js`，`index_ui.js` 委托引导高亮清理与层提升样式编排（target/scoped/elevated class 管理）
  - `index_ui.js` 的 `clearHomeGuideHighlight/elevateHomeGuideTarget` 已收敛为 `CoreHomeGuideHighlightHostRuntime` 调用（页面层移除 classList 操作分支）
  - 新增 `src/bootstrap/home-guide-panel-host.ts` + `js/core_home_guide_panel_host_runtime.js`，`index_ui.js` 委托引导面板定位与目标可见性判定编排（panel layout 两阶段计算 + getComputedStyle 透传）
  - `index_ui.js` 的 `positionHomeGuidePanel/isElementVisibleForGuide` 已收敛为 `CoreHomeGuidePanelHostRuntime` 调用（页面层移除 panel/viewport/layout 细节分支）
  - 新增 `src/bootstrap/home-guide-startup-host.ts` + `js/core_home_guide_startup_host_runtime.js`，`index_ui.js` 委托首页新手引导自动启动编排（路径判定/存储判定/延迟调度）
  - `index_ui.js` 的 `autoStartHomeGuideIfNeeded` 已收敛为 `CoreHomeGuideStartupHostRuntime.applyHomeGuideAutoStart` 调用
  - 新增 `src/bootstrap/home-guide-page-host.ts` + `js/core_home_guide_page_host_runtime.js`，`index_ui.js` 委托首页指引页面级编排（settings host + startup host 参数装配）
  - `home-guide-page-host` 已新增页面级 resolver 创建（`createHomeGuidePageResolvers`），`index_ui.js` 不再本地声明 `isHomePage/getHomeGuideSteps` 包装函数
  - `home-guide-page-host` 已扩展页面级 resolver（`ensureHomeGuideDom/clearHomeGuideHighlight/elevateHomeGuideTarget/positionHomeGuidePanel/isElementVisibleForGuide/showHomeGuideDoneNotice`），`index_ui.js` 不再本地声明对应包装函数
  - `home-guide-page-host` 已扩展页面级编排 resolver（`finishHomeGuide/showHomeGuideStep/startHomeGuide`），`index_ui.js` 不再本地声明这三个链路包装函数
  - `home-guide-page-host` 已扩展生命周期 resolver（`createHomeGuideLifecycleResolvers`），统一承接 `initHomeGuideSettingsUI/autoStartHomeGuideIfNeeded` 页面级上下文装配
  - `index_ui.js` 的 `initHomeGuideSettingsUI/autoStartHomeGuideIfNeeded` 已改为消费 `createHomeGuideLifecycleResolvers` 返回函数，页面层移除 settings/startup host 入参拼装分支
  - `home-guide-page-host` 生命周期 resolver 已支持从 `window.closeSettingsModal` 动态解析关闭动作；`index_ui.js` 移除 `closeSettingsModal` 页面层透传包装
  - `settings-modal-page-host` 与 `home-guide-page-host` 已统一从 window 上下文解析 `syncMobileTimerboxUI/syncHomeGuideSettingsUI`；`index_ui.js` 不再注入这两个 resolver 包装函数
  - `home-guide-page-host` 已承接自动启动 `localStorage` 上下文解析（`applyHomeGuideAutoStartPageFromContext`），`index_ui.js` 不再页面层读取 `localStorage`
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
    - 已扩展 `getVector/positionsEqual`，`game_manager.js` 对应方法改为优先委托 runtime（保留 fallback）
  - `src/core/timer-interval.ts` + `js/core_timer_interval_runtime.js`（计时刷新频率决策）
    - `game_manager.js#getTimerUpdateIntervalMs` 已改为优先委托 runtime（保留 fallback）
  - `game_manager.js#pretty` 已改为优先委托 `CorePrettyTimeRuntime.formatPrettyTime`（保留 fallback）
  - `src/core/mode.ts` + `js/core_mode_runtime.js` 已扩展 capped/undo/timer-leaderboard 策略函数
    - `game_manager.js#isCappedMode/getCappedTargetValue/isProgressiveCapped64Mode` 已改为优先委托 runtime（保留 fallback）
    - `game_manager.js#getForcedUndoSettingForMode/isUndoAllowedByMode/isUndoSettingFixedForMode/canToggleUndoSetting` 已改为优先委托 runtime（保留 fallback）
  - `game_manager.js#isTimerLeaderboardAvailableByMode` 已改为优先委托 runtime（保留 fallback）
  - `game_manager.js#getLegacyModeFromModeKey/resolveModeConfig` 已改为优先委托 `CoreModeRuntime` 的 legacy 映射函数（保留 fallback）
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
  - `src/core/game-settings-storage.ts` + `js/core_game_settings_storage_runtime.js`（本地设置存储 helper：flag/json map/payload）
  - `js/game_manager.js` 新增 `getCoreRuntimeByName` 通用解析器，`getCore*Runtime` 系列方法统一委托，减少重复 runtime 解析样板（行为不变）
  - `game_manager.js` 已新增 runtime method resolver 映射注册层（`GAME_MANAGER_CORE_RUNTIME_METHOD_RESOLVERS`），`resolveCore*RuntimeMethod` 统一由映射生成。
  - `game_manager.js` 中 move/grid/scoring/undo/replay/timer/special-rules 相关 runtime 方法调用点已统一改为 `resolveCore*RuntimeMethod(...)` helper，移除分散的字符串式解析样板。
  - `CoreModeRuntime` 已新增 `resolveModeConfigFromCatalog`，`game_manager.js#resolveModeConfig` 优先一次性委托 mode config 解析（resolvedModeId + modeConfig），并精简 legacy 回退分支（保留 alias + default fallback）。
  - `CoreModeRuntime` 已新增 `resolveCappedModeState`，`game_manager.js` 的 capped 判定主链（`isCappedMode/getCappedTargetValue/isProgressiveCapped64Mode/applyCappedRowVisibility/getCappedPlaceholderRowValues`）改为统一消费状态快照，减少重复 runtime 入参与回退样板。
  - `game_manager.js` 新增 `resolveProgressiveCapped64UnlockedState`，`resetProgressiveCapped64Rows/unlockProgressiveCapped64Row` 统一复用 capped64 状态归一化入口；新增 smoke 覆盖 `createProgressiveCapped64UnlockedState` runtime 委托。
  - `game_manager.js` 已改为通过 `CoreGameSettingsStorageRuntime` 读写统计面板开关、计时器模块视图、撤回设置与会话提交结果（页面层移除 direct localStorage 访问）
  - `game_manager.js` 新增 `resolveModePolicyContext`，统一 `mode/undo` runtime 解析入参，减少后续策略函数迁移的重复样板
  - 新增 `js/core_game_manager_common_runtime.js`（逻辑层）、`js/core_game_manager_static_runtime.js`（静态配置层）、`js/core_game_manager_bindings_runtime.js`（绑定层），并在 `index/play/undo/capped/practice/replay` 六页按 `common -> static -> bindings -> game_manager` 顺序加载
  - `game_manager.js` 已删除大部分内联逻辑，当前收敛为 12 行壳文件（构造器 + 两条初始化调用，行为保持不变）

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
  - parity session report / AB diff 已补充 `schemaVersion: 2`，为后续 canary 面板字段扩展与历史兼容留出版本边界
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
  - 新增 `src/bootstrap/history-controls-host.ts` + `js/core_history_controls_host_runtime.js`，`history_page.js` 委托模式筛选初始化与 toolbar/import/pager 绑定编排
  - `history-controls-host/history-toolbar-bind-host` 已继续承接筛选状态回写触发链（`applyHistoryFilterStateFromInputs`），`history_page.js` 不再保留 `readFilters` 页面层透传函数
  - 新增 `src/bootstrap/history-board.ts` + `js/core_history_board_runtime.js`，`history_page.js` 委托历史记录终盘棋盘 HTML 渲染（网格尺寸推断、tile 样式类、super tile 标识）
  - 新增 `src/bootstrap/history-runtime-contract.ts` + `js/core_history_runtime_contract_runtime.js`，`history_page.js` 统一委托历史页 runtime 依赖契约校验并集中收敛依赖对象
  - `history-runtime-contract` 已纳入 `CoreHistoryRecordListHostRuntime` 依赖校验，历史页列表渲染编排改走统一契约注入
  - 新增 `src/bootstrap/history-adapter-diagnostics.ts` + `js/core_history_adapter_diagnostics_runtime.js`，`history_page.js` 委托 adapter 诊断徽标与文案行模型计算
  - 新增 `src/bootstrap/history-adapter-host.ts` + `js/core_history_adapter_host_runtime.js`，`history_page.js` 委托 adapter 诊断徽标/诊断区渲染编排
  - 新增 `src/bootstrap/history-load-host.ts` + `js/core_history_load_host_runtime.js`，`history_page.js` 委托 load 后渲染编排（列表/汇总/burn-in/canary/status/pager）
  - `history-load-host` 已继续承接汇总/状态栏渲染入口（`applyHistorySummary/applyHistoryStatus`），`history_page.js` 不再保留 `buildSummary` 页面层透传函数
  - `history-load-host` 已继续承接列表/burn-in/canary 三块面板渲染委托（直连 `history-panel-host`），`history_page.js` 不再保留 `renderHistory/renderBurnInSummary/renderCanaryPolicy` 页面层透传函数
  - `history-load-host` 已继续承接列表加载一体化入口（`applyHistoryLoadWithPager`），`history_page.js` 不再本地读取分页按钮并手工应用禁用态
  - 新增 `src/bootstrap/history-load-entry-host.ts` + `js/core_history_load_entry_host_runtime.js`，`history_page.js` 委托加载入口编排（store guard + 筛选回写 + load-with-pager 调用）
  - 新增 `src/bootstrap/history-panel-host.ts` + `js/core_history_panel_host_runtime.js`，`history_page.js` 委托 burn-in/canary/list 三块面板渲染入口编排
  - `history-load-host` 已继续承接分页按钮状态应用（`applyHistoryPagerButtonState`），`history_page.js` 不再本地写 `prev/next.disabled`
  - 新增 `src/bootstrap/history-startup-host.ts` + `js/core_history_startup_host_runtime.js`，`history_page.js` 委托 DOMContentLoaded 启动编排（store 校验/初始化/首屏加载）
  - `history-startup-host` 已继续承接 controls host 直连编排（mode filter 初始化 + toolbar/import/pager 绑定），`history_page.js` 不再保留 `initModeFilter/bindToolbarActions` 页面层透传函数
  - 新增 `src/bootstrap/history-page-host.ts` + `js/core_history_page_host_runtime.js`，`history_page.js` 委托页面级 defaults/environment/runtime 解析与启动主链编排
  - `history_page.js` 已收敛为单一 `CoreHistoryPageHostRuntime.applyHistoryPageBootstrap` 调用
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

### M5 - 切换与收口（进行中）
目标：
- 默认启用新核心路径，清理重复代码，形成稳定发布。

交付物：
- 默认 adapter fallback 已切到 `core-adapter`（保留 `engine_adapter_force_legacy=1` 强制回滚优先级）。
- burn-in 面板新增观测指标：可比较一致率、连续窗口达标率、模式不一致 Top（按 mode_key）。
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
- Gate 0：`node scripts/game-manager-audit.mjs` 通过（防止 `GameManager.prototype` 回流为长方法体）。
- Gate 1：`npm run test:smoke` 通过。
- Gate 2：无未计划的玩法规则变更。
- Gate 3：PR 描述中明确可回滚路径。

## 5.1) 检查节奏（提效约定）
- 批次内快速检查（每完成 2-4 个小改动）：
  - `npm run test:unit`
  - `npm run test:smoke:adapter`（仅 adapter/burn-in 关键链路）
- 提交前全量检查（push 前必须）：
  - `npm run verify:refactor`

## 6) 立即执行项
1. 优先执行一键门禁：`npm run verify:refactor`（串行执行 game-manager-audit/unit/smoke/build）。
2. 快速回归可先跑：`npm run test:smoke:adapter`（adapter rollout + history burn-in 相关用例）。
3. 继续削减入口脚本中的重复拼装逻辑，优先抽到 `src/bootstrap/*`。
4. 按 M5 执行 burn-in：保持默认 fallback 为 `core-adapter`，持续监控历史页 gate，并保留 `engine_adapter_force_legacy=1` 作为紧急回滚开关。
