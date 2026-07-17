# 执行记录

## Route Deviation

- 仓库缺少 `.trellis/scripts/get_context.py`，无法执行标准包上下文脚本；采用最保守替代方案，直接读取 `.trellis/spec/index.md`、`frontend-api-boundary.md`、`cross-repo-architecture.md` 及既有移动端恢复任务记录后继续。
- 首轮实现使 `core_game_manager_saved_state_helpers_runtime.js` 达到 1529 行，触发仓库 1500 行审计上限。为避免提高阈值或压缩可读性，采用保守回退：把写入时序判定放到原本就拥有存储时间戳读取职责的 panel/timer helper，再由 saved-state helper 调用。

## 调查记录

- 现有会话过期 Smoke 仅把 active session 的 `exp` 改成过去时间；它没有覆盖会话记录被清除、页面关闭后强制保存、再启动时获取新会话的真实失败链路。
- 排位存档恢复要求本地存档中的 token、challenge id 与当前 active session 完全一致；不一致时当前实现会清除完整和轻量本地存档。
- checkpoint 本地镜像与普通本地存档是独立状态源，后续回归需同时断言两者不会造成重置或倒退。
- 根因一：未登录或排位身份暂时缺失时，常规本地存档没有 token/challenge；启动阶段会把它判为非法并删除，实际恢复被迫依赖 checkpoint 镜像。镜像缺失时重置，镜像较旧时可能回退。
- 根因二：已释放锁但仍被浏览器保留在内存中的旧页面，之后触发 `pagehide` 时仍会强制写存档，并以新的 `saved_at` 覆盖更新页面的棋盘。
- 根因三：旧页面可以在 `pagehide` 前先发布 `savedGameStateSyncByMode` 快照。该发布会把旧棋盘包装成新的 `saved_at`，并更新旧 manager 的 `lastSyncedSavedStateAt`，从而让它自己绕过后续旧写入保护；同时还可能通过 `storage` 事件把活跃页面内存中的棋盘回退。

## 验证记录

- RED：删除 checkpoint 镜像后，1024 封顶盘面在第一次关闭重开即被重置为初始两块棋盘。
- RED：模拟旧页面释放锁、新页面推进存档、旧页面随后触发 `pagehide`，稳定复现新进度被旧棋盘覆盖。
- GREEN：无排位身份且没有当前 active session 时，允许结构合法、含有效 seed 的本地在局存档恢复；存在当前排位身份时仍保持严格匹配，既有注入存档测试继续通过。
- GREEN：写入前比较存储中的最新 `saved_at` 与当前 manager 已知时间，旧页面不得覆盖更新存档；显式重开局仍先清理旧存档，因此不受影响。
- 目标单元测试：saved-state 与 panel/timer runtime 共 58/58 通过。
- 相关 Smoke：存档会话、页面锁与新增 1024 封顶回归共 24/24 通过。
- 压力验证：新增两条回归各重复 10 次，共 20/20 通过。
- `npm run verify:prepush`：全部审计、完整单元测试、关键 Smoke 与构建通过，总耗时 37.07 秒。
- 补强 RED：旧页面释放锁、新页面保存更新棋盘后，旧页面先发布同步快照再触发 `pagehide`，稳定复现更新棋盘被旧棋盘覆盖。
- 补强 GREEN：`publishSavedStateSyncSnapshot()` 在共享发布入口先执行旧写入判定，旧 manager 不得发布同步快照，也不能借发布动作抬高自己的已知存档时间。
- 补强目标单元测试：saved-state、panel/timer 与 sync publish runtime 共 62/62 通过。
- 补强压力验证：两条 1024 封顶关闭/重开回归各重复 10 次，共 20/20 通过。
- 补强相关 Smoke：存档会话、页面锁与 1024 封顶回归共 24/24 通过。
- 最终 `npm run verify:prepush`：全部审计、完整单元测试、关键 Smoke 与构建通过，总耗时 38.57 秒。
