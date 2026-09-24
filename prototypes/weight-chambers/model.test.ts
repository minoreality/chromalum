import { describe, expect, it } from "vitest";
import { A1_WEIGHTS, CHAMBERS, FUNNEL, N, WALLS, conditions, parseWeights, ranking, snap, upperHalf, type Weights } from "./model";

// Expectations are rebuilt from subsets of {G,R,B}, independently of the model's bit arithmetic.
const SETS = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["G", "R"], ["G", "R", "B"]];
const NAMES = "KBRMGCYW";
const PRIMARY = ["G", "R", "B"];
const sigma = (w: Weights, level: number) => SETS[level].reduce((sum, c) => sum + w[PRIMARY.indexOf(c)], 0);
const subset = (a: number, b: number) => SETS[a].every((c) => SETS[b].includes(c));
const disjoint = (a: number, b: number) => !SETS[a].some((c) => SETS[b].includes(c));
const union = (a: number, b: number) =>
  SETS.findIndex((s) => s.length === new Set([...SETS[a], ...SETS[b]]).size && [...SETS[a], ...SETS[b]].every((c) => s.includes(c)));
const complement = (a: number) => SETS.findIndex((s) => s.length === 3 - SETS[a].length && s.every((c) => !SETS[a].includes(c)));
const lattice: Weights[] = [];
for (let g = 0; g <= N; g++) for (let r = 0; r <= N - g; r++) lattice.push([g, r, N - g - r]);
const strictOrder = (w: Weights) => {
  const scores = SETS.map((_, level) => sigma(w, level));
  if (new Set(scores).size < 8) return null;
  const order = [...scores.keys()].sort((x, y) => scores[x] - scores[y]);
  return order.map((x) => NAMES[x]).join("");
};

function permutations(items: number[]): number[][] {
  return items.length
    ? items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]))
    : [[]];
}
const extensions = permutations([0, 1, 2, 3, 4, 5, 6, 7]).filter((p) =>
  p.every((x, i) => p.slice(i + 1).every((y) => !subset(y, x) || y === x)),
);
const reversed = extensions.filter((p) => p.every((x, i) => p[7 - i] === complement(x)));
const text = (orders: number[][]) => orders.map((p) => p.map((x) => NAMES[x]).join("")).sort();

describe("weight chambers", () => {
  it("narrows 48 inclusion orders to 12 reversed by complement, 6 with additive rank and 1 named order", () => {
    const additive = reversed.filter((p) =>
      p.every((x) => p.indexOf(x) === SETS[x].reduce((sum, c) => sum + p.indexOf(SETS.findIndex((s) => s.join() === c)), 0)),
    );
    expect([extensions, reversed, additive].map((set) => set.length)).toEqual([48, 12, 6]);
    expect(FUNNEL.map((set) => set.length)).toEqual([48, 12, 6, 1]);
    expect(text(FUNNEL[1])).toEqual(text(reversed));
    expect(text(FUNNEL[2])).toEqual(text(additive));
    expect(text(FUNNEL[3])).toEqual(["KBRMGCYW"]);
  });

  it("gives the twelve chambers the twelve complement-reversed orders, which are also the de Finetti orders", () => {
    expect(CHAMBERS).toHaveLength(12);
    expect(text(CHAMBERS.map(({ order }) => order))).toEqual(text(reversed));
    const definetti = extensions.filter((p) =>
      [...Array(8).keys()].every((a) =>
        [...Array(8).keys()].every((b) =>
          [...Array(8).keys()].every(
            (c) =>
              a === b ||
              !disjoint(a, c) ||
              !disjoint(b, c) ||
              p.indexOf(a) < p.indexOf(b) === p.indexOf(union(a, c)) < p.indexOf(union(b, c)),
          ),
        ),
      ),
    );
    expect(text(definetti)).toEqual(text(reversed));
  });

  it("orders every strict lattice point as its chamber does, and places the three conditions exactly in the A1 chamber", () => {
    const inside = ([g, r]: Weights, triangle: Weights[]) => {
      const side = (p: Weights, q: Weights) => (q[0] - p[0]) * (r - p[1]) - (q[1] - p[1]) * (g - p[0]);
      const signs = triangle.map((p, i) => Math.sign(side(p, triangle[(i + 1) % 3])));
      return signs.every((s) => s > 0) || signs.every((s) => s < 0);
    };
    let strict = 0;
    for (const w of lattice) {
      const expected = strictOrder(w);
      const { order, strict: isStrict } = ranking(w);
      expect(isStrict).toBe(expected !== null);
      expect(conditions(w).every(({ holds }) => holds)).toBe(expected === "KBRMGCYW");
      if (!expected) continue;
      strict++;
      const homes = CHAMBERS.filter(({ vertices }) => inside(w, vertices));
      expect(homes).toHaveLength(1);
      expect(homes[0].order.map((x) => NAMES[x]).join("")).toBe(expected);
      expect(order.map((x) => NAMES[x]).join("")).toBe(expected);
    }
    expect(strict).toBeGreaterThan(10000);
  });

  it("takes the upper half from the dominant primary, or from majority when no weight exceeds half", () => {
    for (const w of lattice) {
      const expected = strictOrder(w);
      if (!expected) continue;
      const upper = [...expected.slice(4)].sort().join("");
      const dominant = PRIMARY.find((_, i) => 2 * w[i] > N);
      const face = dominant ? NAMES.split("").filter((_, level) => SETS[level].includes(dominant)) : ["M", "C", "Y", "W"];
      expect(upper).toBe([...face].sort().join(""));
      expect(upperHalf(ranking(w).order)).toBe(dominant ?? "majority");
    }
  });

  it("swaps on each wall exactly the pairs that tie there", () => {
    const steps: Weights[] = [
      [1, -1, 0],
      [1, 0, -1],
      [0, 1, -1],
    ];
    const move = (w: Weights, s: Weights, k: number): Weights => [w[0] + k * s[0], w[1] + k * s[1], w[2] + k * s[2]];
    for (const wall of WALLS) {
      const form = (w: Weights, coefficients = wall.coefficients) => coefficients.reduce((sum, c, i) => sum + c * w[i], 0);
      const others = WALLS.filter((other) => other !== wall);
      // One lattice step changes any form by at most 2, so both neighbours stay off the other walls.
      const point = lattice.find(
        (w) => form(w) === 0 && w.every((v) => v >= 3) && others.every((other) => Math.abs(form(w, other.coefficients)) >= 3),
      )!;
      const ties = SETS.flatMap((_, x) => SETS.map((_, y) => [x, y]).filter(([, y]) => x < y && sigma(point, x) === sigma(point, y)));
      const pairs = (list: number[][]) => list.map(([x, y]) => [NAMES[x], NAMES[y]].sort().join("")).sort();
      expect(pairs(wall.swaps)).toEqual(pairs(ties));
      const step = steps.find((s) => form(s) !== 0)!;
      const before = strictOrder(move(point, step, -1))!.split("");
      const after = strictOrder(move(point, step, 1))!;
      for (const [x, y] of wall.swaps) {
        const i = before.indexOf(NAMES[x]);
        const j = before.indexOf(NAMES[y]);
        expect(Math.abs(i - j)).toBe(1);
        [before[i], before[j]] = [before[j], before[i]];
      }
      expect(before.join("")).toBe(after);
    }
  });

  it("keeps weights on the lattice when snapping and parsing", () => {
    for (const w of lattice) expect(snap(w.map((v) => v / N))).toEqual(w);
    expect(snap([-0.2, 0.7, 0.9])[0]).toBe(0);
    expect(snap([0.3, 0.3, 0.3]).reduce((a, b) => a + b)).toBe(N);
    expect(parseWeights("96,48,24")).toEqual(A1_WEIGHTS);
    for (const bad of [null, "", "96,48", "96,48,25", "96,-1,73", "96.5,47.5,24"]) expect(parseWeights(bad)).toBeNull();
  });
});
