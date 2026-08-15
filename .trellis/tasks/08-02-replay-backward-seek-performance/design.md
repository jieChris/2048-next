# 设计

- 只修改回放页实际安装的 `src/bootstrap/game-manager-replay-helpers-runtime.ts`。
- 复用现有 `createCurrentUndoStackEntrySnapshot`、`applyUndoRestoredTiles` 和 `applyUndoRestoreState`，不引入第二套棋盘序列化。
- 普通回放保存最近 512 个精确状态，并每 32/64/128 步保存稀疏状态检查点。
- 后退优先恢复精确状态；缺失时清空近期历史，从最近检查点补算到目标。
- 检测到撤回动作时禁用新缓存，完整保留旧路径。
