# Burn-in 执行记录模板（中文）

## 记录说明
- 每天至少 1 条。
- 回滚演练当天，额外补 1 条“演练记录”。
- 建议按周归档到独立文件。

## A. 日常观测记录
| 日期 | 会话量 | 可比较样本 | 不一致率 | 连续窗口通过率 | Top 不一致模式 | Readiness | 备注 |
|---|---:|---:|---:|---:|---|---|---|
| YYYY-MM-DD |  |  |  |  |  | 可切换/观察中/阻塞 |  |

## B. 回滚演练记录
| 日期 | 操作 | 预期 | 实际 | 结果 |
|---|---|---|---|---|
| YYYY-MM-DD | emergency_rollback | storage(engine_adapter_force_legacy)=1 且来源=强制回滚 |  | 通过/失败 |
| YYYY-MM-DD | resume_canary / reset_policy | storage(engine_adapter_force_legacy)=- 且来源=默认 |  | 通过/失败 |

## C. 提交前门禁记录
| 日期 | 命令 | 结果 | 耗时 | 备注 |
|---|---|---|---|---|
| YYYY-MM-DD | `npm run verify:burnin` | 通过/失败 |  |  |
| YYYY-MM-DD | `npm run verify:rollback-drill` | 通过/失败 |  |  |
| YYYY-MM-DD | `npm run verify:refactor:ci` | 通过/失败 |  |  |
| YYYY-MM-DD | `npm run verify:prepush` | 通过/失败 |  |  |
