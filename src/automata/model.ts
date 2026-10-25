export type CAColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Cell = { x: number; y: number };
export interface PlaneDimensions {
  width: number;
  height: number;
}
export type AutomataRule = 4 | 5 | "diagonal" | "diagonal-center" | 8 | 9 | "life" | "rug";
export const PLANE_SIZE = 49;
export const MAX_TIME = 20;
export const CA_RULES: readonly AutomataRule[] = [4, 5, "diagonal", "diagonal-center", 8, 9, "life", "rug"];
export const CA_LABELS = ["K", "B", "R", "M", "G", "C", "Y", "W"] as const;
export const CA_COLORS = ["#000000", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#ffffff"] as const;
type Offset = readonly [number, number];
const CROSS: readonly Offset[] = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
];
const DIAGONAL: readonly Offset[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
const AROUND = [...CROSS, ...DIAGONAL];
const OFFSETS: Record<AutomataRule, readonly Offset[]> = {
  4: CROSS,
  5: [...CROSS, [0, 0]],
  diagonal: DIAGONAL,
  "diagonal-center": [...DIAGONAL, [0, 0]],
  8: AROUND,
  9: [...AROUND, [0, 0]],
  life: AROUND,
  rug: AROUND,
};

/** Synchronous updates of discrete GRB states; cells outside the plane are K. */
export function evolvePlane(seed: Uint8Array, size: number | PlaneDimensions, steps: number, rule: AutomataRule): Uint8Array {
  const { width, height } = typeof size === "number" ? { width: size, height: size } : size;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    seed.length !== width * height ||
    !Number.isInteger(steps) ||
    steps < 0 ||
    steps > MAX_TIME ||
    seed.some((color) => color > 7) ||
    !CA_RULES.includes(rule)
  ) {
    throw new RangeError("Invalid Automata plane, time or rule");
  }
  let current = seed.slice();
  let next = new Uint8Array(seed.length);
  const offsets = OFFSETS[rule];
  const xor = rule !== "life" && rule !== "rug";
  for (let t = 0; t < steps; t++) {
    next.fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let value = 0;
        const counts = [0, 0, 0];
        for (const [dx, dy] of offsets) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || xx >= width || yy < 0 || yy >= height) continue;
          const neighbor = current[yy * width + xx];
          if (xor) value ^= neighbor;
          else for (let bit = 0; bit < 3; bit++) counts[bit] += (neighbor >> bit) & 1;
        }
        if (!xor) {
          for (let bit = 0; bit < 3; bit++) {
            const alive = Boolean(current[i] & (1 << bit)),
              n = counts[bit];
            const active = rule === "life" ? n === 3 || (alive && n === 2) : !alive && n >= 2 && n <= 4;
            if (active) value |= 1 << bit;
          }
        }
        next[i] = value;
      }
    }
    [current, next] = [next, current];
  }
  return current;
}

/** Keep individual cells intact and align the center cells when dimensions change. */
export function resizePlane(seed: Uint8Array, from: PlaneDimensions, to: PlaneDimensions): Uint8Array {
  const result = new Uint8Array(to.width * to.height);
  const dx = Math.floor(to.width / 2) - Math.floor(from.width / 2);
  const dy = Math.floor(to.height / 2) - Math.floor(from.height / 2);
  const startX = Math.max(0, -dx),
    endX = Math.min(from.width, to.width - dx);
  for (let y = Math.max(0, -dy); y < Math.min(from.height, to.height - dy); y++) {
    result.set(seed.subarray(y * from.width + startX, y * from.width + endX), (y + dy) * to.width + startX + dx);
  }
  return result;
}
