# T11 执行生产切换和分阶段重新开放

**Blocked by:** T10
**Repositories:** `2048-next`, `2048-game-api`

## Goal

在批准的维护窗口完成最终增量迁移、切换唯一权威、部署新 Web，并按依赖顺序恢复 Theme Plaza 能力。

## Scope

1. 备份并开启账号色板写维护。
2. 执行最终 delta 和数据门禁。
3. 开启 V2 read，验证 bootstrap/library 和兼容 GET。
4. 关闭 legacy PUT，并用旧客户端探针证明整库写不可能成功。
5. 部署新 Web 维护/排队模式，验证登录首同步、设置页、草稿和离线队列。
6. 确认唯一可写权威后开启 V2 write，完成至少 20 次操作矩阵和 30 分钟观察。
7. 解除私人色板写维护。
8. 观察 24 小时且无 P0/P1 数据问题后开放 reaction/report，再按稳定窗口开放 save 和 share/author。
9. auto publish 保持关闭，等待独立审核门禁。

## Acceptance

- API/Web/迁移版本锁定且线上一致。
- cutover manifest 的所有 gate 为 passed，迁移未知差异、数据减少、十一套和 tombstone 复活均为 0。
- V2 write 前 legacy PUT 已 fail-closed，任何时刻只有一个可写权威。
- 保存/分享分别经过至少 24 小时稳定观察窗口；自动或人工回滚阈值已记录并可执行。
- 任一门禁失败可逐项关闭能力并回兼容只读。

## Validation

- 生产 Smoke、日志和指标观察。
- 切换后数据对账。
- 发布/回滚执行记录完整。
