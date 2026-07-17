# 执行记录

## Route Deviation

- 仓库仍缺少 `.trellis/scripts/get_context.py`；沿用已读取的前端规范和现有 smoke 测试结构继续实施。

## CI 证据

- `index replay export uses transient copy notice...` 在过渡动画末尾读到 `opacity: 0.00304973`，严格字符串断言期望 `0`。
- `midnight nebula only changes tile colors...` 在夜幕星云主题下读到旧棋盘和网格颜色，未继承新的经典工坊表面。
- `board_3x3_pow2_no_undo posts...` 在完整 pages 套件中等待在线记录提交超时；测试只等待运行时存在，没有等待即时提交钩子绑定完成。
- 本地完整 pages 套件还暴露出练习板代码按钮偶发在 `test_ui.js` 完成事件绑定前被点击，面板因此没有打开。

## 根因

- 复制提示测试把连续动画值当作离散字符串比较，CI 负载下会落在过渡结束前的最后一帧。
- 经典工坊棋盘规则只匹配无主题和 `classic`，遗漏了声明为 `tileOnlyTheme`、UI 基底为经典的 `midnight_nebula`。
- 扩展排位模式测试在 `__onlineImmediateSubmitHooksBound` 成立前可能调用 `tryAutoSubmitOnGameOver()`，因此只执行本地保存而没有触发在线提交包装器。
- 练习板代码测试只等待游戏管理器初始化；按钮上的 `aria-expanded` 是面板绑定完成后才写入的可靠就绪标记。

## 修复

- 非夜间的 `midnight_nebula` 继续复用经典工坊棋盘表面；真正夜间模式仍由夜间主题控制棋盘渐变和网格颜色。
- 回放提示隐藏断言改为数值容差，接受过渡结束前不可见的最后一帧。
- 扩展排位模式测试等待即时在线提交钩子绑定完成后再触发终局提交。
- 练习板代码测试等待按钮出现 `aria-expanded` 就绪标记后再点击。

## 验证

- index-ui 完整套件：4/4 通过。
- pages 完整套件：192/192 通过。
- 回放提示重复 10 次、扩展排位提交重复 40 次、练习板代码输入重复 100 次均通过。
- `npm run verify:prepush` 的审计、单元测试、关键 smoke 和生产构建全部通过。
