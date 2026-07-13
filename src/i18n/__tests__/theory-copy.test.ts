import { describe, expect, it } from "vitest";
import { en } from "../en";
import { ja } from "../ja";

describe("theory copy high-risk claims", () => {
  it("defines the Venn characteristic function by channel membership", () => {
    expect(en.theory_venn_desc).toContain("characteristic function χ_S");
    expect(en.theory_venn_desc).toContain("A = GF(2)³ remains the full algebraic layer");
    expect(ja.theory_venn_desc).toContain("特性関数 χ_S(x)");
    expect(ja.theory_venn_desc).toContain("チャンネルxがSに属せば1");
    expect(ja.theory_venn_desc).toContain("A = GF(2)³は代数層全体");
  });

  it("keeps Boolean-color identities scoped to the cases where they are true", () => {
    expect(en.theory_dice_footer_demorgan).toMatch(/disjoint colors/i);
    expect(en.theory_dice_footer_demorgan).toContain("a ∧ b = 0");
    expect(en.theory_conn_boolean_hook).toContain("a⊕b=a∨b");
    expect(en.theory_dice_footer_subtractive).toContain("a ∨ b = 7");
    expect(en.theory_dice_footer_subtractive).toContain("a + b - 7 = a ∧ b");
    expect(en.theory_xor_desc).toContain("a + b = (a ⊕ b) + 2(a ∧ b)");
    expect(en.theory_xor_desc.toLowerCase()).toContain("boolean-and identity");
    expect(en.theory_xor_desc.toLowerCase()).not.toContain("carry correction");

    expect(ja.theory_conn_boolean_hook).toContain("重なりのない2色");
    expect(ja.theory_xor_desc).toContain("ブールAND恒等式");
    expect(ja.theory_xor_desc).not.toContain("桁あふれ補正");
  });

  it("describes Hamming/Fano links as position labels and subspaces, not channel flips or literal slices", () => {
    expect(en.theory_hamming_desc.toLowerCase()).toContain("position");
    expect(en.theory_hamming_desc).toContain("parity-bit positions");
    expect(en.theory_hamming_desc).toContain("parity-check rows");
    expect(en.theory_hamming_desc2).toContain("parity-check row labeled B");
    expect(en.theory_hamming_desc2).toContain("c=0110011");
    expect(en.theory_hamming_desc2).toContain("syndrome computed from r");
    expect(en.theory_hamming_desc2).not.toContain("Blue(1) checks");
    expect(en.theory_hamming_desc.toLowerCase()).not.toContain("single channel flips");
    expect(en.theory_fano_desc.toLowerCase()).toContain("zero vector");
    expect(en.theory_hamming_desc.toLowerCase()).toContain("same nonzero 3-bit labels");
    expect(en.theory_conn_extended).toContain("extra coordinate for overall parity");
    expect(en.theory_conn_extended).toContain("does not make the colors codewords");
    expect(en.theory_conn_cube_geometry_hook.toLowerCase()).toContain("two-dimensional subspace");
    expect(en.theory_conn_cube_geometry_hook).toContain("not a Euclidean plane");
    expect(en.theory_conn_cube_geometry_hook.toLowerCase()).not.toContain("7 fano lines are planar cross-sections");

    expect(ja.theory_hamming_desc).toContain("位置");
    expect(ja.theory_hamming_desc).toContain("パリティビット位置");
    expect(ja.theory_hamming_desc).toContain("パリティ検査行");
    expect(ja.theory_hamming_desc2).toContain("パリティ検査行 B");
    expect(ja.theory_hamming_desc2).toContain("c=0110011");
    expect(ja.theory_hamming_desc2).toContain("受信語から計算したシンドローム");
    expect(ja.theory_hamming_desc2).not.toContain("Blue(1) は");
    expect(ja.theory_fano_desc).toContain("零ベクトル");
    expect(ja.theory_conn_extended).toContain("座標");
    expect(ja.theory_conn_cube_geometry_hook).toContain("2次元部分空間");
    expect(ja.theory_conn_cube_geometry_hook).toContain("ユークリッド平面ではありません");
  });

  it("keeps the color-polyhedra claims non-literal where the UI is schematic", () => {
    expect(en.theory_octa_desc.toLowerCase()).not.toContain("visible as the edge gradient’s midpoint");
    expect(en.theory_octa_desc.toLowerCase()).not.toContain("literal rgb midpoint");
    expect(en.theory_octa_desc).toContain("B↔Y, R↔C, M↔G");
    expect(en.theory_octa_desc2).toContain("6 chromatic XOR results appear exactly twice");
    expect(en.theory_conn_polyhedra_desc).toContain("the four polyhedral structures in this tab");
    expect(en.theory_conn_polyhedra_desc).not.toContain("§9");

    expect(ja.theory_octa_desc).not.toContain("中間点として視認できます");
    expect(ja.theory_octa_desc).toContain("B↔Y、R↔C、M↔G");
    expect(ja.theory_octa_desc2).toContain("6 つの有彩色 XOR 結果が各2回ずつ");
    expect(ja.theory_conn_polyhedra_desc).toContain("本タブの4つの多面体");
    expect(ja.theory_conn_polyhedra_desc).not.toContain("§9");
  });

  it("states binary tone ordering and hue-order uniqueness with the intended proof boundaries", () => {
    expect(en.theory_binary_desc).toContain("GRB Binary Tone model");
    expect(en.theory_binary_desc).toContain("level = 4G + 2R + B");
    expect(en.theory_binary_desc).toContain("tone = level / 7");
    expect(en.theory_binary_tone_formula).toContain("T = (4G + 2R + B) / 7 = level / 7");
    expect(en.theory_binary_tone_complement).toContain("Tₖ + T₇₋ₖ = 1");
    expect(en.theory_binary_tone_complement).not.toContain("255");
    expect(en.theory_binary_tone_complement).not.toContain("8-bit");
    expect(en.theory_zigzag_desc).toContain("T(h) + T(h+180°) = 1");
    expect(en.theory_zigzag_desc).toContain("chromatic integer level L1-L6");
    expect(en.theory_zigzag_desc).toContain("L0/L7 are not on the hue hexagon");
    expect(en.theory_zigzag_desc).not.toContain("each vertex tone value");
    expect(en.theory_binary_desc).not.toContain("consequence of human color vision");
    expect(en.theory_binary_desc).not.toContain("BT.601");
    expect(en.theory_binary_desc.toLowerCase()).not.toContain("luma");
    expect(en.theory_binary_desc.toLowerCase()).not.toContain("brightness");
    expect(en.theory_binary_desc).toContain("internal definition");
    expect(en.theory_intro).not.toContain("0 or 255");
    expect(en.theory_connections_desc).not.toContain("0/255");
    expect(en.theory_dice_desc).toContain("c ↦ c ⊕ 7 reverses tone order");
    expect(en.theory_dice_desc3).toContain("11 free cube nets");
    expect(en.theory_dice_desc3).toContain("face-adjacency tree");
    expect(en.theory_dice_desc3).toContain("R→Y→G→C→B→M");
    expect(en.theory_dice_desc3).toContain("equivalently its reverse");

    expect(ja.theory_binary_desc).toContain("GRB Binary Tone Model");
    expect(ja.theory_binary_desc).toContain("level = 4G + 2R + B");
    expect(ja.theory_binary_desc).toContain("tone = level / 7");
    expect(ja.theory_binary_tone_formula).toContain("T = (4G + 2R + B) / 7 = level / 7");
    expect(ja.theory_binary_tone_complement).toContain("Tₖ + T₇₋ₖ = 1");
    expect(ja.theory_binary_tone_complement).not.toContain("255");
    expect(ja.theory_binary_tone_complement).not.toContain("8ビット");
    expect(ja.theory_zigzag_desc).toContain("T(h) + T(h+180°) = 1");
    expect(ja.theory_zigzag_desc).toContain("有彩整数level L1-L6");
    expect(ja.theory_zigzag_desc).toContain("πのファイバー");
    expect(ja.theory_zigzag_desc).not.toContain("各頂点トーン値");
    expect(ja.theory_binary_desc).not.toContain("人間の色覚の帰結です");
    expect(ja.theory_binary_desc).not.toContain("BT.601");
    expect(ja.theory_binary_desc.toLowerCase()).not.toContain("luma");
    expect(ja.theory_binary_desc).not.toContain("明るさ");
    expect(ja.theory_binary_desc).not.toContain("輝度");
    expect(ja.theory_binary_desc).toContain("モデル内の定義");
    expect(ja.theory_zigzag_desc).not.toContain("明るさ");
    expect(ja.theory_dice_desc).not.toContain("暗い順");
    expect(ja.theory_intro).not.toContain("0 または 255");
    expect(ja.theory_connections_desc).not.toContain("0/255");
    expect(ja.theory_dice_desc).toContain("補色写像 c ↦ c ⊕ 7 はトーン順を反転");
    expect(ja.theory_dice_desc3).toContain("11種類の立方体展開図（回転・反転は同一視）");
    expect(ja.theory_dice_desc3).toContain("R→Y→G→C→B→M");
    expect(ja.theory_dice_desc3).toContain("逆順");
  });

  it("states the principal nonclaims in the final scope copy", () => {
    expect(en.theory_conn_limit_vertices).toContain("eight binary RGB vertices");
    expect(en.theory_conn_limit_tone).toMatch(/not perceptual lightness.*luminance/);
    expect(en.theory_conn_limit_operations).toContain("XOR is not physical additive mixing of light");
    expect(en.theory_conn_limit_operations).toContain("vector addition on A and Boolean meet");
    expect(en.theory_conn_limit_spaces).toContain("OKLab/OKLCH");
    expect(en.theory_conn_limit_novelty).toContain("no novelty is claimed");

    expect(ja.theory_conn_limit_vertices).toContain("8つの二値RGB頂点");
    expect(ja.theory_conn_limit_tone).toContain("知覚的明度");
    expect(ja.theory_conn_limit_tone).toContain("相対輝度ではありません");
    expect(ja.theory_conn_limit_operations).toContain("XORは光の物理的な加法混色ではなく");
    expect(ja.theory_conn_limit_operations).toContain("A上のベクトル加法とブール束のmeet");
    expect(ja.theory_conn_limit_spaces).toContain("OKLab/OKLCH");
    expect(ja.theory_conn_limit_novelty).toContain("新規性は主張しません");
  });

  it("separates algebraic labels from pure-hue display representatives", () => {
    expect(en.theory_intro).toContain("algebraic layer A = GF(2)³");
    expect(en.theory_intro).toContain("separate layer H");
    expect(en.theory_intro).toContain("display representatives");
    expect(en.theory_intro).toContain("not extra elements of A");
    expect(en.theory_zigzag_desc).toContain("π(G,R,B)=4G+2R+B");
    expect(en.theory_conn_limit_vertices).toContain("separate boundary layer H");

    expect(ja.theory_intro).toContain("代数層 A = GF(2)³");
    expect(ja.theory_intro).toContain("純色色相境界を H");
    expect(ja.theory_intro).toContain("表示代表元");
    expect(ja.theory_intro).toContain("A の追加要素ではなく");
    expect(ja.theory_zigzag_desc).toContain("π(G,R,B)=4G+2R+B");
    expect(ja.theory_conn_limit_vertices).toContain("別層H");
  });

  it("does not overstate XOR, physical mixing, die placement, or diagram projection", () => {
    expect(en.theory_xor_desc).toContain("does not define every relation");
    expect(en.theory_xor_desc).not.toContain("defines every color relationship");
    expect(en.theory_dice_desc).toContain("standard die whose opposite face labels sum to 7");
    expect(en.theory_dice_desc2).toContain("identity alone does not determine an arbitrary cube layout");
    expect(en.theory_cube_desc).toContain("schematic layout");
    expect(en.theory_cube_desc2).toContain("not a body-diagonal geometric projection");
    expect(en.theory_cube_desc2).toContain("not an equivalence between physical additive and subtractive mixing");
    expect(en.theory_fano_primary).toBe("Basis XOR");

    expect(ja.theory_xor_desc).toContain("全関係を定義するものではありません");
    expect(ja.theory_xor_desc).not.toContain("全ての色の関係を定義");
    expect(ja.theory_dice_desc).toContain("対面ラベルの和が7になる標準サイコロ");
    expect(ja.theory_dice_desc2).toContain("恒等式だけでは任意の立方体配置の対面性は決まりません");
    expect(ja.theory_cube_desc).toContain("模式配置");
    expect(ja.theory_cube_desc2).toContain("体対角線方向の幾何投影ではありません");
    expect(ja.theory_cube_desc2).toContain("物理的な加法混色と減法混色の等価性ではありません");
    expect(ja.theory_fano_primary).toBe("基底XOR");
  });

  it("distinguishes overview levels and the Map sRGB adapter from perceptual brightness", () => {
    expect(en.about_body_1.toLowerCase()).not.toContain("brightness");
    expect(en.about_body_1).toContain("GRB tone labels");
    expect(en.map_map_colorTone).toBe("GRB Code Score");
    expect(en.music_octa_title).toBe("XOR Relation");
    expect(en.music_octa_first_select).toContain("XOR operand");
    expect(en.music_octa_play).toBe("▶ XOR Relation");
    expect(en.music_octa_stop).toBe("⏹ XOR Relation");

    expect(ja.about_body_1).not.toContain("明るさ");
    expect(ja.about_body_1).toContain("GRBトーンラベル");
    expect(ja.map_map_colorTone).toBe("GRBコードスコア");
    expect(ja.music_octa_title).toBe("XOR関係");
    expect(ja.music_octa_first_select).toContain("オペランド");
    expect(ja.music_octa_play).toBe("▶ XOR関係");
    expect(ja.music_octa_stop).toBe("⏹ XOR関係");
  });

  it("keeps reviewed color labels stable where abbreviation changes would alter meaning", () => {
    expect(en.theory_intro).toContain("encoded as the 3-bit vector `[G,R,B]`");
    expect(ja.theory_intro).toContain("3ビットベクトル `[G,R,B]` として符号化します");
    expect(en.theory_tetra_desc).toContain("T0 (even weight: K, M, C, Y)");
    expect(en.theory_tetra_desc).not.toContain("T0 (even weight: Black, M, C, Y)");
    expect(en.theory_dice_tetra_subgroup).toContain("T0 = {K, M, C, Y}");
    expect(ja.theory_tetra_desc).toContain("T0（偶数重み：K, M, C, Y）");
    expect(ja.theory_hamming_desc2).toContain("Blue=1");
    expect(ja.theory_hamming_desc2).not.toContain("青(1)");
  });
});
