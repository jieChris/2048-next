# T01 冻结 V2 合同和能力开关

**Blocked by:** —
**Repositories:** `2048-next`, `2048-game-api`

## Goal

用 OpenAPI 和共享状态机冻结逐套色板、bootstrap、选择、顺序、幂等结果和 Theme Plaza 细粒度能力，后续 tickets 不再发明接口语义。

## Scope

- 定义稳定 palette ID、完整规范化色板、revision、operation ID、删除标记和同步结果。
- 定义 bootstrap 只返回当前选择和必要的一套自定义色板。
- 定义 library、单套 CRUD、selection、order 和 legacy GET/PUT 行为。
- 定义 reaction/report、save、share/author、auto-publish 能力开关。
- 更新生成类型和合同测试。

## Acceptance

- Web/API 使用同一 OpenAPI，生成类型无 drift。
- 所有错误码、幂等状态和能力依赖有唯一含义。
- 旧 PUT 的切换后错误为 `PALETTE_SYNC_CLIENT_UPGRADE_REQUIRED`。
- 合同明确十套 active 上限，删除标记不占名额。

## Validation

- OpenAPI lint/type generation。
- Web/API 合同单元测试。
- Standards + Spec review。
