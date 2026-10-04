# User Guide

This guide is for first-time use of CHROMALUM as an app. For implementation
details, see [architecture.md](./architecture.md). For the research model behind
the Theory and Music tabs, start with the [documentation index](./README.md).

## First Run

Open the public demo or start the local development server with `npm run dev`.
CHROMALUM runs entirely in the browser: there is no account system, backend
service, or project server that stores your artwork.

The current canvas is autosaved in this browser with IndexedDB. Autosave is a
convenience feature, not a backup. Clearing site data, using private browsing,
or switching devices can remove local work, so export PNG files for anything you
need to keep outside the browser.

## Basic Workflow

1. Use the Source tab to draw an eight-level tone image or import an image.
2. Use Hex to choose how the eight tone levels map to color candidates.
3. Use Glaze to paint per-pixel color-variant overrides while preserving the
   underlying source tone structure.
4. Use Gallery to generate, compare, bookmark, and export color-pattern
   variants.
5. Use Map to inspect model tone, gradient, connected regions, boundary
   distance, isolation, and local diversity.
6. Use Theory and Music to explore the same eight-level structure as algebraic
   diagrams and sonification.

## Drawing And Navigation

Hex offers a diagram and a level-by-level color list. Double-click the diagram
background or list content outside the buttons to switch views; on a touch
screen, hold that background in place. `V` also switches views. Moving the touch
scrolls the page instead. Color dots, candidate buttons, and the central die
keep their own operations.

Both views share the selected colors and level pins. Right-click or hold a color
candidate to pin or release that level. The compact list shows the current color,
its hue difference from the canonical vertex, and its alternative candidates.
Use the Gallery tab to browse the available patterns.
The diagram keeps its pattern-count display and link to Gallery. The list does
not show pattern counts; on narrow screens it scrolls within the same area.

The Source workspace includes brush, eraser, fill, line, rectangle, and ellipse
tools, plus undo and redo. Selecting a tone level leaves the selected tool
unchanged. Pan and zoom are shared across canvas workspaces so you can inspect
the same structure from Source, Hex, Glaze, and Map.
The four tabs keep the same canvas frame, zoom, and pan when you switch tabs.
Drag with the middle mouse button to pan, or click that button twice quickly
over the canvas to return to the initial display size and position (100% zoom,
centered). Hex and Map also support touch pan and pinch zoom; double-tap their
image canvas to reset the shared view. Map's single-finger long press still
opens its save confirmation.

Glaze has the same brush, eraser, fill, line, rectangle, and ellipse tool layout
as Source. Drag to preview a shape outline using the current brush size and
Glaze color settings, then release to commit it as one undo step. Shapes
preserve Source tone levels and existing Glaze outside their final outline;
direct candidate mode applies only to the levels with selected candidates.

In Source, press `0`–`7` with the pointer over the canvas to select that level
and draw with the selected tool. Brush and eraser selections place one brush
mark using the current brush size; fill changes the connected region of the
pointed pixel's level, regardless of brush size. Holding the key does not repeat
brush marks or fills.

For line, rectangle, and ellipse, hold a number key to set the start point,
move the pointer to preview the shape, then release that same key to finish.
The shape keeps the level and brush size from the initial key press. `Esc`
cancels the preview. Switching tabs, opening a dialog, or leaving the browser
window also cancels an unfinished keyboard gesture. Each completed action is
one Undo/Redo step. Outside the canvas, the keys only select the level. Number
keys do not start drawing during a pointer stroke, in pan mode, or while a
dialog or text field owns the keyboard.

Image import uses a lossy input classifier: it applies the model's 4:2:1 channel
weights directly to gamma-encoded sRGB code values, then quantizes the result to
the nearest one of the eight level labels. This is not an inverse of the
canonical CHROMALUM coordinates and is not perceptual lightness or photometric
luminance. PNG export can save grayscale, color, or glaze renderings; keep
exported files when you need a durable copy outside browser storage.

## What The Model Means

CHROMALUM is built around eight RGB vertices and a GRB Binary Tone ordering:
`level = 4G + 2R + B`, normalized as `tone = level / 7`. The levels are useful
for discrete drawing, palette mapping, structural maps, Theory diagrams, and
Music sonification. They are not a perceptually uniform color space and do not
guarantee accessibility contrast by themselves.

XOR, Fano, Hamming, and K8 relations act on these eight binary level labels.
Palette candidates come from a separate coordinate layer: the RGB cube's
maximum-saturation hue loop (the pure-hue loop, defined by maximum channel 1 and
minimum channel 0). Here “maximum saturation” names the RGB-cube/HSV condition
`S=V=1`, not perceptual maximum chroma. The candidates are display
representatives projected to the same level by equal GRB tone; selecting one
does not turn its continuous GRB coordinates into a `GF(2)^3` vector.

Glaze overrides change the displayed color candidate for selected pixels, but
they do not change the source tone level. This is what lets the app compare
source structure, color mapping, glaze variants, gallery patterns, map
analysis, and sonification as views of the same compact canvas.
