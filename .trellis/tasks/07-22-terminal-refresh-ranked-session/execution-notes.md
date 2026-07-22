# 执行记录

## Route Deviation

- 仓库缺少 `.trellis/scripts/get_context.py`，无法执行标准包上下文脚本；采用最保守替代方案，直接读取 `.trellis/spec/index.md`、`frontend-api-boundary.md` 和 `cross-repo-architecture.md` 后继续。
- `npm run verify:prepush` 被工作区原有的 `style/main.css` 查询参数 `@import` 阻断：`first-load-performance-assets.spec.ts` 期望本地导入不含 `?`/`#`。该文件不属于本次修复且已有用户改动，采用保守回退，不修改该样式，改为完成目标单元测试、相关 Smoke、服务边界审计、JS 语法与 TypeScript 检查。

## 调查记录

- 常规终局存档和 checkpoint 本地镜像都会在游戏结束时清理，但 active ranked session 仅在记录上传成功后清理。
- 记录提交在首次 `await` 之后才把当前终局 payload 写入待上传存储；快速刷新可能在持久化前中断普通请求。
- 页面再次启动时，只要 active session 仍存在，就会继续使用其 seed/token；因此刷新后看似重开，实际仍属于上一局排位会话。

## 验证记录

- RED：终局提交请求保持未完成时，同步检查发现 pending record 尚未写入，旧 active session 仍存在。
- GREEN：终局 payload 在第一次异步边界前以 `lastAttemptAt: 0` 持久化；同一调用立即退休匹配的 active session，并保留预取的新会话。
- GREEN：后续真实网络尝试才更新时间和 retry count；刷新或认证缺失不会丢失终局 payload。
- GREEN：同一 `client_record_id` 的并发终局钩子不会把已切换的新会话误判成另一局。
- 目标单元测试：`online-leaderboard-runtime-submit.spec.ts` 47/47 通过。
- 相关 Smoke：排位重开、新旧记录重试、在局刷新 client record id 共 3/3 通过。
- 服务边界审计通过；完整预推检查的各项架构审计通过，完整单元测试 1830/1831 通过，唯一失败为 Route Deviation 中记录的既有 CSS 导入问题。
- `node --check js/online_leaderboard_runtime.js`、`npx tsc --noEmit` 与 `git diff --check` 均通过。
