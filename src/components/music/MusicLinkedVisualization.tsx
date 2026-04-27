import React, { useCallback } from "react";
import type { ScaleMode } from "../../data/music-frequency";
import { LinkedVisualization, type LinkedVisualizationOverlayContext, type LinkedVisualizationProps } from "../LinkedVisualization";
import { IntervalRatios } from "./IntervalRatios";

interface MusicLinkedVisualizationProps extends Omit<LinkedVisualizationProps, "showLegend" | "bottomRightOverlay"> {
  scaleMode: ScaleMode;
}

export const MusicLinkedVisualization = React.memo(function MusicLinkedVisualization({
  scaleMode,
  ...props
}: MusicLinkedVisualizationProps) {
  const renderOverlay = useCallback(
    (ctx: LinkedVisualizationOverlayContext) => <IntervalRatios {...ctx} scaleMode={scaleMode} />,
    [scaleMode],
  );

  return <LinkedVisualization {...props} showLegend={false} bottomRightOverlay={renderOverlay} />;
});
