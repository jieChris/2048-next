# 重开提示设置执行记录

## Route Deviation

- 当前状态一基线缺少 Trellis 上下文脚本 `.trellis/scripts/get_context.py` 和共享指南索引；保守改为直接读取 `.trellis/spec/index.md`、`smoke-testing.md`、`visual-validation.md` 及现有设置任务文档，不改变实施范围。
- 现有视觉基线命令会启动独立 Playwright 浏览器，与本次会话“网页验证只能使用 Codex 内置浏览器”的硬性约束冲突；不伪造或批量更新 PNG，改用内置浏览器按受影响视口和主题做定向视觉验收，并记录结果。
- 用户在同一未提交工作树追加练习板砖块循环需求，范围因此扩展到规则与回放。保守复用现有练习板动作和紧凑回放格式，只新增值 `1` 的 escape subtype，并保持 5×5、斐波那契使用 V3 动作回退，不改服务端或排行榜逻辑。

## Validation

- 定向单测：`core-restart-game`、`core-game-manager-restart-seed`、`bootstrap-settings-modal-page-host`，54 项通过。
- `npx tsc --noEmit`、`npm run build`、`git diff --check` 通过；构建仅保留仓库既有的 `ui-preview.html` 非 module 脚本警告。
- 内置浏览器验证 `2048.html`：默认开启时显示确认；关闭后从 5 个活动方块直接重开为 2 个起始方块且无确认；刷新后关闭状态保持；重新开启后确认恢复。
- 内置浏览器验证中文与英文标题、描述和 `aria-label`；英文为 `Restart Confirmation` / `Ask before starting a new game`。
- 内置浏览器验证 320×568、1280×720 的浅色与夜间设置弹窗，新设置行始终位于弹窗边界内。320 宽夜间页面存在基线已有的 470px 棋盘横向溢出，溢出节点为 `.grid-container` / `.tile-container`，与本次设置行无关，未扩大范围处理。
- 按浏览器硬性约束未运行会启动独立 Playwright 的视觉基线命令；临时内置浏览器标签和本地 Vite 服务均已关闭。纯 Vite 预览未启动本地 API，因此服务端日志出现预期的 `127.0.0.1:3000` 排行榜代理拒绝，不影响本次本地设置与重开链路验收。
- 练习板与回放定向单测共 7 个文件、118 项通过；`npx tsc --noEmit`、`npm run build`、所有改动 JS 的 `node --check`、`npm run audit:game-manager`、`git diff --check` 通过。构建仅保留既有的 `ui-preview.html` 非 module 脚本警告。
- 内置浏览器验证 4×4 幂 2 同一格 `0 → 1 → 2 → 4`，V3 动作与紧凑解码均为对应四步；5×5 的 `0 → 1` 写入 V3 且紧凑日志保持为空；4×4 斐波那契最后四步为 `0 → 1 → 2 → 3`，写入 V3 且紧凑日志保持为空。
- 针对练习板窄屏选中框覆盖问题，内置浏览器在 320×568 复核选中项与下一行重叠时 `elementFromPoint` 命中选中项，计算层级为 `z-index: 100`（相邻 `.tile-inner` 为 `10`）；Smoke 断言同时按实际几何重叠筛选相邻棋子；1280×720 下选中项仍可见且层级保持；随后已恢复默认视口并保留当前练习板标签页。
- 本次收尾检查：`npx tsc --noEmit` 与 `git diff --check` 均以退出码 0 通过；遵守内置浏览器约束，未运行会启动独立浏览器的 Smoke/视觉命令。
- 追加练习板行距修复：补偿前 320×568 的可见行距为 `-0.425px`；改为页面内联媒体规则中的上下补偿后，320×568 初始选中第一排的下方间距、切换到第二排 `64` 后的上方和下方间距均为约 `3.994px`；选中项命中测试点且 `z-index: 100` 高于相邻内容 `10`。
- 练习板行距修复路线修正：上一版用上下 `margin` 预留放大空间会改变 flex 行高，造成未选中列出现大间距；已撤销该方案。现在用 `box-sizing: border-box` 固定布局盒尺寸，保留 `scale(1.15)` 与 `z-index: 100`，允许选中棋子覆盖相邻棋子。内置浏览器复核 320×568、1280×720 和默认视口，所有布局行距均为约 4px。
