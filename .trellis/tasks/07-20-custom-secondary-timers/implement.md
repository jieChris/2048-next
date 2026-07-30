# 自定义子计时器实施计划

## 实施顺序

1. 为规则解析、非法输入、重复方块、精确命中和越级覆盖添加纯逻辑测试。
2. 在现有 TypeScript core 边界实现最小规则模型，并通过 bootstrap runtime 暴露给 legacy GameManager。
3. 将动态子行来源从固定 parent/child 生成替换为在局规则快照。
4. 把检查点从单一合并值扩展到成功移动完成生成后的棋盘快照。
5. 扩展子行存档状态，保存表达式、exact/covered 和覆盖来源。
6. 在 `palette.html` 设置页的计时器分类加入默认收起的多行输入、整体验证、按规则体系存储和下一局生效提示，并从游戏设置弹窗移除该编辑器。
7. 运行目标单元测试、相关页面 Smoke、构建和 Trellis 质量检查。
8. 将母计时器槽位改为按模式最大方块生成，并按需补建静态 HTML 中不存在的高阶行。
9. 在纯规则层加入两层推荐节点生成器，并在设置页用原生起止下拉框批量生成；结果只替换输入框，继续复用现有保存流程。
10. 校正 Fibonacci 合成容量：3x3 母计时器显示到 `4181`，4x4 显示到理论最大值前一项，并同步规则层单测与页面 Smoke。
11. 让练习板摆盘预选块复用 Fibonacci 母计时器终点，并用页面 Smoke 覆盖 4x2、3x3、4x3、4x4 四种棋盘。

## 风险文件

- `src/core/game-manager-base-helpers.ts`：现有动态子计时器核心所有者。
- `js/core_game_manager_move_input_helpers_runtime.js`：移动与生成时序。
- `src/bootstrap/timer-module*.ts`：设置 DOM 与绑定。
- `js/core_game_manager_saved_state_helpers_runtime.js`：在局规则与行状态持久化。

## 验证命令

- `npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts`
- 规则层新增目标单元测试。
- 计时器设置 host 与存档 runtime 目标测试。
- `npm run build`
- 按 `trellis-check` 结果补充最小必要验证。
