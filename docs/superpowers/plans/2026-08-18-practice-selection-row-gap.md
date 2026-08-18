# 练习板选中棋子固定行距 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the practice-board tile rows on a fixed layout gap while allowing the selected tile's visual scale to overlap adjacent tiles.

**Architecture:** Reuse the existing `.selection-tile.selected` state. CSS keeps the flex item size fixed, then layers the scaled tile above neighboring tiles; no new runtime state or layout algorithm is introduced.

**Tech Stack:** Existing HTML/CSS, TypeScript smoke assertions, Codex in-app browser.

---

### Task 1: Add a regression assertion for the layout row gap

**Files:**
- Modify: `tests/smoke/pages-practice-mode-picker.smoke.spec.ts:99-132`

- [x] **Step 1: Measure row offsets and fixed layout gaps**

  In the existing 320×568 practice-board test, group tiles by `offsetTop` and calculate each row's gap from its untransformed layout box.

- [x] **Step 2: Assert row gaps stay near 4px and the selected layer remains higher**

  Compare the selected tile's z-index with its inner tile, allow its transformed box to overlap, then select value `64` and assert every layout row gap remains between 3.25px and 4.75px.

### Task 2: Keep the selected scale out of flex layout

**Files:**
- Modify: `Practice_board.html:152-163`

- [x] **Step 1: Keep the selected tile's box size fixed**

  Add `box-sizing: border-box` to `.selection-tile`, leaving `gap: 4px`, `transform: scale(1.15)`, and `z-index: 100` unchanged.

- [x] **Step 2: Remove margin compensation**

  Do not add responsive margins; the transformed tile is intentionally allowed to overlap neighboring rows and remains above them through `z-index`.

### Task 3: Verify the focused change

**Files:**
- Verify: `Practice_board.html`, `tests/smoke/pages-practice-mode-picker.smoke.spec.ts`

- [x] **Step 1: Run static checks**

  Run `npx tsc --noEmit` and `git diff --check`; both must exit with code 0.

- [x] **Step 2: Use the in-app browser at 320×568 and 1280×720**

  Confirm the selected tile remains above its overlapping neighbor, layout row gaps remain approximately 4px, and reset the temporary viewport override before handoff.
