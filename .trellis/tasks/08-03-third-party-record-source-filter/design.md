# 设计

在现有历史筛选栏增加原生 `select`。前端始终向 `GET /api/user/:id/records` 传 `record_source=official|third_party`，切换时沿用现有 `refreshRecords(true)` 分页刷新路径。

来源归类由 Game API 根据 `verification_summary` 中非空的 `source_platform_id` 判定。`official` 表示没有第三方平台 ID 的本站记录，`third_party` 表示存在该 ID；不复用数据库中含义不同的 `records.source`，也不按 `record_era` 猜测来源。
