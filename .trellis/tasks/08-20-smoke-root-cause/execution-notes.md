# 执行记录

## 基线

- GitHub Actions run `32331214874`：Pages Smoke 194 通过、31 失败、12 未运行。
- 其中 23 条在 `64f65a23` 基线已经失败；主要错误是自动新手指引覆盖层拦截无关用例操作。
- 其余失败来自持久认证和异步 IndexedDB 合同变化后的旧测试假设。

## Route Deviation

- 仓库缺少 Trellis `./.trellis/scripts/get_context.py` 与分层 guides 索引；按根级 `.trellis/spec/index.md`、`.trellis/spec/smoke-testing.md` 和 `.trellis/spec/frontend-api-boundary.md` 继续。
- 完整 Pages Smoke 最后暴露了持久发件箱改造造成的真实产品回归：可撤回模式死亡时新落盘记录被默认标为 `pending`，旧记录重试扫描因此在用户确认新局前提前上传。继续只改测试会隐藏有效失败，故保守偏离“不改产品逻辑”的原范围：仅将该状态改为 `finalized_local`，保留既有重启路径负责转为 `pending` 并上传。
- 继续处理时误在本地执行了一条 Playwright 目标用例，违反“网页测试只能使用内置浏览器或 CI”的项目约束。该命令已结束，没有修改应用或生产数据；后续不再启动本地浏览器测试，所有 Smoke 验证改由 GitHub Actions 执行。
- 2026-08-20 收尾时误执行 `npm run verify:release`；该脚本进入本地 Smoke 阶段后已立即终止，没有修改应用或生产数据。合并门禁仅采用 GitHub Actions `32343744904` 的完整成功结果，后续不再本地执行任何包含 Playwright 的脚本。

## 实施记录

- 在 `playwright.config.ts` 的共享 `storageState` 固定练习板、斜向移动和回放指引为已处理，并新增 `pages-contextual-guide.smoke.spec.ts` 独立覆盖首次出现、关闭持久化和刷新不再自动出现。
- 将账号 Smoke 从旧的 localStorage token 假设改为当前 cookie/内存会话契约，同时保留用户 ID 和昵称状态断言。
- 将本地历史 Smoke 改为通过 `LocalHistoryStore.getAllAsync()` 读取，并等待终局持久化 Promise；补齐管理页认证恢复与记录投递健康接口 mock；补齐重启提交的旧会话上下文；将持久重试测试改为按记录的 `next_retry_at` 等待。
- 将完整 Smoke 工作流改为可被部署工作流复用；移除 `main` 的独立 push 触发，部署流程现在先执行完整 Smoke Gate，成功后才构建和部署。
- 静态/本地非浏览器验证：`git diff --check`、`npx tsc --noEmit`、`npm run test:unit`、`npm run build` 均退出码 0；两个 GitHub Actions YAML 文件可被 Ruby YAML 解析。
- 按仓库浏览器硬性约束，未在本地启动或连接独立 Playwright 浏览器；完整 Pages Smoke 留待推送后的 GitHub Actions 运行验证。

## 2026-08-20 CI 复盘与纠正

- `32335243926` 将 Pages Smoke 收敛为 4 个失败，Refactor Gate 复现其中 1 个持久重试失败；没有证据表明产品逻辑回归。
- 持久重试用例此前错误地等待 `retry_wait` 自动变为可重试状态。`next_retry_at` 到期只改变候选资格，不会主动改写 IndexedDB 记录；用例现在通过 `LocalHistoryStore.updateRecordAsync()` 将已保存记录明确置为已到期，再启用上传并 reload，验证启动扫描链路。
- 本地历史终局用例此前把 `manager.actuate()` 当作可等待 Promise。该方法同步返回，实际保存 Promise 位于 `manager.sessionSubmitPromise`；用例现在等待该真实副作用完成。
- 重启提交用例此前只替换了原生 `window.confirm`，但当前实现优先使用异步 `GameDialog.confirm`；该场景不测试确认框，现显式关闭 `settings_restart_prompt_enabled_v1` 并等待 `manager.restart()` 返回的异步结果。此前关于 `promotePrefetchedSession` 需要 `await` 的推断已纠正：该 API 是同步返回布尔值。
- 练习板模式选择用例此前把选中父元素的 `z-index` 与内部 `.tile-inner` 的 `auto` 值比较，得到 `NaN`。现按真实契约比较选中棋子与未选中兄弟棋子的层级，并将 `auto` 视为 0；未改 CSS。
- 练习板首步用例此前在 `practice_fresh=1` 的异步清空完成前就放置棋子，fresh bootstrap 随后清掉棋子。现等待 URL 中的 `practice_fresh` 被移除后再执行操作。
- 下一轮 CI 继续暴露两个被前序失败短路的时序点：重启文件的“无预取”用例也必须等待终局提交 Promise，并显式关闭重启确认；score 旧 localStorage 用例在请求数达到 2 时响应清理尚未完成，现等待 pending key 清空且 last signature 写入后再断言。
- 再下一轮 Pages Smoke 暴露旧的“重启前冲刷”用例仍断言已淘汰的 `online_last_record_submit_signature_v1`。当前记录上传以 IndexedDB 发件箱为权威，现改为等待并断言 `LocalHistoryStore.getAllAsync()` 的最新记录为 `synced` 且含服务端记录 ID，同时保留请求载荷完整性断言。
- `32340738053` 的 History Smoke 暴露列表刷新后的旧竞态：测试点击刷新后立即查找动态生成的单条导出按钮，偶尔只执行静态的“导出全部”。现等待两条 `.history-item` 实际渲染后再验证导出，不增加固定延时或重试。
- 同一轮 Refactor Gate 暴露 score 持久重试用例依赖 `online` 事件间接唤醒轮询；首次轮询正在运行时唤醒会被合并。现通过真实 `tryAutoSubmitOnGameOver()` 终局钩子生成待重试状态，不再依赖轮询时机。
- 同一轮 Pages Smoke 的回放去重用例在首个请求已发出但 IndexedDB 尚未标记 `synced` 时就修改 `clientRecordId`，制造并发提交。现等待首个持久记录完成同步，记录当时请求数，再验证重复触发不会增加请求；保留至少一次提交的幂等键一致性断言。
- `32341574884` 证明上述用例仍是真实产品回归：首条记录已完成 `synced` 后，`prepareRecordSubmit` 仍无条件将同一回放重置为 `pending`，并用新 `client_record_id` 再次 POST。现在共享发件箱入口对同一本地记录的相同回放保留原幂等键，且对已有服务端 ID 的 `synced` 记录直接返回，不再重置状态或重复上传。
- `32343041065` 中回放去重回归已通过，Pages Smoke 唯一失败转为经典工作台 iframe 切换 Relay 后立即读取背景色。测试原本只等待 `body` 和夜间属性，未等待子页主题初始化；现按真实能力依次等待 `data-theme="mist_cyan"`、夜间属性和最终 CSS，不改生产配色、不增加固定延时。
- `32344595198` 再次暴露同一回放的并发落盘竞态：上传成功写成 `synced` 后，一个更早读取、但更晚完成哈希与写入的持久化任务会把同一记录覆盖回 `pending`。`putDurableRecord` 现于同一 IndexedDB 读写事务内检查当前记录；相同回放一旦已有服务端 ID 且为 `synced`，任何迟到写入都只能复用该终态，不能降级投递状态。
- `32346260125` 的 trace 证明两次 POST 使用完全相同的 `client_record_id` 和 `replay_string`；根因不是身份替换，而是多个重试任务在异步迁移／候选查询后才取得 `recordSubmitLock`，因此同时选中了同一条待上传记录。现将现有锁前移到第一个异步等待之前，并覆盖候选选择和上传全过程。
