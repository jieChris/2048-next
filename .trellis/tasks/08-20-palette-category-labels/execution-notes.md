# 执行记录

## 根因

- HTML 和分类锚点顺序本来就是“外观与配色 → 计时器 → 新手指引”。
- 页面语言文案却按 `NodeList` 下标把“计时器”写入第一个锚点、把“外观与配色”写入第二个锚点，导致显示文字与点击目标互换。
- 修复改为按各自 `href` 精确绑定文案，不改变分类锚点、内容区顺序或滚动逻辑。

## Route Deviation

- 当前工作树缺少 `.trellis/scripts/get_context.py` 与 `.trellis/spec/guides/index.md`；采用最保守回退，直接读取 `.trellis/spec/index.md`、视觉规范、Smoke 规范和相关源码后继续。

## 验证

- `npx vitest run tests/unit/palette-settings-navigation.spec.ts`：7 个用例通过。
- `npm run build`：通过；仅保留既有 `ui-preview.html` 非模块脚本提示。
- `git diff --check`：通过。
- Codex 内置浏览器：实际页面分类顺序为“外观与配色 → 计时器 → 新手指引”，对应锚点依次为 `#appearance-settings`、`#timer-settings`、`#contextual-guide-settings`。
- Codex 内置浏览器：分别点击“外观与配色”和“计时器”，URL hash、激活类与 `aria-current` 均切换到对应锚点。
- Codex 内置浏览器：桌面无横向溢出；请求 390×844 窄屏视口时三项均可见，浏览器缩放取整后的横向边界值为 1px，检查后已恢复默认视口。
- 未更新视觉基线：当前工作树已有此前未提交的色板页视觉改动，接受截图会混入不同任务；当前硬性约束也禁止启动独立 Playwright 浏览器。保留本次结构回归，待色板页相关改动统一验收时更新基线。
