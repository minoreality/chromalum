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
    expect(jp.automata_rule).toBe("更新規則");
    expect(english.automata_rule).toBe("Update rule");
    expect(jp.automata_back).toBe("1世代戻る");
    expect(jp.automata_step).toBe("1世代進む");
    expect(jp.automata_return).toBe("第0世代に戻る");
    expect(english.automata_back).toBe("Previous generation");
    expect(english.automata_step).toBe("Next generation");
    expect(english.automata_return).toBe("Return to generation 0");
    expect(jp.automata_preset_edited).toBe("編集済み");
    expect(english.automata_preset_edited).toBe("Edited pattern");
    expect(jp.automata_time).toBe("世代：{0} / {1}");
    expect(english.automata_time).toBe("Generation: {0} / {1}");
    expect(jp.automata_edit_mode).toBe("初期配置を編集");
    expect(english.automata_edit_mode).toBe("Edit initial pattern");
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
    expect(english.help_automata_draw).toBe("Draw in the initial pattern");
    expect(jp.help_automata_draw).toBe("初期配置に描画");
    expect(jp.automata_result_heading).toBe("世代配置");
    expect(english.automata_result_heading).toBe("Evolved pattern");
    expect(jp.automata_initial_canvas_label).toBe("初期配置の盤面");
    expect(english.automata_initial_canvas_label).toBe("Initial pattern canvas");
    expect(jp.automata_result_canvas_label).toBe("世代配置の盤面");
    expect(english.automata_result_canvas_label).toBe("Evolved pattern canvas");
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
      "三色の対称花",
      "菱の輪",
      "三色の花冠",
      "光の織物",
      "彩りの花時計",
      "三相の花時計",
      "三色の輪舞",
      "対称の花火",
      "彩りの織り目",
      "G・R・Bの3点",
      "白1点",
      "すべて黒",
    ]);
    expect(presets.map((id) => english["automata_preset_" + id])).toEqual([
      "Three-color rosette",
      "Diamond ring",
      "Three-color corolla",
      "Luminous weave",
      "Color clock",
      "Three-phase color clock",
      "Three-color pulsar",
      "Symmetric fireworks",
      "Color weave",
      "Three points: G, R, B",
      "One white cell",
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
  it("names the four color rules and their paired examples in both languages", () => {
    const rules = ["or", "and", "majority", "hamming"] as const;
    expect(rules.map((id) => ja[`automata_rule_${id}`])).toEqual([
      "十字＋中央のOR（5セル）",
      "十字＋中央のAND（5セル）",
      "十字＋中央の多数決（5セル）",
      "Hamming距離1の反転",
    ]);
    expect(rules.map((id) => en[`automata_rule_${id}`])).toEqual([
      "Cross + center OR (5 cells)",
      "Cross + center AND (5 cells)",
      "Cross + center majority (5 cells)",
      "Hamming distance-1 toggles",
    ]);
    const presets = ["or_spread", "and_core", "majority_cleanup", "hamming_boundary"] as const;
    expect(presets.map((id) => ja[`automata_preset_${id}`])).toEqual([
      "OR：三原色の広がり",
      "AND：共通色の芯",
      "多数決：穴と飛び点",
      "Hamming：1ビット差と補色",
    ]);
    expect(presets.map((id) => en[`automata_preset_${id}`])).toEqual([
      "OR: Spreading primaries",
      "AND: Shared-color cores",
      "Majority: Holes and stray dots",
      "Hamming: One-bit and complement boundaries",
    ]);
    expect(rules.map((id) => ja[`automata_rule_hint_${id}`])).toEqual([
      "自分と上下左右にあるチャンネルを集めます。重なっても相殺しません。",
      "自分と上下左右すべてに共通するチャンネルだけを残します。",
      "自分と上下左右の5セルで、3セル以上が点灯しているチャンネルを次の世代で点灯します。",
      "上下左右の1ビット差の色から反転を受け、同じチャンネルへの反転は偶数回で相殺します。",
    ]);
    expect(rules.map((id) => en[`automata_rule_hint_${id}`])).toEqual([
      "Collects channels from the cell and its four orthogonal neighbors. Overlaps do not cancel.",
      "Keeps only channels shared by the cell and all four orthogonal neighbors.",
      "Counts the cell and its four orthogonal neighbors. A channel is on if at least three of the five cells have it on.",
      "Orthogonal neighbors differing by one bit propose toggles. An even number of toggles in the same channel cancels.",
    ]);
  });
});
