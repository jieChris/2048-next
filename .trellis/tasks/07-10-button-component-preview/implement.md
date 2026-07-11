# 按钮组件预览页实施计划

**目标：** 将现有 `ui-preview.html` 改为真实按钮组件演示台，三列比较当前样式与两套候选样式，同时保留顶部图标按钮的正式 SVG 和动画。

**实现方式：** 页面只保留一份真实顶部按钮源结构，加载现有 `core_top_action_bindings_host_runtime.js` 完成正式图标装饰后，再克隆到三个候选列。当前列使用正式 CSS；候选列仅通过预览页作用域修改按钮外壳。

**技术栈：** 静态 HTML、原生 JavaScript、CSS、Playwright。

---

## 任务 1：增加真实组件预览回归测试

**文件：**

- 新增：`tests/smoke/pages-ui-preview-buttons.smoke.spec.ts`

步骤：

1. 打开 `/ui-preview.html`，断言存在 `current`、`mode-family`、`quiet-family` 三列。
2. 断言每列都包含公告、头像、统计、重开、导出、练习、模式、历史、设置九种真实顶部按钮。
3. 比较三列中同类按钮的 SVG 内部结构，确保候选列没有替换正式图标。
4. 悬停设置和统计按钮，断言正式动画名称分别为 `settings-spin-once` 和 `stats-line-rise-in`。
5. 点击预览按钮，断言页面 URL 不变。
6. 先运行测试并确认旧页面失败：

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-ui-preview-buttons.smoke.spec.ts
```

## 任务 2：实现真实组件演示台

**文件：**

- 修改：`ui-preview.html`
- 修改：`style/ui-preview.css`

步骤：

1. 在 `ui-preview.html` 中加载正式按钮所需的现有 CSS 和 `js/core_top_action_bindings_host_runtime.js`。
2. 建立一份带正式 ID 和 SVG 的顶部按钮源结构，通过现有运行时完成图标装饰。
3. 将装饰后的真实按钮克隆到三列，删除克隆节点 ID，并再次调用现有运行时为所有克隆绑定正式动画。
4. 使用横向对比矩阵展示以下按钮组：
   - 顶部图标按钮；
   - 主要、次要与导航文字按钮；
   - 筛选、分页与紧凑按钮；
   - 危险、禁用与加载状态；
   - 接力和监测页专用按钮。
5. 捕获预览区点击事件并执行 `preventDefault()`，禁止跳转和正式业务操作。
6. 在 `style/ui-preview.css` 中保留当前列的正式样式，只为 `mode-family` 与 `quiet-family` 添加预览页作用域外壳样式。
7. 保留中英文切换，所有新增可见文案使用 `data-i18n` 映射。

## 任务 3：验证

1. 运行预览页专项测试：

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-ui-preview-buttons.smoke.spec.ts
```

预期：全部通过。

2. 运行语言审计：

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/ui-language-audit.smoke.spec.ts
```

预期：全部通过。

3. 运行生产构建：

```bash
npm run build
```

预期：TypeScript、Vite 构建和预压缩全部成功。

4. 在桌面与窄屏视口检查 `/ui-preview.html`，确认无重叠、横向溢出和空白区域，且顶部图标动画与 `/2048.html` 一致。

5. 运行：

```bash
git diff --check
```

预期：无输出。

本任务不提交、不推送、不部署。

## 任务 4：按确认结果静态化默认顶部按钮

**文件：**

- 修改：`style/components/top-actions-base.css`
- 修改：`js/theme_manager.js`
- 修改：`style/ui-preview.css`
- 修改：`tests/smoke/pages-ui-preview-buttons.smoke.spec.ts`

步骤：

1. 先增加计算样式回归测试，断言：
   - 当前正式列为 `50 × 50px`、`12px` 圆角；
   - 模式页同系候选为 `40 × 40px`、`10px` 圆角；
   - 轻量同系候选为 `40 × 40px`、`8px` 圆角；
   - 实际游戏页移除 `#theme-dynamic-style` 后仍保持默认图标外壳。
2. 将默认图标模式的尺寸、圆角、居中布局和 SVG 尺寸写入 `top-actions-base.css`。
3. 删除 `theme_manager.js` 中专门动态生成默认 `50px` 尺寸、`12px` 圆角和 SVG 尺寸的 `actionButtonChromeCss()`；主题颜色等视觉规则仍可保留。
4. 保持文字按钮模式、隐藏按钮和候选列样式不受默认规则误覆盖。
5. 运行预览专项、顶部按钮相关组合测试、语言审计、生产构建与 `git diff --check`。

本任务继续遵守：不提交、不推送、不部署，不修改 `modes.html` 的按钮样式。
