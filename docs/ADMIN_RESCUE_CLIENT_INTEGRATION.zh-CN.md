# Rescue offer client integration

The admin page creates rows in `admin_rescue_offers`. The player-facing flow should be added to the game startup path after login state is known.

Suggested API contract:

- `GET /api/rescue-offers/active?mode_key=<modeKey>`
  - returns the newest pending, unexpired offer for the current authenticated user and mode.
- `POST /api/rescue-offers/:id/accept`
  - marks the offer accepted and returns a signed saved-state payload.
- `POST /api/rescue-offers/:id/reject`
  - marks the offer rejected.
- `POST /api/rescue-offers/:id/consume`
  - called after the client successfully applies the board.

Returned accept payload example:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "mode_key": "standard_4x4_pow2_no_undo",
    "mode_bucket": "standard_no_undo",
    "board": [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],
    "score": 0,
    "duration_ms": 0,
    "signature": "sha256...",
    "admin_rescue": true
  }
}
```

Client application rules:

1. Show a confirmation modal; never replace the board silently.
2. Verify `mode_key` matches the current page mode.
3. Apply the board through the same code path used by saved-state restore where possible.
4. Set `score`, `duration_ms`, `hasGameStarted`, `won`, `over=false`, and a new `client_record_id`.
5. Persist immediately to `savedGameStateByMode:v1:<mode_key>` after applying.
6. Include `rescue_id` and `admin_rescue=true` in final record submission so backend can validate and label it.

Do not treat rescue games as normal seeded ranked games unless the Worker submit validator explicitly supports `admin_rescue` records.
