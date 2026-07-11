# A 方案“釉彩方块”实施计划

**目标：** 将按钮预览页由三列改为“当前正式样式 + 釉彩方块”两列，并保留所有真实 SVG 和原动画。

**实现方式：** 继续复用现有真实组件克隆逻辑，只修改预览页列结构、候选文案和 `preview-variant--enamel` 作用域 CSS。正式按钮基础样式、主题管理器和模式页不变。

**技术栈：** 静态 HTML、CSS、原生 JavaScript、Playwright。

---

## 任务 1：先更新预览回归约束

**文件：**

- 修改：`tests/smoke/pages-ui-preview-buttons.smoke.spec.ts`

- [ ] 将候选列改为：

```ts
const VARIANTS = ["current", "enamel"] as const;
```

- [ ] 将候选计算样式断言改为：

```ts
expect(candidateChrome).toEqual({
  display: "flex",
  width: "46px",
  height: "46px",
  borderRadius: "7px"
});
```

- [ ] 增加釉彩色带静态规则断言：

```ts
const enamelChrome = await page.locator(
  '[data-preview-variant="enamel"] [data-preview-top-action="profile"]'
).evaluate((button) => {
  const band = getComputedStyle(button, "::before");
  return {
    width: band.width,
    opacity: band.opacity,
    transitionProperty: band.transitionProperty
  };
});

expect(enamelChrome.width).toBe("3px");
expect(enamelChrome.opacity).toBe("1");
expect(enamelChrome.transitionProperty).toContain("width");
expect(enamelChrome.transitionProperty).toContain("opacity");
```

- [ ] 运行并确认旧页面失败：

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-ui-preview-buttons.smoke.spec.ts
```

预期：因不存在 `data-preview-variant="enamel"` 而失败。

## 任务 2：将预览页改为两列

**文件：**

- 修改：`ui-preview.html`

- [ ] 保留 `current` 列。
- [ ] 删除 `mode-family` 和 `quiet-family` 两列。
- [ ] 新增：

```html
<article class="preview-variant preview-variant--enamel" data-preview-variant="enamel">
  <header class="preview-variant-header">
    <span class="preview-variant-index">02</span>
    <div>
      <h2 data-i18n="enamelTitle">釉彩方块</h2>
      <p data-i18n="enamelCopy">青金色带、釉面边缘与明确的按压反馈。</p>
    </div>
  </header>
  <div data-variant-content></div>
</article>
```

- [ ] 删除旧候选的中英文文案键，增加：

```js
enamelTitle: "釉彩方块",
enamelCopy: "青金色带、釉面边缘与明确的按压反馈。"
```

英文：

```js
enamelTitle: "Enamel Tiles",
enamelCopy: "Cyan-gold bands, glazed edges, and tactile press feedback."
```

## 任务 3：实现釉彩方块外壳

**文件：**

- 修改：`style/ui-preview.css`

- [ ] 将桌面列改为两列：

```css
.button-preview-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

- [ ] 删除 `preview-variant--mode` 和 `preview-variant--quiet` 的候选样式。
- [ ] 新增候选基础规则：

```css
.preview-variant--enamel [data-preview-control] {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid rgba(31, 54, 58, 0.2);
  border-radius: 7px;
  color: #26383b;
  background: #fffef9;
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -2px 0 rgba(215, 164, 44, 0.2),
    0 5px 12px rgba(31, 54, 58, 0.1);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

.preview-variant--enamel [data-preview-control]::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  z-index: -1;
  width: 3px;
  background: var(--preview-teal);
  opacity: 1;
  transition: width 180ms ease, opacity 180ms ease;
}
```

- [ ] 悬停时让同一色带同步扩展并变淡：

```css
.preview-variant--enamel [data-preview-control]:hover::before,
.preview-variant--enamel [data-preview-control]:focus-visible::before {
  width: 100%;
  opacity: 0.1;
}
```

- [ ] 顶部图标按钮使用 `46 × 46px`：

```css
.preview-variant--enamel .preview-top-actions [data-preview-control] {
  width: 46px !important;
  min-width: 46px !important;
  height: 46px !important;
  padding: 0 !important;
  border-radius: 7px !important;
}
```

- [ ] 增加原生按压态：

```css
.preview-variant--enamel [data-preview-control]:active {
  transform: translateY(1px) scale(0.96);
  box-shadow:
    inset 0 2px 5px rgba(31, 54, 58, 0.18),
    inset 0 -1px 0 rgba(215, 164, 44, 0.24),
    0 2px 4px rgba(31, 54, 58, 0.12);
  transition-duration: 60ms;
}
```

- [ ] 为主要、幽灵、危险、加载和禁用状态增加设计文档中定义的最小覆盖规则。
- [ ] 在 `prefers-reduced-motion: reduce` 下关闭外壳过渡和加载旋转。

## 任务 4：验证

- [ ] 运行专项测试：

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-ui-preview-buttons.smoke.spec.ts
```

预期：`2 passed`。

- [ ] 运行顶部按钮相关组合测试：

```bash
npx playwright test --config=playwright.config.ts --workers=1 \
  tests/smoke/pages-ui-preview-buttons.smoke.spec.ts \
  tests/smoke/pages-home-user-display.smoke.spec.ts \
  tests/smoke/index-ui-theme-midnight-nebula.smoke.spec.ts
```

预期：`16 passed`。

- [ ] 运行语言审计：

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/ui-language-audit.smoke.spec.ts
```

预期：`56 passed`。

- [ ] 运行生产构建：

```bash
npm run build
```

预期：成功完成 TypeScript、Vite 构建和预压缩。

- [ ] 使用 `1440 × 900` 和 `390 × 844` 截图验收两列布局、色带、真实 SVG 和按钮边界。

- [ ] 运行：

```bash
git diff --check
```

预期：无输出。

- [ ] 更新 `execution-notes.md`，记录 A 方案确认、实现结果和验证数据。

本计划不提交、不推送、不部署。
