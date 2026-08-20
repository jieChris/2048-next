# 冒烟测试规范

本规范用于 `tests/smoke/` 下的 Playwright 用例。每次修复冒烟测试后，应把可复用的根因和防错规则补充到这里，而不是只修当次断言。

## 提交前维护

- 每次提交或推送代码前必须阅读本规范，并按与本次改动相关的条目复核 Smoke。
- 开发、调试或 CI 修复中发现新的可复用防错规则时，必须在提交或推送前更新本规范。
- 新条目应描述触发条件、错误模式和正确做法；已有规则能够覆盖时不重复添加，没有新规则时不制造文档改动。

## 前置状态必须显式

- 测试依赖主题、色板、夜间模式、语言或页面分类时，必须在 `page.addInitScript` 或 URL 中显式设置。
- 中文界面的语言分离审计可精确放行固定品牌词，但页面 title 的完整 SEO 文案应由 SEO 专项用例单独断言，不能继续沿用旧的短标题合同。
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

## 生产重定向必须包含反例

- 协议或主机规范化依赖代理头时，先确认每层代理是否覆盖该头；不得把内层连接协议误当成访客协议。
- 匹配 HTTP 的规则必须同时验证 HTTPS 反例，避免宽泛的 `http` 子串匹配 `https` 并造成全站循环。
- 发布后分别检查 HTTP、HTTPS、`www` 与 canonical URL，并限制最大跳转次数；只验证“最终能打开”会掩盖多跳或循环。

## 版本化运行时必须验真实链路

- 本地验收前确认预览进程的工作目录就是待发布工作树，不能只凭端口或页面外观判断代码版本。
- 随机序列、回放格式等版本化行为不能只看最终方块值；必须同时断言来源上下文版本、manager 运行时版本和实际消费序号。
- 新格式与旧格式并存时，至少覆盖全新局采用新版本、旧活动局/旧回放保持旧版本、未使用的旧预取状态不会污染下一局。
- 练习板实时放置必须始终写入 V3 动作；只有 4×4 幂 2 盘面同步写紧凑动作，5×5 与斐波那契只保留 V3；回放播放不得反向记录为新操作。

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
- 验证暂时失败后的持久重试时，失败路由必须持续到用例显式放行；不能只让首次请求失败，因为终局钩子可能在状态断言前立即强制重试并成功。
- 只有产品契约明确保证“至多一次”时，才断言精确请求数量。
- 所有影响被测控制流的 API 必须路由模拟；无关后台请求可禁用，但不能禁用被测行为本身。
- 模拟需要登录的 API 时必须校验 `Authorization`，或在缺失凭证时返回 401；无条件返回 200 会掩盖前端漏传 Token。
- `localhost`、`127.*` 和 `::1` 页面默认只能使用同源 `/api`；共享 API base 解析器不得自动追加生产 fallback，否则本地测试会越过代理隔离并被页面 CSP 拦截，或误向生产发送请求。确需跨域时必须显式启用并同步配置 CSP 和路由模拟。
- 终局记录进入 IndexedDB 发件箱后，Smoke 应通过 `LocalHistoryStore` 的异步 API 断言 `sync_status` 和 `server_record_id`；旧 localStorage pending key 只作为迁移输入，导入成功后应为空，不能继续把它当成待上传证据。

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
- 具有 `transform` 放大反馈的练习板棋子，必须同时断言未变换布局行距和层级；视觉放大允许覆盖相邻棋子，不得用 margin 为放大部分预留额外行距。

## 修复流程

1. 从 CI 日志记录失败套件、用例和首个业务断言，不把代理连接噪声当作根因。
2. 先单独复现失败用例，再在所属分组中复现，区分稳定回归与顺序/时序问题。
3. 追踪被测函数的全部调用方，判断应修产品根因还是测试假设。
4. 禁止用增加重试次数、扩大超时或删除有效断言作为默认修复。
5. 至少运行目标用例、所属 Smoke 分组和 `git diff --check`；涉及发布门禁时再运行 `npm run verify:release`。
