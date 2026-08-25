# T08 实现草稿、保存按钮、离线队列和离开保护

**Blocked by:** T07, T05
**Repository:** `2048-next`

## Goal

把色板编辑从即时持久化改为本地草稿 + 明确保存；离线保存可靠进入原账号队列，未保存离开不丢修改。

## Scope

- 草稿只影响设置页预览。
- 保存按钮冻结完整内容和 operation ID。
- 在线定向保存；离线持久化并入队。
- 队列按账号/stable ID 折叠，依赖顺序执行。
- 明确显示“已同步到账号”与“已保存到设备，等待同步”。
- 站内离开提供保存/放弃/取消；刷新/关闭用原生确认。
- 待上传、重复确认、冲突副本独立展示。

## Acceptance

- pointermove/输入中间态不发请求。
- 保存前游戏和其他页面使用最后保存 revision。
- 本地持久化失败不能离开。
- 账号切换暂停原队列且不迁移数据。

## Validation

- editor/outbox unit tests。
- offline/reload/account-switch Smoke。
- 设置页视觉矩阵。
