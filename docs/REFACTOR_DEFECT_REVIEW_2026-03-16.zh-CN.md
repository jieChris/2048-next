# 重构遗留缺陷审查报告（2026-03-16）

> 审查目标：识别“重构未收口”导致的真实缺陷与工程风险，优先关注会影响后续迭代效率/可靠性的问题。

## 审查结论（摘要）

当前仓库主线可构建、单测稳定；截至本次修订，P0 已完成，P1/P2 仍有收口空间。当前仍需关注 3 个核心问题：

1. **入口脚本治理只完成一半**（home-family 使用 manifest，而 `play/replay` 仍是超长手工数组）。
2. **GameManager runtime helper 的复杂度热点集中且持续存在**（质量审计仍有多条非阻断告警）。
3. **Engine 统一入口仍需继续向“状态化 API”演进**（本次已补齐 facade，可统一调用，但尚未承载完整状态生命周期）。

---


## 本次修订执行结果（2026-03-16，增量）

### 已执行改进

1. **Engine 边界（P1）已推进一阶段**
   - 在 `src/core/engine.ts` 新增 `createEngineFacade()` 与 `EngineFacade`，把 move/post-move/scoring/undo/replay/import/codec/grid-scan 能力聚合为统一可调用面。
   - 新增对应单元测试，确保 facade 与底层纯函数映射一致、可直接调用。

2. **smoke 稳定性（P0 延续）继续收敛**
   - 对高频波动用例改为“就绪条件等待 + 防抖断言”，避免初始化顺序带来的误报。
   - `test:smoke` 以单 worker 运行，`verify:refactor` 在当前环境下可稳定通过。

### 仍待推进

- **P1**：为 play/replay 增加顺序约束与回退防护（门禁化审计）。
- **P2**：按质量审计热点拆分 GameManager helper（建议每批 2~4 个函数，配套 unit/smoke 子集）。


## 详细问题

### 1) Engine 仍是“壳层”，核心边界没有真正收敛

- 证据：`src/core/engine.ts` 当前仅包含类型定义和对其他模块函数的 re-export，未提供统一状态容器/命令入口。  
- 影响：
  - 页面层/运行时仍需拼装多个能力点，难以形成一致调用路径。
  - 后续迁移中，行为回归验证成本持续偏高（因为不是单入口对照）。
- 建议（P1）：
  - 将 `engine.ts` 提升为“可实例化 + 明确生命周期”的统一 API（`init/load/move/undo/replay/import/export`）。
  - 把跨模块拼装逻辑从页面或 runtime helper 回收到 engine facade。

### 2) 入口 manifest 改造未覆盖关键页面（play/replay）

- 证据：
  - `src/entries/runtime-manifest.ts` 已定义页面 capability 与校验逻辑；
  - `src/entries/home-family-bootstrap.ts` 已通过 `getPageManifest` 驱动加载；
  - `play/replay` 已切换到 `bootstrapHomeFamilyPage`，脚本列表已模块化并接入 capability 映射；剩余缺口是“顺序约束/残留手工入口”的自动化门禁。
- 影响：
  - 入口收敛已显著改善，但缺少自动化审计时仍可能回退到手工入口。
  - 若无门禁，后续迭代中 capability 与入口实现仍可能漂移。
- 建议（P1/P3）：
  - 为 play/replay 增加顺序约束校验（或快照审计），确保关键 runtime 依赖顺序不会漂移。
  - 将“entry 中手工加载残留检测”纳入 `verify:refactor` 门禁。

### 3) Runtime helper 复杂度热点仍集中在 GameManager 相关模块

- 证据：`npm run audit:quality` 给出 19 条复杂度告警，热点集中在：
  - `core_game_manager_base_helpers_runtime.js`
  - `core_game_manager_saved_state_helpers_runtime.js`
  - `core_game_manager_setup_timer_ui_helpers_runtime.js`
  - `core_game_manager_stats_ui_helpers_runtime.js`
  - `core_game_manager_undo_stats_helpers_runtime.js`
- 影响：
  - 回归改动的连带风险高，定位成本高。
  - 规则门禁虽通过，但“可维护性债务”持续累积。
- 建议（P2）：
  - 先按“高复杂度函数清单”做拆分批次（每批只降 2~4 个函数复杂度）。
  - 每次拆分绑定对应 unit/smoke 子集，避免一次性大改造成验证盲区。

### 4) 冒烟门禁在新环境可重复失败（已完成）

- 证据：
  - `README.md` 仅给出 `npm run test:smoke`，未提示 Playwright 浏览器安装前置；
  - 实际运行时在未安装浏览器的环境会直接报 `Executable doesn't exist ...`。
- 影响：
  - `verify:refactor` 出现与业务无关的假失败，降低门禁信号可信度。
  - 新成员/新 CI 机器首轮验证体验差。
- 建议（P0）：
  - 在 README 与 CI 初始化步骤中明确增加 `npx playwright install --with-deps chromium`（或项目约定变体）。
  - 在门禁脚本中对“浏览器未安装”给出更可操作的诊断提示。

### 5) 基线报告有陈旧结论，和当前构建结果不一致（已完成）

- 证据：
  - `docs/baseline/complexity-report.md` 仍记载 `favicon/logo 844KB`、`dist 8.4MB over budget`；
  - 当前 `npm run build` 输出里对应 SVG 约 66KB，`npm run audit:resource-budget` 为 PASS。
- 影响：
  - 任务优先级可能被过时数据牵引，影响迭代投入产出比。
- 建议（P0）：
  - 增加 baseline 文档“自动更新时间戳 + 数据来源命令”字段。
  - 将资源体积基线改为脚本自动生成，避免手工复制导致漂移。

---

## 优先级建议（执行顺序）

1. **P1：补齐入口 manifest 的关键缺口**（问题 2：play/replay 已推进，下一步统一顺序约束校验）
2. **P1/P2：继续推进 Engine 状态化 API**（问题 1：在 facade 基础上补生命周期能力）
3. **P2：按热点批次拆解 runtime helper 复杂度**（问题 3）

---

## 本次审查执行命令

- `npm run report:refactor-progress`
- `npm run verify:refactor`
- `npx playwright test tests/smoke/pages-runtime-contract.smoke.spec.ts --config=playwright.config.ts --workers=1`
- `npm run audit:quality`
- `npm run build`
- `npm run audit:resource-budget`

