# 冒烟测试规范

本规范用于 `tests/smoke/` 下的 Playwright 用例。每次修复冒烟测试后，应把可复用的根因和防错规则补充到这里，而不是只修当次断言。

## 提交前维护

- 每次提交或推送代码前必须阅读本规范，并按与本次改动相关的条目复核 Smoke。
- 开发、调试或 CI 修复中发现新的可复用防错规则时，必须在提交或推送前更新本规范。
- 新条目应描述触发条件、错误模式和正确做法；已有规则能够覆盖时不重复添加，没有新规则时不制造文档改动。

## 前置状态必须显式

- 测试依赖主题、色板、夜间模式、语言或页面分类时，必须在 `page.addInitScript` 或 URL 中显式设置。
- 不得依赖项目当前默认值；默认主题或默认页面变化不应破坏无关测试。
- 对互斥显示的页面模块，先使用对应锚点或点击入口，再断言模块内元素可见。

```ts
// 错误：依赖当前默认主题和默认分类
await page.goto("/palette.html");
await expect(page.locator(".palette-sidebar")).toBeVisible();

// 正确：固定测试所需状态
await page.addInitScript(() => {
  localStorage.setItem("theme_profile_v1", "classic");
  localStorage.setItem("tile_palette_active_v1", "follow-theme");
});
await page.goto("/palette.html#appearance-settings");
```

## 多工作树必须隔离端口

- Playwright 配置允许 `reuseExistingServer` 时，多工作树或并行开发不得默认共用 `4173`；否则测试可能静默连接另一工作树的旧页面，产生与当前代码无关的缺失元素或旧行为失败。
- 在隔离工作树运行 Smoke 时，通过 `PW_WEB_PORT=<空闲端口>` 启动并连接当前工作树；失败后先确认响应页面的实际版本，再判断产品或测试回归。

## 等待能力，不等待时间

- `waitUntil: "domcontentloaded"` 只表示文档已解析，不表示运行时、包装钩子或异步状态已经就绪。
- 触发行为前，等待该行为真正依赖的能力，例如函数存在、绑定标记为真或目标状态已写入。
- 不使用固定延时掩盖初始化竞态；固定延时只适用于确认“在一段时间内不会发生”的负向断言。
- 测试需要在线提交、副作用钩子或轮询初始化时，不得同时设置对应的禁用标记。

```ts
// 错误：方法存在不代表包装钩子已绑定
await page.waitForFunction(() => typeof game_manager.restart === "function");

// 正确：等待被测副作用的真实就绪条件
await page.waitForFunction(
  () =>
    game_manager?.__onlineImmediateSubmitHooksBound === true &&
    typeof game_manager.restart === "function",
);
```

## 网络提交按契约断言

- 页面生命周期冲刷、启动重试和网络重试属于至少一次提交，可能产生多个请求。
- 若接口以 `client_record_id` 幂等，测试应断言所有请求使用同一非空幂等键、载荷一致且最终状态正确，不应断言请求严格一次。
- 只有产品契约明确保证“至多一次”时，才断言精确请求数量。
- 所有影响被测控制流的 API 必须路由模拟；无关后台请求可禁用，但不能禁用被测行为本身。

```ts
// 错误：刷新时 pagehide 冲刷和启动重试可能同时发生
expect(recordBodies).toHaveLength(1);

// 正确：验证至少一次语义和幂等契约
expect(recordBodies.length).toBeGreaterThanOrEqual(1);
expect(new Set(recordBodies.map((body) => body.client_record_id)).size).toBe(1);
```

## 视觉断言必须绑定场景

- 颜色断言前显式选择主题和色板；布局测试不应意外依赖默认配色。
- 仅当像素值是明确设计契约时断言固定尺寸或颜色；否则优先断言元素之间的相等、对齐、可见和不溢出关系。
- 测试名称、前置状态和断言必须描述同一场景。
- 除非资源 URL 本身是业务合同，不得断言 CSS/JS 查询串中的具体缓存版本；应断言资源入口存在及最终样式或行为，缓存键更新不应破坏无关 Smoke。

## 性能修复必须验证实际运行时

- 同一能力同时存在旧脚本和 TypeScript bootstrap 实现时，先从页面入口确认实际加载链路，不得只修改或测试未被页面加载的重复实现。
- 缓存、回放和进度跳转等性能修复，Smoke 除最终状态外还必须断言核心操作次数，防止结果正确但仍重复执行昂贵路径。
- 回放后退应断言重复 `move()` 或重建次数有界；再次向前一步应断言仍执行一次真实移动，避免优化改变动画和出生方块语义。

## 修复流程

1. 从 CI 日志记录失败套件、用例和首个业务断言，不把代理连接噪声当作根因。
2. 先单独复现失败用例，再在所属分组中复现，区分稳定回归与顺序/时序问题。
3. 追踪被测函数的全部调用方，判断应修产品根因还是测试假设。
4. 禁止用增加重试次数、扩大超时或删除有效断言作为默认修复。
5. 至少运行目标用例、所属 Smoke 分组和 `git diff --check`；涉及发布门禁时再运行 `npm run verify:release`。
