# Flow Color Rules Implementation Plan

**Goal:** Preserve existing Flow rules while grouping XOR variants and adding OR, AND, channel majority and distance-one toggles with explanatory presets.

**Spec:** `docs/superpowers/specs/2026-10-27-flow-color-rules-design.md`

Continue the current serving checkout and leave changes uncommitted. Preserve all prior Flow work, original rule/preset IDs, state schema, and comparison/narrow interaction behavior.

## Task 1: Rule model and teaching presets

**Files:** `src/automata/model.ts`, `presets.ts`, model/preset/state tests and legacy fixture types.

**Interfaces:** Add rule IDs `or`, `and`, `majority`, `hamming`; add preset IDs `or-spread`, `and-core`, `majority-cleanup`, `hamming-boundary`. Keep all existing IDs. Existing state validation discovers the extended lists.

- [x] Add and observe failing tests for local truth tables, color differences/cancellation, out-of-bounds K, and each preset's observable effect.
- [x] Implement the four rules and deterministic presets; maintain the existing golden fixtures as legacy references.
- [x] Extend independent reference evolution and persistence tests; pass focused Automata checks.

## Task 2: Grouped selection and verification

**Files:** `src/components/AutomataPanel.tsx`, both i18n dictionaries/copy tests, `src/styles/global.css`, panel tests and `e2e/automata.spec.ts`.

- [x] Group rule options into XOR, color operations/relations and Life-like rules. Name the four new presets for their paired rule and add a reserved-height accessible rule description.
- [x] Verify both languages, independent rule/preset selection, reload, preset demonstrations, selection menu bounds and stable desktop/narrow geometry.
- [x] Run repository verification, Flow/accessibility browser checks and PWA checks; obtain an independent scoped review and inspect the live UI.

Completed: `npm run verify` (125 files / 1,839 tests), Flow/accessibility browser regression (83 cases, two workers), PWA (7 cases, two workers), and independent review of all 131,072 five-cell color neighborhoods across the four new rules. Japanese/English geometry and picker checks cover 1280, 682, 390 and 320 px, including MS Gothic. Logs and the review record are in `.superpowers/sdd/2026-10-27-flow-color-rules/`.

## Review focus

Treat off-grid cells as K for AND and Hamming instead of skipping them; keep synchronous reads; count a majority of five even at edges; Hamming must inspect the complete three-bit color instead of separate binary planes; preserve all original choices, saved drawings and viewport behavior. Corresponding model/persistence/browser cases cover these conditions.
