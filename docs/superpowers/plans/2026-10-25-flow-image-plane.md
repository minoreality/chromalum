# Flow image plane implementation plan

**Goal:** Use the imported editing image as a Flow initial pattern, with one cell per image pixel and the same aspect ratio.

**Spec:** The user's approved request in this conversation: add the loaded image to Initial pattern and match its resolution and aspect ratio.

**Architecture:** Pass the canonical canvas level data to Flow after restoration. Generalize the plane to width and height. Copy image data when selected, preserve independent Flow edits, and refresh the image seed when the source changes. Center existing patterns without resampling cells. Migrate existing saved square patterns and keep image-sized saves compact.

**Tech stack:** Existing React, TypeScript, Canvas, Vite, Vitest and Playwright. No new dependencies.

## Constraints and review focus

- Preserve earlier UI changes and do not commit or publish during this task.
- Use editing dimensions after import resizing/cropping, bounded by the existing 2048-pixel edge limit.
- Maintain square cells, black exterior boundaries, all eight rules, and keyboard/pointer editing.
- A reload must preserve an edited image seed and time; asynchronous source restoration must not erase it.
- Source changes must not mutate Flow seeds by shared array reference or write Flow edits back to Source.
- Check thin/portrait/landscape planes, stale computations, legacy saves, and maximum-size persistence and computation.
- Keep CSS in global.css and verify desktop and narrow layouts.

## Tasks

- [ ] Add rectangular evolution, centered preset sizing, image seed/state actions, and legacy migration tests; observe failures, then implement.
- [ ] Add compact state persistence, rectangular geometry/rendering/interaction, source synchronization, and the image preset UI. Preserve source and Flow edits independently.
- [ ] Measure large-plane performance and move expensive computation off the UI thread as needed. Add cancellation/regression coverage.
- [ ] Test actual image import, all rules, edited seed restoration and responsive geometry. Run the full verification gate and Flow/accessibility e2e tests, then inspect the live browser.

## Progress

- Baseline: current square implementation takes about 173 ms at 320x320 and 1095 ms at 1024x1024 for 20 XOR steps on this machine. This justifies checking computation and rendering costs before delivery.
