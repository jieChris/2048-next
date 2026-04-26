# 游戏数据后端 SRE 运行手册草案

最后更新：2026-04-25

## 1. 范围

本文档覆盖 `BACKEND_TRUSTED_OPERATION_TASK_PLAN.zh-CN.md` 中 E 角色负责的 M1、M3、M4 交付物：

- 新游戏数据后端的环境变量与 secret 清单。
- Caddy / Nginx 反代草案。
- Postgres 与 replay 文件的备份、恢复、演练流程。
- D1 / COS 到 Postgres / 本地 replay 存储的迁移 checklist。
- 日志、监控、告警与回滚要求。

本文档不包含真实生产凭据，不执行真实 Cloudflare、COS 或生产数据库操作。

## 2. 目标架构

短期保留 Cloudflare 作为 DNS / CDN / WAF / 认证边界，游戏数据链路迁移到独立服务器：

- 静态站点：`/var/www/2048-next/current`，由现有 GitHub Actions 发布 `dist/`。
- 游戏数据 API：监听本机 `127.0.0.1:3000`，通过 `/api/*` 对外暴露。
- 数据库：Postgres。
- replay 文件：服务器本地目录，例如 `/data/2048/replays`。
- 备份目录：例如 `/data/2048/backups`，再同步到异地对象存储或备份机。

## 3. 现有 Cloudflare Worker / D1 / COS 盘点

真实 API 仓库位于：

- `G:\2048\2048undo\2048-game-api\2048-game-api`

前端仓库的 `scripts/dev-local.mjs` 默认使用该路径作为 `LOCAL_API_DIR`，并启动：

- API：`npx wrangler dev --port 8787 --local --persist-to <api_repo>/.wrangler/state/dev-local`
- Web：`npm run dev -- --port 5173`
- Vite 代理：`VITE_API_PROXY_TARGET` 默认指向 `http://127.0.0.1:8787`

### 3.1 wrangler 现状

API repo 使用 `wrangler.jsonc`，关键配置如下：

| 项 | 现状 |
| --- | --- |
| Worker name | `2048-game-api` |
| entry | `src/index.ts` |
| compatibility date | `2026-03-10` |
| compatibility flags | `nodejs_compat` |
| observability | enabled |
| D1 binding | `_2048_scores` |
| D1 database | `2048_scores` |
| D1 database id | `d3a45837-cced-438c-abad-e37b9912944e` |
| D1 remote | `true` |
| routes | `taihe.fun/api`, `taihe.fun/api/*`, `2048next.cn/api`, `2048next.cn/api/*` |

非敏感 vars 已在 `wrangler.jsonc` 中配置：

| 变量 | 当前用途 |
| --- | --- |
| `COS_BUCKET` | 腾讯 COS bucket |
| `COS_REGION` | 腾讯 COS region |
| `COS_REPLAY_PREFIX` | replay 对象前缀，当前为 `replays/v1/` |
| `COS_SIGN_EXPIRES` | COS 签名 URL 有效期 |
| `COS_DOWNLOAD_MODE` | replay 下载方式，当前为 `signed_url` |
| `BREVO_SENDER_EMAIL` | 注册邮件发件地址 |
| `BREVO_SENDER_NAME` | 注册邮件发件名称 |

敏感项通过 `wrangler secret` 或本地 `.dev.vars` 提供，仓库内不能记录真实值：

| 变量 | 当前用途 | 迁移要求 |
| --- | --- | --- |
| `COS_SECRET_ID` | COS 签名、下载、上传 | 迁移工具只需只读权限，生产 API 写权限应独立 |
| `COS_SECRET_KEY` | COS 签名、下载、上传 | 同上 |
| `AUTH_TOKEN_SECRET` | 登录 token 签名 | 新后端校验旧 token 前必须确认签名格式 |
| `RANKED_SESSION_SECRET` | ranked session token 签名 | 必须与 `AUTH_TOKEN_SECRET` 独立 |
| `BREVO_API_KEY` | 邮件服务 | 若认证仍留在 Worker，新游戏后端不需要 |
| `TURNSTILE_SECRET` | 注册防刷 | 若认证仍留在 Worker，新游戏后端不需要 |
| `OTP_PEPPER` | OTP / captcha hash | 仅认证链路使用 |
| `PASSWORD_PEPPER` | 密码 hash | 仅认证链路使用 |

API repo 当前本地 `.dev.vars` 只包含 `COS_SECRET_ID`、`COS_SECRET_KEY` 两个变量名。生产 secret 完整性需要上线前通过 `wrangler secret list` 或 Cloudflare 控制台人工确认。

### 3.2 当前 API 路由

现有 Worker 暴露的路由包括：

- 健康检查：`GET /api`
- 注册登录：`GET /api/login/captcha`、`GET /api/register/check-nickname`、`POST /api/register/start`、`POST /api/register/verify`、`POST /api/register`、`POST /api/login`
- 密码：`POST /api/password/reset/start`、`POST /api/password/reset/verify`、`POST /api/password/change`
- 游戏写入：`POST /api/score`、`POST /api/records`
- 排位：`POST /api/ranked-session/start`、`GET /api/ranked-checkpoint`、`POST /api/ranked-checkpoint`、`DELETE /api/ranked-checkpoint`
- 记录读取与恢复：`GET /api/user/:id/records`、`GET /api/replay/version`、`GET /api/records/:id/replay`、`DELETE /api/records/:id`、`POST /api/records/:id/restore`
- 榜单与用户：`GET /api/leaderboard`、`GET /api/leaderboard/modes`、`GET /api/user/:id`、`GET /api/me`
- relay：`GET /api/relay/cases`、`POST /api/relay/cases/:id/create`、`GET /api/relay/cases/:id/snapshot`、`GET /api/relay/cases/:id/replay`、`POST /api/relay/cases/:id/request-claim`、`POST /api/relay/cases/:id/claim`、`POST /api/relay/cases/:id/heartbeat`、`POST /api/relay/cases/:id/submit`、`POST /api/relay/cases/:id/designate-target`、`POST /api/relay/cases/:id/handoff`、`POST /api/relay/cases/:id/release`、`POST /api/relay/cases/:id/delete`

M3 灰度需要特别确认 relay 是否纳入本轮迁移。若不纳入，反代规则必须继续把 `/api/relay/*` 留在旧 Worker。

### 3.3 当前 D1 表与 schema drift 风险

API repo 当前没有独立 `migrations/` 目录，表结构主要在 `src/index.ts` 的 `ensure*Table` 函数中通过请求路径自动创建或 `ALTER TABLE`：

| 表 | 主要用途 | 当前建表方式 |
| --- | --- | --- |
| `users` | 账号、邮箱、昵称、密码 hash | 请求中 `CREATE TABLE IF NOT EXISTS` |
| `scores` | legacy 全局最高分 | 请求中 `CREATE TABLE IF NOT EXISTS` |
| `registration_verifications` | 注册验证码 | 请求中 `CREATE TABLE IF NOT EXISTS` |
| `password_reset_verifications` | 密码重置验证码 | 请求中 `CREATE TABLE IF NOT EXISTS` |
| `registration_rate_limits` | 注册限流 | 请求中 `CREATE TABLE IF NOT EXISTS` |
| `image_captchas` | 图片验证码 | 请求中 `CREATE TABLE IF NOT EXISTS` |
| `login_attempt_counters` | 登录失败计数 | 请求中 `CREATE TABLE IF NOT EXISTS` |
| `mode_scores` | 模式榜单 | 请求中 `CREATE TABLE IF NOT EXISTS` + best-effort `ALTER TABLE` |
| `user_records` | 对局记录与 replay 元数据 | 请求中 `CREATE TABLE IF NOT EXISTS` + best-effort `ALTER TABLE` |
| `ranked_checkpoints` | 排位 checkpoint | 请求中 `CREATE TABLE IF NOT EXISTS` |
| `relay_cases` | relay 档案、持有、快照、replay chain | 请求中 `CREATE TABLE IF NOT EXISTS` + best-effort `ALTER TABLE` |

迁移风险：

- 生产 schema 可能与源码期望不完全一致，不能只凭源码生成 Postgres schema。
- D1 导出前必须执行 `PRAGMA table_info(<table>)` 和 index 盘点，并归档到 migration manifest。
- 新 Postgres schema 必须走显式 migration，不继承“请求时自动改表”的模式。
- `scores` 与 `mode_scores` 是派生榜单，迁移后应能从 verified `user_records` 重建，不能作为唯一事实来源。

### 3.4 COS replay 现状

当前 COS 客户端在 API repo 的 `src/cos.ts` 中实现：

- bucket host 格式：`<COS_BUCKET>.cos.<COS_REGION>.myqcloud.com`
- 默认 replay prefix：`replays/v1`
- 当前 wrangler vars prefix：`replays/v1/`
- replay object key 格式：`<prefix>/<mode_bucket>/<yyyy>/<mm>/<dd>/<record_id>.json`
- 上传返回并在 D1 保存：`replay_object_key`、`replay_size`、`replay_sha1`
- 读取支持 Worker 代理读取或 signed URL，取决于 `COS_DOWNLOAD_MODE`

迁移要求：

- COS 下载 manifest 必须以 `user_records.replay_object_key` 为源 key。
- 当前旧 hash 是 `replay_sha1`；新本地存储建议使用 `sha256`，manifest 同时记录旧 `sha1` 与新 `sha256`。
- replay 文件内容参与服务器端 verifier 后，才允许进入新 leaderboard 派生流程。

### 3.5 源端导出命令草案

以下命令是迁移机上的设计草案，不在本文档中执行：

```bash
cd G:/2048/2048undo/2048-game-api/2048-game-api

# 导出远端 D1 SQL。生产执行前必须确认 wrangler 登录账号和目标 database。
npx wrangler d1 export 2048_scores --remote --output "$MIGRATION_WORKDIR/d1-export.sql"

# 只读盘点表结构。可按表重复执行并保存输出。
npx wrangler d1 execute 2048_scores --remote --command "PRAGMA table_info(user_records);"
npx wrangler d1 execute 2048_scores --remote --command "PRAGMA index_list(user_records);"

# 行数盘点。
npx wrangler d1 execute 2048_scores --remote --command "select 'users' as table_name, count(*) as rows from users union all select 'user_records', count(*) from user_records union all select 'mode_scores', count(*) from mode_scores union all select 'ranked_checkpoints', count(*) from ranked_checkpoints union all select 'relay_cases', count(*) from relay_cases;"
```

若 Cloudflare 当前账号没有 `d1 export` 权限，使用按表 `SELECT` 导出 JSONL 的方式替代，但必须保留同样的 manifest 与 sha256 校验。

## 4. 路由迁移边界

推荐路径分流：

| 路由 | 临时归属 | 目标归属 | 说明 |
| --- | --- | --- | --- |
| `/api/login`、`/api/register*`、`/api/me`、`/api/password/change` | Cloudflare Worker | Cloudflare Worker 或未来认证服务 | 认证账号链路先不和游戏数据迁移绑定 |
| `/api/leaderboard`、`/api/user/:id`、`/api/user/:id/records`、`/api/records/:id/replay` | Cloudflare Worker | 新游戏数据后端 | M3 先迁只读 |
| `/api/records`、`/api/score` | Cloudflare Worker | 新游戏数据后端 | 写入切换前必须完成 replay 校验与幂等 |
| `/api/ranked-session/start`、`/api/ranked-checkpoint` | Cloudflare Worker | 新游戏数据后端 | 排位状态最终必须单中心 |
| `/api/relay/*` | Cloudflare Worker | 待决策 | relay 有独立状态机，未纳入本轮时必须继续留在旧 Worker |

## 5. 环境变量清单

### 5.1 运行环境

| 变量 | 示例 | 必填 | 敏感 | 用途 |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | `production` | 是 | 否 | 运行模式 |
| `APP_ENV` | `staging` / `production` | 是 | 否 | 环境隔离、日志标签 |
| `APP_NAME` | `2048-game-data-api` | 是 | 否 | 日志与监控服务名 |
| `APP_VERSION` | Git SHA 或 release id | 是 | 否 | `/health` 与排障 |
| `HTTP_HOST` | `127.0.0.1` | 是 | 否 | API 监听地址 |
| `HTTP_PORT` | `3000` | 是 | 否 | API 监听端口 |
| `PUBLIC_BASE_URL` | `https://2048next.cn` | 是 | 否 | 生成公开链接与 CORS 校验 |
| `TRUSTED_PROXY_CIDRS` | `127.0.0.1/32,::1/128` | 是 | 否 | 信任反代传入的真实 IP 头 |

### 5.2 数据库与文件存储

| 变量 | 示例 | 必填 | 敏感 | 用途 |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | `postgres://2048_app:...@127.0.0.1:5432/2048_game` | 是 | 是 | 应用数据库连接 |
| `DATABASE_SSL_MODE` | `disable` / `require` | 是 | 否 | 数据库 TLS 策略 |
| `DATABASE_POOL_MIN` | `2` | 是 | 否 | 连接池下限 |
| `DATABASE_POOL_MAX` | `10` | 是 | 否 | 连接池上限 |
| `MIGRATION_LOCK_TIMEOUT_MS` | `10000` | 是 | 否 | migration 锁等待上限 |
| `REPLAY_STORAGE_ROOT` | `/data/2048/replays` | 是 | 否 | replay 文件根目录 |
| `REPLAY_TMP_ROOT` | `/data/2048/tmp/replays` | 是 | 否 | replay 写入临时目录 |
| `REPLAY_MAX_BYTES` | `1048576` | 是 | 否 | 单个 replay 最大字节数 |
| `REPLAY_HASH_ALGORITHM` | `sha256` | 是 | 否 | replay 文件与 manifest 校验算法 |
| `BACKUP_ROOT` | `/data/2048/backups` | 是 | 否 | 本地备份落盘目录 |
| `BACKUP_RETENTION_DAYS` | `30` | 是 | 否 | 本地备份保留天数 |

### 5.3 认证、签名与安全

| 变量 | 示例 | 必填 | 敏感 | 用途 |
| --- | --- | --- | --- | --- |
| `AUTH_JWT_ISSUER` | `https://2048next.cn` | 是 | 否 | 校验登录 token 签发方 |
| `AUTH_JWT_AUDIENCE` | `2048-game-data-api` | 是 | 否 | 校验登录 token 受众 |
| `AUTH_JWT_SECRET` | 32 字节以上随机值 | 二选一 | 是 | HMAC JWT 校验 |
| `AUTH_JWKS_URL` | `https://2048next.cn/.well-known/jwks.json` | 二选一 | 否 | JWKS 校验 |
| `AUTH_JWKS_CACHE_TTL_SECONDS` | `300` | 使用 JWKS 时必填 | 否 | JWKS 缓存时间 |
| `RANKED_SESSION_SECRET` | 32 字节以上随机值 | 是 | 是 | 排位 session 签名或派生 |
| `ADMIN_API_TOKEN` | 32 字节以上随机值 | 管理接口启用时必填 | 是 | 运维管理接口鉴权 |
| `CORS_ALLOWED_ORIGINS` | `https://2048next.cn,https://www.2048next.cn` | 是 | 否 | 允许的前端来源 |

生产要求：

- `AUTH_JWT_SECRET`、`RANKED_SESSION_SECRET`、`ADMIN_API_TOKEN` 必须彼此独立。
- staging 与 production 必须使用不同数据库、不同 replay 目录、不同 secret。
- secret 只进入 secret manager、systemd EnvironmentFile 或 GitHub Secrets，不能提交到仓库。

### 5.4 Cloudflare / D1 / COS 迁移工具

这些变量仅用于迁移机或一次性导出任务，不应配置到长期运行的 API 进程。

| 变量 | 示例 | 必填 | 敏感 | 用途 |
| --- | --- | --- | --- | --- |
| `CF_ACCOUNT_ID` | Cloudflare account id | D1 导出时必填 | 是 | 定位账号 |
| `CF_D1_DATABASE_NAME` | `2048-prod` | D1 导出时必填 | 否 | D1 数据库名 |
| `CF_D1_BINDING` | `_2048_scores` | D1 导出时必填 | 否 | 当前 Worker D1 binding |
| `CF_WORKER_NAME` | `2048-game-api` | D1 导出时必填 | 否 | 当前 Worker 名 |
| `CF_API_TOKEN` | 最小权限 token | D1 导出时必填 | 是 | D1 导出权限 |
| `COS_BUCKET` | `2048-replays-prod` | COS 迁移时必填 | 否 | 旧 replay bucket |
| `COS_REGION` | `ap-shanghai` | COS 迁移时必填 | 否 | COS 区域 |
| `COS_SECRET_ID` | secret id | COS 迁移时必填 | 是 | 只读下载权限 |
| `COS_SECRET_KEY` | secret key | COS 迁移时必填 | 是 | 只读下载权限 |
| `MIGRATION_WORKDIR` | `/data/2048/migration/20260424` | 是 | 否 | 导出、下载、manifest 工作目录 |

## 6. 反代草案

反代配置样例已放在：

- `deploy/caddy/2048-next.Caddyfile.example`
- `deploy/nginx/2048-next.nginx.conf.example`

生产落地原则：

- `/api/*` 继续作为唯一前端 API 入口。
- 反代必须向 API 后端传递 `X-Request-Id`、`X-Forwarded-For`、`X-Forwarded-Proto`。
- API 后端只监听 `127.0.0.1` 或内网地址，不直接暴露公网。
- 静态站点仍指向 `/var/www/2048-next/current`。
- staging 与 production 使用不同 server_name、日志文件和后端端口。

切换 M3 灰度时只改路由分流，不改前端页面路径：

1. 只读路由先转新后端。
2. 观察 24 小时，确认错误率、P95、数据一致性。
3. 普通记录写入路由转新后端。
4. 排位 session 与 checkpoint 最后切换。
5. 任一阶段失败时，反代路由回退到旧 Worker。

## 7. Postgres 备份流程

建议每日全量逻辑备份，保留 7 到 30 天；生产规模变大后再补 WAL / PITR。

### 7.1 每日备份

以 `2048_game` 数据库为例：

```bash
set -euo pipefail

backup_day="$(date -u +%Y%m%d)"
backup_dir="${BACKUP_ROOT}/postgres/${backup_day}"
mkdir -p "${backup_dir}"

pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${backup_dir}/2048_game.dump" \
  "${DATABASE_URL}"

pg_dump \
  --schema-only \
  --no-owner \
  --no-acl \
  --file="${backup_dir}/2048_game.schema.sql" \
  "${DATABASE_URL}"

sha256sum "${backup_dir}/2048_game.dump" "${backup_dir}/2048_game.schema.sql" > "${backup_dir}/SHA256SUMS"
```

### 7.2 备份验收

每次备份任务必须记录：

- backup id：UTC 日期 + 主机名。
- 数据库名、schema migration 版本、应用版本。
- dump 文件大小、sha256。
- `pg_dump` 退出码。
- 最新一条 `records.created_at` 和 `ranked_sessions.issued_at`。

## 8. replay 目录备份流程

replay 文件必须用内容 hash 命名或至少在数据库保存 `replay_hash`、`byte_size`、`storage_path`。

推荐每日增量：

```bash
set -euo pipefail

backup_day="$(date -u +%Y%m%d)"
backup_dir="${BACKUP_ROOT}/replays/${backup_day}"
mkdir -p "${backup_dir}"

rsync -a --delete --checksum \
  "${REPLAY_STORAGE_ROOT}/" \
  "${backup_dir}/files/"

find "${backup_dir}/files" -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum > "${backup_dir}/replay-files.sha256"
```

生产建议再把 `${BACKUP_ROOT}` 同步到异地目标，异地凭据由服务器 secret manager 管理。

## 9. 恢复演练

恢复演练必须在隔离测试库和临时 replay 目录执行，禁止直接覆盖生产。

### 9.1 Postgres 恢复演练

```bash
set -euo pipefail

restore_db="2048_game_restore_$(date -u +%Y%m%d%H%M%S)"
createdb "${restore_db}"

pg_restore \
  --dbname="${restore_db}" \
  --no-owner \
  --no-acl \
  "${BACKUP_ROOT}/postgres/<backup_day>/2048_game.dump"

psql "${restore_db}" -v ON_ERROR_STOP=1 <<'SQL'
select count(*) as users_shadow_count from users_shadow;
select count(*) as records_count from records;
select count(*) as ranked_sessions_count from ranked_sessions;
select count(*) as leaderboard_best_count from leaderboard_best;
select max(created_at) as latest_record_at from records;
SQL
```

验收标准：

- restore 命令零退出。
- 关键表 count 非异常下降。
- 最新记录时间不早于备份任务记录的最新时间。
- migration 版本与备份元数据一致。

### 9.2 replay 恢复演练

```bash
set -euo pipefail

restore_root="/tmp/2048-replay-restore-$(date -u +%Y%m%d%H%M%S)"
mkdir -p "${restore_root}"

rsync -a "${BACKUP_ROOT}/replays/<backup_day>/files/" "${restore_root}/"
cd "${restore_root}"
sha256sum -c "${BACKUP_ROOT}/replays/<backup_day>/replay-files.sha256"
```

抽样核对：

```sql
select id, replay_hash, storage_path, byte_size
from records
where replay_hash is not null
order by created_at desc
limit 100;
```

对抽样记录逐条确认：

- 文件存在。
- 文件大小等于 `byte_size`。
- 文件 sha256 等于 `replay_hash`。
- API 使用临时 `REPLAY_STORAGE_ROOT` 能读取对应 replay。

## 10. D1 / COS 迁移 checklist

### 10.1 迁移前冻结点

- 确认 M0 风险止血已经完成：伪造 token 和裸 score 写榜不可用。
- 确认旧 Worker 当前 schema 与接口版本。
- 确认新 Postgres schema migration 已在 staging 通过。
- 确认 replay verifier 对旧 replay 格式有兼容测试。
- 对 D1 做一次只读导出，对 COS 做一次只读列举，不改旧生产数据。

### 10.2 D1 导出

产物要求：

- `d1-export.sql` 或按表导出的 `*.jsonl`。
- `d1-export.schema.sql`。
- `d1-export.manifest.json`，包含表名、行数、导出时间、源数据库标识、sha256。
- `d1-schema-inventory.json`，包含每张表的 `PRAGMA table_info`、`PRAGMA index_list`、`PRAGMA index_info` 输出。

校验项：

- 用户、记录、排行榜、排位、checkpoint 表行数和旧系统统计一致。
- relay 若未迁移，仍需盘点 `relay_cases` 行数与最新更新时间，避免切流时误删或误路由。
- 所有记录主键可解析。
- `client_record_id`、`session_guid`、`replay_hash` 的重复情况有报告。
- 旧数据中缺 replay、缺 user、分数异常的记录单独输出清洗列表。

### 10.3 COS replay 下载

产物要求：

- replay 文件按 hash 或旧 key 映射下载到 `${MIGRATION_WORKDIR}/cos-replays`。
- `cos-replays.manifest.json` 记录旧 key、本地路径、字节数、旧 `sha1`、新 `sha256`、下载时间。
- 下载失败和 hash 不一致记录到 `cos-replays.errors.jsonl`。

校验项：

- D1 中引用 replay 的记录都能在 manifest 中找到。
- 本地文件 sha256 与 D1 / manifest 一致。
- 同 hash 多 key 的文件只保留一份物理文件，保留映射关系。

### 10.4 导入 Postgres 与本地 replay

顺序：

1. 导入用户影子表。
2. 导入 records 原始字段，标记 `source_system='cloudflare-d1'`。
3. 拷贝 replay 文件到目标 `REPLAY_STORAGE_ROOT`。
4. 回填 records 的 `storage_path`、`replay_hash`、`byte_size`。
5. 运行 replay verifier，写入 `verified_at`、`verify_status`、`verify_error`。
6. 只从 `verify_status='verified'` 的记录重建 leaderboard。
7. 导入 ranked session 与 checkpoint，过期或不完整 session 标记为历史只读。
8. relay 未纳入本轮迁移时，不导入 `relay_cases` 到新游戏后端，只保留源端备份与路由回旧 Worker。

### 10.5 灰度与回滚

只读灰度：

- 新后端只服务 `/leaderboard`、`/user/:id`、`/user/:id/records`、`/records/:id/replay`。
- 每小时抽样比对新旧榜单 top N 和用户记录数。
- 回滚方式：反代路由切回旧 Worker。

写入灰度：

- 先切 `/records`，再切 `/score`。
- 新写入只进入 Postgres，不双写旧 D1，避免双写一致性误判。
- 回滚方式：反代路由切回旧 Worker，新库保留为隔离数据源，人工决定是否回放导入。

排位灰度：

- 最后切 `/ranked-session/start` 与 `/ranked-checkpoint`。
- 切换窗口内旧 session 保留只读恢复，新 session 只由新后端签发。

## 11. 日志、监控与告警

### 11.1 日志字段

所有 API 日志至少包含：

- `timestamp`
- `level`
- `request_id`
- `route`
- `method`
- `status`
- `latency_ms`
- `user_id`
- `mode_key`
- `session_guid`
- `client_record_id`
- `replay_hash`
- `source_ip`
- `app_version`

禁止记录明文 token、密码、OTP、secret、完整 replay 内容。

### 11.2 指标

M3 / M4 最低指标：

- 请求总量、错误率、P50 / P95 / P99。
- `/api/records` 上传成功率与 replay 校验失败率。
- `/api/leaderboard` 查询错误率与 P95。
- JWT 校验失败率。
- ranked session 创建、消费、重复消费、过期数量。
- checkpoint 保存失败率。
- Postgres 连接池使用率、慢查询数量。
- replay 文件写入失败率、hash mismatch 数量。
- 备份成功时间、备份大小、恢复演练最近成功时间。

### 11.3 告警

建议初始阈值：

| 告警 | 阈值 | 处理 |
| --- | --- | --- |
| API 5xx 错误率 | 5 分钟内 > 2% | 查看应用日志和数据库状态，必要时回滚路由 |
| `/api/records` 成功率 | 10 分钟内 < 95% | 暂停写入灰度，保留新库现场 |
| replay hash mismatch | 任意生产命中 | 暂停迁移批次，检查 COS 下载和存储路径 |
| Postgres 备份失败 | 连续 1 次 | 当日人工补跑，记录原因 |
| 恢复演练过期 | 超过 30 天无成功演练 | 阻塞 M4 验收 |

## 12. 排位写入一致性排障与恢复

本节用于处理 `/api/records` final submit、ranked session consume、record insert、replay 文件写入之间的不一致。所有步骤默认先在 staging 或隔离副本验证；生产修复必须保留工单、request_id、操作者、执行前后快照和回滚方案。

### 12.1 立即止血

1. 打开 incident 记录，标记影响窗口、环境、应用版本、最近一次发布或 migration 版本。
2. 暂停排位写入灰度或把 `/api/records` 写路由回滚到已知稳定版本；只读 leaderboard 可继续服务。
3. 保留现场：不得先删除 replay、record 或 session；先导出相关行、日志、对象存储 metadata 和 leaderboard 快照。
4. 收集最小定位字段：`request_id`、`user_id`、`mode_key`、`session_guid`、`client_record_id`、`record_id`、`replay_fingerprint`、`replay_object_key`、`replay_hash`、响应 code。

### 12.2 最小排查查询

字段名按当前 D1 `user_records` 或未来 Postgres `records` 实际 schema 调整；查询产物必须归档到 incident。

```sql
-- ranked session 状态、过期时间和最终 record 绑定。
select id, user_id, status, session_guid, issued_at, expires_at,
       consumed_at, final_record_id, updated_at, last_error
from ranked_sessions
where session_guid = :session_guid
   or final_record_id = :record_id;

-- record 与 replay 绑定。
select id, user_id, mode_key, session_guid, client_record_id,
       replay_fingerprint, replay_object_key, replay_sha1,
       verify_status, created_at, updated_at
from user_records
where id = :record_id
   or session_guid = :session_guid
   or replay_fingerprint = :replay_fingerprint
order by created_at desc;

-- leaderboard 是否错误采纳。
select *
from mode_scores
where user_id = :user_id
  and mode_key = :mode_key;
```

对象存储侧同时确认：

- `replay_object_key` 是否存在。
- 文件大小是否等于 DB 中记录的大小字段。
- COS 旧 `sha1` 或本地 `sha256` 是否与 manifest / DB 一致。
- 对象最后修改时间是否落在 incident 影响窗口内。

### 12.3 不一致分类与处置

| 类型 | 判定条件 | 处置步骤 | 验收 |
| --- | --- | --- | --- |
| S1：session 已 consumed 但无 record | `ranked_sessions.status='consumed'` 且 `final_record_id IS NULL`，找不到匹配 verified record | 不手工写 leaderboard；先标记 `repair_required` 或 `finalizing_failed`；若 replay 对象存在且 verifier 通过，使用修复任务在一个数据库边界内补写 record 并回填 `final_record_id`；若 replay 不存在，保留 session 为失败状态并允许同一 session/replay 的幂等重试策略由 C 确认 | 不再存在 consumed + null record；用户不会获得未验证榜单分 |
| S2：record 已写入但 session 未 consumed | 存在 verified record，session 仍为 `started`/`finalizing`/`ongoing` | 锁定 session 和 record；确认 user、mode、seed/challenge、replay_fingerprint 匹配；匹配时回填 `status='consumed'` 与 `final_record_id`；不匹配时隔离 record 并移出 leaderboard 派生 | session 与 record 一一绑定；leaderboard 只来自 verified record |
| S3：replay 对象存在但无 record | COS/本地 replay 有对象，DB 无对应 record | 核对请求日志判断是否 record insert 失败；若 session 仍可恢复，重新跑 verifier 和 finalization；若无法恢复，记录孤儿 replay 清理单，清理前保留 manifest | 无孤儿 replay 进入 leaderboard；清理单可审计 |
| S4：record 存在但 replay 缺失或 hash mismatch | record 指向的 replay 不存在、大小不符或 hash 不符 | 立即把 record 标为 `replay_missing`、`hash_mismatch` 或等价隔离状态；从备份或 COS 恢复 replay；恢复后重跑 verifier；恢复失败时从 leaderboard 派生中排除 | mismatch 计数归零或有处置单；榜单不包含不可验证记录 |
| S5：同 fingerprint 多条 active verified record | `(user_id, mode_key, replay_fingerprint)` 聚合 count > 1 | 按 T14 清洗策略保留唯一 winner；其他记录标记 `duplicate_of`、`hidden` 或等价状态；重建 leaderboard；补唯一约束或替代保护 | active verified record 唯一；并发重复提交返回 duplicate/conflict |
| S6：过期 session 仍有可恢复 checkpoint | session 已过期，但 checkpoint 仍被前端或 API 当作可继续排位 | 删除或标记 checkpoint expired；前端收到 `RANKED_SESSION_EXPIRED` 后清理本地状态；不得允许 final submit | 过期 session 不能提交、保存或恢复 checkpoint |

### 12.4 D1 过渡期修复约束

- 如果 D1 API 无法提供完整事务，修复任务必须使用状态机：`started` -> `finalizing` -> `consumed`，并记录 `final_record_id`、`last_error`、`updated_at`。
- 任何从 `finalizing_failed` 恢复到 `consumed` 的动作必须先重跑 replay verifier。
- 只能用条件更新消费 session，例如带上当前 `status`、`session_guid`、`updated_at` 或版本号，避免并发修复重复消费。
- COS 清理失败不得阻塞 DB 一致性修复，但必须写入 repair 标记和后续清理任务。

### 12.5 Postgres 目标修复模板

目标后端上线后，修复必须在单个数据库事务中完成，至少锁定 session 和 record 相关行：

```sql
begin;

select *
from ranked_sessions
where session_guid = :session_guid
for update;

select *
from records
where id = :record_id
   or (session_guid = :session_guid and replay_fingerprint = :replay_fingerprint)
for update;

-- 根据 12.3 分类执行一条明确修复路径：
-- 1. 插入或隔离 record；
-- 2. 回填 ranked_sessions.final_record_id；
-- 3. 标记 duplicate / replay_missing / hash_mismatch；
-- 4. 刷新或撤销 leaderboard 派生。

commit;
```

### 12.6 修复后验证

每次修复后至少执行：

```sql
select count(*) as consumed_without_record
from ranked_sessions
where status = 'consumed'
  and final_record_id is null;

select user_id, mode_key, replay_fingerprint, count(*) as active_records
from user_records
where verify_status = 'verified'
  and replay_fingerprint is not null
group by user_id, mode_key, replay_fingerprint
having count(*) > 1;
```

验收要求：

- 上述异常 count 为 0，或每条异常都有处置单。
- 抽样读取 `/api/leaderboard`，确认没有采纳被隔离、重复、缺 replay 或 hash mismatch 的 record。
- 重新执行 T12/T13/T14 相关回归：insert failure、duplicate、concurrency、expired session、replay fingerprint conflict。
- incident 记录中补齐根因、修复 SQL 或脚本、执行人、执行时间、测试结果和残余风险。

## 13. 上线检查表

M1：

- [ ] API `/health` 返回 `app_version`、数据库状态、replay 存储可写状态。
- [ ] staging 与 production 环境变量完全隔离。
- [ ] Caddy 或 Nginx 配置通过语法检查。
- [ ] API 后端仅监听本机或内网。
- [ ] Postgres migration 只能通过显式任务执行。

M3：

- [ ] D1 导出 manifest、COS 下载 manifest、清洗报告已归档。
- [ ] API repo `wrangler.jsonc` 快照、D1 schema inventory、路由清单已归档。
- [ ] 新旧只读接口抽样对账通过。
- [ ] 写入切换窗口、回滚负责人、回滚命令已确认。
- [ ] 排位 session 切换策略已确认旧 session 处理方式。
- [ ] `/api/relay/*` 已明确迁移或继续回旧 Worker。

M4：

- [ ] 每日 Postgres 备份任务成功。
- [ ] replay 目录备份任务成功。
- [ ] 最近 30 天内有一次隔离恢复演练成功。
- [ ] 关键指标与告警已接入。
- [ ] 管理或审计操作均产生 audit event。

## 14. 人工补齐项

上线前必须由生产负责人补齐：

- 生产域名、staging 域名、DNS / Cloudflare zone。
- 服务器 IP、SSH 端口、部署用户、sudo 最小权限。
- Postgres 主机、库名、应用用户、备份用户。
- replay 与 backup 磁盘挂载点、容量、告警阈值。
- Cloudflare D1 数据库名、account id、最小权限 token。
- Cloudflare Worker route 接管策略：Worker 继续做 gateway，还是 DNS / 反代直接接管 `/api/*`。
- COS bucket、region、只读迁移密钥。
- JWT 签发方、issuer、audience、HMAC 或 JWKS 策略。
- 监控系统、日志系统、告警联系人和值班窗口。
