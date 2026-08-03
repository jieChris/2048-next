# 操作反馈完整重设计实施计划

> 执行工作流：Trellis。先冻结共享契约，再由 3 个 Agent 分别处理输入／引擎、统计、浮层视觉，主 Agent 负责接口冻结、越界复核与最终验收。所有步骤使用复选框追踪；未经用户明确授权不提交、不推送。

**目标：** 在桌面完整游戏页实现由游戏引擎真实结果驱动的八键操作反馈，并把有效／无效输入数加入当前局统计汇总，同时保证长按、节流覆盖、八方向撤回语义、双主题视觉和锁定几何全部符合已批准规格。

**架构：** 复用现有 `CoreGameManagerInputEventsRuntime` 作为唯一结果桥梁：输入管理器产生带唯一 ID 的物理按键元数据；现有节流链路整体保存“方向＋元数据”；`move()`／撤回管线返回真实 `valid`；运行时统一过滤长按无效输入、更新当前局计数并派发一个 DOM 结果事件。浮层只消费该确认事件，不再监听原始 `keydown`。

**技术栈：** TypeScript、现有 legacy JavaScript runtime、Vitest + JSDOM/`vm`、CSS 自定义属性与 SVG、Vite；不新增依赖，不扩展服务端、历史记录、排行榜、玩家主页或回放格式。

---

## 一、执行边界

- 只修改本计划列出的文件；工作区内其他未提交内容均视为用户资产，不回退、不格式化、不顺手重构。
- 保留 `move` 事件对纯数字载荷的兼容；触摸／滑动仍可发送数字，不进入键帽反馈和键盘输入计数。
- 操作反馈开关只控制可视浮层，不控制当前局输入计数。
- 不把 `validInputCount`、`invalidInputCount` 写入存档、撤回快照、历史、回放、在线提交或排行榜。
- `Z` 在八方向模式是方向 `6`；八方向撤回只由退格键产生。其他支持撤回的模式保留既有 `Z/U/Backspace` 语义。
- 被节流覆盖、排名检查点恢复期间被丢弃、或没有真正送入 `move()` 的输入不显示、不计数。
- 页面测试与视觉验收只使用 Codex 内置浏览器，不连接、复用或启动用户 Chrome。

## 二、冻结的数据契约

共享类型放在现有 `src/core/game-manager-input-events.ts`，不新建只有单一实现的抽象层：

```ts
export interface OperationFeedbackInputMetadata {
  id: string;
  key: string;
  repeat: boolean;
}

export interface GameMoveInputAttempt {
  direction: unknown;
  feedback: OperationFeedbackInputMetadata | null;
}

export interface ConfirmedOperationFeedbackResult
  extends OperationFeedbackInputMetadata {
  valid: boolean;
}

export const OPERATION_FEEDBACK_RESULT_EVENT = "operation-feedback-result";
```

按键显示令牌固定为：

| 物理键 | `key` | 方向／动作 |
| --- | --- | --- |
| `ArrowUp/Right/Down/Left` | `arrow-up/right/down/left` | `0/1/2/3` |
| `W/D/S/A`、`K/L/J/H` | 对应大写字母 | `0/1/2/3` |
| `E/C/Z/Q`（八方向） | 对应大写字母 | `4/5/6/7` |
| `Z/U`（非八方向撤回） | 对应大写字母 | `-1` |
| `Backspace` | `backspace` | `-1` |
| `Y` | `Y` | `-2`，仅现有允许重做的路径 |

确认事件的唯一出口为：

```ts
publishConfirmedOperationFeedback(manager, attempt, valid): boolean
```

规则固定为：没有 `feedback` 返回 `false`；`repeat && !valid` 返回 `false`；其余情况先更新 `validInputCount` 或 `invalidInputCount`，再派发 `operation-feedback-result`，最后返回 `true`。

## 三、文件映射

### 输入与结果链路

- 修改 `src/core/game-manager-input-events.ts`：共享载荷类型、数字兼容归一化、确认结果发布与当前局计数入口。
- 修改 `js/keyboard_input_manager.js`：键盘移动元数据、唯一 ID、`repeat`、八方向 `Z`／退格语义。
- 修改 `js/capped_input_manager.js`：无撤回模式的键盘移动元数据；触摸继续使用数字载荷。
- 修改 `js/core_game_manager_move_input_helpers_runtime.js`：节流保存完整尝试、`move()` 返回真实结果、确认结果发布。
- 修改 `src/core/game-manager-undo-move-handler.ts`：新增可区分 `handled` 与 `valid` 的撤回结果 API，同时保留旧布尔 API。

### 当前局统计

- 修改 `src/core/game-manager-runtime-state.ts`：初始化／重置两个计数。
- 修改 `js/core_game_manager_session_init_helpers_runtime.js`：TS runtime 缺失时的回退重置。
- 修改 `src/core/stats-panel-copy.ts`：中英文文案。
- 修改 `js/core_game_manager_stats_ui_helpers_runtime.js`：统计面板新增两行。
- 修改 `js/core_game_manager_stats_display_helpers_runtime.js`：统计快路径和面板刷新传递两个计数。
- 修改 `js/core_game_manager_bindings_runtime.js`：`updateStatsPanel` 接受并渲染五项计数。
- 修改 `src/core/setup-ui-state.ts`：新局首次刷新显式传入五个 `0`。

`src/core/setup-state-initialization.ts` 与 `js/core_game_manager_restart_setup_helpers_runtime.js` 已把 `pendingMoveInput` 清空为 `null`，天然兼容完整尝试对象；不重复增加第二套计数重置逻辑，只用现有测试确认。

### 浮层与视觉

- 修改 `src/bootstrap/operation-feedback-settings.ts`：移除原始 `keydown` 监听和 `replaceChildren()` 历史渲染；改为八槽稳定节点和确认事件消费。
- 修改 `style/components/operation-feedback-settings.css`：固定几何、八槽上推、双主题键帽、粗 SVG 图形、红色无效状态、闲置渐隐和减弱动效。

### 测试与记录

- 修改 `tests/unit/core-game-manager-input-events.spec.ts`。
- 新建 `tests/unit/input-manager-operation-feedback.spec.ts`。
- 新建 `tests/unit/core-game-manager-move-input-runtime.spec.ts`。
- 修改 `tests/unit/core-game-manager-undo-move-handler.spec.ts`。
- 修改 runtime state、session init、setup state、stats copy/UI/display、setup UI、operation feedback、HTML/CSS 契约对应的现有单元测试。
- 最终追加 `.trellis/tasks/08-02-operation-feedback-settings/execution-notes.md` 的 Validation；只有发生被迫偏离时才追加 Route Deviation。

## 四、多 Agent 执行顺序

1. 主 Agent 完成任务 1，冻结共享类型、事件名和函数签名。
2. 契约测试通过后并行：
   - Agent A：任务 2、3，只编辑输入管理器、移动／撤回运行时及对应测试。
   - Agent B：任务 4，只编辑当前局状态、统计面板及对应测试。
   - Agent C：任务 5、6，只编辑浮层 TypeScript、CSS 及对应测试。
3. 主 Agent 检查每个 Agent 的限定文件 diff，拒绝越界改动；随后执行任务 7 集成验证。
4. Agent 不共享同一文件所有权；接口冲突只由主 Agent 调整共享契约。

---

### 任务 1：冻结输入尝试与确认结果契约

**文件：**

- 修改：`src/core/game-manager-input-events.ts`
- 修改：`tests/unit/core-game-manager-input-events.spec.ts`

- [x] **步骤 1：先写失败测试**

```ts
expect(normalizeGameMoveInputAttempt(2)).toEqual({ direction: 2, feedback: null });
expect(normalizeGameMoveInputAttempt({
  direction: 6,
  feedback: { id: "key-1", key: "Z", repeat: false }
})).toEqual({
  direction: 6,
  feedback: { id: "key-1", key: "Z", repeat: false }
});

expect(publishConfirmedOperationFeedback(manager, repeatedInvalid, false)).toBe(false);
expect(manager.invalidInputCount).toBe(0);
expect(events).toEqual([]);

expect(publishConfirmedOperationFeedback(manager, singleInvalid, false)).toBe(true);
expect(manager.invalidInputCount).toBe(1);
expect(events.at(-1)?.valid).toBe(false);

expect(publishConfirmedOperationFeedback(manager, repeatedValid, true)).toBe(true);
expect(manager.validInputCount).toBe(1);
expect(events.at(-1)?.valid).toBe(true);
```

把原测试的纯数字期望改为：

```ts
expect(handleMoveInput).toHaveBeenCalledWith(manager, {
  direction: 2,
  feedback: null
});
```

- [x] **步骤 2：确认测试先失败**

```bash
npx vitest run tests/unit/core-game-manager-input-events.spec.ts
```

预期：新归一化函数、发布函数和 runtime 字段尚不存在而失败。

- [x] **步骤 3：实现最小共享契约**

```ts
export function normalizeGameMoveInputAttempt(payload: unknown): GameMoveInputAttempt {
  if (!payload || typeof payload !== "object" || !("direction" in payload)) {
    return { direction: payload, feedback: null };
  }
  const source = payload as { direction?: unknown; feedback?: unknown };
  return {
    direction: source.direction,
    feedback: normalizeOperationFeedbackMetadata(source.feedback)
  };
}
```

发布函数使用 `documentLike.defaultView?.CustomEvent`，避免跨 JSDOM realm；计数按非负整数归一化后 `+1`。把两个新函数加入 `GameManagerInputEventsRuntime` 与 `createGameManagerInputEventsRuntime()`。`bindGameManagerInputEvents()` 只负责归一化后传给现有 `handleMoveInput`。

- [x] **步骤 4：运行同一测试，预期全部 PASS。**

### 任务 2：让两个输入管理器产生物理键元数据

**文件：**

- 修改：`js/keyboard_input_manager.js`
- 修改：`js/capped_input_manager.js`
- 新建：`tests/unit/input-manager-operation-feedback.spec.ts`

- [x] **步骤 1：先写 JSDOM + `vm` 失败测试**

```ts
expect(arrowPayload).toMatchObject({
  direction: 0,
  feedback: { id: expect.any(String), key: "arrow-up", repeat: false }
});
expect(repeatedWPayload).toMatchObject({
  direction: 0,
  feedback: { key: "W", repeat: true }
});
expect(diagonalZPayload).toMatchObject({
  direction: 6,
  feedback: { key: "Z", repeat: false }
});
expect(diagonalBackspacePayload).toMatchObject({
  direction: -1,
  feedback: { key: "backspace", repeat: false }
});
expect(cappedBackspacePayload).toBeUndefined();
expect(new Set(allPayloads.map((item) => item.feedback.id)).size).toBe(allPayloads.length);
```

八方向 fixture 设置 `body[data-mode-id^="diag_"]`；另测非八方向 `Z` 为 `-1`。触摸事件继续断言为纯数字方向。

- [x] **步骤 2：确认测试先失败**

```bash
npx vitest run tests/unit/input-manager-operation-feedback.spec.ts
```

- [x] **步骤 3：实现唯一 ID 与键令牌**

```js
function createKeyboardMovePayload(manager, direction, event) {
  manager.operationFeedbackInputSequence = (manager.operationFeedbackInputSequence || 0) + 1;
  return {
    direction: direction,
    feedback: {
      id: "key-" + String(manager.operationFeedbackInputSequence),
      key: resolveOperationFeedbackKey(event),
      repeat: event.repeat === true
    }
  };
}
```

`resolveOperationFeedbackKey(event)` 按 `event.code` 解析四个箭头、`Backspace` 和 `KeyA`～`KeyZ`。只有键盘移动／撤回／重做分支发送对象；滑动继续发送数字。不得给道具键、重开键或文本输入框中的按键生成移动载荷。

- [x] **步骤 4：运行同一测试，预期全部 PASS。**

### 任务 3：让节流、普通移动和撤回返回真实结果

**文件：**

- 修改：`src/core/game-manager-undo-move-handler.ts`
- 修改：`js/core_game_manager_move_input_helpers_runtime.js`
- 修改：`tests/unit/core-game-manager-undo-move-handler.spec.ts`
- 新建：`tests/unit/core-game-manager-move-input-runtime.spec.ts`

- [x] **步骤 1：先写撤回结果失败测试**

```ts
expect(executeUndoMove(manager, 1, operations)).toEqual({ handled: false, valid: false });
expect(executeUndoMove(manager, -1, { canExecuteUndoMove: () => false }))
  .toEqual({ handled: true, valid: false });
expect(executeUndoMove(manager, -1, successfulUndoOperations))
  .toEqual({ handled: true, valid: true });
expect(executeUndoMove(manager, -2, { canExecuteRedoMove: () => false }))
  .toEqual({ handled: true, valid: false });
expect(handleUndoMove(manager, -1, successfulUndoOperations)).toBe(true);
```

新 `executeUndoMove()` 返回 `{ handled, valid }`；旧 `handleUndoMove()` 继续返回 `.handled` 并保留兼容。

- [x] **步骤 2：先写移动／节流失败测试**

用 `vm` 注入可控 `Date.now`、`setTimeout`、`requestAnimationFrame` 和结果发布函数：

```ts
expect(runtime.move(validMoveManager, 1)).toBe(true);
expect(runtime.move(blockedBoardManager, 1)).toBe(false);
expect(runtime.move(successfulUndoManager, -1)).toBe(true);
expect(runtime.move(failedUndoManager, -1)).toBe(false);

runtime.handleMoveInput(throttledManager, firstAttempt);
runtime.handleMoveInput(throttledManager, secondAttempt);
flushAnimationFrame();
flushDelayedTimer();
expect(throttledManager.move).toHaveBeenCalledTimes(1);
expect(throttledManager.move).toHaveBeenCalledWith(secondAttempt.direction);
expect(publishConfirmedOperationFeedback).toHaveBeenCalledTimes(1);
expect(publishConfirmedOperationFeedback).toHaveBeenCalledWith(
  throttledManager,
  secondAttempt,
  true
);
```

再断言 `rankCheckpointRestorePending`／`rankCheckpointApplying` 时不执行、不发布。

- [x] **步骤 3：确认两组测试先失败**

```bash
npx vitest run \
  tests/unit/core-game-manager-undo-move-handler.spec.ts \
  tests/unit/core-game-manager-move-input-runtime.spec.ts
```

- [x] **步骤 4：实现撤回真实结果**

`executeUndoMove()` 固定规则：非撤回方向 `{false,false}`；识别为撤回但不能执行或恢复管线未返回状态 `{true,false}`；恢复管线实际执行且完成 actuate 后 `{true,true}`。成功恢复时才按既有规则启动计时器。

- [x] **步骤 5：让完整尝试经过节流并只发布实际结果**

以下函数改为携带 `attempt`：

```js
tryHandleMoveInputImmediately(manager, attempt)
queueMoveInputAttempt(manager, attempt)
executeImmediateMoveInput(manager, attempt, now)
scheduleDelayedPendingMoveInput(manager, attempt, wait)
```

核心出口：

```js
function executeImmediateMoveInput(manager, attempt, now) {
  if (!manager) return false;
  manager.lastMoveInputAt = now;
  var valid = manager.move(attempt.direction) === true;
  publishConfirmedMoveInput(manager, attempt, valid);
  return valid;
}
```

`pendingMoveInput` 保存整个 `attempt`；新尝试覆盖旧尝试时旧尝试没有发布机会。撤回绕过普通移动节流，但也经过相同结果出口。`move(manager, direction)` 明确返回布尔值：所有前置拒绝与无位移为 `false`，成功普通移动或成功撤回为 `true`。

- [x] **步骤 6：运行定向测试和审计**

```bash
npx vitest run \
  tests/unit/core-game-manager-input-events.spec.ts \
  tests/unit/input-manager-operation-feedback.spec.ts \
  tests/unit/core-game-manager-undo-move-handler.spec.ts \
  tests/unit/core-game-manager-move-input-runtime.spec.ts
npm run audit:game-manager
```

预期全部 PASS；新增 legacy helper 保持每个函数不超过审计允许的 19 行。

### 任务 4：接入当前局计数和统计汇总

**文件：**

- 修改：`src/core/game-manager-runtime-state.ts`
- 修改：`js/core_game_manager_session_init_helpers_runtime.js`
- 修改：`src/core/stats-panel-copy.ts`
- 修改：`js/core_game_manager_stats_ui_helpers_runtime.js`
- 修改：`js/core_game_manager_stats_display_helpers_runtime.js`
- 修改：`js/core_game_manager_bindings_runtime.js`
- 修改：`src/core/setup-ui-state.ts`
- 修改：上述模块对应的现有单元测试，以及 `tests/unit/core-setup-state-initialization.spec.ts`

- [x] **步骤 1：先写状态与统计失败测试**

```ts
expect(manager).toMatchObject({ validInputCount: 0, invalidInputCount: 0 });
expect(resolveStatsPanelCopy("zh").validInputs).toBe("有效输入数");
expect(resolveStatsPanelCopy("zh").invalidInputs).toBe("无效输入数");
expect(resolveStatsPanelCopy("en").validInputs).toBe("Valid Inputs");
expect(resolveStatsPanelCopy("en").invalidInputs).toBe("Invalid Inputs");
expect(manager.updateStatsPanel).toHaveBeenCalledWith(12, 9, 3, 7, 2);
expect(setStatsPanelFieldText).toHaveBeenCalledWith("stats-panel-valid-inputs", 7);
expect(setStatsPanelFieldText).toHaveBeenCalledWith("stats-panel-invalid-inputs", 2);
```

统计 UI HTML 必须包含 `stats-panel-valid-inputs(-label)` 与 `stats-panel-invalid-inputs(-label)` 两行。setup state 测试用 `{ direction, feedback }` 形式的 pending 输入，重置后仍断言 `null`。

- [x] **步骤 2：确认测试先失败**

```bash
npx vitest run \
  tests/unit/core-game-manager-runtime-state.spec.ts \
  tests/unit/core-game-manager-session-init-runtime.spec.ts \
  tests/unit/core-setup-state-initialization.spec.ts \
  tests/unit/core-stats-panel-copy.spec.ts \
  tests/unit/core-game-manager-stats-ui-runtime.spec.ts \
  tests/unit/core-game-manager-stats-display-runtime.spec.ts \
  tests/unit/core-setup-ui-state.spec.ts
```

- [x] **步骤 3：实现唯一的当前局重置位置**

在 `initializeGameManagerRuntimeState()`、`resetRoundStatsState()` 和 legacy fallback 写入：

```ts
manager.validInputCount = 0;
manager.invalidInputCount = 0;
```

不要把字段加入 saved-state、undo snapshot、replay 或 API payload。

- [x] **步骤 4：贯通统计面板**

统计记录增加：

```js
validInputs: normalizeActuateStatsNumber(manager.validInputCount),
invalidInputs: normalizeActuateStatsNumber(manager.invalidInputCount)
```

保持原三项语义不变。`updateStatsPanel` 扩展为：

```js
updateStatsPanel(totalSteps, moveSteps, undoSteps, validInputs, invalidInputs)
```

缺参时从 `computeStepStats()` 回退；新局调用改为 `updateStatsPanel?.(0, 0, 0, 0, 0)`。键帽附近不显示数值。

- [x] **步骤 5：运行步骤 2 的测试，预期全部 PASS。**

### 任务 5：改为确认结果驱动的八槽稳定节点

**文件：**

- 修改：`src/bootstrap/operation-feedback-settings.ts`
- 修改：`tests/unit/operation-feedback-settings.spec.ts`

- [x] **步骤 1：先写浮层失败测试**

改为派发确认事件：

```ts
document.dispatchEvent(new dom.window.CustomEvent(OPERATION_FEEDBACK_RESULT_EVENT, {
  detail: { id: "key-1", key: "arrow-up", repeat: false, valid: true }
}));
```

断言容量 8、最新在底部、无效类、宽退格、节点身份稳定、键帽附近无数字：

```ts
expect(keys).toHaveLength(8);
expect(keys.at(-1)?.dataset.inputId).toBe("key-9");
expect(keys.at(-1)?.classList.contains("is-invalid")).toBe(true);
expect(keys.at(-1)?.classList.contains("is-wide")).toBe(true);
expect(stack.querySelector("[data-input-id='key-2']")).toBe(originalKey2Node);
expect(stack.textContent).not.toContain("7");
```

使用 fake timers 覆盖顶部离场节点 `240ms` 后移除、锁定 `5000ms` 后 `is-idle`、下一条确认事件唤醒。解锁时固定显示 8 个预览键，真实事件不替换预览。

- [x] **步骤 2：确认测试先失败**

```bash
npx vitest run tests/unit/operation-feedback-settings.spec.ts
```

- [x] **步骤 3：实现八槽状态与稳定节点**

```ts
type OverlayState = {
  history: ConfirmedOperationFeedbackResult[];
  nodes: Map<string, HTMLElement>;
  idleTimer?: number;
};
```

用 `WeakMap<HTMLElement, OverlayState>` 保存状态。确认事件校验后保留最近 8 条；锁定时按 ID 复用节点并更新 `data-age`，第 9 个标记 `is-leaving` 后删除；新节点先 `is-entering`，下一帧进入底部。正式输入路径禁止 `replaceChildren()`；只有解锁预览可一次重建 8 个示例键。

- [x] **步骤 4：用自绘 SVG 构建键帽内容**

箭头统一使用：

```html
<svg class="operation-feedback-arrow" viewBox="0 0 32 32" aria-hidden="true">
  <path d="M6 16h20M17 7l9 9-9 9"></path>
</svg>
```

按方向旋转，CSS 使用 `stroke-width:4.8`、圆角端点。退格使用 `viewBox="0 0 52 32"` 的实心轮廓和内部切出的叉号。禁止系统 Unicode 箭头／退格符号；字母直接大写文本。

- [x] **步骤 5：运行步骤 2 的测试，预期全部 PASS。**

### 任务 6：实现双主题视觉、连续上推和固定几何

**文件：**

- 修改：`style/components/operation-feedback-settings.css`
- 修改：`tests/unit/html-module-entry-pages.spec.ts`

- [x] **步骤 1：先写 CSS 契约失败测试**

```ts
expect(css).toContain("--operation-feedback-slot-pitch: 66px");
expect(css).toMatch(/\.operation-feedback-key\s*\{[\s\S]*?width:\s*58px;[\s\S]*?height:\s*58px;/);
expect(css).toMatch(/\.operation-feedback-key\.is-wide\s*\{[\s\S]*?width:\s*96px;/);
expect(css).toContain('html[data-theme="mist_cyan"]');
expect(css).toContain(".operation-feedback-key.is-invalid");
expect(css).toContain("prefers-reduced-motion: reduce");
expect(css).not.toMatch(/\.operation-feedback-overlay\.is-editing\s*\{[^}]*padding:/);
expect(css).not.toMatch(/\.operation-feedback-overlay\.is-locked\s*\{[^}]*padding:/);
```

- [x] **步骤 2：确认测试先失败**

```bash
npx vitest run tests/unit/html-module-entry-pages.spec.ts
```

- [x] **步骤 3：固定主体几何**

```css
.operation-feedback-overlay,
.operation-feedback-surface,
.operation-feedback-key-stack {
  width: 96px;
  height: 520px;
}
```

锁、编辑背景和工具栏全部绝对定位；`.is-editing`／`.is-locked` 不增减 padding、border width 或占位元素。位置计算和拖动边界始终以 `96×520` 键帽主体为准；屏幕右侧预设锚定键帽右边缘，工具栏翻到左侧。

- [x] **步骤 4：实现槽位动画与年龄透明度**

键帽绝对定位在底部，按 `data-age` 使用 `translateY(calc(-1 * age * 66px))`。已有键 `240ms` 上推，新键 `280ms` 从底部进入，旧键顶部淡出。连续输入依赖 CSS transition 从当前计算位置重新定向，不建立 JS 队列。年龄透明度严格为 `1/.80/.64/.50/.38/.29/.21/.14`。闲置渐隐 `400ms`；减弱动效时关闭位移／缩放但保留状态颜色。

- [x] **步骤 5：实现两套批准配色**

```css
.operation-feedback-overlay {
  --operation-feedback-key-top: #45423e;
  --operation-feedback-key-bottom: #292825;
  --operation-feedback-key-ink: #f3ebdf;
  --operation-feedback-invalid-top: #9e4741;
  --operation-feedback-invalid-bottom: #74302d;
}

html[data-theme="mist_cyan"] .operation-feedback-overlay {
  --operation-feedback-key-top: #465761;
  --operation-feedback-key-bottom: #293942;
  --operation-feedback-key-ink: #edf4f1;
  --operation-feedback-invalid-top: #984b4d;
  --operation-feedback-invalid-bottom: #6f3337;
}
```

普通键 `58×58px`、圆角 `17px`；退格 `96×58px`；字母 `28px/780`。只保留克制内高光和短阴影，禁止霓虹、切角、金属描边。

- [x] **步骤 6：运行步骤 2 的测试，预期全部 PASS。**

### 任务 7：集成、内置浏览器验收和记录

**文件：**

- 修改：`.trellis/tasks/08-02-operation-feedback-settings/execution-notes.md`
- 视觉基线只有在内置浏览器工具能够生成现有规范要求的稳定产物时才更新；否则不伪造基线，并在 Route Deviation 如实记录工具约束。

- [x] **步骤 1：运行全部定向单元测试**

```bash
npx vitest run \
  tests/unit/core-game-manager-input-events.spec.ts \
  tests/unit/input-manager-operation-feedback.spec.ts \
  tests/unit/core-game-manager-move-input-runtime.spec.ts \
  tests/unit/core-game-manager-undo-move-handler.spec.ts \
  tests/unit/core-game-manager-runtime-state.spec.ts \
  tests/unit/core-game-manager-session-init-runtime.spec.ts \
  tests/unit/core-setup-state-initialization.spec.ts \
  tests/unit/core-stats-panel-copy.spec.ts \
  tests/unit/core-game-manager-stats-ui-runtime.spec.ts \
  tests/unit/core-game-manager-stats-display-runtime.spec.ts \
  tests/unit/core-setup-ui-state.spec.ts \
  tests/unit/operation-feedback-settings.spec.ts \
  tests/unit/html-module-entry-pages.spec.ts
```

预期全部 PASS，无未处理 Promise、定时器或 JSDOM 资源泄漏。

- [x] **步骤 2：运行项目门禁**

```bash
npm run audit:game-manager
npx tsc --noEmit
npm run build
git diff --check
```

预期退出码均为 `0`；不新增 runtime chain、类型或 CSS 错误。

- [x] **步骤 3：检查没有越界持久化**

```bash
rg -n "validInputCount|invalidInputCount" src js tests \
  .trellis/tasks/08-02-operation-feedback-settings
```

预期只命中 runtime state、确认结果发布、统计显示、测试和文档；不得命中 saved-state、replay、history、leaderboard、profile 或 API payload。

- [x] **步骤 4：准备内置浏览器真实页面状态**

使用 `npm run dev -- --host 127.0.0.1 --port 5174` 启动本地服务（不使用 `--open`），在 Codex 内置浏览器打开 `http://127.0.0.1:5174/2048.html`。准备稳定的 4×4 无撤回盘面，打开设置弹窗并开启“操作反馈”；不得启动或控制用户 Chrome。验收完成且后续不再需要时停止该开发服务。

- [x] **步骤 5：经典主题 1280×720 验收**

- 连续输入至少 10 次，只保留最近 8 个确认输入；新键底部滑入、旧键连续上推、最旧键顶部淡出，无瞬间替换和闪回。
- 单次有效为暖黑灰；单次无效为暗红；长按有效逐次出现；长按到不能移动后不新增红键、不增加无效计数。
- 箭头与粗字母等重；退格为 `96×58px` 自绘宽键。
- 八方向按 `Z` 显示字母键并斜向移动；只有退格撤回。成功撤回正常，失败非重复退格为红键。
- 5 秒无可展示输入后渐隐，下一次输入立即唤醒。

- [x] **步骤 6：锁定几何和位置验收**

在内置浏览器分别读取锁定前后：

```js
const overlay = document.querySelector("#operation-feedback-overlay");
const stack = overlay.querySelector(".operation-feedback-key-stack");
const measure = () => ({
  overlay: overlay.getBoundingClientRect().toJSON(),
  stack: stack.getBoundingClientRect().toJSON()
});
```

比较 `overlay` 与 `stack` 的 `left/top/width/height`，八项必须完全一致。再验证整体拖动、“贴近计时器”、键帽主体锚定“屏幕右侧”、锁定保存及刷新恢复。

- [x] **步骤 7：雾青灰与桌面边界验收**

切换真实 `mist_cyan` 主题，重复八键、红色无效、退格和锁定测试，确认只改变为冷蓝灰／雾白配色，尺寸与动效不变。`980px` 及以下设置开关与浮层均不可见。

- [x] **步骤 8：统计汇总验收**

执行 3 次有效单击、2 次无效单击、若干长按有效和长按无效；确认“有效输入数”包含实际移动的长按次数，“无效输入数”只包含两次非重复无效输入；原三项统计语义不变；键帽附近无数字；重开后两项归零，恢复旧存档不恢复上一局输入计数。

- [x] **步骤 9：写入执行证据**

在 `execution-notes.md` 的 Validation 写明实际测试命令与数量、构建结果、两主题 `1280×720`、`980px` 隐藏、锁定几何测量和长按统计结果。若没有偏离计划，不增加 Route Deviation；若视觉基线受工具限制，必须如实记录。

## 五、完成判定

- 原始 `keydown` 不再直接驱动浮层；确认事件是唯一正式输入来源。
- 节流覆盖只发布最后真正执行的完整尝试。
- 普通移动和撤回均提供真实 `valid`，单次／长按四种规则全部有自动测试。
- 八个真实节点按 ID 稳定复用；快速输入无整栈重建。
- 锁定／解锁几何测量完全一致。
- 双主题、粗箭头、宽退格、无效红色和 5 秒渐隐通过内置浏览器验收。
- 两项新数据只出现在当前局统计汇总，没有进入持久化和其他页面。
- 定向 Vitest、game-manager audit、TypeScript、构建和 `git diff --check` 全部通过。
