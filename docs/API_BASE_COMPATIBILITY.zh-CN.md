# API base 兼容说明

最后更新：2026-04-25

## 候选顺序

前端 API base 候选按以下顺序生成：

1. `window.GAME_API_BASE_URL`：显式 override，仍保持最高优先级。
2. 当前同源 `/api`：例如 `https://2048next.cn/api`。
3. 远端 fallback：默认 `https://2048next.cn/api`，可用 `window.GAME_API_FALLBACK_BASE_URL` 覆盖。

`2048next.cn`、`www.2048next.cn` 以及其他非本地主机默认启用远端 fallback。本地开发主机（`localhost`、`127.*`、`::1`）默认只使用同源 `/api`，除非设置 `window.GAME_API_ALLOW_CROSS_ORIGIN_FALLBACK = "true"` 或显式 `GAME_API_BASE_URL`。旧域名 `taihe.fun` 不再使用同源后端，默认直接转向 `https://2048next.cn/api`。

## 前端调用路径

- `/score`：`js/online_leaderboard_runtime.js` 的 `submitScore(...)`，经 `apiRequest(...)` 和 `ApiSharedUtils.buildApiBaseCandidates()`。
- `/records`：`js/online_leaderboard_runtime.js` 的 `submitRecord(...)`，经同一 `apiRequest(...)`。
- `/ranked-checkpoint`：`js/online_leaderboard_runtime.js` 的 `submitRankedCheckpoint(...)`、`loadRankedCheckpoint(...)`、`deleteRankedCheckpoint(...)`，经同一 `apiRequest(...)`。
- 用户主页的 `/user/...`、`/me`、`/records/...` 和 replay 版本查询：`js/user_profile_page.js` 使用同等 API base 候选规则。
- `/ranked-session/start`：`src/bootstrap/ranked-session.ts` 会在 legacy runtime 前执行，因此使用本地同等候选规则，向每个 API base 追加 `/ranked-session/start`。

## `/api/score` 废弃策略

`/api/score` 只保留为旧客户端兼容入口，不再作为正式写榜路径。最终成绩提交、排位 session 消费、leaderboard 派生都必须依赖 `/api/records` 的 verified record。

兼容响应契约：

| 场景 | 响应 | 副作用 |
| --- | --- | --- |
| 已认证请求提交裸 `score` | `200` 或等价兼容成功，响应体包含 `success=true`、`skipped=true`、`reason="verified_record_required"` | 不写 `scores`、`mode_scores`、`user_records`；不刷新 leaderboard |
| 已认证请求提交 `replay_string` | 同上 | 不把 `/api/score` 当作 replay verify 路径；不消费 ranked session |
| 已认证请求携带 ranked session token | 同上 | `ranked_sessions` 状态、`consumed_at`、`final_record_id` 不变 |
| 未认证或 token 无效 | 保持 `401`/`403` | 不执行兼容 no-op 之外的任何写入 |

前端兼容要求：

- `submitScore(...)` 可以继续发出兼容请求，但只能把 `skipped=true` 视为非致命旧接口响应，不能据此展示“已上榜”。
- game over 的正式成绩提交必须以 `submitRecord(...)` / `/api/records` 成功为准。
- `/api/records` 失败时，前端不得 fallback 到 `/api/score` 来写正式榜单。
- 排位局遇到 `/api/score` 兼容成功不代表 ranked session 已消费；前端仍必须按 `/api/records` 和 ranked session 状态处理。

下线阶段：

1. 第一阶段：保留 `/api/score` no-op，记录调用量、来源页面、user agent 和 request_id。
2. 第二阶段：降低或移除前端 `maybeSubmitScoreOnGameOver` 对 `/api/score` 的触发优先级，只保留必要兼容。
3. 第三阶段：当调用量和旧客户端影响评估完成后，后端可把 `/api/score` 改为显式废弃响应；改动前必须更新本文件和 QA 门禁。

## 迁移期约束

同源 `/api` 返回不可用、非 JSON 或网络失败时，以上前端路径可继续尝试远端 fallback。显式 API base override 不会被同源优先策略覆盖。

远端 fallback 不改变 `/api/score` 废弃语义：无论命中同源 API 还是远端 fallback，`/api/score` 都不得产生正式写榜、ranked session 消费或 leaderboard 刷新。
