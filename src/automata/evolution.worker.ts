import { evolvePlane, type AutomataRule, type PlaneDimensions } from "./model";

self.onmessage = (event: MessageEvent<PlaneDimensions & { seed: Uint8Array; time: number; rule: AutomataRule }>) => {
  const { seed, time, rule } = event.data;
  const board = evolvePlane(seed, event.data, time, rule);
  self.postMessage(board, { transfer: [board.buffer] });
};
