# T05 实现版本历史、三方合并和删除原语

**Blocked by:** T02, T04
**Repository:** `2048-game-api`

## Goal

实现不可变版本、规范化/diff/merge、删除转换和历史清理的内部领域/存储原语；不在本 ticket 暴露可完成的生产写路由，也不最终分配冲突副本身份或容量。

## Scope

- 领域输入包含 base revision、完整规范化内容和冻结请求哈希。
- 内容未变不创建 revision。
- 非重叠修改自动合并；相同值去重。
- 同一编辑单元不同值产生纯 `conflict_candidate`，由 T06 在容量/幂等事务内决定新身份或 capacity 结果。
- base revision 过期时产生可持久化的 conflict candidate，不在原 ID 覆盖。
- 删除原语创建永久标记、移除顺序并在同事务回退选择；T06 负责外部路由和 operation replay。
- 历史保留最近 100 + 最近 180 天并集。

## Acceptance

- 当前 revision 不原地修改。
- 设备字段/时间戳不参与内容冲突。
- 不存在绕过 T06 account-lock/operation/capacity 的公开写入口。
- 版本清理不删除当前版本、删除标记或被引用 revision。

## Validation

- merge property/unit tests。
- 真实 PostgreSQL 内部 merge/delete transaction 和过期 base 测试；外部写并发由 T06 验收。
- 清理任务边界测试。
