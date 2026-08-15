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
- URL 锚点会自动展开 `<details>` 时，先读取或断言最终 `open` 状态；不得无条件点击 `summary`，否则会把已就绪模块反向折叠。
- 同一反馈文案可能同时出现在结果区域和全局 Toast 时，定位器必须限定到被测区域或语义角色，不能用全页模糊文本定位制造 strict-mode 歧义。
- `page.addInitScript` 会在同一页面的每次导航重新执行；只用于首次播种的存储状态必须带一次性标记，避免后续导航覆盖测试刚完成的用户设置。

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

## 生产重定向必须包含反例

- 协议或主机规范化依赖代理头时，先确认每层代理是否覆盖该头；不得把内层连接协议误当成访客协议。
- 匹配 HTTP 的规则必须同时验证 HTTPS 反例，避免宽泛的 `http` 子串匹配 `https` 并造成全站循环。
- 发布后分别检查 HTTP、HTTPS、`www` 与 canonical URL，并限制最大跳转次数；只验证“最终能打开”会掩盖多跳或循环。

## 等待能力，不等待时间

- `waitUntil: "domcontentloaded"` 只表示文档已解析，不表示运行时、包装钩子或异步状态已经就绪。
- 触发行为前，等待该行为真正依赖的能力，例如函数存在、绑定标记为真或目标状态已写入。
- 排位页面在直接调用 `move()`、重开或导出前，除等待 `game_manager` 外，还必须确认 `rankedSetupBlockedUntilSessionReady`、`rankCheckpointRestorePending`、`rankCheckpointApplying` 和 `needsRankedCheckpointRestore` 均不为 `true`；管理器已创建不代表排位盘面恢复已完成。
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
- 模拟需要登录的 API 时必须校验 `Authorization`，或在缺失凭证时返回 401；无条件返回 200 会掩盖前端漏传 Token。

## 生产部署必须验证完整依赖链

- 静态页面返回 200 不能证明站点健康；当 Nginx 同时承担 API 代理或 `auth_request` 门禁时，部署必须从站点容器入口验证至少一个 API 健康路径及权限门禁的预期状态。
- Nginx 配置检查容器必须加入与正式站点相同的 Docker 网络；依赖的 API 网络不存在或匿名 Admin 门禁返回 5xx 时，部署必须失败并恢复上一版本。
- 定时生产探针必须覆盖用户实际经过的站点 `/health`，并断言匿名 Admin 页面返回产品约定的 404，不能只检查绕过站点代理的 `/api/health`。

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
