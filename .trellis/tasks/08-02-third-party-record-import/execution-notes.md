# Execution Notes

## Status

- User approved the final plan on 2026-08-02.
- Implementation and review are complete in isolated Next and Game API worktrees.
- `2048-ranked` remains untouched and clean at `2016681`.
- At the implementation validation checkpoint, nothing had yet been committed, pushed, or deployed.

## Route Deviation

- 2026-08-02：Trellis skill 要求使用 `.trellis/scripts/task.py create`，但 `origin/main` 与本地仓库均未包含 `.trellis/scripts/task.py` 或 `get_context.py`。采用最保守回退：在隔离 worktree 中手工建立标准 `prd.md`、`design.md`、`implement.md`、`execution-notes.md`，继续执行同等的证据核查与审批门禁；未跳过用户批准，也未写产品代码。
- 2026-08-02：实施阶段的 `trellis-before-dev` 同样要求运行缺失的 `get_context.py` 并读取 `.trellis/spec/guides/index.md`；Next 与 Game API 均没有该脚本/共享指南目录。继续采用最保守回退：主代理手工完整读取两仓 `AGENTS.md`、spec index、Next 的 cross-repo/frontend/smoke 规范及 Game API 的 backend/API contract 规范后再开始代码工作。
- 2026-08-02：Game API 仓库没有 OpenAPI 文件、生成器、脚本或依赖；后续跨仓核查确认 Next 仓库已有 `openapi/2048next.v1.yaml` 作为消费者契约。采用现有机制，在 Next 更新 multipart 路由、响应 schema 与生成类型，不为 Game API 新建第二套文档体系；Game API 继续以 Node route tests 锚定服务端行为。
- 2026-08-02：若 PostgreSQL 在 `COMMIT` 附近断连，提交状态可能无法判定；此时强删回放文件可能破坏一条其实已经提交的记录。采用最保守的数据安全回退：正常 `BEGIN`/事务失败在确认回滚且写入前无引用时清理文件，连接状态不明确时保留文件并依赖孤儿审计，而不冒险删除潜在有效数据。若该极端路径出现可观测积压，再增加持久化孤儿清理队列。
- 2026-08-02：批次汇总审计发生基础设施错误时，各记录及其逐条审计已经分别原子提交，无法再安全整体回滚。采用保守降级：接口返回真实成功结果和 `batch_audit_recorded: false`，后台明确显示告警；逐条审计仍完整保留。只有出现实际汇总审计丢失后，才增加持久化重试队列，避免为未观察到的故障引入新的队列表和运维面。
- 2026-08-02：首次生产 API 发布通过 SSH heredoc 执行 `docker compose run` 时，Compose 读取了标准输入，导致后续容器切换与健康检查命令未被远端 shell 执行。新镜像已成功构建、迁移确认 `applied 0`，生产仍运行旧健康版本 `bc592fc`，未发生半切换。采用最保守回退：先从公网确认旧版本仍健康，再将容器切换与验收拆成不依赖标准输入的独立 SSH 命令；后续远程迁移命令使用 `-T` 避免再次消费脚本输入。
- 2026-08-02：Next PR 首轮 CI 的全量页面 Smoke 在既有 `pages-replay-lock` 英文提示用例失败；本 PR 未修改锁或语言运行时，本地对该用例连续重复 30 次复现同样竞态 1 次（29 通过、1 失败）。CI trace 与延迟 i18n 脚本的定向复现显示，失败时第二页的 `localStorage` 已为 `en`，但 Web Locks 冲突回调早于位于脚本队列末尾的 i18n 初始化；`CoreBootstrapRuntime` 的语言兜底只读 `UII18N`/HTML、漏读现有语言存储，因而偶发使用中文。采用保守回退：不在导入功能 PR 中夹带无关产品代码修复，记录证据后重新执行完整 CI；若同一失败重复出现，再单独审批修复 bootstrap 的统一语言解析路径。
- 2026-08-03：生产验收发现 Cloudflare 边缘曾缓存旧的 `/admin.html` 404 回退对象，并向无 Cookie 请求重放异常 HTTP 200 状态；响应正文哈希仍对应 404 页面，未发现管理员 HTML 泄漏。加唯一查询参数的 MISS 请求返回预期 HTTP 404，且源站与服务器边缘代理均为 404，确认源站管理员门禁正确。采用最保守处置：在自托管生产部署后增加无 Cookie `/admin.html` 必须返回 404 的公网探针；Cloudflare 永久 Bypass Cache 规则及已有缓存清理因当前凭证没有 Cache Rules/Purge 写权限，仍需在外部 Cloudflare 控制台完成。

## Evidence Log

- Existing official admin import UI: `src/pages/admin-page.ts:756-809`.
- Existing batch replay import core: `2048-game-api/scripts/import-user-replay-records.ts:432-470`.
- Existing official admin import API: `2048-game-api/src/server/app.ts:6269-6331`.
- Existing beta record UI behavior: `tests/smoke/pages-user-profile-title.smoke.spec.ts:1168-1315`.
- Existing 2048Verse/VRS compatibility decoders: `js/core_game_manager_replay_helpers_runtime.js:2822-3231`.
- Public compatibility statement: `js/announcement_records.js:189-191`.
- Existing TypeScript VRS and 2048Verse parsers: `src/bootstrap/game-manager-replay-helpers-runtime.ts:516-576,804-876`.
- Noncompetitive boundary corrected after maintenance-path audit: use `normal + beta` without an `afterInsert` hook. `migration + beta` is excluded by online queries but can still be picked up by canonical leaderboard maintenance scripts that key on source alone.
- Planning simplification: preview does not persist a batch token; confirm re-uploads the same browser `File` and the backend revalidates it.
- User-confirmed initial formats: 2048Verse `replay_`, new VRS `.vrs/.txt` for 2x4/3x3/3x4/4x4, Next native RPL1 `.rpl/.json`, and ZIP as the batch container. Legacy v9 `.rpl` remains deferred.
- Initial archive limits fixed for implementation review: 8 MiB upload, 500 entries, 2 MiB per file, 32 MiB total decompressed data, and 100:1 maximum per-entry compression ratio.
- PRD convergence pass and independent read-only review completed with no blocking questions or scope contradictions remaining.
- Independent implementation reviews found and closed batch-dedup ordering, replay cleanup, logical-item limits, CRC32, preview/storage size parity, audit failure semantics, OpenAPI bounds, and zero-based UI index coverage issues.

## Validation

### 2048 Next

- `PW_WEB_PORT=43994 npm run verify:prepush`: PASS; 299 unit files / 1883 tests, 41 critical Smoke tests, build, and all refactor/architecture audits passed.
- `npm run verify:api`: PASS; generated types match `openapi/2048next.v1.yaml`, 21 contract/client tests passed.
- `PW_WEB_PORT=43995 ... pages-admin-console ... pages-user-profile-title`: PASS, 19/19 on the isolated worktree.
- Admin guard deployment hotfix: workflow YAML and embedded remote Bash parse successfully; `tests/unit/nginx-cache-policy.spec.ts` passes 5/5; direct origin plus the public bare URL, unique probe URL, and all 10 declared `?view=` routes return HTTP 404 without cookies.
- `git diff --check`: PASS.

### 2048 Game API

- `npm run typecheck`: PASS for server and scripts.
- `npm run test:node`: PASS, 37 files / 337 tests.
- `npm test`: PASS, 4 Worker-compatibility files / 59 tests.
- Targeted import/parser/admin suite: PASS, 33/33.
- `git diff --check` plus explicit checks for the two untracked new files: PASS.
- `npm audit --omit=dev`: reports the pre-existing moderate `@hono/node-server` advisory only; the new `yauzl` dependency introduced no advisory. No automatic audit fix was run.

### Trellis Check

- Re-read task artifacts and both repositories' applicable specs; cross-layer ownership, data flow, API/schema propagation, error handling, dependency direction, and test coverage conform.
- Neither repository defines an npm `lint` script; typecheck, repository audits, full tests, targeted tests, generated-contract drift checks, and whitespace checks were used as the available quality gates.
- Updated the permanent backend contract and Smoke locator guidance with reusable rules discovered during implementation.
