import { describe, expect, it } from "vitest";
import { BASE_FREQ, angleToFreq, freqToNote } from "../music-frequency";

describe("music-frequency", () => {
  describe("angleToFreq", () => {
    it("maps 12-TET angles across two octaves and wraps angles", () => {
      expect(angleToFreq(0, "12tet")).toBeCloseTo(BASE_FREQ, 10);
      expect(angleToFreq(180, "12tet")).toBeCloseTo(BASE_FREQ * 2, 10);
      expect(angleToFreq(360, "12tet")).toBeCloseTo(BASE_FREQ, 10);
      expect(angleToFreq(-180, "12tet")).toBeCloseTo(BASE_FREQ * 2, 10);
      expect(angleToFreq(720, "12tet")).toBeCloseTo(BASE_FREQ, 10);
    });

    it("snaps JI angles to the nearest palindromic ratio", () => {
      expect(angleToFreq(0, "ji")).toBeCloseTo(BASE_FREQ, 10);
      expect(angleToFreq(75, "ji")).toBeCloseTo(BASE_FREQ * (8 / 7), 10);
      expect(angleToFreq(144, "ji")).toBeCloseTo(BASE_FREQ * (7 / 5), 10);
      expect(angleToFreq(216, "ji")).toBeCloseTo(BASE_FREQ * (8 / 5), 10);
      expect(angleToFreq(288, "ji")).toBeCloseTo(BASE_FREQ * 2, 10);
    });

    it("maps octatonic and diatonic modes to their snapped scale degrees", () => {
      expect(angleToFreq(0, "octatonic")).toBeCloseTo(261.63, 10);
      expect(angleToFreq(180, "octatonic")).toBeCloseTo(261.63 * Math.pow(2, 6 / 12), 10);
      expect(angleToFreq(0, "diatonic7")).toBeCloseTo(261.63, 10);
      expect(angleToFreq(180, "diatonic7")).toBeCloseTo(261.63 * Math.pow(2, 7 / 12), 10);
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
