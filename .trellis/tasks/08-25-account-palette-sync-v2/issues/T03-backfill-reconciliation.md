# T03 回填旧整库数据和影子对账

**Blocked by:** T02
**Repository:** `2048-game-api`

## Goal

把旧 `user_app_palettes.document` 无损回填为逐套记录，拥有唯一的 `V2 → legacy document` 纯投影器，并提供可重跑的影子对账和异常清单；迁移期间旧表仍是权威。

## Scope

- 保留稳定 ID、内容、有效时间戳和数组顺序。
- format:2 使用确定性默认值升级完整 format:3。
- 每套初始 revision 为 1。
- 旧 active 自定义 ID 迁移为 selection；null 迁移为待建立选择。
- 重复 ID、非法内容、无效 active、超过十套进入异常报告。
- 定义并实现唯一兼容投影器：active ≤8 返回 legacy document，9–10 返回 upgrade-required，绝不截断。
- 投影器同时供影子对账和 T04 legacy GET 调用，禁止第二套实现。

## Acceptance

- 正常账号旧色板数与新 active 色板数逐账号一致。
- 内容、顺序和 ID 哈希对账一致。
- 异常账号没有任何静默删除或重命名。
- 回填脚本重复运行结果一致。

## Validation

- 固定旧格式夹具。
- 生产备份副本上的 dry-run。
- 只读生产影子报告，无业务写入。
