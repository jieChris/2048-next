# T10 建立生产影子验证和维护切换工具

**Blocked by:** T03, T06, T08, T09
**Repositories:** `2048-next`, `2048-game-api`

## Goal

在不切换权威写入的情况下证明新模型、API、Web 性能和回滚路径可用，并准备短暂色板写维护切换。

## Scope

- 连续运行旧 JSON 与新模型只读对账。
- V2 write Smoke 只在生产备份恢复出的隔离 PostgreSQL 运行；若使用生产 canary，必须先对该账号完成 final delta、标记 V2 authority 并拒绝其 legacy PUT。
- 生成 `artifacts/palette-v2/` 下 reconciliation、concurrency、performance、backup-restore、rollback 五份版本化 JSON gate artifact。
- 提供维护开关、旧 PUT fail-closed 和兼容 GET 验证工具。
- 生成锁定 commits、migration、命令、审批、观察窗口、阈值和回滚触发器的 `cutover-manifest.json`。
- 验证首页不加载完整库，无后台轮询。

## Acceptance

- 每份报告包含 schemaVersion、passed、checks、expected/actual 和 residual risks，未知差异/数据减少/十一套/tombstone 复活必须为 0。
- 所有真实 PostgreSQL 并发场景通过。
- 回滚演练不会删除新数据或重开旧 PUT。
- 未解决异常账号不进入切换。

## Validation

- 生产只读影子运行；写 Smoke 使用隔离副本或已切断旧权威的 canary。
- 备份恢复演练。
- 测试账号/隔离副本 Smoke 和性能审计。
