import { describe, expect, it } from "vitest";
import { CA_RULES } from "../../automata/model";
import { AUTOMATA_PRESETS } from "../../automata/presets";
import { getAutomataViewingNote } from "../automata-viewing-notes";
import { en } from "../en";
import { ja } from "../ja";
describe("Automata copy", () => {
  it("has a localized viewing note for every preset and rule, including the shared black field", () => {
    for (const preset of AUTOMATA_PRESETS) {
      for (const rule of CA_RULES) {
        expect(getAutomataViewingNote(preset, rule, "ja")).toMatch(/[ぁ-ん]/);
        expect(getAutomataViewingNote(preset, rule, "en")).toMatch(/[a-z]/);
      }
    }
    for (const lang of ["ja", "en"] as const) {
      expect(new Set(CA_RULES.map((rule) => getAutomataViewingNote("black", rule, lang))).size).toBe(1);
    }
    expect(getAutomataViewingNote("corolla", "life", "ja")).toContain("黒い中心を囲む緑の4点");
    expect(getAutomataViewingNote("corolla", "or", "ja")).toContain("緑、黄、白");
    expect(getAutomataViewingNote("corolla", "life", "en")).toContain("Four green dots surround the black center");
    expect(getAutomataViewingNote("corolla", "or", "en")).toContain("green, then yellow, then white");
  });
  it("keeps Japanese and English keys complete", () => {
    const keys = (dictionary: Record<string, string>) =>
      Object.keys(dictionary)
        .filter((key) => key.startsWith("automata_") || key.startsWith("help_automata_") || key === "tab_automata")
        .sort();
    expect(keys(en)).not.toHaveLength(0);
    expect(keys(en)).toEqual(keys(ja));
  });
  it("keeps the direct-editing labels and tab name", () => {
    const jp = ja as Record<string, string>,
      english = en as Record<string, string>;
    expect(jp.tab_automata).toBe("Flow");
    expect(english.tab_automata).toBe("Flow");
    expect(jp.automata_rule).toBe("更新規則");
    expect(english.automata_rule).toBe("Update rule");
    expect(jp.automata_back).toBe("1世代戻る");
    expect(jp.automata_step).toBe("1世代進む");
    expect(jp.automata_return).toBe("第0世代に戻る");
    expect(english.automata_back).toBe("Previous generation");
    expect(english.automata_step).toBe("Next generation");
    expect(english.automata_return).toBe("Return to generation 0");
    expect(jp.automata_generation_sound).toBe("変化の響き");
    expect(english.automata_generation_sound).toBe("Sound of change");
    expect(jp.help_automata_toggle_sound).toBe("変化の響きをオン／オフ");
    expect(english.help_automata_toggle_sound).toBe("Toggle sound of change");
    expect(jp.automata_preset_edited).toBe("編集済み");
    expect(english.automata_preset_edited).toBe("Edited pattern");
    expect(jp.automata_time).toBe("世代：{0} / {1}");
    expect(english.automata_time).toBe("Generation: {0} / {1}");
    expect(jp.automata_edit_mode).toBe("初期配置を編集できます");
    expect(english.automata_edit_mode).toBe("Pattern is editable");
    expect(english.automata_keyboard_hint).toBe(
      "Arrow keys select a cell. At generation 0, 0–7 paints the pointed or selected cell in that color. Enter or Space paints with the selected color.",
    );
    expect(jp.automata_keyboard_hint).toBe(
      "矢印キーでセルを選択。第0世代では、0〜7でマウス位置または選択中のセルに対応する色を置きます。EnterまたはSpaceでは選択中の色を置きます。",
    );
    expect(english.automata_initial_keyboard_hint).toBe(
      "Point to a cell or select it with the arrow keys. 0–7 selects a color and paints. Enter or Space paints with the selected color.",
    );
    expect(jp.automata_initial_keyboard_hint).toBe(
      "マウスまたは矢印キーでセルを選び、0〜7で対応する色を置きます。EnterまたはSpaceでは選択中の色を置きます。",
    );
    expect(english.help_automata_draw).toBe("Paint with the matching color");
    expect(jp.help_automata_draw).toBe("数字に対応する色を置く");
    expect(english.help_automata_paint_selected).toBe("Place the selected color");
    expect(jp.automata_result_heading).toBe("世代配置");
    expect(english.automata_result_heading).toBe("Evolved pattern");
    expect(jp.automata_initial_canvas_label).toBe("初期配置の盤面");
    expect(english.automata_initial_canvas_label).toBe("Initial pattern canvas");
    expect(jp.automata_result_canvas_label).toBe("世代配置の盤面");
    expect(english.automata_result_canvas_label).toBe("Evolved pattern canvas");
  });
  it("labels XOR and Life-like rules, presets and discrete colors", () => {
    const jp = ja as Record<string, string>,
      english = en as Record<string, string>;
    const rules = ["4", "5", "diagonal", "diagonal_center", "8", "9", "life", "rug", "seeds", "day_night"];
    expect(rules.map((id) => jp["automata_rule_" + id])).toEqual([
      "十字のXOR（4セル）",
      "十字＋中央のXOR（5セル）",
      "斜めのXOR（4セル）",
      "斜め＋中央のXOR（5セル）",
      "周囲のXOR（8セル）",
      "周囲＋中央のXOR（9セル）",
      "Conway’s Game of Life",
      "Persian Rug",
      "Seeds",
      "Day & Night",
    ]);
    expect(english.automata_rule_9).toBe("3×3 XOR (9 cells)");
    const presetKeys = AUTOMATA_PRESETS.map((id) => "automata_preset_" + id.replace(/-/g, "_"));
    expect(presetKeys.map((key) => jp[key])).toEqual([
      "色硝子",
      "小花紋",
      "星芒",
      "重ね菱",
      "綾錦",
      "光跡",
      "輪唱",
      "花暦",
      "花火",
      "純白",
      "漆黒",
    ]);
    expect(presetKeys.map((key) => english[key])).toEqual([
      "Overlapping squares",
      "Three-color rosette",
      "Three-color cross",
      "Concentric diamonds",
      "Color weave",
      "Glider",
      "Three-color pulsar",
      "Flower clock",
      "Fireworks",
      "All white",
      "All black",
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
  it("describes the two named XOR rules in both languages", () => {
    expect(ja.automata_rule_hint_8).toBe(
      "周囲8セルのうち、その色成分が点灯しているセルが奇数個なら、次の世代で点灯します。Replicator（{0}）",
    );
    expect(ja.automata_rule_hint_9).toBe(
      "中央を含む9セルのうち、その色成分が点灯しているセルが奇数個なら、次の世代で点灯します。Fredkin（{0}）",
    );
    expect(en.automata_rule_hint_8).toBe(
      "A channel is on in the next generation if an odd number of the eight neighbors have it on. Replicator ({0})",
    );
    expect(en.automata_rule_hint_9).toBe(
      "A channel is on in the next generation if an odd number of the nine cells, including the center, have it on. Fredkin ({0})",
    );
  });
  it("names the rule groups and the four color operations in both languages", () => {
    const groups = ["xor", "or_and", "majority_toggle", "life"] as const;
    expect(groups.map((id) => ja[`automata_rules_${id}`])).toEqual(["XOR", "OR・AND", "多数決・反転", "ライフゲーム系"]);
    expect(groups.map((id) => en[`automata_rules_${id}`])).toEqual(["XOR", "OR / AND", "Majority / toggles", "Life-like"]);
    const rules = ["or", "and", "majority", "hamming"] as const;
    expect(rules.map((id) => ja[`automata_rule_${id}`])).toEqual([
      "十字＋中央のOR（5セル）",
      "十字＋中央のAND（5セル）",
      "十字＋中央の多数決（5セル）",
      "1ビット差で反転（上下左右）",
    ]);
    expect(rules.map((id) => en[`automata_rule_${id}`])).toEqual([
      "Cross + center OR (5 cells)",
      "Cross + center AND (5 cells)",
      "Cross + center majority (5 cells)",
      "Hamming distance-1 toggles",
    ]);
    expect(rules.map((id) => ja[`automata_rule_hint_${id}`])).toEqual([
      "各色成分の点灯領域が、1世代ごとに上下左右へ1セル広がります。画像処理でいう膨張です。",
      "各色成分は、中央と上下左右のすべてで点灯している場所にだけ残ります。画像処理でいう収縮です。",
      "自分と上下左右の5セルで、3セル以上が点灯しているチャンネルを次の世代で点灯します。",
      "中央の色と上下左右の色をそれぞれ比べ、Hamming距離が1なら、異なる色成分を反転します。同じ成分の反転は2回で相殺されます。",
    ]);
    expect(rules.map((id) => en[`automata_rule_hint_${id}`])).toEqual([
      "Each channel’s lit region expands one cell up, down, left and right each generation. This is dilation in image processing.",
      "A channel stays on only where it is on in the center and all four orthogonal neighbors. This is erosion in image processing.",
      "Counts the cell and its four orthogonal neighbors. A channel is on if at least three of the five cells have it on.",
      "Orthogonal neighbors differing by one bit propose toggles. An even number of toggles in the same channel cancels.",
    ]);
  });
});
