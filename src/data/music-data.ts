import { FANO_LINES } from "./theory-data";
import {
  CANONICAL_CHROMATIC_LEVEL_CYCLE,
  CHROMALUM_CHROMATIC_COMPLEMENT_PAIRS,
  CHROMALUM_HUE_TOGGLE_CYCLE,
  CHROMALUM_TONE_CROSSING_SEQUENCE,
  CHROMALUM_TONE_VALUES,
} from "../chromalum-color-model";
export { freqToNote } from "./music-frequency";

export const CHROMA_LEVELS: readonly number[] = [...CANONICAL_CHROMATIC_LEVEL_CYCLE].sort((a, b) => a - b);

export const TONE_NORM_VALUES = CHROMALUM_TONE_VALUES;

export const GRB_TONE_VALUES: Readonly<Record<number, number>> = {
  1: TONE_NORM_VALUES[1],
  2: TONE_NORM_VALUES[2],
  3: TONE_NORM_VALUES[3],
  4: TONE_NORM_VALUES[4],
  5: TONE_NORM_VALUES[5],
  6: TONE_NORM_VALUES[6],
};

export const COMPLEMENT_PAIRS = CHROMALUM_CHROMATIC_COMPLEMENT_PAIRS;

export const ZIGZAG_PATH = CANONICAL_CHROMATIC_LEVEL_CYCLE;
export const ZIGZAG_CHANNELS = CHROMALUM_HUE_TOGGLE_CYCLE;

export const TONE_CROSSING_SEQUENCE = CHROMALUM_TONE_CROSSING_SEQUENCE;

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
