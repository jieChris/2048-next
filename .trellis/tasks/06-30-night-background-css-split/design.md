# Night Background CSS Split Design

## Split Boundaries

Use contiguous source ranges:

- `style/preferences/night-background-base.css`: document text, links, footer, and intro copy.
- `style/preferences/night-score-timer.css`: score containers, timer boxes, timer controls, and timer leaderboard tiles.
- `style/preferences/night-board-actions.css`: board shell, grid cells, game messages, and shared action buttons.
- `style/preferences/night-modals-settings.css`: overlays, modal panels, guide panels, announcement rows, settings rows, custom select, and settings switches.
- `style/preferences/night-diagonal-assist.css`: diagonal assist touch button states.
- `style/preferences/night-history.css`: history portal page surfaces.
- `style/preferences/night-practice.css`: practice dashboard and tile selection surfaces.

## Risk Controls

- Preserve all selectors and declarations exactly.
- Preserve import position by replacing the old import with the seven new imports in the same location.
- Verify by rejoining the split files and comparing with the original content captured before deletion.
