# 设计

## 最小架构

复用现有 `visual-preview.html` 作为人工画板，设备按钮直接携带宽高数据，预览脚本读取该数据设置 iframe 尺寸。无需新增场景注册模块或画板框架。

视觉回归使用独立 `playwright.visual.config.ts`，测试只放在 `tests/visual/`。账号设置游客页保留独立语义断言；全量用例以数据数组登记另外 32 个页面和 18 个弹窗，复用同一套视口、主题、状态安装、API fixture、就绪等待与横向溢出断言。Playwright 原生截图断言负责比较 PNG，普通命令只比较，更新命令显式传入 `--update-snapshots`。

## 稳定性边界

- 通过初始化脚本固定中文、认证 fixture、主题、色板、时间和随机数，并清除场景外存储。
- 只读画板不修改浏览器认证存储；账号设置预览通过 DOM fixture 固定为游客状态，避免影响真实本地账号。
- API 请求返回与页面状态匹配的确定结果，Turnstile 与在线排行榜使用本地 fixture，避免真实后端和网络影响页面。
- 截图前关闭 CSS 动画、过渡和光标，并等待页面 i18n 与字体就绪。
- 先执行语义与布局断言，再截图；这样“游客”重新出现或横向溢出时能得到明确失败原因，而不只是像素差异。

## 文件职责

- `visual-preview.html`、`src/entries/visual-preview.ts`：人工只读画板和关键尺寸切换。
- `playwright.visual.config.ts`：视觉套件的隔离配置、截图路径和失败产物策略。
- `tests/visual/account-settings.visual.spec.ts`：账号设置游客页 8 个语义与视觉场景。
- `tests/visual/all-pages.visual.spec.ts`：其余 32 个页面和 18 个弹窗的 400 个视觉场景。
- `tests/visual/baselines/`：批准 PNG。
- `tests/visual/manifest.json`：基线范围和最近一次批准原因。
- `.trellis/spec/visual-validation.md`：长期维护规则。

## 版本策略

基线文件名仅包含稳定的场景信息。更新时覆盖同名 PNG，Git diff 展示新旧二进制变化，manifest 记录业务原因；不在文件名中重复 Git 已提供的版本能力。
