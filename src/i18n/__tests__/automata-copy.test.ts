import { describe, expect, it } from "vitest";
import { en } from "../en";
import { ja } from "../ja";
describe("Automata copy", () => {
  it("keeps Japanese and English keys complete", () => {
    const keys = (dictionary: Record<string, string>) =>
      Object.keys(dictionary)
        .filter((key) => key.startsWith("automata_") || key === "tab_automata")
        .sort();
    expect(keys(en)).not.toHaveLength(0);
    expect(keys(en)).toEqual(keys(ja));
  });
  it("keeps the direct-editing labels and tab name", () => {
    const jp = ja as Record<string, string>,
      english = en as Record<string, string>;
    expect(jp.tab_automata).toBe("Flow");
    expect(english.tab_automata).toBe("Flow");
    expect(jp.automata_step).toBe("1ステップ進む");
    expect(jp.automata_return).toBe("初期配置に戻る");
    expect(jp.automata_preset_image).toBe("読み込んだ画像");
    expect(english.automata_preset_image).toBe("Loaded image");
    expect(english.automata_keyboard_hint).toBe("Arrow keys select a cell. At time 0, Enter or Space places the selected color.");
  });
  it("labels all original rules, presets and discrete colors", () => {
    const jp = ja as Record<string, string>,
      english = en as Record<string, string>;
    const rules = ["4", "5", "diagonal", "diagonal_center", "8", "9", "life", "rug"];
    expect(rules.map((id) => jp["automata_rule_" + id])).toEqual([
      "十字のXOR（4セル）",
      "十字＋中央のXOR（5セル）",
      "斜めのXOR（4セル）",
      "斜め＋中央のXOR（5セル）",
      "周囲のXOR（8セル）",
      "周囲＋中央のXOR（9セル）",
      "ライフゲーム",
      "ペルシャ絨毯",
    ]);
    const presets = [
      "rosette",
      "diamond",
      "corolla",
      "luminous",
      "clock",
      "phase_clock",
      "pulse",
      "fireworks",
      "weave",
      "rgb",
      "white",
      "black",
    ];
    expect(presets.map((id) => jp["automata_preset_" + id])).toEqual([
      "三色の対称花（9点）",
      "菱の輪（12点）",
      "三色の花冠（12点）",
      "光の織物（25点）",
      "彩りの花時計",
      "三相の花時計",
      "三色の輪舞",
      "対称の花火",
      "彩りの織り目（24点）",
      "G・R・Bの3点",
      "白1点",
      "すべて黒",
    ]);
    expect(Array.from({ length: 8 }, (_, i) => english["automata_color_" + i])).toEqual([
      "Black",
      "Blue",
      "Red",
      "Magenta",
      "Green",
      "Cyan",
      "Yellow",
      "White",
    ]);
  });
});
