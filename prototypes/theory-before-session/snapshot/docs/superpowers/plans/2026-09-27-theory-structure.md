# Theory Structure Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved plan in the current session. Steps use checkbox syntax for tracking.

**Goal:** Present Theory as finite set structure, additional order conditions, then continuous representation, with finite-geometric developments after the main derivation.

**Architecture:** Keep the existing figures and their interaction contracts. Reorganize `TheoryPanel`, split prose at mathematical dependency boundaries, and introduce a small two-input set-operation explorer before the Hasse diagram.

**Tech Stack:** React, TypeScript, bilingual i18n, global CSS, Vitest, Playwright.

**Spec:** The six-chapter structure approved in this conversation on 2026-09-27, constrained by `docs/algebraic-color-model.md` and `AGENTS.md`.

## Approved structure

1. Three primaries and eight states: powerset, state labels, subsets and three bits; no numeric weights.
2. Set operations and inclusion: define union, intersection and complement directly; two arbitrary inputs; characterize join/meet by inclusion; atom decomposition; Hasse; complement duality and the retained GRB/MCY application.
3. Toggles, distance and the chromatic six-cycle: symmetric difference, toggle composition/cancellation, Boolean ring supplement, Hamming distance, cube and C6; no use of rank L.
4. Total order and binary weights: added score conditions, total order, rank, primary ranks, rank formula; gapless subset-sum uniqueness as a supplement after the formula.
5. Rank and operations: complement sums, valuation identities, disjoint additivity, rank change under a single-channel toggle, distinction from Hamming distance.
6. Continuous extension: explicit affine interpolation, Tone Zigzag, fibers and complements.

After these six chapters, identify developments from distance (K8 and parity), nonzero vectors (Fano/Hamming), and complement/adjacency (die/octahedron). Preserve conclusion, scope and correspondence table at the end.

## Global constraints

- Preserve the ongoing uncommitted Theory changes in the current checkout and the live development page. No commit, push or publication is authorized.
- Keep all CSS in `src/styles/global.css`; no dependency or production entry-point changes.
- Keep color-state labels distinct from channel names; bit patterns before rank are presence coordinates.
- Derive rank from `w_B>0`, `w_R>w_B`, `w_G>w_R+w_B`. Real score weights are not forced to 1,2,4.
- H is a continuous display layer, not additional elements of A; XOR is not physical mixing and the Boolean ring is not GF(8).
- Update English and Japanese together, including existing copy/layout fixtures.
- Retain existing Hasse/cube switching, reduced-motion behavior, touch and keyboard interaction.

## Review focus

- Earlier finite-structure prose must not require later rank definitions.
- Inputs to the new explorer must allow all eight states, including empty/full and identical inputs; outcomes must agree with set union/intersection for all 64 pairs.
- Varying subset/result text must not shift the explorer or overflow at narrow widths and wide system fonts.
- All existing diagrams must appear once, with accessible headings and unchanged controls after relocation.
- Supplementary proofs and advanced constructions must remain available without interrupting the six-chapter derivation.

### Task 1: Two-input set operations

**Files:** Create `src/components/theory/SetOperations.tsx` and its test; modify `src/i18n/en.ts`, `src/i18n/ja.ts`, `src/styles/global.css`.

**Interfaces:** `SetOperations()` is a self-contained figure with inputs S,T controlled by three native toggle buttons each and simultaneous union/intersection results. Initial states are Y={G,R} and M={R,B}. Expose color name, subset, and G/R/B presence without displaying rank numbers.

- [x] Add and run a behavioral test covering all 64 input pairs against independent set membership expectations, including empty/full/identical pairs.
- [x] Implement the explorer with native keyboard controls, text labels independent of color, and responsive container-based layout.
- [x] Run its tests; check English/Japanese rendering in the integrated browser pass.

### Task 2: Reorganize mathematical exposition

**Files:** Modify `src/components/TheoryPanel.tsx`, `src/components/theory/DerivationMap.tsx`, both i18n files, `docs/algebraic-color-model.md`, and `docs/theory-tab-prior-art-and-improvements.md`.

**Interfaces:** Retain existing anchors where their subjects remain; add `theory-rank-operations`, `theory-complement`, `theory-distance`, and `theory-chromatic-cycle`. `theory-cube` stays the Hasse subsection under set operations; `theory-k8` becomes an advanced chapter. New i18n keys split XOR definition from conditional coincidences, distance from rank changes, and the introductory operations from inclusion characterization.

- [x] Update existing order and claim-boundary fixtures to the approved structure, and observe the expected failures before edits.
- [x] Define union/intersection/complement first; prove their bound characterization afterward. Keep Gamma only as a supplementary atom-decomposition notation.
- [x] Relocate rank-dependent identities after rank; keep all finite geometric/coding developments after the continuous chapter with an explicit transition.
- [x] Move the rank formula ahead of the subset-sum uniqueness supplement and align the research note's exposition and Theory map.
- [x] Run `npm run test:theory-copy`, then `npm run verify:theory`.

### Task 3: Integration verification and review

**Files:** Update affected selectors/copy in `e2e/theory.spec.ts`; add behavioral coverage for the new explorer there.

- [x] Format touched files, run lint and check the diff.
- [x] Run affected Theory browser tests serially, including rank/complement relocation and retained mixing/Hasse interactions.
- [x] Inspect the live page in Japanese and English at desktop/narrow widths, including MS Gothic; verify explorer input/output, stable dimensions, and no page errors.
- [x] Review the change against this plan and the mathematical source; address material findings, then report verified scope.

## Execution record

- The user approved the design and asked to proceed. Continue implementation directly in the existing working tree; another approval of this transcription is unnecessary.
- This plan covers the Theory presentation; it does not redesign the pre-existing Venn interaction or replace the GRB/MCY logic-gate figures.

- Completed: copy checks 11/11; verify:theory 27 files, 285 tests; tooling typecheck and lint passed; affected Chromium E2E 8/8. Live 5173 audit passed in Japanese/English at 320 and 900 px; E2E also covers 390/1280 px and MS Gothic.
- Final review found one premature rank announcement in ColorCube's accessible state label. The label now uses state name and bits only; its focused test failed before the change and passed afterward. The final Theory suite and live accessible-label audit passed.
- Screenshots and audit data: C:/Users/human/AppData/Local/Temp/chromalum-theory-structure. No commit or publication was performed.
