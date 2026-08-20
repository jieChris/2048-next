# 执行记录

## 基线

- GitHub Actions run `32331214874`：Pages Smoke 194 通过、31 失败、12 未运行。
- 其中 23 条在 `64f65a23` 基线已经失败；主要错误是自动新手指引覆盖层拦截无关用例操作。
- 其余失败来自持久认证和异步 IndexedDB 合同变化后的旧测试假设。

## Route Deviation

- 仓库缺少 Trellis `./.trellis/scripts/get_context.py` 与分层 guides 索引；按根级 `.trellis/spec/index.md`、`.trellis/spec/smoke-testing.md` 和 `.trellis/spec/frontend-api-boundary.md` 继续。

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
