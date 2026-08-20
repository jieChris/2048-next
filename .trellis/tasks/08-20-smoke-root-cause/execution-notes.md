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
