import { evolveVisiblePlane, type AutomataRule } from "../automata/model";

export interface AutomataPreviewRequest {
  seed: Uint8Array;
  rule: AutomataRule;
  time: number;
}

self.onmessage = ({ data }: MessageEvent<AutomataPreviewRequest>) => {
  const board = evolveVisiblePlane(data.seed, data.time, data.rule);
  (self as unknown as Worker).postMessage(board, [board.buffer]);
};
