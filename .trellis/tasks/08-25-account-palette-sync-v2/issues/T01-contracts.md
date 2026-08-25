# T01 冻结 V2 合同和能力开关

**Blocked by:** —
**Repositories:** `2048-next`, `2048-game-api`

## Goal

用 OpenAPI 和共享状态机冻结逐套色板、bootstrap、选择、顺序、幂等结果和 Theme Plaza 细粒度能力，后续 tickets 不再发明接口语义。

## Scope

- 定义 UUID v4 stable/operation ID、账号级唯一性、永久 ID 保留和 400 天 operation 响应保留。
- 定义完整规范化色板、权威/服务端/设备私有/命名空间扩展字段归属，以及视觉重复哈希。
- 定义 bootstrap 只返回当前选择和必要的一套自定义色板。
- 定义 library cursor/watermark、reset/full-resync、已知 ID tombstone 查询、单套 CRUD、selection、order 和 legacy GET/PUT 行为。
- 定义 selection LWW、pending compare-and-establish、order canonicalization、conflict-copy selection 和 Theme Plaza duplicate/reference 结果。
- 定义 reaction/report、save、share/author、auto-publish 能力开关。
- 更新生成类型和合同测试。

## Acceptance

- Web `openapi/2048next.v1.yaml` 是 canonical artifact；API CI 校验锁定 Web commit、合同版本和 SHA-256，两个仓库必须断言相同 digest。
- 所有错误码、幂等状态和能力依赖有唯一含义。
- 旧 GET 在 active ≤8 时投影；9–10 时明确返回升级错误，绝不截断。旧 PUT 的切换后错误为 `PALETTE_SYNC_CLIENT_UPGRADE_REQUIRED`。
- 合同明确十套 active 上限，删除标记不占名额。

## Validation

- OpenAPI lint/type generation。
- Web/API 合同单元测试。
- Standards + Spec review。
