# 执行记录

## 根因

- `admin.html` 与 `stone_2k_monitor.html` 未加载 `core_night_mode_preload.js`，因此已保存的夜间偏好没有写入根节点。
- 多个页面专属样式表在 `main.css` 之后加载，并重新写入亮色背景或浅色模式文字颜色；共享夜间色板无法覆盖这些规则。
- 现有夜间样式主要覆盖游戏、设置弹窗和少数页面，没有覆盖用户记录列表、历史空状态、接力提示、管理工具表面等页面专属组件。

## Route Deviation

- 仓库缺少 `.trellis/scripts/get_context.py`，无法运行包上下文脚本；改为直接读取 `.trellis/spec/index.md`、`frontend-api-boundary.md`、`cross-repo-architecture.md` 和既有视觉系统任务文档。

## 完成内容

- 新增 `style/preferences/night-page-surfaces.css`，作为正式页面专属 CSS 之后的共享夜间所有权层。
- 统一修复用户记录列表、历史空状态、接力提示、危险按钮、状态标签、注册/密码表单标签和成就辅助文字。
- 统一设置弹窗内部行、公告项、自定义下拉和游戏确认弹窗按钮的夜间表面。
- 为管理台和 2K 监测页补上夜间模式预加载，并适配其卡片、输入框、输出区、访问口令门、监测面板和空盘面。
- 全部正式页面的 `main.css` 缓存键更新为 `v=20260713-night-pages-v1`，避免线上继续命中旧样式。
- 保留模式选择页内部样式、按钮结构与动画、棋盘和方块主题配色。

## 验证

- 新增夜间页面覆盖 Smoke：`3/3` 通过。
- 视觉系统、共享设置和夜间专项 Smoke：`12/12` 通过。
- 完整 pages Smoke：`195/195` 通过。
- `npm run build`：通过。
- `npm run verify:prepush`：审计通过，单元测试 `1802/1802`、关键 Smoke `41/41`、生产构建通过。
- 桌面 `1440x900` 与移动 `390x844` 已检查全部正式页面；夜间属性全部生效，没有新增横向溢出。

## 已知既有问题

- `register.html`、`password.html`、`user.html`、`palette.html` 和 `stone_2k_monitor.html` 在 `390px` 下原本就有 `2-8px` 横向溢出，浅色与夜间模式相同；本次没有把夜间配色修复扩展为页面布局重构。
