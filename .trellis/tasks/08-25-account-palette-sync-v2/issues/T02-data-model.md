# T02 建立逐套权威数据模型

**Blocked by:** T01
**Repository:** `2048-game-api`

## Goal

以 expand-only PostgreSQL 迁移建立逐套权威记录、不可变版本、永久删除标记、当前选择、正式顺序和幂等操作表；新表暂不接生产业务写入。

## Scope

- 建立每账号唯一可锁定 state 行和单调 `change_seq`。
- active 色板稳定 ID 在账号内唯一，UUID/tombstone 身份永久保留。
- 每套色板指向当前不可变 revision。
- selection 支持 pending establishment；order 使用规范化 items/metadata，能够保留并发新增 ID。
- 删除标记永久保留且不计入十套容量。
- 建立固定全局锁序：account state → operation → palette IDs → revision → order → selection → Theme Plaza facts。
- 使用数据库触发器/约束作为第十一套 active 色板的最终 backstop，应用事务使用同一 account state 锁。
- operation 记录包含账号级 operation ID、请求哈希、完整响应和 400 天保留所需时间索引。

## Acceptance

- 迁移可重复运行、只扩展、不修改旧表数据。
- 数据库约束阻止第十一套 active 色板和无效选择。
- 删除 ID 不能重新成为同账号 active ID。
- operation ID/请求哈希唯一且可返回权威结果。

## Validation

- 迁移结构测试。
- 真实 PostgreSQL 约束和回滚测试。
- `EXPLAIN`/索引检查关键查询。
