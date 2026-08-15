# 执行记录

## Route Deviation

- 主工作区包含多个未提交任务，采用基于最新 `origin/main` 的隔离工作树，避免覆盖或夹带用户改动。
- 仓库没有 `.trellis/spec/guides/index.md`，按现有 `.trellis/spec/index.md` 直接读取回放相关前端边界和 Smoke 规范。
- 仓库没有 `src/templates/markdown/spec/` 模板同步目录；按 `break-loop` 要求更新现有 `.trellis/spec/smoke-testing.md`，但无法执行模板同步，未创建新的重复文档结构。

## 根因

- 回放页实际使用 TypeScript bootstrap helper；此前状态历史优化写在未加载的旧 JavaScript helper 中。
- 生效的后退路径会重启棋盘并补算到目标；v1 回放没有预置检查点，拖动时该过程按动画帧重复执行。

## Bug Analysis: 回放后退重复重建

### 1. Root Cause Category

- **Category**: D - Test Coverage Gap
- **Specific Cause**: 既有验证只覆盖回放结果，没有在页面实际加载的运行时中约束后退时的 `move()` 和重建次数，因此未加载实现中的优化无法改善真实页面性能。

### 2. Why Fixes Failed

1. 旧 JavaScript helper 优化：修改对象未被回放页加载，属于变更传播范围判断错误。
2. 仅验证最终棋盘：结果正确无法揭示每次后退仍从开局补算的性能退化。

### 3. Prevention Mechanisms

| Priority | Mechanism | Specific Action | Status |
| --- | --- | --- | --- |
| P0 | Test Coverage | Smoke 断言后退不重复执行已访问动作，长距离补算不超过检查点间隔 | DONE |
| P0 | Documentation | 在 Smoke 规范记录实际运行时和操作次数验证规则 | DONE |
| P1 | Compile-time | 生产构建执行 TypeScript 检查，避免测试转译漏掉类型错误 | DONE |

### 4. Systematic Expansion

- **Similar Issues**: 其他同时保留旧脚本与 TypeScript bootstrap 的页面能力，也可能出现修改未加载实现的问题。
- **Design Improvement**: 本次不扩大范围清理重复实现；以后迁移相关能力时应逐步移除未加载副本。
- **Process Improvement**: 性能修复先确认页面加载链路，再用集成测试断言昂贵操作次数。

### 5. Knowledge Capture

- [x] 更新 `.trellis/spec/smoke-testing.md`。
- [x] 增加回放页 Smoke 操作次数断言。
- [x] 增加近期后退、长距离检查点和撤回兼容单元测试。

## 验证

- 目标单元测试：24/24 通过。
- 回放页 Smoke：28/28 通过。
- 生产构建：通过。
- 完整 `npm run verify:prepush`：全部门禁通过（审计、全量单测、critical Smoke、构建）。
- `git diff --check`：通过。
