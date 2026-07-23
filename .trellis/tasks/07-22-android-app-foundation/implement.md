# Android App 实施计划

> 用户已于 2026-07-23 明确批准本规划与低保真线框；阶段 1、2.1、3.1、3.2、3.3 与游客离线阶段 5 已完成，当前继续阶段 2 与阶段 6 的隔离环境开发。该批准不包含生产部署、生产迁移、Play 上传或公开发布授权。

## 执行原则

- 先核心与合同，后页面；先离线垂直切片，后账号和在线能力。
- Web、App 和后端共用的行为先写黄金向量，再迁移实现。
- 后端变更保持向后兼容，先部署能力再开放 App 入口。
- 每一阶段形成独立可回滚提交；不把核心、Android 生成物、后端迁移和视觉页面塞进一个批次。
- 当前工作树存在其他用户改动。正式实施前先盘点并隔离工作区，绝不覆盖、回滚或顺手整理无关文件。
- 若极端情况迫使路线偏离本计划，立即在 `execution-notes.md` 的 `Route Deviation` 记录原因、保守回退和影响，再继续。

## 阶段 0：批准、隔离与基线

- [x] 用户明确批准 `prd.md`、`design.md` 和 `implement.md` 后再开始。
- [x] 阅读 `.trellis/spec/cross-repo-architecture.md`、`frontend-api-boundary.md`、`smoke-testing.md` 与仓库 `AGENTS.md`。
- [x] 分别记录 `2048-next` 与 `2048-game-api` 的基线 commit、`git status --porcelain`、现有脏文件和不得触碰的并行改动。
- [x] 两个仓库分别从已记录的基线 commit 建立全新干净 worktree；记录 worktree 绝对路径、分支和初始 `git status --porcelain`。不得在当前脏目录通过普通切分支冒充隔离；任一仓库无法安全建立干净 worktree 时停止并请求用户处理。
- [x] 将本任务的 `prd.md`、`design.md`、`implement.md`、`execution-notes.md` 通过仅包含这四个文件的专用 patch 或规划 commit 带入新 worktree，并核对文件 hash；不得把当前工作树的其他未提交改动一并带入或暂存。
- [x] 按项目 ADR Gate 新建一份合并 ADR，记录独立 App 构建、Game Session seam、IndexedDB、Keystore、Capacitor 依赖、回滚与验证；不拆成多份重复文档。
- [x] 固定工具基线：Node 22、JDK 21、Android SDK 36、API 29 ARM64 system image、`ANDROID_HOME`。
- [x] 在正式页面编码前完成可点击低保真移动线框并交用户审阅：首次隐私、四顶层页、模式状态、对局、待结算终局、结算、历史详情、回放、排行榜、认证、成就和设置。只有用户明确批准后才继续，并在执行记录保存线框版本、批准时间和仍需后续视觉打磨的非阻塞项。
- [x] 保存当前验证结果：
  - `npm run audit:service-boundary`
  - `npm run audit:entry-manifest`
  - `npm run test:unit:core`
  - `npm run verify:api`
  - `npm run build`
  - `2048-game-api: npm run typecheck && npm run test:node`

退出条件：两个仓库的干净 worktree 与基线均可重复，任何已有失败均已记录且未被误归因于 App；可点击线框已经用户明确批准并记录版本。未满足任一项不得进入正式页面编码。

## 阶段 1：Game Session 核心闭环

### 1.1 先建立行为合同

- [x] 在 `src/contracts` 补齐 GameState、GameTransition、持久化 snapshot 和版本化 ReplayRecord 所需字段。
- [x] 新增三模式固定 seed/action 黄金向量，覆盖最终棋盘、每步 spawn、score、steps、duration、undo 和 RPL1。
- [x] 增加边界用例：无效移动、`[2,2,2,2]`、满盘终局、首次 2048 后继续、撤回、进程恢复。
- [x] 从 legacy 提取经典 4×4 高位特殊出块用例，覆盖 131072/262144 后概率和满盘强制 8/16 分支。
- [x] 在 `2048-game-api` verifier 侧消费相同黄金输入并断言服务端结果。

### 1.2 加深现有 engine

- [x] 直接改造 `src/core/engine.ts`，不新建 `mobile-engine`。
- [x] 复用 `move-path.ts`、`move-scan.ts`、`rules.ts`、`scoring.ts`、undo 与 replay codec；只迁移缺失的棋盘变更和确定性 spawn 实现。
- [x] 核心只接受 mode/seed/time/direction，不接收预先计算的 score 或 movesAvailable。
- [x] 输出 UI 所需 motions、merges、spawn 和 milestone effects，但不引用 DOM。
- [x] 撤回恢复有效局面状态；遵循 RPL1/verifier 既有动作语义保持计时连续、追加 undo 记录并消耗一个 RNG action step，详见执行记录的 Route Deviation。
- [x] 首版模式表只含三个已确认模式；不迁移特殊模式框架。

### 1.3 Web 兼容迁移

- [x] 先让旧 Web 三个共享模式在测试中以现有 runtime 作为提取 oracle，所有黄金向量一致后冻结 legacy 规则改动。
- [x] 为 Web 三个共享模式建立最窄兼容 adapter，使它们消费同一 Game Session transition；DOM/Actuator 可暂时保留。
- [x] 其他未进入 App 的模式继续 legacy 路径，不为它们扩展新核心。
- [x] 增加审计：共享三模式不得新增绕过 Game Session 的规则分支。

验证：

```bash
npm run test:unit:core
npm run test:smoke:play-replay
npm run audit:engine
npm run verify:refactor:ci
```

退出条件：三模式核心、Web 兼容路径与服务端 verifier 完全一致；无效移动、撤回和 2048 里程碑均有回归测试。

回滚点 R0：若 parity 不成立，保留 Web 原路径并停止 App 游戏页，不用页面补丁掩盖核心差异。

## 阶段 2：后端与 OpenAPI 发布阻塞项

本阶段可与阶段 1 并行开发，但必须在 App 在线联调前完成。任何生产部署/迁移仍需用户另行批准。

### 2.1 现有合同对齐

- [x] OpenAPI 增加 `/auth/refresh`。
- [x] leaderboard period 统一为 `all/day/week/month`，Node、OpenAPI、生成类型和 Web 调用一致。
- [x] 历史筛选统一 `status`，`deleted/all` 强制本人鉴权。
- [x] 历史响应补 `source`、`steps`、`client_record_id` 和必要分页字段。
- [x] HTTP client 增加结构化 `{ok,status,body,networkError}` 结果，保留旧 Web 兼容入口。
- [x] 添加 Capacitor release/debug 精确 CORS 配置测试。

### 2.2 权威排行榜

- [x] 2.2A expand/audit：增加 nullable canonical 时间字段和成对约束，冻结迁移时间作为历史 fallback 截止点，并提供单一只读快照审计；不回填、不切读、不创建生产索引。score/speed 四周期基线、真实 PostgreSQL 执行、回填、重建和 rank 仍属于 2.2B 及后续硬门禁。

- [ ] 后端为分数/竞速总、日、周、月榜返回绝对 `rank`。
- [ ] 每用户最佳选择和全局顺序都落实已确认 tie-break；移除 duration/steps/updated_at 隐式裁决。
- [ ] 以加法迁移为 ranked 记录增加冻结的 `canonical_ended_at` 与 `canonical_time_source`；版本化 ranked session start 接受稳定 `operation_id`，第一次处理原子创建并冻结 `started_at/seed/token`，同一 operation 在响应丢失后重试仍返回同一冻结结果，并在每次响应提供 `server_now` 或等价同步 checkpoint。App 的 ranked 计时/replay 从服务端逻辑锚点开始，不信任设备绝对墙钟。未来 ranked 写入只使用 `started_at + verifier duration` 并校验不晚于 `consumed_at`；新记录缺少锚点时返回可诊断完整性错误并拒绝入榜，不允许使用历史 fallback 或静默改成 normal。客户端 `ended_at` 不得控制榜单。
- [ ] 迁移前只读盘点全部现有 ranked 记录与 session 关联：可信 begin、仅服务端接收时间、缺失/异常三类分别计数并抽样。按同一优先级回填并记录来源；无法关联 session 的历史行使用服务端 `verified_at/created_at`，不得猜测或继续信任客户端时间。
- [ ] 保存回填前旧榜快照、记录/用户最佳基线与异常报告；在事务/可回退派生步骤中全量重建 `leaderboard_best`，核对行数、每用户最佳、周期边界和来源分布。不一致则恢复旧派生榜并停止部署，原始 records 不做破坏性回退。
- [ ] 完全相同成绩和时间用稳定 user ID 形成唯一连续排名。
- [ ] Web 与 App 都只渲染后端 rank；补同分、分页、重建和乱序上传测试。
- [ ] 云记录软删除后在同一可靠流程中退出榜单/派生统计，恢复后重新计算；账号到期彻底清理后按剩余记录重建。补删除、恢复、清理失败重试和分页名次回归测试。

### 2.3 成就、删除账号与诊断

- [x] 下一号 PostgreSQL 加法迁移增加 achievement client/mode 元数据。
- [ ] 增加账号 `deletion_requested_at`、`deletion_due_at`、`auth_version`。
- [ ] Auth token 携带并校验 version；待删除账号的普通 auth/refresh 全部拒绝。
- [ ] 兼容旧 Web Token：缺少 version 时按 0 处理；正常账号继续使用，账号 version 一旦递增立即拒绝。补旧 Token、删除态、多实例/缓存绕过测试。
- [ ] 实现申请删除、冷静期内密码登录取消、到期后禁止登录和幂等清理任务。
- [ ] 清理覆盖 users/shadow、records/replay、leaderboard、sessions/checkpoints、achievements 及同一后端其他账号关联数据。
- [ ] 增加无需账号鉴权的 `/client-diagnostics`：白名单、小载荷、限流、request ID 幂等、过期清理，强制 `user_id` 为空。
- [ ] 根据真实数据收集、Android 权限、诊断字段、第三方/服务商和保留删除规则形成隐私政策与用户协议清单；指定正文责任人，正文必须经用户明确批准并记录版本/生效日期，不能用占位文案通过门禁。
- [ ] 在 `2048-next` Web 实现稳定公开 `/privacy.html` 与 `/terms.html`，并由同一版本化源生成 App 包内可离线读取的正文；对比测试确保公开页与包内版本、日期和实质内容一致。
- [ ] 增加包内/公开政策版本合同。公开 Web 页面部署到生产需用户另行授权；未部署或用户未批准正文时不得生成公开候选包。
- [ ] 在 `2048-next` Web 实现稳定公开入口 `/account-deletion.html`，直接调用同一后端合同完成邮箱密码身份复验、删除申请、72 小时回执和错误状态；不得把密码验证或删除权威放进前端。
- [ ] 为公开删号网页增加端到端测试：申请后旧 Token 立即失效、公开数据隐藏、期限内密码登录取消、到期后拒绝恢复、公开 URL 可在未安装 App 时访问，且页面政策版本与 App 包内版本一致。

### 2.4 回放服务端稳定性

- [ ] 为回放对象存储记录备份范围、频率、保留周期、容量阈值、完整性抽检和告警责任人；不得只依赖数据库引用存在。
- [ ] 在非生产副本执行一次从备份恢复演练，核对回放文件 hash、数据库引用、缺失/孤儿对象报告和恢复耗时，并把证据写入执行记录。
- [ ] 增加容量阈值与备份失败告警的测试触发证据；恢复演练和告警未通过时不得公开发布 App。

后端验证：

```bash
cd /Users/a19/Documents/2048-Next/2048-game-api/2048-game-api
npm run typecheck
npm run test:node
```

- [ ] 在一次性隔离 PostgreSQL 上运行迁移并核对前后行数、约束、回放引用和回滚备份；不得对生产执行。
- [ ] 在 `2048-next` 运行 `npm run api:types && npm run verify:api`。

### 2.5 `Backend Ready` 在线解锁门禁

- [ ] 先部署到隔离测试环境，运行旧 Web 登录/记录/排行榜、App 合同、CORS、删号、榜单重算和回放恢复 smoke；保存环境版本与完整输出。
- [ ] 新增可重复的 `npm run verify:backend-ready -- --api-base=<测试 API 基址> --web-base=<测试 Web 基址>`，分别核对 OpenAPI 版本、固定 API 基址、Capacitor origin CORS、公开注册、refresh、记录幂等、权威 rank、公开政策/协议/删号页和待删除 Token 拒绝。
- [ ] 只有用户另行明确批准生产后端部署/迁移与公开 Web 页面部署后，才执行生产备份、加法迁移及部署；不得把本计划批准视为这些生产变更授权。
- [ ] 生产部署后核对前后端 commit、migration、OpenAPI/政策版本、健康状态、`BETA_ACCESS_GATE_ENABLED=false`、release CORS、公开页面和旧 Web 核心流程，使用受控测试账号运行非破坏性 smoke。
- [ ] 在 `execution-notes.md` 写入带时间、环境、版本、验证输出和批准依据的 `Backend Ready` 记录。该记录不存在时，阶段 6/7 的在线入口只能在本地/测试环境开发，不得在候选包开启或指向生产。

开发退出条件：旧 Web 继续工作，App 所需合同有生成类型和 Node 集成测试，最近删除不可越权，Token 删除态立即生效，公开删号页、榜单重算与回放稳定性均在隔离环境通过。

在线解锁条件：生产 `Backend Ready` 记录完成。未完成时可继续阶段 3–5 的离线工作，但不得开放阶段 6/7 生产在线入口或发布 App。

回滚点 R1：只回滚可关闭的兼容入口与派生查询；加法列保留，绝不通过删除用户原始数据回滚。`auth_version` 校验、待删除账号拒绝与公开隐藏一旦启用只能前向修复；允许关闭新的删号入口，但不得回退到会让旧 Token 或待删除账号重新获得写权限的后端。

## 阶段 3：独立移动构建与 Android 基底

### 3.1 移动 Web 构建

- [x] 新建 `mobile/index.html`、`mobile/src/main.ts`、`vite.app.config.ts`、`tsconfig.app.json`。
- [x] 新增 package scripts：
  - `dev:app`
  - `build:app`
  - `test:unit:app`
  - `test:smoke:app`
  - `verify:app`
- [x] 新增 `mobile-boundary-audit`，扫描源码 import 与 `dist-app` 禁止 legacy/Web 页面资产。
- [x] 建立最小 shell、集中式中英文字典、浅/深色 token 和安全区布局。
- [x] 浏览器预览可在断网下进入隐私选择与空首页，不请求业务网络。

### 3.2 Capacitor 与 Android

- [x] 精确锁定同一 Capacitor 8 稳定版本线和 App/StatusBar/Haptics/Filesystem/Share 官方插件。
- [x] 创建 `capacitor.config.ts` 并执行一次 `cap add android`；提交 Gradle Wrapper、Android manifest 和受控原生工程。
- [x] 更新 `.gitignore`：忽略 `dist-app`、`local.properties`、Gradle/build 目录、keystore 和签名属性。
- [x] 配置 release `cn.next2048.app`、debug `.debug` 后缀和 `2048 NEXT Dev` 名称。
- [x] 设置 min 29、target/compile 36、竖屏、硬件加速、release 禁止明文和 WebView 调试。
- [x] release 缺少签名配置时明确失败，不回退 debug key。

### 3.3 Keystore bridge

- [x] 只实现 `get/set/delete`，使用 Android Keystore AES-GCM 与应用私有 SharedPreferences。
- [x] 增加 Android 原生仪器测试：写入读取、覆盖、删除、随机密文、AAD 键绑定、不可导出和 key invalidation 错误。
- [x] 浏览器测试 adapter 只在测试/本地预览使用；release 不允许降级到 localStorage 或内存实现。

验证：

```bash
npm run build:app
npm run audit:mobile-boundary
npm run android:check
```

退出条件：`dist-app` 单入口、零 legacy；API 29 模拟器可离线冷启动；debug/release 数据和身份隔离。

回滚点 R2：删除/停用 Android 与移动入口即可，现有 Web build 和 deploy 不受影响。

## 阶段 4：AppDatabase 与生命周期

- [x] 建立 `2048_next_app` IndexedDB v1：`saves/records/outbox/cache/diagnostics`。
- [x] AppDatabase interface 只暴露产品操作，不暴露通用 key-value 或 IDB request。
- [x] 所有记录带 owner key 和 schema version；建立必要 owner/mode/time 索引。
- [x] 实现 per-session 串行保存与 revision 防旧写覆盖。
- [x] 实现 `active/pending_terminal` 存档和每模式最多一局约束。
- [x] 实现一次性终局事务：冻结 record + 写 outbox + 删除 save。
- [x] 实现游客立即永久删除、账号缓存只读、云删除不离线排队。
- [ ] 实现 owner 清理标记与启动续清，验证切换账号不可见旧数据。
- [ ] 对“写清理标记、阻断 owner、删除 Keystore、清 IDB、移除标记”每一步做强杀故障注入；任何恢复点都必须先续清，且下一账号始终看不到或上传不到旧 owner 数据。
- [x] 实现缓存上限、回放总字节 LRU 和诊断环形上限。
- [x] 实现 IndexedDB v1→下一测试迁移样例与损坏记录隔离。
- [x] 绑定 Capacitor App 生命周期：每次有效移动已保存，pause/back 再 flush；进程恢复不依赖最后回调。
- [x] 计时采用单调时钟 + 墙钟锚点，后台/首页/排行榜时间连续且不可回拨。

> 2026-07-23 阶段 5 收口状态：`main.ts` 与正式游客对局已接入 per-session 保存、pause/resume/back 总序和连续计时，并在 API 29 真断网、HOME、Back 与 force-stop 冷恢复中通过；生命周期与计时项据此签收。owner 五步清理仍只有模块与故障注入测试，必须等阶段 6 真实账号退出/切换与 Online Sync 接线后再签收，不能由游客路径代替。

最小测试：

- [x] 多模式并行存档与 `last_closed_at` 选择。
- [x] 重新开始只覆盖当前模式且无历史。
- [ ] pending terminal 强杀恢复、撤回继续、确认后只一条记录。
- [x] 终局事务各步骤模拟失败后可恢复且不重复。
- [ ] 退出取消保持完整，确认退出清除账号 owner 并保留 guest。

退出条件：离线数据在后台、强杀、升级和异常写入下不丢失、不串账号、不重复结算。

回滚点 R3：DB migration 使用至少跨两个版本的 expand/contract，只前向修复；不得发布会清空正式本地数据的降级包。回发旧 commit 前必须证明它能读取当前升级后数据库，否则只能基于当前 schema 前向修复。

## 阶段 5：游客离线垂直切片

- [x] 首次启动单页隐私选择；“仅离线体验”不构造 HTTP 模块。
- [x] 实现四项底部导航和首页本地主操作。
- [x] 实现模式页三个模式卡及登录门槛，但本阶段只开放游客标准 4×4。
- [x] 实现专属棋盘、Pointer Events、transform/opacity 动画和非阻塞 2048 里程碑。
- [x] 实现返回保存、首页继续、对局内重新开始确认。
- [x] 实现无撤回终局、最小结算页、本地游客历史、详情和回放。
- [x] 结算页“再来一局 / 查看回放 / 返回首页”不依赖网络。
- [x] 实现游客历史二次确认后永久删除。
- [x] Playwright 拦截所有业务请求，断言离线体验完成整局仍为零请求。

验证：

```bash
npm run test:unit:app
npm run test:smoke:app
npm run build:app
```

退出条件：API 29 模拟器断网可从首次启动完成游客局、结算、回放、历史、后台与进程恢复。

## 阶段 6：账号、三模式与在线同步

前置门禁：生产候选开启任何在线入口前，必须存在阶段 2.5 的 `Backend Ready` 记录；没有记录时仅允许连接本地/隔离测试环境。

- [ ] 实现公开验证码注册、邮箱密码登录、密码找回和当前用户，不出现 beta 文案。
- [ ] Token/用户/到期时间只进 Keystore；实现 refresh 和 401 单次恢复。
- [ ] 曾登录且未主动退出的身份在断网或 Token 过期时仍可进入三个模式，但只能创建 normal 局；从未登录/已退出游客仍只开放标准 4×4。
- [ ] 登录后从原目标模式继续；开放经典 4×4 可撤回和标准 3×3。
- [ ] 经典模式实现 pending terminal 的“撤回继续 / 结束并结算”。
- [ ] 进入无存档模式时，在棋盘展示前持久化轻量 ranked start intent 与稳定 `operation_id`，调用幂等 session start；收到同一 `started_at/seed/token` 及 `server_now`（或等价同步 checkpoint）并安全保存后才创建、展示 ranked 棋盘，计时从服务端逻辑锚点连续计算，不把设备绝对墙钟偏差计入 duration。请求/重试/安全存储有界失败则清理 intent、幂等 abandon 或等待服务端过期，并直接创建 normal 局。棋盘一旦可操作不再切换类别，首步和后续滑动全部本地执行。
- [ ] 排位 Token 以 challenge 安全保存；普通离开保留，重开/清除生成幂等 abandon。
- [ ] 实现 records outbox、错误分类、退避、手动重试和上传状态。
- [ ] normal 离线记录上传后只显示云历史，不进入榜单/排位成就。
- [ ] 退出先有界冲刷；失败时显示未上传/存档数量并要求明确选择。
- [ ] 登录不上传或合并游客历史；账号/游客列表按 owner 清晰区分。

验证：

```bash
npm run test:unit:app
npx playwright test --config=playwright.app.config.ts tests/smoke/mobile-auth-outbox.smoke.spec.ts
cd /Users/a19/Documents/2048-Next/2048-game-api/2048-game-api
npm run typecheck
npm run test:node
```

- [ ] 覆盖注册/登录/refresh、断网曾登录身份、ranked start 响应丢失/重试/强杀返回同一 session 与锚点、安全存储失败不展示半初始化棋盘、棋盘可操作后首步仍满足 50ms、本局缺锚点拒绝入榜、normal 只入历史、401/429/5xx/永久 4xx、幂等重试、退出取消/确认、多账号隔离和删号 Token 失效。

退出条件：三模式在线排位/离线普通语义稳定；认证过期、重试、退出和多账号不会丢数据或串数据。

## 阶段 7：记录、排行榜、成就、设置与分享

### 记录与回放

- [ ] 记录页以历史为主体，支持时间/分数/盘面和排序、账号/游客筛选及最近删除。
- [ ] 云历史、回放快照 stale-while-revalidate，显示最后更新时间。
- [ ] 云删除/恢复只联网执行；离线快照不显示可执行动作。
- [ ] 结算、历史详情、播放器共享一个 ReplayRecord JSON 分享动作。
- [ ] 使用 Filesystem Cache + Share，不申请外部存储权限；取消后恢复原页面。

### 排行榜

- [ ] 全屏 `<dialog>`，三个模式均支持分数榜；竞速与目标方块筛选只对标准 4×4 不可撤回开放；支持总/日/周/月。
- [ ] 只渲染后端绝对 rank；分页/缓存不自行重新编号。
- [ ] 对局中打开只锁输入，计时和排位继续；关闭恢复同一棋盘与来源状态。
- [ ] 禁止任何 `/ranked/*` 调用或全国榜文案。

### 成就与我的

- [ ] 已获得完整显示；未获得按后端 client/mode 元数据筛选；隐藏成就未获得前无占位。
- [ ] 实现个人资料、外观、语言、声音、触觉、BGM、诊断、隐私与协议。
- [ ] 实现 72 小时删除账号申请、截止时间提示和重新密码登录取消流程。
- [ ] 删除成功后只保留截止时间与掩码邮箱回执；不保留 Token、用户 ID、账号存档或 outbox，取消删除/到期后清除回执。
- [ ] App 内同步/成就/网络/账号反馈，不申请通知权限。

### 声音、触觉与诊断

- [ ] 短音效与触觉从 GameTransition effects 触发，不进入核心规则。
- [ ] 不对每次滑动震动；尊重系统设置，三个开关独立持久化。
- [ ] BGM 默认关闭、单一编码、失去音频焦点/后台暂停。
- [ ] 自动诊断仅在隐私同意和开关开启后发送；离线产生项永不追传。
- [ ] 手动诊断导出不含账号凭据、棋盘或动作。

验证：

```bash
npm run test:unit:app
npx playwright test --config=playwright.app.config.ts tests/smoke/mobile-records-leaderboard-achievements.smoke.spec.ts
npx playwright test --config=playwright.app.config.ts tests/smoke/mobile-privacy-delete-account.smoke.spec.ts
npm run build:app
```

- [ ] 覆盖离线联网意图被隐私门拦截、取消后原路返回且零请求、接受后恢复原意图、政策实质升级重询，以及普通文案更新不重询。
- [ ] 覆盖云记录删除/恢复后的榜单和统计重算、权威 rank 分页稳定、公开删号网页全流程、已获得/未获得成就过滤、分享取消恢复和无通知权限。

退出条件：所有首版页面和产品规则完整，断网快照、返回状态、隐私与无通知权限均通过验收。

## 阶段 8：性能、CI、签名与发布候选

### 性能

- [ ] 首屏只包含 shell、首页和必要 token；BGM、历史、榜单、成就和回放按需加载。
- [ ] User Timing 采集冷启动、导航、进局和输入首帧。
- [ ] debug-only RAF 采样用于开发诊断，不在 release 保留行为分析；它不能替代发布证据。
- [ ] Android 10/4GB 与 90/120Hz 真机达到 PRD 预算。对生产等价的已签名 release 候选，在系统高刷开启、省电关闭且无温控降频时采集不少于 30 秒连续棋盘动画 FrameMetrics/Perfetto：90Hz 有效回调频率在测量容差内不低于 89.5 FPS且中位帧间隔 ≤11.2ms；120Hz 不低于 118 FPS且中位帧间隔 ≤8.6ms；两者均无稳定 16.7ms 平台。保存原始 trace、系统报告刷新率、设备/系统/WebView 版本和测试条件。
- [ ] 若高刷真机仍被应用锁 60，才实现 API 30+ guarded `setFrameRate`；否则不加。
- [ ] 建立 dist-app 首屏 JS/CSS、APK/AAB 和 BGM 非首屏资源预算。

### CI

- [ ] 新增独立 Android workflow，不修改 Web 生产部署拓扑。
- [ ] PR：`verify:app`、`android:check`、受控 `cap sync` 漂移检查、debug APK artifact。
- [ ] main/nightly：API 29 与 API 36 模拟器安装/冷启动/离线/后台/强杀 smoke。
- [ ] 共享核心改动继续通过 Web `npm run verify:release` 和后端测试。

### 发布

- [ ] 离线生成 app-signing key，至少两份加密备份；密钥不进入仓库或普通日志。
- [ ] 首次上传 AAB 前锁定 Play App Signing 方案，记录 app-signing/upload key 分工、托管与恢复方式、预期 signer 证书 SHA-256，并生成官网 APK 验签基线。
- [ ] 获得用户对 Play 内部测试上传的单独授权后上传 AAB；核对 Play Console App signing certificate，并下载/安装 Play 生成包与官网 APK 对比 signer。验签一致后才允许请求公开轨道发布批准，不一致则停止并调整方案。
- [ ] 受保护手动 workflow 从同一 commit 构建 APK+AAB，验签并生成 SHA-256、版本号、大小和元数据。
- [ ] 同签名覆盖升级保留 DB/Keystore；错误签名不能覆盖。
- [ ] 官网发布页展示版本、大小、SHA-256、隐私/协议/删除账号网页。
- [ ] 商店 SDK、应用内更新、推送和 iOS/小程序仍不进入首版。

最终门禁：

```bash
# 2048-next
npm run verify:release
npm run verify:app
npm run android:check
npm run android:release

# 2048-game-api
npm run typecheck
npm run test:node

# 仅在已获生产验证授权后
cd /Users/a19/Documents/2048-Next/2048-next
npm run verify:backend-ready -- --api-base=<生产 API 基址> --web-base=<生产 Web 基址>
```

退出条件：正式签名候选在完整真机矩阵、高刷量化门禁和官网覆盖升级上通过；经单独授权的 Play 内部测试包与官网 APK signer 一致；生产 `Backend Ready`、回放恢复/告警证据和已批准的公开政策/协议/删号网页均有效。上述证据完成后仍需用户另行批准，才发布官网 APK 或进入 Play 公开轨道。

## 风险文件与回滚检查点

| 风险面 | 主要位置 | 必须先有的保护 |
| --- | --- | --- |
| 游戏规则与回放 | `src/core/engine.ts`、move/rules/replay、server verifier | 三方黄金 parity；R0 |
| Web 兼容 | `vite.config.ts`、Web GameManager adapter | Web release gate；独立 App build |
| 数据合同 | `src/contracts`、OpenAPI、生成客户端 | schema tests、旧客户端兼容 |
| 本地持久化 | `mobile/src/data` | migration、revision、故障注入、R3 |
| 认证/删号 | backend auth 与 migrations | DB 集成测试、Token version、隔离迁移 |
| 排行榜 | backend leaderboard SQL | tie-break/pagination/rebuild 测试 |
| Android/签名 | `android/`、Gradle、CI secrets | debug/release 隔离、验签、覆盖升级 |
| 隐私/删号 | Mobile gate、公开 Web 页、backend auth | 零请求测试、身份复验、auth version 前向安全 |
| 回放耐久性 | backend replay object storage | 备份、恢复演练、容量与告警证据 |

## 明确延后

- SQLite 或通用数据库 adapter：只有 IndexedDB 真机指标不足时再加。
- WorkManager/background sync：只有用户要求进程终止后仍自动上传时再加。
- 第四种模式或通用模式插件：三个模式稳定并有新增需求后再加。
- Web 本地数据迁移、公开回放链接、外部文件导入、横屏/大屏专属布局、推送、商店更新、小程序和 iOS：分别另立任务。
