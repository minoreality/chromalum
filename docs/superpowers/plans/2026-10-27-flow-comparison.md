# Flow Comparison Implementation Plan

> Use superpowers:executing-plans for inline implementation and a final independent review.

**Goal:** Compare the editable initial Flow pattern with the selected generation on wide screens.

**Architecture:** Reuse the state, interaction and canvas components. A container query selects comparison mode; a ResizeObserver synchronizes the DOM and keyboard order with it. Reuse the two control groups in both layouts.

**Tech Stack:** React, TypeScript, CSS, Vitest, Playwright.

**Spec:** [Approved design](../specs/2026-10-27-flow-comparison-design.md)

## Global Constraints

- Retain 49×49 cells, time 0–64, padded computation and existing storage.
- Comparison at container width 960px or greater; preserve narrow single-view behavior.
- Work in the current `codex/automata-ca` checkout and preserve the existing select-centering edit. Leave changes uncommitted for review.
- All styles remain in `src/styles/global.css`; update English/Japanese copy and its tests together.
- User follow-up: eight palette colors in one row and both selectors side by side in comparison mode; use large boards rather than forcing the entire interface into the viewport height.

## Review Focus

- Result input must not mutate the seed even at generation zero.
- Initial edits and preset selection must retain the selected generation in comparison mode.
- Resizing while drawing must cancel a stroke without losing edits or leaving stale capture.
- Hidden tabs, language changes and reload must preserve both views and their accessible labels.
- Long labels and wide glyphs must not displace the boards or controls.

### Task 1: Separate seed editing from observation time

**Files:** `src/automata/state.ts`, `useAutomataInteraction.ts`, `AutomataCanvas.tsx`, their tests.

**Interfaces:** Optional `editable` canvas/interaction flag overrides time-based editing. `set-preset` accepts optional `preserveTime`; `paint-cells` always targets the seed.

- [x] Add failing tests for editing the initial pattern at time 1, preserving time on presets, and read-only result input at time 0.
- [x] Run the focused tests and verify the expected failures.
- [x] Implement the explicit permissions and preserve the default single-view behavior.
- [x] Run `npm test -- src/automata`; expected: all tests pass.

### Task 2: Compose and verify the comparison layout

**Files:** `src/components/AutomataPanel.tsx`, `src/styles/global.css`, `src/i18n/en.ts`, `ja.ts`, related unit tests, `e2e/automata.spec.ts`.

**Interfaces:** Initial canvas uses `automata-initial-board`; the current/result canvas keeps `automata-board`. Initial and result controls have their own pane containers. CSS exposes `--automata-comparison` to the panel observer.

- [x] Add browser coverage for equal side-by-side boards, controls below their own board, edits reflected in the result, read-only result input, preservation through resize and reload.
- [x] Run the new cases before implementation and confirm failure.
- [x] Split the controls and compose both responsive layouts; add descriptive canvas labels and keyboard hints.
- [x] Update historical tests where they intentionally assumed a single desktop board; keep narrow-layout assertions.
- [x] Run `npm run verify`, `npx playwright test e2e/automata.spec.ts e2e/accessibility.spec.ts --workers=2`, and `npm run test:pwa -- --workers=2`; expected: pass. Retry any e2e failure alone with one worker.
- [x] Inspect the live desktop and narrow UI, capture the result, and review the final diff.

## Review correction

- The independent reviewer found synchronous time-64 evolution on every pointer move. The controller now exposes a settled seed for the result; active strokes redraw the initial canvas immediately and settle the result on release/cancel. Keyboard edits and generation-zero previews stay immediate.
- Verify this with `useAutomataState` coverage and the browser case `draws immediately at generation 64 and updates the result when the stroke ends` (both observed failing before the fix).

## Initial comparison verification

- `npm run verify`: passed, including 124 test files and 1,775 unit tests.
- Flow and accessibility browser tests: 69 passed with two workers.
- Production PWA browser tests: 7 passed with two workers.
- Live desktop at 1159×668: equal canvases measured approximately 488px square, all eight palette colors in one row, selectors side by side, and no horizontal page overflow. Narrow geometry, wide-glyph fonts, keyboard input, resizing and persistence are covered by the browser suite.
- The existing drawing and generation 64 remain intact. Changes are uncommitted.

## Follow-up: generation controls and edited patterns

The user approved generation-based action names, an edited-pattern indicator, removal of the result-mode text, and a previous-generation button.

- [x] Add previous-generation navigation without mutating the initial seed; disable it at generation zero.
- [x] Detect edits by comparing the seed with its preset, including restored drawings. Show a separate edited-pattern option so the same preset can be reapplied. Keep the persisted schema unchanged.
- [x] Remove the result-mode text and its translation keys; retain the single-view editing hint without exposing it as a result description.
- [x] Use previous, next and generation-zero actions, with a second row for generation zero below a 440px controls container.
- [x] Verify new navigation and edited-pattern behavior through failing-then-passing unit tests; check persisted state and responsive browser geometry.
- [x] Run final repository, Flow/accessibility and PWA checks.

The comparison layout check now measures document coordinates: select interactions may scroll the viewport, which must not be mistaken for a change in board position. Pointer tests refresh viewport coordinates before starting their next stroke.

Follow-up verification:

- `npm run verify`: passed, including 124 test files and 1,777 unit tests.
- Flow/accessibility: 57 cases passed on the full run; the 12 Source-independence cases were updated to distinguish the 12 enabled presets from the disabled edited-pattern status and all passed on the focused rerun.
- PWA: 7 passed with two workers.
- Live Japanese UI shows the edited-pattern status and all three generation actions without the result-mode text. Existing drawing and generation 64 remain intact.

## Follow-up: numeric drawing

**Files:** `useAutomataInteraction.ts` owns numeric input and pointer/keyboard targets; `AutomataCanvas.tsx` forwards focus lifecycle; `shortcuts.ts` and both language dictionaries describe the new keys. Associated interaction, copy, shortcut and browser tests verify behavior. The palette component stays unchanged.

- [x] Add failing interaction tests for 0–7 color selection and stamping, hover without clicking, keyboard targets, read-only results and input ownership.
- [x] Implement plain numeric keys only on the active editable Flow canvas. Validate pointer targets with current hit testing, prefer arrow selection after keyboard navigation, and ignore modifiers, composition, repeat, dialogs and pointer strokes.
- [x] Update accessible keyboard hints and Flow's Shortcuts entry, with matching copy tests.
- [x] Verify actual browser hover/focus, wide and narrow permissions, tab switching, Source isolation and persistence; run `npm run verify` and relevant browser checks.

Numeric drawing review correction: scrolling can trigger `pointerleave` without pointer motion or loss of focus. Preserve the keyboard target in that case, and clear it only when an actual mouse/pen move leaves the canvas. Unit and browser regressions cover both scroll continuity and moving onto the read-only result. The reviewer confirmed the correction resolves the finding.

- Focused interaction tests: 33 passed, including all eight colors, numeric numpad input, stale hit targets, controls/dialogs, modifiers, repeat and read-only permissions.
- Flow/accessibility browser checks: 73 passed with two workers, including numeric input at 1280px and 682px, persistence, Source isolation, keyboard focus and scrolling.
- Final `npm run verify`: passed, including formatting, lint, dead-code checks, all type checks, production build, and 124 test files / 1,792 unit tests.
- Live Japanese Flow loaded the new keyboard hints and retained its existing drawing. The palette still shows only K, B, R, M, G, C, Y, W. Changes remain uncommitted.

## Follow-up: cell cursor and horizontal slider keys

**Files:** `useAutomataInteraction.ts` supplies a local pointer cell without dispatching hover into persisted state; `AutomataCanvas.tsx` displays one pointer-transparent cell outline over editable canvases; `render.ts` permits omitting the baked-in selection outline for those canvases; `global.css` styles the frame and replaces the crosshair. `AutomataPanel.tsx` prevents the slider's native Up/Down changes only. Hook/component and browser tests cover the resulting interactions.

While implementation was underway, the user also adopted hiding pointer outlines outside the board while retaining keyboard targets, and combining held arrow directions for diagonal canvas selection. Track held directions with window keyup and reset them on blur/inactive/focus changes; retain native keyboard repeat timing. These are part of this same interaction follow-up.

The user subsequently requested removing the dimming of the evolved canvas during a stroke. Remove only the `aria-busy` opacity rule; keep stroke-end computation and the accessible busy indication. This is a visual-only follow-up, verified with the existing stroke-end browser scenario and live computed styles.

- [x] Add failing tests for hover before clicking, one outline following hover/click/drag/digits, unchanged persisted state on hover, read-only and keyboard behavior, and horizontal-only slider arrow keys.
- [x] Implement the local cursor overlay and scoped slider handler; retain approved surrounding behavior and the existing working checkout.
- [x] Verify focused tests and real desktop/narrow browser geometry, then obtain a bounded independent review and run repository checks.

Cursor/navigation verification:

- `npm run verify`: passed, including 124 test files / 1,797 unit tests.
- Flow/accessibility browser checks: 77 passed with two workers. The added cases cover a cell-sized transparent outline before and through click/drag/numeric drawing at desktop and narrow widths, pointer/keyboard visibility, native read-only behavior, horizontal slider keys, and diagonal arrow selection.
- Independent review found no actionable issues in the scoped cursor, keyboard, and slider changes.
- After the final opacity-rule removal, formatting and the production bundle were checked again; the existing generation-64 stroke scenario was rerun. The evolved canvas keeps its brightness while stroke-end result updates remain intact.

## Follow-up: palette selection and swatch visibility

User approval covers a separate selected-color marker, unchanged swatch colors during hover, and approximately 40px buttons in the wide comparison layout. Keep the existing checkout and surrounding approved work.

**Files:** `src/styles/global.css` owns the selection marker, scoped hover styling and container-based sizing; `e2e/automata.spec.ts` checks hover/press colors and focus without changing selection.

- [x] Reproduce the hover-color override in desktop and narrow browser cases, then retain those behavioral regressions.
- [x] Use a fixed reserved gap below each swatch for the selection marker, retain the keyboard focus outline, and enlarge only wide comparison swatches with a clamped size.
- [x] Check desktop/narrow geometry, absence of selection-induced layout shifts, both languages and existing drawing controls. Run scoped checks and obtain a bounded independent review.

Palette verification:

- Before the fix, both browser cases reproduced black changing to `rgb(26, 26, 58)` during pointer press. After the fix, both pass for all eight colors, including preserved selection while another swatch has keyboard focus.
- Flow/accessibility browser suite: 79 passed with two workers, including both languages, desktop/narrow widths and MS Gothic geometry checks.
- Targeted formatting, E2E lint, tooling typecheck, production bundle and `git diff --check` passed. No application TypeScript or state logic changed in this follow-up.
- Live Japanese desktop: eight 40px swatches in one row, a marker below the selected color and no horizontal overflow. Independent review found no actionable issues.
