# T09 接入 Theme Plaza 单套资格和细粒度能力

**Blocked by:** T06, T08
**Repositories:** `2048-next`, `2048-game-api`

## Goal

Theme Plaza 分享/保存改为逐套权威 API，并拆分互动、保存、分享和自动发布能力；其他色板状态不得阻止当前色板操作。

## Scope

- 分享按账号 + stable palette ID 读取当前权威 revision。
- 当前色板有草稿、待写回、待上传或删除时给出具体提示。
- 点赞、点踩、举报使用 reaction capability。
- 保存副本调用 T06 通用事务 primitive：确认前不写引用；使用已有色板时原子写首次引用和 palette association，保留新色板时原子创建并写引用。
- 分享/更新/撤回使用 share capability。
- T09 只负责 Theme Plaza 路由/客户端接线和能力，不重复实现 T06 容量、幂等或 palette 创建。

## Acceptance

- 另一套色板失败不影响当前已同步色板分享。
- 保存不自动改变当前选择。
- 满库、重复待确认和网络失败都不提前增加引用。
- 各 capability 可独立 fail-closed；legacy `writeEnabled` 仅作为保守 aggregate 暂时返回，直到版本证据允许移除。
- 移除整库 dirty/conflict 分享门禁和笼统冲突文案。

## Validation

- Web/API route/contract tests。
- Browser Smoke 覆盖每种当前色板状态。
- 真实 PostgreSQL 保存与引用事务测试。
