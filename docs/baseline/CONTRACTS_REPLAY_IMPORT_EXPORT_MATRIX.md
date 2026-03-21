# Contracts 覆盖矩阵（Replay / Import / Export）

> 范围：WS3-01 首批，聚焦 `ReplayRecord`、`HistoryExportEnvelope`、`SubmitPayload`。
> 目标：明确字段、生产方、消费方、断言位置，避免隐式结构漂移。

## 矩阵

| Contract | 必填字段 | 生产方（Producer） | 消费方（Consumer） | 断言位置（Assertion） |
|---|---|---|---|---|
| ReplayRecord | `version` `kind` `modeKey` `initialBoardEncoded` `actionsEncoded` `replayString` | `js/core_game_manager_replay_helpers_runtime.js::serializeReplay*` | `js/core_game_manager_replay_helpers_runtime.js::importReplay/importV9RplBuffer`、`src/bootstrap/replay/*` | `tests/unit/contracts.spec.ts`、`tests/unit/core-replay-*.spec.ts` |
| HistoryExportEnvelope | `v` `exported_at` `count` `records` | `src/bootstrap/history/*::exportRecords` | `src/bootstrap/history/*::importRecords`、`tests/smoke/history-records-*.smoke.spec.ts` | `tests/unit/contracts.spec.ts` |
| SubmitPayload | `score` `best_tile` `duration_ms` `mode` `mode_key` `ended_at` `end_reason` `final_board` `replay` `replay_string` | `src/bootstrap/play/*::buildSubmitPayload` | API `/submit`、`src/services/api/*` | `tests/unit/contracts.spec.ts` |

## 代码锚点

- 常量与校验函数：`src/contracts/index.ts`
  - `REPLAY_RECORD_REQUIRED_KEYS`
  - `HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS`
  - `SUBMIT_PAYLOAD_REQUIRED_KEYS`
  - `isReplayRecordLike()`
  - `isHistoryExportEnvelopeLike()`
  - `isSubmitPayloadLike()`
  - `REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX`

## 下一步（必须）

1. 将 `saved-state/session-init` 的核心载荷补入同一矩阵，并补最小运行时校验函数。
2. 为矩阵每一行补至少一条 smoke 契约场景，形成发布前证据链。
3. 把矩阵覆盖率检查接入 `verify:refactor:ci`（缺失 contract 行时阻断）。
