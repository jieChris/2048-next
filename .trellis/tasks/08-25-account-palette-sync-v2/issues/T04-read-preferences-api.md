# T04 实现逐套读取、bootstrap、选择和顺序

**Blocked by:** T02, T03
**Repository:** `2048-game-api`

## Goal

提供轻量登录会话 bootstrap、按需完整库读取、单套读取以及独立 selection/order 资源，不暴露整库 revision。

## Scope

- bootstrap 返回选择；custom 选择时只附带该套当前内容。
- library 接受 cursor 和至多十个本地已知 ID，返回 changes、nextCursor、hasMore、resetRequired；cursor 缺失/过期时返回 full active snapshot 和已知 ID tombstone 状态。
- selection 支持 pending、`follow-theme`、opaque `builtin:<id>`、`custom:<id>`；pending 使用原子 compare-and-establish，普通更新 LWW/idempotent。
- order 写入由服务器 canonicalize：过滤重复/无效/删除 ID，并追加并发新增但遗漏的 active ID。
- legacy GET 复用 T03 唯一兼容投影器。

## Acceptance

- 内置/跟随主题 bootstrap 不返回私人色板内容。
- custom bootstrap 恰好返回一套。
- pending selection 两客户端竞争只有一个建立成功，失败方接收权威选择。
- selection 与 order 并发修改互不冲突；order 不丢并发新建色板。
- 无效、删除、未上传 custom ID 不能成为云端选择。

## Validation

- route/contract tests。
- 真实 PostgreSQL pending-selection 和 selection/order 并发测试。
- bootstrap payload 大小断言。
