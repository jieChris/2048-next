# Theme Boundary Rules

Last updated: 2026-06-30.

This document defines the CSS structure that must be preserved before any future visual theme work.

## Boundary Rules

- Do not implement a new visual theme in CSS cleanup tasks.
- Use semantic tokens before page-private visual overrides.
- Prefer `.is-hidden` or `hidden` for static initial visibility.
- Keep runtime-owned dimensions, transforms, and canvas/game-board calculations out of global theme tokens.
- Keep API, account authority, replay verification, ranked session, and backend behavior outside CSS maintenance work.

## State Rules

Static initial hidden state belongs in markup as `.is-hidden` or `hidden`, backed by `style/base/state.css`.

Runtime code that owns a touched element should toggle `.is-hidden` or `hidden` instead of writing `style.display`. Existing script-owned display writes may remain when they encode dynamic layout state that is outside the current cleanup scope.

## Token Rules

Shared visual roles belong in `style/tokens/base.css`. Current-value token additions are acceptable when they name existing surfaces, overlays, focus rings, shadows, borders, or radii without changing output.

Page CSS may keep page-private values until the value is shared by multiple components or would be a likely theme boundary.

## Priority Rules

Do not chase zero `!important`. Keep priority where it protects responsive compatibility, dynamic theme CSS, reduced-performance fallbacks, or runtime suppression boundaries.

Remove `!important` only where a stable owner selector or state boundary already proves the same behavior.
