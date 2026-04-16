# 安全与性能专项审计日志

维护规则：
- 本文件为专项累计日志，只追加，不覆盖历史记录。
- 每次复查新增一个按日期命名的二级标题，例如 `## 2026-04-20 第二次审计`。
- 若某条问题已修复，不删除旧结论，在新日期段落中补写“修复状态 / 复测结果 / 剩余风险”。

## 2026-04-16 第一次审计

### 审计范围

- 审计对象：当前仓库前端代码与本地 `dist` 页面行为。
- 审计目标：
  - 安全性：玩家是否能通过控制台、本地存储篡改、多开绕过、伪造参数等方式作弊。
  - 性能：玩家持续游玩后，页面流畅性和输入手感是否出现明显下降。
- 限制说明：本仓库未包含线上后端记分/战绩校验逻辑，因此所有“服务端是否最终拦截作弊”的结论均无法在本次审计中确认。

### 审计方法

- 静态代码审计：检查撤回、存档恢复、多开锁、排行榜提交、渲染与持久化链路。
- 动态验证：本地启动 `dist` 静态站点后，使用 Playwright 进行无撤回作弊、多开绕过、存档注入、长局性能采样。
- 本次动态测试环境：桌面浏览器无头模式，本地地址 `http://127.0.0.1:4173`。

### 结论摘要

- 安全性总评：当前前端实现不能作为反作弊边界。若上线后仍信任前端上传的分数、棋盘、回放或模式状态，玩家可以通过控制台或本地存储直接作弊。
- 性能总评：在本次桌面本地采样中，未观察到“局面越往后越明显变卡”的趋势；当前实现的主要性能风险集中在“每次 actuate 都触发存档/同步”和“每帧重建 tile DOM”，但现有节流与低性能模式暂时压住了问题。

### 安全性检查结果

#### 1. [高][已确认] 无撤回模式可以通过控制台强行执行撤回

结论：
- 无撤回模式并未真正移除撤回能力，只是前端 UI / 状态判定默认不允许触发。
- 运行时依然为每一步累计 `undo_stack`，控制台只要改写 `window.game_manager` 的判定函数，就能直接调用撤回。

代码证据：
- `js/core_game_manager_move_input_helpers_runtime.js:665`
  - 每次成功移动后都会执行 `pushRuntimeUndoEntryForMove(...)`，无条件压入撤回快照。
- `js/core_game_manager_undo_stats_helpers_runtime.js:684-688`
  - 撤回执行条件只检查 `manager.isUndoInteractionEnabled()`、撤回额度和 `undoStack.length`。
- `js/core_game_manager_undo_stats_helpers_runtime.js:921-960`
  - 满足条件后会直接从 `undoStack` 恢复局面。
- `js/core_undo_action_runtime.js:118-122`
  - `tryTriggerUndo()` 最终就是 `manager.move(-1)`。
- `js/core_bootstrap_runtime.js:69`
  - 全局暴露 `window.game_manager`。

动态验证结果：
- 模式：`standard_4x4_pow2_no_undo`
- 进行 5 步正常操作后：
  - 撤回前：`undoStack = 5`，`undoUsed = 0`，`canUndo = false`
  - 控制台改写：`window.game_manager.isUndoInteractionEnabled = () => true`
  - 然后执行：`window.game_manager.move(-1)`
  - 撤回后：`undoStack = 4`，`undoUsed = 1`
  - 棋盘与分数均发生回退：`score 16 -> 12`

影响：
- “无撤回模式”当前只能限制普通用户点击按钮，不能阻止会开控制台的玩家作弊。
- 如果排行榜、成就、挑战完成状态依赖这种模式前提，数据可信度不足。

修复建议：
- 无撤回模式下不要生成 `undo_stack` 快照，直接从数据层移除撤回能力。
- 生产环境不要把可写的 `window.game_manager` 作为公开作弊接口暴露给页面脚本。
- 若排行榜区分“可撤回 / 不可撤回”模式，服务端必须验证回放中不存在撤回动作。

#### 2. [高][已确认] 本地伪造存档可以恢复任意分数与棋盘

结论：
- 页面启动时会从 `localStorage`、`sessionStorage`、`window.name` 读取最近存档，并直接恢复棋盘与核心状态。
- 恢复前只做版本、模式、尺寸、规则集和最外层 board 结构检查，没有验证“该分数 / 棋盘是否可达”。

代码证据：
- `js/core_game_manager_saved_state_helpers_runtime.js:240-246`
  - 恢复判定只检查版本、终局、模式、尺寸/规则集和 board 外层结构。
- `js/core_game_manager_saved_state_helpers_runtime.js:1484-1492`
  - `applySavedStateRestore()` 直接 `setBoardFromMatrix(manager, saved.board)` 并应用核心状态。
- `js/core_game_manager_saved_state_helpers_runtime.js:219-220`
  - 会从保存键中读取存档。
- `js/core_game_manager_saved_state_helpers_runtime.js:353-410`
  - 还会读写 `window.name` 存档副本。

动态验证结果：
- 模式：`standard_4x4_pow2_no_undo`
- 先在同源页面预写入以下伪造状态：
  - `savedGameStateLiteByMode:v1:standard_4x4_pow2_no_undo`
  - `savedGameStateByMode:v1:standard_4x4_pow2_no_undo`
  - `savedGameStateSyncByMode:v1:standard_4x4_pow2_no_undo`
  - `window.name` 中的 `__gm_saved_state_v1__`
- 伪造内容包括：
  - `score = 424242`
  - 棋盘首行两个 `1024`
- 重新进入游戏页后，页面实际恢复为伪造结果：
  - 分数显示 `424242`
  - 页面存在两个 `1024` tile
  - 本地轻量存档被页面继续接受并回写

影响：
- 玩家可以伪造非法对局进度，再继续游玩或触发后续上传逻辑。
- 如果服务端接受客户端上报的盘面、分数或结束状态，伪造存档会成为稳定作弊入口。

修复建议：
- 恢复态必须验证可达性，至少校验“棋盘、分数、回放、步数”一致。
- 更稳妥的做法是：排行榜相关模式不信任本地恢复态，改为服务端签名快照或服务端保存进度。
- 不要把 `window.name` 作为可信存档渠道。

#### 3. [高][代码确认] 排行榜 / 战绩提交由前端直接构造请求，若后端不做重算校验则可直接伪造

结论：
- 当前前端可以直接构造任意 payload 提交到 `/score` 与 `/records`。
- 这本身不一定代表线上一定能作弊，但如果后端没有按回放重算、没有签名校验、没有服务器权威状态，前端可直接伪造提交。

代码证据：
- `js/online_leaderboard_runtime.js:708-723`
  - `submitScore(scoreOrPayload, modeLike)` 与 `submitRecord(payload)` 直接把对象 POST 到接口。
- `js/online_leaderboard_runtime.js:1419-1424`
  - `OnlineLeaderboardRuntime.submitScore` / `submitRecord` 挂在全局对象上。

影响：
- 浏览器控制台可直接调用全局提交函数。
- 若上线后服务端只做“字段格式校验”而不做“对局真实性校验”，排行榜会被秒穿。

修复建议：
- 排行榜与战绩必须采用服务端权威计算。
- 客户端只上传操作流 / 回放，服务端重放并重算最终棋盘、分数、用时、撤回次数、模式合法性。
- 对高价值模式增加账号风控、速率限制和异常分数审计。

#### 4. [中][已确认] 多开页面检测只能约束同一存储域，无法阻止跨上下文多开

结论：
- 当前多开检测依赖 `localStorage` 锁；它只能限制“同一浏览器同一存储上下文”的情况。
- 换一个存储上下文（例如隐身窗口、独立 profile、嵌入式 webview）就能绕过。
- 当 `localStorage` 不可用时，代码直接放行。

代码证据：
- `js/core_play_startup_host_runtime.js:218-221`
  - 没有 `storageLike` 时直接返回 `{ ok: true }`。
- `js/core_game_manager_restart_setup_helpers_runtime.js:908-913`
  - 页面重开检测同样在 `storageLike` 不可用时直接 `return true`。
- `js/core_play_startup_host_runtime.js:11`
  - 锁键前缀为 `playModeSinglePageLock:v1:`

动态验证结果：
- 使用两个相互隔离的 Playwright 浏览器上下文，同时打开同一模式：
  - 页面 1：成功进入，`hasManager = true`
  - 页面 2：同样成功进入，`hasManager = true`
  - 两边各自写入了自己的 `playModeSinglePageLock:v1:standard_4x4_pow2_no_undo`

影响：
- 若某些模式希望通过“禁止多开”来维持公平性，当前方案只能拦住最基础的同上下文重复打开。
- 不能把它当作真正的防作弊措施。

修复建议：
- 若业务上必须限制多开，需要使用账号级服务端会话租约、实时心跳或服务器锁，而不是只靠 `localStorage`。
- 至少可增加 `BroadcastChannel` / `SharedWorker` 作为同浏览器增强手段，但这仍不是最终防线。

### 性能检查结果

#### 总结

- 本次采样未观察到随着对局推进而出现持续恶化的输入延迟或渲染耗时。
- 当前最值得持续盯防的热点不是“单次渲染过重”，而是“每次 actuate 都会触发一次同步快照与一次存档流程”。

#### 代码层热点

1. 每次 `actuate` 后都会进入持久化流程
- `js/core_game_manager_stats_display_helpers_runtime.js:230-244`
- 先 `publishSavedStateSyncSnapshot(manager)`，再 `saveGameState(manager)`。

2. 完整存档包含 move / undo / replay 等历史字段
- `js/core_game_manager_saved_state_helpers_runtime.js:1123-1132`
- 完整载荷中包含 `move_history`、`undo_stack`、`redo_stack`、`replay_compact_log`、`session_replay_v3`、`replay_string`。

3. 当前已有节流，减轻了每步序列化成本
- `js/core_game_manager_saved_state_helpers_runtime.js:456-483`
- 非 Mobile Safari 下：
  - 存档节流间隔 `350ms`
  - 完整存档间隔 `5000ms`

4. 跨页同步快照已做轻量化裁剪
- `js/core_game_manager_saved_state_helpers_runtime.js:1548-1561`
- 同步快照故意把 `move_history`、`undo_stack` 等字段清空，避免每步都序列化完整回放。

5. 渲染时会重建 tile 容器
- `js/html_actuator.js:27-40`
- 每次渲染都会 `clearContainer(this.tileContainer)` 后重新插入 tile。

6. 大棋盘已有低性能模式
- `js/html_actuator.js:115-120`
- 当 `cols * rows >= 64` 时开启 `board-low-perf`。
- `js/theme_manager.js:1376-1380`
- 低性能模式会关闭 transition / animation / 装饰效果。

#### 动态采样结果

| 模式 | 成功步数 | 早期平均 move 调用 | 后期平均 move 调用 | 早期平均 render | 后期平均 render | 早期完整状态大小 | 后期完整状态大小 | 结论 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `standard_4x4_pow2_no_undo` | 94 | 1.45ms | 1.83ms | 0.69ms | 0.67ms | 5016B | 4765B | 未见明显劣化 |
| `board_10x10_pow2_no_undo` | 120 | 1.62ms | 1.27ms | 0.77ms | 0.70ms | 5386B | 5386B | 未见明显劣化，且已进入低性能模式 |

补充观察：
- 4x4 样本中，`maxUndoStack = 94`、`maxMoveHistory = 94`，即便是无撤回模式也在持续积累撤回历史。
- 10x10 样本中，`lowPerfSeen = true`，说明大棋盘降级逻辑已实际生效。
- 本次是桌面本地无头采样，不能替代低端手机、真实高刷新屏、生产网络环境下的体感验证。

#### 性能风险判断

- 短中局：当前风险较低，未发现“越玩越卡”的明显证据。
- 长局 / 大棋盘 / 弱设备：中期仍需关注，尤其是以下场景：
  - 历史字段继续增长且完整存档触发更频繁。
  - 后续增加更多 DOM 统计面板、动画或特效。
  - 排行榜、实时同步、录像回放叠加到同一对局线程。

### 修复优先级建议

1. P0：把排行榜和战绩改成服务端权威校验，不再信任前端上传结果。
2. P1：无撤回模式下彻底停用 `undo_stack` 生成，并避免把 `window.game_manager` 暴露为可写作弊入口。
3. P1：收紧存档恢复逻辑，至少校验“棋盘 / 分数 / 步数 / 回放”一致性；更优方案是服务端签名或服务端保存。
4. P2：若确实需要限制多开，改为账号级服务端锁；前端本地锁只能作为提示，不应视作安全措施。
5. P2：为对局过程增加性能埋点，持续记录 `actuate`、序列化耗时、存档体积和 tile 数量。
6. P3：补做真机性能复测，重点覆盖低端 Android、iOS Safari、大棋盘模式、长局模式。

### 下次续写要求

- 下次检查请直接续写到本文件，不新建第二份同类审计日志。
- 新增段落需至少包含：
  - 复查日期
  - 代码变更范围
  - 本次新增发现 / 已修复项 / 未修复项
  - 动态复测结果
  - 与上次结论相比的变化

## 2026-04-16 高风险修复实施

### 本次落地修改

- 已修复：无撤回模式不再在成功移动后生成 `undo_stack` 快照。
- 已修复：撤回执行链不再只信任可被控制台重写的 `manager.isUndoInteractionEnabled()`，而是重新按当前模式策略判定。
- 已修复：ranked 模式不再启用本地 saved-state 持久化与恢复，从前端侧直接切断“伪造 localStorage / window.name 继续对局”的入口。
- 已修复：saved-state 恢复时，如果当前模式不允许撤回，则会主动丢弃 `undo_stack / redo_stack`，避免通过伪造存档恢复撤回能力。
- 已加固：排行榜运行时不再把 `submitScore / submitRecord` 暴露为现成的全局调用入口，并为内部提交通道增加私有 token 校验，降低控制台直接构造上传的便利性。

### 代码范围

- `js/core_game_manager_move_input_helpers_runtime.js`
- `js/core_game_manager_undo_stats_helpers_runtime.js`
- `js/core_game_manager_saved_state_helpers_runtime.js`
- `js/online_leaderboard_runtime.js`
- `tests/smoke/pages-play-anti-cheat.smoke.spec.ts`
- `tests/smoke/pages-contracts-saved-session.smoke.spec.ts`

### 复测关注点

- 无撤回模式在篡改 `game_manager` 运行时标志后，`move(-1)` 不应再改变棋盘、分数或 `undoUsed`。
- ranked 模式预先注入的本地 saved-state 不应被恢复。
- 现有自动提交流程仍应可用，但控制台不应再直接复用公开的 `submitScore / submitRecord` 帮助函数。

### 剩余风险

- “客户端可构造任意上传”这一问题无法只靠前端彻底解决；服务端仍必须以回放重算、模式校验、撤回校验为准。
- 多开页面检测仍是前端本地锁，只能算提示机制，不是强安全措施。

## 2026-04-16 后端 Worker 权威校验落地

### 本次落地修改

- 已修复：Cloudflare Worker 的 `/api/score` 不再默认信任客户端上传的 `score`、`min_steps_*`；当请求携带 `replay_string` 时，后端会先重放并重算分数、步数和目标 tile，再写入排行榜。
- 已修复：ranked 模式如果调用 `/api/score` 时没有附带回放，后端不再接受该分数进入排行榜，而是返回 `skipped: true`、`reason: verified_record_required`。
- 已修复：`/api/records` 不再信任客户端上传的 `score`、`best_tile`、`duration_ms`、`final_board`；这些字段全部改为以后端重放结果为准。
- 已修复：无撤回模式回放中若出现 `undo1` / `undon`，后端会明确拒绝并返回 `REPLAY_UNDO_FORBIDDEN`。
- 已修复：模式、棋盘尺寸、规则集与回放不一致时，后端会拒绝并返回 `REPLAY_MODE_MISMATCH`。
- 已加固：重复 `client_record_id` 的记录在返回 `duplicate: true` 的同时，会再次按已验证结果同步排行榜，避免因重试或刷新导致排行榜漏同步。
- 已加固：上传到对象存储的 replay envelope 额外记录 `verification_version`、`successful_move_count`、`undo_used`、`min_steps_*` 以及 `client_claimed` 审计字段，便于后续追查客户端伪造企图。

### 代码范围

- `G:\2048\2048undo\2048-game-api\2048-game-api\src\index.ts`
- `G:\2048\2048undo\2048-game-api\2048-game-api\src\replay_verify.ts`
- `G:\2048\2048undo\2048-game-api\2048-game-api\test\index.spec.ts`
- `G:\2048\2048undo\2048-game-api\2048-game-api\vitest.config.mts`

### 后端规则变化

- `/api/score`
  - ranked 模式 + 有 `replay_string`：后端重放校验后再更新 `scores` / `mode_scores`。
  - ranked 模式 + 无 `replay_string`：不落榜，返回 `verified_record_required`。
  - 非 ranked / 兼容旧桶：仍保留旧提交流程。
- `/api/records`
  - 必须带回放。
  - 必须是已终局对局。
  - 以回放重算后的 `score`、`best_tile`、`duration_ms`、`final_board`、`mode_key` 为准写库和上云。
  - 写库后再同步 `scores` / `mode_scores`，使战绩与排行榜保持同一权威来源。

### 动态复测结果

- 运行环境：本地 Miniflare + D1，本地关闭 `remoteBindings`，避免误连线上远端库。
- 类型检查：`npx tsc --noEmit` 通过。
- Worker 回归：`npx vitest run test/index.spec.ts` 全量 21 条通过。
- 本次新增关键用例全部通过：
  - ranked 分数提交流程在无回放时被跳过，不再入榜。
  - forged score 在有回放时被后端重算覆盖。
  - forged `best_tile` / `duration_ms` / `final_board` 在 `/api/records` 中被后端重算覆盖。
  - 无撤回模式回放中的 undo 被拒绝。
  - 模式不匹配回放被拒绝。

### 与上次结论相比的变化

- 上次结论中的“排行榜/战绩提交若后端不重算校验则可直接伪造提交”，现在在 Worker 侧已经完成第一阶段收口。
- 目前排行榜可信度已经从“前端声明式”提升为“后端按回放重算式”，但前提是请求里必须携带合法回放。
- 仍需继续推进的衔接点：
  - 前端若还要继续使用 ranked `/api/score`，应补传 `replay_string`；否则该接口会稳定返回 `verified_record_required`。
  - 服务端若未来新增模式，必须同步补充 `replay_verify.ts` 中的模式规格与规则映射。
  - 若要进一步防刷，还应叠加账号级速率限制、异常分数审计和对象存储回放抽检。

## 2026-04-16 刷新恢复计时与回放完整性复查

### 本次新增发现

- 存在一个刷新恢复竞态：当玩家高速对局后立即刷新页面时，恢复逻辑可能优先选中“较新的 lite 快照”而不是“同时间戳的完整快照”。
- 该问题不会直接破坏棋盘、分数和总时长恢复，但会丢失完整快照里才有的计时器里程碑 DOM 状态与部分回放上下文，表现为：
  - 主计时器仍显示；
  - 右侧里程碑计时出现空白或缺失；
  - 回放导出/继续恢复信息不完整。

### 根因定位

- `saveGameState(..., { force: true })` 之前虽然会构建 full payload，但 `window.name` 兜底通道仍然只写入 lite payload。
- 恢复阶段在多个候选快照 `saved_at` 相同的情况下，原逻辑默认保留先遇到的候选项，实际会让 localStorage 的 lite 快照压过 `window.name` 中更完整的 full 快照。

### 本次落地修改

- 已修复：强制保存时，`window.name` 兜底快照改为优先写入 full payload，而不是 lite payload。
- 已修复：恢复阶段在 `saved_at` 相同的情况下，会优先选择包含计时器完整快照字段的 richer payload。
- 本次改动范围：
  - `js/core_game_manager_saved_state_helpers_runtime.js`
  - `tests/unit/core-game-manager-saved-state-runtime.spec.ts`
  - `tests/smoke/pages-contracts-saved-session.smoke.spec.ts`

### 动态复测结果

- 单测：`npx vitest run tests/unit/core-game-manager-saved-state-runtime.spec.ts` 9/9 通过。
- 烟测：`npx playwright test --config=playwright.config.ts tests/smoke/pages-contracts-saved-session.smoke.spec.ts -g "saved-state payload contract holds after forced save"` 通过。
- 本次新增校验点：
  - 同时间戳候选快照中，完整快照优先级高于 lite 快照。
  - 强制保存后，`window.name` 中当前模式对应的 payload 已包含 `timer_fixed_rows` 等完整计时器快照字段。

### 与上次结论相比的变化

- 上次结论中的“saved-state 恢复仍需继续收紧一致性校验”现在前进了一步：刷新场景下的完整快照恢复优先级已修正。
- 当前这类问题已从“容易在高速刷新时直接丢里程碑计时/回放上下文”收敛为“依赖完整快照字段的恢复链路更稳定”。
- 仍建议继续关注的边界：
  - 极端长局下 full payload 的体积增长是否会带来新的持久化压力。
  - 移动端浏览器在 `pagehide`/`beforeunload` 时序上的兼容差异。
