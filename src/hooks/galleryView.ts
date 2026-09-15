import { LEVEL_CANDIDATES } from "../color-engine";
import type { GalleryItem } from "./useGallery";

export type GalleryFilter = "all" | "bookmarks";
export type GallerySortMode = "default" | "hue_asc" | "hue_desc" | "similar";

export function candidateIndexByLevelEqual(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < 8; i++) {
    const na = LEVEL_CANDIDATES[i].length;
    if (a[i] % na !== b[i] % na) return false;
  }
  return true;
}

export function getGalleryPatternCount(lockedLevels: readonly boolean[], levelHistogram: readonly number[]): number {
  let total = 1;
  for (let lv = 0; lv < 8; lv++) {
    const n = LEVEL_CANDIDATES[lv].length;
    if (!lockedLevels[lv] && levelHistogram[lv] > 0 && n > 1) total *= n;
  }
  return total;
}

/** Compute average hue angle for a pattern's candidateIndexByLevel[] for sorting/display. */
function patternHue(patternCandidateIndexByLevel: readonly number[]): number {
  let sumAngle = 0;
  let count = 0;
  for (let lv = 0; lv < 8; lv++) {
    const cands = LEVEL_CANDIDATES[lv];
    if (cands.length <= 1) continue;
    const angle = cands[patternCandidateIndexByLevel[lv] % cands.length].hueAngleDeg;
    if (angle >= 0) {
      sumAngle += angle;
      count++;
    }
  }
  return count > 0 ? sumAngle / count : 0;
}

/**
 * Check whether any chromatic level that the image actually uses matches the hue filter.
 * Levels absent from the canvas (histogram 0) are not visible and never match; levels with a
 * single candidate (B, Y) still count, because their hue is on screen whenever they are used.
 */
function matchesHueFilter(
  patternCandidateIndexByLevel: readonly number[],
  filterHue: number,
  filterRange: number,
  levelHistogram: readonly number[],
): boolean {
  for (let lv = 1; lv <= 6; lv++) {
    if (!(levelHistogram[lv] > 0)) continue;
    const cands = LEVEL_CANDIDATES[lv];
    const ci = patternCandidateIndexByLevel[lv] % cands.length;
    const angle = cands[ci].hueAngleDeg;
    if (angle < 0) continue;
    const diff = Math.abs(angle - filterHue);
    if (Math.min(diff, 360 - diff) <= filterRange) return true;
  }
  return false;
}

/** Count how many variant levels differ between two candidateIndexByLevel[] arrays. */
function candidateIndexDistance(a: readonly number[], b: readonly number[]): number {
  let dist = 0;
  for (let i = 0; i < 8; i++) {
    const na = LEVEL_CANDIDATES[i].length;
    if (na <= 1) continue;
    if (a[i] % na !== b[i] % na) dist++;
  }
  return dist;
}

interface GalleryDisplayOptions {
  filter: GalleryFilter;
  items: GalleryItem[];
  bookmarkItems: GalleryItem[];
  sortMode: GallerySortMode;
  filterHue: number;
  filterRange: number;
  currentCandidateIndexByLevel: readonly number[];
  levelHistogram: readonly number[];
}

export function getDisplayGalleryItems({
  filter,
  items,
  bookmarkItems,
  sortMode,
  filterHue,
  filterRange,
  currentCandidateIndexByLevel,
  levelHistogram,
}: GalleryDisplayOptions): GalleryItem[] {
  let list = filter === "bookmarks" ? bookmarkItems : items;

  if (filterRange < 180) {
    list = list.filter((item) => matchesHueFilter(item.candidateIndexByLevel, filterHue, filterRange, levelHistogram));
  }

  if (sortMode === "default") return list;

  const sorted = [...list];
  if (sortMode === "similar") {
    sorted.sort(
      (a, b) =>
        candidateIndexDistance(a.candidateIndexByLevel, currentCandidateIndexByLevel) -
        candidateIndexDistance(b.candidateIndexByLevel, currentCandidateIndexByLevel),
    );
    return sorted;
  }

  sorted.sort((a, b) => {
    const ha = patternHue(a.candidateIndexByLevel);
    const hb = patternHue(b.candidateIndexByLevel);
    return sortMode === "hue_asc" ? ha - hb : hb - ha;
  });
  return sorted;
}
