# Account Leaderboard UX Acceptance

## Scope
- Page: `account.html`
- Module: online leaderboard (header, filters, table, pagination, status)

## Screenshot Baseline
- Desktop: 1536x785 viewport, leaderboard card fully visible.
- Mobile: 390x844 viewport, filters and table fully visible without horizontal overflow.

## Desktop Checklist
- Title and filter controls are visually separated into two layers.
- Subtitle text is present under leaderboard title.
- Table header remains readable and aligned with data columns.
- Top 3 rows are visually distinguishable from normal rows.
- Pagination area is detached from table body and centered.
- Empty state is centered and readable.
- Error state uses distinct styling and readable message.

## Mobile Checklist
- Leaderboard title remains readable and not visually collapsed.
- Filter row wraps naturally and controls remain clickable.
- Table content remains aligned and does not clip score/date text unexpectedly.
- Pagination buttons remain centered and tappable.
- No horizontal page scroll introduced by leaderboard module.

## Interaction Checklist
- Clicking `Ë¢ÐÂ` enters loading state: button disabled + loading text.
- Loading end restores button text and enabled state.
- Mode switch refreshes data and resets to page 1.
- Metric switch refreshes data and resets to page 1.
- Prev/Next obeys available page boundaries.

## i18n Checklist
- Chinese: title/subtitle/filter labels/status text are all Chinese.
- English: title/subtitle/filter labels/status text are all English.
- Language switch updates refresh button text and leaderboard subtitle.

## Regression Commands
- Build: `npm run build`
- Refactor gate: `npm run verify:refactor`

## Suggested Playwright Spot Checks
- Open page and wait for leaderboard load.
- Toggle mode and metric once each.
- Trigger refresh and assert button disable/restore.
- Verify pagination button disabled states on first/last page.
