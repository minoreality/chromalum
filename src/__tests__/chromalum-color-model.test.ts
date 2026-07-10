import { describe, expect, it } from "vitest";
import {
  CANONICAL_HUE_ANCHORS,
  CANONICAL_HUE_ANGLES_BY_LEVEL,
  CANONICAL_HUE_CYCLE,
  CANONICAL_VERTEX_HUE_BY_LEVEL,
  CHROMALUM_CHANNEL_MAX,
  chromalumChannelsToHue,
  chromalumGrbLevel,
  chromalumToneNorm,
  hueToChromalumChannels,
} from "../chromalum-color-model";

describe("exact CHROMALUM color model", () => {
  it("defines R/G/B as 120° anchors and Y/C/M as their midpoints", () => {
    expect(CANONICAL_HUE_ANCHORS).toEqual({ R: 0, Y: 60, G: 120, C: 180, B: 240, M: 300 });
    expect(CANONICAL_HUE_ANCHORS.Y).toBe((CANONICAL_HUE_ANCHORS.R + CANONICAL_HUE_ANCHORS.G) / 2);
    expect(CANONICAL_HUE_ANCHORS.C).toBe((CANONICAL_HUE_ANCHORS.G + CANONICAL_HUE_ANCHORS.B) / 2);
    expect(CANONICAL_HUE_ANCHORS.M).toBe((CANONICAL_HUE_ANCHORS.B + 360) / 2);
    expect(CANONICAL_VERTEX_HUE_BY_LEVEL).toEqual([-1, 240, 0, 300, 120, 180, 60, -1]);
  });

  it("groups the exact hue-cycle intersections by GRB level", () => {
    expect(CANONICAL_HUE_ANGLES_BY_LEVEL).toEqual([[], [240], [0, 225, 270], [15, 210, 300], [30, 120, 195], [45, 90, 180], [60], []]);
  });

  it("represents every canonical intersection with exact quarter channels and tone", () => {
    const channelsByLevel = CANONICAL_HUE_ANGLES_BY_LEVEL.map((angles) => angles.map(hueToChromalumChannels));
    expect(channelsByLevel).toEqual([
      [],
      [[0, 0, 4]],
      [
        [4, 0, 0],
        [0, 1, 4],
        [2, 0, 4],
      ],
      [
        [4, 1, 0],
        [0, 2, 4],
        [4, 0, 4],
      ],
      [
        [4, 2, 0],
        [0, 4, 0],
        [0, 3, 4],
      ],
      [
        [4, 3, 0],
        [2, 4, 0],
        [0, 4, 4],
      ],
      [[4, 4, 0]],
      [],
    ]);

    for (const { hueAngleDeg, levelIndex } of CANONICAL_HUE_CYCLE) {
      const channels = hueToChromalumChannels(hueAngleDeg);
      expect(channels.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= CHROMALUM_CHANNEL_MAX)).toBe(true);
      expect(chromalumChannelsToHue(channels)).toBe(hueAngleDeg);
      expect(chromalumGrbLevel(channels)).toBe(levelIndex);
      expect(chromalumToneNorm(channels)).toBe(levelIndex / 7);
    }
  });

  it("makes a 180° hue rotation the exact channel complement", () => {
    for (const { hueAngleDeg, levelIndex } of CANONICAL_HUE_CYCLE) {
      const channels = hueToChromalumChannels(hueAngleDeg);
      const complement = hueToChromalumChannels(hueAngleDeg + 180);
      expect(complement).toEqual(channels.map((channel) => CHROMALUM_CHANNEL_MAX - channel));
      expect(chromalumGrbLevel(complement)).toBe(7 - levelIndex);
    }
  });
});
