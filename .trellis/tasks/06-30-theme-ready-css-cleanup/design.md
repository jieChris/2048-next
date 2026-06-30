# Theme-Ready CSS Cleanup Design

## Architecture

Keep direct CSS and Vite bundling unchanged.

### State Visibility

Prefer existing browser semantics and stable utility classes:

- Use `hidden` when an element is always hidden until a script intentionally reveals it.
- Use `.is-hidden` only when the element is shown by removing a class and no script-specific display value is required.
- Use page/component classes for special state if a component already has a state vocabulary.
- Runtime code should use `element.hidden` or class toggles rather than new inline `style.display` writes where the owner is touched.

### Tokens

Tokens must be semantic and current-value only. This cleanup can add or expand tokens such as:

- text roles
- surface roles
- border roles
- overlay roles
- control visibility/state roles
- focus rings and radius roles

Tokens should live in `style/tokens/base.css` when they are shared by the main CSS graph. Standalone page entries stay self-contained unless already in the main graph.

### `!important`

Do not chase zero. Remove only declarations where:

- owner selector already has enough specificity,
- a state class or hidden attribute now handles visibility,
- test/smoke coverage can prove behavior did not regress.

Keep responsive compatibility, low-performance animation suppression, dynamic theme priority, and runtime suppression boundaries intact.

### Guardrails

Add unit checks that:

- non-ignored HTML has no head `<style>` blocks,
- non-ignored HTML has no static `style="display: none"` hooks after cleanup, or reports only documented exceptions,
- CSS imports resolve,
- focused CSS files stay below the current size budget,
- future theme work must use token/theme boundaries instead of page-private overrides.
