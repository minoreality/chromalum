import { describe, expect, it } from "vitest";
import { CHROMALUM_LEVEL_BITS, CHROMALUM_LEVEL_LABELS } from "../../chromalum-color-model";

const K = 0b000;
const B = 0b001;
const R = 0b010;
const M = 0b011;
const G = 0b100;
const C = 0b101;
const Y = 0b110;
const W = 0b111;

const COLORS = [K, B, R, M, G, C, Y, W] as const;
const RGB = [B, R, G] as const;
const CMY = [M, C, Y] as const;
const ORDERED_PAIRS = COLORS.flatMap((a) => COLORS.map((b) => [a, b] as const));

const complement = (value: number) => ~value & W;
const xnor = (a: number, b: number) => complement(a ^ b);

function distinctOrderedPairs(values: readonly number[]): readonly (readonly [number, number])[] {
  return values.flatMap((a) => values.filter((b) => a !== b).map((b) => [a, b] as const));
}

function applyChannelwiseTruthTable(mask: number, a: number, b: number): number {
  let result = 0;
  for (let bit = 0; bit < 3; bit += 1) {
    const x = (a >> bit) & 1;
    const y = (b >> bit) & 1;
    const output = (mask >> ((x << 1) | y)) & 1;
    result |= output << bit;
  }
  return result;
}

function matchingTruthTables(pairs: readonly (readonly [number, number])[], target: (a: number, b: number) => number): number[] {
  return Array.from({ length: 16 }, (_, mask) => mask).filter((mask) =>
    pairs.every(([a, b]) => applyChannelwiseTruthTable(mask, a, b) === target(a, b)),
  );
}

describe("three-bit Boolean color algebra in [G,R,B] order", () => {
  it("fixes the GRB encoding and the requested M/Y to R operation", () => {
    expect(M).toBe(0b011);
    expect(Y).toBe(0b110);
    expect(R).toBe(0b010);
    expect(CHROMALUM_LEVEL_LABELS[M]).toBe("M");
    expect(CHROMALUM_LEVEL_LABELS[Y]).toBe("Y");
    expect(CHROMALUM_LEVEL_LABELS[R]).toBe("R");
    expect(CHROMALUM_LEVEL_BITS[M]).toEqual([0, 1, 1]);
    expect(CHROMALUM_LEVEL_BITS[Y]).toEqual([1, 1, 0]);
    expect(CHROMALUM_LEVEL_BITS[R]).toEqual([0, 1, 0]);
    expect(M & Y).toBe(R);
    expect(xnor(M, Y)).toBe(R);
  });

  it("checks complement and both De Morgan laws on all eight colors and all 64 ordered pairs", () => {
    for (const color of COLORS) {
      expect(complement(complement(color))).toBe(color);
      expect(color | complement(color)).toBe(W);
      expect(color & complement(color)).toBe(K);
    }

    for (const [a, b] of ORDERED_PAIRS) {
      expect(complement(a | b)).toBe(complement(a) & complement(b));
      expect(complement(a & b)).toBe(complement(a) | complement(b));
    }
  });

  it("reconstructs both term-equivalent presentations on all 64 ordered pairs", () => {
    expect(ORDERED_PAIRS).toHaveLength(64);

    for (const color of COLORS) {
      expect(color ^ color).toBe(K);
      expect(color & color).toBe(color);
      expect(color ^ K).toBe(color);
      expect(color & W).toBe(color);
      expect(color ^ W).toBe(complement(color));
    }

    for (const [a, b] of ORDERED_PAIRS) {
      // Boolean-algebra presentation -> Boolean-ring presentation.
      expect(a ^ b).toBe((a | b) & complement(a & b));
      expect(a ^ b).toBe((a & complement(b)) | (complement(a) & b));

      // Boolean-ring presentation -> Boolean-algebra presentation.
      expect(a | b).toBe(a ^ b ^ (a & b));
      expect(xnor(a, b)).toBe(a ^ b ^ W);
    }
  });

  it("distinguishes OR from XOR outside their exact 27-pair coincidence domain", () => {
    const coincidences = ORDERED_PAIRS.filter(([a, b]) => (a | b) === (a ^ b));
    expect(coincidences).toHaveLength(27);

    for (const [a, b] of ORDERED_PAIRS) {
      expect((a | b) === (a ^ b)).toBe((a & b) === K);
      expect(a | b).toBe(a ^ b ^ (a & b));
    }

    expect(R | R).toBe(R);
    expect(R ^ R).toBe(K);
  });

  it("distinguishes AND from XNOR outside their exact 27-pair coincidence domain", () => {
    const coincidences = ORDERED_PAIRS.filter(([a, b]) => (a & b) === xnor(a, b));
    expect(coincidences).toHaveLength(27);

    for (const [a, b] of ORDERED_PAIRS) {
      expect((a & b) === xnor(a, b)).toBe((a | b) === W);
    }

    expect(C & C).toBe(C);
    expect(xnor(C, C)).toBe(W);
  });

  it("exhausts all 16 channelwise binary Boolean functions on the displayed primary pairs", () => {
    const rgbPairs = distinctOrderedPairs(RGB);
    const cmyPairs = distinctOrderedPairs(CMY);

    expect(matchingTruthTables(rgbPairs, (a, b) => a | b)).toEqual([
      0b0110, // XOR
      0b1110, // OR
    ]);
    expect(matchingTruthTables(cmyPairs, (a, b) => a & b)).toEqual([
      0b1000, // AND
      0b1001, // XNOR
    ]);
  });
});
