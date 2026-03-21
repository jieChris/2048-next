# 重构遗留缺陷审查报告（滚动修订，2026-03-19）

> 审查目标：持续识别“重构未收口”导致的真实缺陷与工程风险，并按优先级小步推进（小批次、可验证、可回滚）。

## 当前状态（稳态结论）

- 质量门禁：`audit:quality` 稳定为 **0 告警**（复杂度/耦合/重复均为 0）。
- 回归门禁：`verify:refactor --smoke-script=test:smoke:runtime-contract` 稳定通过。
- 单测与构建：`test:unit`、`build` 均持续通过。
- 风险等级：
  - 功能正确性风险：低
  - 可维护性风险：低
  - 迭代效率风险：低（已从“治理存量”转入“防反弹”阶段）

---

## 历史推进摘要（压缩）

- P0（smoke 前置 / baseline 漂移）：已收口。
- P1（入口治理）：`entry-manifest-audit` + `verify:refactor` 已形成可阻断回退门禁。
- P1/P2（Engine 状态化）：`createEngineSession` 生命周期与边界校验已落地并有单测覆盖。
- P2/P3（复杂度与重复代码治理）：前 18 批低风险拆分/去重已完成，`audit:quality` 热点归零。
- CI 诊断增强：`quality-audit-report`、`diagnostics-index`、失败优先级提示均已接入。

---

## 稳态巡检模板（固定）

每轮仅记录以下增量：

1. 本轮变化（代码/流程）
2. 验证证据（固定基线命令 + 结果）
3. 风险结论（是否引入新阻塞）
4. 下一步（2~4 条可直接执行动作）

---

## 上一批回顾（第27批）

- `.github/workflows/smoke.yml`
  - `diagnostics-index` 已解析并展示 `refactor-gate-summary.json` 关键字段。
- `scripts/release-readiness-check.mjs` + `tests/unit/release-readiness-check-helpers.spec.ts`
  - 已将 summary 字段解析链路纳入 release-ready 契约与单测。

---

## 本轮增量（第28批）

### 1) Diagnostics Index 增加 timeout 显式字段与提示

- 文件：`.github/workflows/smoke.yml`
- 改动：
  - `Extract refactor gate summary fields` 新增解析字段：
    - `has_timeout`
    - `timeout_steps`
  - “Refactor Gate Summary Field” 表格新增 timeout 两列；
  - triage 增加 timeout 专项提示（优先检查预算与机器负载）；
  - 无摘要文件时的 fallback 输出同步新增 timeout 字段。

### 2) 收紧 release-ready 契约（防回退）

- 文件：`scripts/release-readiness-check.mjs`
- 改动：
  - 新增对以下 workflow 片段的强校验：
    - `REF_GATE_HAS_TIMEOUT` / `REF_GATE_TIMEOUT_STEPS` 环境映射；
    - timeout 字段表格行输出。
- 文件：`tests/unit/release-readiness-check-helpers.spec.ts`
  - 样例 workflow 同步新增 timeout 字段链路，保障契约可测。

### 3) 维持 tail 参数化契约单测覆盖

- 文件：`tests/unit/refactor-gate-helpers.spec.ts`
  - 持续校验 `STEP_OUTPUT_TAIL_LINES_ENV_KEY` 与 `resolveStepOutputTailLines` 行为。

结论：清单第2项已完成，`signal=TIMEOUT` 已前移为 diagnostics-index 的显式结构化信息。

---

## 第28批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS（全量执行）：`135 files / 758 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (20 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第28批改造后，门禁保持全绿，且 timeout 信息已结构化展示到诊断首页。

---

## 本轮增量（第29批）

### 1) timeout 专项提示补齐“推荐预算键”映射

- 文件：`.github/workflows/smoke.yml`
- 改动：
  - 在 `diagnostics-index` 的 timeout triage 分支新增步骤到预算键映射：
    - `game-manager-audit` -> `REFACTOR_GATE_TIMEOUT_GAME_MANAGER_AUDIT_MS`
    - `entry-manifest-audit` -> `REFACTOR_GATE_TIMEOUT_ENTRY_MANIFEST_AUDIT_MS`
    - `engine-audit` -> `REFACTOR_GATE_TIMEOUT_ENGINE_AUDIT_MS`
    - `unit` -> `REFACTOR_GATE_TIMEOUT_UNIT_MS`
    - `smoke` -> `REFACTOR_GATE_TIMEOUT_SMOKE_MS`
    - `build` -> `REFACTOR_GATE_TIMEOUT_BUILD_MS`
    - 未识别步骤 -> `REFACTOR_GATE_TIMEOUT_DEFAULT_MS`
  - 新增 `Timeout tuning key(s)` 输出，timeout 发生时可直接看到建议调整键。

### 2) 收紧 release-ready 契约（覆盖 timeout 键映射链路）

- 文件：`scripts/release-readiness-check.mjs`
- 改动：
  - `SMOKE_WORKFLOW_REQUIRED_SNIPPETS` 新增 timeout 映射与 `Timeout tuning key(s)` 相关片段校验，防止 workflow 回退。
- 文件：`tests/unit/release-readiness-check-helpers.spec.ts`
  - 样例 workflow 同步补齐映射片段，并将负向断言改为替换唯一片段，避免误判。

结论：清单第2项（timeout 提示补充推荐预算键映射）已完成。

---

## 第29批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS（全量执行）：`135 files / 758 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (21 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第29批改造后，CI 诊断在 timeout 场景下已可直接给出预算键级别的调参入口，排障路径进一步收敛。

---

## 本轮增量（第30批）

### 1) timeout 键建议去重 + 分行展示落地

- 文件：`.github/workflows/smoke.yml`
- 改动：
  - 在 `diagnostics-index` timeout 分支新增 `append_unique_timeout_key`，按键去重聚合；
  - `timeout_steps` 多值场景下改为逐项输出：
    - `Timeout tuning key(s):`
    - `- REFACTOR_GATE_TIMEOUT_*`
  - 保留 fallback：无可识别步骤时仍输出 `REFACTOR_GATE_TIMEOUT_DEFAULT_MS`。

### 2) release-ready 契约同步收紧（覆盖去重/分行逻辑）

- 文件：`scripts/release-readiness-check.mjs`
- 改动：
  - `SMOKE_WORKFLOW_REQUIRED_SNIPPETS` 新增去重函数与逐项输出相关片段：
    - `append_unique_timeout_key()`
    - `append_unique_timeout_key "REFACTOR_GATE_TIMEOUT_*"`
    - `echo "   - \`${timeout_key}\`";`
- 文件：`tests/unit/release-readiness-check-helpers.spec.ts`
  - 样例 workflow 同步补齐上述片段，继续保证契约可测。

结论：清单第4项（timeout 键建议去重与分行展示）已完成。

---

## 第30批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS（全量执行）：`135 files / 758 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (22 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第30批后，timeout 诊断建议在多步骤场景下可读性提升，且无重复键噪音。

---

## 本轮增量（第31批）

### 1) timeout step->预算键映射下沉为可复用脚本

- 文件：`scripts/refactor-timeout-env-keys.mjs`
- 改动：
  - 新增独立映射与去重逻辑，统一产出 timeout 预算键；
  - 默认兜底 `REFACTOR_GATE_TIMEOUT_DEFAULT_MS`；
  - 支持 CLI：`--steps=<comma-separated-steps>`，输出逐行键名。

### 2) diagnostics-index 改为调用脚本，移除内联复杂 case

- 文件：`.github/workflows/smoke.yml`
- 改动：
  - timeout triage 分支改为调用：
    - `node scripts/refactor-timeout-env-keys.mjs --steps="${REF_GATE_TIMEOUT_STEPS}"`
  - 保留逐行输出：
    - `Timeout tuning key(s):`
    - `- REFACTOR_GATE_TIMEOUT_*`
  - 删除内联 `case` 映射与去重函数，降低 workflow 维护复杂度。

### 3) release-ready 契约与单测同步收敛

- 文件：`scripts/release-readiness-check.mjs`
- 改动：
  - `REQUIRED_FILES` 新增 `scripts/refactor-timeout-env-keys.mjs`；
  - `SMOKE_WORKFLOW_REQUIRED_SNIPPETS` 改为强校验“脚本调用链路”片段，替代旧内联 case 片段。
- 文件：`tests/unit/release-readiness-check-helpers.spec.ts`
  - 样例 workflow 更新为脚本调用版 timeout 提示链路。
- 文件：`tests/unit/refactor-timeout-env-keys.spec.ts`
  - 新增脚本 helper 单测，覆盖解析/映射/去重/兜底行为。

结论：清单第4项（将 timeout step->预算键映射下沉为可复用脚本片段）已完成。

---

## 第31批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts tests/unit/refactor-timeout-env-keys.spec.ts`
  - PASS（全量执行）：`136 files / 762 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (23 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第31批后，timeout 预算键策略已从 workflow 内联逻辑迁移为可复用脚本，后续维护与回归风险进一步降低。

---

## 本轮增量（第32批）

### 1) runtime helper 小批次收敛（setup timer UI）

- 文件：`js/core_game_manager_setup_timer_ui_helpers_runtime.js`
- 改动：
  - 新增 `getSetupTimerSlotIds`，统一 timer slot 列表读取；
  - `normalizeLegacyTimerRowsForSetup`、`resetTimerTextSlotsForSetup`、`createSupportedTimerSlotMapForSetup` 改为复用统一读取 helper；
  - 将 `hideUnsupportedTimerRowsForSetup` 两段循环拆为：
    - `hideUnsupportedSetupTimerRowsByMap`
    - `hideUnsupportedSetupTimerValuesByMap`
  - `createCappedRowVisibilityPlanPayload`、`applyCappedRowVisibilityPlanFallback` 统一使用 `getSetupTimerSlotIds`，减少散落的静态列表读取路径。

### 2) 风险控制结论

- 本轮仅做结构收敛与防御性空值处理，不改业务语义；
- 主流程入口与调用顺序保持不变（`resetTimerUiForSetup` 行为不变）。

结论：清单第3项（runtime helper 小批次收敛）已按 2~3 函数/批节奏继续推进。

---

## 第32批验证证据（2026-03-18）

- `npm run test:unit`
  - PASS：`136 files / 762 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (24 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第32批后，setup timer UI helper 的可维护性进一步提升，且门禁持续全绿。

---

## 本轮增量（第33批）

### 1) runtime helper 小批次收敛（base helper：secondary timer toggle 链路）

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 `resolveSecondaryTimerLegendFromRow`、`resolveSecondaryTimerLegendFromTimerBox`、`resolveSecondaryTimerLegendElementForParent`，统一 legend 定位逻辑；
  - 新增 `bindSecondaryTimerToggleTargetsForParent`，统一 row/legend/timer 三类目标的绑定入口；
  - `bindSecondaryTimerParentToggleEvents` 改为复用上述 helper，降低函数内分支密度与重复路径；
  - 保持既有 `toggle -> visibility refresh -> scroll sync` 行为链路不变。

### 2) 风险控制结论

- 本轮聚焦结构收敛与职责拆分，不改业务语义；
- 事件绑定幂等语义保持不变（同 parent 不重复绑定），滚动回调路径保持不变。

结论：清单第3项（runtime helper 小批次收敛）已继续推进到 `core_game_manager_base_helpers_runtime.js`。

---

## 第33批验证证据（2026-03-18）

- `npm run test:unit`
  - PASS：`136 files / 762 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (25 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第33批后，base helper 的 secondary timer toggle 路径可读性与可维护性提升，门禁持续全绿。

---

## 本轮增量（第34批）

### 1) 为 base helper 新拆分路径补最小回归单测（优先项落地）

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `bindSecondaryTimerParentToggleEvents`：
    - 覆盖 row 无 legend 时从 `timerbox` fallback 查找 legend；
    - 覆盖同 parent 重复调用时 click 监听不重复绑定（幂等）。
  - `resolveSecondaryTimerParentAnchor`：
    - 覆盖“优先使用 parent row anchor”；
    - 覆盖 legacy 结构下 `timer + whitespace + <br><br>` 的 anchor 选择。
  - `stampSecondaryTimersForMergedValue`：
    - 覆盖“仅对满足条件 descriptor 落时间戳”；
    - 覆盖“仅在实际变更时触发 refresh”边界行为。

### 2) 风险控制结论

- 本轮仅新增单测，不改运行时代码路径；
- 覆盖面直接对应第33批拆分点，主要用于防止后续结构化重构带来的行为漂移。

结论：清单第4项（为 base helper 新拆分路径补最小单测）已完成。

---

## 第34批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`137 files / 765 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (26 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第34批后，base helper 关键拆分路径具备最小回归防线，且门禁持续全绿。

---

## 本轮增量（第35批）

### 1) 沿第34批单测基线补 descriptor/placement 负向场景

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `ensureSecondaryTimerDescriptorRow`
    - 覆盖 row 脱离目标 container 时的重挂行为（`row.parentNode !== container -> appendChild`）。
  - `placeSecondaryTimerRowsNearParents`
    - 覆盖无效 descriptor（缺 row / 非法 parent）被跳过；
    - 覆盖 anchor 不在 `timerbox` 时跳过放置；
    - 覆盖存在有效 descriptor 时仅有效项落位，并保持 `timer-scroll-controls` 在末尾。

### 2) 风险控制结论

- 本轮仅新增负向场景单测，不改运行时代码；
- 重点收紧 secondary timer 布局链路的边界行为，降低后续重构回归风险。

结论：清单第4项（descriptor/placement 负向场景补齐）已完成。

---

## 第35批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`137 files / 767 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (27 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第35批后，base helper 的 descriptor/placement 关键边界已有单测兜底，门禁持续全绿。

---

## 本轮增量（第36批）

### 1) 补齐多父级连续插入顺序用例（tailByParent 稳定性）

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `placeSecondaryTimerRowsNearParents` 在多 parent 交错 descriptor 输入下：
    - 每个 parent 的二级行保持“相对父级锚点后的连续顺序”；
    - 不同 parent 的插入不会互相打乱已建立的 tail 链；
    - `timer-scroll-controls` 保持在 `timerbox` 末尾。

### 2) 风险控制结论

- 本轮仅新增排序稳定性单测，不改运行时代码；
- 重点防止 secondary timer 多父级场景在后续重构中出现插入顺序回归。

结论：清单第4项（多父级连续插入顺序用例）已完成。

---

## 第36批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`137 files / 768 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (28 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第36批后，secondary timer 多父级放置顺序具备回归防线，门禁持续全绿。

---

## 本轮增量（第37批）

### 1) 补齐 legacy anchor 的“>2 个 `<br>`”边界用例

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `resolveSecondaryTimerParentAnchor` 在 legacy 结构下：
    - 当 `timer` 后存在三个及以上 `<br>` 时，仅吸收前两个 `<br>` 作为 anchor 扩展；
    - 第三个 `<br>` 及其后节点不参与 anchor 前移。

### 2) 风险控制结论

- 本轮仅新增边界单测，不改运行时代码；
- 固定 legacy 页面下的锚点解析契约，防止后续重构放大 `<br>` 链导致布局漂移。

结论：清单第4项（legacy 三个以上 `<br>` 边界用例）已完成。

---

## 第37批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`137 files / 769 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (29 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第37批后，legacy anchor 的 `<br>` 吸收边界行为已被测试锁定，门禁持续全绿。

---

## 本轮增量（第38批）

### 1) 补齐 stamp 空值文本写入边界用例

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `stampSecondaryTimerDescriptor` 在以下输入下统一写入空字符串：
    - `timeStr = ""`
    - `timeStr = undefined`
  - 固定空值输入不会留下历史文本，确保写入语义一致。

### 2) 风险控制结论

- 本轮仅新增单测，不改运行时代码；
- 锁定 stamp 文本写入的空值语义，降低后续重构时的字符串归一化回归风险。

结论：清单第4项（stamp `timeStr` 为空字符串/undefined 边界用例）已完成。

---

## 第38批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`137 files / 770 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (30 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第38批后，secondary timer stamp 空值写入语义已测试固化，门禁持续全绿。

---

## 本轮增量（第39批）

### 1) stamp 路径收紧：非 2 的幂 mergedValue 直接返回

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - `stampSecondaryTimersForMergedValue` 新增防御条件：
    - `if (!isSecondaryTimerPowerOfTwo(merged)) return;`
  - 语义：仅对“合法 power-of-two 且 >= 2048”的 merged 值进入 descriptor 扫描与可能的 refresh 路径。

### 2) 补齐 mergedValue 负向用例

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `mergedValue < 2048` 与 `mergedValue` 非 2 的幂时：
    - 不触发 descriptor 解析；
    - 不触发 refresh；
    - 不产生 timer 文本写入副作用。

### 3) 风险控制结论

- 本轮改动为防御式早返回，收紧输入边界，不影响正常（power-of-two）合并路径；
- 配套单测已锁定“无效输入无副作用”行为，降低后续回归风险。

结论：清单第4项（`stampSecondaryTimersForMergedValue` 负向用例）已完成并落地对应防御逻辑。

---

## 第39批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`137 files / 771 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (31 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第39批后，stamp 路径对无效 merged 输入具备显式防御与回归测试保障，门禁持续全绿。

---

## 本轮增量（第40批）

### 1) 为 invalidation 路径补齐 limit 边界单测

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `invalidateSecondaryTimersByLimit` 在非整数与空值 limit 下：
    - `limit = 2048.5`、`limit = ""` 时直接返回 `false`；
    - 不触发 descriptor 解析；
    - 不触发 refresh。
  - `invalidateSecondaryTimersByLimit` 在 `limit = 2048` 下：
    - 仅 `parent <= 2048` 的 descriptor 被置为占位文本；
    - `parent > 2048` 的 descriptor 保持原值；
    - 当传入空占位文本时回退到默认 `"---------"`；
    - refresh 仅触发一次。

### 2) 风险控制结论

- 本轮仅新增单测，不改运行时代码；
- 重点收紧 invalidation limit 的输入与刷新边界，防止后续重构导致“无效输入仍触发扫描/刷新”的回归。

结论：清单第4项（secondary timer invalidation limit 边界单测）已完成。

---

## 第40批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`137 files / 773 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (32 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第40批后，secondary timer invalidation 路径关键边界具备单测兜底，门禁持续全绿。

---

## 本轮增量（第41批）

### 1) 建立 output tail lines 的诊断联动分层（low/balanced/high/unknown）

- 文件：`.github/workflows/smoke.yml`
- 改动：
  - `Extract refactor gate summary fields` 新增输出字段：
    - `tail_lines_band`（`low` / `balanced` / `high` / `unknown`）；
  - 分层规则（基于 `output_tail_lines`）：
    - `< 80` -> `low`
    - `80~180` -> `balanced`
    - `> 180` -> `high`
    - 缺失或不可解析 -> `unknown`
  - `Diagnostics Index` 表格新增 `tail_lines_band`；
  - `Triage Priority` 新增 tail lines advisory：
    - `low`：提示提高 `REFACTOR_GATE_OUTPUT_TAIL_LINES` 并观察 3~5 次；
    - `high`：提示降低以抑制日志噪音；
    - `unknown`：提示检查 summary artifact 发布链路。

### 2) release-ready 契约与单测同步收紧

- 文件：`scripts/release-readiness-check.mjs`
  - `SMOKE_WORKFLOW_REQUIRED_SNIPPETS` 新增：
    - `tail_lines_band` 字段输出与环境映射片段；
    - `Tail lines advisory` 片段；
    - `REFACTOR_GATE_OUTPUT_TAIL_LINES=${REF_GATE_OUTPUT_TAIL_LINES}` 片段。
- 文件：`tests/unit/release-readiness-check-helpers.spec.ts`
  - workflow 夹具同步补齐以上片段，确保契约可测并防回退。

### 3) 风险控制结论

- 本轮改动仅扩展 CI 诊断信息，不影响业务运行时代码路径；
- 通过 release-ready 契约守护，避免后续 workflow 变更遗漏 tail lines 联动提示。

结论：清单第5项（`REFACTOR_GATE_OUTPUT_TAIL_LINES` 告警联动策略）已完成并纳入门禁契约。

---

## 第41批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`137 files / 773 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (33 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第41批后，CI 对 tail lines 的“可观测性 -> 调参建议”链路已结构化落地，门禁持续全绿。

---

## 本轮增量（第42批）

### 1) 为 refactor-gate 的 tail lines 增加上限钳制

- 文件：`scripts/refactor-gate.mjs`
- 改动：
  - 新增常量：`MAX_STEP_OUTPUT_TAIL_LINES = 240`；
  - `resolveStepOutputTailLines` 从“仅正整数解析”升级为“解析 + 上限钳制”：
    - 无效值 -> 回退默认 `80`
    - 超大值 -> 钳制到 `240`
  - 目标：避免异常大配置放大日志噪音与 artifact 体积。

### 2) 补齐单测与 release-ready 契约守护

- 文件：`tests/unit/refactor-gate-helpers.spec.ts`
  - 新增断言：`resolveStepOutputTailLines("9999") === MAX_STEP_OUTPUT_TAIL_LINES`。
- 文件：`scripts/release-readiness-check.mjs`
  - `REFACTOR_GATE_REQUIRED_SNIPPETS` 新增上限钳制相关必备片段：
    - `MAX_STEP_OUTPUT_TAIL_LINES`
    - `Math.min(parsed, MAX_STEP_OUTPUT_TAIL_LINES)`
- 文件：`tests/unit/release-readiness-check-helpers.spec.ts`
  - refactor-gate 样例片段同步加入上限钳制链路，防止契约回退。

### 3) 风险控制结论

- 本轮为防御式参数约束，不影响业务运行时代码路径；
- 通过 helper 单测 + release-ready 契约双保险，保证 tail lines 上限行为可持续回归。

结论：清单第4项（`resolveStepOutputTailLines` 范围约束与单测）已完成。

---

## 第42批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/refactor-gate-helpers.spec.ts tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS（全量执行）：`137 files / 773 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (34 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第42批后，tail lines 参数具备“默认值 + 上限钳制 + 契约守护”完整防线，门禁持续全绿。

---

## 本轮增量（第43批）

### 1) 将 tail lines 分层结果接入 refactor 周报

- 文件：`scripts/refactor-progress-report.mjs`
- 改动：
  - 新增 refactor gate summary 读取与快照提取能力（`artifacts/refactor-gate-summary.json`）；
  - 新增 tail lines 分层逻辑（与 CI diagnostics-index 保持一致）：
    - `< 80` -> `low`
    - `80~180` -> `balanced`
    - `> 180` -> `high`
    - 无法解析 -> `unknown`
  - `report:refactor-progress` 新增输出字段：
    - `refactor-gate output_tail_lines`
    - `refactor-gate tail_lines_band`
    - `refactor-gate failed_step`
    - `refactor-gate failed_step_duration_ms`
    - `refactor-gate slowest_step`
    - `refactor-gate slowest_step_duration_ms`

### 2) 补齐 helper 单测

- 文件：`tests/unit/refactor-progress-report-helpers.spec.ts`
- 覆盖点：
  - 正整数解析边界；
  - tail lines 分层阈值边界（79/80/180/181）；
  - summary 快照解析（failed step 时长与 slowest step 提取）；
  - 非法输入兜底（`available: false`）。

### 3) 风险控制结论

- 本轮仅扩展报告与测试，不改业务运行时代码；
- 周报指标与 CI 诊断分层阈值保持一致，降低后续评估默认值时的数据口径偏差。

结论：清单第4项（tail lines 分层结果接入 refactor 周报）已完成。

---

## 第43批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/refactor-progress-report-helpers.spec.ts tests/unit/refactor-gate-helpers.spec.ts tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS（全量执行）：`138 files / 777 tests` 全通过。
- `npm run report:refactor-progress`
  - PASS：新增输出 `output_tail_lines / tail_lines_band / failed_step_duration_ms / slowest_step_duration_ms` 字段。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (35 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第43批后，tail lines 分层与失败定位耗时已进入周报链路，门禁持续全绿。

---

## 本轮增量（第44批）

### 1) tail lines 周报样本改为自动累积历史

- 文件：`scripts/refactor-progress-report.mjs`
- 改动：
  - 新增历史文件：
    - `artifacts/refactor-progress-tail-history.json`
  - `report:refactor-progress` 在读取 summary 后自动追加一条样本并保留最近 `30` 条；
  - 新增输出：
    - `tail history: artifacts/refactor-progress-tail-history.json (runs kept: N)`
  - 首次运行已生成样本（当前 `runs kept: 1`）。

### 2) 补齐历史累积 helper 单测

- 文件：`tests/unit/refactor-progress-report-helpers.spec.ts`
- 覆盖点：
  - `createTailHistoryEntry` 结构正确性；
  - `appendTailHistoryEntry` 的上限截断行为（`limit=30` 时只保留最新 30 条）。

### 3) 风险控制结论

- 本轮仅扩展报告落盘与 helper 测试，不改业务运行时代码；
- 样本沉淀路径落地后，后续默认值评估由“手工记录”转为“自动累积”，减少漏记风险。

结论：清单第4项（tail lines 周报样本累积）已落地自动化基础，进入连续样本观察阶段。

---

## 第44批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/refactor-progress-report-helpers.spec.ts tests/unit/refactor-gate-helpers.spec.ts tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS（全量执行）：`138 files / 779 tests` 全通过。
- `npm run report:refactor-progress`
  - PASS：输出 tail history 路径与 `runs kept: 1`。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (36 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第44批后，tail lines 样本已进入自动化沉淀，门禁持续全绿。

---

## 本轮增量（第45批）

### 1) invalidation 路径收敛：仅在文本实际变化时触发 refresh

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 helper：
    - `resolveSecondaryTimerInvalidationPlaceholderText`
    - `canInvalidateSecondaryTimerDescriptorByLimit`
    - `applySecondaryTimerInvalidationText`
  - `invalidateSecondaryTimersByLimit` 改为：
    - 先判断 descriptor 是否在 limit 范围内；
    - 仅当 `timerEl.textContent` 与目标占位文本不同才写入并置 `changed=true`；
    - 因此“无实际文本变化”场景不再触发不必要的 `refreshSecondaryTimerRowsVisibility`。

### 2) 补齐“无变化不刷新”单测

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - 当目标 descriptor 已为 `"---------"` 且执行 `invalidateSecondaryTimersByLimit(..., 2048, "")` 时：
    - 返回 `false`；
    - 不触发 refresh；
    - descriptor 解析调用保持一次（逻辑路径仍被执行）。

### 3) 风险控制结论

- 本轮为防御式优化，不改变有效 invalidation 的业务结果，仅收紧“无变化副作用”；
- 配套单测已锁定“无变化不刷新”契约，降低后续重构的性能回归风险。

结论：runtime helper 小批次收敛继续推进，invalidation 链路已具备“仅变更刷新”的回归保障。

---

## 第45批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 780 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (37 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第45批后，secondary timer invalidation 的无效刷新已被消除，门禁持续全绿。

---

## 本轮增量（第46批）

### 1) placement 链路收敛：scroll controls 仅在“非尾部”时才移动

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - `appendSecondaryTimerScrollControls` 增加幂等边界判断：
    - 仅当 controls 在 `timerbox` 内且 `nextSibling !== null` 时才执行 `appendChild`；
    - 当 controls 已处于尾部时不再重复触发无意义的 DOM 移动。

### 2) 补齐“尾部幂等 + 必要移动”单测

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `does not re-append scroll controls when they are already at tail`
    - 校验 controls 已在尾部时不会触发 `appendChild`。
  - `moves scroll controls to tail when trailing nodes exist`
    - 校验 controls 后仍有节点时，会被移动回 `timerbox` 尾部。

### 3) 风险控制结论

- 本轮为防御式幂等优化，不改变 rows placement 结果，仅消除重复 DOM 操作；
- 单测已锁定“已在尾部不重复移动 / 非尾部时恢复尾部”的双向边界，降低后续回归风险。

结论：runtime helper 小批次收敛继续推进，placement 链路的幂等边界进一步收紧。

---

## 第46批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 782 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (38 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第46批后，secondary timer placement 在 scroll controls 尾部维护上已具备幂等保障，门禁持续全绿。

---

## 本轮增量（第47批）

### 1) placement 链路收敛：锚点失效回退 + descriptor 去重

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增锚点失效回退：
    - `resolveSecondaryTimerExistingTailAnchor`
    - 当 parent 锚点不可用时，回退查找 `timerbox` 内同 parent 的既有 secondary row 作为锚点；
  - 新增 descriptor 去重：
    - `resolveSecondaryTimerPlacementRowKey`
    - `shouldSkipSecondaryTimerPlacementRow`
    - `placeSecondaryTimerRowsNearParents` 对同一 rowId 的重复 descriptor 只处理一次。

### 2) 补齐“锚点回退 + 去重”单测

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `falls back to existing same-parent secondary row when parent anchor is unavailable`
    - 校验 parent 锚点缺失时，仍可基于同 parent 既有 secondary row 完成插入。
  - `deduplicates descriptors that target the same secondary row id`
    - 校验同 rowId 重复 descriptor 仅触发一次插入，避免重复 DOM 操作。

### 3) 风险控制结论

- 本轮为防御式 placement 收敛，不改变正常锚点可用场景的插入结果；
- 单测已锁定“锚点缺失可回退 / 重复 descriptor 去重”边界，降低后续重构回归风险。

结论：runtime helper 小批次收敛继续推进，placement 的失效回退与输入去重边界已纳入回归保障。

---

## 第47批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 784 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (39 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第47批后，secondary timer placement 在锚点失效与重复 descriptor 场景下具备稳定回退与幂等保障，门禁持续全绿。

---

## 本轮增量（第48批）

### 1) placement descriptor 归一化：去重键升级为三级策略

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - `resolveSecondaryTimerPlacementInfo` 新增 descriptor 归一化字段，去重键从“仅 rowId”升级为：
    - `row-id:<rowId>`（优先）
    - `parent-child:<parent>:<child>`（无 rowId 时）
    - 无键时回退到 row 引用去重
  - 新增 helper：
    - `resolveSecondaryTimerPlacementDescriptorRowId`
    - `resolveSecondaryTimerPlacementDedupeKey`
    - `hasSeenSecondaryTimerPlacementRowReference`
  - `shouldSkipSecondaryTimerPlacementRow` 改为支持“键去重 + 引用去重”双路径。

### 2) 补齐“无 rowId 去重”边界单测

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `deduplicates descriptors without row id by parent+child key`
    - 校验无 rowId 且 parent/child 相同时仅插入一次。
  - `deduplicates descriptors without row id and child by row reference`
    - 校验无 rowId、无 child 时仍可通过 row 引用去重，避免重复插入。

### 3) 风险控制结论

- 本轮为防御式输入归一化，不改变正常 placement 结果，仅收紧重复 descriptor 的幂等边界；
- 中途出现 `resolveSecondaryTimerPlacementInfo` 复杂度 `13`（阈值 `12`）告警，已在同批通过 helper 拆分回落到 `0` 告警。

结论：runtime helper 小批次收敛继续推进，placement 的“无 rowId 去重”边界已纳入稳定回归保障。

---

## 第48批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 786 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (41 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第48批后，placement descriptor 去重在 rowId 缺失场景下具备稳定幂等保障，门禁持续全绿。

---

## 本轮增量（第49批）

### 1) placement 去重键冲突防护：rowId 键纳入 parent 维度

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - `resolveSecondaryTimerPlacementDedupeKey` 将 rowId 去重键从：
    - `row-id:<rowId>`
  - 升级为：
    - `row-id:<parent>:<rowId>`
  - 效果：避免不同 parent 误用相同 rowId 时发生跨父级误去重。

### 2) placement 锚点优先级边界：tail 锚点失效时按优先级回退

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - `resolveSecondaryTimerPlacementAnchor` 改为显式候选链路：
    - `tailByParent` -> `parent anchor` -> `existing same-parent tail`
  - 每一步都验证 `anchor.parentNode === timerBox`，失效则继续回退，不再因首选锚点失效直接放弃插入。

### 3) 补齐冲突防护与锚点回退单测

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `does not dedupe same row id across different parents`
    - 校验相同 rowId 在不同 parent 下均可独立落位，不互相吞并。
  - `falls back to parent anchor when per-parent tail anchor becomes invalid`
    - 校验每父级 tail 锚点失效后，仍能回退到 parent 锚点继续插入。

### 4) 风险控制结论

- 本轮为防御式边界收敛，不改变正常数据下的 placement 结果；
- 新增单测锁定“跨 parent 去重冲突防护 + 锚点失效回退”行为，降低后续回归风险。

结论：runtime helper 小批次收敛继续推进，placement 冲突防护与锚点优先级边界已纳入回归保障。

---

## 第49批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 788 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (43 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮按用户要求未执行本地 smoke（避免启动浏览器窗口）。

结论：第49批后，placement 在“跨 parent rowId 冲突 + tail 锚点失效”场景下具备稳定回退与幂等保障，门禁持续全绿。

---

## 本轮增量（第50批）

### 1) placement 输入归一化兜底：非法 parent/child 可回退到 row 元数据

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - `resolveSecondaryTimerPlacementInfo` 的 parent/child 解析改为三段回退：
    - descriptor 值（优先）
    - row `data-secondary-parent` / `data-secondary-child`
    - row id（`timer-row-secondary-<parent>-<child>`）
  - 新增 helper：
    - `resolveSecondaryTimerPlacementParentValue`
    - `resolveSecondaryTimerPlacementChildValue`
    - `resolveSecondaryTimerPlacementRowNumericAttribute`
    - `resolveSecondaryTimerPlacementRowIdentity`
- 效果：descriptor 输入出现非法 parent/child 时，不再直接丢弃可落位 row，可基于 row 元信息继续完成 placement。

### 2) stale secondary row 扫描边界收敛：仅清理“规范受管”row id

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 `parseSecondaryTimerRowIdentity`，仅识别规范 id：
    - `timer-row-secondary-<parent>-<child>`
    - 且满足 `parent>=8192`、`child>=2048`、`child<parent`、父子均为 2 的幂
  - `isSecondaryTimerManagedRowNode` 改为基于该解析结果判断受管节点。
- 效果：`removeStaleSecondaryTimerRows` 不再误清理仅“前缀相似但非规范”的节点，stale 清理范围更可控。

### 3) 补齐归一化兜底与 stale 边界单测

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `removes only canonical stale secondary rows during descriptor refresh`
    - 校验 stale 清理只删除规范受管 row，保留非规范前缀节点。
  - `normalizes placement parent/child from row metadata when descriptor values are invalid`
    - 校验 descriptor 非法值可回退到 row data 属性完成插入。
  - `falls back to row id when descriptor and row metadata parent/child are invalid`
    - 校验 descriptor 与 row data 同时非法时仍可回退 row id 完成插入。

### 4) 风险控制结论

- 本轮属于防御式边界收敛，不改变正常输入下的 placement 路径；
- 新增单测锁定“非法输入兜底 + stale 扫描边界”行为，降低后续回归风险。

结论：runtime helper 小批次收敛继续推进，placement 归一化兜底与 stale row 清理边界已纳入回归保障。

---

## 第50批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 791 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (44 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run report:refactor-progress`
  - PASS：`tail history ... (runs kept: 2)`。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮执行 smoke 为无头运行，未启动可见浏览器窗口。

结论：第50批后，placement 在“非法 descriptor parent/child + 非规范前缀 stale row”场景下具备稳定兜底与边界隔离能力，门禁持续全绿。

---

## 本轮增量（第51批）

### 1) placement 输入一致性收敛：invalid child 不再参与 parent-child 去重键

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 `isValidSecondaryTimerParentChildPair`，统一 secondary parent/child 合法性判定：
    - `parent>=8192`
    - `child>=2048`
    - `child<parent`
    - 父子均为 2 的幂
  - `resolveSecondaryTimerPlacementChildValue` 改为仅在上述合法条件满足时返回 child，否则返回 `null`。
- 效果：
  - `child>=parent` 或 `child` 非 2 的幂时，不再生成 `parent-child:*` 去重键；
  - placement 与 dedupe 对非法 child 的处理保持一致（回退到 row-id/row-reference 路径）。

### 2) secondary state 恢复过滤边界补齐：异常 state 行直接丢弃

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - `applySecondaryTimerRowsState` 在构建 `stateByKey` 前，新增 parent/child 合法性过滤（复用 `isValidSecondaryTimerParentChildPair`）。
  - `parseSecondaryTimerRowIdentity` 同步复用该合法性 helper，避免规则漂移。
- 效果：
  - 恢复链路不会接纳 `child>=parent`、非 2 幂 child 等异常 state 行；
  - row id 解析规则与 state 恢复规则保持单一来源。

### 3) 补齐一致性与过滤单测

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `does not dedupe invalid child>=parent descriptors by parent+child key`
  - `does not dedupe non-power-of-two child descriptors by parent+child key`
  - `filters malformed secondary state rows before applying timer text`
- 说明：
  - 同步扩展 `loadBaseHelpersRuntime` 的测试类型，暴露 `applySecondaryTimerRowsState` 以覆盖恢复边界。

### 4) 风险控制结论

- 本轮属于防御式一致性收敛，不改变合法 secondary parent/child 的既有行为；
- 通过新增单测锁定 “invalid child 去重一致性 + 异常 state 过滤” 双边界，降低后续回归风险。

结论：runtime helper 小批次收敛继续推进，placement 与 restore 两条链路的 parent/child 合法性规则已统一。

---

## 第51批验证证据（2026-03-18）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 794 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (45 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run report:refactor-progress`
  - PASS：`tail history ... (runs kept: 3)`。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第51批后，secondary timer 在“invalid child 输入 + 异常 state 恢复”场景下具备统一判定与稳定过滤，门禁持续全绿。

---

## 本轮增量（第52批）

### 1) placement 入口一致性收敛：parent 非法值统一前置拦截

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 `isValidSecondaryTimerParentValue`，统一 secondary parent 合法性判定：
    - `parent>=8192`
    - `parent` 为 2 的幂
  - `resolveSecondaryTimerPlacementParentValue` 改为仅在 parent 合法时返回：
    - descriptor parent
    - row `data-secondary-parent`
    - row id 解析 parent
  - `isValidSecondaryTimerParentChildPair` 复用 parent 合法性 helper，避免规则分叉。
- 效果：
  - `parent<8192` 或非 2 幂 parent 在 placement 入口即被一致过滤；
  - 去重键构建与锚点计算不再处理非法 parent，行为更稳定可预期。

### 2) applySecondaryTimerRowsState 重复 key 优先级边界补齐

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - 新增 `applies duplicate secondary state rows by last occurrence order`
    - 校验同一 `parent|child` 出现重复 state 行时，后出现行覆盖先出现行（last winner）；
    - 反向输入顺序同样可回放出对应“最后一条生效”结果。

### 3) placement 非法 parent 边界单测补齐

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - 新增 `skips placement when parent is below 8192 or not power-of-two`
    - 覆盖 descriptor parent 为 `<8192`；
    - 覆盖 descriptor parent 为非 2 幂；
    - 覆盖 descriptor 非法但 row metadata parent 非法（<8192）；
    - 期望均不进入 placement，`timerbox` 结构保持不变。

### 4) 风险控制结论

- 本轮属于防御式一致性收敛，不改变合法 secondary parent/child 的既有行为；
- 新增单测锁定“非法 parent 入口过滤 + 重复 key last winner”边界，降低后续重构回归风险。

结论：runtime helper 小批次收敛继续推进，placement 的 parent 合法性与 state 覆盖优先级契约已显式化并纳入回归保障。

---

## 第52批验证证据（2026-03-19）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 796 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (46 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run report:refactor-progress`
  - PASS：`tail history ... (runs kept: 4)`。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第52批后，secondary timer 在“非法 parent placement + duplicate state key”场景下具备统一过滤与确定性覆盖行为，门禁持续全绿。

---

## 本轮增量（第53批）

### 1) secondary state 文本恢复边界收敛：空字符串有效，非字符串丢弃

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 `normalizeSecondaryTimerRowStateTime`：
    - `time` 缺失 -> 归一为 `""`
    - `time` 为字符串（含空字符串）-> 直接采用
    - `time` 为非字符串 -> 视为非法 state 行并丢弃
  - `applySecondaryTimerRowsState` 改为在构建 `stateByKey` 时先归一/过滤 `time`。
- 效果：
  - 空字符串继续作为“显式清空”语义参与 last-winner；
  - 非字符串 `time` 不再覆盖同 key 的有效字符串状态，恢复行为更稳定可预测。

### 2) placement descriptor 去重键可观测性补齐：调试快照落地

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 placement 调试快照 helper：
    - `createSecondaryTimerPlacementDebugSnapshot`
    - `markSecondaryTimerPlacementDedupeObserved`
    - `publishSecondaryTimerPlacementDebugSnapshot`
  - `placeSecondaryTimerRowsNearParents` 在每次执行后写入 `manager.secondaryTimerPlacementDebugSnapshot`，包含：
    - `totalDescriptors`
    - `validPlacementDescriptors`
    - `placed`
    - `skippedDuplicate`
    - `skippedMissingAnchor`
    - `dedupeKeyHits`
- 效果：
  - 不改变 placement 业务路径；
  - 提供可直接用于诊断的去重命中/跳过统计快照，便于后续定位 descriptor 输入质量问题。

### 3) tail lines 默认值提案落地：CI 从 `120` 收敛为 `80`

- 文件：`.github/workflows/smoke.yml`
- 改动：
  - `REFACTOR_GATE_OUTPUT_TAIL_LINES: "120"` -> `"80"`。
- 文件：`tests/unit/release-readiness-check-helpers.spec.ts`
- 改动：
  - 同步样例 workflow 中的 `REFACTOR_GATE_OUTPUT_TAIL_LINES` 值为 `80`，保持契约样例一致。
- 依据：
  - `report:refactor-progress` 当前样本累计 `runs kept: 5`；
  - 本轮观测 `output_tail_lines: 80` 且 `tail_lines_band: balanced`。

### 4) 单测补齐

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - 新增 `treats empty-string state time as valid and ignores non-string overrides`
    - 校验同 key 下非字符串 `time` 不覆盖已有有效字符串；
    - 校验空字符串 `time` 作为有效状态可生效清空。
  - 在 `deduplicates descriptors without row id by parent+child key` 中补充断言：
    - `secondaryTimerPlacementDebugSnapshot` 的 `dedupeKeyHits/skippedDuplicate/placed` 统计符合预期。

### 5) 风险控制结论

- 本轮为防御式收敛与可观测性增强，不改合法输入下的核心业务语义；
- 通过新增单测锁定“空字符串 vs 非字符串”边界与去重快照契约，降低后续回归与排障成本。

结论：runtime helper 小批次收敛继续推进，secondary state 恢复边界与 placement 去重可观测性已纳入回归保障；tail lines 默认值调整提案已完成并落地为 CI 配置。

---

## 第53批验证证据（2026-03-19）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 797 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (47 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run report:refactor-progress`
  - PASS：`output_tail_lines: 80`、`tail_lines_band: balanced`、`runs kept: 5`。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第53批后，secondary state 文本恢复与 placement 去重诊断能力均具备明确契约；tail lines 样本目标已达 5 次并形成默认值下调落地结果，门禁持续全绿。

---

## 本轮增量（第54批）

### 1) placement existing-tail 锚点冲突收敛：仅接受受管 parent 信息

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 `resolveSecondaryTimerExistingTailAnchorParent`，统一从以下来源解析 existing-tail 候选行 parent：
    - 规范 row id（`timer-row-secondary-<parent>-<child>`）
    - `data-secondary-parent`
  - `resolveSecondaryTimerExistingTailAnchor` 改为仅在满足以下条件时回退命中：
    - 节点 id 为 `timer-row-secondary-*` 前缀；
    - 可解析且合法的 parent（`>=8192` 且 2 的幂）与目标 parent 一致。
- 效果：
  - 非规范前缀行（如 `timer-row-secondary-legacy-extra`）不再被误当作 existing-tail 锚点；
  - parent row/timer anchor 缺失时，placement 回退路径更可控，减少误插入。

### 2) placement 调试快照最小摘要导出

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增最小摘要链路：
    - `resolveSecondaryTimerPlacementDebugSummaryFromSnapshot`
    - `resolveSecondaryTimerPlacementDebugSummary`
    - `countSecondaryTimerPlacementDebugKeys`
  - `publishSecondaryTimerPlacementDebugSnapshot` 现在同步写入：
    - `manager.secondaryTimerPlacementDebugSnapshot`（完整快照）
    - `manager.secondaryTimerPlacementDebugSummary`（轻量摘要）
- 摘要字段：
  - `totalDescriptors`
  - `validPlacementDescriptors`
  - `placed`
  - `skippedDuplicate`
  - `skippedMissingAnchor`
  - `dedupeKeyKinds`
- 效果：
  - 为后续 diagnostics 接入提供低噪音、稳定字段，不需要直接消费完整 `dedupeKeyHits` 明细。

### 3) 单测补齐（anchor 冲突 + 摘要契约）

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - 新增 `ignores malformed existing-tail rows without managed parent metadata`
    - 校验当 parent anchor 不可用时，非受管 malformed existing-tail 行不会被误命中，descriptor 不会误插入。
  - 在 `deduplicates descriptors without row id by parent+child key` 中新增摘要断言：
    - `resolveSecondaryTimerPlacementDebugSummary(manager)` 输出稳定轻量字段。
  - `falls back to existing same-parent secondary row when parent anchor is unavailable` 用例中的 existing row 改为规范 id，保持契约语义明确。

### 4) 风险控制结论

- 本轮为防御式边界收敛与可观测性增强，不改变合法 descriptor 的主流程 placement 语义；
- 通过新增单测锁定“existing-tail 误命中规避 + 摘要字段稳定性”，降低后续接入 diagnostics 时的回归风险。

结论：runtime helper 小批次收敛继续推进，placement anchor 退化路径的冲突边界与调试摘要输出已纳入回归保障。

---

## 第54批验证证据（2026-03-19）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 798 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (48 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run report:refactor-progress`
  - PASS：`output_tail_lines: 80`、`tail_lines_band: balanced`、`runs kept: 6`。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第54批后，placement existing-tail 回退路径在 malformed 节点场景下具备稳定防误命中行为，且轻量调试摘要已可供后续 diagnostics 接入，门禁持续全绿。

---

## 本轮增量（第55批）

### 1) placement 去重统计一致性收敛：三路径策略命中计数统一

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - `createSecondaryTimerPlacementDebugSnapshot` 新增 `dedupeStrategyHits`；
  - 新增 `resolveSecondaryTimerPlacementDedupeStrategy`，统一识别去重策略：
    - `row-id`
    - `parent-child`
    - `row-reference`
  - `shouldSkipSecondaryTimerPlacementRow` 在三类路径下统一记录策略命中次数；
  - `resolveSecondaryTimerPlacementDebugSummaryFromSnapshot` 新增稳定摘要字段：
    - `rowIdStrategyHits`
    - `parentChildStrategyHits`
    - `rowReferenceStrategyHits`
- 效果：
  - placement 调试摘要可直接区分当前批次 descriptor 主要走了哪条去重路径；
  - 便于后续 diagnostics 在失败场景快速定位“重复输入来自 row-id / parent-child / row-reference 的哪一类”。

### 2) 三路径一致性单测补齐

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - `deduplicates descriptors that target the same secondary row id`
    - 新增摘要断言：`rowIdStrategyHits=2`；
  - `deduplicates descriptors without row id by parent+child key`
    - 更新摘要断言：`parentChildStrategyHits=2`；
  - `deduplicates descriptors without row id and child by row reference`
    - 新增摘要断言：`rowReferenceStrategyHits=2`。
- 效果：
  - 去重统计字段在三条路径下均有回归保障，避免后续字段漂移。

### 3) 风险控制结论

- 本轮为纯可观测性与测试收敛，不改变 placement 主流程语义；
- 通过三路径统计一致性断言，降低后续 diagnostics 消费摘要字段时的误判风险。

结论：runtime helper 小批次收敛继续推进，placement 去重统计在 `row-id / parent-child / row-reference` 三路径下已形成统一可观测契约。

---

## 第55批验证证据（2026-03-19）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 798 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (49 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run report:refactor-progress`
  - PASS：`output_tail_lines: 80`、`tail_lines_band: balanced`、`runs kept: 7`。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第55批后，placement 去重统计摘要可稳定覆盖三类策略路径，门禁持续全绿。

---

## 本轮增量（第56批）

### 1) placement 调试摘要稳定性收敛：无快照场景返回 0 值结构

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 `createSecondaryTimerPlacementDebugSummaryDefaults`，统一定义摘要默认结构；
  - `resolveSecondaryTimerPlacementDebugSummaryFromSnapshot` 改为：
    - 输入非对象快照时返回默认 0 值摘要（不再返回 `null`）；
    - 输入有效快照时在默认结构上覆写统计值；
  - `resolveSecondaryTimerPlacementDebugSummary` 在 `manager` 缺失时同样返回默认 0 值摘要。
- 效果：
  - diagnostics 侧可直接消费固定字段，不必额外处理 `null` 分支；
  - placement 未运行、无有效 descriptor、或全量跳过场景下均输出稳定结构。

### 2) no-valid / all-missing-anchor 边界单测补齐

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - 新增 `keeps debug summary stable when all descriptors are invalid`
    - 校验全无效 descriptor 场景摘要字段全部稳定为 0；
  - 新增 `reports missing-anchor counts when all valid descriptors cannot be placed`
    - 校验全 missing-anchor 场景下 `validPlacementDescriptors` 与 `skippedMissingAnchor` 计数正确；
  - 新增 `returns zeroed debug summary when placement has not run`
    - 校验未执行 placement 时摘要仍返回完整 0 值结构；
  - 在 `skips invalid placement descriptors and anchors outside timerbox` 补充摘要断言，覆盖“部分有效 + 部分 missing-anchor”混合场景。

### 3) 风险控制结论

- 本轮属于可观测性输出契约收敛，不改变 placement 主流程行为；
- 新增边界单测锁定“空快照/异常输入/全跳过”摘要输出，降低 diagnostics 接入期风险。

结论：runtime helper 小批次收敛继续推进，placement 调试摘要在关键退化场景下已具备稳定字段契约。

---

## 第56批验证证据（2026-03-19）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 801 tests` 全通过。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- `npm run audit:quality`
  - PASS，`Trend snapshot (50 runs kept)`；
  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 均为 `0`（Δ 全为 `0`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run report:refactor-progress`
  - PASS：`output_tail_lines: 80`、`tail_lines_band: balanced`、`runs kept: 8`。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第56批后，placement 调试摘要在“未运行 / 全无效 / 全 missing-anchor”场景下均可稳定输出，门禁持续全绿。

---

## 接下来需要做的工作（明确清单）

1. 观察 CI 合并后 `REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 的稳定性
   - 目标：连续观察 2~3 次真实 CI，确认 `tail_lines_band` 维持 `balanced` 且失败定位信息无明显损失；若出现 `low` 连续告警，再回滚至 `120`。
2. 按同一基线持续巡检（每批必做）
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`
3. 继续执行 runtime helper 小批次收敛（2~3 函数/批）
   - 目标：在 0 告警前提下防反弹，建议下一批聚焦 `core_game_manager_base_helpers_runtime.js` 的 diagnostics 友好导出（摘要字段白名单 + 可选截断）与现有 `diagnostics-index` 对接预备字段。
4. 评估是否将 `secondaryTimerPlacementDebugSnapshot` 接入 diagnostics 摘要
   - 目标：优先消费 `secondaryTimerPlacementDebugSummary`（而非完整快照），并限制在失败场景输出，避免常态日志噪音；先完成字段白名单，再考虑落库历史。

---

## 每批验证基线（保持不变）

- `npm run audit:quality`
- `npm run test:unit`
- `npm run test:smoke:runtime-contract`
- `npm run build`
- 必要时：`node scripts/refactor-gate.mjs --smoke-script=test:smoke:runtime-contract`

---

## 本轮增量（第57批）

### 1) placement diagnostics 友好导出落地：摘要白名单 + 失败场景门控 + 可选截断

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增 `resolveSecondaryTimerPlacementDiagnosticsPayload(manager, options)`；
  - 新增配套 helper：
    - `resolveSecondaryTimerPlacementDiagnosticMaxDedupeKeys`
    - `resolveSecondaryTimerPlacementDiagnosticsOptions`
    - `createSecondaryTimerPlacementDiagnosticsPayload`
    - `shouldIncludeSecondaryTimerPlacementDiagnostics`
    - `appendSecondaryTimerPlacementDiagnosticDedupeKeySamples`
  - 诊断输出字段采用白名单：`totalDescriptors / validPlacementDescriptors / placed / skippedDuplicate / skippedMissingAnchor / dedupeKeyKinds / rowIdStrategyHits / parentChildStrategyHits / rowReferenceStrategyHits`。
- 行为约束：
  - 默认 `failureOnly=true`，且仅在 `options.failed===true` 时输出；
  - 默认无活动（`validPlacementDescriptors=0`）不输出，可通过 `includeWhenNoActivity=true` 放开；
  - `maxDedupeKeys` 归一化并上限 `20`，样本输出格式为 `"<dedupeKey>#<count>"`。
- 效果：
  - diagnostics 消费侧拿到稳定、低噪音、可裁剪的 payload；
  - 常态成功路径不产生日志噪音，失败路径具备最小可定位信息。

### 2) 单测补齐（payload 门控 + 样本截断 + 无活动开关）

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - 新增 `returns null diagnostics payload by default when failure flag is not set`
  - 新增 `returns whitelisted diagnostics payload with optional dedupe key samples`
  - 新增 `can include zero-activity diagnostics payload when explicitly requested`

### 3) 风险控制结论

- 本批为可观测性导出能力增强，不改 placement 主流程和业务语义；
- 通过白名单字段与失败场景门控，降低 diagnostics 接入阶段误用完整快照带来的日志噪音风险。

结论：第57批完成了 diagnostics 友好导出的核心契约，可作为后续 diagnostics-index 对接的稳定输入。

---

## 本轮增量（第58批）

### 1) diagnostics-index 预接入字段：稳定 key + schemaVersion 封装

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 新增常量：
    - `SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_KEY = "secondaryTimerPlacement"`
    - `SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_SCHEMA_VERSION = 1`
  - 新增 `resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager, options)`：
    - 在 payload 可用时返回 `{ key, schemaVersion, payload }`；
    - payload 不可用时返回 `null`。
- 效果：
  - 为后续 diagnostics-index 汇总接入提供稳定命名与版本锚点；
  - 保持现有调用路径兼容，不影响已有逻辑。

### 2) 质量收敛：dedupe 样本组装函数降复杂度

- 文件：`js/core_game_manager_base_helpers_runtime.js`
- 改动：
  - 拆分 `appendSecondaryTimerPlacementDiagnosticDedupeKeySamples` 为三段 helper：
    - `collectSecondaryTimerPlacementDiagnosticDedupeEntries`
    - `sortSecondaryTimerPlacementDiagnosticDedupeEntries`
    - `createSecondaryTimerPlacementDiagnosticDedupeKeySamples`
- 效果：
  - `audit:quality` 的复杂度告警从 `1` 回落至 `0`；
  - 保持行为不变，提升函数可维护性。

### 3) 单测补齐（index entry 契约）

- 文件：`tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 覆盖点：
  - 新增 `returns diagnostics index entry with stable key and schemaVersion`
  - 新增 `returns null diagnostics index entry when payload is excluded`

### 4) 风险控制结论

- 本批为对接预备字段与复杂度收敛，不改变业务行为；
- 新增契约测试锁定 `key/schemaVersion/payload` 结构，避免后续汇总接入时字段漂移。

结论：第58批后，diagnostics payload 已具备“可直接汇总”的结构化入口，并维持质量门禁全绿。

---

## 第58批验证证据（2026-03-19）

- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 806 tests` 全通过。
- `npm run audit:quality`
  - PASS：`issues=0`、`complexity=0`、`coupling=0`、`duplicateAdvisoryFiles=0`、`duplicateAdvisoryBlocks=0`（`Trend snapshot: 50 runs kept`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- `npm run report:refactor-progress`
  - PASS：`output_tail_lines: 80`、`tail_lines_band: balanced`、`runs kept: 9`。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第58批后，diagnostics 预接入能力已落地并通过基线验证，门禁保持全绿。

---

## 接下来需要做的工作（第58批后更新）

1. 将 `resolveSecondaryTimerPlacementDiagnosticsIndexEntry` 接入实际 diagnostics 汇总出口
   - 目标：在不引入常态噪音的前提下，仅失败场景收集该 entry 并进入统一索引。
2. 为 diagnostics 汇总出口补一层集成测试
   - 目标：验证 `key/schemaVersion/payload` 在汇总链路中的透传与空值过滤行为。
3. 持续观察 `REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 的真实 CI 稳定性
   - 目标：继续观察 2~3 次 CI，确认 `tail_lines_band` 维持 `balanced`；若连续出现 `low` 再评估回调。
4. 维持每批基线巡检（不变）
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`

---

## 本轮增量（第60批）

### 1) 历史链路保留 diagnostics entries：LocalHistoryStore 入库归一化

- 文件：`js/local_history_store.js`
- 改动：
  - 新增 `normalizeDiagnosticsIndexEntry`；
  - 新增 `normalizeDiagnosticsIndexEntries`；
  - `normalizeRecord` 新增字段透传：
    - `diagnostics_index_entries: normalizeDiagnosticsIndexEntries(raw.diagnostics_index_entries)`。
- 效果：
  - `saveRecord/importRecords` 路径不再丢弃 diagnostics 汇总字段；
  - 历史页面读取记录时可稳定拿到结构化 diagnostics entries。

### 2) 历史页消费点落地：secondary placement 只读摘要展示

- 文件：`js/history_page.js`
- 改动：
  - 新增 diagnostics 解析与展示 helper：
    - `normalizeHistoryDiagnosticsIndexEntry`
    - `normalizeHistoryDiagnosticsIndexEntries`
    - `resolveHistorySecondaryPlacementDiagnosticsEntry`
    - `buildHistorySecondaryPlacementDiagnosticsSummaryText`
    - `appendHistoryDiagnosticsSummary`
  - `renderList` 中为每条记录追加只读诊断块（命中 `secondaryTimerPlacement` 时展示）；
  - 支持可选样本行（`dedupeKeySamples` 最多展示 3 条）。
- 展示策略：
  - 仅展示白名单摘要数值（有效/放置/去重跳过/锚点缺失/去重键类）；
  - 不改历史页主流程，不影响回放/导出/删除按钮行为。

### 3) 历史页样式补齐

- 文件：`style/main.css`
- 改动：
  - 新增 `.history-item-diagnostics`
  - 新增 `.history-item-diagnostics-samples`
- 效果：
  - 诊断摘要以低干扰样式展示，移动端换行可读性可控。

### 4) smoke 覆盖补齐（端到端消费验证）

- 文件：`tests/smoke/history-records-view-models.smoke.spec.ts`
- 改动：
  - 测试注入记录新增 `diagnostics_index_entries`；
  - `renders record head and final board` 用例补充断言：
    - `.history-item-diagnostics` 包含 `secondaryTimerPlacement`
    - `.history-item-diagnostics` 包含 `有效 3`

### 5) 风险控制结论

- 本批为展示层与存储归一化增强，不改变核心对局逻辑；
- 通过端到端 smoke 锁定“记录写入 -> 历史页渲染”链路，降低后续 diagnostics 字段回归风险。

结论：第60批完成了 `diagnostics_index_entries` 的首个真实消费点，历史页已可只读观测 secondary placement 诊断摘要。

---

## 第60批验证证据（2026-03-19）

- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-models.smoke.spec.ts`
  - PASS：`3 passed`（历史页诊断摘要展示链路通过）。
- `npm run audit:quality`
  - PASS：`issues=0`、`complexity=0`、`coupling=0`、`duplicateAdvisoryFiles=0`、`duplicateAdvisoryBlocks=0`。
- `npm run test:unit`
  - PASS：`138 files / 809 tests` 全通过。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- `npm run report:refactor-progress`
  - PASS：`output_tail_lines: 80`、`tail_lines_band: balanced`、`runs kept: 11`。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第60批后，diagnostics entries 已在历史页形成可观测闭环，门禁保持全绿。

---

## 接下来需要做的工作（第60批后更新）

1. 增加 `diagnostics_index_entries` 体积约束
   - 目标：为 entry 数量与样本长度设置统一上限（含导入/导出路径），防止极端 payload 膨胀。
2. 补充 diagnostics entries 的导入导出回归用例
   - 目标：验证 `exportRecords/importRecords` 后 diagnostics 字段不丢失、不畸形。
3. 评估是否在 replay 页面增加只读 diagnostics 面板
   - 目标：当 `local_history_id` 打开记录时，复用同一摘要字段，保持跨页一致性。
4. 持续观察 CI tail-lines 稳定性
   - 目标：继续观察 2~3 次真实 CI，确认 `REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 的 triage 信号稳定。
5. 维持每批基线巡检（不变）
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`

---

## 本轮增量（第59批）

### 1) diagnostics 汇总出口落地：接入 saved-state payload

- 文件：`js/core_game_manager_saved_state_helpers_runtime.js`
- 改动：
  - 新增 `buildSavedGameStateDiagnosticsPayload(manager)`，统一产出：
    - `diagnostics_index_entries`
  - 新增 secondary placement entry 解析链路：
    - `createSavedStateDiagnosticsIndexEntryOptions`
    - `resolveSavedStateSecondaryPlacementDiagnosticsEntry`
    - `isSavedStateDiagnosticsIndexEntry`
    - `normalizeSavedStateDiagnosticsIndexEntries`
  - `buildSavedGameStatePayload` 现已并入 diagnostics 段：
    - `diagnostics_index_entries`
- 接入策略：
  - 优先调用 `manager.resolveSecondaryTimerPlacementDiagnosticsIndexEntry(options)`；
  - 若 manager 未挂载该方法，则回退调用全局 `resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager, options)`（若存在）；
  - 统一以固定 options 采集：
    - `failureOnly=false`
    - `includeWhenNoActivity=false`
    - `maxDedupeKeys=3`

### 2) lite payload 同步透传 diagnostics entries

- 文件：`js/core_game_manager_saved_state_helpers_runtime.js`
- 改动：
  - 新增 `buildLiteSavedGameStateDiagnosticsPayload(payload)`；
  - `buildLiteSavedGameStatePayloadFallback` 现同步包含：
    - `diagnostics_index_entries`
- 效果：
  - 即便 full payload 回退到 lite，diagnostics 汇总入口字段仍可保留。

### 3) 单测补齐（saved-state 汇总出口）

- 文件：`tests/unit/core-game-manager-saved-state-runtime.spec.ts`
- 覆盖点：
  - 新增 `builds diagnostics index entries from manager helper with stable options`
  - 新增 `falls back to global diagnostics entry resolver when manager helper is unavailable`
  - 新增 `includes diagnostics index entries in full and lite saved payloads`
  - `loadSavedStateRuntime` 增加 `extraContext` 注入能力，便于验证全局回退路径。

### 4) 风险控制结论

- 本批仅新增 diagnostics 汇总字段，不影响棋盘恢复、计分、回放等主业务逻辑；
- 通过 full/lite 双链路与 manager/global 双入口测试，降低后续 diagnostics 汇总接入漂移风险。

结论：第59批已将 `resolveSecondaryTimerPlacementDiagnosticsIndexEntry` 接入“实际可落盘的汇总出口”（saved-state payload），并完成回归验证。

---

## 第59批验证证据（2026-03-19）

- `npm run test:unit -- tests/unit/core-game-manager-saved-state-runtime.spec.ts`
  - PASS（全量执行）：`138 files / 809 tests` 全通过。
- `npm run audit:quality`
  - PASS：`issues=0`、`complexity=0`、`coupling=0`、`duplicateAdvisoryFiles=0`、`duplicateAdvisoryBlocks=0`（`Trend snapshot: 50 runs kept`）。
- `npm run test:smoke:runtime-contract`
  - PASS：`8 passed`（Playwright runtime contract）。
- `npm run build`
  - PASS：`tsc && vite build` 成功。
- `npm run report:refactor-progress`
  - PASS：`output_tail_lines: 80`、`tail_lines_band: balanced`、`runs kept: 10`。
- `npm run verify:release-ready`
  - PASS：`stable docs + scripts + smoke sharding + gate parameterization verified`。
- 说明：
  - 本轮 smoke 为无头运行，未启动可见浏览器窗口。

结论：第59批后，secondary placement diagnostics 已具备可持久化汇总出口，门禁保持全绿。

---

## 接下来需要做的工作（第59批后更新）

1. 为 `diagnostics_index_entries` 增加端到端消费点
   - 目标：在历史记录/调试页提供只读展示，验证 entry 结构在真实用户路径可观测。
2. 增加 diagnostics entries 的体积约束策略
   - 目标：为 `diagnostics_index_entries` 设置数量上限与可选裁剪规则，防止极端场景 payload 膨胀。
3. 保持 CI tail-lines 观察窗口
   - 目标：继续观察 2~3 次真实 CI，确认 `REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 的 triage 信号稳定。
4. 维持每批基线巡检（不变）
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`

---

## 本轮增量（第61批）

### 1) diagnostics entries 体积约束落地（入库归一化层）

- 文件：`js/local_history_store.js`
- 改动：
  - 新增上限常量：
    - `MAX_DIAGNOSTICS_INDEX_ENTRIES = 6`
    - `MAX_DIAGNOSTIC_PAYLOAD_KEYS = 24`
    - `MAX_DIAGNOSTIC_STRING_LENGTH = 160`
    - `MAX_DIAGNOSTIC_ARRAY_ITEMS = 8`
  - 新增 payload 归一化/截断 helper：
    - `truncateDiagnosticText`
    - `normalizeDiagnosticPayloadValue`
    - `normalizeDiagnosticPayloadArrayValue`
    - `normalizeDiagnosticPayloadArray`
    - `normalizeDiagnosticPayload`
  - `normalizeDiagnosticsIndexEntry` 与 `normalizeDiagnosticsIndexEntries` 增强为“字段归一 + 数量裁剪”。
  - `normalizeRecord` 继续透传并归一 `diagnostics_index_entries`。
- 效果：
  - `saveRecord/importRecords` 链路均受同一上限约束；
  - 防止极端 diagnostics payload 造成本地记录体积膨胀。

### 2) 风险控制结论

- 本批仅限数据归一化与裁剪策略，不改变核心对局与回放行为；
- 约束位于存储入口，兼容现有 history/replay 消费端。

结论：第61批完成了 `diagnostics_index_entries` 的体积治理底座。

---

## 本轮增量（第62批）

### 1) import/export 回归覆盖补齐（diagnostics entries）

- 文件：
  - `tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - `tests/smoke/history-records-import-core.smoke.spec.ts`
- 改动：
  - 导出用例新增 diagnostics 记录注入，并断言导出文本包含 `secondaryTimerPlacement`。
  - 导入（merge）用例注入超限 payload，断言归一化结果：
    - entry 数量裁剪为 `6`
    - 文本裁剪为 `160`
    - 数组样本裁剪为 `8`
  - 导入（replace）用例断言 diagnostics key 保留且结构可读。
- 效果：
  - 锁定 `exportRecords/importRecords` 在 diagnostics 字段上的不丢失与不畸形。

### 2) 风险控制结论

- 本批为 smoke 回归补齐，不改业务代码路径；
- 通过 merge/replace 双路径约束，降低后续导入导出回归风险。

结论：第62批完成了 diagnostics entries 在导入导出链路的端到端回归兜底。

---

## 本轮增量（第63批）

### 1) replay 页只读 diagnostics 面板落地

- 文件：
  - `replay.html`
  - `style/main.css`
  - `js/replay_ui.js`
- 改动：
  - `replay.html` 新增面板节点：
    - `#replay-diagnostics-panel`
    - `#replay-diagnostics-summary`
    - `#replay-diagnostics-samples`
  - `style/main.css` 新增面板样式：
    - `.replay-diagnostics-panel`
    - `.replay-diagnostics-summary`
    - `.replay-diagnostics-samples`
  - `js/replay_ui.js` 新增解析与渲染 helper，支持：
    - 从 local history record 读取 `secondaryTimerPlacement` diagnostics entry；
    - 在 `local_history_id` 回放路径渲染摘要与样本；
    - 非命中路径/报错路径自动清空面板，保持只读与低噪音。
- 效果：
  - history 与 replay 页在同一 diagnostics 摘要字段上实现跨页一致观测；
  - 不影响回放控制主流程。

### 2) 风险控制结论

- 本批是展示层增强，不改 replay 业务状态机；
- 通过 smoke 用例锁定本地记录回放下的 diagnostics 展示行为。

结论：第63批完成 replay 页 diagnostics 只读消费点，至此“第60批后剩余三批”全部完成。

---

## 第61-63批验证证据（2026-03-19）

- 定向 smoke：
  - `npx playwright test --config=playwright.config.ts tests/smoke/history-records-import-core.smoke.spec.ts`
    - PASS：`2 passed`
  - `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
    - PASS：`1 passed`
  - `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-models.smoke.spec.ts`
    - PASS：`3 passed`
  - `npx playwright test --config=playwright.config.ts tests/smoke/pages-replay-runtime.smoke.spec.ts`
    - PASS：`15 passed`
- 基线门禁：
  - `npm run audit:quality` -> PASS（`issues=0`、`complexity=0`、`coupling=0`）
  - `npm run test:unit` -> PASS（`138 files / 809 tests`）
  - `npm run test:smoke:runtime-contract` -> PASS（`8 passed`）
  - `npm run build` -> PASS（`tsc && vite build`）
  - `npm run report:refactor-progress` -> PASS（`output_tail_lines: 80`、`tail_lines_band: balanced`、`runs kept: 12`）
  - `npm run verify:release-ready` -> PASS
- 说明：
  - 本轮 smoke 均为无头运行，未启动可见浏览器窗口。

结论：第61-63批完成后，清单中“需改代码”的剩余项已清零，门禁保持全绿。

---

## 接下来需要做的工作（第63批后更新）

1. 持续观察 CI tail-lines 稳定性（非代码改动）
   - 目标：继续观察 2~3 次真实 CI，确认 `REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 的 triage 信号持续稳定。
2. 维持每批基线巡检（例行）
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`
3. 可选增量（按需，不是当前清单必做）
   - 若后续新增 diagnostics key，沿用第61批体积约束与第62/63批回归模板扩展测试与展示。

## 本轮增量（第64批）

### 1) WS2-02 收尾：import/export 写入口统一
- 文件：
  - `js/core_game_manager_runtime_call_helpers_runtime.js`
  - `js/core_game_manager_bindings_runtime.js`
  - `js/core_game_manager_replay_helpers_runtime.js`
- 改动：
  - 新增 replay/import/export 相关统一写入口：
    - `setRuntimeReplayMoves`
    - `setRuntimeReplaySpawns`
    - `setRuntimeReplayMovesV2`
    - `setRuntimeUndoEnabled`
    - `setRuntimeDisableSessionSync`
    - `setRuntimeReplayDelay`
  - 将 replay import/export 链路中的关键直接赋值迁移为统一写入口调用。
- 效果：
  - import/export 与 replay 主链路关键状态写入实现一致化，降低后续重构回归风险。

### 2) 验证证据（2026-03-21）
- `npm run verify:prepush`
  - PASS：
    - game-manager-audit
    - entry-manifest-audit
    - legacy-boundary-audit
    - engine-audit
    - unit
    - smoke
    - build

### 3) 风险控制结论
- 本批以“写入口统一”为主，行为语义保持不变，未引入新功能分支。
- 当前残余风险在于：规则已落地到代码，但尚未全部固化为自动审计项。

### 4) 接下来需要做的工作（明确）
1. WS3-01：完成 replay/import/export 的 contracts 覆盖矩阵（字段、来源、消费方、断言）。
2. WS8-01：新增“关键状态写入不得绕过 runtime helper”的审计脚本并接入 CI 门禁。
3. 增补聚焦回归：账号中心/本地历史/回放页的 smoke 契约场景，形成 F sign-off 证据。

## 本轮增量（第65批）

### 1) WS8-01：写入边界门禁首批落地（replay/import/export）
- 文件：
  - `scripts/game-manager-audit.mjs`
  - `tests/unit/game-manager-audit-helpers.spec.ts`
- 改动：
  - 新增 replay 关键字段写入边界审计规则；
  - 仅允许以下字段在 `setRuntime*ForReplay` 包装函数内赋值：
    - `replayIndex`
    - `replayMoves`
    - `replaySpawns`
    - `replayMovesV2`
    - `undoEnabled`
    - `disableSessionSync`
    - `replayDelay`
  - 一旦检测到绕过写入，`game-manager-audit` 直接失败阻断。

### 2) 验证证据（2026-03-21）
- `npm run test:unit -- tests/unit/game-manager-audit-helpers.spec.ts`
  - PASS（全量 unit：139 files / 820 tests）
- `npm run verify:prepush`
  - PASS（audit/unit/smoke/build 全通过）

### 3) 风险控制结论
- 当前门禁已经覆盖 replay/import/export 主链路高频写点，能有效防止回流直接赋值。
- 剩余风险是覆盖面：saved-state/session-init 等模块尚待补齐同类规则。

### 4) 接下来需要做的工作（明确）
1. WS3-01：完成 replay/import/export contracts 矩阵与断言。
2. WS8-01：把写入边界审计扩展到 saved-state/session-init。
3. 联动 smoke 契约用例，形成完整发布级证据链。

## 本轮增量（第66批）

### 1) WS3-01 首批落地：contracts 覆盖矩阵 + 最小断言
- 文件：
  - `src/contracts/index.ts`
  - `tests/unit/contracts.spec.ts`
  - `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`
- 改动：
  - 增加 replay/import/export 的必填字段常量与运行时最小校验函数；
  - 增加统一矩阵常量，集中声明字段、生产方、消费方、断言位置；
  - 增补 unit 正反用例，确保矩阵与字段约束可执行。

### 2) 验证证据（2026-03-21）
- `npx vitest run tests/unit/contracts.spec.ts`
  - PASS（1 file / 26 tests）
- `npm run verify:prepush`
  - PASS（audit/unit/smoke/build 全通过）

### 3) 风险控制结论
- 本批把“contracts 覆盖矩阵”从文档目标转为代码常量 + 单测断言，减少口头约定风险。
- 仍需扩展范围（saved-state/session-init）并纳入 gate，才能形成完整闭环。

### 4) 接下来需要做的工作（明确）
1. 扩展矩阵覆盖到 saved-state/session-init。
2. 把矩阵完整性校验接入 CI gate。
3. 增补 matrix 映射到 smoke 的回归用例。

## 本轮增量（第67批）

### 1) gate 联动：contracts-matrix-audit 落地
- 文件：
  - `scripts/contracts-matrix-audit.mjs`
  - `scripts/refactor-gate.mjs`
  - `scripts/refactor-timeout-env-keys.mjs`
  - `scripts/release-readiness-check.mjs`
  - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - `tests/unit/refactor-timeout-env-keys.spec.ts`
  - `tests/unit/release-readiness-check-helpers.spec.ts`
- 改动：
  - 新增 contracts 矩阵审计脚本；
  - 接入 refactor gate 执行链；
  - 补 timeout env 映射；
  - 补 release-ready 强约束；
  - 补辅助单测防回退。

### 2) 验证证据（2026-03-21）
- `node scripts/contracts-matrix-audit.mjs` -> PASS
- `npm run verify:release-ready` -> PASS
- `npm run verify:prepush` -> PASS（含 contracts-matrix-audit）

### 3) 风险控制结论
- contracts 矩阵已进入 CI 阻断链路，回退风险明显降低。
- 仍需扩展覆盖范围至 saved-state/session-init，当前属于“首批可用，不是最终闭环”。

### 4) 接下来需要做的工作（明确）
1. 扩展矩阵 + 审计到 saved-state/session-init。
2. 增补对应 smoke 契约场景并沉淀 F sign-off。
3. 评估 WS3-01 / WS8-01 的 done 条件并准备收口。

## 本轮增量（第68批）

### 1) contracts 矩阵扩展到 saved-state/session-init
- 文件：
  - `src/contracts/index.ts`
  - `src/bootstrap/play-startup-payload.ts`
  - `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`
- 改动：
  - 新增 `SavedGameStatePayload` / `SessionInitPayload` 合同；
  - 新增对应必填字段常量与最小校验函数；
  - 矩阵从 3 行扩展到 5 行，并保持兼容别名导出。

### 2) gate 同步与校验增强
- 文件：
  - `scripts/contracts-matrix-audit.mjs`
  - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - `tests/unit/contracts.spec.ts`
- 改动：
  - 审计脚本支持解析 `CORE_CONTRACT_COVERAGE_MATRIX`；
  - 强校验合同行数与每行字段完整性；
  - 单测覆盖新合同行与新校验函数。

### 3) 验证证据（2026-03-21）
- `node scripts/contracts-matrix-audit.mjs` -> PASS
- `npm run verify:release-ready` -> PASS
- `npm run verify:prepush` -> PASS（含 contracts-matrix-audit）

### 4) 风险控制结论
- 目前 contracts 矩阵覆盖已扩展到 saved-state/session-init，结构漂移风险进一步下降。
- 下一阶段主要风险是“缺少端到端 smoke 证据”，需补齐后再做 WS3/WS8 收口。

### 5) 接下来需要做的工作（明确）
1. 增补 saved-state/session-init 的 smoke 契约场景。
2. 审计脚本增加 assertions 路径存在性检查。
3. 整理 F sign-off 证据并评估 WS3/WS8 完成条件。
