# Source keyboard tools implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation. The user approved the behavior and requested implementation; no further design approval or Git operation is needed.

**Goal:** Let Source number keys apply the selected fill or shape tool at the pointer.

**Architecture:** Extend the existing Source drawing hook and shortcut lifecycle. Reuse the fill worker, shape kernels, stroke buffers, and `stroke_end` history. Brush and eraser retain the existing number-key brush stamp.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright.

**Spec:** The approved conversation: fill once on keydown; line, rectangle, and ellipse start on keydown, preview during pointer movement, and commit on matching keyup. Escape cancels the uncommitted shape. Shapes retain the initial level and brush size.

## Global constraints

- Source only; outside the canvas number keys select a level.
- Preserve ordinary mouse drawing and all Hex display behavior.
- Suppress key repeats and overlapping pointer/keyboard gestures.
- Preserve existing Undo/Redo and Glaze override semantics.
- Do not commit, push, install dependencies, or modify the toolchain.
- Keep the existing checkout so the running preview includes earlier authorized changes.

## Review focus

- Tab changes, dialogs, and window blur must not retain or commit an abandoned keyboard shape.
- Releasing another key must not finish the active shape.
- Pending fills must ignore stale results after canvas replacement or cancellation.
- Moving outside the canvas must clip the shape rather than pin its endpoint to an edge.
- Zoom, pan, and focused controls must not produce stale coordinates or accidental drawing.

## Task 1: Tool-aware keyboard drawing

**Files:** `src/hooks/useCanvasDrawing.ts`, `src/hooks/useKeyboardShortcuts.ts`, `src/App.tsx`, and their test fixtures; `e2e/source-keyboard.spec.ts`.

**Interfaces:** Source drawing exposes `beginKeyboardDrawing(level, code)`, `endKeyboardDrawing(code)`, and `cancelKeyboardDrawing()`. Shortcuts forward fresh keydown, matching keyup, and cancellation. The fill/shape gesture uses the existing drawing ownership ref.

- [x] Add E2E tests for bounded fill plus atomic Undo/Redo, each shape's preview and commit, Escape, unrelated keyup, tab/Help/blur interruption, and transformed coordinates.
- [x] Run the new fill and shape tests before implementation; expect failure because numeric input only places a brush stamp.
- [x] Share the existing fill request path and extend keyboard gesture ownership without changing the pointer path.
- [x] Forward keydown/keyup/cancel through shortcuts; cancel on tab or modal interruption.
- [x] Run focused hook tests and the Source keyboard E2E file; expect all tests to pass.

## Task 2: Explanation and final verification

**Files:** `src/i18n/en.ts`, `src/i18n/ja.ts`, `src/shortcuts.ts`, `src/components/__tests__/HelpModal.test.tsx`, `docs/user-guide.md`.

**Interfaces:** Help and the guide describe number-key stamping/fill and held-key shape drawing without changing Glaze shortcuts.

- [x] Update Source help and guide text for the final behavior.
- [x] Run `npm run verify`; expect formatting, lint, dead-code, type, build, and unit checks to pass.
- [x] Run Source keyboard, input, stroke, and app-flow E2E checks with `--workers=2`; investigate failures with one worker.
- [x] Obtain a read-only feature review and address concrete findings.
- [x] Verify fill in an isolated in-app browser origin, save a screenshot, and close the temporary tab/server. The in-app browser only supports complete key presses, so held-key shapes are verified in the Chromium E2E suite instead.
