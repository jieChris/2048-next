# T07 实现 Web 登录会话首同步和延迟加载

**Blocked by:** T01, T04
**Repository:** `2048-next`

## Goal

在所有页面建立每登录会话一次的轻量账号色板启动服务：首页只恢复选择和必要的一套 custom 色板，设置页才加载完整库。

## Scope

- 统一 bootstrap 在认证恢复后运行一次。
- 本地账号缓存立即可用；API 失败不阻塞游戏。
- `follow-theme`/内置选择不下载 custom 内容。
- custom 选择只下载对应 stable ID。
- 设置页打开后加载 library/order/tombstone delta。
- 普通缓存、账号离线操作和游客色板按已确认优先级处理。
- 不增加后台轮询。

## Acceptance

- 同一会话页面跳转不重复 bootstrap。
- 新设备恢复云端当前选择。
- 游客选择不覆盖账号选择。
- 账号 A 缓存/操作不在账号 B 显示。

## Validation

- session/cache unit tests。
- 多页面 browser Smoke。
- 首页网络请求和性能预算断言。
