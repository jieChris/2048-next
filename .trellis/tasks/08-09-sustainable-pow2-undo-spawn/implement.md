# 实施顺序

1. 先更新 Web 定向测试：幂二跨尺寸全局最小值；斐波那契 `d=2/3/4` 的精确前沿、非前沿和 `2,3,5,5` 撤回分支。
2. 在 Web 现有共同出数入口中替换第一版邻居最小值逻辑：幂二取全局最小值，斐波那契比较连续解锁前缀对应的容量前沿。
3. 复用 `spawnValueCounts` 生成两种规则集的动态出数表，让主随机和排位确定性 value roll 共用 87/10/共享 3% 边界。
4. 补充解锁数为 0/1/2/3 时的概率边界、撤回后常驻、存档恢复和斐波那契断裂计数前缀的保守处理测试。
5. 保持 RPL1 ext type 8 + ULEB128 格式，将 Web 编解码语义泛化为幂二或斐波那契精确高阶值，补测 128+ 幂二和大于 2 的斐波那契值。
6. 修改 API 权威验证：按记录顺序维护不随 undo 回滚的解锁前缀，验证两种临界强制值、非临界允许值和排位概率边界，将 `verification_version` 提高到 5。
7. 补充篡改测试：未解锁精确值、非斐波那契值、非 2 的幂、重复扩展、错误 move 配对及 undo 后非法回锁。
8. 运行 Web 定向测试、全部 core 测试、生产构建、game-manager audit 和相关 JS 语法检查；运行 API 类型检查、Worker/Node 测试。
9. 运行两个仓库的 `git diff --check`，复核与用户现有 operation-feedback 和调色板改动的边界，更新执行笔记。本轮无 UI 改动，不执行浏览器视觉验证。

## 风险文件与回退点

- Web 出数：`js/core_game_manager_move_input_helpers_runtime.js`。
- Web 回放：`js/core_replay_codec_runtime.js`、`src/core/replay-codec.ts`、`js/core_game_manager_replay_helpers_runtime.js`、`src/bootstrap/game-manager-replay-helpers-runtime.ts`。
- API：`src/replay_verify.ts`及其 Worker/Node 回放验证测试。
- 若必须修改 Android `shared-source.json` 受管文件，按迁移手册保持该部分暂停，记录 Route Deviation，不直接绕过同步流程。
