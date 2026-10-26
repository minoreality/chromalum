# Flow Padding Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement these tasks in this session. Steps use checkbox syntax for tracking.

**Goal:** Keep the editable 49×49 Flow board while computing its exterior and extending observation to generation 64.

**Architecture:** Retain `evolvePlane` for finite-grid primitives and preset generation. Add `evolveVisiblePlane(seed, steps, rule)` using a 64-cell halo on each side and returning the central 49×49 window. Connect the existing memoized panel to that function.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright; no new dependencies.

**Spec:** [Approved scope](../specs/2026-10-26-flow-padding-design.md)

## Global Constraints

- PLANE_SIZE=49; MAX_TIME=64; computation size=177.
- Existing editing, layout, selectors, storage format and finite-grid reference fixtures remain supported.
- No overview, zoom controls, generation cache, auto-play, Theory copy, CSS or dependency changes.
- Continue in the clean `codex/automata-ca` checkout serving the selected browser. Leave changes uncommitted for review.

## Review Focus

- Edge/corner seeds must be influenced by cells beyond the visible window; cover XOR cancellation and a Life blinker.
- All eight rules must agree with independent per-channel evolution through t=64.
- Restore legacy t=20 data and round-trip t=64 without changing any edited cell.
- Palette and selection changes must not trigger evolution; edits and rule/time changes must refresh it.
- Desktop and narrow layouts must retain a 49×49 board and exact source data through time changes and reload.

### Task 1: Boundaries and generation limit

**Files:** `src/automata/model.ts`, its model/state/persistence tests, and `src/components/__tests__/AutomataPanel.test.tsx`.

**Interfaces:** Add `evolveVisiblePlane(seed: Uint8Array, steps: number, rule: AutomataRule): Uint8Array`; input/output stay 2401 cells. Keep `evolvePlane(seed, size, steps, rule)` finite.

- [x] First add panel regressions for advancing to 64 and a boundary-crossing Life oscillator; run them and confirm failure.
- [x] Add independent expanded-plane tests for all rules at t=64 and hand-derived edge/corner XOR cases.
- [x] Set the limit to 64, implement padded evolution, and update invalid-time tests to 65.
- [x] Run `npm test -- src/automata src/components/__tests__/AutomataPanel.test.tsx`.

### Task 2: Integrate and verify

**Files:** `src/components/AutomataPanel.tsx`, `e2e/automata.spec.ts` and test files above.

**Interfaces:** Panel memoization and readout consume the same 49×49 result; range and step bounds consume MAX_TIME.

- [x] Connect the panel, retaining the existing seed/time/rule memoization.
- [x] Update End-key expectations to 64 and add visible boundary behavior, reload and dimension checks.
- [x] Run `npm run verify` and `npx playwright test e2e/automata.spec.ts --workers=2`; isolate any e2e failure with one worker.
- [x] Review the scoped diff and verify the current browser without changing its drawing; obtain an independent final code review.

## Execution record

- Baseline: 9 files / 389 tests passed before changes.
- Scope ruling: the latest user message narrows the accepted recommendation to padded computation and 64 generations only.
- Workspace ruling: continue the existing Flow feature branch and local server; no new checkout is needed for this scoped continuation.
- Task 1 complete: the panel first failed at the time limit (20 instead of 64) and lost the edge blinker at t=2. Model/state/persistence failures followed; after implementation all 408 tests in the 9 related files passed.
- Task 2 complete: `npm run verify` passed formatting, lint, dead-code, both TypeScript checks, production build and 1771 tests in 124 files. All 55 Automata Playwright tests passed with two workers, including Japanese/English, narrow/desktop layouts, wide glyphs, touch, reload and the boundary regressions.
- Live browser: the existing drawing remained visible at t=0; the board still exposes 49×49 cells and the time slider now has max=64. Inspection did not edit the user's drawing or controls.
- Independent read-only review of the uncommitted diff found no actionable defects. It confirmed halo size, cropping, input preservation, memoization and legacy restoration.
- Final ruling on performance: the padded calculation costs more than the former finite plane; retain the accepted 64-generation scope and existing memoization. Earlier local measurements were about 42–125ms for representative rules at 64 generations; current browser tests pass. Generation caching remains outside this request, so slower devices may need a future performance pass.
- Final ruling on review coverage: unchanged historical selectors/storage/canvas behavior stays covered by the existing browser suite. The independent generation-64 oracle and hand-derived early edge regressions cover this change without testing every intermediate generation separately.
