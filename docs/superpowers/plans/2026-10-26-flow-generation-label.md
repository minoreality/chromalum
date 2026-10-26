# Flow Generation Label Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this small, approved change.

**Goal:** Show the current/maximum generation and distinguish editing from result viewing beside the Flow slider.

**Architecture:** Keep state and calculations intact. Add a labeled heading and description to the existing range input, with grid-overlaid reserved strings for stable geometry.

**Tech Stack:** Existing React, TypeScript, CSS, Vitest and Playwright.

**Spec:** [Approved UI scope](../specs/2026-10-26-flow-generation-label-design.md)

## Global Constraints

- Change only the two requested UI points; preserve existing uncommitted padding/time work.
- Japanese: `世代：{0} / {1}`, `初期配置を編集`, `結果を表示`.
- English: `Generation: {0} / {1}`, `Edit initial pattern`, `View result`.
- Both state strings and the maximum-width generation string reserve layout space; inactive strings are hidden from accessibility.
- All CSS stays in `src/styles/global.css`; no dependency changes or commits.

## Review Focus

- A one-digit to two-digit generation change must not move controls in a narrow container.
- Inactive labels must not contaminate the slider's accessible name or description.
- Restoring t=64 must immediately show the result mode and correct upper limit.
- Returning to t=0 must restore the edit label without changing the drawing.
- The new heading must wrap without overlap in both languages and wide-glyph fonts.

### Task 1: Labels and stable state display

**Files:** `src/components/AutomataPanel.tsx`, `src/styles/global.css`, `src/i18n/en.ts`, `src/i18n/ja.ts`, existing component/copy tests and `e2e/automata.spec.ts`.

**Interfaces:** Retain `automata_time` with current/max arguments; add `automata_edit_mode` and `automata_result_mode`. Range input uses a label and an `aria-describedby` state container.

- [x] Extend the existing component transition and copy tests; verify the expected failures.
- [x] Add the heading, reserved strings, and translations without modifying state or simulation.
- [x] Extend existing browser geometry tests to assert names, descriptions, visibility and stable bounds through 0→1→9→10→64→0.
- [x] Run focused tests, `npm run verify`, and Flow browser tests with two workers.
- [x] Inspect the live browser and request a scoped independent review; leave the result uncommitted.

## Execution record

- The user selected only the two highest-priority UI recommendations. Full view remains cancelled; palette colors and font sizes are outside this change.
- Reuse the existing feature checkout and preserve the completed, uncommitted calculation changes.
- Red: the existing component transition and copy tests failed on the missing generation label and old time wording before implementation.
- Green: the focused component, copy, and key-parity tests passed (17 tests). `npm run verify` passed all gates, including 1,771 tests in 124 files.
- `npx playwright test e2e/automata.spec.ts --workers=2` passed all 55 tests. The 16 geometry variants cover Japanese/English, widths 320/390/682/1280, and normal/MS Gothic fonts, including accessible names and descriptions.
- The live in-app browser displayed the new generation counter and result mode. The user's current drawing and controls were not changed during inspection; screenshot evidence is saved outside the repository.
- The scoped independent review reported no actionable findings. It excluded the separately reviewed simulation changes, cancelled features, and real screen-reader announcements; browser accessibility assertions passed in the completed suite.
