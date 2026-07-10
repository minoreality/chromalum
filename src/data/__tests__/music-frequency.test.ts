import { describe, expect, it } from "vitest";
import {
  BASE_FREQ,
  MAJOR_SEMITONES,
  OCTATONIC_SEMITONES,
  PITCH_BASE_FREQ,
  WHOLE_TONE_SEMITONES,
  angleToFreq,
  freqToNote,
  semitoneToFreq,
  type PitchMappingMode,
} from "../music-frequency";

describe("music-frequency", () => {
  it("keeps the legacy base while using exact C4 for pitch mappings", () => {
    expect(BASE_FREQ).toBe(220);
    expect(PITCH_BASE_FREQ).toBe(440 * Math.pow(2, -9 / 12));
    expect(PITCH_BASE_FREQ).toBeCloseTo(261.6255653005986, 12);
  });

  describe("semitoneToFreq", () => {
    it("maps semitone offsets from C4", () => {
      expect(semitoneToFreq(0)).toBeCloseTo(PITCH_BASE_FREQ, 12);
      expect(semitoneToFreq(9)).toBeCloseTo(440, 12);
      expect(semitoneToFreq(12)).toBeCloseTo(PITCH_BASE_FREQ * 2, 12);
      expect(semitoneToFreq(-12)).toBeCloseTo(PITCH_BASE_FREQ / 2, 12);
    });
  });

  describe("angleToFreq", () => {
    const modes: PitchMappingMode[] = ["chromalum", "major", "octatonic", "wholeTone"];

    it("maps CHROMALUM to the 24-step 15-degree grid", () => {
      for (let semitone = 0; semitone < 24; semitone++) {
        expect(angleToFreq(semitone * 15, "chromalum")).toBeCloseTo(semitoneToFreq(semitone), 12);
      }
    });

    it("rounds CHROMALUM at half-step boundaries and keeps the upper endpoint until the hue seam", () => {
      expect(angleToFreq(7.5 - 1e-6, "chromalum")).toBeCloseTo(semitoneToFreq(0), 12);
      expect(angleToFreq(7.5, "chromalum")).toBeCloseTo(semitoneToFreq(1), 12);
      expect(angleToFreq(352.5 - 1e-6, "chromalum")).toBeCloseTo(semitoneToFreq(23), 12);
      expect(angleToFreq(352.5, "chromalum")).toBeCloseTo(semitoneToFreq(24), 12);
      expect(angleToFreq(359.999, "chromalum")).toBeCloseTo(semitoneToFreq(24), 12);
      expect(angleToFreq(360, "chromalum")).toBeCloseTo(semitoneToFreq(0), 12);
    });

    it.each([
      ["major", MAJOR_SEMITONES],
      ["octatonic", OCTATONIC_SEMITONES],
      ["wholeTone", WHOLE_TONE_SEMITONES],
    ] as const)("maps every %s anchor to its exported scale degree", (mode, semitones) => {
      semitones.forEach((semitone, index) => {
        const angle = (index * 360) / semitones.length;
        expect(angleToFreq(angle, mode)).toBeCloseTo(semitoneToFreq(semitone), 12);
      });
    });

    it.each([
      ["major", MAJOR_SEMITONES],
      ["octatonic", OCTATONIC_SEMITONES],
      ["wholeTone", WHOLE_TONE_SEMITONES],
    ] as const)("keeps the upper tonic for %s until the hue seam", (mode, _semitones) => {
      expect(angleToFreq(359.999, mode)).toBeCloseTo(semitoneToFreq(12), 12);
      expect(angleToFreq(360, mode)).toBeCloseTo(semitoneToFreq(0), 12);
    });

    it("expresses each mode's intended red-cyan complement interval", () => {
      expect(angleToFreq(180, "chromalum") / angleToFreq(0, "chromalum")).toBeCloseTo(2, 12);
      expect(angleToFreq(180, "major") / angleToFreq(0, "major")).toBeCloseTo(Math.pow(2, 7 / 12), 12);
      expect(angleToFreq(180, "octatonic") / angleToFreq(0, "octatonic")).toBeCloseTo(Math.pow(2, 6 / 12), 12);
      expect(angleToFreq(180, "wholeTone") / angleToFreq(0, "wholeTone")).toBeCloseTo(Math.pow(2, 6 / 12), 12);
    });

    it.each(modes)("wraps %s at full positive and negative turns", (mode) => {
      expect(angleToFreq(360, mode)).toBeCloseTo(angleToFreq(0, mode), 12);
      expect(angleToFreq(-360, mode)).toBeCloseTo(angleToFreq(0, mode), 12);
      expect(angleToFreq(720, mode)).toBeCloseTo(angleToFreq(0, mode), 12);
    });
  });

  describe("freqToNote", () => {
    it("returns em-dash for non-positive or non-finite input", () => {
      expect(freqToNote(0)).toBe("—");
      expect(freqToNote(-1)).toBe("—");
      expect(freqToNote(-440)).toBe("—");
      expect(freqToNote(Number.NaN)).toBe("—");
      expect(freqToNote(Number.POSITIVE_INFINITY)).toBe("—");
      expect(freqToNote(Number.NEGATIVE_INFINITY)).toBe("—");
    });

    it("names exact equal-temperament pitches without a cent suffix", () => {
      expect(freqToNote(440)).toBe("A4");
      expect(freqToNote(880)).toBe("A5");
      expect(freqToNote(220)).toBe("A3");
      expect(freqToNote(110)).toBe("A2");
    });

    it("crosses the C boundary between octaves correctly", () => {
      expect(freqToNote(440 * Math.pow(2, -9 / 12))).toBe("C4");
      expect(freqToNote(440 * Math.pow(2, 3 / 12))).toBe("C5");
    });

    it("annotates positive cents with '+' and a U+2212 minus for negatives", () => {
      expect(freqToNote(440 * Math.pow(2, 25 / 1200))).toBe("A4+25¢");
      const label = freqToNote(440 * Math.pow(2, -12 / 1200));
      expect(label).toBe("A4−12¢");
      expect(label.includes("−")).toBe(true);
      expect(label.includes("-12")).toBe(false);
    });

    it("rounds the half-semitone boundary up so +50¢ becomes the next note minus 50¢", () => {
      expect(freqToNote(440 * Math.pow(2, 50 / 1200))).toBe("A♯4−50¢");
    });
  });
});
