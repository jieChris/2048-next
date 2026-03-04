# Burn-in 执行记录（2026-03）

## 记录说明
- 每天至少 1 条日常观测记录。
- 回滚演练当天，额外补 1 条演练记录。
- 本文件按 2026-03 月度维护。

## A. 日常观测记录
| 日期 | 会话量 | 可比较样本 | 不一致率 | 连续窗口通过率 | Top 不一致模式 | Readiness | 备注 |
|---|---:|---:|---:|---:|---|---|---|
| 2026-03-05 | 200 | 200 | 0.00% | 3/3(100.00%) | - | 可切换 | strict-session burn-in 达标维持 |
| 2026-03-04 | 200 | 200 | 0.00% | 3/3(100.00%) | - | 可切换 | strict-session burn-in 达标维持 |
| 2026-03-03 | 200 | 200 | 0.00% | 3/3(100.00%) | - | 可切换 | strict-session burn-in 达标，补录 |
| 2026-03-02 | 200 | 200 | 0.00% | 2/3(66.67%) | - | 观察中 | strict-session burn-in 补录：窗口累积中 |
| 2026-03-01 | 200 | 200 | 0.00% | 1/3(33.33%) | - | 观察中 | strict-session burn-in 补录：窗口累积中 |
## B. 回滚演练记录
| 日期 | 操作 | 预期 | 实际 | 结果 |
|---|---|---|---|---|
| 2026-03-03 | emergency_rollback | storage(engine_adapter_force_legacy)=1 且来源=强制回滚 | 已由 smoke 用例覆盖并通过 | 通过 |
| 2026-03-03 | resume_canary / reset_policy | storage(engine_adapter_force_legacy)=- 且来源=默认 | 已由 smoke 用例覆盖并通过 | 通过 |

## C. 提交前门禁记录
| 日期 | 命令 | 结果 | 耗时 | 备注 |
|---|---|---|---|---|
| 2026-03-03 | `npm run verify:burnin` | 通过 | - | burn-in/canary/adapter 关键链路通过 |
| 2026-03-03 | `npm run verify:rollback-drill` | 通过 | - | 回滚演练链路通过 |
| 2026-03-04 | `npm run verify:refactor:ci` | 通过 | 约 66s | 由 `verify:submit-ready` 链路覆盖执行 |
| 2026-03-04 | `npm run verify:prepush` | 通过 | - | 由 `verify:submit-ready` 链路覆盖执行 |
| 2026-03-04 | `npm run verify:submit-ready` | 通过 | - | 提交前全量门禁完成（split-check + release gates） |
