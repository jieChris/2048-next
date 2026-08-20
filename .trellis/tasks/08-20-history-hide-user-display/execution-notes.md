# 执行记录

## 根因

- `history.html` 本身没有该节点；`bootstrapDirectPage` 会调用共享 `bindHomeUserDisplay`，而历史页未列入排除清单，因此运行时向 `body` 动态插入了 `#home-user-display`。
- 修复仅补齐页面级排除配置，不修改其他页面的用户入口。

## Route Deviation

- 当前工作树缺少 `.trellis/scripts/get_context.py`，无法执行 Trellis 包上下文脚本；采用最保守回退，直接读取 `.trellis/spec/index.md`、`visual-validation.md`、`smoke-testing.md` 与相关源码后继续。

## 验证

- `npx vitest run tests/unit/bootstrap-home-user-display.spec.ts`：12 个用例通过。
- `npm run build`：通过；仅保留既有 `ui-preview.html` 非模块脚本提示。
- `git diff --check`：通过。
- Codex 内置浏览器：1600×900 桌面视口确认 `#home-user-display` 数量为 0，返回按钮仍在页头内，横向溢出为 0。
- Codex 内置浏览器：请求 390×844 窄屏视口确认 `#home-user-display` 数量为 0，返回按钮和筛选卡可见，浏览器缩放取整后的横向边界值为 1px；随后已恢复默认视口。
- 未更新视觉基线：当前工作树还包含此前“检查并补传”等未提交历史页变化，接受新截图会把不同任务混入本次最小修复；同时当前硬性约束禁止启动独立 Playwright 浏览器。保留结构断言，待相关历史页改动统一验收时更新基线。
