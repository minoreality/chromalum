import { describe, it, expect } from "vitest";
import { en } from "../en";
import { ja } from "../ja";

describe("i18n key completeness", () => {
  const enKeys = Object.keys(en).sort();
  const jaKeys = Object.keys(ja).sort();

  it("en and ja have the same keys", () => {
    expect(enKeys).toEqual(jaKeys);
  });

  it("no empty translations in en", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key} should not be empty`).toBeTruthy();
    }
  });

  it("no empty translations in ja", () => {
    for (const [key, value] of Object.entries(ja)) {
      expect(value, `ja.${key} should not be empty`).toBeTruthy();
    }
  });

  it("format placeholders match between en and ja", () => {
    for (const key of enKeys) {
      const enPlaceholders = (en[key as keyof typeof en].match(/\{\d+\}/g) || []).sort();
      const jaPlaceholders = (ja[key as keyof typeof ja].match(/\{\d+\}/g) || []).sort();
      expect(jaPlaceholders, `Placeholder mismatch for key "${key}"`).toEqual(enPlaceholders);
    }
  });

  it("keeps the Music heading branded as CHROMATIC MUSIC", () => {
    expect(en.music_title).toBe("CHROMATIC MUSIC");
    expect(ja.music_title).toBe("CHROMATIC MUSIC");
  });

  it("labels the CHROMALUM pitch mapping as Chromatic", () => {
    expect(en.music_pitch_chromalum).toBe("Chromatic");
    expect(ja.music_pitch_chromalum).toBe("Chromatic");
    expect(en.music_pitch_legend_chromalum).toBe("Chromatic 15° Grid");
    expect(ja.music_pitch_legend_chromalum).toBe("Chromatic 15° Grid");
  });
});
