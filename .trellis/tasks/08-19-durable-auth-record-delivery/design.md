# 持久登录与成绩投递技术设计

## 0. 设计原则

1. 终局证据先可靠落盘，再进行任何网络或会话清理。
2. 服务器是账号、回放、排行榜资格和记录的唯一权威；浏览器只保存证据、副本和投递状态。
3. 所有重试至少一次，所有写入必须幂等；不依赖“恰好只请求一次”。
4. 可恢复错误永不删除证据；明确不可验证也只标记状态并保留原文。
5. 复用现有 IndexedDB、RPL1、`/api/records`、回放验算和数据库唯一索引，先解决闭环，再考虑更大范围重构。

## 1. 现有边界和已确认问题

### 1.1 前端边界

`2048-next` 负责游戏 UI、账号页、本地历史、浏览器状态和 API 客户端，不读取数据库、不签发令牌、不决定排行榜资格。相关入口包括：

- `js/online_leaderboard_runtime.js`：终局提交、重试、当前认证和排行榜刷新；
- `js/local_history_store.js`：IndexedDB/旧 localStorage 历史存储；
- `js/api_shared_utils.js`：通用浏览器存储和 API 辅助函数；
- 账号与历史页面脚本：状态显示、登录恢复和“检查并补传”交互。

当前风险：待上传队列仍以 localStorage 完整复制 payload、默认最多 20 条且可能静默截断；部分错误文本包含 `token` 即会触发清理；本地历史缺少稳定同步元数据；旧版本 IndexedDB 为 v2。

### 1.2 后端边界

`2048-game-api` 负责认证、设备会话、记录入库、回放验算、排行榜派生和数据库迁移。当前认证令牌默认 TTL 30 天，已有 `/api/auth/refresh`，但 refresh 仍要求原访问令牌未过期；`/api/records` 已有 RPL1 验算、回放指纹和 `client_record_id` 唯一索引；单请求回放默认约 2 MiB。

现有 `0027_speed_eligibility` 将旧记录缺少资格字段解释为 `review`，造成历史可见性回归。新设计不沿用该语义，不通过批量隐藏解决校验问题。

## 2. 总体数据流

```text
真实终局
  │
  ├─构建完整信封（client_record_id、RPL1、摘要、会话凭证）
  ├─IndexedDB 事务写入 + 读回校验
  │       └─失败：保留活动状态，提示导出/重试，不联网
  ├─标记 finalized_local / pending
  ├─尝试恢复设备会话（如需要）
  ├─普通小记录 POST /api/records
  │       └─成功：server_record_id、synced
  └─超大记录：创建任务 → 分块 → complete → 原子入库

页面启动/联网/打开历史/重新登录
  └─读取 IndexedDB 中未 synced 的记录 ID
       ├─waiting_auth：先恢复会话
       ├─retry_wait：到期后重试
       ├─needs_action/invalid：只在用户点击时再次尝试
       └─上传成功：写 server_record_id 和结果，再更新 UI
```

上传队列不复制完整回放。并发上传由 `client_record_id` 互斥；刷新后 `uploading` 一律恢复为 `pending`，避免永久卡死。

## 3. 持久设备会话设计

### 3.1 凭证分层

| 凭证 | 保存位置 | 用途 | 生命周期 |
| --- | --- | --- | --- |
| 设备会话 Cookie | `HttpOnly`、`Secure` Cookie | 页面启动恢复短期令牌 | 无 inactivity 过期；浏览器 Cookie 的长寿命由每次使用滚动延长 |
| 访问令牌 | JS 内存 | 当前 API `Authorization` | 短期（建议 15 分钟，可配置） |
| 旧 v2 访问令牌 | 仅迁移期间 localStorage | 一次性兑换设备会话 | 兑换成功或失效后删除 |

设备 Cookie 不让脚本读取，也不把永久 Bearer Token 放进 localStorage。Cookie 使用独立名称（例如 `2048_device_session_v1`），不复用现有管理页 Cookie，避免权限边界混淆。

### 3.2 服务端设备会话表

新增最小表（具体 schema 由后端迁移实现确认）：

```text
auth_device_sessions
  id (uuid/public id, primary key)
  user_id (foreign key)
  token_hash (unique)
  created_at
  last_used_at
  revoked_at (nullable)
  user_agent_hash / device_label (optional, non-sensitive)
```

Cookie 内只放高熵随机 opaque token；数据库只保存哈希。查询按哈希命中后检查 `revoked_at`、账号状态和 `auth_version`。不记录原始 Cookie、完整 IP 或密码。

### 3.3 恢复和续期

1. 登录/注册成功：创建设备会话，设置 Cookie，返回短期访问令牌和 `expiresAt`。
2. 页面启动：无内存令牌时调用现有 `/api/auth/refresh` 的 cookie-first 语义（或等价的 `/api/auth/session`，实施时二选一，优先扩展现有接口），不要求提交过期访问令牌。
3. 服务端校验设备会话和账号状态，更新 `last_used_at`，以同一个高熵 opaque token 续期 Cookie，签发新访问令牌并返回用户资料。稳定 token 避免多标签页并发 refresh 响应乱序造成刚恢复的 Cookie 失效；撤销仍由服务端会话行和 `auth_version` 控制。
4. 客户端内存缓存令牌；接近过期或收到明确 `TOKEN_EXPIRED` 时合并并发恢复请求，原请求最多重试一次。
5. 主动退出调用 `/api/logout` 撤销当前设备会话并清 Cookie；不删除 IndexedDB 记录。
6. 修改密码、账号删除、退出所有设备递增 `auth_version` 或批量撤销设备会话。

Cookie 的浏览器有效期使用长寿命并在成功恢复时滚动更新；服务端不设置“30 天未访问即失效”的产品规则。若未来需要企业级绝对期限，必须单独取得产品批准并更新 PRD。

### 3.4 兼容旧令牌

旧客户端已有 localStorage token 时：

- 若仍有效，调用一次兼容兑换接口/refresh，创建设备会话；
- 成功后清理旧 token 并保留用户 ID/昵称作为显示缓存；
- 失败只清理失效认证，不清理记录或待上传状态；
- 不把旧 token 复制到 Cookie，也不允许过期 token 延长生命周期。

## 4. 本地历史和发件箱模型

### 4.1 IndexedDB 记录字段

在现有记录对象上向前兼容增加字段，建议使用 `DB_VERSION = 3`（最终版本号以实施时工作树为准）：

```text
sync_status: active | finalized_local | pending | uploading | synced | waiting_auth | retry_wait | needs_action | invalid
server_record_id: string | null
owner_type: guest | user
owner_user_id: string | null
owner_key: string
client_record_id: string
replay_sha256: string
replay_byte_size: number
finalized_at: string | null
upload_attempts: number
next_retry_at: string | null
last_upload_at: string | null
last_error_code: string | null
last_error_message: string | null
upload_task_id: string | null
uploaded_chunk_count: number | null
```

完整 `replay_string` 和现有业务字段继续保留在同一条记录中。队列只保存 `record.id` 或 `client_record_id`，不保存第二份回放。

### 4.2 迁移规则

- 旧记录有终局回放且没有同步字段：设为 `finalized_local`，不推断已上传。
- 旧 localStorage pending payload：校验并导入 IndexedDB；导入成功后标为 `pending`，旧 key 只在迁移完成后清理。
- 只有 `server_record_id` 明确存在且来源可信的记录才设为 `synced`；“上次请求成功”字符串不能作为依据。
- 损坏 JSON、缺回放或缺模式的对象保留原始导出副本，并标为 `invalid`，不静默丢弃。
- 游客记录的 `owner_key` 为 `guest`；登录后必须通过显式确认转移归属，不自动改写历史所有者。

### 4.3 本地事务顺序

终局流程必须满足：

```text
build envelope
→ IDB put(finalized_local/pending)
→ IDB get + verify(client_record_id, replay hash, size)
→ clear active game/checkpoint and retire consumed ranked session
→ network submit
```

任何 `put`、读回或迁移失败都不能继续执行会删除唯一活动证据的清理动作。`pagehide` 只触发持久化/keepalive，不改变这个顺序。

## 5. API 契约

### 5.1 认证

#### `POST /api/auth/refresh`（扩展现有接口）

请求默认带 Cookie；兼容期可带旧 Bearer，但过期 Bearer 不应阻止有效设备会话恢复。

成功：

```json
{
  "success": true,
  "token": "short-lived-access-token",
  "expiresAt": 0,
  "user": { "id": 0, "nickname": "...", "role": "player" }
}
```

失败代码区分：`SESSION_REVOKED`、`ACCOUNT_INACTIVE`、`ACCOUNT_DELETED`、`AUTH_STATE_UNAVAILABLE`。网络/503 不等同登出。

#### `POST /api/logout`

撤销当前设备会话、删除 Cookie，返回幂等成功。前端只清内存令牌，不动本地记录。

### 5.2 普通记录

#### `POST /api/records`

继续作为小回放主入口，要求：

- `client_record_id` 必填且稳定；
- 服务端先完成请求级解析、模式/会话校验和回放验算，再在同一事务中解析重复记录、关联排行榜会话、写 replay object 和 record；
- 重复命中返回已有 `id`、`duplicate: true`、既有资格摘要；
- 相同 `client_record_id` 但不同回放摘要必须返回明确冲突，不覆盖旧记录；
- 认证失效、临时故障、请求体过大使用稳定 HTTP 状态和机器码，前端不解析自然语言猜测。

### 5.3 分块记录

仅当回放超过协商阈值时使用以下最小接口（名称可在实现时与现有 API 风格对齐）：

1. `POST /api/records/uploads`：创建/幂等获取 `upload_task_id`，提交 `client_record_id`、模式、总字节、整体 SHA-256、分块大小和会话凭证。
2. `PUT /api/records/uploads/:taskId/chunks/:index`：提交单块字节、块长度和块 SHA-256；重复相同块返回已确认。
3. `POST /api/records/uploads/:taskId/complete`：服务端确认块集合、整体哈希，重组/流式解析 RPL1，完成全量验算，并在事务中创建或升级记录。
4. `GET /api/records/uploads/:taskId`：恢复页面后查询已确认块索引和任务状态。

服务器不得在 `complete` 之前把半成品暴露为排行榜记录；任务超时清理不影响客户端原始 IndexedDB 记录。

## 6. 错误分类和状态转换

| 响应 | 本地动作 | 是否自动重试 | 用户提示 |
| --- | --- | --- | --- |
| 2xx success/duplicate | 写 `server_record_id`、`synced` | 否 | 已同步 |
| 401 `TOKEN_EXPIRED` / 419 | `waiting_auth`，恢复会话 | 恢复成功后一次 | 正在恢复登录 |
| 401 `SESSION_REVOKED` / 410 删除 | 保留证据，等待重新登录/导出 | 否 | 会话已撤销 |
| 400 回放/模式明确无效 | `invalid` | 否 | 验证失败，保留文件 |
| 409 会话冲突/同 ID 不同摘要 | `needs_action` | 否 | 需要确认或联系客服 |
| 413 请求体过大 | 切换分块 | 一次 | 正在准备大回放上传 |
| 429 | `retry_wait`，指数退避并尊重 Retry-After | 是 | 稍后自动重试 |
| 5xx、超时、断网 | `retry_wait` | 是，有上限后继续留存 | 网络恢复后重试 |
| 本地 IDB 写失败 | 保持活动证据/导出提示 | 由用户重试 | 无法安全保存，先导出 |

仅在服务端返回稳定机器码时判定认证失效；不再使用“错误文本包含 token”作为唯一判断。

退避建议为 5s、30s、5min、30min、2h，上限后保持 `retry_wait` 并等待启动/联网/手动操作，不删除记录。

## 7. 服务端记录与资格一致性

### 7.1 幂等事务

在 `/api/records` 和分块 `complete` 中复用现有唯一索引：

1. 解析并验算回放；
2. 校验用户、模式、会话 token（允许已结束但属于该用户的会话按现有规则提交）；
3. 按 `user_id + client_record_id` 查找；
4. 再按 `user_id + mode_key + replay_fingerprint` 查找；
5. 若是同一记录，返回现有记录；若是普通记录后补齐会话凭证，事务内更新其会话关联和记录时代；
6. 只有新记录才写 replay object、records、ranked session 终态和成就派生数据。

所有写入使用同一数据库事务，避免“回放已存但记录未写”或“重复检测提前返回导致无法升级”。

### 7.2 目标级速度资格

`tile_times_ms`、速度资格和排行榜查询按目标键独立处理。旧记录没有资格字段时按兼容策略保留可见性；新策略只对有证据的目标设置 `eligible`/`ineligible`/`unknown`，不把整条记录写成统一 `review` 后再从查询中排除。

发布迁移必须先做 dry-run，保存记录数、玩家数、Top N 和各目标数量快照；任何未批准下降自动阻断。

## 8. 5×5 分块与容量

- 前端在构建信封时计算 UTF-8 字节数和整体摘要，不以字符数代替字节数。
- 服务端响应 `413 REPLAY_TOO_LARGE` 时不重试同一完整请求，直接创建分块任务。
- 分块大小由服务端建议（例如 256 KiB～1 MiB），客户端只保留任务 ID和已确认索引；原始回放仍在 IndexedDB。
- 服务端可将块写入临时对象存储或临时表，完成时流式计算 SHA-256 和 RPL1 验算，避免把整个数百万步回放复制到多份内存。
- 分块失败不会降级为截断、压缩到不可验证格式或丢弃动作。

## 9. 管理员最小运维设计

### 9.1 页面边界

复用现有 `2048-next/admin.html` 的仪表盘、用户中心、游戏记录、审计日志和数据工具，不新增顶级导航模块：

| 现有模块 | 本任务增加内容 |
| --- | --- |
| 仪表盘 | 服务器已观测投递成功率、错误码、幂等命中和分块任务摘要 |
| 用户中心 | 设备会话列表、撤销单个/全部设备会话 |
| 游戏记录 | 投递、幂等、验证版本、分块状态和目标级资格详情 |
| 审计日志 | 会话撤销、自助补传、管理员补录、资格变更事件 |
| 数据工具 | 固定的只读迁移/发布对账报告 |

不修改 `2048-ranked`，也不增加独立“上传中心”。管理页面继续只调用 `2048-game-api`；统计、权限和审计仍由后端权威计算。

### 9.2 投递健康口径

服务器只能统计已经到达 API 的请求或已创建的分块任务。后台必须把指标命名为“服务器已观测投递”，并显示时间窗口和样本数；不得推断浏览器 IndexedDB 中从未发出的记录数量。

最小聚合字段：

- 成功、duplicate、401/会话撤销、413、429、5xx、回放验证失败；
- 按模式、客户端版本、稳定错误码分组；
- 分块任务 created/uploading/completed/expired/failed；
- `client_record_id` 去重后的提交数和最终记录数。

优先从现有结构化审计事件和记录表聚合；只有现有数据不足以表达状态时才增加最小事件字段，不新建独立分析系统。

### 9.3 设备会话管理 API

在现有 Admin 用户合同下增加：

- `GET /api/admin/users/:id/device-sessions`：返回会话 ID、设备标签、创建/最近使用/撤销时间和状态；
- `POST /api/admin/users/:id/device-sessions/:sessionId/revoke`：撤销单个会话；
- 现有 `POST /api/admin/users/:id/revoke-sessions`：调整为撤销全部设备会话并递增必要的认证版本。

所有写操作要求超级管理员、操作原因、目标用户保护规则和审计；响应不包含 token 哈希、原始 Cookie、完整 IP 或认证密钥。

### 9.4 记录诊断合同

扩展现有 `/api/admin/records` 返回和筛选，而不是新建平行记录系统：

- `client_record_id`、`replay_fingerprint`、`verifier_version`；
- 记录来源、客户端版本、最后稳定错误码；
- 幂等命中/升级结果；
- 分块任务 ID和状态（有则展示）；
- 每个目标方块的 `eligible/ineligible/unknown` 和原因。

“记录未找到”只能表示服务器没有对应 `client_record_id`/指纹，不能证明浏览器没有本地记录。管理员人工补录继续复用现有 preview/commit 回放验算；自助补传成功时直接定位同一服务器记录，不再重复补录。

### 9.5 只读对账与危险操作隔离

对账输出固定字段：总记录、有效记录、玩家数、各模式榜单数、Top N 记录 ID、各目标资格数量。它可以由 Admin API 或发布脚本生成，但只允许固定只读查询，不允许接收任意 SQL 或在同一操作中修改数据。

现有记录“隐藏/恢复”保留用于明确内容治理，必须要求原因和审计；上传错误、缺字段或目标速度异常不调用该入口。资格迁移和数据修复使用独立、可审阅、可回滚的前向迁移，不在页面增加“一键修复/批量隐藏”。

## 10. 安全、隐私和滥用控制

- Cookie `HttpOnly`、`Secure`、`SameSite=Lax/Strict` 按现有跨站需求选择；所有状态变更接口保留 CSRF 防护策略。
- 设备会话 token 只存哈希；访问令牌仅在内存；日志脱敏。
- 手动补传仍必须经过服务端认证、模式、种子/挑战、RPL1、终局和幂等校验；“本地可信”不是绕过验证。
- 分块任务按用户和 `client_record_id` 限流，限制单任务总字节、块数、保留时间和并发数。
- 游客记录转移需要明确确认，避免共享设备串号。

## 11. 兼容、发布和回滚

### 11.1 兼容顺序

1. 后端先发布可识别新 Cookie/旧 Bearer、返回稳定错误码和新记录字段的版本。
2. 前端发布 IndexedDB 迁移、状态 UI、cookie-first 恢复和普通记录可靠投递。
3. 后端再启用大回放分块入口和阈值协商。
4. 验证一段时间后，才减少旧 localStorage pending 的兼容读路径；不立即删除旧字段。

### 11.2 回滚

- 前端可回滚到旧 UI；已写入的 IndexedDB 新字段必须可被旧代码忽略，不能回滚时删除记录。
- 后端设备会话表和分块任务表保留；旧客户端仍可用旧 Bearer + `/api/records`。
- 若新记录契约异常，关闭分块入口和自动资格新规则，但保持普通记录入库与现有排行榜可见性。
- 管理后台新增卡片/字段可以独立隐藏或回滚；设备会话与投递核心 API 不依赖后台页面才能工作。
- 任何数据迁移只允许前向兼容、可重复执行、无删除；历史资格修正必须有独立备份和反向 SQL 方案，且先 dry-run。

## 12. 关键风险与取舍

| 风险 | 处理 |
| --- | --- |
| 长寿命 Cookie 被窃取 | HttpOnly/Secure、服务端单设备撤销、密码变更递增 auth_version；不把“方便”扩展为永久明文 token |
| IDB 容量不足 | 先保存、读回校验、导出提示；不复制 payload；超长回放只分块传输不在本地复制 |
| 多标签页重复提交 | 客户端互斥 + 服务端唯一约束；接受至少一次请求 |
| 游客/账号串号 | owner 字段和显式转移；账号不匹配进入 needs_action |
| 旧历史无资格字段 | `unknown`/兼容查询，不批量隐藏；目标级判定 |
| 5×5 任务耗时 | 已确认块索引和后端流式校验；前端状态可恢复 |
| 设备会话 schema 变更 | 先加表和接口，旧令牌兼容一段时间，失败可回滚到 Bearer |
| 后台误报本地待上传数量 | 只展示服务器已观测指标，明确不可见边界 |
| 管理员再次用隐藏代替修复 | 隐藏与上传/资格状态分离，原因与审计必填，无批量入口 |

## 13. 设计验收检查

- [ ] 没有新增前端数据库或排行榜权威。
- [ ] 终局证据在任何网络请求前可读回。
- [ ] 认证失效不会删除待上传记录。
- [ ] 普通小记录路径不受分块复杂度影响。
- [ ] 所有重复写入使用既有唯一键或同等约束。
- [ ] 速度资格按目标隔离，旧记录可见性不下降。
- [ ] 迁移和发布都有快照、阻断和回滚条件。
- [ ] 管理后台只增加最小运维视图，不修改 `2048-ranked` 或收集浏览器完整本地历史。
- [ ] 设备会话、记录诊断和隐藏操作的权限、原因与审计边界明确分离。
