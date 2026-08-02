# 第三方平台游戏记录批量导入：技术设计

## Boundary

- `2048-game-api` 负责文件格式识别、平台适配、回放转换、服务端验证、去重、持久化、审计和非排行榜保证。
- `2048-next` 只负责管理员上传、dry-run 结果展示、确认提交及玩家历史来源标记。
- 不在 `2048-ranked` 增加实现。

## Reuse First

- 复用 `importUserReplayRecords()` 的逐条准备、验证、去重和写入循环。
- 复用现有 2048Verse、新 VRS 和原生 RPL1 解码规则的行为与 fixtures，但把需要的纯解析逻辑迁入 Game API 适配器；不让管理后台依赖完整 GameManager 页面运行时。
- 第三方策略使用 `source = normal`、`recordEra = beta`，不传排行榜或成就 `afterInsert` 钩子。平台真实来源由结构化 metadata 表达；不使用 `migration`，避免现有 canonical leaderboard 维护脚本把它当作竞争候选。
- 来源元数据优先写入现有 `verification_summary` 与回放 envelope，并由查询投影为 `source_platform` 等字段；若查询/索引需求没有证据，不新增数据库列。
- 复用现有玩家历史 beta 只读行为，但将可见徽标改为来源优先：存在 `source_platform_name` 时显示“第三方 · 平台名”，否则仍显示“内测成绩”。

## Proposed Flow

1. 管理员选择目标用户、文件和原因；平台由命中的适配器确定，避免手工标记与实际格式不一致。
2. `POST /api/admin/users/{id}/third-party-record-import/preview` 以 multipart 接收原文件，解析单文件或 ZIP。
3. 平台适配器把每个候选文件转换为 `ReplayImportRow`；不支持项形成 rejected 明细。
4. `importUserReplayRecords(commit: false)` 进行服务端验证和去重，返回预览。
5. 文件或目标玩家变化时前端清空预览；管理员确认后用当前浏览器 `File` 提交到 `POST /api/admin/users/{id}/third-party-record-import/commit`。服务端重新解析、验证与去重，再以 `normal + beta` 策略逐条写入。首版不保存临时批次或 token。
6. 玩家历史查询从 `verification_summary` 投影来源平台信息；前端渲染来源徽标。

## Adapter Contract

首批注册三个适配器：2048Verse `replay_` 文本、新 VRS `.vrs/.txt`（2x4、3x3、3x4、4x4）和 Next 原生 RPL1 `.rpl/.json`。ZIP 只负责枚举其中的候选文件。旧 v9 `.rpl` 及其他第三方格式不做启发式兼容。

适配器至少返回：

- `platformId`、`platformName`、`adapterVersion`
- `sourceFilename`
- 原生 `replay_string` 或可无损转换为原生回放所需的完整初始盘面、移动、生成方块与计时信息
- 可选 `ended_at`、`client_record_id`

只有能构造并通过现有服务端验证器的记录才可入库。只有终盘截图、最终分数或缺少生成方块序列的历史摘要不支持导入。

## Stored Metadata

不新增表或列。每条记录在现有 `verification_summary` 与 replay envelope 中保存：

- `source_platform_id`
- `source_platform_name`
- `source_adapter_version`
- `source_filename`
- `source_note`

查询接口只投影这些字段；现有 fingerprint 与 client record ID 仍是幂等键。

## Batch Semantics

- 预览与提交均逐项处理，允许有效项成功、无效项失败。
- 每条记录自身事务化；数据库写入失败时复用 replay storage 清理能力，失败不得留下记录或 replay object 引用。
- 数据库去重之外增加批内 fingerprint 与 client record ID 集合，预览和提交均拒绝同一上传中的重复项。
- 批次记录输入摘要、计数和管理员原因，单条记录保留来源文件与适配器元数据。
- 第三方适配器输出默认走严格验证；只有格式契约明确包含可忽略的 no-op 时，才允许适配器在转换阶段规范化，不能全局放宽 verifier。

## Archive Safety

- 只支持 ZIP；禁止嵌套 ZIP、加密条目、符号链接语义和路径穿越。
- 首版固定上限：上传 8 MiB、最多 500 个条目、单个候选文件 2 MiB、累计解压 32 MiB、单条目压缩比 100:1；容器结构违规或任一上限命中即拒绝整个容器，不进入记录写入阶段。
- ZIP 解析依赖放在 Game API，选择最小纯 JavaScript 实现；不得在前端引入 JSZip，也不得自写完整 ZIP 解析器。

## Compatibility and Rollback

- 不改变现有 `/record-import` 正式补录接口。
- 新记录仍属于现有 `beta` 非正式边界，旧客户端会继续把它们当作只读非正式记录。
- 回滚前端入口和新 API 不影响已导入记录；来源元数据仍保存在记录摘要和回放 envelope 中。
