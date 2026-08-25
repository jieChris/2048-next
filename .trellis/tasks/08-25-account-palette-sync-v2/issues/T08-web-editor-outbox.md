# T08 实现草稿、保存按钮、离线队列和离开保护

**Blocked by:** T07, T06
**Repository:** `2048-next`

## Goal

把色板编辑从即时持久化改为本地草稿 + 明确保存；离线保存可靠进入原账号队列，未保存离开不丢修改。

## Scope

- 草稿只影响设置页预览。
- 保存按钮在第一次网络发送后冻结 operation ID 和请求哈希；后续编辑创建新 operation。
- 在线定向保存；离线持久化并入队。
- 队列按账号/stable ID 折叠，依赖顺序执行；多标签页使用 IDB lease/BroadcastChannel 保证同一 operation 只有一个 drainer。
- 明确显示“已同步到账号”与“已保存到设备，等待同步”。
- 站内离开提供保存/放弃/取消；刷新/关闭用原生确认。
- capacity、duplicate-confirmation、conflict-copy、paused-account 和 expired-operation 使用 T06 冻结的完整结果状态。

## Acceptance

- pointermove/输入中间态不发请求。
- 保存前游戏和其他页面使用最后保存 revision。
- 本地持久化失败不能离开。
- 账号切换暂停原队列且不迁移数据；丢失响应后的重放不改变冻结请求哈希。
- conflict-copy 成功且本地保存内容仍在使用时切换设备选择到新 ID；本地待上传时不改云端选择。

## Validation

- editor/outbox unit tests。
- offline/reload/account-switch Smoke。
- 设置页视觉矩阵。
