# Classic Mobile CSS Split Design

## Split Boundaries

Use the following owner files:

- `style/responsive/classic-mobile-wide-copy.css`: the `max-width: 1200px` project-copy hiding rule.
- `style/responsive/classic-mobile-compact-shell.css`: compact page, body, heading, container, score, stats, and heading spacing rules.
- `style/responsive/classic-mobile-compact-board.css`: compact board shell sizing.
- `style/responsive/classic-mobile-compact-message.css`: compact game message overlay and action controls.
- `style/responsive/classic-mobile-compact-grid.css`: compact grid and tile container shells.
- `style/responsive/classic-mobile-compact-tiles.css`: compact tile geometry and 4x4 transform matrix.
- `style/responsive/classic-mobile-compact-copy-actions.css`: compact intro copy, restart button, game container margin, tile font, and message override rules.
- `style/responsive/classic-mobile-compact-milestones.css`: compact milestone container rules.

## Verification Strategy

The split repeats `@media screen and (max-width: 520px)` in focused files. To validate the split mechanically:

1. Extract each compact file's media body.
2. Rebuild the original compact media block in import order.
3. Compare the rebuilt content with the original `classic-mobile.css` captured before deletion.

This preserves behavior because all split compact files use the same media condition and remain in the same cascade position.
