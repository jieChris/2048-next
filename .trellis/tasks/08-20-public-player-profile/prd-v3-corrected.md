# 公开玩家个人主页与昼夜背景素材体系 PRD

**版本**：3.1（实现边界修正版，取代 v3.0）
**状态**：待实现；已按真实代码库核对并收敛 AI 数据处理范围
**适用仓库**：`2048-next`（前端 MPA）、`2048-game-api`（唯一后端与数据库）
**不涉及**：`2048-ranked`
**权威实现文件**：`2048-game-api/2048-game-api/src/server/app.ts` 及其 `src/server/*.ts` 模块、`migrations/postgres/*.sql`。`src/index.ts` 内的 SQLite/D1 遗留代码不属于本任务实现面。

---

## 0. 相对 v2.1 的合同修正清单（必读）

本节记录 v3.0 相对 v2.1 的实质性修正。所有修正均已对照 `migrations/postgres/` 与 `src/server/` 核对。进入编码前，这些修正覆盖 v2.1 中的对应表述。

1. **身份权威表确认为 `game_data.users`（v2.1 正确，命名保留）。** 已核对 `migrations/postgres/0002_account_authority.sql`：`game_data.users` 存在，含 `id、email、display_name、nickname、avatar_url、role、is_active、can_manage_brief/weekly/monthly、game_user_id、created_at、last_login_at、password_changed_at`。`beta-access.ts` 的 `FROM users` 依赖 `search_path=game_data` 解析到该表。因此 `created_at`（真实注册时间）、`display_name`、`role` 无需新增同步，直接从 `game_data.users` 读取即可。

2. **【新增关键修正】存在两个 id 空间，v2.1 的"`users LEFT JOIN profile_current`"过度简化。** 账号 id 是 `game_data.users.id`；游戏 id 是 `game_data.users_shadow.user_id`（= `game_data.users.game_user_id`）。所有游戏数据（`records`、`ranked_sessions`、`achievements`）外键指向 `users_shadow.user_id`。当前 `GET /api/user/:id` 的 `:id` 是**游戏 id**。因此公开主页必须显式定义主键与桥接（见 §4.1），不能用一次朴素 JOIN 完成。

3. **`game_user_id` 可空。** `game_data.users.game_user_id` 允许为 NULL 且仅在非空时唯一。已注册但从未产生游戏 id 的账号、或游戏侧存在但账号未回填 `game_user_id` 的情况都必须有确定行为（见 §4.1），不能默认双向存在。

4. **头像与旧字段的现状修正。** `game_data.users` 已有 `avatar_url` 列（账号级）。新头像审核系统必须明确与该列的关系（§4.3、§8.4），v2.1 只提到 `profile_cover`，遗漏了已存在的 `avatar_url`。

5. **账号删除必须接入既有清理机制，而非新建平行逻辑。** 现有 `src/server/account-deletion-prune.ts` 与 `app.ts` 中一份显式可清理表白名单（`app.ts` 内 `["users_shadow","records",...,"user_achievement_showcase","admin_rescue_offers","audit_events"]`，约第 6955 行）共同承载账号删除。本任务所有新表必须注册进这两处（见 §5.3）。

6. **OpenAPI 是新建工件，不是既有能力。** 仓库当前没有 OpenAPI 文档，现有为手写 Hono 路由。"从同一份 OpenAPI 生成前后端类型"作为发布门禁前，必须先立项 OpenAPI 的建立范围、生成器与责任人（见 §6.1）。否则该门禁不可满足。

7. **`SELECT ... FOR UPDATE SKIP LOCKED` 事务队列模式与现状一致。** 已在 `account-deletion-prune.ts`、`deleted-record-prune.ts`、`client-diagnostics.ts` 使用。审核 outbox worker 沿用该模式即可，无需新中间件。

8. **【范围修正】拆分为 P0/P1/P2 三期交付（见 §3）。** v2.1 将主页、背景 CMS、AI 审核平台、密钥托管、显示模式重构合并为单一任务，验收边界不清且与"closed beta 单实例"定位矛盾。v3.0 明确分期与每期独立验收。

9. **补齐 v2.1 的真实规格空洞：** 迁移/回滚期用户可见数据（§10.3）、头像文件移动崩溃恢复顺序（§8.4）、DeepSeek SLA/超时/队列上限/全局成本熔断（§8.5）、模式 key 引用回退（§4.2）、审核文案 i18n（§8.7）、AI 服务不留存/不训练的技术边界（§8.8）、`profile_bio` 长度依据（§4.2，已定为 150）。个人信息出境等法务流程不纳入本任务实施门禁。

---

## 1. Problem Statement

`user.html` 目前主要是记录列表页。个人主页的前端交互（头像、简介、封面、代表模式、展示成就）已在本地工作树中呈现出"完成"的视觉效果，但后端契约没有闭环：资料保存、头像提交与审核、公开资料读取、展示成就槽位均无持久化与公开读取支撑。视觉"完成"不等于功能可持久化、可公开读取或可部署。

主页横幅目前是前端写死的三张图片加 CSS 滤镜，无法让管理员上传多套素材、无法校验一套素材是否完整、无法把昼间与夜间版本配成同一场景，也无法让用户选择一个完整背景后由显示状态自动切换昼夜。继续手动替换图片会反复产生尺寸、透明度、场景错配、缓存与部署回归。

用户可编辑的简介与头像缺少统一的内容安全审查边界。昵称继续使用现有服务端校验（`nicknameGuard`、长度、唯一性），不进入 AI 审查。简介与头像必须由服务端统一编排审查，审查失败时保持旧的已公开版本，绝不把未审查内容直接公开。

发布前存在版本卫生问题：浏览器运行的是落后且含大量未提交修改的工作树，而 `main`/`origin/main` 已有的 `finalized_local` 手动补传修复必须保留。任何实现都不能用当前脏工作树直接覆盖 `main`。

## 2. 目标与非目标

**目标**：把个人主页升级为"服务器权威的公开玩家主页"，并（分期）新增后台管理的完整昼夜背景场景目录与统一内容审查。

**非目标（Out of Scope）**：关注/好友/私信/动态/评论等社交关系；用户自定义上传横幅；用户上传背景 URL/HTML/脚本/任意 CSS；自动图像生成/抠图/运行时语义分层；把图片二进制或 base64 存入数据库；本任务引入 COS/CDN/多实例媒体服务（首版沿用独立私有持久存储边界，未来迁移不改变 API 合同）；Rating 计算系统（主页保留既有占位）；重写记录/排行榜/回放/RNG/计时校验；引入 Bootstrap/Astro 或新 UI 框架。

## 3. 交付分期与优先级

v2.1 把五个可独立立项的系统压成一个任务。v3.0 按风险与依赖拆分为三期，每期有独立验收门禁，可分别合入 `main`。

### P0 — 公开主页 + 资料写入 + 简介 AI 文本审查（含审查平台基础设施）

> **分期决定**：P0 拆为两个增量以控制实现风险。P0a 先交付公开主页和非 AI 资料字段，P0b 再接入简介 AI 审查；P0b 不依赖本任务外的法务流程，但必须满足 §8.8 的供应商技术数据处理约束。

**P0a（可立即开工，不含简介编辑与审查）：**
- `GET /api/user/:id` 扩展为完整公开资料（§4、§6.2）；简介字段在 P0a 阶段读为占位/空，不开放编辑。
- `PATCH /api/user/me/profile`：仅 `featured_mode_keys`、`background_scene_id`（P0a 阶段仅接受内置默认枚举，正式目录在 P1 上线）。**不含 `profile_bio`**。
- `GET /api/user/:id/achievements` 追加 `showcase_slot`（复用既有 `user_achievement_showcase.slot`）。
- 三态显示模式（§9）：纯前端 + 存储键迁移，不依赖后端新表。
- 数据层可提前建 `profile_current`/`profile_revisions` 表（简介列先不开放写）。

**P0b（P0a 契约稳定后开工）：**
- `PATCH /api/user/me/profile` 开放 `profile_bio`（≤150 code points）。
- **简介从第一天起即接入 AI 审查**：提交简介即创建审核提交并送 `deepseek-v4-flash`，`moderation_required_for_bio` 默认开启；审查中保留旧的已批准简介，fail-closed（§8.2）。文本审查平台基础设施随 P0b 落地：DeepSeek 文本适配器、审查状态机（文本分支）、PostgreSQL 幂等 outbox 队列（§8.3）、简介限频/violation/7 天禁用引擎（§8.9）、DeepSeek 密钥托管（§8.6）、SLA/超时/全局成本熔断（§8.5）和 §8.8 的不留存/不训练技术约束。

> **前置门禁**：P0b 只需先完成 P0a 的 API 合同和迁移准备，并验证 DeepSeek Key、模型路由及 §8.8 技术约束。P1 背景 CMS 不依赖 P0b，可与之并行。

### P1 — 昼夜三层背景素材 CMS（中风险，含文件校验与存储状态机）
- 管理员素材库：三层变体上传、真实图像校验、昼夜配对、场景发布/归档、默认场景、版本化 URL（§7）。
- 用户背景选择：编辑器只显示已发布完整场景的白天预览，保存 `background_scene_id`（§7.5）。

### P2 — 头像上传与图片视觉审查（在 P0 已建成的审查平台上扩展）
- 头像上传、真实解码/处理、独立待审目录（§8.4）。
- 在 P0 文本审查平台上新增图片路由 `deepseek-v4-flash-vision-exp` 与视觉审查（§8.1）。
- 头像审核端到端：上传→视觉审查→管理员人工批准→公开（§8.4）。
- 头像限频（7d×1）复用 P0 的限频引擎；头像相关私有对象删除接入既有 prune（§5.3）。

> 说明：文本审查平台在 P0 建成后，P2 只是在其上叠加图片/视觉能力与头像文件处理。P1 背景 CMS 与 P2 头像审查互不阻塞，均可独立回滚。

---

## 4. 权威架构与数据模型（已按真实 schema 重写）

### 4.1 两个 id 空间与公开主页的规范键（核心修正）

真实架构存在两个 id：

- **账号 id**：`game_data.users.id`（`BIGSERIAL` 主键）。账号身份权威，含 `email、display_name、nickname、avatar_url、role、is_active、can_manage_*、game_user_id、created_at、last_login_at`。
- **游戏 id**：`game_data.users_shadow.user_id`（`BIGINT` 主键）。所有游戏数据（`records`、`ranked_sessions`、`replay_objects`、`user_achievements`、`user_achievement_showcase`）通过外键指向它。
- **桥接**：`game_data.users.game_user_id`（可空、非空时唯一）指向 `users_shadow.user_id`。

**规范决定：公开主页 `:id` 继续使用游戏 id（`users_shadow.user_id`），与现有 `records/stats/achievements` 端点保持一致，避免出现第二套 id 语义。** 公开读取的权威查询定义为：

```sql
-- 以游戏 id 为锚，左连账号身份与新资料读模型
SELECT s.user_id,
       COALESCE(u.nickname, s.nickname)          AS nickname,
       u.created_at                              AS registered_at,   -- 真实注册时间，来自 game_data.users
       pc.profile_bio, pc.background_scene_id, pc.featured_mode_keys,
       pc.approved_avatar_url                    AS avatar_url        -- 见 §4.3
  FROM game_data.users_shadow s
  LEFT JOIN game_data.users u   ON u.game_user_id = s.user_id
  LEFT JOIN game_data.profile_current pc ON pc.user_id = s.user_id   -- profile_current 以游戏 id 为键
 WHERE s.user_id = $1
   AND <公开可见性条件，沿用现有 publicGameOwnerSql>;
```

**边界行为（v2.1 未定义，必须实现并测试）：**

- `users_shadow` 有行但 `game_data.users` 无匹配（`game_user_id` 未回填）：主页正常渲染，`nickname` 回退到 `users_shadow.nickname`，`registered_at` 回退到 `users_shadow.created_at`（并在响应中标注为近似值或直接省略精确注册时间，避免把首次同步时间冒充注册时间）。不得 404。
- `game_data.users` 有账号但 `game_user_id` 为空（从未产生游戏 id）：该账号没有公开游戏主页 URL（无游戏 id 可寻址）；此为预期，不属于缺陷。
- `profile_current` 无行：返回安全默认（空简介、默认背景、空代表模式、账号级 `avatar_url` 或内置默认头像），不得 404。

> 说明：v2.1 写的"`users LEFT JOIN profile_current`，缺少 shadow 行不能导致 404"在真实架构下不成立——因为所有游戏统计都以 `users_shadow.user_id` 为外键，"缺少 shadow 行"等价于"没有任何游戏记录"。规范锚点必须是游戏 id。

### 4.2 `profile_current` 资料字段

新建 `game_data.profile_current` 作为简介、背景、展示模式与已批准头像引用的权威读模型，**以游戏 id（`user_id`）为主键**，外键引用 `game_data.users_shadow(user_id) ON DELETE CASCADE`：

- `profile_bio`：文本，服务端去除首尾空白，**上限 150 个 Unicode 字符（用户已定）**，按 code point 计数（不是字节，不是 UTF-16 length），emoji 等按其 code point 数计。简介从第一天起即接入 AI 审查（§8），提交即创建审核提交、不直接覆盖公开值。
- `featured_mode_keys`：最多 3 个「当前存在且该玩家有有效记录」的模式 key，顺序即展示顺序。**引用回退（v2.1 遗漏）**：读取时若某 key 已下线/删除或玩家已无该模式有效记录，服务端在响应中静默过滤该 key 并返回实际可用子集；不修改存储、不整槽清空，用户下次编辑时看到已过滤结果。
- `background_scene_id`：完整昼夜场景 id（P1 前仅内置默认枚举）。
- `avatar_revision_id`、`bio_revision_id`、`revision`（乐观并发）。
- 账号身份字段（`nickname`、`display_name`、`role`、`created_at`）**不复制**到 `profile_current`，一律从 `game_data.users` 读取。昵称更新继续走现有专用接口与 `nicknameGuard`，不进入本资料表也不进入 AI 队列。

### 4.3 头像字段与既有 `avatar_url` 的关系（修正）

`game_data.users.avatar_url` 已存在（账号级，历史可能由旧流程写入）。为避免双写歧义：

- 新头像审核系统的**已批准公开头像**由 `profile_current.avatar_revision_id` → `avatar_objects` 解析出不可变公开 URL，记为 `approved_avatar_url`。
- 公开主页优先返回 `approved_avatar_url`；当其为空时回退到 `game_data.users.avatar_url`（兼容旧数据），再回退到内置默认头像。
- 头像审核链路只写 `avatar_submissions`/`avatar_objects`/`profile_current.avatar_revision_id`，**不回填或改写 `game_data.users.avatar_url`**，避免双写与绕过审核；旧列仅作为没有新头像时的兼容读取回退。

---

## 5. 数据库对象与迁移

### 5.1 新增表（按分期）

P0：`profile_current`、`profile_revisions`（简介不可变修订）；**以及文本审查平台表**：`moderation_submissions`、`moderation_attempts`、`moderation_outbox`、`moderation_policy_versions`、`moderation_rate_events`、`integration_secrets`、`integration_secret_audit`（因简介从 P0 起即送审）。
P1：`bg_variants`（三层变体）、`bg_scenes`（昼夜场景）、`bg_default`（默认场景指针）。
P2：`avatar_submissions`、`avatar_objects`（头像图片审查复用 P0 的 `moderation_*` 与限频表，仅新增头像对象/提交表）。

所有表建于 `game_data` schema，遵循既有迁移编号规范（`migrations/postgres/NNNN_*.sql` + 写入 `game_data.schema_migrations`），设置外键、唯一约束与索引。游戏 id 相关外键统一 `REFERENCES game_data.users_shadow(user_id) ON DELETE CASCADE`。

### 5.2 迁移安全（沿用既有 Expand/Backfill/Contract 纪律）

1. **Expand**：新增表、字段、索引、capability 与 feature flag，不改变现有公开行为。
2. **Backfill**：`profile_current` 从 `game_data.users`/`users_shadow` 回填（`profile_bio` 空、`avatar` 引用旧 `avatar_url`）。生成失败不覆盖旧值。
3. **Contract**：先上线 API 合同与 mock worker，再开管理员自测。
4. 迁移必须可重复执行（`IF NOT EXISTS`/`ON CONFLICT`），且**不删除**现有用户、记录、成就或头像引用。

### 5.3 账号删除必须接入既有清理机制（修正 v2.1 遗漏）

现有账号删除由 `src/server/account-deletion-prune.ts` 与 `app.ts` 内一份显式表白名单共同承载。本任务新表必须：

- 加入 `app.ts` 中账号删除白名单数组（现值含 `users_shadow、records、...、user_achievement_showcase、admin_rescue_offers、audit_events`），使删除时被识别；
- 在 `account-deletion-prune.ts` 的清理序列中新增对 `profile_current`、`avatar_submissions/objects`、`moderation_*`、`moderation_rate_events` 及对应私有对象文件的级联删除，复用其既有 `FOR UPDATE SKIP LOCKED` 批处理；
- 私有对象（待审原图、模型证据）删除必须记录删除结果；审计日志仅保留必要哈希与摘要。
- **禁止**新建一套独立的、与既有 prune 不一致的删除逻辑。

## 6. API 合同

### 6.1 OpenAPI 现状澄清（修正 v2.1）

仓库当前**没有** OpenAPI 文档，现有为手写 Hono 路由。因此"从同一份 OpenAPI 生成前后端类型并通过类型检查"不能作为默认既有能力。**已定（用户 2026-08-22）：采用方案 A。**

- **方案 A（已选）**：只为本任务新增/修改的端点手写一份 OpenAPI 片段，用 `openapi-typescript` 生成前端类型；现有历史端点不强制纳入。发布门禁为"本任务端点的 OpenAPI 与生成类型一致"。
- ~~方案 B（重）：为整个 API 建立 OpenAPI 单一真源。~~（未采用；如日后需要，另立独立基础设施任务，不阻塞本任务。）

在方案确定前，发布门禁 §12 中的"OpenAPI 类型一致"仅对本任务端点生效。

### 6.2 端点冻结清单（按分期，含错误码）

P0（含简介文本审查平台）：
```text
GET   /api/user/:id                          # 扩展公开资料字段（§4.1）
PATCH /api/user/me/profile                   # profile_bio / featured_mode_keys / background_scene_id
GET   /api/user/:id/achievements             # 追加 showcase_slot: 1|2|3|null
现有昵称接口                                  # 保持路径与 nicknameGuard 语义，不改动
GET   /api/user/me/moderation-submissions    # 本人查看简介审查状态与安全提示
GET   /api/admin/moderation/submissions?status=manual_review
POST  /api/admin/moderation/submissions/:id/review   # 人工批准/拒绝/要求重试
POST  /api/admin/moderation/submissions/:id/retry    # 仅 failed_retryable
GET/PUT/POST/DELETE /api/admin/integrations/deepseek[/key|/test]   # 密钥托管（文本审查所需）
```
P1：
```text
POST   /api/admin/profile-background/variants
GET    /api/admin/profile-background/variants
POST   /api/admin/profile-background/scenes
GET    /api/admin/profile-background/scenes
POST   /api/admin/profile-background/scenes/:id/publish
POST   /api/admin/profile-background/scenes/:id/archive
PUT    /api/admin/profile-background/default
GET    /api/profile-backgrounds                        # 公开：仅已发布完整场景 + 白天预览
GET    /api/profile-backgrounds/:id/layers?variant=day|night
```
P2（头像与图片视觉审查，复用 P0 平台）：
```text
GET/POST /api/user/me/avatar-submission
GET      /api/user/:id/avatar/:submissionId            # 仅已批准不可变对象
GET      /api/admin/avatar-submissions?status=pending
GET      /api/admin/avatar-submissions/:id/image
POST     /api/admin/avatar-submissions/:id/review
```
> 头像走与简介相同的 `moderation-submissions` 查询与 admin review/retry 端点（P0 已建），P2 不重复定义，只新增头像专用的上传与图片读取端点。

最小错误码集合（机器可读 `reason_code` + 明确 HTTP 状态）：`unauthorized`、`forbidden`、`validation_error`、`revision_conflict`、`idempotency_conflict`、`rate_limited`、`bio_temporarily_blocked`、`content_review_pending`、`content_rejected`、`provider_unavailable`、`not_found`。所有可重试写操作要求 `Idempotency-Key`；同用户同 Key 不同 payload → `409`，相同 payload → 返回首次结果。公开接口只返回 approved 版本，不泄露邮箱、角色、审核路径、私有对象 key、待审状态或管理员字段。

### 6.3 资料编辑写语义

`PATCH /api/user/me/profile` 服务端校验：字段白名单、简介长度（≤150 code points）、场景已发布、模式存在且属于该用户有效记录集合、最多 3 个模式、身份权限。`background_scene_id` 与 `featured_mode_keys` 是非 AI 字段，校验通过即时更新；`profile_bio` 只创建审核提交、不直接覆盖公开值（简介从 P0 起即送审）。同一 PATCH 混合非 AI 字段与简介时，一个事务保存非 AI 字段并创建简介审查任务，公开快照只替换已批准字段。禁止经此接口改 `nickname`、`display_name` 或直接写 `avatar_url`。

---

## 7. 昼夜三层背景素材系统（P1）

### 7.1 三层变体
一个变体含 `sky`（不透明天空）、`city`（真实 Alpha 建筑）、`foreground`（栏杆/植物/灯具/地面反光，真实 Alpha）。元数据：`scene_family_id`、`variant`(`day`|`night`)、`width`、`height`、每层 MIME/大小/SHA-256/Alpha 检查结果、对象相对路径、状态(`draft`|`validated`|`paired`|`published`|`archived`)、创建人/时间。

### 7.2 完整场景
```text
background_scene = { scene_family_id, day_variant_id, night_variant_id, status, revision }
```
仅当两个变体都存在、都通过校验、`scene_family_id` 一致、三层元数据完整时，场景才能 `published`。尺寸首版固定 `2172×272`；如允许其他尺寸须版本化能力声明，同一场景昼夜尺寸必须一致。后处理只允许整体裁切/缩放/定位，禁止运行时从合成图抠图。

### 7.3 上传与校验
上传流程是「暂存→校验→注册→配对→发布」状态机，禁止直接覆盖旧文件。服务端校验：三张齐全且层名唯一；MIME 与真实解码格式；尺寸统一 `2172×272`；天空不透明；城市/前景具备真实 Alpha；无伪棋盘格/整片半透明底色/重影边缘/异常透明区；文件大小与像素总量上限；每层 SHA-256；昼夜两变体场景族与几何契约一致。校验失败不得写入已发布对象、不得更新当前默认场景；失败时三张图片都不入可用目录。

### 7.4 版本化与缓存
素材 URL 使用不可变版本/修订号，避免浏览器/CDN 缓存旧图或昼夜混用。旧场景不因替换文件而改变。

### 7.5 用户选择与渲染
编辑器调 `GET /api/profile-backgrounds`，仅显示 `published` 完整场景，卡片只加载白天缩略图并提示"夜间会随显示模式自动切换"。保存只提交 `background_scene_id`。渲染时：`auto` 按系统偏好选昼夜；`day`/`night` 固定解析对应变体；三层始终来自同一场景同一修订；API 失败/场景归档/资源加载失败回退内置默认场景。管理员下线场景后，已选该场景的用户安全回退默认背景，不产生死链。

## 8. AI 内容审查平台与密钥托管（文本=P0，图片=P2）

> 分期说明：**简介文本审查（`deepseek-v4-flash`）及本节所有平台基础设施（状态机、outbox、限频、密钥托管、成本熔断）属于 P0**（简介从第一天起送审）。**图片视觉审查（`deepseek-v4-flash-vision-exp`）与头像处理属于 P2**，在 P0 平台上叠加图片路由即可。本节按能力描述，落地顺序以此分期为准。

### 8.1 审查范围与模型路由
- 文本（仅个人简介）→ `deepseek-v4-flash`；图片（头像及未来用户图片）→ `deepseek-v4-flash-vision-exp`。
- 昵称/展示名不送审，继续用现有 `nicknameGuard`/长度/唯一性；未来新增独立展示名字段须先明确复用同一校验器或另定规则。
- 不送审：分数、棋盘、回放动作、排行榜字段等与内容安全无关的数据。
- 前端不能直接调用模型；DeepSeek 只由 API 服务端调用。

### 8.2 服务端状态机
```text
submitted -> ai_reviewing -> ai_pass | ai_reject | manual_review | failed_retryable
manual_review -> approved | rejected
ai_pass       -> approved | manual_review   # 文本可按策略自动批准；头像必须人工批准
```
每次提交创建不可变 `submission_id` 与服务端版本，不覆盖当前已批准内容。文本仅在规则明确通过且置信度达阈值时自动 `approved`；低置信度/策略冲突/模型异常/申诉一律 `manual_review`。头像即使 `ai_pass` 也必须人工批准。`ai_reject` 不公开新内容；拒绝原因经输出安全过滤，只展示可解释的安全分类或短提示，不返回模型原始文本。DeepSeek 超时/429/5xx/网络故障/额度耗尽/空响应/非法 JSON 只能进入有限重试与 `failed_retryable`/`manual_review`，**必须 fail-closed**。

### 8.3 队列与幂等（沿用既有 SKIP LOCKED 模式）
提交事务同时写 `moderation_submissions` 与 `moderation_outbox`，提交成功后 worker 才能领取。worker 用 `SELECT ... FOR UPDATE SKIP LOCKED` 领取、写 `lease_until`，租约过期可被接管；最多自动 3 次，退避 1/5/30 分钟，最终进入 `failed_retryable` 或 `manual_review`。客户端不能创建内部 job/提交 verdict/改状态；outbox 消费与 admin retry 只能由 API 进程/受保护 worker 身份调用，内部路由不暴露公网。同用户+同内容类型+同规范化内容用 `content_hash` + 幂等键去重，重试复用同一任务，不重复创建公开版本或重复计费。

### 8.4 头像处理与文件移动崩溃恢复（补齐 v2.1 空洞）
处理规则：原始 ≤200 KiB，仅 JPEG/PNG/WebP；解码后宽高 128–2048 px、像素 ≤4 MP；服务端真实解码，拒绝伪扩展名/动画/异常尺寸/SVG/伪造 MIME/恶意 EXIF；旋转纠正、居中裁剪 256×256、去元数据、重编码 WebP，公开 WebP ≤200 KiB；原始上传不持久化，处理后文件进独立待审目录。

**批准发布的崩溃恢复顺序（v2.1 缺失，必须实现）**——采用「先落对象再提交 DB，且对象操作幂等 + 对账兜底」：
1. 生成不可变公开对象 key（含内容哈希，天然幂等；重复写同 key 是无副作用覆盖）。
2. 将处理后文件复制（非移动）到公开目录的该不可变 key；
3. 同一 DB 事务内更新 `avatar_objects` 状态、`profile_current.avatar_revision_id`、旧头像标记 `superseded`、写审计；
4. 事务提交成功后再异步清理待审目录源文件；
5. **崩溃对账**：若第 2 步成功但第 3 步事务未提交，公开目录多出一个无引用对象——由既有 prune 类周期任务清理孤儿对象；DB 永不指向不存在的对象。若第 3 步提交但清理未执行，待审目录残留源文件——同样由周期清理回收。任何单步失败都不产生"DB 指向缺失文件"或"用户看到半套状态"。

### 8.5 SLA、队列上限与全局成本熔断（补齐 v2.1 空洞）
- **provider 超时**：单次请求超时默认 10s（可配），`temperature=0`、有限 `max_tokens`。
- **用户可见时长**：简介"审查中"状态的目标 P95 ≤ 30s；超过进入 `manual_review` 而非无限等待。
- **队列积压上限**：`moderation_outbox` 未处理条数超过阈值时，新提交仍接受但前端提示"排队中"，并触发告警。
- **全局成本熔断（新增）**：维护按天/按小时的 provider 调用与 token 预算上限；超过预算时新任务进入 `manual_review`（fail-closed，不再自动调用 provider），避免合法提交被用作计费型 DoS 打爆账单。预算、worker 数、超时值均为服务端配置。
- 本地与 CI 使用 mock adapter，不产生真实费用；真实连接测试只发无业务内容的最小探测请求。

### 8.6 DeepSeek 密钥托管
`can_manage_integrations` 新 capability，默认仅授 `super_admin`/`owner`，权限变更本身审计。`integration_secrets` 存加密密文、Key 版本、末四位、状态、更新时间；加密主密钥来自部署 secret，不与数据库备份同边界。管理员页面仅支持配置/轮换/停用/测试，**不可读取明文**，只见"已配置/未配置、末四位掩码、最后更新时间、连接状态"。四个动作都需现有登录外的短时 step-up re-auth、CSRF/重放保护、`Cache-Control: no-store`、不可篡改审计。停用后新任务 fail-closed，进行中的请求自然结束但不启动新重试；轮换后旧 Key 立即失效或进入短暂撤销期。Key 绝不进入前端包、后续响应、普通查询、日志、错误栈或 API 响应。

### 8.7 审核文案的中英本地化（补齐 v2.1 空洞，本项目特有）
项目面向中国市场（`2048next.cn` / `2048.中国`）。审核状态、拒绝原因短提示、限频/禁用提示必须提供中英双语文案，随现有语言切换渲染；服务端返回机器可读 `reason_code`，前端按 locale 映射为本地化文案，不直接展示模型输出。图片审查策略类别须覆盖图片内嵌文字、NSFW、暴力、仇恨与违法内容。

### 8.8 AI 服务数据处理边界（本任务只冻结技术约束）

DeepSeek 在本项目中只作为一次性内容安全分类服务：

- 个人简介只发送给 `deepseek-v4-flash` 做审核判断；头像在 P2 只发送给 `deepseek-v4-flash-vision-exp` 做视觉审核；不发送分数、棋盘、回放、排行榜或其他无关业务数据；
- 提供方不得持久化原文/原图，不得用于训练、画像、推荐、人工标注或其他二次用途；审核完成后只返回结构化结论；
- 本项目不保存 provider 原始响应，不把原文/原图写入普通日志、错误栈或审计日志；系统只保存 submission 元数据、内容哈希、模型/策略版本、结论、原因码、时间和成本信息，以及产品需要的已批准简介/头像；
- 服务端必须使用固定模型映射和后端 Key，前端不得直连；连接测试不得发送真实玩家内容；provider 超时、错误或返回格式异常时 fail-closed，旧公开内容保持不变；
- 以上“不留存、不训练、不二次使用”必须以当前 API 服务条款或供应商书面能力为准；若实际能力不满足，停用真实审核链路，不得通过代码假设绕过。

本 PRD 不展开个人信息出境、供应商法务或组织审批流程；它们不作为本任务的实现门禁。若实际部署链路发生变化，再另立合规任务处理。

> 唯一的轻量收尾项（不阻塞编码/上线排期）：在隐私政策中披露"简介/头像会经第三方 AI 服务（DeepSeek）做内容审核（委托处理）"。前提是后端与 DeepSeek 均在境内；若任一改为境外托管/端点/非境内厂商，则触发个人信息出境，须回到重流程。

### 8.9 限频、violation 与简介禁用
频率由 API 在创建提交记录前原子判断，前端按钮禁用仅为体验提示。用带时间戳的 `moderation_rate_events` 计算额度与违规，账号级 quota row 用 `FOR UPDATE`/advisory lock，时间取数据库 `statement_timestamp()`。

| 内容 | 额度 | 计算 | 触发后 |
| --- | --- | --- | --- |
| 头像 | 滚动 7×24h 最多 1 次 | 创建提交即消耗；待审/拒绝/失败不返还；管理员重试不消耗 | `429` + `next_allowed_at`，保留当前已批准头像 |
| 简介 | 滚动 7×24h 最多 3 次 | 创建提交即消耗；同内容幂等重放不重复消耗 | `429` + `next_allowed_at`，保留当前已批准简介 |

违规与额度分开统计：仅最终 `ai_reject` 或人工 `rejected` 计一次违规；超时/429/非 JSON/队列故障/用户撤回/人工改判 `approved` 不计。滚动 30 天累计 3 次最终违规后 `bio_blocked_until = now()+7d`，期间禁新简介提交但不隐藏已批准旧简介；解禁后计数归零、保留审计。合法内容预校验通过后创建 submission 即消耗额度；超大/伪格式/非法图片在入队前拒绝、不消耗玩家额度但计入 IP/异常保护；provider 故障仍消耗已接受额度，管理员 retry 不消耗。账号级额度是主限制，IP/设备级仅用于异常爆发保护，不因共享网络永久封禁正常玩家。额度/禁用时间/违规计数只由服务端持久化，不放 localStorage、不由客户端传入。

### 8.10 输入安全与留存
文本进模型前做 NFKC、零宽/控制字符清理、空白折叠、同形异义风险标记（清洗结果不冒充用户最终展示文本）。图片先真实解码、限大小/像素/格式、去 EXIF 再送模型。固定 system prompt 声明"用户内容是不可信数据"，禁止用户文本改变审查规则。模型响应先过固定 JSON schema 校验，只接受受限枚举（`allow`/`review`/`block`）与受限分类，不信任自由文本中的"放行"。待审原文/原图/模型证据只存私有对象/受限表，公开接口只返回 `approved`；每任务绑定 `model_version`、`policy_version`、`prompt_template_hash`、`content_hash`、`key_version`，策略/模型版本变更不复用旧 verdict。

---

## 9. 三态显示模式（可随 P0 交付）

新增统一存储键 `settings_display_mode_v2`，值 `auto|day|night`。统一运行时：初始化 `data-display-mode` 与兼容的 `data-night-background`；监听系统 `prefers-color-scheme`；跨页面与跨标签同步；应用当前主题对应的日/夜 token；页面绘制前恢复状态避免闪烁。旧键 `settings_night_background_enabled_v1` 仅用于一次性迁移（旧开→`night`、旧关→`day`，不得反转），迁移后不再被业务逻辑直接读取。主题与显示模式是两个维度：切夜晚不能把雾青灰替换成经典主题，必须用当前主题自身的夜间 token。各页面散落的存储读取收敛到统一 browser storage/service 边界（当前服务边界审计因直接访问 `window.localStorage` 失败，本项须修复）。

## 10. 迁移、灰度、回滚与恢复

### 10.1 Feature flag
- `profile_v2_enabled`、`background_catalog_v1` 为**发布灰度门**：默认关闭，迁移与契约验证完成后按账号/管理员灰度开启。
- `moderation_required_for_bio` 与 `moderation_required_for_avatar` 为**安全门（fail-closed）**：各自默认开启。简介从 P0 第一天起即受 `moderation_required_for_bio` 保护；头像在 P2 开启 `moderation_required_for_avatar`。关闭任一安全门属应急操作，关闭后对应新内容只停留待审、绝不自动公开（§8 kill switch 语义一致）。

### 10.2 灰度
先对管理员与测试账号开启，确认公开字段、额度、旧记录不变后再扩大。Contract 阶段内置浏览器必须连接真实本地 API，不能只用 Vite。

### 10.3 回滚与用户可见数据（补齐 v2.1 空洞）
关闭 flag 即停止新写入/新公开读取，旧资料/头像/背景继续服务；迁移只向前兼容，回滚不删数据。**但必须评估用户可见的"回退感"**：若 `profile_v2_enabled` 关闭后公开读退回旧 `users_shadow` 路径，已填写简介/新头像/新背景的用户主页会"消失"这些字段。处理策略：

- 回滚为运维应急手段而非常规操作；回滚公告需说明"新资料字段将暂时不显示，但数据未删除，重新开启后恢复"。
- P0 的 `GET /api/user/:id` 即使在 flag 关闭时也应能读取 `profile_current`（若表已存在且有行）作为渐进增强。**已定（用户 2026-08-22）：回滚采用"停写但仍读"——关 flag 停止新写入，但已写数据继续公开读取，优先于"完全隐藏"。** 完全隐藏仅在确有安全事由（如泄露/合规撤下）时作为独立开关执行。
- 恢复演练必须覆盖数据库、私有对象、加密 Key 与 outbox。

## 11. 权限与审计
素材上传/配对/发布/归档/默认场景切换仅管理员；头像审核仅相应管理权限；AI 任务由服务端 worker 创建，人工复核/重试/覆盖/kill switch 仅相应权限；DeepSeek Key 仅 `can_manage_integrations`；不能审核自己提交的头像；受保护管理员账号不能被普通管理员修改。所有资料提交、AI 状态迁移、重试、人工覆盖、素材写操作记录操作者/任务、目标、动作、对象 id、旧状态、新状态、原因。API 不返回 token、Cookie、原始文件路径或密钥。人工覆盖记录操作者、旧结论、新结论、原因；AI kill switch 关闭时新内容只停留待审，不自动公开。

## 12. 测试与发布门禁

### 12.1 测试原则
只验证外部行为与数据安全边界，不测 CSS 选择器、内部函数名或临时实现细节。

### 12.2 关键测试（按分期）
- P0：迁移可重复执行且不删数据；`GET /api/user/:id` 双 id 空间四种边界（§4.1）均不 404 且不泄露；公开接口只返允许字段；资料白名单/简介长度（≤150 code points）/代表模式数量与归属；`featured_mode_keys` 引用回退过滤；`showcase_slot` 正确；三态显示模式状态机与旧键迁移不反转；`auto` 对系统主题变化实时解析；主题与显示模式独立；PATCH 失败前端不覆盖旧值；存储走统一边界。**文本审查（P0 起）**：DeepSeek 文本模型路由、输入规范化、提示词注入防护、模型响应 schema 校验；简介字段级 revision 发布与混合 PATCH 原子语义；状态机、幂等重试、超时/429/非 JSON 的 fail-closed、`moderation_required_for_bio` 默认开启下未过审不公开、人工覆盖、kill switch、文本任务成本熔断；简介额度（7d×3）与 30 天 3 次违规后 7 天禁用、旧简介保留、解禁、管理员覆盖审计；审查失败期间旧公开简介不变；outbox `FOR UPDATE SKIP LOCKED` 幂等与并发；provider 不留存/不训练约束、账号删除级联清理（新审查表接入既有 prune 白名单两处）、API Key 不泄露/掩码/轮换/权限隔离/审计。
- P1：三层缺失/尺寸不一致/Alpha 错误/场景不完整/错误配对被拒；仅完整昼夜场景可发布并出现在公开目录；发布/归档/默认切换原子性；失败操作不改当前生效场景；归档后用户回退；URL revision 与缓存隔离；昼夜切换不改布局/资料层/横幅尺寸。
- P2（头像/图片视觉审查）：头像真实格式/大小/尺寸/动画/权限；图片（vision）模型路由、输入规范化、响应 schema 校验；头像提交字段级 revision；头像状态机、幂等重试、fail-closed、人工覆盖、不能审核自己提交的头像、图片任务成本熔断；头像额度（7d×1）；审查失败期间旧公开头像不变；私有对象权限、头像对象账号删除级联清理；文件移动崩溃恢复对账（§8.4）。
- 端到端（内置浏览器 + 真实本地 API，非纯 Vite）：访客看他人主页；本人进出编辑模式；保存简介与背景；上传头像→待审→管理员批准→公开更新；勋章墙改动后主页三槽同步；背景编辑器只显示白天预览；auto/day/night 切换时同一场景三层 URL 正确替换且不改布局；分辨率 320×568/390×844/768×1024/1280×720 各验一次；经典与雾青灰主题各验白天/夜晚/自动；触摸与减少动态效果下无横向溢出。

### 12.3 发布门禁（每期独立）
API 类型检查；API 迁移与相关节点测试；前端类型检查；服务边界审计通过（修复 `window.localStorage` 直接访问）；相关 Smoke（修复旧模式 key）；本任务端点 OpenAPI 与生成类型一致（方案 A）；`git diff --check`；对抗性审查报告"无未解决 P0/P1"。以包含 `finalized_local` 手动补传修复的 `main` 为基准建立干净集成工作树；不得用当前脏工作树直接覆盖 `main`；未经用户明确要求不自动推送/建 PR/部署。

## 13. 成就展示（P0，复用既有权威）
继续用 `achievement_definitions`、`user_achievements`、`user_achievement_showcase`（后者已含 `slot`）。`GET /api/user/:id/achievements` 每项追加 `showcase_slot: 1|2|3|null`，服务端联结展示表返回。主页只读这一个接口，不维护第二份展示选择；勋章墙仍用现有本人读取/更新接口（`GET/PUT /api/user/me/achievement-showcase` 已存在）。

## 14. 产品决策

**已定（用户 2026-08-22）：**
- **`profile_bio` 上限 = 150 code points**（§4.2）。
- **简介从第一天起即接入 AI 审查**：文本审查平台随 P0b 落地，`moderation_required_for_bio` 默认开启（§3、§8）。
- **OpenAPI 采用方案 A**：仅本任务端点手写 OpenAPI + 生成类型；不做全量真源（§6.1）。
- **回滚可见性 = "停写但仍读"**：关 flag 停新写、已写数据仍公开读，优先于完全隐藏（§10.3）。
- **AI 服务只做一次性审核**：不留存原文/原图、不训练、不作画像或其他二次用途；系统不保存 provider 原始响应（§8.8）。
- **批准头像不回填 `game_data.users.avatar_url`**：新头像唯一权威为 `profile_current.avatar_revision_id → avatar_objects`；旧列只作兼容读取回退（§4.3）。

## 15. 设计原则（保留）
一套背景的最小可用单位是"昼间三层 + 夜间三层"，不是三张图；用户选场景、系统选昼夜变体；管理员发布目录、用户选个人背景，默认场景与个人场景不混同；文件更新用新修订不覆盖旧对象，失败时继续用旧修订；后端负责真实性/权限/持久化，前端负责展示与交互；多 agent 用于并行分析与隔离实现，对抗性 agent 用于阻止错误合并，最终由集成门禁决定是否进入 `main`。
