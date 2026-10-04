import { useState, useLayoutEffect } from "react";
import type { PanZoomHandlers } from "../types";

export function useStablePanZoomHandlers(handlers: PanZoomHandlers): PanZoomHandlers {
  const [stable] = useState(() => ({ ...handlers }));
  useLayoutEffect(() => {
    Object.assign(stable, handlers);
  });
  return stable;
}
