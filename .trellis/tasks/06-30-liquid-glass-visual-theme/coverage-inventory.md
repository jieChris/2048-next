# Liquid Glass Theme Coverage Inventory

## Baseline Scope

This inventory exists to keep implementation aligned while the visual theme is added in phases.

The first implementation pass must not change classic visuals. Phase 1 only introduces persisted
state and root attributes:

- `data-visual-theme="classic|liquid-glass"`
- `data-color-scheme="system|light|dark"`
- `data-resolved-color-scheme="light|dark"`

Existing `data-night-background="1"` remains a compatibility preference until the new color-scheme
axis is fully wired into visual styling.

## `2048-next-logo-work` Runtime Entry Points

Early root state:

- `public/js/core_night_mode_preload.js`
  - already runs before page runtime on production HTML entries.
  - must become the first-paint bridge for visual theme and resolved color scheme.

Settings modal state:

- `src/bootstrap/settings-modal-page-host.ts`
- `js/core_settings_modal_page_host_runtime.js`
  - canonicalizes rows for game settings dialogs.
  - should expose visual-theme and color-scheme controls without removing the legacy night toggle.

Dynamic style injection:

- `js/core_night_mode_runtime.js`
  - owns the legacy night-background style tag and runtime toggle.
  - must remain compatible with `settings_night_background_enabled_v1`.
- `js/theme_manager.js`
  - owns board/palette themes and injected board CSS.
  - existing `glass` theme is a board palette/effect and must not become the global visual theme.

## CSS Coverage Buckets

Core game:

- document/page background
- shell/container
- score/best/timer panels
- top action buttons and mobile controls
- board shell, grid cells, tile inner surfaces
- game message and replay actions

Runtime overlays:

- settings modal
- replay modal and import/export controls
- announcement modal
- guide and challenge intro overlays
- mobile hint modal

Page-owned surfaces:

- account
- history
- replay
- practice
- PKU
- relay 5x5
- modes
- palette
- achievements
- admin
- user profile
- utility pages such as cache reset, favicon preview, ranked seed validator, and UI preview

## `2048-ranked` Coverage Buckets

State:

- SSR root `data-visual-theme`
- pre-paint script bridge
- visual-theme cookie
- existing color-scheme cookie remains separate

Surfaces:

- site chrome/header/footer
- leaderboard tables
- board list/detail pages
- auth/account forms
- admin tables/forms
- loading, error, and not-found states

## Verification Matrix

Required viewport set:

- desktop `1440x1000`
- mobile `390x844`

Required modes:

- classic default
- classic with legacy night background
- liquid-glass light
- liquid-glass dark

Phase 1 validation is limited to state and persistence. Visual screenshots become required after
Phase 2 token scaffolding starts producing visible differences.
