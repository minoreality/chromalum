import React, { useCallback, useMemo } from "react";
import type { PitchMappingMode } from "../../data/music-frequency";
import { resolveMusicCandidateIndices } from "../../music/music-candidate-pairs";
import { LinkedVisualization, type LinkedVisualizationOverlayContext, type LinkedVisualizationProps } from "../LinkedVisualization";
import { IntervalRatios } from "./IntervalRatios";

interface MusicLinkedVisualizationProps extends Omit<LinkedVisualizationProps, "showLegend" | "bottomRightOverlay"> {
  pitchMappingMode: PitchMappingMode;
}

export const MusicLinkedVisualization = React.memo(function MusicLinkedVisualization({
  pitchMappingMode,
  ...props
}: MusicLinkedVisualizationProps) {
  const resolvedCandidateOverridesByLevel = useMemo(
    () => resolveMusicCandidateIndices(props.candidateOverridesByLevel ?? new Map(), props.hueAngleDeg),
    [props.candidateOverridesByLevel, props.hueAngleDeg],
  );
  const renderOverlay = useCallback(
    (ctx: LinkedVisualizationOverlayContext) => <IntervalRatios {...ctx} pitchMappingMode={pitchMappingMode} />,
    [pitchMappingMode],
  );

  return (
    <LinkedVisualization
      {...props}
      candidateOverridesByLevel={resolvedCandidateOverridesByLevel}
      showLegend={false}
      bottomRightOverlay={renderOverlay}
    />
  );
});
