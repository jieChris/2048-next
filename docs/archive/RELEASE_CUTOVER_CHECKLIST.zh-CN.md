# 发布切换检查清单（M6）

## 1. 代码门禁
- [ ] `npm run verify:burnin` 通过
- [ ] `npm run verify:refactor:ci` 通过
- [ ] `npm run verify:rollback-drill` 通过
- [ ] `npm run verify:prepush` 通过
- [ ] `npm run verify:release-ready` 通过
- [ ] `npm run report:burnin-log` 输出状态可接受（建议最终执行 `npm run verify:burnin-log`）

## 2. Burn-in 证据
- [ ] 最近 7 天 burn-in 记录完整
- [ ] 会话量达到目标（建议 `>= 1000`）
- [ ] 不一致率连续窗口低于阈值（建议 `< 0.5%`）
- [ ] 无 P0 回归
- [ ] readiness 为“可切换”
- [ ] 至少 1 次回滚演练成功记录

## 3. 策略状态确认
- [ ] 默认策略是 `core-adapter`
- [ ] `engine_adapter_force_legacy` 为删除态（或空）
- [ ] canary 面板显示来源与存储值一致

## 4. 发布动作
- [ ] 写入本次发布说明（含风险与回滚条件）
- [ ] 打稳定 tag
- [ ] 记录发布时间与负责人
- [ ] `deploy-self-hosted` 工作流执行成功（目标分支：`main`）
- [ ] 线上域名验证通过（`/index.html`、`/play.html`、`/history.html`、`/replay.html`）

## 5. 回滚预案（必须可执行）
- [ ] 可立即设置 `engine_adapter_force_legacy=1`
- [ ] 回滚后状态栏可观测到“强制回滚”
- [ ] 回滚验证步骤已在 runbook 中复核

## 6. 归档
- [ ] 将本次门禁结果写入 burn-in 执行记录
- [ ] 将异常与处理结论归档到发布记录
