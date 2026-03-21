# Contracts 覆盖矩阵（Replay / Import / Export / SavedState / SessionInit）

> 范围：WS3-01 第二批，覆盖 `ReplayRecord`、`HistoryExportEnvelope`、`SubmitPayload`、`SavedGameStatePayload`、`SessionInitPayload`。
> 目标：明确字段、生产方、消费方、断言位置，避免隐式结构漂移。

## 矩阵

| Contract | 必填字段 | 生产方（Producer） | 消费方（Consumer） | 断言位置（Assertion） |
|---|---|---|---|---|
| ReplayRecord | `version` `kind` `modeKey` `initialBoardEncoded` `actionsEncoded` `replayString` | `js/core_game_manager_replay_helpers_runtime.js::serializeReplay*` | `js/core_game_manager_replay_helpers_runtime.js::importReplay/importV9RplBuffer`、`src/bootstrap/replay/*` | `tests/unit/contracts.spec.ts`、`tests/unit/core-replay-*.spec.ts` |
| HistoryExportEnvelope | `v` `exported_at` `count` `records` | `src/bootstrap/history/*::exportRecords` | `src/bootstrap/history/*::importRecords`、`tests/smoke/history-records-*.smoke.spec.ts` | `tests/unit/contracts.spec.ts` |
| SubmitPayload | `score` `best_tile` `duration_ms` `mode` `mode_key` `ended_at` `end_reason` `final_board` `replay` `replay_string` | `src/bootstrap/play/*::buildSubmitPayload` | API `/submit`、`src/services/api/*` | `tests/unit/contracts.spec.ts` |
| SavedGameStatePayload | `v` `saved_at` `mode_key` `board_width` `board_height` `ruleset` `board` `score` `over` `won` `keep_playing` `duration_ms` | `js/core_game_manager_saved_state_helpers_runtime.js::buildSavedGameStatePayload` | `js/core_game_manager_saved_state_helpers_runtime.js::resolveSavedStateRestoreDecision/applySavedStateRestore` | `tests/unit/contracts.spec.ts`、`tests/unit/core-game-manager-saved-state-runtime.spec.ts` |
| SessionInitPayload | `modeKey` `modeConfig` `inputManagerCtor` `defaultBoardWidth` | `src/bootstrap/play-startup-payload.ts::resolvePlayStartupPayload` | `src/bootstrap/play-startup-host.ts::resolvePlayStartupFromContext`、`src/entries/play.ts` | `tests/unit/contracts.spec.ts`、`tests/unit/bootstrap-play-startup-payload.spec.ts` |

## 代码锚点

- 常量与校验函数：`src/contracts/index.ts`
  - `REPLAY_RECORD_REQUIRED_KEYS`
  - `HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS`
  - `SUBMIT_PAYLOAD_REQUIRED_KEYS`
  - `SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS`
  - `SESSION_INIT_PAYLOAD_REQUIRED_KEYS`
  - `isReplayRecordLike()`
  - `isHistoryExportEnvelopeLike()`
  - `isSubmitPayloadLike()`
  - `isSavedGameStatePayloadLike()`
  - `isSessionInitPayloadLike()`
  - `CORE_CONTRACT_COVERAGE_MATRIX`
  - `REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX`

## 下一步（必须）

1. 为 `SavedGameStatePayload` 与 `SessionInitPayload` 补充对应 smoke 契约回归场景。
2. 扩展 `contracts-matrix-audit` 到“断言路径存在性”检查（至少覆盖单测文件路径）。
3. 将矩阵行与里程碑 DoD 对齐，形成可直接签收的 F sign-off 证据表。
