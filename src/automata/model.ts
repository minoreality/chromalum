export type CAColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Cell = { x: number; y: number };
export type AutomataRule =
  4 | 5 | "diagonal" | "diagonal-center" | 8 | 9 | "life" | "rug" | "seeds" | "day-night" | "or" | "and" | "majority" | "hamming";
export const PLANE_SIZE = 49;
export const MAX_TIME = 64;
export const CA_RULES: readonly AutomataRule[] = [
  4,
  5,
  "diagonal",
  "diagonal-center",
  8,
  9,
  "or",
  "and",
  "majority",
  "hamming",
  "life",
  "rug",
  "seeds",
  "day-night",
];
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
  seeds: AROUND,
  "day-night": AROUND,
  or: [...CROSS, [0, 0]],
  and: [...CROSS, [0, 0]],
  majority: [...CROSS, [0, 0]],
  hamming: CROSS,
};

// Indices 0–8 count neighbors for an off channel; 9–17 do the same for an on channel.
function channelTable(birth: number[], survival: number[]): Uint8Array {
  const table = new Uint8Array(18);
  for (const count of birth) table[count] = 1;
  for (const count of survival) table[9 + count] = 1;
  return table;
}
const CHANNEL_TRANSITIONS: Partial<Record<AutomataRule, Uint8Array>> = {
  life: channelTable([3], [2, 3]),
  rug: channelTable([2, 3, 4], []),
  seeds: channelTable([2], []),
  "day-night": channelTable([3, 6, 7, 8], [3, 4, 6, 7, 8]),
  majority: channelTable([3, 4, 5], [3, 4, 5]),
};

export function lifeLikeNotation(rule: AutomataRule): string | undefined {
  if (rule === 8) return "B1357/S1357";
  if (rule === 9) return "B1357/S02468";
  const table = CHANNEL_TRANSITIONS[rule];
  if (!table || rule === "majority") return undefined;
  let birth = "";
  let survival = "";
  for (let count = 0; count <= 8; count++) {
    if (table[count]) birth += count;
    if (table[9 + count]) survival += count;
  }
  return `B${birth}/S${survival}`;
}

/** Synchronous updates of discrete GRB states; cells outside the plane are K. */
export function evolvePlane(seed: Uint8Array, size: number, steps: number, rule: AutomataRule): Uint8Array {
  if (
    !Number.isInteger(size) ||
    size < 1 ||
    seed.length !== size * size ||
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
  const channelNext = CHANNEL_TRANSITIONS[rule];
  for (let t = 0; t < steps; t++) {
    next.fill(0);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let value = rule === "and" ? 7 : rule === "hamming" ? current[i] : 0;
        const counts = [0, 0, 0];
        for (const [dx, dy] of offsets) {
          const xx = x + dx,
            yy = y + dy;
          const neighbor = xx < 0 || xx >= size || yy < 0 || yy >= size ? 0 : current[yy * size + xx];
          if (rule === "or") value |= neighbor;
          else if (rule === "and") value &= neighbor;
          else if (rule === "hamming") {
            const difference = current[i] ^ neighbor;
            // A nonzero power of two changes exactly one GRB channel.
            if (difference !== 0 && (difference & (difference - 1)) === 0) value ^= difference;
          } else if (channelNext) {
            for (let bit = 0; bit < 3; bit++) counts[bit] += (neighbor >> bit) & 1;
          } else value ^= neighbor;
        }
        if (channelNext) {
          for (let bit = 0; bit < 3; bit++) {
            const alive = (current[i] >> bit) & 1;
            value |= channelNext[counts[bit] + alive * 9] << bit;
          }
        }
        next[i] = value;
      }
    }
    [current, next] = [next, current];
  }
  return current;
}

export interface VisibleEvolution {
  readonly neighborOffsets: readonly Offset[];
  at(steps: number): Uint8Array;
}

/** Cache visible generations; keep only the latest full plane for further evolution. */
export function createVisibleEvolution(seed: Uint8Array, rule: AutomataRule): VisibleEvolution {
  const initial = evolvePlane(seed, PLANE_SIZE, 0, rule);
  // Radius-one rules and a quiescent black background bound propagation by time.
  // One extra black border lets the inner loop read neighbors without edge checks.
  const origin = MAX_TIME + 1;
  const size = PLANE_SIZE + 2 * origin;
  let current = new Uint8Array(size * size);
  let next = new Uint8Array(current.length);
  for (let y = 0; y < PLANE_SIZE; y++) {
    current.set(initial.subarray(y * PLANE_SIZE, (y + 1) * PLANE_SIZE), (y + origin) * size + origin);
  }
  const offsets = OFFSETS[rule].map(([dx, dy]) => dy * size + dx);
  const channelNext = CHANNEL_TRANSITIONS[rule];
  // Each channel gets a four-bit counter, so summing up to nine neighbors cannot carry into another channel.
  const channelCounts = [0, 1, 16, 17, 256, 257, 272, 273];
  const frames = [initial];
  return {
    neighborOffsets: OFFSETS[rule].filter(([dx, dy]) => dx !== 0 || dy !== 0),
    at(steps) {
      if (!Number.isInteger(steps) || steps < 0 || steps > MAX_TIME) throw new RangeError("Invalid Automata time");
      while (frames.length <= steps) {
        const time = frames.length;
        const low = origin - time;
        const high = origin + PLANE_SIZE + time;
        for (let y = low; y < high; y++) {
          for (let i = y * size + low, end = y * size + high; i < end; i++) {
            const here = current[i];
            let value = rule === "and" ? 7 : rule === "hamming" ? here : 0;
            let counts = 0;
            for (let n = 0; n < offsets.length; n++) {
              const neighbor = current[i + offsets[n]];
              if (channelNext) counts += channelCounts[neighbor];
              else if (rule === "or") value |= neighbor;
              else if (rule === "and") value &= neighbor;
              else if (rule === "hamming") {
                const difference = here ^ neighbor;
                if (difference !== 0 && (difference & (difference - 1)) === 0) value ^= difference;
              } else value ^= neighbor;
            }
            next[i] = channelNext
              ? channelNext[(counts & 15) + (here & 1) * 9] |
                (channelNext[((counts >> 4) & 15) + ((here >> 1) & 1) * 9] << 1) |
                (channelNext[((counts >> 8) & 15) + ((here >> 2) & 1) * 9] << 2)
              : value;
          }
        }
        [current, next] = [next, current];
        const visible = new Uint8Array(initial.length);
        for (let y = 0; y < PLANE_SIZE; y++) {
          const start = (y + origin) * size + origin;
          visible.set(current.subarray(start, start + PLANE_SIZE), y * PLANE_SIZE);
        }
        frames.push(visible);
      }
      return frames[steps];
    },
  };
}

/** Evolve the black exterior too, then return the unchanged 49×49 viewing window. */
export function evolveVisiblePlane(seed: Uint8Array, steps: number, rule: AutomataRule): Uint8Array {
  return createVisibleEvolution(seed, rule).at(steps);
}
