# A-F Sync Update (2026-03-22, Batch-WS4-02D3)

## Current Stage Decision
- `WS4` page-entry migration has completed its current cut.
- Audited page entries: `16`
- Remaining `direct-module` entries: `0`
- Final page completed in this batch: `user-profile`
- `user-profile` is now frozen under the `profile-history-replay` family, not `auth-security`.
- Completed direct-page bootstrap samples are now:
  - `modes`
  - `palette`
  - `history`
  - `account`
  - `account-settings`
  - `register`
  - `password`
  - `user-profile`

## What Changed In This Batch
- `src/entries/user-profile.ts` now boots through `bootstrapDirectPage("user-profile", bootstrapUserProfilePage)`.
- `src/pages/user-profile-page.ts` was added as a thin page-system shell over the existing legacy profile runtime.
- `runtime-manifest`, `page-bootstrap`, `home-family-shared`, and `entry-manifest-audit` now treat `user-profile` as a first-class manifest-managed page.
- Dedicated unit and page-system smoke coverage were added for `user-profile`.

## Verification Snapshot
- Targeted unit: pass
- `npm run audit:entry-manifest`: pass
- Targeted smoke:
  - `pages-user-profile-page-system`: pass
  - `pages-user-profile-title`: pass
- Final `npm run verify:prepush`: pass
- Stability note:
  - intermediate full runs hit existing Playwright server/startup instability in unrelated `history` / `index-ui` smoke suites
  - single-test reruns passed
  - final full `verify:prepush` passed
  - current classification: `suspected_flake` outside the `user-profile` migration itself

## Immediate Next Step
- `WS4-02` page-entry closure is complete.
- The next page-system task is `WS4-03`: define and enforce a `legacy-runtime-import boundary` for `src/pages/* -> ../../js/*.js` transitional adapters while keeping current behavior stable.

# A-F Sync Update (2026-03-22)

## 当前阶段判断
- 本节作为 2026-03-22 的主裁决，优先级高于下方仍未重写的旧基线描述。
- `WS6` 已从“代码清理阶段”转入“稳定性观察阶段”：
  - `src+js direct localStorage = 0`
  - `src+js direct fetch = 0`
  - `audit:service-boundary` 已接入 `verify:prepush`
  - 但尚未满足 `done`，因为还缺 owner/exception 正式机制、扫描范围定义、主分支连续 3 轮 CI 证据落表。
- `WS4` 已从“入口识别阶段”转入“迁移决策阶段”：
  - 当前已审计 `16` 个页面入口。
  - 其中 `3` 个仍为 `direct-module`。
  - 其中 `0` 个已 manifest-ready：`history / account / account-settings` 已完成迁移。
  - 其中 `3` 个仍未进入 `runtime-manifest`：`register / password / user-profile`。
  - `modes` 已完成第一批 `direct-module -> manifest-bootstrap` 样板迁移。
  - `palette` 已完成第二批 `direct-module -> manifest-bootstrap` 样板迁移，验证了 `page host + feature host + i18n/page copy` 组合路径。
  - `history` 已完成第三批样板迁移，作为 `storage/contracts-first` 功能页样板。
  - `account` 已完成第四批样板迁移，作为 `services/auth-first` 账号壳页样板。
  - `account-settings` 已完成第五批样板迁移，纳入 `authenticated account shell` family。
- 当前真正的主阻塞已经切换为：
  1. legacy shell 仍在主链路中；
  2. `Engine/contracts` 还不是唯一运行现实；
  3. deploy 尚未被完整质量门禁硬阻断。

## 结构性缺口
- `Legacy shell still alive`
  - 主入口仍依赖 legacy loader，`M5` 还不能进入删除阶段。
- `Engine single entry not real yet`
  - `createEngineSession()` 已存在，但尚未接管主链路；页面层仍依赖 `window.game_manager`。
- `Contracts single source not closed yet`
  - replay/import/export/competition 的协议仍存在“文档声明”和“运行现实”偏移。
- `Page system still dual-track`
  - 入口已经被清单化，`modes / palette / history / account` 已进入统一 direct-page bootstrap；
  - 但页面系统本身还没有形成完整的 `app bootstrap + pages shell + features orchestration + ui presentation` 四层闭合。
- `Release gate not fully authoritative`
  - deploy workflow 仍可能绕过完整 `verify:refactor:ci` 语义门禁。

## 里程碑依赖顺序
1. `M2 + M3`
   - 先完成唯一 Engine 会话、回放协议统一、比赛提交协议统一。
2. `M4`
   - 再把页面体系从“可审计”推进到“可迁移、可解释、可验收”。
3. `M5`
   - 在核心与页面体系收口后，执行 legacy shell cutover 与物理退场。
4. `M6`
   - 最后将 PKU 从隐藏能力升格为正式产品线。

## 最小可发布切片
- `Slice A: Ordinary Play Platformization`
  - 普通游玩、模式、历史、回放形成统一页面系统与稳定主链路。
- `Slice B: Account Domain Closure`
  - 账号中心、设置、资料、注册、密码恢复形成明确能力边界与统一体验。
- `Slice C: PKU Formal Product Line`
  - 比赛、提交、榜单、导播、观战进入正式页面与协议体系。

## 下一批角色分工
- `A`
  - 输出 `M2/M3 -> M4 -> M5` 的 cutover 依赖图，并拍板允许保留的临时直连边界。
- `B`
  - 拆解并推进：
    - `B-ENG-01` 唯一 Engine 会话接管
    - `B-CONTRACT-01` Replay 合同升级
    - `B-COMP-01` Competition/Submit 合同落地
- `C`
  - 已完成 `modes -> palette -> history -> account -> account-settings` 五个 direct-page 样板；下一批推进 `register + password` 的 `auth-security` family，并将 `user-profile` 重分类到 `profile-history` 轨。
- `D`
  - 把 `service-boundary` 从语法阻断升级为 owner-aware 审计，并将 deploy 绑定到已通过门禁的构建。
- `E`
  - 建立 `CI blocking topology` 与 `flake ledger`，把“首次失败/复跑通过”纳入结构化管理。
- `F`
  - 输出 `WS4/WS6` sign-off 验收矩阵，维护阶段性 `pass` 与最终 `done` 的区别。

# 2048 平台重构总推进文档

> 文档定位：这是唯一的“总控文档”，用于定义目标、约束、里程碑和验收规则。  
> 版本：v1.0（创建于 2026-03-21）  
> 更新频率：每周至少 1 次；发生里程碑完成/阻塞升级时即时更新。

## 1. 北极星目标（一句话）
一个没有旧壳、没有双轨、没有散乱入口、没有隐式耦合的统一 2048 平台。

## 2. 项目终态定义（Architecture Definition of Done）
以下 10 条全部满足，才视为“平台化重构完成”：

1. 旧代码彻底退出：`legacy loader = 0`，主链路不再依赖 `js/` 历史 runtime。
2. Engine 唯一核心：玩法、移动、合并、计分、undo、replay、导入导出、比赛提交全部走统一入口。
3. contracts 唯一协议真源：棋盘/历史/回放/提交/同步/存档结构全部由 contracts 定义。
4. 页面体系重组：统一信息架构与路由，不再根目录散落“临时业务 html”。
5. UI 与核心解耦：UI 只管展示与交互，不直接触碰规则、协议、存储细节。
6. 存储与在线能力抽象化：local/storage 与 online/api 通过统一层访问。
7. 目录结构可读即架构：`core/contracts/storage/services/features/app/ui` 职责清晰。
8. 测试覆盖架构契约：能阻止绕过 Engine/contracts、阻止 legacy 回流。
9. PKU2048 产品线正式化：比赛/提交/榜单/导播/观战成为正式模块。
10. 可持续演进：新增模式与系统以扩展方式完成，不触发“二次大重构”。

## 3. 当前基线（2026-03-21）
> 基线值由脚本与首轮盘点联合产出，每周刷新一次。以下为 2026-03-21 首次快照。

| 指标 | 目标值 | 当前值 | 采集方式 |
|---|---:|---:|---|
| Legacy loader 引用数（主入口） | 0 | 1（`home-family-bootstrap.ts`） | `Select-String legacy-loader src/entries/*.ts` |
| 非统一入口页面数（平台内） | 0 | 4（`account_settings/register/password/user`） | 页面清单审计 + `runtime-manifest` 对比 |
| 绕过 Engine 的状态写入点（疑似） | 0 | 22 | B 角色首轮静态扫描（`move/restart/save/undo/replay`） |
| 绕过 contracts 的数据结构 | 0 | 待补录（W1 完成） | contracts 使用面审计 + API/存储 schema 比对 |
| 页面层 direct localStorage 访问点 | 0（经 storage 抽象） | 2（`src/entries`） / 50（`src+js` 总计） | `Select-String "localStorage\\." src js` |
| 页面层 direct fetch 调用点 | 0（经 service 抽象） | 0（`src/entries`） / 7（`src+js` 总计） | `Select-String "fetch\\(" src js` |
| HTML 入口总数 / TS 入口总数 | 收敛到统一体系 | 17 / 22 | `git ls-files "*.html"` + `git ls-files "src/entries/*.ts"` |
| CI 架构门禁失败数 | 0 | 0（当前） | `npm run verify:prepush` |

### 3.1 基线结论（首轮）
1. 架构门禁当前可运行，但“主入口 legacy 残留 + 平台内双轨入口”仍是 M1 的首要收口对象。
2. `WS2` 的关键风险已定位到 `move/restart/save/undo/replay` 五条高耦合链路，必须先做统一入口改造再扩功能。
3. 页面层 direct localStorage/fetch 在 `src/entries` 已较低，但 `js` 历史层仍有集中遗留，需配合 WS1/WS6 一并清理。

## 4. 工作流分解（Workstreams）

### WS1 旧代码退场（Legacy Retirement）
- 目标：移除主链路 legacy 依赖，做到“物理删除 + 门禁阻断回流”。
- 交付：
1. legacy loader 与相关兜底逻辑下线。
2. `js/` 历史 runtime 不再承担主流程职责。
3. 防回流测试和 lint/audit 规则。

### WS2 Engine 单核统一（Engine Single Source of Truth）
- 目标：所有状态变化都必须通过统一 Engine API。
- 交付：
1. 玩法入口统一适配层。
2. undo/replay/import/export/competition 全部改造到统一 pipeline。
3. 绕过入口的调用点清零。

### WS3 contracts 协议统一（Contracts-First）
- 目标：状态结构、序列化结构、提交结构、同步结构协议化。
- 交付：
1. contracts 分层（game state / replay / submission / sync）。
2. 旧隐式结构迁移与兼容策略。
3. schema 校验测试与回归样例。

### WS4 页面体系重组（Page System Re-Architecture）
- 目标：统一导航、路由与页面装配，不再散点入口。
- 交付：
1. 页面域拆分：主页、游玩、模式、历史回放、账号设置、PKU、导播观战。
2. 页面入口映射表（manifest）收敛。
3. 非标准入口页面归档或删除。

### WS5 UI/Core 解耦（Presentation Boundary）
- 目标：UI 不直接读写规则状态与存储细节。
- 交付：
1. 交互层调用统一应用服务（facade/use-case）。
2. 组件化边界清单。
3. “可替换 UI”验证样例（至少一个）。

### WS6 存储与在线抽象（Storage/API Modernization）
- 目标：本地持久化与远端能力统一到抽象层。
- 交付：
1. storage 接口与实现分离（local history/settings/replay）。
2. API service 层统一（leaderboard/submission/broadcast/account）。
3. 页面层 direct localStorage/network 调用清零。

### WS7 PKU2048 正式产品线（Productization）
- 目标：PKU 模块从“隐藏页”升级为正式功能域。
- 交付：
1. 比赛、提交、榜单、导播、观战页面纳入导航与权限模型。
2. 与核心 Engine/contracts 共享能力，避免分叉逻辑。
3. 端到端稳定性用例。

### WS8 架构门禁测试（Architecture Gates）
- 目标：通过自动化手段防止架构回退。
- 交付：
1. `verify:prepush` 与 CI 必过。
2. 新增架构契约测试（禁止绕过 Engine/contracts/legacy）。
3. 失败输出可操作（定位文件、规则、修复建议）。

## 5. 里程碑与退出条件（Milestones）

| 里程碑 | 目标 | 退出条件（必须全部满足） | 核验命令 |
|---|---|---|---|
| M1 停止增量污染 | 新增代码不再引入 legacy/隐式耦合 | 新增 PR 无 legacy 依赖；新增页面走统一入口规范 | `npm run verify:prepush` |
| M2 核心统一 | 主功能链路收敛到 Engine | move/merge/score/undo/replay/import/export/submission 全部统一调用 | `npm run test:unit` + smoke |
| M3 协议统一 | 数据结构 contracts 化 | 核心链路数据结构均有 contract 定义且被消费 | unit schema tests |
| M4 页面重组 | 页面与路由体系完成 | 页面域结构稳定，散落入口清理完成 | entry manifest audit |
| M5 清壳收口 | 旧壳退出运行现实 | legacy loader=0，历史 runtime 不再主链路依赖，回流门禁生效 | quality + gate + smoke |
| M6 PKU 正式化 | PKU 模块产品化 | 比赛/提交/榜单/导播/观战全链路可用且有测试 | smoke + release ready |

## 6. 每周执行节奏（固定）
1. 周一：刷新基线、确认本周目标（只选 1-2 个里程碑子目标）。
2. 周二至周四：分 Workstream 推进，小批次提交、每批可回滚。
3. 周五：里程碑验收、风险复盘、更新本主文档和执行日志。

## 7. 首两周执行方案（W1/W2）
### W1：先锁 M1
- 目标：完成基线盘点，先挡住 legacy、入口散点和绕过点。
- 输入：当前基线、入口清单、legacy 扫描结果、现有 smoke/unit 门禁。
- 输出：M1 任务拆分、红线清单初版、必须补的测试项。
- 风险：基线不准、范围过大、遗留入口分散。
- 验收命令：`npm run verify:prepush`、`npm run audit:entry-manifest`

### W2：再推 M2
- 目标：把核心主链路收拢到 Engine，优先覆盖 move/undo/replay。
- 输入：W1 盘点结果、Engine 现状、contracts 缺口、回归样例。
- 输出：Engine 统一入口改造清单、contracts 补齐项、核心回归用例。
- 风险：接口兼容成本高、耦合面过大、一次改动过宽。
- 验收命令：`npm run test:unit`、`npm run test:smoke:ci`

## 8. 架构决策闸门（ADR Gate）
- 以下改动必须先写 ADR，再进入实现：
1. 新增或删除核心边界层：`Engine / contracts / storage / services / page system`。
2. 改变核心数据结构、序列化格式、回放格式、提交格式、存档格式。
3. 新增或替换页面入口、路由体系、统一导航结构。
4. 改变 `undo / replay / import / export / competition` 主链路行为。
5. 引入新的外部依赖、部署方式、存储后端或在线接口协议。
- ADR 必须写清楚：背景、方案、影响面、回滚方式、验收命令。
- 纯文案、样式微调、测试数据修正可不写 ADR，但不能触碰边界。

## 9. 变更控制与风险管理
- 架构决策记录：建议新增 `docs/adr/`，每个关键边界变更形成 ADR。
- 风险分级：
1. P0：阻断发布/核心链路不一致；
2. P1：高频功能回归风险；
3. P2：可维护性债务；
4. P3：文档与流程缺口。
- 升级规则：P0/P1 当天拉通修复并附验证证据。

## 10. 文档协同关系
- 架构红线：`docs/ARCHITECTURE_GUARDRAILS.md`
- 里程碑看板：`docs/ROADMAP_MILESTONES.md`
- 执行日志：`docs/EXECUTION_LOG.md`
- 历史缺陷复盘：`docs/REFACTOR_DEFECT_REVIEW_2026-03-16.zh-CN.md`

## 11. 下一步（本周建议）
1. 先补录第 3 节基线数值（用脚本产出，不手填估算）。
2. 在 `ROADMAP_MILESTONES` 中给每个 WS 指派负责人和时间窗。
3. 先把 M1 作为硬约束达成，再推进 M2/M3。


# 2048 骞冲彴閲嶆瀯鎬绘帹杩涙枃妗?


