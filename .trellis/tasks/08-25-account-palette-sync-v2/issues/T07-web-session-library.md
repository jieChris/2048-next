# T07 实现 Web 登录会话首同步和延迟加载

**Blocked by:** T01, T04
**Repository:** `2048-next`

## Goal

在所有页面建立每登录会话一次的轻量账号色板启动服务：首页只恢复选择和必要的一套 custom 色板，设置页才加载完整库。

## Scope

- session key 为 `{accountId, contractVersion}`，使用 in-flight promise 去重；浏览器新会话、同账号重新登录、logout/login 和账号切换按合同重置。
- `follow-theme`/内置选择不下载 custom 内容。
- custom 选择只下载对应 stable ID，并与 selection 原子应用，避免缺少 payload 时回退 follow-theme。
- 不增加后台轮询。
- 多标签页通过 BroadcastChannel/IDB owner state 协调 bootstrap 和 outbox；stale response 在 account/contractVersion 不匹配时丢弃。
- 设置页使用 cursor/watermark 加载 library/order/tombstone delta；resetRequired 时执行 full resync。
- 普通缓存、账号离线操作和游客色板按已确认优先级处理；pending selection 只允许一个新客户端原子建立，失败方接受权威选择。

## Acceptance

- 同一会话页面跳转不重复 bootstrap。
- 账号 A 缓存/操作不在账号 B 显示；A→B 切换后 A 的迟到响应不能应用。
- 两标签页同账号不会重复建立 pending selection 或并发覆盖 owner binding。
- 游客选择不覆盖账号选择。
- 本地账号缓存立即可用；API 失败不阻塞游戏。

## Validation

- session/cache unit tests。
- 多页面 browser Smoke。
- 首页网络请求和性能预算断言。
