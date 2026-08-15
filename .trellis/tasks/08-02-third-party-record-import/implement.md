# 第三方平台游戏记录批量导入：实施计划（已批准）

## 1. 格式研究与适配器

- 固定首批适配器：2048Verse `replay_` 文本、新 VRS `.vrs/.txt`（2x4、3x3、3x4、4x4）、Next 原生 RPL1 `.rpl/.json`；ZIP 只作批量容器。
- 从现有兼容代码与测试素材提取最小真实 fixture，固定平台识别规则、版本边界和可转换字段。
- 为适配器建立最小 fixture，覆盖成功、未知版本、字段缺失和不完整回放。

## 2. Game API

- 扩展导入核心，使其携带来源平台、适配器版本、源文件名和严格验证策略。
- 增加批内 fingerprint/client record ID 去重，并在数据库失败时清理已写入的 replay object。
- 增加 ZIP/单文件候选解析，并固定上传 8 MiB、500 条目、单个候选文件 2 MiB、累计解压 32 MiB、单条目压缩比 100:1 的安全限额。
- 增加第三方批量 preview/commit 管理员接口和审计。
- 保证策略固定为 `normal + beta`，不调用排行榜/成就钩子；补充维护脚本回归测试，证明不会成为 canonical leaderboard 候选。
- 在用户记录与管理员记录查询中投影来源平台字段。
- 更新 OpenAPI 契约。

## 3. Next 管理后台与玩家历史

- 在成绩补录区域增加独立 `external-import` 视图，不复用正式补录弹窗或端点。
- 实现目标用户、单文件/ZIP、原因、自动识别的平台结果、dry-run 表格与确认流程。
- 玩家历史和管理员记录表显示来源平台标记。
- 保持原正式补录工作流不变。

## 4. Validation

- Game API：适配器、ZIP 安全、批量部分成功、去重、`normal + beta` 写入、无排行榜/成就副作用测试。
- Next：管理后台单元测试、独立端口 Smoke、玩家历史来源标记 Smoke。
- 契约：OpenAPI 生成结果、`npm run typecheck`、`npm test`、`npm run audit:service-boundary`、`npm run verify:prepush`。
- 提交前重新阅读 `.trellis/spec/smoke-testing.md` 并执行 `git diff --check`。

## Risk / Rollback Points

- 第三方格式若缺少完整生成方块信息，无法可靠转换为可验证回放，应明确拒绝而非相信分数。
- ZIP 解压边界属于信任边界，必须先完成限额测试再开放生产入口。
- 任何需要改变 `record_era` 或排行榜查询的方案都超出本计划，需重新评审。
