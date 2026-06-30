# CSS Architecture Optimization Design

## Current Shape

The runtime HTML pages load `style/main.css` and selected page-specific CSS files. `main.css` contains base document styling, logo styling, game board styling, buttons, modals, mobile rules, and many page-adjacent details. Several pages also include inline `<style>` blocks or static `style=""` presentation rules.

`style/main.scss` is present but is not currently part of the package scripts. Because the application runtime links to compiled CSS directly, this task treats `style/main.css` as the operational source and avoids introducing a new build dependency.

## Target Shape For This Task

Add a lightweight CSS architecture layer that can coexist with the current files:

```text
style/
  tokens/
    base.css
  components/
    logo.css
    timer.css
  docs/
    css-inventory.md
  main.css
```

This is deliberately narrow. It starts the architecture without pretending the entire legacy stylesheet can be migrated safely in one pass.

## Boundaries

- `style/tokens/base.css` defines current-theme semantic variables only.
- `style/components/logo.css` owns reusable logo sizing and link presentation.
- `style/components/timer.css` owns static timer legend typography and timer value cell spacing that used to be repeated inline.
- `style/docs/css-inventory.md` records current style debt and migration priorities.
- `style/main.css` remains the main runtime entry and imports the new files.
- Page-specific CSS keeps page-specific behavior.
- Existing runtime inline styles used by JavaScript, such as `display: none`, remain in place for now.

## Compatibility Notes

CSS imports must appear before normal rules in `style/main.css`. Imported files must not depend on future theme attributes. Variables should mirror current visual values so existing pages stay visually stable.

The first inline cleanup targets repeated static logo presentation styles. The second cleanup targets repeated static timer legend and timer value cell presentation. Both are low risk because the same classes are already shared by the game-family pages, and the runtime theme manager already addresses timer legends through class selectors.

## Trade-Offs

This task favors a safe, incremental architecture over a broad rewrite. It will not immediately reduce the total CSS line count much. The value is clearer ownership and a migration path for future cleanup.

Full decomposition of `main.css`, page CSS, and inline `<style>` blocks should happen in later focused tasks after this base layer is verified.

## Rollback

Rollback is straightforward:

- Remove the new `@import` lines from `style/main.css`.
- Restore the static `style=""` attributes removed from logo image tags if needed.
- Delete the new `style/tokens`, `style/components`, and `style/docs` files.
