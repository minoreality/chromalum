# Restore the fixed Flow plane

**Goal:** Remove Source image coupling and the loaded-image preset, restoring 49x49 cells and time 0-20 while preserving the approved UI refinements.

**Spec:** The user's explicit approval in this conversation to retain UI improvements and undo image coupling from `848fa25`.

**Architecture:** Restore the small synchronous automaton from `0525099`. Keep compact controls, white R/M labels, hidden auxiliary copy, responsive selectors and downward pickers. Read earlier saved states for compatibility and save fixed planes under a separate key so image-era data is not overwritten.

**Tech stack:** Existing React, TypeScript, Vite, Vitest and Playwright; no dependencies or toolchain changes.

## Constraints and review focus

- The board always has 49x49 square cells, with 12 presets and time limited to 0-20.
- Source imports must not reset Flow edits, rule, selection or time.
- Preserve version-1 and fixed-size version-2 Flow edits. Reset larger planes to their named preset at time zero; removed image presets use the default. Retain the legacy storage record.
- Keep all prior UI adjustments and screen-reader guidance, and test desktop and narrow layouts.
- Do not change Source data or rewrite Git history. This request does not include a new commit or push.

## Tasks

- [x] Add failing migration and Source-independence regressions.
- [x] Remove image-only code, restore the fixed model and migrate storage without overwriting the legacy record.
- [x] Verify the full project, Flow/browser accessibility, and the live browser; review the final diff.

## Progress

- Three migration regressions failed against the image-sized implementation, then passed with the fixed-board migration. The first Source-import browser regression failed with 80 columns instead of 49.
- The focused unit run passed 402 tests. Source restoration success and failure both preserve the independent Flow edits and time.
- Extreme portrait Source imports exposed zero- or one-pixel Flow widths inherited from shared image sizing. The initial fallback overflowed at tablet widths. Flow now uses the existing viewport fitter with a square aspect independently of Source. Browser regressions compare the displayed board dimensions before and after image imports at desktop, tablet and narrow widths.
- Final verification: `npm run verify` passed all 1,752 unit tests and static/build checks; Flow and accessibility E2E passed all 63 cases. The live browser confirmed 49x49 cells, time 0-20, 12 presets and the retained compact UI. Independent review found no outstanding issues after the display-size fix.
