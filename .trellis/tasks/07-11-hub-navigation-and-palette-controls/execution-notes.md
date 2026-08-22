# 执行记录

## Route Deviation

- 仓库缺少 `.trellis/scripts/get_context.py`，无法执行标准包上下文脚本；改为直接读取 `.trellis/spec/index.md`、`frontend-api-boundary.md` 和 `cross-repo-architecture.md`，继续按前端页面与 API 边界实施。
- 2026-08-23：`npm run dev:local` 因本机 API 未配置 `DATABASE_URL`、`AUTH_TOKEN_SECRET`、`RANKED_SESSION_SECRET` 和 `AUTH_SYNC_SECRET` 无法启动后端。此次仅修改设置页顶部前端控件，保守回退为在内置浏览器连接独立 Vite 服务完成页面交互与视觉验证；未把该验证描述为完整后端联调。

## 验证记录

- RED：目标单元测试确认无用户 ID 的登录态仍被送往账号设置，练习板仍会创建用户按钮，触屏入口媒体查询仍覆盖桌面触摸设备。
- RED：页面测试确认用户中心入口缺失、`user.html` 无查询参数无法加载本人资料、账号设置区块未居中、色板内部控件仍使用旧棕色样式。
- 修复：登录态无缓存用户 ID 时统一进入 `user.html`，由用户页通过 `/user/me` 恢复本人 ID 与昵称；账号设置与排行榜保留独立的用户中心入口。
- 修复：练习板在共享用户入口层直接排除，且不再将 `#practice-stats-actions` 作为用户按钮宿主。
- 修复：色板内部选择器、棋盘切换、维度标签、色板列表、颜色目标和色块复用珐琅配色与反馈；新建副本使用主按钮状态。
- 视觉检查发现全局 `.replay-button` 选择器覆盖了触屏入口的 `display:none`；改为仅在 `max-width: 760px` 且 `pointer: coarse` 时强制显示。
- GREEN：目标单元测试 13/13 通过。
- GREEN：目标浏览器回归测试 38/38 通过。
- GREEN：`npm run verify:prepush` 的全部审计、单元测试、关键烟雾测试和构建通过。
- 2026-08-23：语言与显示模式由分段按钮改为两个图标触发的原生 `details` 下拉菜单；保留现有语言、自动/白天/夜晚状态逻辑，补齐 `menuitemradio`、互斥展开、点击外部关闭与 Esc 返回焦点。
- 2026-08-23：内置浏览器验证桌面与移动端两个菜单均在视口内、无横向溢出；中英文文案联动正确，显示模式切换正确并自动收起。
- 2026-08-23：目标单元测试 15/15 通过，`npm run build` 与 `git diff --check` 通过。
