# “经典棋盘工坊”真实页面预览台实施计划

## 目标

新增独立预览页，在不修改正式页面样式的前提下，将当前页面与候选视觉系统并排展示。

## 最小实现

- 新增 `visual-preview.html`，只承担预览台结构。
- 新增 `src/entries/visual-preview.ts`，负责页面、设备、主题切换，iframe 初始化、安全拦截和只读示例状态。
- 新增 `style/classic-workshop-preview.css`，同时包含预览台外壳和只在候选 iframe 生效的主题规则。
- 首批页面：`2048.html`、`Practice_board.html`、`account.html`、`account_settings.html`、`medal-wall.html`、`relay_5x5.html`。
- 候选样式通过 `html[data-classic-workshop-preview="1"]` 作用域隔离，正式页面不加载该样式。
- 当前与候选 iframe 使用相同 URL、相同 DOM 和相同只读示例状态。
- 拦截导航、表单提交和业务按钮；保留设置、统计、展开、筛选等安全本地交互。

## 实施顺序

1. 先新增 Playwright 冒烟测试并确认因页面不存在而失败。
2. 实现预览页、模块入口和 Vite 构建入口。
3. 实现 iframe 同步、候选 CSS 注入、设备/主题切换和安全拦截。
4. 增加最少量只读示例状态，使无后端时仍能检查表格和成就布局。
5. 完成候选浅色与夜间样式。
6. 运行专项测试、语言审计、生产构建和 `git diff --check`。
7. 使用桌面和移动视口截图验收。

## 验收标准

- 当前版和候选版真实并排显示。
- 六个代表页面均可切换。
- 桌面、移动与浅色、夜间状态均可切换。
- 候选 iframe 加载候选样式，当前 iframe 和正式页面不加载。
- 无后端时账户榜单与成就页仍有只读示例内容。
- 预览中的链接、表单和危险操作不会离开页面或提交数据。
- 正式页面文件和正式共享样式不因候选设计而改变。

## Route Deviation

- `.trellis/scripts/get_context.py` 在当前仓库不存在，因此无法运行包上下文脚本；已改为直接读取 `.trellis/spec/index.md`、`frontend-api-boundary.md` 和当前任务设计文档，未改变实现边界。

## 雾青石板配色修订

1. 先用现有 Playwright 冒烟测试锁定候选页背景、棋盘、分数/时间框和夜间根背景颜色。
2. 只修改 `style/classic-workshop-preview.css` 中右侧候选作用域的颜色变量与游戏表面，不修改按钮结构、动画或正式页面样式。
3. 运行专项测试、生产构建和桌面截图验收。

## 正式应用

1. 用 Playwright 锁定正式游戏页的暖雾象牙配色，并锁定 `modes.html` 内部按钮样式不变。
2. 通过 `style/main.css` 接入已确认主题，使所有正式页面复用同一套表面、棋盘、表单和夜间规则。
3. 移除预览 iframe 的候选 CSS 动态注入，预览与正式页面改为读取同一份共享样式。
4. 运行专项测试、生产构建、差异检查和真实页面截图验收。
