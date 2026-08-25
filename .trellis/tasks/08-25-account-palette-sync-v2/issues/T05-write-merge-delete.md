# T05 实现保存、版本历史、三方合并和删除

**Blocked by:** T02, T04
**Repository:** `2048-game-api`

## Goal

实现逐套创建、保存和删除；服务端根据 base/current/incoming 完整快照执行最小编辑单元三方合并。

## Scope

- 保存请求包含 base revision、完整规范化内容和 operation ID。
- 内容未变不创建 revision。
- 非重叠修改自动合并；相同值去重。
- 同一编辑单元不同值返回冲突副本结果。
- base revision 过期时无损生成冲突副本。
- 删除创建永久标记、移除顺序并回退选择。
- 历史保留最近 100 + 最近 180 天并集。

## Acceptance

- 当前 revision 不原地修改。
- 设备字段/时间戳不参与内容冲突。
- 旧设备不能复活删除 ID。
- 版本清理不删除当前版本、删除标记或被引用 revision。

## Validation

- merge property/unit tests。
- 真实 PostgreSQL 并发保存、删除和过期 base 测试。
- 清理任务边界测试。
