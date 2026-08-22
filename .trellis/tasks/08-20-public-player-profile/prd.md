# 公开玩家个人主页与昼夜背景素材体系 PRD

**版本**：2.1（合同收敛版）  
**状态**：待实现；已完成双 agent 审查，待 P0 合同复核  
**适用仓库**：`2048-next`、`2048-game-api`  
**不涉及**：`2048-ranked`

## Problem Statement

当前 `user.html` 仍然主要是记录列表页，个人主页前端已经出现了头像、简介、封面、代表模式和展示成就等交互，但后端契约没有闭环：资料保存、头像提交与审核、公开资料读取和展示成就槽位均存在缺口。当前页面在本地工作树中可以显示出“完成”的视觉效果，但并不等于功能已经可持久化、可公开读取或可部署。

同时，主页横幅目前是前端写死的三张图片和 CSS 滤镜。它不能让管理员上传多套素材、不能验证一套素材是否完整、不能把昼间和夜间版本配成同一场景，也不能让用户选择某个完整背景后由当前显示状态自动切换昼夜版本。继续以手动替换图片文件的方式维护，会再次产生尺寸、透明度、场景错配、缓存和部署回归。

用户可编辑的简介和头像还缺少统一的内容安全审查边界。昵称继续使用现有的服务端昵称校验和账号约束，不进入 DeepSeek 审查。仅靠前端提示或人工偶尔查看无法阻止简介/头像违规内容、提示词注入和重复提交计费，也不能在第三方审查服务故障时安全降级。因此简介和头像必须由服务端统一编排 DeepSeek 审查；审查失败时保持旧的已公开版本，绝不把未审查内容直接公开。

当前还存在发布前版本问题：浏览器 4186 运行的是一个落后且有大量未提交修改的工作树，`main`/`origin/main` 中已有的本地记录手动补传修复必须保留。任何实现都不能以当前脏工作树直接覆盖 `main`。

## Solution

将个人主页升级为“服务器权威的公开玩家主页”，并新增“后台管理的完整昼夜背景场景目录”。

玩家可以：

- 查看自己的或他人的公开主页；
- 查看真实游戏统计、模式记录、回放和成就；
- 在编辑模式中修改简介、选择完整背景场景和最多三个代表模式；
- 上传头像，等待管理员审核；
- 在编辑背景时只看到白天预览，实际显示由全局显示模式自动选择白天或黑夜素材。

管理员可以：

- 每次上传一组天空、城市、前景三层素材；
- 查看服务端尺寸、格式、Alpha、哈希和叠合预览校验结果；
- 将一个白天三层变体和一个黑夜三层变体配成完整场景；
- 只发布完整的昼夜场景供玩家选择；
- 设置默认场景、下线或归档旧场景；
- 在后台审核头像，并查看所有操作审计。

设置页顶部提供统一的显示模式分段按钮，与中英文切换并列：

```text
中文  EN        显示：自动  白天  夜晚
```

显示模式语义固定为：

- **自动**：跟随系统 `prefers-color-scheme`；
- **白天**：强制使用白天素材和当前主题的白天外观；
- **夜晚**：强制使用夜晚素材和当前主题的夜间外观。

用户保存的是完整场景 ID，而不是单独的白天或夜间图片。系统始终从同一场景中解析昼夜变体，禁止产生昼夜场景错配。

## User Stories

### 玩家主页

1. 作为访客，我希望打开玩家主页时看到昵称、头像、简介、注册时间、代表模式、最近记录和真实成就，以便快速了解玩家。
2. 作为主页所有者，我希望进入编辑模式后才看到编辑按钮，以便正常浏览时与访客视图一致。
3. 作为访客，我希望不能修改别人的资料、背景、代表模式或头像，以保证权限边界清晰。
4. 作为玩家，我希望主页显示的成就来自游戏现有成就系统，而不是另造一套主页成就。
5. 作为玩家，我希望主页展示成就与勋章墙的三个槽位完全一致，调整勋章墙后主页自动同步。
6. 作为玩家，我希望模式成绩按实际模式分类，并能看到最高分、最大方块、最快时间和局数。
7. 作为玩家，我希望记录筛选、排序、撤回状态和回放入口继续使用现有记录权威数据，不产生第二份成绩数据。
8. 作为玩家，我希望注册时间自动来自账号创建时间，不能被主页编辑覆盖。
9. 作为玩家，我希望简介有明确长度限制，保存失败时保留原内容并显示错误。
10. 作为玩家，我希望未完成或已下线的背景不会出现在可选背景列表中。

### 背景场景选择

11. 作为玩家，我希望编辑背景时每个选项只显示一张白天预览图，避免在选择器中重复显示昼夜两套图。
12. 作为玩家，我希望选择背景后，页面在白天和夜晚自动使用同一场景的对应三层素材。
13. 作为玩家，我希望切换“自动、白天、夜晚”后，当前主页背景立即切换，不需要重新选择背景。
14. 作为玩家，我希望背景切换不会改变头像、昵称、简介、文字可读性或页面布局。
15. 作为玩家，我希望在触摸设备或开启减少动态效果时，背景仍然完整显示，不强制鼠标视差。
16. 作为玩家，我希望旧版本已有的主页背景不会因为新字段缺失而变成空白；缺少新场景时应使用安全默认背景。
17. 作为玩家，我希望页面在素材 API 临时不可用时仍能加载安全的内置默认背景，而不是显示空层或错误图片。

### 管理员素材库

18. 作为管理员，我希望一次上传天空、城市、前景三张图片，系统自动把它们登记为一个昼间或夜间素材变体。
19. 作为管理员，我希望系统拒绝缺图、重复层、尺寸不一致、格式不允许或透明度不符合要求的上传。
20. 作为管理员，我希望上传失败时三张图片都不进入可用目录，避免半套素材污染素材库。
21. 作为管理员，我希望看到三层静态叠合预览和三层鼠标视差预览，确认场景没有错位、断楼、白边或风格不一致。
22. 作为管理员，我希望把一个白天变体和一个夜间变体配成一个完整背景场景。
23. 作为管理员，我希望系统阻止把不同场景的昼间和夜间变体直接配对，除非明确创建了同一场景族。
24. 作为管理员，我希望只有昼间和夜间都完整的场景才能发布给玩家选择。
25. 作为管理员，我希望设置一个默认背景场景，新用户或没有背景选择的用户可以使用它。
26. 作为管理员，我希望下线场景后，已选择该场景的用户能安全回退到默认背景，不产生死链接。
27. 作为管理员，我希望素材 URL 使用不可变版本或修订号，避免浏览器缓存旧图或混合昼夜版本。
28. 作为管理员，我希望看到素材套的状态、尺寸、文件大小、哈希、创建人、创建时间、发布状态和归档时间。
29. 作为管理员，我希望所有上传、配对、发布、下线和归档操作写入审计日志。
30. 作为管理员，我希望素材管理不要求 SSH 登录服务器手动替换文件或重新构建前端。
31. 作为管理员，我希望在管理员页面配置、轮换和停用 DeepSeek API Key，并能看到连接状态和最后更新时间，但不能再次读取明文 Key。

### 头像与资料安全

32. 作为玩家，我希望只能上传 JPEG、PNG 或 WebP 头像，原始和处理后文件均不超过 200 KiB，像素尺寸也在服务端限制内。
33. 作为玩家，我希望头像每个滚动 7 天最多提交一次，提交后继续显示旧头像，直到新头像通过审核。
34. 作为管理员，我希望在现有管理员用户管理页看到待审头像、用户信息、处理后的图片和审核操作。
35. 作为管理员，我希望拒绝头像时可以填写原因，玩家可以看到当前审核状态。
36. 作为系统，我希望服务端按真实解码格式验证图片，而不是只相信扩展名或客户端 MIME。
37. 作为系统，我希望待审图片不能被普通访客读取，只有批准后的不可变 WebP 可以公开读取。
38. 作为系统，我希望账号删除时清理该账号的待审、已批准和已替换头像对象。

### AI 内容审查

39. 作为玩家，我希望个人简介在保存前经过统一的安全审查，简介每个滚动 7 天最多提交三次，避免违规内容和恶意刷审查请求；昵称继续使用现有服务端校验，不调用 AI。
40. 作为玩家，我希望头像及未来开放的用户图片经过视觉审查，且审查期间继续显示旧的已批准内容。
41. 作为玩家，我希望提交简介或头像前明确知道内容会发送给 DeepSeek 进行自动审查，并能看到“审查中、需人工复核、已拒绝或失败可重试”等状态。
42. 作为系统，我希望简介只路由到 `deepseek-v4-flash`，图片只路由到 `deepseek-v4-flash-vision-exp`，前端不能直接调用模型。
43. 作为管理员，我希望 AI 不确定、服务故障或人工与 AI 结论冲突时可以人工复核和覆盖，并留下原因和审计记录。
44. 作为系统，我希望重复提交可以幂等去重、失败有限重试，避免重复计费和重放滥用。
45. 作为系统，我希望任何非明确通过的内容都不能进入公开版本，AI 服务不可用时仍保持旧版本公开；简介滚动 30 天累计三次最终违规时只禁用简介功能 7 天。
46. 作为系统，我希望待审原文、原图和模型响应受到私有存储、留存期限和账号删除规则保护。

### 显示模式与语言

47. 作为玩家，我希望在设置页顶部同时看到语言切换和显示模式切换。
48. 作为玩家，我希望显示模式使用清晰的分段按钮，并能通过键盘和屏幕阅读器操作。
49. 作为新用户，我希望默认显示模式为“自动”。
50. 作为旧用户，我希望迁移后现有夜间开关状态不被悄悄反转：旧开启迁移为“夜晚”，旧关闭迁移为“白天”。
51. 作为玩家，我希望切换显示模式时所有页面都同步更新，而不是只有设置页或主页改变。
52. 作为玩家，我希望雾青灰等每个主题都有自己的夜间 token，不被错误替换成经典主题的夜间样式。
53. 作为玩家，我希望系统在刷新页面时先恢复正确显示模式，避免先闪白天再跳到夜晚。
54. 作为系统，我希望所有页面通过统一显示模式运行时读取状态，不再分别读取旧的布尔值。

### 交付与回归

55. 作为维护者，我希望前端和 API 合同同步生成并通过类型检查。
56. 作为维护者，我希望本地预览同时包含真实 API，不把纯 Vite 页面误认为完整联调环境。
57. 作为维护者，我希望新功能不能回退 `finalized_local` 记录手动补传能力。
58. 作为维护者，我希望多 agent 工作不会直接污染 `main`，也不会留下无法判断来源的长期分支。
59. 作为维护者，我希望有独立的对抗性审查 agent 专门尝试找出数据丢失、越权、场景错配、内容绕过和发布回归。

## Implementation Decisions

### 仓库边界与权威来源

- `2048-game-api` 是用户资料、背景场景目录、头像审核、权限、持久化、审计和公开 API 的唯一权威来源。
- `2048-next` 负责页面渲染、设置交互、文件选择、预览、API 调用和错误降级，不保存服务器状态副本。
- `2048-ranked` 不参与本任务。
- 个人主页不创建第二套记录、排行榜或成就数据。
- 在整理到 `main` 时必须以包含 finalized_local 手动补传修复的提交为基础；当前浏览器工作树只能作为待整理变更来源，不能直接作为发布版本。

### 实施前冻结的权威架构与合同

以下决定是进入编码前的硬合同，避免不同 agent 各自解释：

- 唯一 API 实现是 `2048-game-api/src/server/app.ts` 及其服务端模块，使用现有 Bearer 认证、CORS 和 PostgreSQL；Cloudflare worker 不承载本功能的新路由。
- `game_data.users` 是账号身份权威：`nickname`、`display_name`、角色和账号状态都从这里读取和写入；`nickname` 更新继续走现有 `nicknameGuard`、长度/唯一性校验和原有接口，不进入 AI 队列。
- 新建 `profile_current` 作为简介、背景场景、展示模式和已批准头像引用的权威读模型；`users_shadow` 仅作为记录/排行榜兼容投影，由账号事务或 outbox 同步，不再作为公开主页身份的唯一来源。公开查询使用 `users LEFT JOIN profile_current`，缺少 shadow 行不能导致主页 404。
- 所有新写接口都返回 `revision`、机器可读 `reason_code` 和明确 HTTP 状态；所有可重试写操作要求 `Idempotency-Key`。同一用户、同一 Key、不同 payload 返回 `409`，相同 payload 返回第一次提交结果。
- 新功能使用 `profile_v2_enabled`、`moderation_required_for_bio_avatar` 和 `background_catalog_v1` 三个服务端 feature flag；默认关闭，迁移和契约验证完成后按账号/管理员灰度开启。

#### 资料字段的原子发布语义

- `nickname` 单独由现有账号接口立即更新；不创建昵称审核任务，也不把昵称混入简介审核提交。
- `profile_bio` 每次提交创建不可变 `profile_revision` 和 `moderation_submission`，待审期间继续公开旧的 approved revision；只有最终 `approved` 才更新 `profile_current.bio_revision_id`。
- `background_scene_id` 和 `featured_mode_keys` 是服务端校验通过后立即更新的非 AI 字段；若同一 PATCH 同时包含简介和这两个字段，数据库事务一次性保存非 AI 字段并创建简介审查任务，但公开快照只替换已批准字段，不会把 pending 简介带入公开响应。
- 头像使用独立 submission/revision；AI 通过后仍需管理员批准，批准与 `profile_current.avatar_revision_id` 更新在同一事务内完成。

#### OpenAPI 与错误合同

实施前必须从同一份 OpenAPI 生成前后端类型，至少冻结以下资源的请求、响应、权限、错误码和状态码：

```text
现有昵称更新接口（保持当前路径和 nicknameGuard 语义）
GET  /api/user/:id
PATCH /api/user/me/profile
GET/POST /api/user/me/avatar-submission
GET/POST /api/user/me/moderation-submissions
GET/POST /api/admin/moderation/submissions/:id/{review,retry}
GET/PUT/POST/DELETE /api/admin/integrations/deepseek[/{key,test}]
POST /api/admin/profile-background/variants
POST /api/admin/profile-background/scenes/:id/{publish,archive}
GET  /api/profile-backgrounds/:id/layers
```

最小错误码集合固定为：`unauthorized`、`forbidden`、`validation_error`、`revision_conflict`、`idempotency_conflict`、`rate_limited`、`bio_temporarily_blocked`、`content_review_pending`、`content_rejected`、`provider_unavailable`、`not_found`。公开接口只返回 approved 版本；待审资源的 owner/admin 端点必须显式鉴权。

#### PostgreSQL 审查队列与 DeepSeek adapter

首版不引入新的消息中间件，使用现有 PostgreSQL 做事务 outbox 和可恢复队列：

- 资料/头像提交事务同时写入 `moderation_submissions` 和 `moderation_outbox`，提交成功后才允许 worker 领取；
- worker 使用 `SELECT ... FOR UPDATE SKIP LOCKED` 领取任务，写入 `lease_until`，租约过期可被其他 worker 接管；最多自动尝试 3 次，退避为 1/5/30 分钟，最终进入 `failed_retryable` 或 `manual_review`；
- 客户端不能创建内部 job、提交 verdict 或修改状态；outbox 消费和 admin retry 只能由 API 进程/受保护 worker 身份调用，内部路由不得暴露公网；
- DeepSeek adapter 固定后端 allowlist 的 base URL、模型映射和 JSON schema。文本固定 `deepseek-v4-flash`，图片固定 `deepseek-v4-flash-vision-exp`；管理员不能编辑模型名或 provider URL；
- 发送请求使用固定 system prompt、`temperature=0`、有限 `max_tokens` 和请求超时；adapter 将 provider 响应归一化为 `{ verdict: allow|review|block, confidence: 0..1, categories: [], reason_code, provider_request_id }`，非该 schema 一律视为失败；
- 本地和 CI 使用 mock DeepSeek adapter，不产生真实费用；真实连接测试只发送无业务内容的最小探测请求。

#### 审查数据表、策略版本与隐私撤回

至少建立以下表或等价模型，并设置外键、唯一约束和索引：

```text
profile_current
profile_revisions
avatar_submissions / avatar_objects
moderation_submissions / moderation_attempts / moderation_outbox
moderation_policy_versions
moderation_rate_events
integration_secrets / integration_secret_audit
```

每个任务绑定 `model_version`、`policy_version`、`prompt_template_hash`、`content_hash` 和 `key_version`；策略或模型版本改变时不能复用旧 verdict。用户撤回或删除账号后，发送前 worker 必须再次检查 submission 状态，取消未发送任务；已发送证据按分级留存策略删除并记录删除结果。用户同意文案保存 `consent_version` 和 `accepted_at`，未同意时不创建 AI 任务。

#### 原子限频与简介禁用

- 额度和违规统计使用带时间戳的 `moderation_rate_events`，不依赖单个可被并发覆盖的窗口计数器；账号级 quota row 使用 `FOR UPDATE` 或等价的 PostgreSQL advisory lock，时间统一取数据库 `statement_timestamp()`。
- 合法文件/文本通过预校验后，创建 submission 即消耗玩家额度；超大、伪格式、非法图片在进入队列前拒绝，不消耗玩家额度，但计入 IP/异常请求保护；provider 故障仍消耗已接受的 submission 额度，管理员 retry 不消耗。
- 头像 7×24 小时最多 1 次，简介 7×24 小时最多 3 次；同一 Idempotency-Key 重放不重复消耗。简介最终拒绝在滚动 30 天累计 3 次后禁用 7 天，使用事件表计算，不能由客户端传入时间或计数。

#### DeepSeek Key 的管理员托管

- 新增 `can_manage_integrations` capability；默认只授予 `super_admin`/`owner`，普通内容审核员、素材管理员和 board admin 无权操作。权限变更本身需要审计。
- `integration_secrets` 保存加密密文、Key 版本、末四位、状态和更新时间；加密主密钥只来自部署 secret，不与数据库备份放在同一边界。管理员页面只支持写入、轮换、停用和测试，不支持读取明文。
- 配置/轮换/停用要求现有登录外的短时 step-up re-auth、CSRF/重放保护、`Cache-Control: no-store` 和不可篡改审计；任务绑定 `key_version`。停用后新任务不再发起请求，正在进行的请求允许自然结束但不启动新重试。

#### 迁移、灰度、回滚与恢复

1. Expand：新增表、字段、索引、权限 capability 和 feature flag，不改变现有公开行为。
2. Backfill：从 `users` 回填 `profile_current`；保留旧 `avatar_url/profile_cover` 作为兼容回退，生成失败不覆盖旧值；修复/校验 `users_shadow` 投影。
3. Contract：先上线 API 合同和 mock worker，再开启管理员自测；内置浏览器必须连接真实本地 API，不能只用 Vite。
4. Canary：先对管理员账号和测试账号开启 AI 审查、资料主页和背景目录，确认公开字段、额度和旧记录不变后再扩大范围。
5. Rollback：关闭 feature flag 即停止新写入/新公开读取，旧资料、旧头像和旧背景继续服务；迁移只允许向前兼容，不在回滚时删除数据。恢复演练必须覆盖数据库、私有对象、加密 Key 和 outbox。

### 个人资料数据

在 `profile_current`（或等价的账号资料权威表）增加以下字段；账号身份字段仍保留在 `game_data.users`：

- `profile_bio`：最多 80 个 Unicode 字符，服务端去除首尾空白；
- `featured_mode_keys`：最多 3 个当前存在且玩家有记录的模式 key，顺序即主页顺序；
- `background_scene_id`：用户选择的完整昼夜背景场景；
- `avatar_revision_id`、`bio_revision_id` 和 `revision`；
- 保留 `game_data.users.created_at` 作为注册时间权威来源。

昵称和展示名不复制到资料表；公开主页从 `game_data.users` 读取，并继续使用现有昵称校验逻辑。

旧的 `profile_cover` 只能作为兼容字段或内置默认回退，不能继续作为新素材系统的唯一标识。新编辑器只展示已发布且完整的场景；不完整的旧预设不得伪装成完整昼夜场景。

### 公开用户 API

`GET /api/user/:id` 从 `game_data.users` 与 `profile_current` 左连接读取，缺少 profile 行时返回安全默认值，不依赖 `users_shadow` 是否存在。公开数据追加：

- `avatar_url`：只返回当前批准头像；
- `profile_bio`；
- `background_scene_id`；
- `featured_mode_keys`；
- `created_at`。

统计、记录和成就继续复用现有权威接口，并在契约中固定公开统计口径（默认 `official_verified`）；公开响应不得泄露邮箱、角色、审核路径、私有对象 key、待审状态或管理员字段。

### 资料编辑 API

`PATCH /api/user/me/profile` 支持：

- `profile_bio`；
- `featured_mode_keys`；
- `background_scene_id`。

服务端必须验证：字段白名单、长度、场景是否已发布、模式是否存在、模式是否属于该用户的有效记录集合、最多三个模式和权限身份。`profile_bio` 只创建审核提交，不直接覆盖公开值；不得通过此接口修改昵称、`display_name` 或直接写入 `avatar_url`。昵称必须继续调用现有专用昵称接口和校验器。

### 成就 API

继续使用现有成就权威表：

- `achievement_definitions`；
- `user_achievements`；
- `user_achievement_showcase`。

`GET /api/user/:id/achievements` 每项追加 `showcase_slot: 1 | 2 | 3 | null`，由服务端联结展示表返回。主页只读取这一个接口，不维护第二份展示选择。勋章墙仍然使用现有的本人读取和更新接口。

### 头像审核 API 与存储

提供：

- `GET /api/user/me/avatar-submission`；
- `POST /api/user/me/avatar-submission`；
- `GET /api/user/:id/avatar/:submissionId`：只允许已批准且不可变的公开对象；待审 submission 必须改用本人/管理员受保护端点；
- `GET /api/admin/avatar-submissions?status=pending`；
- `GET /api/admin/avatar-submissions/:id/image`；
- `POST /api/admin/avatar-submissions/:id/review`。

头像处理规则：

- 原始输入最多 200 KiB，只接受 JPEG、PNG、WebP；处理后的公开 WebP 也不得超过 200 KiB；
- 解码后的宽高均不得小于 128 px、不得大于 2048 px，像素总量不得超过 4 MP；不要求用户预先裁成正方形，但服务端最终统一居中裁剪为 256×256；
- 服务端真实解码，拒绝伪扩展名、动画、异常尺寸和异常像素；
- 旋转纠正、居中裁剪为 256×256、移除元数据并重新编码为 WebP；
- 原始上传不持久化；处理后文件进入独立待审目录；
- 批准后原子移动到公开目录，旧头像标记为 `superseded`；
- 文件移动失败时不得提交数据库状态变更；
- 审核通过、新头像生效和审计记录必须在同一数据库事务语义下完成。
- 同一账号的头像提交采用滚动 7×24 小时窗口，最多接受 1 次新提交；被拒绝、待审或审核失败的提交也消耗本次额度，管理员重试不消耗玩家额度；
- 头像提交必须登录，不允许游客消耗审核额度；服务端返回下一次可提交时间，不由前端计时器决定。

### AI 内容审查与发布状态

#### 审查范围与模型路由

所有需要 AI 审查的用户内容都必须先经过服务端审查；昵称不属于 AI 审查范围：

- 文本：个人简介，统一调用 `deepseek-v4-flash`；
- 图片：头像及未来开放的用户图片，统一调用 `deepseek-v4-flash-vision-exp`；
- 昵称/展示名称：继续使用现有 `nicknameGuard`、长度、唯一性和账号字段约束，不发送给 DeepSeek；如未来新增独立展示名字段，必须先明确复用同一校验器或另行定义规则，不能绕过现有校验直接公开；
- 不送审：游戏分数、棋盘状态、回放动作、排行榜字段和其他与内容安全无关的业务数据；
- 管理员背景素材仍以真实格式、尺寸、Alpha、哈希和恶意文件校验为硬门槛。若增加视觉质量检查，只能作为管理员素材的可选提示，不能替代文件安全校验，也不能阻塞已授权管理员的暂存上传。

DeepSeek 只由 API 服务端调用。API Key 支持两种来源：部署环境变量/密钥管理系统，或管理员页面提交的托管密钥。管理员页面提交的 Key 必须通过 HTTPS 发送到 API，由后端加密后存入密钥存储（优先 secret manager，未接入时使用独立密钥加密的数据库字段；数据库与加密主密钥不得放在同一备份边界），不能进入前端包、浏览器后续响应、普通数据库查询、日志、错误栈或 API 响应。管理员只能查看“已配置/未配置、末四位掩码、最后更新时间和连接状态”，不能读取明文。

管理员页面提供“配置、轮换、停用、测试连接”四个动作：

- 配置/轮换成功后新任务使用新 Key，正在执行的任务继续使用其任务快照或安全重试策略，不在请求中回显 Key；
- 停用后所有新审查任务进入 `failed_retryable` 或 `manual_review`，保持 fail-closed，不删除历史审计；
- 测试连接只验证 DeepSeek 鉴权和指定模型可用性，不发送玩家原文、原图或生产内容；
- 每个动作都需要管理员二次确认、CSRF/重放保护、最小权限和审计记录，Key 轮换后旧 Key 立即失效或进入短暂撤销期。

#### 服务端状态机

每次提交都创建不可变的 `submission_id` 和服务端版本，不覆盖当前已批准内容。状态由服务端权威维护：

```text
submitted
  -> ai_reviewing
  -> ai_pass | ai_reject | manual_review | failed_retryable

manual_review -> approved | rejected
ai_pass       -> approved | manual_review   # 文本可按策略自动批准，头像必须人工批准
```

- 文本（仅个人简介）只有在规则明确通过且置信度达到配置阈值时才可自动 `approved`；低置信度、策略冲突、模型异常或用户申诉一律进入 `manual_review`。
- 头像即使 `ai_pass` 也必须经管理员人工批准后才进入公开对象；在此之前继续提供旧头像。
- `ai_reject` 不得公开新内容；拒绝原因须经过输出安全过滤，只向用户展示可解释的安全分类或短提示，不返回模型原始文本。
- DeepSeek 超时、429、5xx、网络故障、额度耗尽、空响应或非合法 JSON 只能进入有限重试和 `failed_retryable`/`manual_review`，必须 fail-closed，绝不因审查失败而放行。
- 管理员可重试或人工覆盖；人工覆盖必须记录操作者、旧结论、新结论和原因。AI kill switch 关闭时，新的用户内容只能停留在待审，不得自动公开。

#### 审查记录与幂等

审查记录至少保存：

```text
submission_id, user_id, content_type,
model, model_version, policy_version, prompt_template_hash,
request_hash, verdict, confidence, categories, reason_code,
attempt, latency_ms, token_or_cost, created_at, completed_at,
reviewer_id, override_reason
```

模型响应必须先通过固定 JSON schema 校验，只接受受限枚举（例如 `allow`、`review`、`block`）和受限分类，不能信任模型自由文本中的“放行”指令。原始响应默认不落普通日志；如为申诉所需保留证据，应加密、单独授权访问并按留存期限清理。

同一用户、同一内容类型和同一规范化内容使用 `content_hash` 加幂等键去重；重试只复用同一审查任务，不重复创建公开版本或无界重复计费。提交接口必须有用户级和 IP 级频率、大小与并发限制，并拒绝过期或重复的提交令牌。

#### 玩家提交频率、额度与简介禁用

频率限制由 API 服务端在创建提交记录前原子判断，前端按钮禁用只能作为体验提示，不能作为安全边界：

| 内容 | 玩家提交额度 | 额度计算 | 触发限制后的行为 |
| --- | --- | --- | --- |
| 头像 | 滚动 7×24 小时最多 1 次 | 创建新头像提交即消耗；待审、拒绝、失败均不返还；管理员重试不消耗 | 返回 `429` 和 `next_allowed_at`，保留当前已批准头像 |
| 简介 | 滚动 7×24 小时最多 3 次 | 创建新的简介审查提交即消耗；同内容幂等重放不重复消耗 | 返回 `429` 和 `next_allowed_at`，保留当前已批准简介 |

简介的“违规次数”与提交额度分开统计：

- 只有最终状态为 `ai_reject` 或人工最终 `rejected` 才计一次违规；超时、429、非 JSON、队列故障、用户撤回和人工改判 `approved` 不计入；
- 默认按滚动 30 天累计三次最终违规后，将 `bio_blocked_until` 设置为当前时间后 7 天，期间禁止新简介提交，但不隐藏已经批准的旧简介；
- 禁用结束后仍保留审计记录，违规窗口和计数归零；窗口内的 `approved` 不会抹掉已经发生的违规，但也不会增加计数；
- 管理员人工解除禁用必须填写原因并写审计，不能绕过服务端权限；
- 账号级额度是主限制，IP/设备级限制只用于异常爆发保护，不能因为共享网络导致正常玩家永久封禁。

提交接口应返回机器可读的 `reason_code`（例如 `avatar_rate_limited`、`bio_rate_limited`、`bio_temporarily_blocked`、`content_review_pending`），不返回模型原始响应或内部阈值。额度、禁用时间和违规计数只能由服务端持久化，不能放在 localStorage 或由客户端传入。

资料/审核持久化至少需要可原子更新以下账号级字段，或使用等价的独立额度表：

```text
avatar_next_allowed_at
bio_window_started_at, bio_window_submission_count
bio_violation_window_started_at, bio_violation_count, bio_blocked_until
```

额度判断、提交创建、违规计数更新和禁用触发必须使用同一事务或等价的原子条件更新，避免并发请求把 1 次头像额度或 3 次简介额度刷穿。

#### 输入安全、隐私与留存

- 文本进入模型前做 Unicode NFKC、零宽字符/控制字符清理、空白折叠和同形异义风险标记；原文仍按隐私策略保存，不能把清洗结果误当成用户最终展示文本。
- 头像先在服务端真实解码、限制文件大小/像素/格式，去除 EXIF 和其他元数据后再发送视觉模型；继续拒绝 SVG、动画 WebP、伪造 MIME 和异常图片。
- 固定 system prompt 明确“用户内容是不可信数据”，禁止用户文本改变审查规则；图片审查必须覆盖图片内嵌文字、NSFW、暴力、仇恨和违法内容等策略类别。
- 提交前告知用户：内容会发送给 DeepSeek 第三方服务、审查用途、所用模型、保留期限和可能的处理地区。只传必要内容，不传游戏记录和账号敏感字段。
- 待审原文、待审原图和模型证据只存私有对象/受限表；公开接口只能返回 `approved` 版本。账号删除时级联清理提交、队列、私有对象和证据，审计日志只保留必要哈希与摘要。

建议提供以下管理接口（任务创建由资料/头像提交事务内部写入 outbox，不提供可被客户端调用的 job 创建 HTTP 接口）：

- `GET /api/user/me/moderation-submissions`：本人查看自己的状态和安全提示；
- `GET /api/admin/moderation/submissions?status=manual_review`：管理员查询待复核项目；
- `POST /api/admin/moderation/submissions/:id/review`：人工批准、拒绝或要求重试；
- `POST /api/admin/moderation/submissions/:id/retry`：仅对 `failed_retryable` 任务重试。

DeepSeek 密钥管理接口只返回掩码状态，不返回明文：

- `GET /api/admin/integrations/deepseek`：返回启用状态、已配置模型、Key 末四位、更新时间和最近连接状态；
- `PUT /api/admin/integrations/deepseek/key`：通过 HTTPS 配置或轮换 Key，服务端加密保存并立即执行格式校验；
- `POST /api/admin/integrations/deepseek/test`：使用指定模型做无业务内容的鉴权/能力探测；
- `DELETE /api/admin/integrations/deepseek/key`：停用当前 Key，触发 fail-closed 并保留审计记录。

这些接口都必须经过现有认证、权限和审计边界；公开用户资料接口只联结已批准版本，不返回待审状态、原文原图、私有对象 key、模型响应或 API Key。

### 三层背景素材模型

一个三层素材变体包含：

- `sky`：完整不透明天空层；
- `city`：完整建筑层，必须是真实 Alpha；
- `foreground`：栏杆、植物、灯具和地面反光层，必须是真实 Alpha。

变体的必要元数据：

- `scene_family_id`；
- `variant`: `day` 或 `night`；
- `width`、`height`；
- 每层 MIME、大小、SHA-256 和 Alpha 检查结果；
- 对象相对路径；
- 状态：`draft`、`validated`、`paired`、`published`、`archived`；
- 创建人和时间。

一个用户可选的完整背景场景由两个变体组成：

```text
background_scene = {
  scene_family_id,
  day_variant_id,
  night_variant_id,
  status,
  revision
}
```

只有两个变体都存在、都通过校验、`scene_family_id` 一致且三层元数据完整时，场景才能进入 `published`。

尺寸策略首版固定为项目横幅安全尺寸 `2172×272`。如果未来允许其他尺寸，必须通过版本化能力声明，不得让同一场景的昼夜尺寸不一致。后处理只允许整体裁切、缩放和定位，不允许从完整合成图运行时抠图。

### 背景素材管理 API

建议提供以下 API：

- `POST /api/admin/profile-background/variants`：上传一组三层变体；
- `GET /api/admin/profile-background/variants`：查询变体库；
- `POST /api/admin/profile-background/scenes`：配对白天和黑夜变体；
- `GET /api/admin/profile-background/scenes`：查询场景库及校验状态；
- `POST /api/admin/profile-background/scenes/:id/publish`：发布完整场景；
- `POST /api/admin/profile-background/scenes/:id/archive`：归档场景；
- `PUT /api/admin/profile-background/default`：设置系统默认场景；
- `GET /api/profile-backgrounds`：公开返回已发布完整场景，仅返回白天预览和安全公开 URL；
- `GET /api/profile-backgrounds/:id/layers?variant=day|night`：返回指定场景的对应三层配置。

上传流程必须是暂存、校验、注册、配对、发布的状态机。不能通过直接覆盖旧文件实现更新。

### 背景校验

服务端至少检查：

- 三张图片是否齐全且层名唯一；
- MIME 和真实解码格式；
- 尺寸是否统一为 `2172×272`；
- 天空是否不透明；
- 城市和前景是否具备真实 Alpha；
- 是否存在伪棋盘格、整片半透明底色、重影边缘或异常透明区域；
- 文件大小上限和像素总量；
- 每层 SHA-256；
- 昼夜两个变体的场景族和几何契约是否一致。

校验失败时不得写入已发布对象，不得更新当前默认场景。

### 用户背景选择

用户主页编辑器调用 `GET /api/profile-backgrounds`，只显示 `published` 的完整场景。卡片只加载白天缩略图，并显示“夜间会根据显示模式自动切换”。保存时只提交 `background_scene_id`。

页面渲染时：

- `auto` 根据系统偏好选择 `day` 或 `night`；
- `day` 固定解析 `day_variant_id`；
- `night` 固定解析 `night_variant_id`；
- 三层始终来自同一个场景和同一个修订号；
- API 失败、场景被归档或资源加载失败时回退到内置默认场景；
- 旧场景不因替换文件而改变，使用不可变 URL 和 revision cache key。

### 三态显示模式

新增统一的显示模式存储键，例如 `settings_display_mode_v2`，值为 `auto`、`day`、`night`。统一运行时负责：

- 初始化 `data-display-mode` 和兼容的 `data-night-background`；
- 监听系统 `prefers-color-scheme`；
- 跨页面和跨标签同步变更；
- 应用当前主题的对应日间/夜间 token；
- 在页面绘制前恢复状态，避免闪烁。

旧键 `settings_night_background_enabled_v1` 只用于一次性迁移，不再被页面业务逻辑直接读取。现有各页面的散落读取必须收敛到共享边界。

主题和显示模式是两个维度：切换夜晚不能把雾青灰替换成经典主题，必须使用当前主题自己的夜间 token。

### 管理员权限与审计

- 素材上传、配对、发布、归档、默认场景切换只允许管理员；
- 头像审核只允许具有相应管理权限的管理员；
- AI 审查任务由服务端工作进程创建；人工复核、重试、覆盖和 kill switch 只允许相应管理员权限；
- DeepSeek Key 的配置、轮换、停用和测试只允许具备“集成密钥管理”权限的管理员，普通内容审核员不能读取或修改；
- 不能审核自己提交的头像；
- 受保护管理员账号不能被普通管理员修改；
- 所有资料提交、AI 状态迁移、重试、人工覆盖、素材写操作记录操作者/任务、目标、动作、对象 ID、旧状态、新状态和原因；
- API 不返回 token、Cookie、原始文件路径或密钥。

### 版本和协作边界

- 不直接在 `main` 上让多个 agent 同时编辑同一文件；
- 每个 agent 使用临时隔离工作树，只交付补丁、测试证据和风险说明；
- 不建立长期分支堆积；集成 agent 在干净 `main` 上按顺序应用已审查变更；
- 前端与 API 必须以明确的 OpenAPI 合同交接；
- 任何 agent 都不能删除或覆盖与本任务无关的记录上传、排行榜和回放修复。

## Multi-Agent Execution and Adversarial Review

### Agent 分工

1. **合同与数据模型 agent**：整理 OpenAPI、迁移、状态机、字段白名单和兼容策略，只提交契约与迁移设计。
2. **API 资料 agent**：实现用户资料、代表模式、公开字段和展示成就槽位接口，并补充 API 节点测试。
3. **媒体与背景 agent**：实现三层变体上传、真实图像校验、昼夜配对、场景发布、版本化 URL 和存储清理。
4. **管理员 UI agent**：实现素材库、三层预览、昼夜配对、发布/归档和头像审核入口。
5. **前端主页 agent**：实现公开主页、编辑模式、背景选择、白天预览和 API 降级。
6. **设置运行时 agent**：实现自动/白天/夜晚三态、系统偏好监听、主题隔离、旧键迁移和全页面同步。
7. **测试与本地联调 agent**：使用真实本地 API、内置浏览器和最小端到端场景验证。
8. **对抗性审查 agent**：不参与实现，只尝试证明实现不安全、不完整、不可回滚或与生产数据不兼容。
9. **集成与发布 agent**：在干净 `main` 上整合，经审查清单全部通过后才允许提交或部署。

### 对抗性审查必须尝试的失败场景

- 文本中的 Unicode NFKC 变体、零宽字符、同形异义字符、空白折叠和提示词注入是否能绕过 `deepseek-v4-flash` 的规则；
- 昵称是否继续严格经过现有 `nicknameGuard`、长度和唯一性校验，且不会因为排除 AI 审查而出现新旁路；
- 图片内嵌文字、恶意 EXIF、伪造 MIME、多格式伪装、超大像素、动画 WebP 和 SVG 是否能绕过 `deepseek-v4-flash-vision-exp` 或文件安全校验；
- 是否能通过并发请求、修改客户端时间、伪造 `next_allowed_at`、切换设备/IP 或重复提交令牌绕过头像每周 1 次、简介每周 3 次的服务端额度；
- 头像原图、处理后文件、宽高、像素总量或压缩结果超过限制时是否会进入 AI 队列或消耗额度；
- 简介在滚动 30 天内累计三次最终违规后是否只禁用简介 7 天、仍保留旧简介，并且模型故障或人工改判通过不会错误累计违规；
- 文本和图片是否严格路由到对应模型，是否能从前端、日志、响应或异常栈拿到 DeepSeek API Key；
- 无“集成密钥管理”权限的管理员是否能读取、轮换、停用或测试 DeepSeek Key；管理员页面、网络响应、错误日志、审计日志和备份中是否出现明文 Key；
- 配置/轮换/停用请求是否存在 CSRF、重放、并发覆盖或旧 Key 继续使用的问题，停用后是否确实 fail-closed；
- DeepSeek 超时、429、5xx、空响应、非 JSON、额度耗尽、模型误判时是否 fail-closed，且不会重复创建提交或重复计费；
- AI 通过但人工拒绝、AI 拒绝但人工复核通过、AI 服务不可用期间旧内容仍公开且新内容不公开是否符合状态机；
- 普通用户是否能读取待审原文、原图、模型响应或私有对象路径，账号删除是否清理审查队列和证据；
- 上传三层图片缺一张时是否被错误发布；
- 昼间和夜间尺寸不同、Alpha 错误或场景族不同是否能绕过校验；
- 管理员发布后只更新了白天配置，夜间仍指向旧场景；
- CDN 或浏览器缓存是否造成昼夜混用；
- 用户选择已归档场景后是否出现空白背景；
- 未登录用户是否能调用管理员上传、配对、发布或头像审核接口；
- 普通用户是否能读取待审头像或私有对象路径；
- 用户是否能把别人的模式 key 写入自己的代表模式；
- 头像上传伪造 MIME、超大像素、动画 WebP、SVG 攻击是否被拒绝；
- 资料 PATCH 失败时页面是否错误覆盖本地旧值；
- 成就展示位是否与勋章墙顺序不一致；
- 自动模式是否在系统主题变化后实时更新；
- 雾青灰夜间模式是否错误继承经典主题；
- 旧布尔夜间键迁移是否反转用户当前状态；
- 纯 Vite 页面是否被误认为真实后端联调；
- 整合时是否回退 `finalized_local` 手动补传修复；
- 将当前脏工作树直接合并到 `main` 是否带入未审查的个人主页素材和测试文档。

### Agent 交付格式

每个 agent 必须返回：

- 修改范围；
- 未修改范围；
- 可复现的验证命令和结果；
- 已知限制；
- 需要其他 agent 关注的接口假设；
- 是否触碰数据迁移、权限或生产配置。

对抗性审查 agent 必须返回：

- 至少三条失败尝试；
- 每条失败尝试的输入、预期和实际结果；
- 发现的 P0/P1/P2 问题；
- 是否建议阻止合并；
- 修复后需要重跑的最小验证集合。

## Testing Decisions

测试只验证外部行为和数据安全边界，不测试 CSS 选择器、内部函数名称或临时实现细节。

### API 与数据库

- 迁移可重复执行且不会删除现有用户、记录、成就或头像引用；
- 公开用户接口只返回允许字段；
- 公开主页从 `users LEFT JOIN profile_current` 读取，缺少 `users_shadow` 行仍能返回资料；昵称继续由现有校验器处理且不创建 AI 任务；
- 资料白名单、简介长度、代表模式数量和模式归属校验；
- 展示成就返回正确的 `showcase_slot`；
- 头像真实格式、大小、尺寸、动画和权限测试；
- 文本/图片模型路由、输入规范化、提示词注入防护和模型响应 schema 校验；
- 简介字段级 revision 发布、混合 PATCH 的原子语义，以及昵称直接更新不污染简介审核版本；
- 审查状态机、幂等重试、超时/429/非 JSON 的 fail-closed、人工覆盖和 kill switch；
- 头像 200 KiB、像素尺寸、处理后 WebP 大小、滚动 7 天头像 1 次和简介 3 次额度；
- 简介滚动 30 天累计三次最终违规后的 7 天禁用、旧简介保留、解禁和管理员覆盖审计；
- 审查失败期间旧公开版本保持不变，公开接口只返回 `approved` 内容；
- 审查记录的最小化留存、私有对象权限、账号删除级联清理和 API Key 不泄露；
- DeepSeek Key 的配置、掩码展示、轮换、停用、测试连接、权限隔离和审计；
- 三层素材缺失、尺寸不一致、Alpha 错误、场景不完整和错误配对测试；
- 只有完整昼夜场景能发布和出现在公开目录；
- 发布、归档、默认场景切换具有原子性；
- 失败操作不改变当前生效场景；
- 旧场景归档后的用户回退；
- 素材 URL revision 和缓存隔离；
- 管理员权限、越权、审计和账号删除清理。

### 前端单元和契约

- OpenAPI 文档与生成类型一致；
- 三态显示模式状态机和旧键迁移；
- `auto` 对系统主题变化的解析；
- 主题与显示模式相互独立；
- 公开/本人编辑权限显示；
- 完整场景目录只显示白天预览；
- API 失败时内置默认背景降级；
- 模式 key 使用当前正式 key，不再断言已淘汰的旧 key；
- 存储访问通过统一 browser storage/service boundary。

### 内置浏览器端到端验证

必须使用 Codex 内置浏览器和真实本地 API，不使用纯 Vite 作为完整联调依据。至少覆盖：

- 访客打开他人主页；
- 本人进入和退出编辑模式；
- 保存简介和背景场景；
- 上传头像、查看待审状态、管理员批准和公开头像更新；
- 修改勋章墙后主页三个展示槽位同步；
- 背景编辑器只显示白天预览；
- 自动、白天、夜晚切换时同一场景的三层 URL 正确替换；
- 昼夜切换不改变页面布局、资料层和横幅尺寸；
- 320×568、390×844、768×1024、1280×720 至少各验证一次；
- 经典主题和雾青灰主题分别验证白天、夜晚和自动；
- 触摸设备和减少动态效果下不产生横向溢出。

### 发布前门禁

最小门禁集合：

- API 类型检查；
- API 迁移和相关节点测试；
- 前端类型检查；
- 服务边界审计；
- 个人主页和管理员素材库相关 Smoke；
- `git diff --check`；
- 释放准备检查；
- 对抗性审查报告为“无未解决 P0/P1”。

## Out of Scope

- 关注、好友、私信、动态、评论和社交关系；
- 用户自定义上传横幅；
- 用户上传背景 URL、HTML、脚本或任意 CSS；
- 自动图像生成、自动抠图或运行时语义分层；
- 把图片二进制或 base64 存入数据库；
- 在本任务中引入 COS、CDN 或多实例媒体服务；首版沿用独立私有持久存储边界，未来迁移不改变 API 合同；
- Rating 计算系统；主页只保留既有“待 Rating 系统完善”的占位；
- 重写记录、排行榜、回放、RNG 或计时校验逻辑；
- 引入 Bootstrap、Astro 或新的完整 UI 框架；
- 仅为了视觉效果重新生成与用户确认场景不一致的建筑、植物或角色。

## Further Notes

### 当前已知阻塞

- `GET /api/user/:id` 当前没有完整资料字段；
- `PATCH /api/user/me/profile` 尚未在 API 服务实现；
- `GET/POST /api/user/me/avatar-submission` 尚未在 API 服务实现；
- 管理员头像审核接口和素材库接口尚未在 API 服务实现；
- DeepSeek 文本/图片审查适配器、状态表、幂等队列、人工复核接口和密钥配置尚未在 API 服务实现；
- 管理员页面的 DeepSeek Key 托管、轮换、停用、测试连接和密钥权限模型尚未在 API 服务实现；
- `listUserAchievements()` 尚未返回 `showcase_slot`；
- 当前前端服务边界审计仍因直接访问 `window.localStorage` 失败；
- 当前个人主页 Smoke 中仍有旧模式 key；
- 当前浏览器运行工作树不是 `main`，且存在大量未提交修改；
- 当前 4186 只启动了 Vite，不能证明后端联调通过。

### 安全发布顺序

1. 以包含 finalized_local 修复的 `main` 为基准建立干净集成工作树。
2. 先合并并验证 API 迁移和公开/本人资料合同。
3. 再合并背景素材状态机、存储和管理员接口。
4. 再接入前端主页、设置页和管理员页面。
5. 运行对抗性审查和真实后端端到端验证。
6. 确认前后端合同、版本和部署产物匹配后，才允许分别提交到两个仓库的 `main`。
7. 未经用户明确要求，不自动推送、创建 PR 或部署生产。

### 设计原则

- 一套背景的最小可用单位是“昼间三层 + 夜间三层”，不是三张图。
- 用户选择场景，系统选择昼夜变体；用户不选择昼夜文件。
- 管理员发布目录，用户选择个人背景；默认场景和个人场景不能混为一谈。
- 文件更新使用新修订，不覆盖旧对象；失败时继续使用旧修订。
- 后端负责真实性、权限和持久化，前端负责展示和交互。
- 多 agent 用于并行分析和隔离实现，对抗性 agent 用于阻止错误合并；最终只能由集成门禁决定是否进入 `main`。
