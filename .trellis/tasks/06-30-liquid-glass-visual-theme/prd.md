# Liquid Glass Visual Theme PRD

## Goal

Add a new Apple Liquid Glass inspired visual theme that can fully replace the current visual presentation across the project while coexisting with the current classic theme. The theme must support both day and night color schemes, switch cleanly, and remain isolated from existing gameplay, API, account, leaderboard, replay, ranked session, and backend authority.

## Official Reference Baseline

This theme should follow Apple's public Liquid Glass design direction as a web adaptation, not as a native Apple framework implementation.

Reference sources:

- Apple Human Interface Guidelines: Materials, `https://developer.apple.com/design/human-interface-guidelines/materials`
- Apple Newsroom introduction of the 2025 software design, `https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/`
- Apple Developer WWDC design sessions about Liquid Glass and adopting the new design language, `https://developer.apple.com/videos/`

Web implementation constraints:

- CSS cannot use Apple's private/native material APIs.
- The project should emulate the design language through tokens, surfaces, layered translucency, highlights, shadows, controlled blur, and accessibility fallbacks.
- Do not copy current `ThemeManager` glass theme as the final solution. Existing `glass` is a board/palette effect, not a full site visual system.

## Product Requirements

### Visual Scope

- Theme coverage must include all production pages in `2048-next-logo-work`.
- Theme coverage must include the `2048-ranked` Next site, because the user-facing product is understood as one website experience.
- The new theme must be a complete visual replacement, not a partial board skin.
- The current classic theme must remain available and visually unchanged.
- Theme switching must not break current board palette selection, night background preference, account UI, leaderboard UI, replay UI, admin UI, or utility pages.

### Modes

Use two independent axes:

- Visual theme: `classic` or `liquid-glass`.
- Color scheme: `system`, `light`, or `dark`.

Resolved color scheme should become either day/light or night/dark at runtime. Liquid Glass must define both:

- Liquid Glass Day: light, clear, high-contrast glass over a restrained background.
- Liquid Glass Night: dark, low-luminance glass with crisp text, reduced glare, and stronger separation.

### UX Requirements

- Theme selection must be persistent.
- Theme selection must apply before first paint where practical to avoid a visible flash.
- Theme controls must be understandable in both frontends.
- The game board size and tile positioning must not change.
- Text, numbers, timer rows, leaderboard rows, dialogs, tables, and form fields must remain readable.
- Reduced-motion, reduced-transparency, unsupported `backdrop-filter`, and high-contrast/forced-color cases must degrade to opaque or semi-opaque surfaces.

## Non-Goals

- Do not redesign gameplay rules, board mechanics, replay verification, ranked session lifecycle, account authority, leaderboard authority, or backend behavior.
- Do not add Sass, PostCSS, or a new CSS build chain.
- Do not remove the current classic theme.
- Do not remove existing board palette/theme features. Reclassify them as board palette controls if needed.
- Do not make decorative blob/orb/bokeh backgrounds the core visual identity.
- Do not make the whole viewport one giant blurred layer. Blur should be limited to functional surfaces.

## Acceptance Criteria

- `classic + light`, `classic + dark`, `liquid-glass + light`, and `liquid-glass + dark` all work.
- `liquid-glass` can be selected, persisted, loaded before paint, and switched back to `classic`.
- Both frontends expose a visual-theme mechanism that does not conflict with existing color-scheme controls.
- Non-ignored HTML still has no inline style attributes and no `<style>` blocks.
- CSS imports resolve and theme files stay within focused file-size budgets.
- Core game pages, replay, account, history, practice, PKU, relay, modes, palette, achievements, admin, user profile, utility pages, and ranked pages have verified coverage.
- Playwright screenshot or computed-style checks cover desktop and mobile for both Liquid Glass day and night.
- Performance fallback checks prove unsupported or reduced-transparency environments remain usable.
