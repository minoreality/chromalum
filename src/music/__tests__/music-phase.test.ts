import { describe, expect, it } from "vitest";
import {
  complementPairScreenUnit,
  complementPhaseFactor,
  hueScreenUnit,
  hueStereoPan,
  liveHueAngleDeg,
  normalizeHueAngleDeg,
} from "../music-phase";

describe("canonical Music hue phase", () => {
  it("uses clockwise 0° at red/top and adds alpha to the base hue", () => {
    expect(hueScreenUnit(0, 0)).toEqual(expect.objectContaining({ x: expect.closeTo(0, 12), y: expect.closeTo(-1, 12) }));
    expect(liveHueAngleDeg(120, 300)).toBe(60);
    expect(normalizeHueAngleDeg(-60)).toBe(300);
  });

  it("uses the same live angle for screen x and stereo pan", () => {
    for (const [theta, alpha] of [
      [0, 0],
      [60, 30],
      [120, 300],
      [240, 45],
    ]) {
      expect(hueStereoPan(theta, alpha)).toBeCloseTo(hueScreenUnit(theta, alpha).x, 12);
    }
  });

  it("derives complement gain from the actual displayed vector sum", () => {
    const cancelled = complementPairScreenUnit(60, 45, 45);
    const aligned = complementPairScreenUnit(60, 45, 225);

    expect(Math.hypot(cancelled.x, cancelled.y)).toBeCloseTo(0, 12);
    expect(complementPhaseFactor(45, 45)).toBeCloseTo(0, 12);
    expect(Math.hypot(aligned.x, aligned.y)).toBeCloseTo(2, 12);
    expect(complementPhaseFactor(45, 225)).toBeCloseTo(1, 12);
  });
});
