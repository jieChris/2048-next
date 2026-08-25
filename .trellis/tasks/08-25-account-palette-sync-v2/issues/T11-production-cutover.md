# T11 执行生产切换和分阶段重新开放

**Blocked by:** T10
**Repositories:** `2048-next`, `2048-game-api`

## Goal

在批准的维护窗口完成最终增量迁移、切换唯一权威、部署新 Web，并按依赖顺序恢复 Theme Plaza 能力。

## Scope

1. 备份并开启账号色板写维护。
2. 执行最终 delta 和数据门禁。
3. 开启 V2 read，再开启 V2 write。
4. 关闭 legacy PUT，确认旧 GET 兼容。
5. 部署新 Web，验证登录首同步、设置页、离线保存和账号隔离。
6. 解除私人色板写维护。
7. 观察错误率、冲突副本、容量拒绝和异常账号。
8. 依次开放 reaction/report → save → share/author。
9. auto publish 保持关闭，等待独立审核门禁。

## Acceptance

- API/Web/迁移版本锁定且线上一致。
- 生产数据无未经批准下降。
- 旧标签页写入明确 fail-closed，本地数据不丢。
- 每个能力开启后均完成健康、功能和只读对账。
- 任一门禁失败可逐项关闭能力并回兼容只读。

## Validation

- 生产 Smoke、日志和指标观察。
- 切换后数据对账。
- 发布/回滚执行记录完整。
