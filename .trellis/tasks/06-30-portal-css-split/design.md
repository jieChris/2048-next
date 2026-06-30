# Portal CSS Split Design

## Split Boundaries

Keep each replacement file aligned to an existing contiguous ownership group:

- `portal-shell.css`: container, header, nav, card, and grid layout.
- `portal-forms.css`: portal forms, inline inputs, inline actions, and history select styling.
- `portal-table.css`: status, muted text, table wrapper, table rules, and section title.
- `history-list.css`: history list item shell, head, owner tag, actions, and diagnostics.
- `history-mini-board.css`: rendered mini-game wrapper and tile animation suppression.
- `history-final-board.css`: static final-board grid and cell value colors.
- `portal-responsive.css`: portal-owned responsive rules.

## Method

- Slice the original file into contiguous chunks.
- Verify the concatenated chunks equal the original file.
- Replace the old import in `style/main.css` with the new ordered imports.
- Delete the old active file after the reconstruction check passes.

## Risk Controls

- No selector rewrites.
- No declaration rewrites.
- No token replacements.
- Validation uses the shared rolling CSS baseline.
