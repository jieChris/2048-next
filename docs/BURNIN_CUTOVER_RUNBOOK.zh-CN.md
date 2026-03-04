# Burn-in 与切换 Runbook（中文）

## 1. 目的
- 在 `core-adapter` 已作为默认路径的前提下，持续观察一致性与回滚能力。
- 在满足门槛后，执行“可放量”判定；若异常则可 1 分钟内回滚到 legacy 路径。

## 2. 固定开关与关键键名
- 默认策略：`engine_adapter_default=core-adapter`
- 强制回滚键：`engine_adapter_force_legacy`
  - `1`：强制 legacy
  - 空/删除：恢复默认策略

## 3. 提交前最小门禁
1. `npm run verify:burnin`
2. `npm run verify:refactor:ci`
3. `npm run verify:rollback-drill`
4. `npm run report:burnin-log`（查看 burn-in 日志完整度）

说明：
- `verify:burnin` 只覆盖 burn-in/canary/adapter 关键链路。
- `verify:refactor:ci` 覆盖 `audit + unit + smoke(分片) + build`。
- `verify:rollback-drill` 覆盖 `emergency_rollback -> resume_canary/reset_policy` 关键回滚链路。
- `report:burnin-log` 输出日志统计（daily/rollback/gates），用于快速判断是否已接近放量门槛。

## 4. 日常观测步骤（建议每日一次）
1. 打开 `history.html`，确认 Burn-in 面板可渲染。
2. 记录以下指标：
   - 可比较样本数（comparable）
   - 不一致率（mismatch rate）
   - 连续窗口通过率（sustained pass）
   - Top 模式不一致（top mismatch modes）
   - readiness 文案（可切换/观察中/阻塞）
3. 打开 canary 面板，确认状态栏展示：
   - 生效来源
   - 默认策略
   - `storage(engine_adapter_force_legacy)` 值

## 5. 切换准入门槛（M5）
- 连续 7 天观察窗口，且会话量建议 `>= 1000`。
- P0 回归数：`0`
- 不一致率：连续窗口稳定低于阈值（建议 `< 0.5%`）。
- readiness 必须处于“可切换”。

## 6. 回滚演练（每周至少一次）
1. 进入 `history.html` canary 面板。
2. 点击 `紧急回滚（强制 legacy）`（`data-action='emergency_rollback'`）。
3. 刷新页面，确认：
   - 状态栏含 `storage(engine_adapter_force_legacy)=1`
   - 生效来源显示“强制回滚”
4. 点击 `解除回滚（恢复默认）` 或 `重置策略（回到基线）`。
5. 刷新后确认：
   - `storage(engine_adapter_force_legacy)=-`
   - 生效来源恢复默认路径

## 7. 紧急回滚（线上异常时）
1. 立即设置强制回滚：
   - 浏览器控制台执行：`localStorage.setItem("engine_adapter_force_legacy","1")`
2. 刷新页面并验证状态栏为强制回滚。
3. 同步记录异常时间、影响范围、回滚确认时间。
4. 关闭放量并回到 burn-in 观察状态。

## 8. 证据留存
- 每次观测和演练都在 `docs/BURNIN_EXECUTION_LOG_TEMPLATE.zh-CN.md` 复制一条记录。
- 发布前必须具备：
  - 最近 7 天连续记录
  - 至少一次成功回滚演练记录
  - 最后一轮 `verify:prepush` 通过记录
