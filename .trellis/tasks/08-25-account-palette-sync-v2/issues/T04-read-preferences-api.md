# T04 实现逐套读取、bootstrap、选择和顺序

**Blocked by:** T02
**Repository:** `2048-game-api`

## Goal

提供轻量登录会话 bootstrap、按需完整库读取、单套读取以及独立 selection/order 资源，不暴露整库 revision。

## Scope

- bootstrap 返回选择；custom 选择时只附带该套当前内容。
- library 返回 active 色板摘要/内容、正式顺序和 tombstone 增量。
- selection 支持 `follow-theme`、`builtin:<id>`、`custom:<id>`。
- order 只接受当前 active 自定义色板 ID。
- 选择目标删除时原子回退 `follow-theme`。
- legacy GET 从新模型投影兼容 document。

## Acceptance

- 内置/跟随主题 bootstrap 不返回私人色板内容。
- custom bootstrap 恰好返回一套。
- selection 与 order 并发修改互不冲突。
- 无效、删除、未上传 custom ID 不能成为云端选择。

## Validation

- route/contract tests。
- 真实 PostgreSQL 选择/删除竞争测试。
- bootstrap payload 大小断言。
