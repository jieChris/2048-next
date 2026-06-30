# Replay Modal CSS Split Design

## Split Boundaries

Keep each replacement file aligned to a contiguous source group:

- `replay-message-actions.css`: game-message replay action links.
- `replay-modal-overlay.css`: replay modal overlay display shell.
- `replay-controls-panel.css`: replay playback panel, progress, diagnostics, controls, speed settings, and range input styling.
- `replay-modal-content.css`: generic replay modal content shell and heading.
- `mobile-hint-modal.css`: mobile hint modal content and copy body.
- `mode-intro-modal.css`: mode intro copy and embedded leaderboard block.
- `replay-import-textarea.css`: replay import textarea sizing.
- `replay-modal-actions.css`: modal action buttons and generic replay button.

## Method

- Slice the original file into contiguous chunks.
- Verify the concatenated chunks equal the original file.
- Replace the old import in `style/main.css` with the new ordered imports.
- Delete the old active file after the reconstruction check passes.

## Risk Controls

- No selector rewrites.
- No declaration rewrites.
- No behavior or runtime state changes.
- Validation uses the shared rolling CSS baseline.
