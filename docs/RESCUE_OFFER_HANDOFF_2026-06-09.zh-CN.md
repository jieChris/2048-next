# 签发恢复单功能交接文档

更新时间：2026-06-09

本文件用于把 `2048-next` 前端项目和 `2048-ranked` 后端项目交给新的 Codex 会话时，快速说明“管理员签发恢复单”功能的当前状态、关键文件、数据流、已修问题和后续风险点。

## 项目位置

- 前端仓库：`/Users/a19/Documents/Codex/2026-06-04/visa/2048-next-logo-work`
- 后端仓库：`/Users/a19/Documents/Codex/2026-06-04/visa/2048-ranked`
- 前端线上静态目录：`/root/migrations/2048-next/current`
- 前端线上容器：`site-2048-next`
- 后端线上容器：`ranked`
- 前端线上入口：`https://2048next.cn/`
- 管理端前端页面：`/admin.html`

## 最近相关提交

前端 `2048-next-logo-work`：

- `5d14e3a Clarify timer legend font sizing`
- `0969543 Ignore rescue offer presentation styles`
- `ab8ba4b Fix rescue saved-state persistence`
- `aa9f496 Fix large timer legend font size`
- `9628a91 Add rescue offer history view`
- `f370c11 Restore timer rows from rescue offers`
- `f223dd5 Preserve rescue replay data during sync restore`
- `b0f3f68 Persist rescue replay export fallback`
- `4699795 Restore replay export fallback`
- `d33add4 Keep ranked timers anchored across reloads`
- `3cc5326 Persist rescue ranked sessions`
- `1b8c4c0 Apply rescue ranked session context`
- `49d46a4 Add admin replay rescue upload UI`

后端 `2048-ranked`：

- `d863698 Strip presentation fields from rescue offers`
- `6ad1c52 Add rescue offer progress history`
- `0590635 Restore timer rows in rescue offers`
- `3cc13f0 Allow database super admins in game admin API`
- `228240d Fix rescue offer expiry normalization`
- `0e0d10c Fix rescue replay ranked session`
- `32a9999 Add admin replay rescue signing`
- `4ad6cbf Store replay state in rescue offers`

## 功能目标

理想状态：

- 超级管理员可以在 `admin.html` 上传回放文件或手动输入盘面，指定用户签发恢复单。
- 被指定用户进入游戏页后收到恢复提示，接受后该对局应与正常对局无异。
- 恢复后必须保留：
  - 盘面
  - 分数
  - 总计时器
  - 左侧分块计时器数据
  - 统计汇总数据
  - 导出回放所需数据
  - 排位会话上下文，确保结束后能正常上传记录
- 恢复单只传输游戏数据，不传输客户端表现层样式。尤其不能把 `font-size`、错误 class、隐藏样式等从恢复单带进页面。

## 前端关键文件

### 管理端 UI

- `admin.html`
  - 恢复单表单入口。
  - 关键 DOM：
    - `#admin-rescue-user-id`
    - `#admin-rescue-target-user`
    - `#admin-rescue-mode-select`
    - `#admin-rescue-replay-file`
    - `#admin-rescue-replay-text`
    - `#admin-create-rescue`
    - `#admin-create-rescue-from-replay`
    - `#admin-list-rescue`
    - `#admin-rescue-history`
    - `#admin-rescue-output`

- `src/pages/admin-page.ts`
  - `createRescueOffer()`：手动盘面签发，调用 `/admin/rescue-offers`。
  - `createRescueOfferFromReplay()`：上传/粘贴回放签发，调用 `/admin/rescue-offers/from-replay`。
  - `listRescueOffers()`：查看历史恢复单，调用 `/admin/rescue-offers`。
  - `renderRescueOfferHistory()`：渲染恢复单历史视图。
  - `rescueStatusLabel()`：恢复单状态文案。

### 用户端接收恢复单

- `js/admin_rescue_client_runtime.js`
  - `AdminRescueClientRuntime.scheduleCheck(manager)`：游戏启动后延迟检查恢复单。
  - `checkAndOfferRescue(manager)`：
    - GET `/api/rescue-offers/active?mode_key=...`
    - 弹出 confirm。
    - POST `/api/rescue-offers/:id/accept`
    - 调用 `applyOfferToManager(...)`
    - POST `/api/rescue-offers/:id/consume`
  - `applyOfferToManager(manager, offer, board, score, durationMs)`：
    - `restartWithBoard(board, manager.modeConfig, { skipStartTiles: true, disableStateRestore: true })`
    - 设置分数、计时器基础状态、对局状态。
    - 调用 `applyOfferReplayStateToManager(...)`。
    - 调用 `applyOfferSavedStatePayload(...)`。
    - 调用 `manager.startTimer()`、`manager.actuate()`、`manager.saveGameState({ force: true, forceFull: true })`。
  - `SAVED_STATE_OFFER_KEYS`：
    - 恢复单允许带入 saved-state 的字段白名单。
    - 重要字段包括：
      - `timer_status`
      - `timer_elapsed_offset_ms`
      - `timer_anchor_local_ms`
      - `timer_anchor_server_ms`
      - `timer_fixed_rows`
      - `timer_dynamic_rows_capped`
      - `timer_dynamic_rows_overflow`
      - `timer_secondary_rows`
      - `move_history`
      - `replay_compact_log`
      - `session_replay_v1`
      - `session_replay_v3`
      - `spawn_value_counts`
      - `replay_string`
      - `ranked_session_token`
  - `buildOfferSavedStatePayload(...)`：把恢复单转换为 `applySavedStateRestore` 可用的 saved-state。
  - `applyOfferSavedStatePayload(...)`：只有恢复单包含计时器 saved-state 时才调用 `applySavedStateRestore`。
  - `applyOfferReplayStateToManager(...)`：恢复统计汇总、回放导出、排位上下文。

- `js/core_bootstrap_runtime.js`
  - 创建 `window.game_manager` 后调用 `AdminRescueClientRuntime.scheduleCheck(manager)`。

### 保存/恢复游戏状态

- `js/core_game_manager_saved_state_helpers_runtime.js`
  - `saveGameState(manager, options)`：保存本地对局状态，恢复单接受后必须强制完整保存。
  - `applySavedStateRestore(manager, saved)`：恢复完整 saved-state。
  - `applySavedTimerFixedRowsState(manager, saved, cappedStateForRestore)`：恢复固定计时器行。
  - `applySavedDynamicTimerRowsState(manager, container, rowsState, cappedStateForRestore)`：恢复动态计时器行。
  - `applySavedTimerRowLegendState(...)`：恢复左侧计时器方块文本/class/字号。
  - `resolveTimerLegendFontSizeByValue(value)`：
    - `>= 16384`：`11px`
    - `>= 1024`：`14px`
    - `>= 128`：`18px`
    - 其他：`22px`
  - 当前设计：恢复单中的 `legendFontSize`、错误 `legendClass`、隐藏样式等表现层字段不应决定最终 UI；客户端按 tile 值重新计算。

- `js/core_game_manager_panel_timer_helpers_runtime.js`
  - `getCappedTimerLegendClass(manager, cappedTargetValue)`：左侧计时器方块 class。
  - `getCappedTimerLegendFontSize(manager, cappedTargetValue)`：左侧计时器方块字号。
  - `getCappedTimerFontSize(manager, cappedTargetValue)`：兼容别名，当前实际转调 `getCappedTimerLegendFontSize`。

- `js/core_game_manager_move_input_helpers_runtime.js`
  - 合成过程中创建/更新 capped 计时器相关行。
  - 近期改动点：应使用 `getCappedTimerLegendFontSize` 处理左侧方块字号。

- `js/core_game_manager_bindings_runtime.js`
  - 把 helper 绑定到 `GameManager` 实例。
  - 近期新增/确认绑定：`getCappedTimerLegendFontSize`。

### 回放导出

- `js/core_replay_export_runtime.js`
  - 导出回放核心逻辑。

- `src/bootstrap/replay-export.ts`
  - 导出回放按钮/弹窗 bootstrap。

相关历史问题：

- 恢复单接受后导出回放按钮曾无反应或报错。
- 根因主要是恢复单没有完整保留 `replay_string`、`session_replay_v1/v3`、`move_history`、`spawn_value_counts` 等字段。
- 当前前端会在 `applyOfferReplayStateToManager` 中恢复这些字段，并把 `replay_string` 存到 `manager.rescueReplayString`。

## 后端关键文件

### 游戏 API 总入口

- `src/app/api/game/[[...path]]/route.ts`
  - Next.js API route，转发到 game API runtime。

- `src/server/game/app.ts`
  - 恢复单主要接口都在这里。
  - `/api/admin/rescue-offers`
    - 超级管理员手动签发恢复单。
    - 需要 `isGameApiSuperAdmin(...)`。
    - 写入 `admin_rescue_offers`。
  - `/api/admin/rescue-offers/from-replay`
    - 超级管理员上传回放并签发。
    - 调用 `deriveAdminRescuePayloadFromReplay(...)` 从回放推导盘面、分数、计时器、统计信息。
    - ranked 模式会创建 `ranked_sessions`，并生成 `ranked_session_token`。
  - `/api/admin/rescue-offers`
    - GET 历史恢复单。
    - 返回签发历史、接受/拒绝/过期/消费状态，以及关联 ranked session 的进度。
  - `/api/rescue-offers/active`
    - 用户端查询自己的 pending 恢复单。
  - `/api/rescue-offers/:id/accept`
    - 用户接受恢复单，状态改为 `accepted`。
  - `/api/rescue-offers/:id/reject`
    - 用户拒绝恢复单，状态改为 `rejected`。
  - `/api/rescue-offers/:id/consume`
    - 用户成功应用恢复单后，状态改为 `consumed`。

重要后端函数：

- `sanitizeRescueOfferRow(row)`
  - 给前端返回恢复单字段。
  - 注意：最新后端提交 `d863698 Strip presentation fields from rescue offers`，目标是剥离表现层字段，避免把样式传给客户端。

- `sanitizeRescueTimerFixedRows(...)`
  - 清洗固定计时器行。
  - 期望只保留数据字段，例如 `repeat`、`timerText`、`legendText`。

- `sanitizeRescueTimerSecondaryRows(...)`
  - 清洗二级计时器行。

- `isGameApiSuperAdmin(pool, config, userId)`
  - 游戏 API 管理权限判断。
  - 支持配置型 `ADMIN_USER_IDS` 和数据库超级管理员。

### 回放解析

- `src/server/replay_verify.ts`
  - `deriveAdminRescuePayloadFromReplay(input)`：
    - 解码回放。
    - 验证/重放。
    - 推导最终盘面、分数、最佳块、总时长、move history、spawn 统计、session replay、计时器行。
  - `deriveAdminRescueTimerRows(decoded, mode)`：
    - 根据每步 `deltaMs` 累积 elapsedMs。
    - 每次合成目标值时记录首次合成时间。
  - `recordAdminRescueTimerMilestones(...)`：
    - 只记录第一次到达对应分块的时间。
  - `formatPrettyTime(...)`：
    - 把毫秒转成页面显示时间。
  - `AdminRescueTimerFixedRow` 当前数据结构：
    - `repeat`
    - `timerText`
    - `legendText`
  - 注意：这里不应输出 `legendClass`、`legendFontSize`、`display`、`visibility`、`pointerEvents` 这类表现层字段。

### 数据库

- `migrations/postgres/0001_trusted_ranked_schema.sql`
  - `game_data.admin_rescue_offers` 初始表定义。
  - 关键字段：
    - `id`
    - `user_id`
    - `mode_bucket`
    - `mode_key`
    - `board`
    - `score`
    - `duration_ms`
    - `replay_string`
    - `replay_sha256`
    - `move_history`
    - `replay_compact_log`
    - `session_replay_v1`
    - `session_replay_v3`
    - `spawn_value_counts`
    - `timer_fixed_rows`
    - `timer_secondary_rows`
    - `ruleset`
    - `challenge_id`
    - `seed`
    - `reason`
    - `status`
    - `created_by`
    - `accepted_at`
    - `rejected_at`
    - `consumed_at`
    - `expires_at`
    - `signature`
  - `status` 可选值：
    - `pending`
    - `accepted`
    - `rejected`
    - `consumed`
    - `expired`

- `migrations/postgres/0002_admin_rescue_replay_state.sql`
  - 给已有表补充回放、计时器、统计和 ranked 上下文字段。

## 数据流

### 管理员从回放签发

1. 管理员打开 `admin.html`。
2. 上传或粘贴 `REPLAY_v1RPL_B64_...`。
3. 前端 `createRescueOfferFromReplay()` 调用：
   - `POST /api/admin/rescue-offers/from-replay`
4. 后端：
   - 验证超级管理员。
   - 解析目标用户 ID/昵称。
   - 调用 `deriveAdminRescuePayloadFromReplay(...)`。
   - ranked 模式创建 `ranked_sessions`。
   - 写入 `admin_rescue_offers`。
5. 前端显示签发结果和历史列表。

### 用户接收恢复单

1. 用户打开游戏页。
2. `core_bootstrap_runtime.js` 创建 `window.game_manager`。
3. `AdminRescueClientRuntime.scheduleCheck(manager)` 延迟执行。
4. 用户端调用：
   - `GET /api/rescue-offers/active?mode_key=...`
5. 如果有恢复单：
   - confirm 询问是否接受。
   - 接受后调用 `/accept`。
   - `applyOfferToManager(...)` 应用恢复数据。
   - `saveGameState({ force: true, forceFull: true })` 持久化。
   - 调用 `/consume`。
6. 用户继续游玩。
7. 游戏结束后，按正常 ranked record 提交流程上传成绩。

## 表现层字段约束

恢复单应只携带数据，不携带 UI 表现层样式。

恢复单不应依赖或传输：

- `legendFontSize`
- `labelFontSize`
- `legendClass`
- `labelClass`
- `display`
- `visibility`
- `pointerEvents`
- 任意 CSS 字符串

客户端接收恢复单后应自行渲染：

- 左侧计时器方块 class：由 tile 值计算。
- 左侧计时器方块字号：
  - `32/64`：`22px`
  - `128/256/512`：`18px`
  - `1024/2048/4096/8192`：`14px`
  - `16384/32768/65536`：`11px`
- 右侧计时器文本字号：独立于左侧方块字号，通常由 `.timertile` CSS 渲染为 `19px`。

## 当前仍需关注的问题

### 窄屏/移动布局下左侧计时器文字溢出

用户截图显示：

- 正常数据已恢复。
- 但在窄屏/移动视口下，左侧计时器方块中的 `4096`、`8192`、`16384`、`32768` 文字出现横向溢出或被裁切。
- 这不是“恢复单是否带了 font-size”单一问题；即使 DOM 计算字号是正确的，也可能因为移动布局下左侧方块宽度、缩放、line-height、padding、font weight 或容器宽度变化导致视觉溢出。

重要教训：

- 之前只在桌面宽度用 Playwright 读取 `getComputedStyle(...).fontSize`，结论不完整。
- 后续修复必须在窄屏视口复现并截图验证，不能只看 DOM 字号。

建议下一步：

1. 在 Playwright 使用接近截图尺寸的 viewport，例如 `506x842` 或手机宽度。
2. 模拟接收恢复单，或使用真实测试恢复单。
3. 读取并截图：
   - `#timer-row-4096 .timertile:not([id])`
   - `#timer-row-8192 .timertile:not([id])`
   - `#timer-row-16384 .timertile:not([id])`
   - `#timer-row-32768 .timertile:not([id])`
4. 检查：
   - 左侧 legend 的 `font-size`
   - `line-height`
   - `width`
   - `height`
   - `padding`
   - `box-sizing`
   - `overflow`
   - `transform`
   - `getBoundingClientRect()`
   - 文本是否超出父容器。
5. 修复方向应优先是 CSS/布局约束，而不是把恢复单字段改回样式传输。

### 动态计时器行与固定计时器行可能重复显示

页面中可能同时存在：

- 固定行：`#timer-row-1024`、`#timer-row-8192` 等。
- 动态行：`#timerbox .timer-row-item`。

如果出现重复或布局异常，需要检查：

- `applySavedTimerFixedRowsState(...)`
- `applySavedDynamicTimerRowsState(...)`
- `applySavedTimerSubState(...)`
- `timer_dynamic_rows_capped`
- `timer_dynamic_rows_overflow`
- `timer_secondary_rows`

### 恢复后刷新丢失对局

历史上出现过恢复单接收成功后，刷新页面变成新开局的问题。

关键点：

- `applyOfferToManager(...)` 最后必须调用：
  - `manager.saveGameState({ force: true, forceFull: true })`
- `saveGameState` 必须保存完整 saved-state，而不是只保存盘面。
- 验证时要接受恢复单后刷新页面，确认盘面、分数、计时器、回放数据仍在。

### 恢复后导出回放按钮不可用

历史上出现过恢复单对局点击导出回放无反应或报错。

关键点：

- `manager.rescueReplayString`
- `manager.replayCompactLog`
- `manager.sessionReplayV1`
- `manager.sessionReplayV3`
- `manager.moveHistory`
- `manager.spawnValueCounts`

上述字段缺失会影响统计汇总和导出回放。

## 推荐验证命令

前端单测：

```bash
npx vitest run tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/admin-rescue-client-runtime.spec.ts tests/unit/core-mode.spec.ts
```

前端审计：

```bash
npm run audit:game-manager
```

前端构建：

```bash
npm run build
```

后端恢复单相关单测：

```bash
pnpm vitest run tests/unit/admin-rescue-offer-route.test.ts tests/unit/admin-rescue-replay.test.ts
```

后端构建/类型检查按仓库现有脚本执行，先查看：

```bash
pnpm run
```

## 推荐页面级验证

必须覆盖两类视口：

- 桌面：`1280x900`
- 窄屏：建议 `506x842`，或者更接近用户截图的尺寸

验证点：

- API 是否命中：
  - `/api/rescue-offers/active`
  - `/api/rescue-offers/:id/accept`
  - `/api/rescue-offers/:id/consume`
- 接收后：
  - 盘面正确
  - 分数正确
  - 总计时器继续走
  - 分块计时器有数据
  - 左侧计时器方块文字不溢出
  - 右侧计时器文本字号不被左侧逻辑影响
  - 刷新后对局仍存在
  - 导出回放按钮可打开
  - 结束后能上传记录

## 部署注意事项

前端 workflow：

- `.github/workflows/deploy-self-hosted.yml`

手动部署时必须注意：

- `site-2048-next` 需要接入 `edge-migrate-net`，否则 `edge-proxy` 访问 `site-2048-next:80` 会解析失败或使用旧 IP，公网出现 `502`。
- workflow 已包含：
  - `docker network inspect edge-migrate-net`
  - `docker run --network edge-migrate-net ...`

手动验证：

```bash
ssh visa 'readlink -f /root/migrations/2048-next/current'
ssh visa 'docker ps --filter name=site-2048-next --format "{{.Names}} {{.Status}} {{.Ports}}"'
ssh visa 'docker exec edge-proxy getent hosts site-2048-next'
curl -I https://2048next.cn/2048.html
```

## 给后续 Codex 的操作原则

- 不要把恢复单中的样式字段当成真相。
- 不要通过传输样式解决计时器字体问题。
- 先复现用户截图对应的窄屏视觉问题，再改。
- 修复字体/布局时，区分：
  - 左侧计时器方块文字。
  - 右侧计时器时间文本。
- 验证不能只读 `font-size`，必须截图或检查文本 bounding box 是否超出父容器。
- 不要操作或杀用户真实 Chrome；用 Playwright/headless 或 Codex in-app browser 验证。
- 提交前保留 `output/` 未跟踪文件，不要加入提交。

