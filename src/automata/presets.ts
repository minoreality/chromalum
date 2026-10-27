import { evolvePlane, PLANE_SIZE } from "./model";
import type { CAColor } from "./model";

export const AUTOMATA_PRESETS = [
  "rosette",
  "diamond",
  "corolla",
  "luminous",
  "clock",
  "phase-clock",
  "pulse",
  "fireworks",
  "weave",
  "rgb",
  "white",
  "black",
  "or-spread",
  "and-core",
  "majority-cleanup",
  "hamming-boundary",
] as const;
export type AutomataPreset = (typeof AUTOMATA_PRESETS)[number];
const CHANNELS = [4, 2, 1] as const;
export function makePlaneSeed(preset: AutomataPreset): Uint8Array {
  const size = PLANE_SIZE,
    c = Math.floor(size / 2);
  const seed = new Uint8Array(size * size);
  const put = (dx: number, dy: number, color: CAColor, target = seed) => {
    const x = c + dx,
      y = c + dy;
    if (x >= 0 && x < size && y >= 0 && y < size) target[y * size + x] |= color;
  };
  switch (preset) {
    case "or-spread":
      for (const [x, y, color] of [
        [-10, -6, 4],
        [10, -6, 2],
        [0, 10, 1],
      ] as const)
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) put(x + dx, y + dy, color);
      return seed;
    case "and-core":
      for (const [x, y, left, right] of [
        [-11, -9, 3, 6],
        [11, -9, 5, 6],
        [0, 11, 3, 5],
      ] as const)
        for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) put(x + dx, y + dy, dx < 0 ? left : dx > 0 ? right : 7);
      return seed;
    case "majority-cleanup":
      for (const [x, y, color] of [
        [-11, -8, 4],
        [11, -8, 2],
        [0, 11, 1],
      ] as const) {
        for (let dy = -4; dy <= 4; dy++)
          for (let dx = -4; dx <= 4; dx++) {
            if ((dx === 0 && dy === 0) || (dx === -2 && dy === 1) || (dx === 2 && dy === -1)) continue;
            put(x + dx, y + dy, color);
          }
        for (const [dx, dy] of [
          [-5, 0],
          [5, 0],
          [-7, -6],
          [7, 6],
        ])
          put(x + dx, y + dy, color);
      }
      return seed;
    case "hamming-boundary":
      for (const [y, right] of [
        [-9, 6],
        [9, 5],
      ] as const)
        for (let dy = -4; dy <= 4; dy++) for (let dx = -12; dx < 12; dx++) put(dx, y + dy, dx < 0 ? 2 : right);
      return seed;
    case "black":
      return seed;
    case "white":
      put(0, 0, 7);
      return seed;
    case "rgb":
      put(-2, 0, 4);
      put(2, 0, 2);
      put(0, -2, 1);
      return seed;
    case "rosette":
    case "diamond":
      if (preset === "rosette") put(0, 0, 1);
      for (const [dx, dy] of [
        [0, -2],
        [-2, 0],
        [2, 0],
        [0, 2],
      ])
        put(dx, dy, 4);
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        put(dx, dy, 2);
      if (preset === "diamond")
        for (const [dx, dy] of [
          [-2, -2],
          [2, -2],
          [-2, 2],
          [2, 2],
        ])
          put(dx, dy, 1);
      return seed;
    case "corolla":
      for (let r = 1; r <= 3; r++)
        for (const [dx, dy] of [
          [0, -r],
          [-r, 0],
          [r, 0],
          [0, r],
        ])
          put(dx, dy, CHANNELS[r - 1]);
      return seed;
    case "luminous":
      put(0, 0, 7);
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const radius = Math.abs(dx) + Math.abs(dy);
          if (radius >= 1 && radius <= 3) put(dx, dy, CHANNELS[radius - 1]);
        }
      return seed;
    case "weave": {
      const square = new Uint8Array(seed.length);
      for (const dx of [-1, 0]) for (const dy of [-1, 0]) put(dx, dy, 1, square);
      for (let channel = 0; channel < 3; channel++) {
        const phase = evolvePlane(square, size, channel, "rug");
        for (let i = 0; i < phase.length; i++) if (phase[i]) seed[i] |= CHANNELS[channel];
      }
      return seed;
    }
    default: {
      const oscillator = new Uint8Array(seed.length);
      if (preset === "pulse") {
        for (const y of [0, 5, 7, 12])
          for (const x of [2, 3, 4, 8, 9, 10]) {
            put(x - 6, y - 6, 1, oscillator);
            put(y - 6, x - 6, 1, oscillator);
          }
      } else {
        for (const [x, y] of [
          [2, 0],
          [7, 0],
          [0, 1],
          [1, 1],
          [3, 1],
          [4, 1],
          [5, 1],
          [6, 1],
          [8, 1],
          [9, 1],
          [2, 2],
          [7, 2],
        ])
          put(x - 5, y - 1, 1, oscillator);
      }
      const offsets = preset === "pulse" ? [0, 1, 2] : preset === "phase-clock" ? [0, 5, 10] : [0, 3, 7];
      for (let channel = 0; channel < 3; channel++) {
        const phase = evolvePlane(oscillator, size, offsets[channel], "life");
        for (let i = 0; i < phase.length; i++)
          if (phase[i]) {
            if (preset === "pulse") seed[i] |= CHANNELS[channel];
            else {
              let x = (i % size) - c,
                y = Math.floor(i / size) - c - (preset === "fireworks" ? 8 : 10);
              for (let turn = 0; turn < 4; turn++) {
                put(x, y, CHANNELS[channel]);
                [x, y] = [-y, x];
              }
            }
          }
      }
      return seed;
    }
  }
}
