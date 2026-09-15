import { describe, expect, it } from "vitest";
import { LEVEL_CANDIDATES } from "../../color-engine";
import { getDisplayGalleryItems } from "../galleryView";
import type { GalleryItem } from "../useGallery";

const indexOf = (level: number, hueAngleDeg: number) => LEVEL_CANDIDATES[level].findIndex((c) => c.hueAngleDeg === hueAngleDeg);
const item = (candidateIndexByLevel: number[]): GalleryItem => ({ candidateIndexByLevel, imageData: null });
const allUsed = new Array(8).fill(1);

function display(items: GalleryItem[], filterHue: number, filterRange: number, levelHistogram: readonly number[]) {
  return getDisplayGalleryItems({
    filter: "all",
    items,
    bookmarkItems: [],
    sortMode: "default",
    filterHue,
    filterRange,
    currentCandidateIndexByLevel: items[0].candidateIndexByLevel,
    levelHistogram,
  });
}

describe("getDisplayGalleryItems hue filter", () => {
  // R 0°, M 15°, G 30°, C 45°; B (240°) and Y (60°) have a single candidate each.
  const warm = item([0, 0, indexOf(2, 0), indexOf(3, 15), indexOf(4, 30), indexOf(5, 45), 0, 0]);

  it("matches the fixed yellow and blue levels when the image uses them", () => {
    expect(display([warm], 60, 10, allUsed)).toHaveLength(1);
    expect(display([warm], 240, 10, allUsed)).toHaveLength(1);
  });

  it("ignores every level the image does not use", () => {
    const withoutYellowOrBlue = [1, 1, 1, 1, 1, 1, 0, 1].map((used, lv) => (lv === 1 ? 0 : used));
    expect(display([warm], 60, 10, withoutYellowOrBlue)).toHaveLength(0);
    expect(display([warm], 240, 10, withoutYellowOrBlue)).toHaveLength(0);
    expect(display([warm], 0, 10, withoutYellowOrBlue)).toHaveLength(1);
  });

  it("does not match through an unused level's candidate", () => {
    const green120 = (level2: number) => item([0, 0, indexOf(2, level2), indexOf(3, 15), indexOf(4, 120), indexOf(5, 45), 0, 0]);
    const items = [green120(0), green120(225)];
    const noGreen = [1, 1, 1, 1, 0, 1, 1, 1];
    expect(display(items, 120, 5, allUsed)).toHaveLength(2);
    expect(display(items, 120, 5, noGreen)).toHaveLength(0);
  });

  it("shows everything at the full range", () => {
    expect(display([warm], 300, 180, [1, 0, 0, 0, 0, 0, 0, 1])).toHaveLength(1);
  });
});
