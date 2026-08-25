# T06 实现全部外部写事务、容量、幂等和冲突副本

**Blocked by:** T05
**Repository:** `2048-game-api`

## Goal

统一普通创建、保存、删除、广场保存和冲突副本的完整外部写事务，保证十套上限、operation replay 和固定锁序下不丢数据、不覆盖旧色板。

## Scope

- 所有事务锁 `palette-account state` 后按 ADR 固定顺序加锁；数据库 trigger 作为第十一套 backstop。
- operation ID + 请求哈希在首次发送后冻结，账号内 replay 返回完整原权威响应；响应保留 400 天。
- 内容相同但 ID 不同允许共存；接口返回 duplicate candidate 供客户端确认。
- 并发第十套只允许一个成功。
- 调用 T05 merge/delete 原语，把 conflict candidate 在同一事务内变为冲突副本或 capacity_full。
- Theme Plaza 通用 primitive 原子处理使用已有/保留新色板、palette association 和首次引用；路由接线留给 T09。

## Acceptance

- active 计数永不超过 10。
- 网络重试不产生重复身份、revision 或引用。
- 容量失败不写部分 order/selection/reference。
- ordinary create/save/delete 和 conflict copy 暴露完整、幂等、可重放的 route/service 结果。

## Validation

- 真实 PostgreSQL 并发第十套、save/delete、重复、冲突副本、回滚和通用 Plaza primitive 测试。
- 幂等请求哈希冲突测试。
