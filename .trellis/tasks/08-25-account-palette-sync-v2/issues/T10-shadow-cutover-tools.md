# T10 建立生产影子验证和维护切换工具

**Blocked by:** T03, T06, T08, T09
**Repositories:** `2048-next`, `2048-game-api`

## Goal

在不切换权威写入的情况下证明新模型、API、Web 性能和回滚路径可用，并准备短暂色板写维护切换。

## Scope

- 连续运行旧 JSON 与新模型只读对账。
- 对测试账号启用 v2 bootstrap/library/write。
- 提供最终 delta migration、异常账号阻断和可重跑报告。
- 提供维护开关、旧 PUT fail-closed 和兼容 GET 验证工具。
- 建立生产备份、恢复演练、commit/migration 锁定和观察指标。
- 验证首页不加载完整库，无后台轮询。

## Acceptance

- 数据和性能门禁全部有机器可读报告。
- 所有真实 PostgreSQL 并发场景通过。
- 回滚演练不会删除新数据或重开旧 PUT。
- 未解决异常账号不进入切换。

## Validation

- 生产只读影子运行。
- 备份恢复演练。
- 测试账号生产 Smoke 和性能审计。
