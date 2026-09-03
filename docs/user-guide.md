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
2. Use Hex and Color to choose how the eight tone levels map to color
   candidates.
3. Use Glaze to paint per-pixel color-variant overrides while preserving the
   underlying source tone structure.
4. Use Gallery to generate, compare, bookmark, and export color-pattern
   variants.
5. Use Map to inspect model tone, gradient, connected regions, boundary
   distance, isolation, and local diversity.
6. Use Theory and Music to explore the same eight-level structure as algebraic
   diagrams and sonification.

## Drawing And Navigation

The Source workspace includes brush, eraser, fill, line, rectangle, and ellipse
tools, plus undo and redo. Pan and zoom are shared across canvas workspaces so
you can inspect the same structure from Source, Color, Hex, Glaze, and Map.

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
