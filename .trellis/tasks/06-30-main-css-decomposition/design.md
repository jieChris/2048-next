# Main CSS Decomposition Design

## Current Shape

`style/main.css` is the runtime stylesheet loaded by the legacy HTML pages. After the previous cleanup pass it imports tokens and two component files, but still owns most global rules directly.

Current high-level sections inside `main.css`:

- document defaults and record footer
- heading, title, home user display, score boxes
- timer box, timer leaderboard, timer tiles
- game shell, board grid, tile positions, tile colors, tile animations
- replay modal and replay controls
- top action buttons and SVG hover animations
- settings, announcement, guide, custom theme settings UI
- timer legend colors and high-value tile colors
- portal/history page surfaces
- mobile responsive compatibility layer
- online account/leaderboard runtime
- diagonal assist touch button
- existing night-background preference overrides
- game dialog, beta access gate, click effects, breakout overlay

## Target Shape

`style/main.css` becomes an import-only manifest. The imported files hold rules by ownership:

```text
style/
  main.css
  base/
    document.css
    content.css
  layout/
    shell.css
  components/
    logo.css
    score.css
    timer.css
    timerbox.css
    timer-leaderboard.css
    board-shell.css
    game-message.css
    board-tiles.css
    replay-modal.css
    top-actions.css
    stats-and-guide.css
    settings-modal.css
    tile-legend.css
    portal.css
    mobile-controls.css
    online-runtime.css
    diagonal-assist.css
    game-dialog.css
    beta-access-gate.css
  responsive/
    classic-mobile.css
    dialog-gate-mobile.css
    mobile-legacy.css
  preferences/
    night-background.css
  effects/
    flying-click.css
    breakout-easter-egg.css
  tokens/
    base.css
  docs/
    css-inventory.md
```

## Import Order Contract

The order must mirror the current cascade:

1. tokens and fonts
2. current standalone component imports from the previous pass
3. base document/footer
4. layout shell
5. score and timer surfaces
6. content primitives
7. game board shell, game-message rules, board tiles, and classic mobile board compatibility
8. replay/modal controls
9. top action controls
10. stats/guide/settings/announcement surfaces
11. timer legend and high-value tile colors
12. portal/history surfaces
13. responsive compatibility layer
14. online runtime and helper controls
15. night-background preference overrides
16. dialogs, gates, responsive dialog/gate overrides, effects, overlays

## Implementation Approach

Use a mechanical split: create each target file from contiguous slices of the current `main.css`, then replace `main.css` with the ordered imports. This avoids selector rewrites and reduces the risk of visual drift.

After the mechanical split passes validation, later tasks can do semantic improvements: token expansion, duplicate selector consolidation, inline `<style>` extraction, and specificity reduction.

## Done Definition

- `style/main.css` has no direct style rules.
- New CSS files are small enough to inspect by ownership.
- Import order is documented in `implement.md` and `css-inventory.md`.
- Validation passes.
- Remaining optimization work is documented separately from this split.
