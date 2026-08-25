# T06 实现容量、幂等、重复和冲突副本事务

**Blocked by:** T05
**Repository:** `2048-game-api`

## Goal

统一普通创建、广场保存和冲突副本的账号级容量与幂等事务，保证十套上限下不丢数据、不覆盖旧色板。

## Scope

- 同一账号创建使用统一事务锁。
- operation ID + 请求哈希返回原权威响应或幂等冲突。
- 内容相同但 ID 不同允许共存；接口返回 duplicate candidate 供客户端确认。
- 并发第十套只允许一个成功。
- 冲突副本有名额时创建新稳定 ID；满库返回本地待上传结果。
- Theme Plaza 保存色板与引用事实同事务。

## Acceptance

- active 计数永不超过 10。
- 网络重试不产生重复身份、revision 或引用。
- 容量失败不写部分 order/selection/reference。
- 不自动删除或覆盖任何已有色板。

## Validation

- 真实 PostgreSQL 并发第十套、重复、回滚和广场保存测试。
- 幂等请求哈希冲突测试。
