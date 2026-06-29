# 2048 Next 接口管理规范

本文档定义前端仓库内的接口管理闭环。目标是让接口契约、类型、文档和测试始终同步，避免后续功能扩展时出现“前端调用、后端实现、文档描述”三者不一致。

## 接口契约源

- 唯一契约源：`openapi/2048next.v1.yaml`
- 生成类型：`src/services/generated-api/2048next-v1.ts`
- 人工可读文档页：`api-docs.html`
- 成就系统、ranked 对局、排行榜、记录、账号、救援和管理后台接口都必须进入 OpenAPI 契约后再接入调用代码。

## 常用命令

- `npm run api:types`：根据 `openapi/2048next.v1.yaml` 重新生成 TypeScript 接口类型。
- `npm run api:types:check`：检查生成类型是否与 OpenAPI 契约同步。该命令只检查，不写入仓库文件。
- `npm run api:docs`：本地启动接口文档页，打开 `/api-docs.html`。
- `npm run verify:api`：运行接口管理相关的同步检查、契约测试和 typed service 测试。
- `npm run build`：生产构建，同时把 `openapi/` 复制到 `dist/openapi/`，保证线上文档页读取同一份契约。

## 变更流程

1. 先修改 `openapi/2048next.v1.yaml`，补齐 path、method、summary、tags、requestBody、responses 和 schema。
2. 运行 `npm run api:types` 生成最新类型。
3. 新增或修改 `src/services/*` 中的 typed service，优先通过 `createTypedApiClient` 调用已登记路径。
4. 为新增 service 或关键契约规则补单元测试。
5. 运行 `npm run verify:api`。
6. 若接口会影响游戏保存、ranked 合法性、排行榜提交或账号权限，再补对应 smoke 或运行现有关键 smoke。

## 兼容性要求

- 已上线字段不能直接改名或删除；需要新增字段并保留旧字段一段兼容期。
- 旧接口要保留 `deprecated: true` 标记，并在 summary 中说明替代接口。
- 排行榜、记录提交、ranked session、ranked checkpoint 这类核心接口必须返回稳定的 `success`、`code`、`error` 或 `message` 字段，便于前端降级和重试。
- OpenAPI 中的请求体要优先使用 `additionalProperties: false`，但历史兼容接口可以保留 `additionalProperties: true`。
- 管理端接口必须挂 `Admin` tag；超级管理员专用能力要在 description 中明确。
- 成就展示位上限必须在契约、service 和后端同时保持为 3。

## 文档页约束

- `api-docs.html` 只读取 `openapi/2048next.v1.yaml`，不调用业务接口。
- 文档页不依赖 CDN，CSP 限制为 `script-src 'self'`，避免线上被安全策略拦截。
- Vite 构建必须包含 `api_docs` 入口，并通过 `copyOpenApiContractPlugin` 把契约复制到 `dist/openapi/`。

## 上线前检查

接口相关改动上线前至少执行：

```bash
npm run verify:api
npm run build
```

如果改动涉及真实游戏提交或 ranked 对局，还要按影响范围追加：

```bash
npm run test:smoke:critical
```

## 后端协作要求

- 后端新增接口前，先对齐 OpenAPI path 和 schema。
- 后端错误码要写入接口契约或维护文档，前端不得依赖未登记的临时错误字符串。
- 后端表结构变更如果影响接口响应字段，必须同步更新 OpenAPI、生成类型和相关测试。
