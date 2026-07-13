import { CHROMALUM_MIN_HUE_STEP_DEG } from "../chromalum-color-model";

export type PitchMappingMode = "chromalum" | "major" | "octatonic" | "wholeTone";

/** Legacy base used by the bit-spectrum sonification. */
export const BASE_FREQ = 220;

/** Exact C4 in 12-EDO with A4 = 440 Hz. */
export const PITCH_BASE_FREQ = 440 * Math.pow(2, -9 / 12);

export const OCTATONIC_SEMITONES = [0, 1, 3, 4, 6, 7, 9, 10] as const;
export const MAJOR_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;
export const WHOLE_TONE_SEMITONES = [0, 2, 4, 6, 8, 10] as const;
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function scaleAngleToFreq(angle: number, semitones: readonly number[]): number {
  const idx = Math.round((angle / 360) * semitones.length);
  if (idx === semitones.length) return semitoneToFreq(12);
  return semitoneToFreq(semitones[idx]);
}

export function angleToFreq(angle: number, mode: PitchMappingMode): number {
  const norm = normalizeAngle(angle);

  if (mode === "chromalum") {
    return chromalumHueLiftToFreq(norm);
  }

  if (mode === "octatonic") {
    return scaleAngleToFreq(norm, OCTATONIC_SEMITONES);
  }

  if (mode === "wholeTone") {
    return scaleAngleToFreq(norm, WHOLE_TONE_SEMITONES);
  }

  return scaleAngleToFreq(norm, MAJOR_SEMITONES);
}

/** Continuous pitch on the R-rooted lift of the hue circle; 180° is one octave. */
export function chromalumHueLiftToFreq(unwrappedHueAngleDeg: number): number {
  return semitoneToFreq(unwrappedHueAngleDeg / CHROMALUM_MIN_HUE_STEP_DEG);
}

export function semitoneToFreq(semitone: number): number {
  return PITCH_BASE_FREQ * Math.pow(2, semitone / 12);
}

/** Frequency -> "A4" or "A4 −12¢" style label (cents shown only when non-zero). */
export function freqToNote(hz: number): string {
  if (!isFinite(hz) || hz <= 0) return "—";
  const midi = 69 + 12 * Math.log2(hz / 440);
  const midiRound = Math.round(midi);
  const cents = Math.round((midi - midiRound) * 100);
  const name = NOTE_NAMES[((midiRound % 12) + 12) % 12];
  const octave = Math.floor(midiRound / 12) - 1;
  if (cents === 0) return `${name}${octave}`;
  return `${name}${octave}${cents > 0 ? "+" : "−"}${Math.abs(cents)}¢`;
}
