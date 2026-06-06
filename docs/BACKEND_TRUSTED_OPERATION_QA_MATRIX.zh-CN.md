# 后端可信运行 QA / 审计验收矩阵

最后更新：2026-04-25

范围：对应 `docs/BACKEND_TRUSTED_OPERATION_TASK_PLAN.zh-CN.md` 中 F（QA / 审计）职责，覆盖 M0 安全止血回归，以及 M2/M3 可信排位、排行榜重算、迁移抽样核对。真实 Cloudflare Worker/API 仓库位于 `G:\2048\2048undo\2048-game-api\2048-game-api`；M0 安全回归已在该仓库补充 `test/m0-security-regression.spec.ts`。本文件保留为跨仓库发布验收清单和 M2/M3 后续自动化映射依据。

## 0. 通用验收约定

- 环境：优先在 staging 执行，生产发布前只允许使用专用测试账号和隔离 mode/challenge。
- 认证头：除负向用例外，统一使用 `Authorization: Bearer <token>`。
- 公开排行榜：指 `GET /api/leaderboard` 或等价公开读接口返回的数据。
- Verified record：指服务端 replay verifier 重算通过，且已写入 records 表的最终记录。
- 审计证据：每条安全拒绝类用例必须保留请求 ID、响应状态、响应 code/message、服务端日志或 `audit_events` 记录。

## 1. M0 安全回归清单

| ID | 风险 | 接口 | 输入 / 操作 | 期望结果 | 必留证据 |
| --- | --- | --- | --- | --- | --- |
| M0-AUTH-001 | 伪造 legacy token 冒充用户 | `GET /api/me` | `Authorization: Bearer <base64({"id":1,"nickname":"admin"})>`，不使用合法签名 | 返回 `401` 或 `403`；不得返回用户资料 | 响应体、认证失败日志、`audit_events.type=auth_token_invalid` |
| M0-AUTH-002 | 伪造 legacy token 读取记录 | `GET /api/records` | 同 M0-AUTH-001 token | 返回 `401` 或 `403`；不得返回任何用户 records | 响应体、查询日志中无 records 泄漏 |
| M0-AUTH-003 | 伪造 legacy token 写分 | `POST /api/score` | 同 M0-AUTH-001 token，body: `{"score":999999999,"mode_key":"standard_4x4_pow2_no_undo"}` | 返回 `401`/`403`；leaderboard 无新增或更新 | 写入前后 leaderboard 快照、审计事件 |
| M0-SCORE-001 | 裸分刷榜 | `POST /api/score` | 合法 token，body 只含 `score`、`mode_key`、`ended_at`，不含有效 replay / verified record 引用 | 请求可返回兼容错误或 accepted=false，但不得影响公开排行榜 | 写入前后 `GET /api/leaderboard?mode=standard_no_undo` 对比 |
| M0-SCORE-002 | 裸分覆盖历史高分 | `POST /api/score` | 合法 token，提交明显高于真实记录的 `score=2147483647` | records / leaderboard / user best score 均不得采纳该分数 | 用户资料和榜单前后快照 |
| M0-SECRET-001 | `AUTH_TOKEN_SECRET` 缺失 | `GET /health` 或服务启动 | staging 删除 / 置空 `AUTH_TOKEN_SECRET` 后启动 | 服务拒绝启动，或 `/health` 返回非 2xx 且标记 auth secret 缺失；不得进入可写状态 | 启动日志、health 响应 |
| M0-SECRET-002 | `RANKED_SESSION_SECRET` 缺失 | `POST /api/ranked-session/start` 或服务启动 | staging 删除 / 置空 `RANKED_SESSION_SECRET` 后启动 | 排位 session 创建被拒绝，或服务健康检查失败；不得回退到 password/OTP pepper | 响应体、配置检查日志 |
| M0-API-001 | 镜像域 API fallback 顺序 | 前端 API base 解析 / 网络请求 | 在 `https://2048next.cn` 打开页面，拦截首个 API 请求 | 第一优先级必须是同源 `/api`；仅同源失败且允许时才 fallback 到 `https://2048next.cn/api` | 浏览器 network HAR、CSP 无跨域错误 |
| M0-API-002 | fallback 开关关闭 | 前端 API base 解析 / 网络请求 | `GAME_API_ALLOW_CROSS_ORIGIN_FALLBACK=false`，同源 `/api` 返回 503 | 不得访问 `https://2048next.cn/api`；UI 显示可理解失败状态 | network HAR、控制台日志 |

M0 发布签字条件：

- M0-AUTH-001/002/003 全部通过。
- M0-SCORE-001/002 全部通过，且 leaderboard 数据前后 hash 一致。
- M0-SECRET-001/002 至少在 staging 完成一次缺失配置演练。
- M0-API-001/002 有浏览器或 Playwright 证据。

## 2. M2 可信排位测试矩阵

| ID | 主题 | 接口 | 输入 / 操作 | 期望结果 | 自动化建议 |
| --- | --- | --- | --- | --- | --- |
| M2-REPLAY-001 | replay 重算通过 | `POST /api/records` | 合法 ranked session；提交真实 replay，客户端同时带 `score`、`steps`、`final_board` | 服务端返回 `verified=true`；响应中的 score/steps/final_board 来自服务端重算 | API 集成测试固定 seed + 固定 replay fixture |
| M2-REPLAY-002 | score 篡改 | `POST /api/records` | replay 不变，客户端 `score` 改为高分 | 服务端忽略客户端 score 或返回 replay mismatch；leaderboard 不采用篡改分 | 断言 record.score 等于 verifier 输出 |
| M2-REPLAY-003 | final_board 篡改 | `POST /api/records` | replay 不变，客户端 `final_board` 改为含 131072 tile | 返回 `400`/`422`，code 为 `REPLAY_MISMATCH` 或等价；写 audit event | fixture + 数据库断言无 record |
| M2-REPLAY-004 | seed/challenge 不匹配 | `POST /api/records` | 使用 session A，提交 challenge B 的 replay | 返回 `400`/`409`；session 不应被 consumed，或按设计标记 failed 并禁止重放 | 断言 ranked_sessions 状态 |
| M2-SESSION-001 | 重复最终提交 | `POST /api/records` | 同一 ranked session 连续提交同一 valid replay 两次 | 第一次成功并 consumed；第二次返回 `409`，不得新增第二条 verified record | 并发和串行各跑一次 |
| M2-SESSION-002 | 并发重复提交 | `POST /api/records` | 对同一 session 并发发起 5 个最终提交 | 只有 1 个成功；其余 `409`/`CONFLICT`；leaderboard 只更新一次 | API 并发测试 + DB 唯一约束断言 |
| M2-SESSION-003 | 过期 session 提交 | `POST /api/records` | 使用已 expired 的 ranked session 提交 valid replay | 返回 `410` 或 `409`；不写 verified record | 使用可控 clock 或短 TTL |
| M2-LEADER-001 | leaderboard 派生 | `GET /api/leaderboard` | 插入 verified record 后读取榜单 | 榜单显示服务端重算分数；排名、mode_bucket、nickname 正确 | record 事务后读取断言 |
| M2-LEADER-002 | 未验证记录隔离 | `GET /api/leaderboard` | 数据库存在 unverified / rejected record | 榜单完全排除 unverified/rejected 记录 | DB fixture + 查询断言 |
| M2-AUDIT-001 | 反作弊审计 | `GET /api/admin/audit-events` 或日志查询 | 触发伪造 token、重复 session、replay mismatch、异常高分 | 每类事件均可按 request_id/user_id/session_id 追踪 | 后台或日志查询测试 |

### 2.1 第三轮 T11-T15 发布门禁矩阵

| 任务 | 测试用例 | 输入 / 操作 | 预期结果 | 负责人 | 发布门禁状态 |
| --- | --- | --- | --- | --- | --- |
| T11 | T11-SCORE-001：`/api/score` 兼容 no-op | 合法 token 调用 `/api/score`，分别提交裸 `score`、伪造高分、`replay_string`、ranked session token | 响应为兼容成功或等价 no-op，包含 `skipped=true`、`reason=verified_record_required`；`scores`、`mode_scores`、leaderboard 和 `ranked_sessions` 均无变化 | B 主责，F 验证，D 复核前端调用影响 | 阻塞正式写榜发布；API 回归、榜单 hash 前后对比、session 状态快照均通过后解除 |
| T11 | T11-RECORDS-001：正式写榜只依赖 `/api/records` | 使用同一账号提交 valid replay 到 `/api/records`，再读取 leaderboard | 生成 verified record；leaderboard 只采纳服务端 verifier 输出；旧 `/api/score` 响应不能提升排名 | B、C 主责，F 验证 | 阻塞 `/api/score` 下线声明；必须证明 `/api/records` 是唯一事实来源 |
| T12 | T12-FAULT-001：record 插入失败故障注入 | 在 `/api/records` final submit 中模拟 `user_records` 插入失败或 D1 写入异常 | ranked session 不得留下 `status=consumed` 且 `final_record_id IS NULL`；响应返回可诊断错误；日志包含 request_id、session_guid、错误阶段 | C 主责，F 验证，E 提供排障口径 | 阻塞 M2 排位写入；故障注入通过后解除 |
| T12 | T12-IDEMPOTENT-001：同 replay 幂等重复提交 | 同一 ranked session 和同一 replay 连续提交两次 | 第二次返回原 record 或明确 duplicate；record 数量不增加；leaderboard 不重复刷新 | C 主责，B 协作，F 验证 | 阻塞并发写入灰度；幂等路径有自动化证据后解除 |
| T12 | T12-CONFLICT-001：并发最终提交 | 对同一 ranked session 并发发起至少 5 个 final submit | 最多 1 个成功；其余返回 `RANKED_SESSION_CONSUMED`、`CONFLICT` 或等价冲突码；无 500；无多条 verified record | C 主责，F 验证 | 阻塞发布门禁；并发测试和数据库断言均通过后解除 |
| T13 | T13-TTL-001：TTL 配置收敛 | 创建 ranked session，读取响应和数据库中的 `issued_at`、`expires_at` 或 `ttl_seconds` | 默认 TTL 为 A 确认的小时级策略；生产最大 TTL 不超过 24 小时；响应字段足够前端判断过期 | C 主责，A 决策，F 验证 | 阻塞排位发布；TTL 决策和 staging 配置证据归档后解除 |
| T13 | T13-EXPIRED-001：过期 session 全链路拒绝 | 使用可控 clock 或短 TTL，让 session 过期后执行 final submit、checkpoint 保存、checkpoint 读取 | final submit 返回 `410`、`RANKED_SESSION_EXPIRED` 或等价错误；不写 verified record；checkpoint 不再恢复为可继续排位状态 | C、D 主责，F 验证 | 阻塞前后端排位验收；过期写入与恢复用例通过后解除 |
| T14 | T14-DEDUPE-001：历史重复盘点与清洗 | 对生产导出或 staging 快照按 `(user_id, mode_key, replay_fingerprint)` 聚合扫描 | 输出重复清单、保留策略和处置结果；同一 fingerprint 最多一条 active verified record | C 主责，E 提供数据，F 验证 | 阻塞唯一约束上线；清洗报告归档后解除 |
| T14 | T14-CONFLICT-001：数据库级 replay 去重 | 并发提交同一用户、同一 mode、同一 replay fingerprint | 数据库唯一约束或等价机制只允许一条 active verified record；冲突请求返回 duplicate/conflict，不返回 500 | C 主责，F 验证 | 阻塞写入扩量；并发冲突测试通过后解除 |
| T15 | T15-SCHEMA-001：生产请求路径无 DDL | production 配置下跑核心路由 smoke，采集 SQL trace 或 D1/Wrangler 日志 | 请求路径不得执行 `CREATE TABLE`、`ALTER TABLE`、`CREATE INDEX`；只允许 schema version check | E 主责，C 实现，F 验证 | 阻塞 production 发布；日志证据归档后解除 |
| T15 | T15-MIGRATION-001：显式 migration 与缺列快速失败 | staging 先执行 migration；再用故意缺列的隔离库启动或请求 health | migration 版本可审计；缺表/缺列/缺索引时快速失败并返回非敏感诊断；不会自动改表 | E 主责，B/C 协作，F 验证 | 阻塞 schema 变更发布；staging 演练通过后解除 |

### 2.2 前端 ranked session TTL 与过期验收项

| ID | 场景 | 操作 | 预期结果 | 负责人 | 门禁 |
| --- | --- | --- | --- | --- | --- |
| FE-RANKED-TTL-001 | 新 session 过期时间接入 | 前端调用 `/api/ranked-session/start`，记录响应中的 `expires_at`、`ttl_seconds` 或等价字段 | 前端保存服务端给出的绝对过期时间；本地状态不得自行延长 TTL；若响应缺失过期字段，排位入口进入可诊断失败状态 | D 主责，C 提供契约，F 验证 | 阻塞 T13 前端验收 |
| FE-RANKED-TTL-002 | 过期 checkpoint 不恢复 | 构造已过期 session 的本地 checkpoint 或让后端返回 `RANKED_SESSION_EXPIRED` | 前端清理本地 ranked session/checkpoint；不展示“继续排位”；提供重新开始排位入口 | D 主责，A 确认体验，F 验证 | 阻塞排位恢复发布 |
| FE-RANKED-TTL-003 | 过期后禁止继续保存 checkpoint | session 过期后触发自动保存或手动保存 checkpoint | 前端停止继续写 ranked checkpoint；后端拒绝时不循环重试；日志保留可排查错误码 | D 主责，C 协作，F 验证 | 阻塞 checkpoint 发布 |
| FE-RANKED-TTL-004 | game over 提交遇到过期 | 过期 session 完成游戏并 final submit，后端返回 `410` 或 `RANKED_SESSION_EXPIRED` | 前端不 fallback 到 `/api/score` 作为正式写榜；清理排位状态并提示重新开始；leaderboard 不更新 | D 主责，B/C 协作，F 验证 | 阻塞 `/api/score` 废弃与 T13 联合验收 |

M2 发布签字条件：

- replay verifier 的输出字段至少覆盖 `score`、`steps`、`final_board`、`seed`、`challenge`。
- ranked session 消费与 record 插入必须在同一数据库事务中，可通过并发重复提交用例证明。
- leaderboard 只读取 verified records 或其派生表，不能直接信任客户端提交字段。
- T11-T15 发布门禁矩阵中对应行必须有测试证据、负责人签字和残余风险记录。

## 3. M3 灰度迁移测试矩阵

| ID | 主题 | 接口 / 数据 | 输入 / 操作 | 期望结果 | 抽样口径 |
| --- | --- | --- | --- | --- | --- |
| M3-MIG-001 | D1 用户导出核对 | users | 从 D1 导出用户并导入新库 | 总数一致；随机样本 id/nickname/created_at 一致；敏感字段按迁移策略处理 | 至少 50 条或 1%，取较大值 |
| M3-MIG-002 | D1 records 导出核对 | records | 导出 records 并导入新库 | 总数一致；样本 score/mode/final_board/ended_at/replay_ref 一致 | Top 100 + 随机 100 + 最近 100 |
| M3-MIG-003 | COS replay 文件核对 | replay 文件 | 下载 COS replay，按 hash/size 写入本地存储 | DB replay hash 与文件 hash 一致；无孤儿 DB 记录、无孤儿 replay 文件 | 全量 hash 汇总；失败列表必须为 0 或有处置单 |
| M3-MIG-004 | 异常旧数据标注 | records/replays | 扫描缺 replay、重复记录、明显伪造高分 | 异常记录被标注 `migration_status` 或输出处置清单；不得进入正式 leaderboard | 全量扫描报告 |
| M3-READ-001 | leaderboard 只读灰度 | `GET /api/leaderboard` | 前端读接口切到新后端 | 新旧接口同条件返回 Top N 一致，允许仅分页 meta 格式差异 | 每个 mode_bucket Top 100 |
| M3-READ-002 | records 只读灰度 | `GET /api/records` | 测试用户读取历史 records | 新旧记录数量、排序、关键字段一致；回滚开关可恢复旧读 | 10 个高活跃用户 + 10 个普通用户 |
| M3-WRITE-001 | 新写入只进新后端 | `POST /api/records` | 灰度账号提交 valid verified record | 新库有记录；旧 Worker/D1 不再写 leaderboard；前端展示正常 | 灰度账号 3 个 mode |
| M3-WRITE-002 | 旧 `/api/score` 下线 | `POST /api/score` | 调用旧写分路径提交裸分 | 返回禁用/兼容失败；新旧 leaderboard 均不变 | 写入前后榜单 hash |
| M3-ROLLBACK-001 | 只读回滚 | API base / 灰度开关 | 将 leaderboard/records 读接口切回旧系统 | 前端读恢复；无缓存污染；用户可继续游戏 | staging 演练一次 |
| M3-ROLLBACK-002 | 写入回滚边界 | 写接口开关 | 灰度写入失败时回滚 | 已成功写入新库的 records 不丢失；不会被旧系统重复采纳 | 对账报告 + 人工签字 |

M3 发布签字条件：

- 迁移抽样报告包含样本生成规则、样本列表、核对 SQL 或脚本输出、失败处置。
- 只读灰度通过后才能切写入灰度；写入灰度通过后才能下线旧写路径。
- 每次切换都有明确回滚开关、回滚验证结果和负责人签字。

## 4. 可自动化落点

当前前端仓库可见测试框架：

- `npm run test:unit`：Vitest，适合纯函数、合约、replay verifier 的 deterministic fixture。
- `npm run test:smoke`：Playwright，适合前端 API base、网络请求顺序、页面提交行为。

真实 API 仓库已补充：

- `G:\2048\2048undo\2048-game-api\2048-game-api\test\m0-security-regression.spec.ts`：覆盖伪造 legacy token、裸 ranked `/api/score` 禁榜、`AUTH_TOKEN_SECRET` 缺失、`RANKED_SESSION_SECRET` 缺失。

后端 M2/M3 接口继续演进后建议新增：

- `tests/integration/backend-trusted-operation.spec.ts`：覆盖 M0-AUTH、M0-SCORE、M2-REPLAY、M2-SESSION、M2-LEADER。
- `tests/fixtures/replays/ranked-valid-*.txt`：固定 seed/challenge 的有效 replay。
- `scripts/migration-sample-audit.mjs`：输出 M3-MIG-001/002/003 的抽样核对报告。

本次未自动化的部分：

- M0-API-001/002 属于前端镜像域 API base / CSP / network 行为，建议由 D 在前端 Playwright 中补充。
- M2/M3 的 session 消费状态表、leaderboard 重算 job、迁移抽样脚本仍依赖后续后端/迁移实现，当前先保留为结构化验收矩阵。

## 5. 主线程建议验证命令

在后端实现接入前，主线程可先运行现有前端/合约回归，确认本次文档变更未伴随业务改动：

```bash
npm run test:unit
npm run test:smoke:runtime-contract
npm run test:smoke:play-replay
```

真实 API 仓库建议追加：

```bash
cd /d G:\2048\2048undo\2048-game-api\2048-game-api
npm test -- test/m0-security-regression.spec.ts
```

后端 M2/M3 实现接入后，建议追加：

```bash
npm run test:integration:backend-trusted-operation
node scripts/migration-sample-audit.mjs --source=d1-export.json --target=postgres --replays=/data/2048/replays
```
