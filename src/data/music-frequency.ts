export type ScaleMode = "12tet" | "ji" | "octatonic" | "diatonic7";

export const BASE_FREQ = 220;

const JI_RATIOS = [1, 8 / 7, 7 / 5, 8 / 5, 2] as const;
const JI_ANGLES = [0, 72, 144, 216, 288] as const;
const OCTATONIC_SEMITONES = [0, 1, 3, 4, 6, 7, 9, 10] as const;
const DIATONIC7_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function angleToFreq(angle: number, mode: ScaleMode): number {
  const norm = normalizeAngle(angle);

  if (mode === "12tet") {
    return BASE_FREQ * Math.pow(2, (norm / 360) * 2);
  }

  if (mode === "ji") {
    let closest = 0;
    let minDist = 360;
    for (let i = 0; i < JI_ANGLES.length; i++) {
      const d = Math.min(Math.abs(norm - JI_ANGLES[i]), 360 - Math.abs(norm - JI_ANGLES[i]));
      if (d < minDist) {
        minDist = d;
        closest = i;
      }
    }
    return BASE_FREQ * JI_RATIOS[closest];
  }

  if (mode === "octatonic") {
    const idx = Math.round((norm / 360) * OCTATONIC_SEMITONES.length) % OCTATONIC_SEMITONES.length;
    return 261.63 * Math.pow(2, OCTATONIC_SEMITONES[idx] / 12);
  }

  const idx = Math.round((norm / 360) * DIATONIC7_SEMITONES.length) % DIATONIC7_SEMITONES.length;
  return 261.63 * Math.pow(2, DIATONIC7_SEMITONES[idx] / 12);
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
