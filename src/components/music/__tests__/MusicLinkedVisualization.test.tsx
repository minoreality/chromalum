// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { CHROMALUM_CHANNEL_MAX } from "../../../chromalum-color-model";
import { LEVEL_CANDIDATES } from "../../../color-engine";
import { MUSIC_COMPLEMENT_LEVEL_PAIRS } from "../../../music/music-candidate-pairs";
import { MusicLinkedVisualization } from "../MusicLinkedVisualization";

interface CapturedLinkedVisualizationProps {
  candidateOverridesByLevel: Map<number, number>;
}

const { linkedVisualizationSpy } = vi.hoisted(() => ({
  linkedVisualizationSpy: vi.fn((_props: CapturedLinkedVisualizationProps) => null),
}));

vi.mock("../../LinkedVisualization", () => ({
  LinkedVisualization: linkedVisualizationSpy,
}));

function latestLinkedVisualizationProps(): CapturedLinkedVisualizationProps {
  const calls = linkedVisualizationSpy.mock.calls;
  const latestCall = calls[calls.length - 1];
  if (!latestCall) throw new Error("LinkedVisualization was not rendered");
  return latestCall[0];
}

describe("MusicLinkedVisualization candidate integration", () => {
  beforeEach(() => linkedVisualizationSpy.mockClear());

  it("passes the same complementary candidate pairs used by the Music grid and audio", () => {
    render(
      <MusicLinkedVisualization hueAngleDeg={180} brushLevel={0} pitchMappingMode="chromalum" candidateOverridesByLevel={new Map()} />,
    );

    const resolved = latestLinkedVisualizationProps().candidateOverridesByLevel;
    expect(LEVEL_CANDIDATES[2][resolved.get(2)!].hueAngleDeg).toBe(0);
    expect(LEVEL_CANDIDATES[5][resolved.get(5)!].hueAngleDeg).toBe(180);

    for (const [lowerLevelIndex, upperLevelIndex] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
      const lower = LEVEL_CANDIDATES[lowerLevelIndex][resolved.get(lowerLevelIndex)!];
      const upper = LEVEL_CANDIDATES[upperLevelIndex][resolved.get(upperLevelIndex)!];
      const hueDifference = Math.abs(lower.hueAngleDeg - upper.hueAngleDeg) % 360;
      expect(Math.min(hueDifference, 360 - hueDifference)).toBe(180);
      expect(lower.chromalumGrb.map((channel, index) => channel + upper.chromalumGrb[index])).toEqual([
        CHROMALUM_CHANNEL_MAX,
        CHROMALUM_CHANNEL_MAX,
        CHROMALUM_CHANNEL_MAX,
      ]);
    }
  });
});
