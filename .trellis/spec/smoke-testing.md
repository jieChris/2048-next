# 冒烟测试规范

本规范用于 `tests/smoke/` 下的 Playwright 用例。每次修复冒烟测试后，应把可复用的根因和防错规则补充到这里，而不是只修当次断言。

## 提交前维护

- 每次提交或推送代码前必须阅读本规范，并按与本次改动相关的条目复核 Smoke。
- 开发、调试或 CI 修复中发现新的可复用防错规则时，必须在提交或推送前更新本规范。
- 新条目应描述触发条件、错误模式和正确做法；已有规则能够覆盖时不重复添加，没有新规则时不制造文档改动。

## 前置状态必须显式

- 测试依赖主题、色板、夜间模式、语言或页面分类时，必须在 `page.addInitScript` 或 URL 中显式设置。
- `page.addInitScript` 会在同一 Page 的每次文档导航前再次执行；跨页验证 localStorage 持久化时，初始化清理必须用 sessionStorage 一次性标记保护，不能在目标页导航时再次删掉刚保存的数据。
- 中文界面的语言分离审计可精确放行固定品牌词，但页面 title 的完整 SEO 文案应由 SEO 专项用例单独断言，不能继续沿用旧的短标题合同。
- 页面入口会执行 cookie-first 的 `/api/auth/refresh`；需要自定义 API 路由的 smoke 必须显式模拟该请求（成功返回测试 token 或明确的终态认证码），不得让它落到未启动的本地 API 代理并把页面初始化拖到超时。
- 会读取登录态的副作用运行时必须在 `restoreAuthSession()` 完成后动态加载；Cookie-only 回归必须从“localStorage 无 token”开始，由 `/api/auth/refresh` 返回 token 与 `public_profile_id`，再断言本人请求和页面初始化成功，不能预塞 token 掩盖启动竞态。
- 可能被浏览器 BFCache 恢复的登录态 UI 必须在 `pageshow` 或重新获得焦点时重读本地会话镜像；Smoke 应先渲染游客态，再更新认证字段并触发持久化 `pageshow`，断言昵称与个人主页链接同步，不能只验证首次加载。
- 账号色板文档的 `activePaletteId: null` 只表示“没有同步中的自定义色板处于活动状态”，不得把当前本地内置/跟随主题强制重置为默认色板；Smoke 应选中非默认内置色板，再返回空云端自定义仓库并断言选择保持。
- 账号色板首次接入同步时，页面可能在第一次云端读取前把旧 Web 色板镜像标记为 `dirty + revision 0`；若云端已存在更高 revision，不得直接发起注定冲突的 CAS。等价或本地空状态应采用云端，云端空状态应先基于其 revision 重放本地文档；并发首次写入返回等价结果时应视为同步成功。`source`、`locked` 和本地时间戳属于设备私有元数据，不得把仅有这些差异的色板误报为冲突；颜色、名称、边框、发光等权威视觉字段不同才保留冲突。API 对显式 format-3 请求必须返回完整 format-3 文档和投影前的 `sourceFormat`；仅当 `sourceFormat: 2` 且 palette ID、名称、皮肤、基础颜色与活动选择均匹配时，Web 才可用更丰富的本地样式升级旧云端 revision。真实分歧才进入冲突状态，Smoke/单测应分别覆盖这些分支。
- 不得依赖项目当前默认值；默认主题或默认页面变化不应破坏无关测试。
- 全站自动弹层应在 Playwright 共享 `storageState` 中固定为已处理；弹层自身另设用例显式清除该状态，验证首次出现和关闭后的持久状态。
- 对互斥显示的页面模块，先使用对应锚点或点击入口，再断言模块内元素可见。

## 控件选择器必须避开根节点状态属性

- 页面根节点可能复用控件使用的 `data-*` 状态属性（例如 `<html data-display-mode>`）。交互控件的查询必须限定到实际元素类型（例如 `button[data-display-mode]`），不能使用会匹配根节点的裸属性选择器；否则批量更新文案时可能把整个文档替换掉。Smoke 至少应验证页面正文仍存在，并断言控件数量与状态属性。

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
- 模块入口在 DOM 中静态存在时，Smoke 仍必须等待增强运行时的明确就绪标记或权威数据已渲染后再交互；例如个人主页等待 `data-page-system="unified-page-system"`，账号色板等待目标 palette item 可见。仅等待按钮可见会在 CI 较慢时点击尚未绑定事件的控件。
- 弹窗关闭只证明 UI 状态已变化，不证明确认动作触发的异步持久化已经结束；reload、导航或读取结果前，必须轮询目标存储标记或其他真实副作用。
- 触发行为前，等待该行为真正依赖的能力，例如函数存在、绑定标记为真或目标状态已写入。
- 不使用固定延时掩盖初始化竞态；固定延时只适用于确认“在一段时间内不会发生”的负向断言。
- 统一刷新任务执行期间收到 `wake` 时，调度器必须记住这次唤醒，并在当前任务结束后立即补跑；不得把网络恢复事件降成普通轮询间隔，也不得靠扩大 Smoke 超时掩盖丢失的唤醒。
- 测试需要在线提交、副作用钩子或轮询初始化时，不得同时设置对应的禁用标记。
- 字段级异步校验只能更新该字段的反馈；不得在 `await` 后清空共享提示区，否则会覆盖同一次点击产生的密码、邮箱等同步校验错误。Smoke 应等待异步校验结束后再断言共享提示仍然可见。
- Smoke 若用路由中止制造首轮网络失败，不得同时把客户端请求超时压到低于正常成功响应和 CI 调度抖动；首轮 `route.abort()` 已能快速失败，后续成功请求应保留有界但现实的超时，并可加入小幅延迟验证成功后的状态清理。

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
- 验证“刷新后重放”时，首屏必须显式关闭后台自动扫描，写入到期重试时间后再通过一次性 session 标记为目标刷新启用扫描；不得在仍运行的轮询器旁修改 `next_retry_at` 后断言短暂中间态，否则并发扫描会把它重新推到未来。
- 只有产品契约明确保证“至多一次”时，才断言精确请求数量。
- 所有影响被测控制流的 API 必须路由模拟；无关后台请求可禁用，但不能禁用被测行为本身。
- 模拟需要登录的 API 时必须校验 `Authorization`，或在缺失凭证时返回 401；无条件返回 200 会掩盖前端漏传 Token。
- 认证账号 ID 与公开主页 ID 是两个字段：登录态夹具必须同时提供认证 `id` 和 `public_profile_id`，主页链接与本人归属断言只使用后者；不得继续用 `2048_auth_userId_v1` 代替公开主页 ID。
- 无查询参数打开本人主页时，身份解析成功后 URL 必须规范为包含 `id=<public_profile_id>` 的可分享地址；不得把裸 `user.html#overview` 留作复制给他人的身份地址。
- `localhost`、`127.*` 和 `::1` 页面默认只能使用同源 `/api`；共享 API base 解析器不得自动追加生产 fallback，否则本地测试会越过代理隔离并被页面 CSP 拦截，或误向生产发送请求。确需跨域时必须显式启用并同步配置 CSP 和路由模拟。
- 终局记录进入 IndexedDB 发件箱后，Smoke 应通过 `LocalHistoryStore` 的异步 API 断言 `sync_status` 和 `server_record_id`；旧 localStorage pending key 只作为迁移输入，导入成功后应为空，不能继续把它当成待上传证据。
- 同一本地记录的回放内容未变时，重复终局钩子不得替换已持久化的 `client_record_id`；已有 `server_record_id` 的 `synced` 记录不得重置为 `pending` 或再次发起 POST。该终态保护必须在与写入相同的 IndexedDB 事务内复核，不能只依赖事务外的预读结果。
- 同一游戏 manager 的并发终局钩子必须共享一次发件箱持久化 Promise；否则它们可在 `localHistoryRecordId` 写回前各自创建一条相同记录，表现为一条已同步、另一条仍待上传。
- 在线终局提交必须先启动并等待游戏核心的本地历史保存，再用其写回的 `localHistoryRecordId` 准备发件箱；只合并在线钩子仍会与核心保存各创建一条记录。
- 发件箱重试锁必须在迁移、查询候选记录等第一个异步等待前取得，并覆盖候选选择与上传；在查询后才上锁会让并发扫描选中并重复上传同一记录。
- 可撤回模式满盘后仍可撤回；本地终局证据在用户确认新局前必须保持 `finalized_local`，不能被自动重试扫描作为 `pending` 提前上传。
- 历史页的单条/全部手动补传是对 `finalized_local` 的显式释放，必须纳入手动候选；自动扫描仍排除该状态，避免玩家尚未确认时提前上传。
- 离开当前页面不等于结束当前对局。练习板、模式页、账号页、色板页和首页等普通导航不得创建 `abandon` 事件、重复写入完整回放或拦截跳转；只有用户明确确认“新游戏/重新开始”时才能记录放弃当前对局。

```ts
// 错误：刷新时 pagehide 冲刷和启动重试可能同时发生
expect(recordBodies).toHaveLength(1);

// 正确：验证至少一次语义和幂等契约
expect(recordBodies.length).toBeGreaterThanOrEqual(1);
expect(new Set(recordBodies.map((body) => body.client_record_id)).size).toBe(1);
```

- 色板编辑器的 pointer/input 中间态只修改草稿：Smoke 必须先断言编辑期间没有远端写入，再点击明确的 `#palette-save-btn` 后才断言本地持久化、离线队列或刷新结果。本地持久化失败时草稿必须保持 dirty 并阻止导航。
- 账号色板离线队列的断言必须固定账号 ID 和 stable palette ID；重试复用冻结的 operation ID/request hash，显式保留重复内容时必须创建带 `allowDuplicate: true` 的新 operation。
- Theme Plaza 的分享资格只读取当前活动 custom palette：Smoke 必须同时放置“其他色板失败/满库”和“当前色板已同步”状态，断言其他色板不阻止分享；当前色板 dirty、pending、paused、duplicate、capacity、base-expired、expired 或 local-only 时分别 fail-closed。互动、保存和分享测试必须使用 `reactionEnabled`、`saveEnabled`、`shareEnabled`，不得继续用 legacy `writeEnabled` 放宽能力。

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

## 主题广场夹具必须声明发布能力

- 主题广场 Smoke 必须分别模拟 `/api/theme-plaza/capabilities` 与目标列表/详情接口；不得靠默认 200 空响应判断功能状态。
- 默认发布夹具应保持 `writeEnabled: false`，并断言保存、评价、举报或分享不会被误开放。
- 验证写路径时必须显式打开 Mock capability，并同时模拟账号 format-3 色板文档、revision、保存/投票响应；保存后必须断言当前活动色板没有自动切换。
- 公开预览夹具必须提供背景、文字、边框、发光、整体强度和 26 个倍率，不得用静态截图或不完整颜色数组代替真实渲染合同。
