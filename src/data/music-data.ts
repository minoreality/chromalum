import { FANO_LINES } from "./theory-data";
export { freqToNote } from "./music-frequency";

export const CHROMA_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export const TONE_8_VALUES = [0, 36, 73, 109, 146, 182, 219, 255] as const;

export const GRB_TONE_VALUES: Readonly<Record<number, number>> = {
  1: 1 / 7,
  2: 2 / 7,
  3: 3 / 7,
  4: 4 / 7,
  5: 5 / 7,
  6: 6 / 7,
};

export const COMPLEMENT_PAIRS: readonly (readonly [number, number])[] = [
  [1, 6],
  [2, 5],
  [3, 4],
];

export const ZIGZAG_PATH = [2, 6, 4, 5, 1, 3] as const;
export const ZIGZAG_CHANNELS = ["G", "R", "B", "G", "R", "B"] as const;

export const FANO_RHYTHM_PATTERNS: readonly (readonly number[])[] = Array.from({ length: 7 }, (_, i) => [
  (0 + i) % 7,
  (1 + i) % 7,
  (3 + i) % 7,
]);

const BIT_SPECTRUM_COMPONENTS = [
  { bit: 0, lv: 1, name: "P1/B", harmonic: 3, gain: 0.72 },
  { bit: 1, lv: 2, name: "P2/R", harmonic: 1, gain: 1.0 },
  { bit: 2, lv: 4, name: "P4/G", harmonic: 2, gain: 0.86 },
] as const;

type BitSpectrumComponent = (typeof BIT_SPECTRUM_COMPONENTS)[number];

export function bitSpectrumComponents(lv: number): BitSpectrumComponent[] {
  return BIT_SPECTRUM_COMPONENTS.filter((component) => (lv & (1 << component.bit)) !== 0);
}

export function fanoLinesThrough(point: number): number[] {
  return FANO_LINES.reduce<number[]>((acc, line, i) => {
    if (line.includes(point)) acc.push(i);
    return acc;
  }, []);
}
