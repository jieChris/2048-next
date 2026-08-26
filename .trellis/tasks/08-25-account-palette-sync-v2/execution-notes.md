# 账号私人色板同步 V2 执行记录

## 已完成

- [x] T02 数据模型与 `0040_account_palette_sync_v2.sql` 已提交：`fafa3fd`。
- [x] T03 回填、兼容投影和影子对账工具已提交：`85e27c0`。
- [x] T04 逐套读取、bootstrap、selection/order、cursor/tombstone、legacy GET 投影与 PUT fail-closed 已提交：`49d5e10`。
- [x] T04 合同增补（changes、legacy GET 409/503）已提交到 Web：`35e4c23a`。
- [x] T04 验证：API 全量 Node 测试 `591 passed / 9 skipped`、typecheck、真实 PostgreSQL 迁移与 5 项并发/约束测试通过；Web `verify:api` `28 passed`。
- [x] T05 版本历史、最小编辑单元三方合并、过期基线冲突候选、永久删除与历史清理原语已提交到 API：`67dc960`。
- [x] T05 验证：API 全量 Node 测试 `600 passed / 12 skipped`、typecheck、真实 PostgreSQL revision/merge/delete/prune 测试 `12 passed`。
- [x] T06 普通创建、保存、删除、冲突副本、容量、重复确认和 operation hash replay 外部写事务已提交到 API：`7269aae`。
- [x] T06 验证：API 全量 Node 测试 `600 passed / 17 skipped`、typecheck、真实 PostgreSQL 外部写/第十套并发/幂等测试 `10 passed`；Web `verify:api` `28 passed`；合同锁通过。
- [x] T07 Web 登录会话色板 bootstrap、账号缓存、会话/in-flight 去重、账号切换迟到响应丢弃、设置页延迟 library/cursor reset 加载已提交：`336360d9`。
- [x] T07 验证：Web unit `2108 passed`、`tsc --noEmit`、build、service-boundary audit 通过；相关 Pages Smoke `31 passed`。

## 当前状态

- 两仓库均只在 `main`，未 push、未 deploy。
- 当前 API 生产 flags 未改变；V2 read/write 仍保持关闭，Theme Plaza 写入仍保持关闭。
- T08/T09 Web 实现与验收已完成并纳入本地 commit；canonical OpenAPI digest 已冻结，API contract lock 将 pin 到本提交。两个仓库均未 push、未 deploy。

## T08 当前实现（已本地提交）

- 新增 `src/features/palette/account-palette-editor.ts`：草稿/保存状态机、冻结 operation ID/request hash、显式重复确认、离开决策和本地持久化失败阻断。
- 新增 `src/features/palette/account-palette-outbox.ts`：IndexedDB operation/lease store、账号隔离、未发送 operation 折叠、已发送 operation 冻结、指数退避、认证暂停/恢复、lease 心跳和 BroadcastChannel 唤醒；同一账号多标签页只允许一个 drainer。
- 新增 `src/features/palette/account-palette-v2-client.ts`：V2 create/save/delete/selection/order 请求映射，保留服务端权威 selection/order，区分 transient、paused-account、deleted identity 和 expired operation。
- 新增 `src/features/palette/account-palette-page-sync.ts`：先持久化设备快照再写 outbox；处理 create/save/delete 依赖顺序、未发送 create/save 折叠、删除优先、重复内容“使用已有/保留副本”、容量满、本地 pending、冲突副本选中、base revision 重新基准化、tombstone 身份重建和 pending selection 权威赢家。
- 设置页在 library 成功延迟加载后按服务端顺序补齐云端色板并保留本地-only 色板；合并超过十套时不覆盖本地存储，显示容量状态。未显示过的云端色板不会被误判为删除或被错误重排。
- `js/theme_manager.js` 增加 draft working-set，编辑期间不写 localStorage；权威会话替换通过 bypass 写入保存态；删除选中色板回退 `follow-theme`；`baseSkin` 与命名空间化 `extensions` 在读取、草稿、替换、导入导出和保存中无损保留。
- `js/palette_page.js` 和 `palette.html` 增加明确 `保存色板`、同步状态、原生 `beforeunload` 和站内“保存并继续 / 放弃修改 / 取消”；本地保存失败、outbox 不可用、capacity、duplicate、base-expired、expired-operation、paused-account、merged 和 conflict-copy 均显示明确状态。
- 账号切换暂停旧账号队列且不迁移；迟到响应、旧终态和同一色板后续 intent 按 created-at 顺序对账，较旧成功响应不会覆盖较新的本地保存/删除意图。
- Theme Plaza 分享在 T09/正式切换前继续由 capability fail-closed；`palette-page.ts` 不再接入旧 `AccountPaletteRepository` 或 `/me/app-palettes` 写路径，生产页面也已移除旧 repository transport，旧模块仅保留解析类型与历史单测。

## T08 验证

- Web 全量 unit：`322 files / 2158 tests passed`。
- T08 定向 unit：editor、outbox、page-sync、V2 client、session、ThemeManager draft/border 和 palette navigation 共 `69 passed`。
- Outbox/离开 Smoke：`6 passed`，覆盖 offline→reload 冻结重放、账号切换、duplicate 使用已有、保存/放弃/取消、本地持久化失败和原生 beforeunload。
- Palette board/sync Smoke：`17 passed`；编辑中无远端写，明确保存后才持久化。
- Palette 页面与 swatch 视觉矩阵：`16 passed`。
- `npm run verify:api`：`28 passed`；`npm run build`、`npx tsc --noEmit`、`npm run audit:service-boundary`、`node --check` 和 `git diff --check` 全部通过。
- Web/API 哈希合同临时交叉探针：create/save/delete/selection/order 五类 operation 的 Web request hash 与 API 规范化/Canonical JSON 结果全部匹配；包含 `extensions` 的 profile 同样匹配。
- API 仓库本轮无代码改动，工作树保持干净；未启动本地 API 的旧 Smoke 仍可能记录 `/api/auth/refresh` 代理 `ECONNREFUSED` 噪声，不作为产品断言。

## T09 当前实现（已本地提交）

- API `theme-plaza.ts` 的分享改为锁定账号级 palette state 后读取指定 stable palette/current revision，不再读取 `user_app_palettes` 整库 revision。
- Theme Plaza 保存使用账号级 `user_palette_operations` 作为幂等 operation，调用 T06 的账号锁、容量、重复检查、V2 identity/revision、order 和 change-seq primitive；新建副本、使用已有色板和首次 reference 在同一事务中完成，duplicate/capacity 不写 reference，也不改变 selection。
- Theme Plaza 列表/detail 的 `viewer.saved` 改为验证 `theme_plaza_references.last_saved_palette_id` 指向 active V2 palette；reaction/save/share/auto-publish 全部按独立 capability fail-closed，legacy `writeEnabled` 仅保留保守 aggregate。
- Web `theme-plaza-page.ts` 已移除旧 `AccountPaletteRepository`、`/me/app-palettes` 和整库 mirror；保存请求使用 UUID v4 operation/palette ID，支持 duplicate 的“保留新副本 / 使用已有 / 取消”，网络丢失时复用冻结 operation。
- Palette 页面分享按钮调用 `themePlazaEligibility()`，只检查当前活动 custom palette 的 dirty IDs、当前 palette outbox 最新 intent、tombstone 和权威 revision；另一套色板的 pending/duplicate/capacity 不阻止当前色板分享。
- ThemeManager 草稿增加 `dirtyPaletteIds`，selection-only 草稿不会误阻止已同步 palette 分享；分享 capability 缓存避免 pointer/input 中间态重复请求。
- Canonical OpenAPI 新增 V2 Theme Plaza save request/result/200/201/409 合同并重新生成类型；冻结 SHA-256 为 `a963537c30e465cc5aa9ad3e3244926b2000fddbcf4f1eb13bd65a6d36fb4348`，API contract lock pin 到承载该 artifact 的 Web commit。

## T09 验证

- API 全量 Node：`76 files passed / 6 skipped`，`602 passed / 18 skipped`；typecheck 通过。
- API Theme Plaza：`23 passed / 1 skipped`；新增 V2 route fake-transaction 覆盖 share revision、account-lock-before-operation、duplicate/capacity 无 reference、use-existing 原子 reference。
- 隔离 PostgreSQL 17：应用全量 migration 后 `theme-plaza-v2-postgres.spec.ts` `1 passed`，验证 V2 palette/revision/order/reference 同事务创建且 selection 保持 `follow_theme`。
- Web 全量 unit：`322 files / 2160 tests passed`；Theme Plaza client、active-palette eligibility、dirtyPaletteIds 等定向 unit 通过。
- Browser Smoke：Theme Plaza granular save/vote `4 passed`；当前 palette 单套分享资格 `1 passed`；T08 outbox/离开 `6 passed`；palette board/sync `17 passed`。
- 视觉：palette/page/swatch 与 Theme Plaza submission notice 相关矩阵通过；T09 影响的 768/1280 submission notice 基线已更新并记录 manifest reason。
- Web build、`verify:api` `28 passed`、service-boundary audit、`tsc --noEmit`、API/Web LSP error 级诊断和 `git diff --check` 通过。

## T10 当前实现（本地工作树，待提交）

- 新增 `scripts/palette-v2-gate-artifacts.ts`，统一编译 reconciliation、concurrency、performance、backup-restore、rollback 五份 JSON gate 和 `cutover-manifest.json`；缺失 evidence、失败 gate、未完成 approval 或未显式确认均 fail-closed。
- 新增 `scripts/run-palette-v2-concurrency-gate.ts`，仅接受本地/测试 PostgreSQL URL，通过 Vitest JSON reporter 执行 V2 store、V2 外部写和 Theme Plaza V2 PostgreSQL 并发套件；跳过或失败场景阻断 gate。最近隔离 PostgreSQL 运行覆盖 `14/14` 场景通过。
- 新增 `scripts/verify-palette-v2-backup-restore.ts`，在源库与隔离恢复库之间比较 legacy/V2 palettes、revisions、operations、changes、Theme Plaza listing/version/vote/reference/report 计数，并要求 checksum、恢复 smoke 和迁移版本证据。最近同一时间点 dump 恢复到隔离库后计数校验通过；样本为空库，不能替代生产数据演练。
- 新增 `scripts/palette-v2-performance-gate.mjs`，测量 bootstrap 不拉完整 library、无后台轮询、API 失败不阻塞游戏和 p95/主线程不超过基线 1.10 倍；本地运行结果写入 evidence，不伪装成生产门禁。
- 新增 `scripts/probe-palette-v2-cutover.ts`，验证 maintenance、cutover-read、rollback 环境的 bootstrap/library/compat GET、legacy PUT fail-closed、V2 write gate 和 Theme Plaza capability；不执行任何 flag 修改。最近本地 maintenance mock probe `6/6` 检查通过。
- 新增 `scripts/generate-palette-v2-cutover-manifest.ts` 与 `docs/PALETTE_SYNC_V2_GATES.md`，记录锁定 commit、migration、命令、审批、阈值、观察窗口和回滚触发器；工具只生成/验证 manifest，不 deploy、不改生产 flags。已生成 `artifacts/palette-v2/` 五份 gate report 和 `cutover-manifest.json`；由于生产 shadow、审批、备份恢复和线上观察未完成，manifest 明确为 `readyForCutover=false`。
- 新增 `ACCOUNT_PALETTE_MAINTENANCE_ENABLED`：维护窗口在 request-body 解析前暂停 legacy PUT 和 V2 palette writes，同时保留 bootstrap、library 和 compatibility GET；maintenance unit 与 mock probe 通过。
- reconciliation/backfill report 增加 schemaVersion、checks、residualRisks、未知差异、数据减少、十一套 active 和 tombstone revival 门禁字段。

## T10 验证

- API `npm run typecheck`：通过。
- API Node：`80 files passed / 6 skipped`，`612 passed / 18 skipped`。
- T10 gate/maintenance unit：`4 files / 9 passed`；cutover manifest command：包含 ready/not-ready 两类验证。
- 隔离 PostgreSQL 17 应用全量 migration 后 Theme Plaza V2 保存：`1 passed`。
- Web 本地 performance gate：bootstrap/library、无轮询和 API failure smoke 通过，实际 p95 `119.6ms`、主线程 `45ms`（使用显式本地 placeholder baseline，未作为生产性能证明）。
- T08/T09 Web 全量 unit、Theme Plaza/Palette Smoke、visual matrix、build、verify:api、service-boundary、TypeScript 和 error diagnostics 在 T10 改动前后保持通过；最后一次完整 Web unit 为 `322 files / 2160 tests passed`。
- 当前未运行生产 shadow reconciliation、真实生产 backup/restore、生产 cutover probe、30 分钟 V2 写观察或线上指标观察，因此 T10 已实现工具和本地验证，但不满足 T11 生产切换条件。



- 每账号最多十套私人自定义色板，内置色板不计入。
- 每套色板以稳定 ID 和独立权威记录同步。
- 当前选择、正式顺序和色板内容分别演进。
- 登录会话只读取一次当前选择和必要的一套自定义色板；完整库在设置页延迟加载。
- 编辑使用草稿和明确保存按钮；离线保存进入原账号队列；不后台轮询。
- 服务端保存不可变版本并执行三方合并；无法合并时创建冲突副本。
- 永久删除标记不占十套名额，旧设备不能复活原 ID。
- 旧整库 GET 只读兼容，旧 PUT 在切换后 fail-closed。
- 采用短暂色板写维护完成切换，不长期双写。

## 生产安全动作

2026-08-25T17:30:23Z 已设置：

```text
APP_PALETTE_FORMAT3_ENABLED=true
THEME_PLAZA_READ_ENABLED=true
THEME_PLAZA_WRITE_ENABLED=false
THEME_PLAZA_AUTO_PUBLISH_ENABLED=false
```

验证：

- API commit：`a21cbb86f78669a8431b47c78684c90cb4aa2fb9`
- API 容器：healthy
- 公开 capabilities：read=true、write=false、auto=false
- 认证分享探针：`503 THEME_PLAZA_WRITE_DISABLED`
- 探针前后 listing/version 计数不变
- 环境备份：`.env.self-hosted.before-theme-plaza-write-shutdown-20260825T173023Z`

## Route Deviation

原 Theme Plaza 方案把临时 Web 整库 repository 当作成熟账号色板同步基础，并采用八套限制和整库 revision。用户澄清目标产品为十套逐套同步、跨设备当前选择和设置页延迟加载，因此暂停 Theme Plaza 写入并重新设计底层权威模型。

## 尚未执行

- 未应用生产数据库迁移。
- 未开启生产 V2 read/write；T08/T09 代码仅完成本地 commit，尚未 push/deploy。
- 未执行色板写维护切换。
- 未重新开放 Theme Plaza 写能力。
