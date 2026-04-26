# 后端可信运行第二轮进度整合

最后更新：2026-04-25

## 仓库范围

- 前端 repo：`G:\2048\2048undo\2048-next`
- API repo：`G:\2048\2048undo\2048-game-api\2048-game-api`

本文档整合多轮 agents 协作后的当前状态。业务实现分别落在前端 repo 与 API repo，详见下方文件清单。

## 第一轮新增文档位置

- API base 兼容说明：`G:\2048\2048undo\2048-next\docs\API_BASE_COMPATIBILITY.zh-CN.md`
- QA / 审计验收矩阵：`G:\2048\2048undo\2048-next\docs\BACKEND_TRUSTED_OPERATION_QA_MATRIX.zh-CN.md`
- SRE / 迁移运行手册草案：`G:\2048\2048undo\2048-next\docs\SRE_GAME_DATA_OPERATIONS_RUNBOOK.zh-CN.md`
- 可信排位与排行榜 schema 草案：`G:\2048\2048undo\2048-game-api\2048-game-api\docs\TRUSTED_RANKING_SCHEMA_V1.zh-CN.md`

## M0 状态

已完成或已有第一轮交付物：

- API repo 已补充 M0 安全回归测试文件：`G:\2048\2048undo\2048-game-api\2048-game-api\test\m0-security-regression.spec.ts`。
- API README 已记录当前 token 为 HMAC-SHA256 签名 token，旧 legacy token 不再接受。
- API README 已列出 `AUTH_TOKEN_SECRET` 与 `RANKED_SESSION_SECRET`，且要求二者独立配置。
- 前端已新增 API base 兼容说明，记录同源 `/api` 优先和远端 fallback 策略。
- 前端已新增 QA/SRE 文档，覆盖 M0 安全回归、M2/M3 可信排位与迁移验收口径。

已由主线程验证：

- API repo `npm test`：2 个测试文件、45 个测试通过。
- API repo `npx tsc --noEmit`：通过。
- API repo D1 baseline：`npx wrangler d1 execute _2048_scores --local --persist-to .wrangler\tmp-d1-schema-check-final --file migrations/d1/0001_current_worker_schema.sql` 通过，38 条命令执行成功。
- API repo D1 baseline 破坏性语句扫描：无 `INSERT/UPDATE/DELETE/DROP/TRUNCATE/REPLACE` 输出。
- 前端 repo `npx vitest run tests/unit/api-shared-utils.spec.ts tests/unit/ranked-session-api-base.spec.ts`：2 个测试文件、7 个测试通过。
- 前端 repo `npm run build`：通过。

仍需线上/运维确认：

- staging / production 需要在 Cloudflare 环境中配置真实 `AUTH_TOKEN_SECRET` 与 `RANKED_SESSION_SECRET`，仓库内不能保存真实值。
- Wrangler 当前对 `secrets.required` 提示 experimental；本地 `.dev.vars` / `.env` 未配置必填 secret 时会有 warning。
- 裸 `/api/score` 不刷榜已经有回归测试覆盖，但线上切换前仍建议保存榜单前后快照。
- 前端 CSP 与跨域 fallback 行为仍建议在真实 staging 域名用浏览器复核。

## 第二轮推进标记

第二轮已推进并通过本地验证的事项：

- ranked session 服务端状态：`/api/ranked-session/start` 已写入 D1 `ranked_sessions`；第三轮后 `/api/score` 固定为兼容 no-op，不再消费 session；`/api/records` 负责最终 verified record 与 session 消费。
- D1 migration：API repo 已新增 `migrations/d1/0001_current_worker_schema.sql`，覆盖当前 Worker 运行时表，并用 Wrangler 本地执行验证通过。
- 新 schema / migration：API repo 已新增 Postgres 目标 schema 草案，作为后续独立后端迁移参考。

## 第三轮任务状态模板（2026-04-25 起）

状态值统一使用：`未开始`、`进行中`、`待复审`、`已完成`、`阻塞`。每个任务完成或复审后只更新自己的行；不要覆盖其他 worker 已填写的改动文件、测试结果或残余风险。

| 编号 | 负责人 | 当前状态 | 改动文件 | 测试命令 | 测试结果 | 残余风险 | 发布门禁 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T11 | B | 已完成 | API repo：`src/index.ts`、`test/index.spec.ts`；前端 repo：`js/online_leaderboard_runtime.js`、`tests/unit/online-leaderboard-runtime-submit.spec.ts`、`docs/API_BASE_COMPATIBILITY.zh-CN.md` | API repo：`npm test`；前端 repo：`npm exec vitest run tests/unit/api-shared-utils.spec.ts tests/unit/ranked-session-api-base.spec.ts tests/unit/online-leaderboard-runtime-submit.spec.ts`、`npm run build` | 通过；API 2 文件 / 48 测试，前端 3 文件 / 9 测试，build 通过 | 旧客户端仍可调用 `/api/score`，但只得到 `verified_record_required` no-op；正式榜单依赖 `/api/records` | `/api/score` 不写榜、不消费 session；`/api/records` 正常派生 leaderboard |
| T12 | C | 已完成 | API repo：`src/index.ts`、`test/index.spec.ts`、`migrations/d1/0001_current_worker_schema.sql` | API repo：`npx tsc --noEmit`、`npm test`、`npx wrangler d1 execute _2048_scores --local --persist-to .wrangler\tmp-d1-schema-check-third-round --file migrations/d1/0001_current_worker_schema.sql` | 通过；D1 baseline 38 条命令成功 | COS 上传仍在 D1 事务外；D1 内 record insert 与 session consumed 已用 batch 收敛，失败时保留 `finalizing + final_error` 供修复 | 无 consumed + null record；重复提交幂等；并发最多一个成功 |
| T13 | C | 已完成 | API repo：`src/index.ts`、`test/index.spec.ts`；前端 repo：`js/online_leaderboard_runtime.js`、`tests/unit/online-leaderboard-runtime-submit.spec.ts`、QA/SRE 文档 | API repo：`npm test`；前端 repo：`npm exec vitest run ...online-leaderboard-runtime-submit.spec.ts`、`npm run build` | 通过 | 默认 TTL 已改为 2 小时、最大 24 小时；仍需 A 最终确认生产体验值 | 过期 session 不能提交、保存或恢复；前端提示重新开始 |
| T14 | C | 待填写 | 待填写；记录 replay fingerprint 清洗、索引或约束文件 | 待填写；包含历史重复扫描和并发 duplicate/conflict | 待填写 | 待填写；特别记录历史重复数据处置 | active verified replay fingerprint 唯一；冲突不产生 500 |
| T15 | E | 待复审 | 只读盘点已完成；待实现文件预计为 API repo `src/index.ts`、D1 migration、wrangler/env 配置 | 已完成只读 DDL 盘点；尚未实现 production `check` 模式测试 | 盘点完成，未改代码 | 当前请求路径仍有 `CREATE/ALTER/CREATE INDEX`；需要下一轮拆 `auto bootstrap` 与 schema check | production 请求路径无 DDL；schema 变更只走显式 migration |
| T16 | F | 已完成 | 前端 repo：`docs/BACKEND_TRUSTED_OPERATION_QA_MATRIX.zh-CN.md`、`docs/SRE_GAME_DATA_OPERATIONS_RUNBOOK.zh-CN.md`、`docs/API_BASE_COMPATIBILITY.zh-CN.md`、本进度文档 | 文档内容复核；代码验证随 T11-T13 主线程执行 | 已纳入 T11-T15 QA/SRE/API 兼容和进度表 | 未单独跑 Markdown lint；以内容复核和代码测试收口 | T11-T15 已纳入 QA / SRE / API 兼容和发布门禁 |

每次填报至少保留：

- 改动文件：使用仓库绝对路径或从 repo 根开始的相对路径，明确前端 repo 与 API repo。
- 测试命令：写完整命令和执行目录；未执行时写明原因。
- 测试结果：写通过、失败或未执行，并贴关键失败摘要。
- 残余风险：写仍需谁确认、是否阻塞发布、是否需要线上/运维操作。

## 发现的不一致

- 前端任务计划与新增中文文档应统一按 UTF-8 读取和维护；PowerShell 默认编码读取时可能出现显示乱码。
- API README 的说明段仍记录 `mode_scores`、`user_records` 会在请求中自动创建；这符合当前 Worker/D1 现状，但与长期目标“生产 schema 变更必须走显式 migration”不一致，已在 SRE/schema 文档中标为迁移风险。
- API repo 当前的 COS 上传仍在 D1 事务外；D1 内 record insert、ranked session consumed、leaderboard 同步已经用 batch 收敛。长期仍应收敛到独立后端事务边界和可审计 repair job。
