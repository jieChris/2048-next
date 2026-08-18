# 重开提示设置设计

复用现有设置弹窗、开关样式和共享重开入口，不新增页面、依赖或第二套重开逻辑。

- 存储键：`settings_restart_prompt_enabled_v1`，缺失或读取失败时按开启处理。
- 设置弹窗新增 `restart-prompt-toggle`，由现有提示设置初始化链统一同步和持久化。
- `src/core/restart-game.ts` 在同步与异步确认入口执行同一个 `shouldConfirmRestart` 门禁；仅门禁返回 `false` 时跳过确认，后续 `performRestartAfterConfirm` 完全复用。
- legacy 运行时只补同一存储读取和操作参数，保持旧浏览器路径一致。
- 带排行榜的模式仍经过现有新会话准备和本地尝试持久化，不因关闭提示而绕过安全边界。
