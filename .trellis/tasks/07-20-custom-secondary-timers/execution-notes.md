# 执行记录

## Route Deviation

- 仓库存在 `.trellis/spec` 与 `.trellis/tasks`，但缺少技能约定的 `.trellis/scripts/task.py` 和 `.trellis/scripts/get_context.py`，无法执行标准任务创建与包上下文命令。采用最保守回退：按现有任务目录格式手工创建本任务，并直接完整读取 `.trellis/spec/index.md`、`cross-repo-architecture.md`、`frontend-api-boundary.md` 后继续。
- 两组 Playwright 验证最初并行启动时争用 `4173` 端口；未修改测试配置，改用最保守的串行重跑并全部通过。
- 仓库没有 `src/templates/markdown/spec/`，且共享 `.trellis/spec/smoke-testing.md` 正处于未跟踪的并行改动中；为避免覆盖用户工作，采用保守回退，仅把本次领域契约和回溯分析写入现有任务文档，不创建模板或提交当前脏工作树。

## 调查记录

- 动态子行的现有 DOM、展开、滚动和存档能力可以继续复用；生成来源已由固定 `8192+...` 层级替换为在局自定义规则快照。
- 最可靠的检查点是成功移动完成生成后扫描整盘；只监听合并值会漏掉 `+2`、`+4` 以及可撤回模式后期的高阶直接生成。
- 质量审查发现现代模块入口 `src/bootstrap/game-manager-replay-helpers-runtime.ts` 最初未接入规则快照，已补齐 V1 扩展记录 `5`、V3 JSON 字段及导入恢复闭环。
- 质量审查发现单纯的包含关系会把 `64+32+2` 错标为 `32+2` 精确命中；已收紧为只允许不高于表达式最小项的额外方块，并补充回归测试。
- Fibonacci 的母计时器显示值通过 `timerMilestoneSlotByValue` 映射到固定 DOM 槽位；真实页面验证 `34` 正确映射到 `timer-row-128`，其子行紧邻该槽位。
- 仓库架构文档明确把 `public/js/legacy_index_nomodule_loader.js` 留给独立 legacy-browser policy；本任务保持该边界，现代模块入口覆盖当前页面与 Playwright 验证路径。
- 规则层原有按棋盘尺寸计算计时器槽位的未完成实现可以直接复用；补齐了模式应用接线、显式封顶值、动态 DOM 行和主题同步，未新增第二套计时器模型。
- 母计时器最大值按棋盘理论容量计算：pow2 使用 `2^(width*height+1)`，因此标准 4x4 结束于 `131072`；显式 `max_tile` 只会进一步缩小该列表。
- Fibonacci 母计时器按合成容量生成；通常包含理论终点，4x4 按产品规则结束于理论最大值前一项。
- 模式接线的降级分支不再复制规则层的棋盘容量算法；正常路径统一调用 `CoreRulesRuntime.getTimerSlotIdsForBoard()`，运行时缺失时仅保留默认槽位并应用显式封顶过滤，使 game-manager helper 回到审计上限以内。
- 原 `palette.html` 沿用为分类设置页，入口统一改名为“设置”；自定义子计时器编辑器从游戏设置弹窗移入计时器分类，并使用原生 `details` 默认收起，避免新增页面或折叠状态脚本。
- 设置页按“计时器”和“外观与配色”分组，规则保存继续直接复用 `parseCustomSecondaryTimerRules`、`readCustomSecondaryTimerRuleText` 和 `writeCustomSecondaryTimerRuleText`。
- Fibonacci 编辑状态仍显示 2048 示例的根因是 `textarea` 占位文本写死在 HTML；现改为在既有编辑器同步函数中按规则体系切换，不增加新的状态层。
- 批量推荐规则复用现有 ruleset family 母计时器列表和原生 `select`；生成器只负责产出两层推荐文本，保存、校验与下一局生效仍走原流程。
- 生成器的 2048 母计时器选择范围按产品要求从 10×10 收紧到 5×5，最后一项为 `67108864`；Fibonacci 保持现有 4×4 模式范围。
- 计时器开关仍呈全宽的根因是宿主同步逻辑遗留了内联 `width: 100%`，覆盖共享 `.settings-toggle-row` 的桌面半宽规则；移除该内联值后，移动端仍由现有响应式 CSS 保持全宽。
- 子计时器规则解析和命中已按表达式深度工作，但动态行把规范化完整表达式误用作可见图例；现改为显示末级数值，继续复用原有 `values.length - 1` 动态缩进和完整表达式身份。
- 设置页新增已保存规则预览：直接复用规则解析器、实际计时器 `timertile` 视觉和主题同步，成功保存或切换规则体系时刷新；编辑未保存文本不会改变预览，母计时器默认收起并独立控制其子规则。
- Fibonacci 原容量公式把每个新等级都视为额外占用一格，错误地将 3x3 截在 `144`；按 `1/2` 均可直接生成、相邻数合并的最少占格递推，9 格可达第 18 项 `4181`，下一项 `6765` 至少需要 10 格。
- 真实四方向状态搜索使用合法移动、单步单次合并和移动后生成 `1/2`，找到无撤回 3x3 到 `4181` 的连续可达链；4x4 计时器按产品要求显示到理论最大值 `3524578` 的前一项 `2178309`。
- 练习板原先直接读取理论最大值并保留 4x4 Fibonacci 固定 `1597` 分支，导致摆盘预选块与母计时器终点不一致；现直接复用 `getTimerMilestoneValues()` 的最后一项，四种 Fibonacci 棋盘分别结束于 `1597`、`4181`、`75025`、`2178309`。

## Bug Analysis: Fibonacci 母计时器容量过低

### 1. Root Cause Category
- **Category**: A / D - 规则模型错误与测试固化错误结果。
- **Specific Cause**: 原公式使用 `cells + 2` 作为 Fibonacci 等级，把经典 2048 的单等级占格增长错误套到相邻数合成规则。

### 2. Prevention Mechanisms
- P0：规则层分别断言 4x2、3x3、4x3、4x4 理论值与计时器展示终点；页面 Smoke 断言真实模式中的最后一行和总行数。

### 3. Knowledge Capture
- 理论最大方块与计时器展示终点保持独立：3x3 包含最大值，4x4 按产品规则截在最大值前一项。

## Bug Analysis: 子计时器表达式误作图例

### 1. Root Cause Category
- **Category**: B / D - 跨层契约与测试覆盖缺口。
- **Specific Cause**: 规则层只定义了规范化表达式，渲染层未区分“规则身份”和“当前层显示值”，原 Smoke 只验证命中结果。

### 2. Why Fixes Failed
1. 初版实现：复用了完整表达式，便于唯一标识，但把内部身份直接暴露成图例。

### 3. Prevention Mechanisms
- P0：页面 Smoke 同时断言规则身份、末级图例、完整标题和逐级缩进，已完成。

### 4. Systematic Expansion
- 存档、覆盖来源和规则匹配继续使用完整表达式；只修改可见图例，避免同类显示字段污染数据身份。

### 5. Knowledge Capture
- 已更新本任务 PRD、设计、实施计划和执行记录。

## 验证记录

- `npx tsc --noEmit`：通过。
- 直接相关 8 个单测文件：147 项全部通过。
- `tests/smoke/pages-custom-secondary-timers.smoke.spec.ts`：2 项通过，覆盖整份校验、下一局生效、固定子行移除、精确/越级显示和 Fibonacci DOM 定位。
- legacy JS `node --check`：移动、存档、回放、计时器设置相关 5 个文件全部通过。
- `npm run build`：通过；仅保留仓库已有的 `ui-preview.html` 非 module script 构建提示。
- `npm run verify:iterate`：通过；包含 game-manager audit、96 个核心测试文件/646 项测试、8 项 runtime smoke、37 项玩法与回放 smoke。
- `npm run audit:page-legacy-runtime-boundary`、`npm run audit:entry-manifest`：通过。
- `npm run test:unit`：1814/1815 通过；唯一失败为 `tests/unit/modes-logo-css.spec.ts` 仍断言 `--mode-ink: #ece2d3`，而用户已有的 `modes.html` 视觉改动改为 `var(--app-text-strong)`，与本任务无文件交集，未擅自修改。
- 动态母计时器目标单测：5 个文件、44 项通过；页面 smoke 扩展为 3 项并全部通过，实际覆盖 3x3、4x4、5x5、封顶 64 与 Fibonacci 4x4。
- 母计时器“包含理论终点”校正后的目标单测：4 个文件、36 项通过；自定义计时器页面 smoke：3 项通过，覆盖 4x2、3x3、4x3、4x4、5x5、封顶 64，以及 Fibonacci 4x2/4x3/4x4。
- `npm run audit:game-manager`：通过；`js/core_game_manager_mode_rules_helpers_runtime.js` 为 1196 行，未超过 1200 行上限。
- `npm run build`：通过；仅保留仓库已有的 `ui-preview.html` 非 module script 提示。
- `npm run verify:iterate`：通过；97 个核心测试文件/654 项测试、8 项 runtime smoke、37 项玩法与回放 smoke 全部通过。
- 设置页迁移后的相关单测：5 个文件、50 项通过；自定义计时器与色板页面 smoke：9 项通过，覆盖默认收起、弹窗移除、保存校验、下一局生效、桌面与移动布局及原色板功能。
- 设置页中英文审计目标：2 项通过；全站语言审计另有 5 个既有游戏页英文状态残留中文，与本次设置页文件无交集。
- Playwright CLI 已完成 1200px 桌面、展开态和 390px 窄屏视觉核对；分类、折叠内容与原色板编辑器布局正常。
- Fibonacci 示例修复：目标页面 smoke 1 项通过，`npx tsc --noEmit` 与 `git diff --check` 通过；本地设置页切换后实测占位内容为 `13 / 13+1 / 13+2`。
- 批量生成器目标单测：1 文件、6 项通过；相关自定义计时器与色板 smoke：9 项通过；设置页中英文审计：2 项通过；`npx tsc --noEmit`、`npm run build` 与 `git diff --check` 通过。
- 应用内浏览器实测 `32～64` 生成两个分组且未自动保存；390px 窄屏下生成器宽 316px、页面 `scrollWidth` 为 390px，无横向溢出。
- 5×5 上限收紧回归：目标页面 smoke 1 项通过，确认存在 `67108864` 且不存在 `134217728`；`npx tsc --noEmit` 与 `git diff --check` 通过。
- 计时器开关尺寸恢复：宿主单测 10 项、目标设置页 smoke 1 项通过，`npx tsc --noEmit`、runtime `node --check` 与 `git diff --check` 通过；应用内浏览器 1108px 视口实测计时器、背景音乐、胜利提示卡片均宽 242px，计时器行无内联宽度。
- 子计时器层级图例修复：完整页面 Smoke `3 passed`，相关单元测试 `21 passed`，`npx tsc --noEmit` 与生产构建通过；`32+2` 显示一级缩进的 `2`，`32+16+2` 显示二级缩进的 `2`，标题仍保留完整表达式。
- 设置页已保存规则预览：完整自定义计时器 Smoke `4 passed`、相关单元测试 `35 passed`、`npx tsc --noEmit`、生产构建与 `git diff --check` 通过；桌面端输入区与 286px 预览并排，390px 下预览改为纵向且无横向溢出，未保存编辑不会改变预览。
- 设置页预览的相邻层级缩进调整为 10px（2 个原视觉单位），并由 Smoke 断言一级、二级图例横向差值。
- Fibonacci 容量校正验证：规则/模式相关 69 项单测、目标页面 Smoke 4 项、`npx tsc --noEmit`、runtime `node --check`、game-manager 审计与生产构建全部通过；`verify:iterate` 的 97 个核心测试文件/658 项测试、8 项 runtime smoke、39 项玩法与回放 smoke 全部通过。
- 练习板 Fibonacci 预选块扩展验证：练习板代码输入与模式选择 Smoke 共 14 项通过，新增断言覆盖四种棋盘终点、4x4 排除 `3524578` 及高位数字不溢出；自定义计时器 Smoke 4 项、`node --check js/test_ui.js`、`npx tsc --noEmit` 与生产构建通过。
