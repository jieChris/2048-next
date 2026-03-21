# 重构执行日志（滚动）

> 用途：记录每轮推进的“动作-证据-风险-下一步”，保证推进可追溯。  
> 记录原则：小批次、可验证、可回滚。  
> 推荐频率：每个推进批次结束后更新一次。

## 日志模板

```md
## [YYYY-MM-DD] Batch-XX
- 目标：
- 完成项：
  1.
  2.
- 验证证据：
  - 命令：
  - 结果：
- 风险与阻塞：
  - 风险级别（P0/P1/P2/P3）：
  - 描述：
  - 缓解动作：
- 下一步（1-3条）：
  1.
  2.
```

---

## [2026-03-21] Batch-Init
- 目标：建立平台化重构的统一推进文档体系。
- 完成项：
1. 新建总推进文档：`PLATFORM_REFACTOR_MASTER_PLAN.md`。
2. 新建架构红线文档：`ARCHITECTURE_GUARDRAILS.md`。
3. 新建里程碑看板：`ROADMAP_MILESTONES.md`。
4. 建立本日志模板并初始化首条记录。
- 验证证据：
  - 命令：`git status --short`
  - 结果：上述 4 个文档新增可见。
- 风险与阻塞：
  - 风险级别：P2
  - 描述：当前“基线数值”仍为待补录，尚未形成自动化快照。
  - 缓解动作：下一批次优先补齐基线扫描命令与数值落表。
- 下一步（1-3条）：
1. 补录总推进文档第 3 节基线数据（脚本化采集）。
2. 给里程碑看板任务分配负责人与日期。
3. 以 M1 为目标先落地“防回流门禁”。

## [2026-03-21] Batch-Start
- 目标：建立 A-F 六个子代理并行协作机制，同时启动平台与服务、页面、核心、质量、产品的分工推进。
- 完成项：
1. 已建立 A-F 角色并行机制，职责分别覆盖架构、核心实现、页面实现、平台服务、质量门禁、产品验收。
2. 本轮并行任务目标已明确：围绕四份推进文档完成职责对齐、任务拆分与证据闭环。
3. 当前工作原则已确认：不孤立工作，不回退他人改动，发现冲突先协调。
- 验证证据：
  - 命令：`git -C G:\2048\2048undo\2048-next status --short --branch`
  - 结果：当前分支为 `main...origin/main`，且仅存在 `docs/` 下待提交的文档新增项。
  - 命令：`Get-Content docs/EXECUTION_LOG.md -TotalCount 120`
  - 结果：已确认 Batch-Init 结构与本次新增日志格式一致。
- 风险与阻塞：
  - 风险级别：P2
  - 描述：并行推进会带来文档更新与代码变更的交叉冲突，尤其是 `docs/ROADMAP_MILESTONES.md` 与平台/页面改造同时推进时。
  - 缓解动作：每个代理只更新自己的主责文档，代码改动按任务切片推进，先读后改，冲突即时协调。
- 下一步（1-3条）：
1. 按主代理分配，分别为四份文档补齐负责人、状态和里程碑字段。
2. 由 D 继续维护 `EXECUTION_LOG.md` 的批次记录节奏。
3. 将本轮并行任务拆成可执行的最小批次，并为每批次绑定验证命令。

## [2026-03-21] Batch-Scan-01
- 目标：完成首轮架构盘点并把结果回填到主文档与看板。
- 完成项：
1. 完成主线程基线扫描：入口总量、`localStorage/fetch` 点位、legacy 残留。
2. 收到 B 报告：绕过 Engine 的疑似状态写入点共 22 处，并给出 Top10 风险点。
3. 收到 C 报告：完成页面清单盘点，识别 4 个平台内非统一入口页面。
4. 已将基线与盘点结果回填到 `PLATFORM_REFACTOR_MASTER_PLAN.md` 与 `ROADMAP_MILESTONES.md`。
- 验证证据：
  - 命令：`git ls-files "*.html"` / `git ls-files "src/entries/*.ts"`
  - 结果：`17 html` / `22 entry ts`。
  - 命令：`Select-String "localStorage\\." src js` 与 `Select-String "fetch\\(" src js`
  - 结果：`src/entries` 为 `2/0`，`src+js` 为 `50/7`。
- 风险与阻塞：
  - 风险级别：P1
  - 描述：主入口仍有 legacy 残留，且核心状态写入点分散在 runtime helper 中。
  - 缓解动作：按 WS1/WS2 先做“入口收口 + 核心写入收口”，再推进 contracts 与页面归并。
- 下一步（1-3条）：
1. 启动 WS1-02：把 legacy 回流门禁细化成可执行检查并接入 CI。
2. 启动 WS2-02：先处理 move/undo/replay 的 Engine 统一入口改造。
3. 启动 WS4-02：对 4 个非统一入口页面给出纳管路径与迁移批次。

## [2026-03-21] Batch-Gate-01
- 目标：完成 WS1-02，把 legacy 回流门禁固化到 refactor gate。
- 完成项：
1. 新增 `scripts/legacy-boundary-audit.mjs`，对 `src/entries` 做 legacy-loader 导入与调用边界审计。
2. 将 `legacy-boundary-audit` 接入 `scripts/refactor-gate.mjs` 的强制步骤与 timeout 映射。
3. 更新 `scripts/refactor-timeout-env-keys.mjs`，支持 `legacy-boundary-audit` 的预算环境变量映射。
4. 新增/更新单测：`legacy-boundary-audit-helpers.spec.ts`、`refactor-timeout-env-keys.spec.ts`、`release-readiness-check-helpers.spec.ts`。
- 验证证据：
  - 命令：`node scripts/legacy-boundary-audit.mjs`
  - 结果：PASS（`importers=1, callsites=1`）。
  - 命令：`npm run verify:prepush`
  - 结果：PASS，`legacy-boundary-audit` 已纳入 `verify:refactor:ci` 固定流程并通过。
- 风险与阻塞：
  - 风险级别：P1
  - 描述：当前门禁已限制 legacy-loader 边界，但 Engine/contracts 的绕过点尚未全部收口。
  - 缓解动作：下一批次聚焦 WS2-02 与 WS3-01，按“高风险写入点 -> contracts 覆盖矩阵”推进。
- 下一步（1-3条）：
1. 推进 WS2-02：对 `move/undo/replay` 先做统一入口封装。
2. 推进 WS3-01：建立 contracts 覆盖矩阵并补最小断言。
3. 推进 WS4-02：执行 4 个非统一入口页面的纳管方案。

## [2026-03-21] Batch-WS2-01
- 目标：推进 WS2-02 首批改造，先收口 `move/undo/replay` 的核心状态写入入口。
- 完成项：
1. 在 `core_game_manager_runtime_call_helpers_runtime.js` 新增统一写入 helper（`score/grid/undoStack/replayIndex`）。
2. 在 `core_game_manager_bindings_runtime.js` 暴露对应 Runtime 写入方法，统一从 manager 原型调用。
3. 在 `move/undo/replay` 三条链路替换关键直接赋值为统一写入入口，并保留 fallback 逻辑保证兼容。
- 验证证据：
  - 命令：`npm run verify:prepush`
  - 结果：PASS（audit/unit/smoke/build 全通过，包含 `legacy-boundary-audit`）。
- 风险与阻塞：
  - 风险级别：P1
  - 描述：当前收口覆盖了首批高频写点，但 `restart/saved-state/import/export` 仍存在未收口状态写入。
  - 缓解动作：下一批次继续按风险顺序推进 `restart/saved-state`，并补 contracts 覆盖矩阵。
- 下一步（1-3条）：
1. 执行 WS2-02 第二批：收口 `restart/saved-state` 状态写入入口。
2. 执行 WS3-01：补齐对应 contracts 映射与断言。
3. 将收口规则补充到质量门禁断言中，防止回流。

## [2026-03-21] Batch-WS2-02
- 目标：完成 WS2-02 第二批改造，收口 `restart/saved-state/session-init` 的状态写入入口。
- 完成项：
1. 为 runtime helper 增加 `setRuntimeGrid` 与 `setRuntimeRedoStack`。
2. 在 `restart_setup` 中把 `grid/score/undoStack/redoStack/replayIndex` 的关键直接写入改为统一入口。
3. 在 `saved_state` 中把 `setBoardFromMatrix`、`base/replay state` 的 `grid/score/undoStack/redoStack` 改为统一入口。
4. 在 `session_init` 中把 `undoStack/redoStack` 初始化改为统一入口。
- 验证证据：
  - 命令：`npm run verify:prepush`
  - 结果：PASS（audit/unit/smoke/build 全通过）。
  - 命令：对 `restart_setup/saved_state/session_init` 扫描 `grid/score/undoStack/redoStack/replayIndex` 直接写入
  - 结果：目标文件内关键直接写入已清零。
- 风险与阻塞：
  - 风险级别：P1
  - 描述：`import/export` 链路仍有部分状态写入与协议耦合，尚未完全统一。
  - 缓解动作：下一批次聚焦 `WS2-02` 收尾 + `WS3-01` contracts 覆盖矩阵联动。
- 下一步（1-3条）：
1. 推进 WS2-02 收尾：处理 import/export 链路剩余写点。
2. 推进 WS3-01：建立 contracts 覆盖矩阵并补最小断言。
3. 评估将“状态写入必须走 runtime helper”纳入审计脚本。

## [2026-03-21] Batch-WS2-03
- 目标：完成 WS2-02 收尾，统一 import/export 链路关键状态写入口。
- 完成项：
1. 在 `js/core_game_manager_runtime_call_helpers_runtime.js` 新增统一写入口：`setRuntimeReplayMoves`、`setRuntimeReplaySpawns`、`setRuntimeReplayMovesV2`、`setRuntimeUndoEnabled`、`setRuntimeDisableSessionSync`、`setRuntimeReplayDelay`。
2. 在 `js/core_game_manager_bindings_runtime.js` 暴露以上写入口到 `GameManager` 原型，保证运行时统一调用。
3. 在 `js/core_game_manager_replay_helpers_runtime.js` 将 import/export 关键直接赋值改为统一写入口（`replayMoves/replaySpawns/replayMovesV2/undoEnabled/disableSessionSync/replayDelay`）。
4. 保留 fallback 语义，确保行为不回归。
- 验证证据：
  - 命令：`npm run verify:prepush`
  - 结果：PASS（game-manager-audit / entry-manifest-audit / legacy-boundary-audit / engine-audit / unit / smoke / build 全通过）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：本批完成了 import/export 写入口收口，但“写入口必须经 runtime helper”的规则尚未纳入自动审计。
  - 缓解动作：下一批优先补齐 WS8-01 审计断言与 WS3-01 contracts 覆盖矩阵。
- 下一步（1-3条）：
1. 推进 WS3-01：建立 replay/import/export 字段的 contracts 映射矩阵与最小断言。
2. 推进 WS8-01：新增“关键状态写入不得绕过 runtime helper”的审计规则。
3. 对账号/历史/回放主链路补一轮 smoke 聚焦回归（保证页面行为与数据一致）。

## [2026-03-21] Batch-WS8-01
- 目标：把“关键状态写入不能绕过 runtime helper”固化为自动审计门禁（先覆盖 replay/import/export 关键字段）。
- 完成项：
1. 在 `scripts/game-manager-audit.mjs` 新增 replay 写入边界规则：`manager.replayIndex/replayMoves/replaySpawns/replayMovesV2/undoEnabled/disableSessionSync/replayDelay` 仅允许在 `setRuntime*ForReplay` 包装函数内赋值。
2. 新增 `collectReplayRuntimeWriteBoundaryViolations()`，并接入 `game-manager-audit` 主流程失败阻断。
3. 在 `tests/unit/game-manager-audit-helpers.spec.ts` 增加正反两类单测（绕过写入应报违规、包装写入应通过）。
- 验证证据：
  - 命令：`npm run test:unit -- tests/unit/game-manager-audit-helpers.spec.ts`
  - 结果：PASS（全量 unit：139 files / 820 tests）
  - 命令：`npm run verify:prepush`
  - 结果：PASS（audit/unit/smoke/build 全通过）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：当前规则覆盖 replay 关键字段，其他模块（如 saved-state/session-init）仍需按同策略扩展。
  - 缓解动作：下一批把同类边界规则扩展到其它高风险状态字段，并与 WS3-01 合并推进。
- 下一步（1-3条）：
1. 推进 WS3-01：落地 replay/import/export contracts 覆盖矩阵与断言。
2. 扩展 WS8-01：补齐 saved-state/session-init 的关键字段写入边界审计。
3. 基于矩阵补一轮 smoke 契约用例，形成可发布证据。

## [2026-03-21] Batch-WS3-01
- 目标：落地 replay/import/export 的 contracts 覆盖矩阵，并把最小断言纳入 CI。
- 完成项：
1. 在 `src/contracts/index.ts` 新增必填字段常量：`REPLAY_RECORD_REQUIRED_KEYS`、`HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS`、`SUBMIT_PAYLOAD_REQUIRED_KEYS`。
2. 新增运行时最小校验函数：`isReplayRecordLike()`、`isHistoryExportEnvelopeLike()`、`isSubmitPayloadLike()`。
3. 新增 `REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX`，把 contract 字段、生产方、消费方、断言位置集中声明。
4. 在 `tests/unit/contracts.spec.ts` 增补矩阵与校验函数断言（正反用例）。
5. 新增文档 `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md` 作为 WS3-01 首批矩阵基线。
- 验证证据：
  - 命令：`npx vitest run tests/unit/contracts.spec.ts`
  - 结果：PASS（1 file / 26 tests）
  - 命令：`npm run verify:prepush`
  - 结果：PASS（game-manager-audit / entry-manifest-audit / legacy-boundary-audit / engine-audit / unit / smoke / build 全通过）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：当前矩阵覆盖了 replay/import/export 三类核心 contract，但尚未覆盖 saved-state/session-init。
  - 缓解动作：下一批继续扩展矩阵范围，并把覆盖率校验接入 gate。
- 下一步（1-3条）：
1. 扩展矩阵到 saved-state/session-init 并补最小校验函数。
2. 增补 matrix->smoke 的契约用例映射，形成发布证据链。
3. 增加 gate 检查：缺失 matrix 行或必填字段漂移时阻断。

## [2026-03-21] Batch-WS8-02
- 目标：将 WS3-01 的 contracts 矩阵接入 refactor gate，防止后续结构漂移。
- 完成项：
1. 新增 `scripts/contracts-matrix-audit.mjs`，校验 `src/contracts/index.ts` 中矩阵与关键 token 完整性。
2. 审计规则已覆盖：`ReplayRecord`、`HistoryExportEnvelope`、`SubmitPayload` 三行矩阵必须存在，且 `requiredKeys/producers/consumers/assertions` 不为空。
3. 将 `contracts-matrix-audit` 接入 `scripts/refactor-gate.mjs` 执行步骤与 timeout 映射。
4. 更新 `scripts/refactor-timeout-env-keys.mjs`，新增 `REFACTOR_GATE_TIMEOUT_CONTRACTS_MATRIX_AUDIT_MS` 映射。
5. 更新 `scripts/release-readiness-check.mjs`：把矩阵文档与审计脚本纳入必检文件，并要求 gate 包含 `contracts-matrix-audit` 关键片段。
6. 新增/更新单测：
   - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
   - `tests/unit/refactor-timeout-env-keys.spec.ts`
   - `tests/unit/release-readiness-check-helpers.spec.ts`
- 验证证据：
  - 命令：`node scripts/contracts-matrix-audit.mjs`
  - 结果：PASS
  - 命令：`npm run verify:release-ready`
  - 结果：PASS
  - 命令：`npm run verify:prepush`
  - 结果：PASS（包含 `contracts-matrix-audit` 在内的全部 gate 步骤通过）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：当前门禁已保护 replay/import/export 三类矩阵，但尚未覆盖 saved-state/session-init 的 contracts 行。
  - 缓解动作：下一批扩展矩阵和审计规则到 saved-state/session-init，并补对应 smoke 契约用例。
- 下一步（1-3条）：
1. 扩展矩阵与审计到 saved-state/session-init。
2. 增补 matrix->smoke 场景映射并落地回归用例。
3. 收敛 WS3/WS8 为可签收状态（准备 F sign-off 证据表）。

## [2026-03-21] Batch-WS3-02
- 目标：把 contracts 矩阵从 replay/import/export 扩展到 saved-state/session-init，并保持 gate 全绿。
- 完成项：
1. 在 `src/contracts/index.ts` 新增合同：`SavedGameStatePayload`、`SessionInitPayload`。
2. 新增必填字段常量与最小校验函数：
   - `SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS` + `isSavedGameStatePayloadLike()`
   - `SESSION_INIT_PAYLOAD_REQUIRED_KEYS` + `isSessionInitPayloadLike()`
3. 新增 `CORE_CONTRACT_COVERAGE_MATRIX` 并保留 `REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX` 别名兼容。
4. 在 `src/bootstrap/play-startup-payload.ts` 对齐 `SessionInitPayload` 类型来源（contracts 单一真源）。
5. 更新 `scripts/contracts-matrix-audit.mjs`：支持解析 `CORE_CONTRACT_COVERAGE_MATRIX`，并强校验 5 个合同行。
6. 更新并扩展文档基线：`docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`。
7. 扩展单测：`tests/unit/contracts.spec.ts`、`tests/unit/contracts-matrix-audit-helpers.spec.ts`、`tests/unit/bootstrap-play-startup-payload.spec.ts`。
- 验证证据：
  - 命令：`npx vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts tests/unit/bootstrap-play-startup-payload.spec.ts`
  - 结果：PASS（3 files / 34 tests）
  - 命令：`node scripts/contracts-matrix-audit.mjs`
  - 结果：PASS
  - 命令：`npm run verify:release-ready`
  - 结果：PASS
  - 命令：`npm run verify:prepush`
  - 结果：PASS（含 contracts-matrix-audit）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：矩阵和 gate 已覆盖到 saved-state/session-init，但 smoke 契约场景还未对这两行做端到端绑定。
  - 缓解动作：下一批补齐对应 smoke 案例，并把案例路径纳入 matrix 审计。
- 下一步（1-3条）：
1. 增补 `SavedGameStatePayload` / `SessionInitPayload` 的 smoke 契约用例。
2. 扩展 `contracts-matrix-audit`：校验 assertions 中的测试文件路径存在。
3. 整理 WS3/WS8 的 F sign-off 证据表并准备收口。

## [2026-03-21] Batch-WS8-03
- 目标：补齐 saved-state/session-init 的 smoke 契约场景，并把 matrix assertions 路径存在性纳入 gate 审计。
- 完成项：
1. 新增 smoke 用例 `tests/smoke/pages-contracts-saved-session.smoke.spec.ts`：
   - 验证 play 启动链路 `SessionInitPayload` 最小合同（`modeKey/modeConfig/inputManagerCtor/defaultBoardWidth`）；
   - 验证 practice 强制保存后的 `SavedGameStatePayload` 最小合同（含 `board` 数组与关键字段）。
2. 扩展 `scripts/contracts-matrix-audit.mjs`：
   - 新增 assertions 字段解析；
   - 新增 assertions 路径存在性检查（支持普通路径与 `*` 通配匹配）；
   - matrix 校验流程加入该检查。
3. 更新 `src/contracts/index.ts` 的 `SavedGameStatePayload` / `SessionInitPayload` 行 assertions，接入新 smoke 用例路径。
4. 扩展 `tests/unit/contracts-matrix-audit-helpers.spec.ts`，覆盖 assertions 路径检查正反用例。
- 验证证据：
  - 命令：`npx vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts tests/unit/bootstrap-play-startup-payload.spec.ts`
  - 结果：PASS（3 files / 35 tests）
  - 命令：`node scripts/contracts-matrix-audit.mjs`
  - 结果：PASS
  - 命令：`npx playwright test --config=playwright.config.ts tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
  - 结果：PASS（2 tests）
  - 命令：`npm run verify:prepush`
  - 结果：PASS（含 contracts-matrix-audit + 全量 smoke）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：矩阵与 gate 已覆盖 saved-state/session-init，但 assertions 目前只校验“路径存在”，尚未校验“场景覆盖深度”。
  - 缓解动作：下一批为关键 contract 增加覆盖度指标（例如每行最少 1 unit + 1 smoke）。
- 下一步（1-3条）：
1. 在 matrix audit 中加入“每个 contract 至少绑定 unit+smoke 各 1 条”的规则。
2. 补充 SavedState 的异常路径 smoke（损坏 payload/版本不匹配）契约。
3. 汇总 WS3/WS8 的 F sign-off 证据并准备收口。

## [2026-03-21] Batch-WS8-04
- 目标：完成 WS3/WS8 收口前的“覆盖深度门禁 + 异常路径 smoke + Submit 合同 smoke 绑定”。
- 完成项：
1. 扩展 `scripts/contracts-matrix-audit.mjs`：
   - 新增 assertions 覆盖深度规则：每个 contract 行至少 `1 unit + 1 smoke`；
   - 新增 `verifyMatrixAssertionCoverageDepth()` 并接入主流程；
   - 导出 `isUnitAssertionPath()`、`isSmokeAssertionPath()` 用于单测。
2. 扩展 `tests/unit/contracts-matrix-audit-helpers.spec.ts`：
   - 新增覆盖深度规则正反用例，防回退。
3. 补齐 SubmitPayload 的 smoke 合同断言：
   - 在 `tests/smoke/pages-online-record-submit-restart-flush.smoke.spec.ts` 采集 `/records` 请求体并断言 `SubmitPayload` 必填键与 `final_board` 数组形态。
4. 补齐 SavedState 异常路径 smoke：
   - 在 `tests/smoke/pages-contracts-saved-session.smoke.spec.ts` 新增两条用例：
     - `saved-state restore rejects version-mismatch payload`
     - `saved-state restore rejects malformed board payload`
5. 更新 contracts 矩阵与基线文档断言映射：
   - `src/contracts/index.ts`
   - `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`
- 验证证据：
  - 命令：`npm run test:unit -- tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - 结果：PASS（全量 unit：140 files / 832 tests）
  - 命令：`node scripts/contracts-matrix-audit.mjs`
  - 结果：PASS
  - 命令：`npx playwright test --config=playwright.config.ts tests/smoke/pages-online-submit-timeout-retry.smoke.spec.ts`
  - 结果：PASS（1 test）
  - 命令：`npx playwright test --config=playwright.config.ts tests/smoke/pages-online-record-submit-restart-flush.smoke.spec.ts`
  - 结果：PASS（1 test）
  - 命令：`npx playwright test --config=playwright.config.ts tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
  - 结果：PASS（4 tests）
  - 命令：`npm run verify:prepush`
  - 结果：PASS（game-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 全通过）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：WS3/WS8 技术闭环已基本齐备，但 F sign-off 证据表仍需按“体验/业务/证据/风险”四栏汇总并签收。
  - 缓解动作：下一批聚焦证据表沉淀与 WS3-02 首批切片启动。
- 下一步（1-3条）：
1. 形成 WS3/WS8 的 F sign-off 证据表并完成 A/F 共同确认。
2. 启动 WS3-02（历史隐式结构迁移到 contracts）首批任务拆分。
3. 连续观察 2-3 轮真实 CI，确认新深度门禁无误报。

## [2026-03-21] Batch-WS3-03
- 目标：启动 WS3-02 首批切片，把历史结构从“隐式对象”迁移到 contracts 运行时入口。
- 完成项：
1. 在 `src/contracts/index.ts` 新增 HistoryRecord 运行时契约能力：
   - `HISTORY_RECORD_REQUIRED_KEYS`
   - `isHistoryRecordLike()`
   - `normalizeHistoryRecordLike()`
2. 在 `src/storage/history-idb.ts` 将以下链路切换到 contracts 归一化入口：
   - `migrateFromLocalStorage`
   - `saveRecord`
   - `getById`
   - `importRecords`
   - 游标读取路径 `readAllRecordsByCursor`
   - 同时把 envelope 判定改为复用 `isHistoryExportEnvelopeLike()`。
3. 扩展 `tests/unit/contracts.spec.ts`：
   - 新增 HistoryRecord 必填键常量断言；
   - 新增 `isHistoryRecordLike` 正反断言；
   - 新增 `normalizeHistoryRecordLike` 默认值与数字字符串归一化断言。
- 验证证据：
  - 命令：`npx vitest run tests/unit/contracts.spec.ts`
  - 结果：PASS（1 file / 29 tests）
  - 命令：`npx vitest run tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - 结果：PASS（1 file / 6 tests）
  - 命令：`npx playwright test --config=playwright.config.ts tests/smoke/history-records-import-core.smoke.spec.ts`
  - 结果：PASS（2 tests）
  - 命令：`npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 结果：PASS（1 test）
  - 命令：`node scripts/contracts-matrix-audit.mjs`
  - 结果：PASS
  - 命令：`npm run verify:prepush`
  - 结果：PASS（game-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 全通过）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：`src/storage/history-idb.ts` 已 contracts 化，但 `js/local_history_store.js` 仍保留独立 `normalizeRecord` 逻辑，存在“双实现漂移”风险。
  - 缓解动作：下一批将 `local_history_store` 迁移到 contracts 归一化单一真源，避免字段漂移。
- 下一步（1-3条）：
1. 推进 WS3-02 第二批：收敛 `js/local_history_store.js` 的历史归一化逻辑到 contracts。
2. 输出 WS3/WS8 的 F sign-off 证据表并完成签收。
3. 继续观察 2-3 轮 CI，确认新增门禁稳定。

## [2026-03-21] Batch-WS3-04
- 目标：完成 WS3-02 第二批，将 `local_history_store` 的历史归一化逻辑收敛到 runtime contracts 入口。
- 完成项：
1. 在 `src/core/game-settings-storage.ts` 新增 `normalizeHistoryRecordFromContext()`，与 contracts 的 HistoryRecord 默认值/数值归一化规则对齐。
2. 在 `js/core_game_settings_storage_runtime.js` 同步新增并导出 `normalizeHistoryRecordFromContext`，作为 legacy 页面可复用的统一入口。
3. 在 `js/local_history_store.js` 重构 `normalizeRecord`：
   - 优先调用 `CoreGameSettingsStorageRuntime.normalizeHistoryRecordFromContext`；
   - 保留 `normalizeRecordFallback` 作为运行时兜底；
   - owner/diagnostics 的扩展字段继续在本模块附加。
4. 在 `tests/unit/core-game-settings-storage.spec.ts` 新增 HistoryRecord 归一化测试（正向与空输入）。
- 验证证据：
  - 命令：`npx vitest run tests/unit/core-game-settings-storage.spec.ts`
  - 结果：PASS（1 file / 24 tests）
  - 命令：`npx vitest run tests/unit/contracts.spec.ts`
  - 结果：PASS（1 file / 29 tests）
  - 命令：`npx playwright test --config=playwright.config.ts tests/smoke/history-records-import-core.smoke.spec.ts`
  - 结果：PASS（2 tests）
  - 命令：`npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 结果：PASS（1 test）
  - 命令：`node scripts/contracts-matrix-audit.mjs`
  - 结果：PASS
  - 命令：`npm run verify:prepush`
  - 结果：PASS（game-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 全通过）
- 风险与阻塞：
  - 风险级别：P1
  - 描述：`local_history_store` 已收敛，但历史展示层（`history_page.js` / `user_profile_page.js`）仍可能存在字段拼装分支，需继续统一。
  - 缓解动作：下一批扫描页面层的历史字段拼装点并收敛到 contracts 访问路径。
- 下一步（1-3条）：
1. 推进 WS3-02 下一批：收敛历史展示层隐式字段拼装。
2. 汇总 WS3/WS8 的 F sign-off 证据表并签收。
3. 连续观察 2-3 轮 CI，确认门禁稳定无误报。
