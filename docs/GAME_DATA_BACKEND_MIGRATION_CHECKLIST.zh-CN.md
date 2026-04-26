# 游戏数据后端迁移清单

最后更新：2026-04-23

## 1. 目标

本清单用于指导当前项目将“记录上传、排行榜、回放读取、排位状态”从现有 Cloudflare API 体系中逐步迁移到独立游戏数据服务器，同时保留 Cloudflare 认证体系的可行方案。

该文档强调三件事：

- 先解决“记录无法稳定上传”的现实问题
- 保持前端改动最小，避免一次性重构过大
- 为后续继续迁移认证、用户资料、更多游戏服务预留边界

## 2. 当前现状

### 2.1 前端调用方式

当前前端统一调用同源 `/api/*`，由 Vite 代理到目标后端：

- 默认本地代理：`http://127.0.0.1:8787`
- 线上代理：`https://taihe.fun/api/*`

这意味着前端并没有强绑定 Cloudflare，只要目标服务继续兼容 `/api/*` 路由即可完成切换。

### 2.2 当前主要接口分组

认证与账号相关：

- `/login`
- `/register`
- `/register/start`
- `/register/verify`
- `/register/check-nickname`
- `/me`
- `/user/me`
- `/me/nickname`
- `/password/change`

游戏数据相关：

- `/score`
- `/records`
- `/records/:id`
- `/records/:id/replay`
- `/records/:id/restore`
- `/leaderboard`
- `/user/:id`
- `/user/:id/records`
- `/ranked-session/start`
- `/ranked-checkpoint`

### 2.3 当前问题

- 记录上传链路不稳定，已经影响排行榜和用户记录页
- 排行榜、记录、回放、排位恢复并不是完全独立的几块功能，而是一条连续数据链
- 若只迁移 `/records` 与 `/leaderboard`，仍会留下 `/ranked-session/*`、`/ranked-checkpoint` 在旧系统中，形成双中心状态

## 3. 迁移建议结论

结论：可行，而且建议迁移。

但不建议只迁移“记录”和“排行榜”两个点，而建议按以下边界拆分：

- Cloudflare 仅保留认证与账号能力
- 独立游戏服务器接管所有游戏数据写入、查询、榜单、排位会话与恢复

推荐边界比“只迁一半”更干净，后续排查问题和扩展功能都会更简单。

## 4. 推荐职责边界

### 4.1 Cloudflare 保留

- 登录
- 注册
- 验证码 / Turnstile
- 账号资料修改
- 密码修改
- 认证令牌签发

建议保留接口：

- `/login`
- `/register*`
- `/me`
- `/user/me`
- `/me/nickname`
- `/password/change`

### 4.2 独立游戏服务器接管

- 分数上传
- 记录上传
- 排行榜查询
- 回放读取
- 用户历史记录查询
- 排位会话创建
- 排位断点保存与恢复

建议迁移接口：

- `/score`
- `/records`
- `/records/:id`
- `/records/:id/replay`
- `/records/:id/restore`
- `/leaderboard`
- `/user/:id`
- `/user/:id/records`
- `/ranked-session/start`
- `/ranked-checkpoint`

## 5. 认证打通方式

### 5.1 推荐方案

由 Cloudflare 登录成功后签发 JWT，独立游戏服务器本地校验 JWT。

JWT 建议至少包含：

- `user_id`
- `nickname`
- `exp`
- `iat`
- `iss`
- `aud`

### 5.2 不推荐方案

不建议在每次上传记录或查询用户时，由游戏服务器回调 Cloudflare 的 `/me` 来确认用户身份。

原因：

- 上传链路会依赖两个服务同时在线
- 高并发时会放大 CF 认证侧压力
- 故障定位会更复杂

### 5.3 未来扩展预留

为后续继续迁移认证体系，建议游戏服务器从第一天开始就支持以下两种校验方式之一：

- 共享密钥签名 JWT
- JWKS 公钥校验

若未来连认证也迁走，只需替换签发方，不必重写游戏服务器鉴权层。

## 6. 建议的数据模型

### 6.1 最低必需表

`users_shadow`

- `user_id`
- `nickname`
- `last_seen_at`

说明：

- 这是用户影子表，不必替代 CF 用户主表
- 仅用于榜单展示、记录归属、查询优化

`records`

- `id`
- `user_id`
- `mode_key`
- `mode_bucket`
- `score`
- `best_tile`
- `duration_ms`
- `replay_string`
- `client_record_id`
- `session_guid`
- `replay_hash`
- `end_reason`
- `created_at`

`leaderboard_best`

- `user_id`
- `mode_key`
- `best_score`
- `best_record_id`
- `updated_at`

`ranked_sessions`

- `session_id`
- `user_id`
- `mode_key`
- `seed`
- `issued_at`
- `expired_at`
- `status`

`ranked_checkpoints`

- `id`
- `user_id`
- `mode_key`
- `session_id`
- `replay_string`
- `duration_ms`
- `ui_state`
- `saved_at`

### 6.2 去重与反重复上传

至少保留以下唯一约束中的一种：

- `UNIQUE (user_id, session_guid)`
- `UNIQUE (user_id, replay_hash)`
- `UNIQUE (session_id)` 用于严格排位会话唯一归档

建议：

- 普通记录：`(user_id, replay_hash)` 去重
- 排位记录：`(user_id, session_guid)` 或 `(session_id)` 去重

### 6.3 服务器侧校验

上传时建议服务端执行：

- 基础字段合法性校验
- `mode_key` 白名单校验
- `replay_string` 解码校验
- 重放回放并验证终盘、分数、步数是否一致
- 排位记录必须匹配已签发 `ranked_session`

## 7. API 网关策略

### 7.1 推荐策略

对前端继续暴露统一的 `/api/*`。

可选实现：

- 方案 A：Nginx / Caddy / 网关服务按路由分发
- 方案 B：Cloudflare Worker 仅作 API gateway，认证路由转 CF 内部服务，游戏路由转独立服务器
- 方案 C：直接把域名 `/api/*` 切到新后端，再由新后端反代认证接口

### 7.2 推荐优先级

最稳妥的是方案 B：

- 前端不改接口前缀
- 线上域名不变
- 可以渐进迁移，不必一次性切换所有接口

## 8. 分阶段迁移清单

### Phase 0：准备阶段

- 盘点当前所有 `/api/*` 路由和调用方
- 确认 JWT 签发格式与有效期
- 确定新服务器部署环境、数据库、日志方案
- 确定唯一约束策略：`session_guid`、`replay_hash`、`ranked_session_id`
- 明确哪些模式进入在线榜单，哪些模式仅本地记录

交付物：

- 路由映射表
- 数据库表结构
- JWT 校验方案
- 回滚方案

### Phase 1：只迁移只读接口

- 先迁移 `/leaderboard`
- 再迁移 `/user/:id`
- 再迁移 `/user/:id/records`
- 再迁移 `/records/:id/replay`

目的：

- 先验证新服务器读取链路与数据库结构
- 不动上传逻辑，降低首轮切换风险

回滚点：

- 网关把上述只读路由切回旧服务即可

### Phase 2：迁移普通记录上传

- 迁移 `/records`
- 迁移 `/score`
- 服务端接入重复上传去重
- 服务端落库并异步/同步刷新排行榜

验收项：

- 4x4、3x3、不同模式均能稳定上传
- 同回放重复上传只保留一条有效记录
- 用户记录页可立即看到新记录

回滚点：

- 将 `/records`、`/score` 切回旧服务
- 新库保留数据但不再对外提供写入

### Phase 3：迁移排位会话与断点

- 迁移 `/ranked-session/start`
- 迁移 `/ranked-checkpoint`
- 将排位 seed、session_id、checkpoint 全部收口到新服务器

目的：

- 避免“认证在 CF、记录在新服务、排位状态仍在 CF”的双中心问题

验收项：

- 开局能拿到排位 session
- 刷新页面后断点恢复正常
- 完成对局后记录与 session 可正确闭环

回滚点：

- 网关切回旧排位接口
- 本地缓存镜像仍可临时兜底

### Phase 4：统一用户数据读模型

- 将用户昵称影子同步到游戏服务器
- 统一用户公开主页所需字段
- 降低跨服务拼接用户资料的复杂度

这一步不是首要目标，但建议做。

### Phase 5：评估是否迁移认证

若后续确认 CF 认证链路仍是故障源，可再决定是否继续迁移：

- 登录
- 注册
- 密码
- 验证码

此阶段不应与记录/榜单迁移绑定在一次上线中。

## 9. 前端改动最小化清单

- 保持所有前端接口仍走 `/api/*`
- 不在前端写死“游戏数据服务器域名”
- 认证 token 继续沿用当前本地存储键
- 若 JWT 格式变更，只改认证解析逻辑，不改游戏页面调用点

建议改动原则：

- 优先改网关，不优先改页面脚本
- 优先改后端兼容，不优先改已有接口名字

## 10. 服务端实现清单

- 提供 JWT 中间件
- 提供统一错误码
- 记录上传接口做幂等处理
- 排行榜查询支持按 `mode_key` 或 `mode_bucket`
- 用户记录查询支持分页
- 回放读取支持权限与公开策略
- 排位会话支持 session 生命周期控制
- 断点恢复支持同模式最新 checkpoint 查询
- 为回放重放校验提供超时和资源限制

## 11. 监控与排障清单

- 记录上传成功率
- 排行榜查询成功率
- 记录上传平均耗时 / P95
- 重放校验平均耗时 / P95
- 去重命中率
- JWT 校验失败率
- 排位会话创建失败率
- checkpoint 保存失败率

日志中建议输出：

- `user_id`
- `mode_key`
- `session_guid`
- `client_record_id`
- `replay_hash`
- `request_id`

## 12. 验收清单

- 4x4、3x3、5x5、封顶模式均可上传
- 用户记录页与排行榜展示一致
- 同局重复上传不会生成多条榜单记录
- 刷新页面后排位恢复正常
- 回放读取可用
- 前端在 API 不可用时能显示明确错误而不是静默失败
- 切换网关后前端不需要改页面路由

## 13. 回滚清单

- 保留旧接口一段时间，不要立刻下线
- 路由切换通过网关配置完成，不通过前端发版完成
- 新库写入前先做好备份与保留策略
- 任何阶段回滚都要保证：
- 登录仍可用
- 本地记录仍可保存
- 回放仍可本地查看

## 14. 推荐落地顺序

建议顺序：

1. 建新游戏数据服务与数据库
2. 先迁只读接口
3. 再迁 `/records` 与 `/score`
4. 最后迁 `/ranked-session/*` 与 `/ranked-checkpoint`
5. 观察稳定性后，再决定是否继续迁认证

## 15. 后续继续迁移的预留点

为了以后继续迁移，当前就应预留：

- 认证签发方可替换
- JWT 校验方式可替换为 JWKS
- 用户影子表与游戏数据表解耦
- 排行榜计算可从同步改成异步
- 回放校验服务可拆为独立 worker
- 网关路由规则可按路径继续细分

这样即使未来决定：

- 继续保留 CF 认证
- 或完全迁出 CF
- 或把排行榜与回放校验拆成单独服务

都不需要再重做当前这次迁移。

## 16. 最终建议

如果目标是尽快解决“记录上传不上去”，推荐路线不是“继续在当前 Cloudflare 游戏数据链路上打补丁”，而是：

- 把 Cloudflare 收缩为认证服务
- 把游戏数据链路完整迁出
- 用统一 `/api/*` 网关保持前端无感

这是当前复杂度、稳定性与后续可维护性之间最平衡的方案。
