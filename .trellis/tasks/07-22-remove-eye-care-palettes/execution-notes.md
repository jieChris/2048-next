# 执行记录

## Route Deviation

- 无。

## 验证记录

- `node --check js/theme_manager.js js/core_i18n_runtime.js`：通过。
- `npx vitest run tests/unit/core-night-mode-runtime.spec.ts`：5 项通过。
- 两个相关 Playwright Smoke 文件：15 项通过。
- 浏览器刷新设置页：两套色板已消失，旧“夜纸”选择自动回退为“跟随主题”。
- `npm run build` 与 `git diff --check`：通过。
