# 里程碑推进看板
> 用途：把重构目标拆成可执行任务，并跟踪状态、阻塞、验收与发布节奏。
> 状态枚举：`pending` / `in_progress` / `blocked` / `done`
> 负责人标记：`A` 架构负责人，`B` 核心实施，`C` 应用与页面，`D` 平台与服务，`E` 质量与门禁，`F` 产品与验收

## 1. 里程碑总览

| 里程碑 | 目标 | 负责人 | 本周优先级 | 目标完成时间 | 当前状态 | 验收列（F sign-off） | 完成判定 |
|---|---|---|---|---|---|---|---|
| M1 停止增量污染 | 禁止 legacy 回流、入口散点增量 | A / E | P0 | 待定 | in_progress | F 先签字确认“无新增散点入口、无 legacy 回流” | 新增改动全部通过架构门禁 |
| M2 Engine 单核统一 | 核心状态变化统一入口 | B / E | P0 | 待定 | pending | F 确认主链路体验与行为一致 | 主链路无绕过 Engine 调用 |
| M3 contracts 统一 | 核心数据结构协议化 | B / D / E | P1 | 待定 | pending | F 确认数据展示、回放、提交格式可用 | 状态/回放/提交结构 contracts 化 |
| M4 页面体系重组 | 页面域与入口系统化 | C / A | P1 | 待定 | pending | F 确认导航、跳转、信息架构清晰 | 散点入口收敛并纳管 |
| M5 旧壳退场 | legacy 物理删除与防回流 | A / D / E | P1 | 待定 | pending | F 确认旧入口已退出用户路径 | legacy 依赖清零 |
| M6 PKU 正式化 | 比赛链路正式产品化 | C / D / F | P2 | 待定 | pending | F 以产品视角签字确认可发布 | 比赛/榜单/导播/观战可用且有测试 |

## 2. 当前任务池（按 Workstream）

| 任务ID | 任务 | Workstream | 负责人 | 本周优先级 | 截止日期 | 状态 | 阻塞项 | 验收列（F sign-off） | 验收命令 | DoD |
|---|---|---|---|---|---|---|---|---|---|---|
| WS1-01 | 盘点并标记所有 legacy 入口与调用点 | WS1 | A / D | P0 | 待定 | in_progress | 无 | F 确认看板中 legacy 清单完整、无遗漏入口 | `rg -n "legacy|runtime" js *.html src` | 形成清单并分级 |
| WS1-02 | 建立 legacy 回流门禁规则 | WS1 | E / A | P0 | 2026-03-21 | done | 无 | F 复核门禁覆盖 legacy-loader 导入与调用边界 | `npm run verify:prepush` | 已接入 `legacy-boundary-audit` 且全链路通过 |
| WS2-01 | 汇总绕过 Engine 的状态写入点 | WS2 | B / E | P0 | 2026-03-21 | done | 无 | F 复核首轮扫描范围与风险分级可接受 | unit/smoke + 扫描 | 已形成 Top10 清单与总量统计（22） |
| WS2-02 | undo/replay/import/export 统一引擎管线 | WS2 | B / C | P1 | 2026-03-24 | in_progress | 依赖 WS2-01 | F 确认撤回、回放、导入导出都可正常使用 | `npm run test:smoke:ci` | 已完成 move/undo/replay/restart/saved-state 写入收口，剩余 import/export 持续推进 |
| WS3-01 | 建立 contracts 覆盖矩阵（状态/回放/提交/同步） | WS3 | B / D | P1 | 待定 | pending | 无 | F 确认对外展示和存储字段稳定 | `npm run test:unit` | 覆盖矩阵可追踪 |
| WS3-02 | 历史隐式结构迁移到 contracts | WS3 | C / D | P1 | 待定 | pending | 需兼容策略 | F 确认历史/回放页面无字段丢失 | unit + smoke | 旧结构退出主链路 |
| WS4-01 | 页面信息架构与导航树落图 | WS4 | A / C | P1 | 2026-03-24 | in_progress | 产品边界确认 | F 确认入口层级和命名符合使用预期 | 文档评审 | 已完成首轮页面清单（17 html / 22 entries） |
| WS4-02 | 散点 html 入口纳管/归档 | WS4 | C / D | P1 | 2026-03-28 | in_progress | 依赖 WS4-01 | F 确认入口清单和页面分组清晰 | `npm run audit:entry-manifest` | 已识别 4 个平台内非统一入口页面 |
| WS5-01 | 页面到服务层调用改造（去直接规则、存储访问） | WS5 | C / D | P1 | 待定 | pending | 依赖 WS6 抽象 | F 确认页面交互未退化 | smoke + code audit | UI 与核心解耦 |
| WS6-01 | storage 抽象统一（history/settings/replay） | WS6 | D / B | P1 | 待定 | pending | 无 | F 确认设置、历史、回放行为一致 | `npm run test:unit` + `npm run test:smoke:ci` | 页面不直连 `localStorage` |
| WS6-02 | API 层统一（leaderboard/submission/broadcast/account） | WS6 | D / C | P2 | 待定 | pending | 无 | F 确认对外能力可用且错误提示明确 | smoke + integration | 页面不直连业务 API 协议 |
| WS7-01 | PKU 页面域正式化并接入统一导航 | WS7 | C / F | P2 | 待定 | pending | IA 待确定 | F 确认 PKU 不再是隐藏页 | smoke | PKU 不再隐藏入口 |
| WS7-02 | PKU 观战/导播链路测试化 | WS7 | C / E | P2 | 待定 | pending | 测试夹具准备 | F 确认关键链路可回归 | smoke | 关键链路可回滚 |
| WS8-01 | 增加架构契约测试（Engine/contracts/legacy） | WS8 | E / A | P0 | 2026-03-24 | in_progress | 需继续扩展 contracts/engine 边界断言 | F 确认门禁足够拦截回退 | `npm run verify:prepush` | legacy 边界契约已落地，Engine/contracts 契约继续补齐 |

## 3. F sign-off 通过条件模板

F sign-off 不是“看起来可以”，而是以下 4 项同时满足：

| 项目 | 通过条件 | 记录方式 |
|---|---|---|
| 体验 | 用户主路径无明显退化，入口、文案、跳转符合预期 | 在本列写 `pass` / `fail` + 一句话结论 |
| 业务 | 满足本任务的业务目标，例如普通游玩、账号体系、PKU 产品线 | 写明覆盖场景 |
| 证据 | 已完成对应单测、smoke 或人工回归 | 写明验证命令或截图编号 |
| 风险 | 已知风险已记录，且不影响当前发布窗口 | 写明 `none` 或风险摘要 |

模板：

| F sign-off 结果 | 体验 | 业务 | 证据 | 风险 | 备注 |
|---|---|---|---|---|---|
| `pass` / `fail` | `pass` / `fail` | `pass` / `fail` | `command or artifact` | `none` / `risk summary` | `short note` |

## 4. 首轮盘点快照（2026-03-21）

| 项目 | 结果 | 来源 |
|---|---|---|
| 入口总量 | `17 html` / `22 entry ts` | 主线程脚本扫描 |
| 主入口 legacy 残留 | `1`（`home-family-bootstrap.ts`） | 主线程扫描 + B 报告 |
| Engine 绕过疑似点 | `22` | B 报告 |
| 平台内非统一入口页面 | `4` | C 报告（`account_settings/register/password/user`） |
| `src/entries` 直接 localStorage / fetch | `2 / 0` | 主线程扫描 |
| `src+js` 总计 localStorage / fetch | `50 / 7` | 主线程扫描 |

## 5. 本周执行批次（模板）

| 批次 | 时间窗 | 目标 | 预计提交数 | 验证命令 | F sign-off | 结果 |
|---|---|---|---:|---|---|---|
| Batch-A | 周一-周二 | 先完成基线盘点与规则固化 | 2-4 | `npm run verify:prepush` | 预留 | 待执行 |
| Batch-B | 周三-周四 | 推进 Engine/contracts 收敛 | 2-5 | `npm run test:unit` + `npm run test:smoke:ci` | 预留 | 待执行 |
| Batch-C | 周五 | 文档收口与风险复盘 | 1-2 | `npm run verify:release-ready` | 预留 | 待执行 |

## 6. 发布节奏建议

推荐采用“灰度 -> 小流量全量 -> 全量”的节奏：

1. 灰度
   - 先在内部账号、测试账号或小范围用户上确认主路径。
   - 只放行已通过 F sign-off 的里程碑任务。
   - 重点观察错误率、页面可用性、回退是否容易。
2. 小流量全量
   - 灰度稳定后扩大到有限比例用户。
   - 继续关注体验反馈和回归信号。
   - 若出现阻断问题，立即回退到上一稳定版本。
3. 全量
   - 仅在单测、smoke、发布前验收全部通过后进行。
   - 发布后补一轮回归记录，更新 `EXECUTION_LOG.md`。

发布原则：
- 只允许“单批次、单目标、单验收”进入灰度。
- 没有 F sign-off 的任务，不进入发布窗口。
- 任何 P0 问题优先阻断发布，不做口头放行。

## 7. 更新规范

1. 每次任务状态变化必须更新“负责人、本周优先级、阻塞项、F sign-off、验证命令”。
2. 任务改为 `done` 时必须附上对应 commit 和验证结果。
3. `blocked` 超过 48 小时必须在执行日志中登记升级处理。
4. 每周至少刷新一次里程碑总览中的优先级和验收状态。

## 8. 增量状态更新（2026-03-21 / Batch-WS2-03）

- WS2-02（undo/replay/import/export 统一引擎管线）：`in_progress`
  - 已完成范围：`move/undo/replay/restart/saved-state/import/export` 关键状态写入口统一。
  - 已完成证据：`npm run verify:prepush` 全绿。
  - 剩余工作：将“禁止绕过 runtime helper 写关键状态”固化为审计门禁（与 WS8-01 联动）。

- WS3-01（contracts 覆盖矩阵）：`pending -> next`
  - 下一批启动项：
    1. replay/import/export 结构字段矩阵（来源、消费方、断言位置）；
    2. 单测最小集合（字段存在性、类型、兼容分支）；
    3. 与 smoke 场景绑定的契约验收清单。

- WS8-01（架构契约门禁）：`in_progress`
  - 下一批重点：新增对关键写入路径的静态审计，防止后续回流直接赋值。

### 接下来必须做的工作（按优先级）
1. WS3-01 contracts 矩阵落地并补齐最小断言。
2. WS8-01 写入口审计门禁落地并接入 `verify:refactor:ci`。
3. 完成一轮账号/历史/回放链路的 smoke 聚焦回归并记录 F sign-off 证据。

## 9. 增量状态更新（2026-03-21 / Batch-WS8-01）

- WS8-01（架构契约门禁）：`in_progress`
  - 本批新增能力：
    - `game-manager-audit` 已可阻断 replay/import/export 关键字段绕过 `setRuntime*ForReplay` 的直接写入。
  - 已验证：`npm run verify:prepush` 全绿。
  - 剩余：将同类写入边界扩展到 saved-state / session-init 等模块。

- WS2-02：`in_progress`（工程收口已完成，等待门禁覆盖面继续扩大后转 `done`）

- WS3-01：`pending -> next`（下一批主线）
  - 目标：contracts 矩阵 + 最小断言 + smoke 契约验收清单。

### 接下来必须做的工作（按优先级）
1. 产出 WS3-01 contracts 覆盖矩阵（replay/import/export 优先）。
2. 扩展 WS8-01 审计范围到 saved-state/session-init 关键字段。
3. 增补与 contracts 绑定的 smoke 契约回归并沉淀 F sign-off。

## 10. 增量状态更新（2026-03-21 / Batch-WS3-01）

- WS3-01（contracts 覆盖矩阵）：`in_progress`
  - 本批已完成：
    - replay/import/export 三类 contract 的必填字段常量；
    - 对应运行时最小校验函数；
    - 统一矩阵常量 `REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX`；
    - 对应 unit 断言与基线文档。
  - 验证：`npm run verify:prepush` 全绿。
  - 剩余：覆盖面扩展到 saved-state/session-init，并接入 gate 检查。

- WS8-01（架构契约门禁）：`in_progress`
  - 已有 replay 写入边界门禁。
  - 下一步与 WS3 联动：加入 matrix 覆盖度审计。

### 接下来必须做的工作（按优先级）
1. 扩展 WS3-01 矩阵到 saved-state/session-init。
2. 增加 matrix 漂移检查并接入 `verify:refactor:ci`。
3. 补齐 matrix 绑定的 smoke 契约回归并沉淀 F sign-off 证据。

## 11. 增量状态更新（2026-03-21 / Batch-WS8-02）

- WS8-01（架构契约门禁）：`in_progress`
  - 本批完成：`contracts-matrix-audit` 已接入 `verify:refactor:ci` 并通过。
  - 当前效果：contracts 矩阵（replay/import/export）从“文档约束”升级为“CI 阻断约束”。

- WS3-01（contracts 覆盖矩阵）：`in_progress`
  - 本批完成：矩阵完整性已有自动审计兜底。
  - 剩余工作：矩阵覆盖范围扩展到 saved-state/session-init。

### 接下来必须做的工作（按优先级）
1. 扩展 WS3-01：新增 saved-state/session-init 合同矩阵行与校验函数。
2. 扩展 WS8-01：将上述新增矩阵行并入 `contracts-matrix-audit` 强校验。
3. 联动 smoke：为新增矩阵行补回归场景，形成 F sign-off 证据链。
