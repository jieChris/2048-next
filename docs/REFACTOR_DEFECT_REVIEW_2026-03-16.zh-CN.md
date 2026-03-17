# 重构遗留缺陷审查报告（滚动修订，2026-03-16）

> 审查目标：持续识别“重构未收口”导致的真实缺陷与工程风险，并按优先级小步推进。

## 审查结论（当前状态）

当前仓库处于**可构建、单测稳定、门禁可通过**状态；历史审查项中：

- **P0（smoke 前置 / baseline 漂移）已完成**。
- **P1（入口治理、Engine 状态化）已完成阶段性收口**。
- **P2（GameManager runtime helper 复杂度热点）正在持续消减**。

本次滚动修订后，`audit:quality` 复杂度告警已从早期 19 条下降到 **16 条**（非阻断）。

---

## 按推荐顺序推进结果

### 1) P1：入口 manifest 关键缺口（已完成）

已完成事项：

- `play/replay` 入口已切换至 `bootstrapHomeFamilyPage("play"|"replay")`。
- `entry-manifest-audit` 已覆盖：
  - 入口不允许回退为手工 legacy 导入；
  - capability 映射校验；
  - play/replay 关键脚本顺序锚点校验；
  - import/export 顺序一致性校验。
- `verify:refactor` 已纳入该审计，门禁可阻断回退。

结论：该问题从“结构性缺口”转为“门禁可控”。

### 2) P1/P2：Engine 状态化 API（已完成阶段目标）

已完成事项：

- `src/core/engine.ts` 已从纯 re-export/facade 发展到 `createEngineSession(config)`：
  - 生命周期：`init/load/move/undo/replay/importReplay/exportState/getState`；
  - 增加快照版本校验、棋盘形状校验、state patch sanitize、undo 恢复 sanitize；
  - 保留 `createEngineFacade()` 兼容调用路径。
- 单测已覆盖：
  - facade 映射与可调用性；
  - session happy-path 生命周期；
  - snapshot 版本/board shape 异常路径。

结论：Engine 已具备“可实例化 + 有边界校验”的状态容器雏形。下一阶段可考虑把更多页面编排逻辑迁入该边界（非本轮强制项）。

### 3) P2：复杂度热点批次拆分（持续推进中）

本轮新增推进：

- 已先后完成两批“低风险拆分”：
  1. `core_game_manager_stats_ui_helpers_runtime.js`：
     - `resolveStatsPanelVisibilityKey` 拆分为路径/属性/去重/parts 组装小函数；
  2. `core_game_manager_mode_rules_helpers_runtime.js`：
     - `normalizeStoneCellsList` 抽取 candidate 解析与边界校验；
     - `normalizeItemModeRulesForManager` 抽取正整数配置读取逻辑。

结果：

- `audit:quality` 复杂度告警由 **19 → 18 → 16**。
- `core_game_manager_mode_rules_helpers_runtime.js` 相关复杂度告警已清除。

仍需关注的热点（当前 Top）：

1. `core_game_manager_setup_timer_ui_helpers_runtime.js`
   - `normalizeLegacyTimerRowsForSetup()` = 32
   - `hideUnsupportedTimerRowsForSetup()` = 29
2. `core_game_manager_base_helpers_runtime.js`
   - 多个函数 13~17，且伴随重复块告警
3. `core_game_manager_saved_state_helpers_runtime.js`
   - `setBoardFromMatrix` / timer rows 收集函数仍偏高

---

## 当前风险面评估

### A. 功能正确性风险

- 低：门禁（unit + smoke + build + entry audit）可持续通过。

### B. 可维护性风险

- 中：复杂度热点仍集中在少数 runtime helper 文件，后续改动仍存在“牵一发而动全身”风险。

### C. 迭代效率风险

- 中：若不继续拆分 `setup_timer_ui` / `base_helpers` 热点，后续需求改动回归成本会持续偏高。

---

## 下一阶段建议（可执行）

> 维持“小批次 + 可验证 + 可回滚”原则，每批 2~3 个函数。

### 批次建议 A（优先）

- 目标文件：`core_game_manager_setup_timer_ui_helpers_runtime.js`
- 目标函数：
  - `normalizeLegacyTimerRowsForSetup`
  - `hideUnsupportedTimerRowsForSetup`
- 策略：先提取“输入解析/过滤规则/DOM 决策”纯函数，再收敛主流程条件分支。

### 批次建议 B

- 目标文件：`core_game_manager_base_helpers_runtime.js`
- 目标函数：
  - `bindSecondaryTimerToggleTarget`
  - `resolveSecondaryTimerParentAnchor`
- 策略：把判定分支与 DOM 选择器决策拆分为 helper，减少单函数路径数。

### 每批验证基线（保持不变）

- `npm run audit:quality`
- `npm run test:unit`
- `npm run build`
- 必要时：`node scripts/refactor-gate.mjs --smoke-script=test:smoke:runtime-contract`

---

## 本次滚动修订执行命令

- `npm run audit:quality`
- `npm run test:unit`
- `npm run build`

