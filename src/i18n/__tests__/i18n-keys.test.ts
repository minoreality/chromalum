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

describe("i18n key usage", () => {
  // Every source file that can reference a key, as raw text. en.ts and ja.ts are
  // the dictionaries themselves and are skipped below.
  const sources: Record<string, string> = {
    ...import.meta.glob("../../**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
    ...import.meta.glob("../../../e2e/**/*.ts", { query: "?raw", import: "default", eager: true }),
  };
  const texts = Object.entries(sources)
    .filter(([path]) => !/\/(en|ja)\.ts$/.test(path))
    .map(([, text]) => text);

  // A key is referenced when it appears as a whole word anywhere outside the
  // dictionaries: t("key"), a labelKey in a data table, or a test.
  const words = new Set<string>();
  for (const text of texts) for (const word of text.match(/[A-Za-z0-9_]+/g) ?? []) words.add(word);

  // Keys built at runtime — t(`theory_generation_layer_${count}`) or t("tool_" + id) —
  // are covered by the literal prefix in front of the interpolation.
  const dynamicPrefixes = new Set<string>();
  for (const text of texts) {
    for (const m of text.matchAll(/`([a-z][a-z0-9_]*_)\$\{/g)) dynamicPrefixes.add(m[1]);
    for (const m of text.matchAll(/"([a-z][a-z0-9_]*_)" *\+/g)) dynamicPrefixes.add(m[1]);
  }
  const isDynamic = (key: string) => [...dynamicPrefixes].some((prefix) => key.startsWith(prefix));

  it("every key in en is referenced from src or e2e", () => {
    const unreferenced = Object.keys(en).filter((key) => !words.has(key) && !isDynamic(key));
    expect(
      unreferenced,
      `Unreferenced i18n keys — remove them from en.ts and ja.ts, or reference them:\n  ${unreferenced.join("\n  ")}`,
    ).toEqual([]);
  });
});
