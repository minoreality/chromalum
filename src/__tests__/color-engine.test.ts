import { describe, it, expect } from "vitest";
import {
  GRB_TONE_B,
  GRB_TONE_G,
  GRB_TONE_R,
  levelTone8,
  levelToneNorm,
  rgbGrbTone8,
  rgbGrbToneNorm,
  hue2rgb,
  rgb2hue,
  GRAY_LUT,
  LEVEL_INFO,
  LEVEL_CANDIDATES,
  buildColorLUT,
  DEFAULT_CANDIDATE_INDEX_BY_LEVEL,
} from "../color-engine";

describe("GRB Binary Tone helpers", () => {
  it("uses 4:2:1 normalized GRB weights", () => {
    expect(GRB_TONE_G).toBe(4 / 7);
    expect(GRB_TONE_R).toBe(2 / 7);
    expect(GRB_TONE_B).toBe(1 / 7);
  });

  it("maps levels to normalized tone and derived 8-bit tone", () => {
    expect(Array.from({ length: 8 }, (_, level) => levelToneNorm(level))).toEqual([0, 1 / 7, 2 / 7, 3 / 7, 4 / 7, 5 / 7, 6 / 7, 1]);
    expect(Array.from({ length: 8 }, (_, level) => levelTone8(level))).toEqual([0, 36, 73, 109, 146, 182, 219, 255]);
  });

  it("maps RGB byte channels to GRB tone", () => {
    expect(rgbGrbToneNorm(0, 0, 0)).toBe(0);
    expect(rgbGrbToneNorm(255, 255, 255)).toBe(1);
    expect(rgbGrbTone8(255, 0, 0)).toBe(73);
    expect(rgbGrbTone8(0, 255, 0)).toBe(146);
    expect(rgbGrbTone8(0, 0, 255)).toBe(36);
  });
});

describe("hue2rgb / rgb2hue roundtrip", () => {
  const testAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  testAngles.forEach((h) => {
    it(`roundtrip at ${h}°`, () => {
      const rgb = hue2rgb(h);
      expect(rgb.length).toBe(3);
      rgb.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      });
      const recovered = rgb2hue(...rgb);
      // Allow 1° tolerance due to rounding
      const diff = Math.abs(recovered - h);
      expect(Math.min(diff, 360 - diff)).toBeLessThan(1);
    });
  });

  it("handles negative and >360 angles", () => {
    const a = hue2rgb(-60);
    const b = hue2rgb(300);
    expect(a).toEqual(b);

    const c = hue2rgb(420);
    const d = hue2rgb(60);
    expect(c).toEqual(d);
  });
});

describe("GRAY_LUT", () => {
  it("has 256 entries", () => {
    expect(GRAY_LUT.length).toBe(256);
  });

  it("maps 0 to level 0", () => {
    expect(GRAY_LUT[0]).toBe(0);
  });

  it("maps 255 to level 7", () => {
    expect(GRAY_LUT[255]).toBe(7);
  });

  it("all values are 0-7", () => {
    for (let i = 0; i < 256; i++) {
      expect(GRAY_LUT[i]).toBeGreaterThanOrEqual(0);
      expect(GRAY_LUT[i]).toBeLessThanOrEqual(7);
    }
  });

  it("is monotonically non-decreasing", () => {
    for (let i = 1; i < 256; i++) {
      expect(GRAY_LUT[i]).toBeGreaterThanOrEqual(GRAY_LUT[i - 1]);
    }
  });
});

describe("LEVEL_INFO", () => {
  it("has 8 entries", () => {
    expect(LEVEL_INFO.length).toBe(8);
  });

  it("level 0 is Black with gray 0", () => {
    expect(LEVEL_INFO[0].name).toBe("Black");
    expect(LEVEL_INFO[0].gray).toBe(0);
  });

  it("level 7 is White with gray 255", () => {
    expect(LEVEL_INFO[7].name).toBe("White");
    expect(LEVEL_INFO[7].gray).toBe(255);
  });

  it("uses derived 8-bit GRB tone values", () => {
    expect(LEVEL_INFO.map(({ gray }) => gray)).toEqual([0, 36, 73, 109, 146, 182, 219, 255]);
  });
});

describe("LEVEL_CANDIDATES", () => {
  it("has 8 levels", () => {
    expect(LEVEL_CANDIDATES.length).toBe(8);
  });

  it("each level has at least 1 candidate", () => {
    LEVEL_CANDIDATES.forEach((alts, _i) => {
      expect(alts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("has the expected pure-color candidate counts per tone level", () => {
    expect(LEVEL_CANDIDATES.map((alts) => alts.length)).toEqual([1, 1, 3, 3, 3, 3, 1, 1]);
  });

  it("aligns edge candidate hues to 4:2:1 hex angles", () => {
    expect(LEVEL_CANDIDATES.map((alts) => alts.map(({ hueAngleDeg }) => Math.round(hueAngleDeg)))).toEqual([
      [-1],
      [240],
      [0, 225, 270],
      [15, 210, 300],
      [30, 120, 195],
      [45, 90, 180],
      [60],
      [-1],
    ]);
  });

  it("level 0 is black [0,0,0]", () => {
    expect(LEVEL_CANDIDATES[0][0].rgb).toEqual([0, 0, 0]);
  });

  it("level 7 is white [255,255,255]", () => {
    expect(LEVEL_CANDIDATES[7][0].rgb).toEqual([255, 255, 255]);
  });

  it("intermediate levels have pure color candidates", () => {
    for (let lv = 1; lv <= 6; lv++) {
      LEVEL_CANDIDATES[lv].forEach((c) => {
        // Each candidate should have max=255 and min=0 (pure color)
        expect(Math.max(...c.rgb)).toBe(255);
        expect(Math.min(...c.rgb)).toBe(0);
      });
    }
  });
});

describe("buildColorLUT", () => {
  it("returns 8 RGB tuples with default config", () => {
    const lut = buildColorLUT(DEFAULT_CANDIDATE_INDEX_BY_LEVEL);
    expect(lut.length).toBe(8);
    lut.forEach((rgb) => {
      expect(rgb.length).toBe(3);
      rgb.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      });
    });
  });

  it("level 0 is always black", () => {
    const lut = buildColorLUT(DEFAULT_CANDIDATE_INDEX_BY_LEVEL);
    expect(lut[0]).toEqual([0, 0, 0]);
  });

  it("level 7 is always white", () => {
    const lut = buildColorLUT(DEFAULT_CANDIDATE_INDEX_BY_LEVEL);
    expect(lut[7]).toEqual([255, 255, 255]);
  });
});
