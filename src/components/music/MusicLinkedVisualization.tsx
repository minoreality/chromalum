import React, { useCallback } from "react";
import type { PitchMappingMode } from "../../data/music-frequency";
import { LinkedVisualization, type LinkedVisualizationOverlayContext, type LinkedVisualizationProps } from "../LinkedVisualization";
import { IntervalRatios } from "./IntervalRatios";

interface MusicLinkedVisualizationProps extends Omit<LinkedVisualizationProps, "showLegend" | "bottomRightOverlay"> {
  pitchMappingMode: PitchMappingMode;
}

export const MusicLinkedVisualization = React.memo(function MusicLinkedVisualization({
  pitchMappingMode,
  ...props
}: MusicLinkedVisualizationProps) {
  const renderOverlay = useCallback(
    (ctx: LinkedVisualizationOverlayContext) => <IntervalRatios {...ctx} pitchMappingMode={pitchMappingMode} />,
    [pitchMappingMode],
  );

  return <LinkedVisualization {...props} showLegend={false} bottomRightOverlay={renderOverlay} />;
});
