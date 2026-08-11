import { describe, expect, it } from "vitest";
import {
  CANONICAL_CHROMATIC_LEVEL_CYCLE,
  CHROMALUM_COMPLEMENT_SECTION_COUNT,
  CHROMALUM_PALETTE_SECTION_COUNT,
  CHROMALUM_TONE_DENOMINATOR,
} from "../chromalum-color-model";
import { LEVEL_CANDIDATES } from "../color-engine";
import { WR, toneR0, toneR7, wheelPoint } from "../components/linked-visualization-geometry";
import { chromalumHueLiftToFreq } from "../data/music-frequency";
import {
  MUSIC_COMPLEMENT_LEVEL_PAIRS,
  findMusicComplementCandidateIndex,
  resolveMusicCandidateIndices,
} from "../music/music-candidate-pairs";
import { complementPhaseFactor } from "../music/music-phase";

interface Point {
  readonly x: number;
  readonly y: number;
}

function hexHuePoint(angleDeg: number): Point {
  const hue = ((angleDeg % 360) + 360) % 360;
  const sector = Math.floor(hue / 60);
  const t = (hue % 60) / 60;
  const fromAngle = (sector * Math.PI) / 3;
  const toAngle = ((sector + 1) * Math.PI) / 3;
  const from = { x: Math.sin(fromAngle), y: -Math.cos(fromAngle) };
  const to = { x: Math.sin(toAngle), y: -Math.cos(toAngle) };
  return { x: (1 - t) * from.x + t * to.x, y: (1 - t) * from.y + t * to.y };
}

function musicCirclePoint(angleDeg: number, radius: number): Point {
  const angle = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) };
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

function normSquared(point: Point): number {
  return dot(point, point);
}

function squaredDistance(a: Point, b: Point): number {
  return normSquared(subtract(a, b));
}

function lineIntersection(a: Point, b: Point, c: Point, d: Point): Point {
  const ab = subtract(b, a);
  const cd = subtract(d, c);
  const denominator = cross(ab, cd);
  const t = cross(subtract(c, a), cd) / denominator;
  return { x: a.x + t * ab.x, y: a.y + t * ab.y };
}

function fourierCoefficient(harmonic: number, kind: "cos" | "sin"): number {
  const sectorWidth = Math.PI / 3;
  let integral = 0;

  for (let sector = 0; sector < CANONICAL_CHROMATIC_LEVEL_CYCLE.length; sector++) {
    const start = sector * sectorWidth;
    const end = (sector + 1) * sectorWidth;
    const fromLevel = CANONICAL_CHROMATIC_LEVEL_CYCLE[sector];
    const toLevel = CANONICAL_CHROMATIC_LEVEL_CYCLE[(sector + 1) % CANONICAL_CHROMATIC_LEVEL_CYCLE.length];
    const slope = (toLevel - fromLevel) / sectorWidth;
    const intercept = fromLevel - slope * start - 7 / 2;
    const n = harmonic;

    if (kind === "cos") {
      const primitive = (theta: number) =>
        slope * ((theta * Math.sin(n * theta)) / n + Math.cos(n * theta) / n ** 2) + (intercept * Math.sin(n * theta)) / n;
      integral += primitive(end) - primitive(start);
    } else {
      const primitive = (theta: number) =>
        slope * (-(theta * Math.cos(n * theta)) / n + Math.sin(n * theta) / n ** 2) - (intercept * Math.cos(n * theta)) / n;
      integral += primitive(end) - primitive(start);
    }
  }

  return integral / Math.PI;
}

function sectionSignature(candidateIndices: ReadonlyMap<number, number>): string {
  return MUSIC_COMPLEMENT_LEVEL_PAIRS.map(([lowerLevel]) => candidateIndices.get(lowerLevel)).join(":");
}

function lowerRepresentativeHues(sectionSelectorDeg: number): number[] {
  const selected = resolveMusicCandidateIndices(new Map(), sectionSelectorDeg);
  return MUSIC_COMPLEMENT_LEVEL_PAIRS.map(([lowerLevel]) => LEVEL_CANDIDATES[lowerLevel][selected.get(lowerLevel)!].hueAngleDeg);
}

describe("research-note invariants", () => {
  it("derives the channel-labeled six-cycle directly from raw binary vertices", () => {
    type Bit = 0 | 1;
    type Vertex = readonly [Bit, Bit, Bit];
    const channels = ["G", "R", "B"] as const;
    const vertices: readonly Vertex[] = [
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
    ];
    const key = (vertex: Vertex) => vertex.join("");
    const distance = (left: Vertex, right: Vertex) => left.reduce<number>((sum, bit, index) => sum + Number(bit !== right[index]), 0);
    const changedChannel = (left: Vertex, right: Vertex) => channels[left.findIndex((bit, index) => bit !== right[index])];
    const adjacency = new Map(vertices.map((vertex) => [key(vertex), vertices.filter((candidate) => distance(vertex, candidate) === 1)]));

    expect(vertices).toHaveLength(6);
    expect(vertices.reduce((degreeSum, vertex) => degreeSum + adjacency.get(key(vertex))!.length, 0) / 2).toBe(6);
    for (const vertex of vertices) expect(adjacency.get(key(vertex))).toHaveLength(2);

    const reachable = new Set<string>();
    const stack: Vertex[] = [vertices[0]];
    while (stack.length > 0) {
      const vertex = stack.pop()!;
      if (reachable.has(key(vertex))) continue;
      reachable.add(key(vertex));
      stack.push(...adjacency.get(key(vertex))!);
    }
    expect(reachable.size).toBe(6);

    const observedWords = new Set<string>();
    for (const root of vertices) {
      for (const firstNeighbor of adjacency.get(key(root))!) {
        let previous: Vertex | undefined;
        let current = root;
        const visited = new Set<string>();
        const toggles: string[] = [];

        for (let edge = 0; edge < vertices.length; edge++) {
          visited.add(key(current));
          const next = edge === 0 ? firstNeighbor : adjacency.get(key(current))!.find((candidate) => key(candidate) !== key(previous!))!;
          toggles.push(changedChannel(current, next));
          previous = current;
          current = next;
        }

        expect(key(current)).toBe(key(root));
        expect(visited.size).toBe(6);
        for (let edge = 0; edge < 3; edge++) expect(toggles[edge + 3]).toBe(toggles[edge]);
        observedWords.add(toggles.join(""));
      }
    }

    const canonical = ["G", "R", "B", "G", "R", "B"];
    const rotations = (word: readonly string[]) => word.map((_, offset) => [...word.slice(offset), ...word.slice(0, offset)].join(""));
    const expectedWords = new Set([...rotations(canonical), ...rotations([...canonical].reverse())]);
    expect(observedWords).toEqual(expectedWords);
    expect(observedWords).toEqual(new Set(["GRBGRB", "RBGRBG", "BGRBGR", "BRGBRG", "RGBRGB", "GBRGBR"]));
  });

  it("derives the hue-edge rank law, double closure, and total variation from the raw cycle", () => {
    type Bit = 0 | 1;
    type Vertex = readonly [Bit, Bit, Bit];
    const weights = [4, 2, 1] as const;
    const cycle: readonly Vertex[] = [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
      [0, 1, 1],
    ];
    const rank = (vertex: Vertex) => vertex.reduce<number>((sum, bit, index) => sum + bit * weights[index], 0);
    const deltas: number[] = [];
    let toggleClosure = 0;

    cycle.forEach((from, index) => {
      const to = cycle[(index + 1) % cycle.length];
      const changedIndex = from.findIndex((bit, channelIndex) => bit !== to[channelIndex]);
      const delta = rank(to) - rank(from);

      expect(changedIndex).toBeGreaterThanOrEqual(0);
      expect(delta).toBe((1 - 2 * from[changedIndex]) * weights[changedIndex]);
      expect(Math.abs(delta)).toBe(weights[changedIndex]);
      toggleClosure ^= 1 << changedIndex;
      deltas.push(delta);
    });

    expect(deltas).toEqual([4, -2, 1, -4, 2, -1]);
    expect(toggleClosure).toBe(0);
    expect(deltas.reduce((sum, delta) => sum + delta, 0)).toBe(0);
    expect(deltas.reduce((sum, delta) => sum + Math.abs(delta), 0)).toBe(2 * (4 + 2 + 1));
  });

  it("distinguishes the five automatic section-selector states from all nine manual complement sections", () => {
    const automaticSections = new Set<string>();
    for (let hueAngleDeg = 0; hueAngleDeg < 360; hueAngleDeg += 0.25) {
      automaticSections.add(sectionSignature(resolveMusicCandidateIndices(new Map(), hueAngleDeg)));
    }

    const manualSections = new Set<string>();
    for (const l2CandidateIndex of LEVEL_CANDIDATES[2].keys()) {
      for (const l3CandidateIndex of LEVEL_CANDIDATES[3].keys()) {
        const selected = new Map<number, number>([
          [1, 0],
          [2, l2CandidateIndex],
          [3, l3CandidateIndex],
        ]);
        manualSections.add(sectionSignature(selected));
        expect(findMusicComplementCandidateIndex(2, l2CandidateIndex)).toBeGreaterThanOrEqual(0);
        expect(findMusicComplementCandidateIndex(3, l3CandidateIndex)).toBeGreaterThanOrEqual(0);
      }
    }

    expect(automaticSections.size).toBe(5);
    expect(manualSections.size).toBe(CHROMALUM_COMPLEMENT_SECTION_COUNT);
    expect(CHROMALUM_PALETTE_SECTION_COUNT).toBe(81);
  });

  it("fixes the automatic section-selector boundary tie-breaks", () => {
    const cases: ReadonlyArray<readonly [number, readonly number[]]> = [
      [0, [240, 0, 15]],
      [22.5, [240, 0, 15]],
      [22.5001, [240, 225, 210]],
      [67.5, [240, 225, 210]],
      [67.5001, [240, 270, 210]],
      [74.9999, [240, 270, 210]],
      [75, [240, 270, 300]],
      [134.9999, [240, 270, 300]],
      [135, [240, 0, 300]],
      [157.5, [240, 0, 300]],
      [157.5001, [240, 0, 15]],
      [180, [240, 0, 15]],
    ];

    for (const [sectionSelectorDeg, expectedHues] of cases) {
      expect(lowerRepresentativeHues(sectionSelectorDeg)).toEqual(expectedHues);
    }
  });

  it("keeps the global section selector distinct from each selected representative hue", () => {
    const sectionSelectorDeg = 0;
    const selected = resolveMusicCandidateIndices(new Map(), sectionSelectorDeg);
    const l3Hue = LEVEL_CANDIDATES[3][selected.get(3)!].hueAngleDeg;
    const l4Hue = LEVEL_CANDIDATES[4][selected.get(4)!].hueAngleDeg;

    expect(l3Hue).toBe(15);
    expect(l4Hue).toBe(195);
    expect(l3Hue).not.toBe(sectionSelectorDeg);
    expect((l4Hue - l3Hue + 360) % 360).toBe(180);
  });

  it("maps every lifted complement half-turn to an upward octave", () => {
    for (const liftedHueDeg of [-720, -361.5, -45, 0, 22.5, 180, 359.999, 720]) {
      expect(chromalumHueLiftToFreq(liftedHueDeg + 180) / chromalumHueLiftToFreq(liftedHueDeg)).toBeCloseTo(2, 12);
    }
  });

  it("makes cross-origin complement separation and gain depend only on relative phase offset", () => {
    for (const [lowerLevel, upperLevel] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
      for (const lowerCandidateIndex of LEVEL_CANDIDATES[lowerLevel].keys()) {
        const upperCandidateIndex = findMusicComplementCandidateIndex(lowerLevel, lowerCandidateIndex);
        const lowerHue = LEVEL_CANDIDATES[lowerLevel][lowerCandidateIndex].hueAngleDeg;
        const upperHue = LEVEL_CANDIDATES[upperLevel][upperCandidateIndex].hueAngleDeg;
        const radius = toneR0(lowerLevel);

        for (const thetaRotDeg of [-315, 0, 73.5, 420]) {
          for (const epsilonDeg of [-180, -75, 0, 60, 180]) {
            const alpha0 = thetaRotDeg;
            const alpha7 = thetaRotDeg + 180 + epsilonDeg;
            const p0 = wheelPoint(lowerHue, lowerLevel, alpha0, toneR0, 0, 0);
            const p7 = wheelPoint(upperHue, upperLevel, alpha7, toneR7, 0, 0);
            const expectedSquaredDistance = 4 * radius ** 2 * Math.sin((epsilonDeg * Math.PI) / 360) ** 2;
            const expectedPhaseFactor = Math.abs(Math.cos((epsilonDeg * Math.PI) / 360));

            expect(squaredDistance(p0, p7)).toBeCloseTo(expectedSquaredDistance, 10);
            expect(complementPhaseFactor(alpha0, alpha7)).toBeCloseTo(expectedPhaseFactor, 12);
          }
        }
      }
    }
  });

  it("keeps every same-origin Music complement segment at the maximum display radius", () => {
    const visibleCandidates = LEVEL_CANDIDATES.slice(1, CHROMALUM_TONE_DENOMINATOR).flat();
    expect(visibleCandidates).toHaveLength(14);
    expect(visibleCandidates.every(({ hueAngleDeg }) => Number.isInteger(hueAngleDeg / 15))).toBe(true);

    for (const [lowerLevel, upperLevel] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
      for (const lowerCandidateIndex of LEVEL_CANDIDATES[lowerLevel].keys()) {
        const upperCandidateIndex = findMusicComplementCandidateIndex(lowerLevel, lowerCandidateIndex);
        const lowerHue = LEVEL_CANDIDATES[lowerLevel][lowerCandidateIndex].hueAngleDeg;
        const upperHue = LEVEL_CANDIDATES[upperLevel][upperCandidateIndex].hueAngleDeg;

        for (const origin of [0, 7] as const) {
          const radiusFn = origin === 0 ? toneR0 : toneR7;
          const lowerRadius = origin === 0 ? lowerLevel / CHROMALUM_TONE_DENOMINATOR : 1 - lowerLevel / CHROMALUM_TONE_DENOMINATOR;
          const upperRadius = origin === 0 ? upperLevel / CHROMALUM_TONE_DENOMINATOR : 1 - upperLevel / CHROMALUM_TONE_DENOMINATOR;
          const lowerPoint = musicCirclePoint(lowerHue, lowerRadius);
          const upperPoint = musicCirclePoint(upperHue, upperRadius);
          const displayedLowerPoint = wheelPoint(lowerHue, lowerLevel, 0, radiusFn, 0, 0);
          const displayedUpperPoint = wheelPoint(upperHue, upperLevel, 0, radiusFn, 0, 0);

          expect(lowerRadius + upperRadius).toBeCloseTo(1, 12);
          expect(cross(lowerPoint, upperPoint)).toBeCloseTo(0, 12);
          expect(dot(lowerPoint, upperPoint)).toBeLessThan(0);
          expect(squaredDistance(lowerPoint, upperPoint)).toBeCloseTo(1, 12);
          expect(displayedLowerPoint.x / WR).toBeCloseTo(lowerPoint.x, 12);
          expect(displayedLowerPoint.y / WR).toBeCloseTo(lowerPoint.y, 12);
          expect(displayedUpperPoint.x / WR).toBeCloseTo(upperPoint.x, 12);
          expect(displayedUpperPoint.y / WR).toBeCloseTo(upperPoint.y, 12);
          expect(Math.sqrt(squaredDistance(displayedLowerPoint, displayedUpperPoint))).toBeCloseTo(WR, 12);
        }
      }
    }
  });

  it("makes lifted Music coordinates sinusoidal in log2 frequency", () => {
    const baseFrequency = chromalumHueLiftToFreq(0);
    for (const liftedHueDeg of [-720, -361.5, -45, 0, 22.5, 180, 359.999, 720]) {
      const frequency = chromalumHueLiftToFreq(liftedHueDeg);
      const logPitchPhase = Math.PI * Math.log2(frequency / baseFrequency);
      const huePhase = (liftedHueDeg * Math.PI) / 180;

      expect(Math.sin(logPitchPhase)).toBeCloseTo(Math.sin(huePhase), 12);
      expect(-Math.cos(logPitchPhase)).toBeCloseTo(-Math.cos(huePhase), 12);
    }
  });

  it("reconstructs the exact equitone triangle metrics from canonical hue points", () => {
    const expectedByLevel = new Map([
      [2, { sides: [7, 28, 49].map((value) => value / 16), area: (7 * Math.sqrt(3)) / 32 }],
      [3, { sides: [21, 28, 49].map((value) => value / 16), area: (7 * Math.sqrt(3)) / 16 }],
      [4, { sides: [21, 28, 49].map((value) => value / 16), area: (7 * Math.sqrt(3)) / 16 }],
      [5, { sides: [7, 28, 49].map((value) => value / 16), area: (7 * Math.sqrt(3)) / 32 }],
    ]);

    for (const [level, expected] of expectedByLevel) {
      const points = LEVEL_CANDIDATES[level].map(({ hueAngleDeg }) => hexHuePoint(hueAngleDeg));
      const sides = [
        squaredDistance(points[0], points[1]),
        squaredDistance(points[1], points[2]),
        squaredDistance(points[2], points[0]),
      ].sort((a, b) => a - b);
      const area = Math.abs(cross(subtract(points[1], points[0]), subtract(points[2], points[0]))) / 2;

      sides.forEach((side, index) => expect(side).toBeCloseTo(expected.sides[index], 12));
      expect(area).toBeCloseTo(expected.area, 12);
    }
  });

  it("reconstructs the non-square M/G rectangle and its common unit circumcircle", () => {
    const magenta = hexHuePoint(300);
    const green = hexHuePoint(120);
    const p15 = hexHuePoint(15);
    const p210 = hexHuePoint(210);
    const p30 = hexHuePoint(30);
    const p195 = hexHuePoint(195);
    const x = lineIntersection(magenta, p15, green, p30);
    const z = lineIntersection(magenta, p210, green, p195);

    expect(x.x).toBeCloseTo((3 * Math.sqrt(3)) / 14, 12);
    expect(x.y).toBeCloseTo(-13 / 14, 12);
    expect(z.x).toBeCloseTo(-x.x, 12);
    expect(z.y).toBeCloseTo(-x.y, 12);
    expect(normSquared(x)).toBeCloseTo(1, 12);
    expect(normSquared(z)).toBeCloseTo(1, 12);
    expect(dot(subtract(x, magenta), subtract(green, x))).toBeCloseTo(0, 12);
    expect(squaredDistance(magenta, x)).toBeCloseTo(12 / 7, 12);
    expect(squaredDistance(x, green)).toBeCloseTo(16 / 7, 12);
    expect(squaredDistance(magenta, x)).not.toBeCloseTo(squaredDistance(x, green), 12);
  });

  it("reconstructs the Tone Zigzag statistics and Fourier selection rules", () => {
    const sectorWidth = Math.PI / 3;
    let levelIntegral = 0;
    let squaredLevelIntegral = 0;
    let totalVariation = 0;

    for (let sector = 0; sector < CANONICAL_CHROMATIC_LEVEL_CYCLE.length; sector++) {
      const from = CANONICAL_CHROMATIC_LEVEL_CYCLE[sector];
      const to = CANONICAL_CHROMATIC_LEVEL_CYCLE[(sector + 1) % CANONICAL_CHROMATIC_LEVEL_CYCLE.length];
      levelIntegral += (sectorWidth * (from + to)) / 2;
      squaredLevelIntegral += (sectorWidth * (from ** 2 + from * to + to ** 2)) / 3;
      totalVariation += Math.abs(to - from);
    }

    expect(levelIntegral / (2 * Math.PI)).toBeCloseTo(7 / 2, 12);
    expect(squaredLevelIntegral / (2 * Math.PI)).toBeCloseTo(14, 12);
    expect((squaredLevelIntegral / (2 * Math.PI) - (7 / 2) ** 2) / 7 ** 2).toBeCloseTo(1 / 28, 12);
    expect(totalVariation).toBe(14);

    for (const harmonic of [2, 4, 6, 8]) {
      expect(fourierCoefficient(harmonic, "cos")).toBeCloseTo(0, 12);
      expect(fourierCoefficient(harmonic, "sin")).toBeCloseTo(0, 12);
    }

    for (const harmonic of [1, 3, 5, 7, 9, 11]) {
      const residue = harmonic % 6;
      const expectedCos = residue === 3 ? -84 / (Math.PI ** 2 * harmonic ** 2) : -3 / (Math.PI ** 2 * harmonic ** 2);
      const expectedSin =
        residue === 1
          ? (9 * Math.sqrt(3)) / (Math.PI ** 2 * harmonic ** 2)
          : residue === 5
            ? (-9 * Math.sqrt(3)) / (Math.PI ** 2 * harmonic ** 2)
            : 0;
      expect(fourierCoefficient(harmonic, "cos")).toBeCloseTo(expectedCos, 11);
      expect(fourierCoefficient(harmonic, "sin")).toBeCloseTo(expectedSin, 11);
    }
  });
});
