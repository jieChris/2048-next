# 执行记录

## Route Deviation

- 仓库缺少 `.trellis/scripts/get_context.py`，无法执行标准包上下文脚本；采用最保守替代方案，直接读取 `.trellis/spec/index.md`、`frontend-api-boundary.md`、`cross-repo-architecture.md` 与 `smoke-testing.md` 后继续。
- `js/user_profile_page.js`、`style/user_profile_page.css` 和目标 Smoke 已有未提交改动；本次仅在现有差异上追加局部补丁，不回退或重写用户改动。
- 当前开发分支的旧 PR 已被 squash 合并，分支提交不再是 `main` 的祖先；为避免重复夹带旧 404 功能，本次提交将移植到基于最新 `origin/main` 的隔离工作树后再发布。
- 本次鉴权修复的 `audit:service-boundary` 被工作区既有未提交文件 `src/entries/operation-feedback-preview.ts` 的直接 storage 使用拦截；为避免覆盖无关改动，不修改该文件，改以目标 Smoke、生产构建、语法检查和差异检查验证本次补丁。

## 调查记录

- `normalizeHistoryRecordViaRuntime()` 未复制 `board_sum`，但下游优先采用归一化结果，导致 API 正确值被默认 0 覆盖。
- 标准无撤回模式在资料页被硬编码为 `Classic 4x4`，与筛选器和摘要命名不一致。
- 后端对 `deleted_at` 记录的 replay 路由固定返回 404；前端仍连续尝试三种下载模式，最终隐藏恢复入口并显示“回放不可用”。
- 移动端继承列表 `max-height: 560px; overflow: auto`，形成截图中的嵌套滚动。
- 截图中的超长时长由存储的 `duration_ms` 直接换算；当前公开 API 已无对应记录，无法从现存数据确认产生链路，因此不在展示层截断或改写。

## 验证记录

- RED：API 仅返回 `board_sum: 126` 且不带 `final_board` 时，页面显示 0；标准无撤回记录显示“经典4x4”；390px 视口仍为内部滚动；删除态无内嵌 replay 时无法显示恢复入口。
- GREEN：`board_sum` 被传入共享记录归一化器；模式名统一为 `4x4（不可撤回）` / `4x4 (No Undo)`；移动端列表取消高度限制；删除态直接渲染恢复提示和动作，不发送 replay 请求。
- 资料页完整 Smoke：15/15 通过，包含现有 beta/official 记录区分场景。
- `node --check js/user_profile_page.js`、`git diff --check`、服务边界审计、TypeScript、生产构建均通过。
- `npm run verify:prepush` 全部门禁通过：架构审计、完整单元测试、关键 Smoke 与构建均为 PASS，总耗时 41.99 秒。
