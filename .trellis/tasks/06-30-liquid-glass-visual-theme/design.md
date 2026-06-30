# Liquid Glass Visual Theme Design

## Design Principles

Liquid Glass should be treated as a system-level visual language:

- Content stays stable and readable.
- Glass is used for functional layers: navigation, controls, cards, dialogs, popovers, floating toolbars, score/timer panels, and table containers.
- The board remains precise. Glass effects must not change tile geometry, hit targets, or replay/gameplay layout.
- Day/night variants are color-scheme branches of the same visual theme, not separate visual themes.
- Effects are layered through semantic tokens and component owners, not page-by-page overrides.

## Theme State Model

Use a shared naming model across both frontends:

- `visual-theme`: `classic | liquid-glass`
- `color-scheme`: `system | light | dark`
- resolved scheme: `light | dark`

Root attributes/classes:

- `html[data-visual-theme="classic"]`
- `html[data-visual-theme="liquid-glass"]`
- `html[data-color-scheme="system|light|dark"]`
- `html[data-resolved-color-scheme="light|dark"]`

`2048-ranked` already uses `.light` and `.dark`. Keep that class system and add `data-visual-theme`. Do not overload `ColorScheme` with visual theme names.

`2048-next-logo-work` currently has `data-night-background="1"`. Keep it as a compatibility input while introducing the new color-scheme axis. During migration, `data-night-background="1"` can map to `data-resolved-color-scheme="dark"` only for classic legacy behavior until settings UI is unified.

## Storage

Use independent storage keys:

- `visual_theme_v1`: `classic | liquid-glass`
- `color_scheme_v1`: `system | light | dark`

For `2048-ranked`, mirror the existing cookie pattern:

- `visual-theme=classic|liquid-glass`
- keep `color-scheme=system|light|dark`

For `2048-next-logo-work`, use localStorage with a preload script, matching existing frontend patterns:

- `visual_theme_v1`
- `color_scheme_v1`

Do not delete existing `settings_night_background_enabled_v1` in the first implementation pass.

## CSS Architecture

### `2048-next-logo-work`

Keep `style/main.css` as the import manifest. Add theme imports late enough to override base visuals but before high-risk runtime/effect-only layers when possible.

Proposed files:

- `style/themes/visual-theme-state.css`
  - root defaults and compatibility selectors
  - no component styling
- `style/themes/liquid-glass/tokens-light.css`
  - Liquid Glass day token values
- `style/themes/liquid-glass/tokens-dark.css`
  - Liquid Glass night token values
- `style/themes/liquid-glass/surfaces.css`
  - body, containers, cards, panels, page shells
- `style/themes/liquid-glass/controls.css`
  - buttons, links, form fields, toggles, custom selects
- `style/themes/liquid-glass/game.css`
  - board shell, grid cells, tiles, score boxes, timerbox, top actions
- `style/themes/liquid-glass/modals.css`
  - replay/settings/announcement/game dialogs/guides
- `style/themes/liquid-glass/pages.css`
  - page-level surfaces for account/history/replay/practice/PKU/relay/modes/palette/admin/user profile/utility pages
- `style/themes/liquid-glass/responsive.css`
  - only theme-specific mobile adjustments
- `style/themes/liquid-glass/fallbacks.css`
  - `@supports not (backdrop-filter)`, `prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors`

Selector rule:

```css
:where(html[data-visual-theme="liquid-glass"]) .component-owner {
  ...
}
```

Prefer theme tokens over high-specificity page selectors. Use `!important` only when overriding an existing guarded priority boundary that cannot safely be changed in the same pass.

### `2048-ranked`

Add a separate visual theme axis:

- `src/lib/visual-theme.ts`
- `src/lib/visual-theme.server.ts`
- `src/components/visual-theme-toggle.tsx`
- update `src/app/layout.tsx` to SSR-set `data-visual-theme`
- update the pre-paint script to apply `data-visual-theme`
- add Liquid Glass CSS to `src/app/globals.css` or split to `src/app/liquid-glass.css` imported by `globals.css`

Do not convert every Tailwind class immediately. First, override through existing CSS variables and a focused Liquid Glass layer. Replace hard-coded color utility classes only where they block complete theme replacement.

## Token Model

Shared conceptual token groups:

- background: page, page-accent, content-backdrop
- glass surface: base, raised, floating, modal, popover, navbar
- glass material: blur, saturation, opacity, tint
- glass edge: border, highlight, inner-shadow
- text: primary, secondary, subtle, on-glass, on-strong
- controls: primary, secondary, destructive, disabled, hover, active
- board: board-shell, grid-cell, tile surface ladder, tile text ladder
- feedback: success, warning, danger, info
- focus: ring, ring-strong
- motion: transition-fast, transition-normal

Day and night values must differ in luminance, opacity, and shadow strength, not only hue.

## Visual Direction

### Day

- Page background: very light neutral with subtle cool/warm depth.
- Glass surfaces: mostly white/translucent with clear edge highlights.
- Text: dark neutral, not low-contrast gray.
- Controls: restrained blue/indigo accent for primary actions; amber retained where it represents 2048 tile value identity.
- Board: translucent shell with visible grid separation; tiles keep recognizable value hierarchy.

### Night

- Page background: near-black or deep neutral, not saturated navy-only.
- Glass surfaces: dark translucent layers with white edge highlights at low opacity.
- Text: near-white primary, muted secondary.
- Controls: stronger border/highlight than day to separate glass on dark backgrounds.
- Board: lower blur and higher opacity than day to prevent muddy tiles.

## Component Coverage

### Game Core

- `body`, `.container`, `.heading`, `.scores-container`
- `.score-container`, `.best-container`, `.home-user-display`
- `.top-action-btn`, `.restart-button`, mobile top controls
- `.game-container`, `.grid-cell`, `.tile .tile-inner`
- `.timerbox`, `.timertile`, `.timer-leaderboard-*`
- `.game-message`, game dialogs, settings and replay modals
- guide overlays, announcement modal, mode intro modal

### Page and Utility Coverage

- Account/login/register/password/profile
- History and mini boards
- Replay import/runtime controls
- Practice board, PKU board, relay 5x5
- Modes, palette editor, achievements, admin, stone monitor
- API docs, cache reset, favicon preview, ranked seed validator, UI preview
- Breakout/easter egg only needs readable chrome unless it has its own visual world

### Ranked Coverage

- Site header/footer
- Leaderboard tables and rows
- Board list/detail pages
- Auth forms and account pages
- Admin dashboards/tables/forms
- Loading skeletons and error/not-found pages

## Accessibility and Performance

- Use `backdrop-filter` only on bounded surfaces, not full-screen wrappers.
- Add opaque fallback surfaces for browsers without `backdrop-filter`.
- Add reduced-transparency fallbacks to increase surface opacity and remove blur.
- Keep focus rings visible on glass and dark backgrounds.
- Keep text contrast at least WCAG AA for normal text.
- Keep table sticky headers opaque enough to remain readable while scrolling.
- Keep board dimensions stable by never adding borders that alter sizing without `box-sizing: border-box`.

## Rollout Strategy

1. Build the state model and persistence with no visual changes.
2. Add token-only Liquid Glass scaffolding behind `data-visual-theme`.
3. Apply core game/components first.
4. Apply secondary/static pages.
5. Apply `2048-ranked`.
6. Add screenshots, accessibility checks, fallback tests, and documentation.
7. Keep classic as default until Liquid Glass passes full coverage.

## Risk Areas

- Existing dynamic `ThemeManager` CSS injects high-priority board styles.
- Existing night background CSS is a preference layer, not a full color scheme.
- Some ranked pages use direct Tailwind color utilities that may need targeted conversion.
- Backdrop blur can be expensive on mobile if applied to large areas.
- Glass can reduce readability unless contrast and opacity are tuned per scheme.
