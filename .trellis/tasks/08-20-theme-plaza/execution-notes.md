# Execution Notes

## Route Deviation

- PRD 要求 Android format:3 兼容后再开放写操作。
- Android 仓库当前位于 `claude/app-migration` 且包含与本功能无关的未提交 CI 改动，不符合在 `main` 干净工作树开发的仓库纪律。
- 用户选择“Web/API 先行”。因此本轮没有修改 Android，全部生产开关默认关闭；只读和写入代码路径可测试，但不能宣称生产写功能已具备开放条件。

## Verification

- API targeted Theme Plaza tests、typecheck。
- Web targeted unit、OpenAPI drift、生产构建、service-boundary audit。
- Pages Smoke（包含 Theme Plaza）。
- Public/Admin Theme Plaza 4 个视口 × 浅色/夜间视觉基线。

## Residual Gates

1. 在干净 Android `main` 实施 format:3 并通过未知字段无损写回合同。
2. 使用迁移后的真实 PostgreSQL 跑首次分享、并发保存、容量满与回滚测试。
3. 配置 DeepSeek 影子审核并人工核对样本。
4. 用户再次明确授权后，按顺序打开 read、write、auto-publish 开关。
