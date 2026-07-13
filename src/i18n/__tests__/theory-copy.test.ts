import { describe, expect, it } from "vitest";
import { en } from "../en";
import { ja } from "../ja";

describe("theory copy high-risk claims", () => {
  it("defines the Venn characteristic function by channel membership", () => {
    expect(en.theory_venn_desc).toContain("characteristic function χ_S");
    expect(en.theory_venn_desc).toContain("A = GF(2)³ denotes the full eight-label layer");
    expect(en.theory_venn_desc).toContain("common starting point");
    expect(ja.theory_venn_desc).toContain("特性関数 χ_S(x)");
    expect(ja.theory_venn_desc).toContain("チャンネルxがSに属せば1");
    expect(ja.theory_venn_desc).toContain("A = GF(2)³は8ラベル全体");
    expect(ja.theory_venn_desc).toContain("共通する出発点");
  });

  it("keeps Boolean-color identities scoped to the cases where they are true", () => {
    expect(en.theory_dice_footer_demorgan).toMatch(/disjoint colors/i);
    expect(en.theory_dice_footer_demorgan).toContain("a ∧ b = 0");
    expect(en.theory_conn_boolean_hook).toContain("a⊕b=a∨b");
    expect(en.theory_dice_footer_subtractive).toContain("a ∨ b = 7");
    expect(en.theory_dice_footer_subtractive).toContain("a + b - 7 = a ∧ b");
    expect(en.theory_xor_desc).toContain("a + b = (a ⊕ b) + 2(a ∧ b)");
    expect(en.theory_xor_desc).toContain("Boolean lattice and integer levels");
    expect(en.theory_xor_desc.toLowerCase()).not.toContain("carry correction");

    expect(ja.theory_conn_boolean_hook).toContain("重なりのない2色");
    expect(ja.theory_xor_desc).toContain("ブール束と整数level");
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
    expect(en.theory_conn_cube_geometry_hook).toContain("even-parity tetrahedron");
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
    expect(ja.theory_conn_cube_geometry_hook).toContain("偶数パリティ四面体");
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
    expect(en.theory_zigzag_desc).toContain("L0 and L7 are the endpoints of the K-W axis");
    expect(en.theory_zigzag_desc).not.toContain("each vertex tone value");
    expect(en.theory_binary_desc).not.toContain("consequence of human color vision");
    expect(en.theory_binary_desc).not.toContain("BT.601");
    expect(en.theory_binary_desc.toLowerCase()).not.toContain("luma");
    expect(en.theory_binary_desc.toLowerCase()).not.toContain("brightness");
    expect(en.theory_binary_desc).toContain("positive integer valuation");
    expect(en.theory_binary_desc).toContain("minimal solution");
    expect(en.theory_binary_desc).toContain("seven nonempty subset sums");
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
    expect(ja.theory_zigzag_desc).toContain("λのファイバー");
    expect(ja.theory_zigzag_desc).not.toContain("各頂点トーン値");
    expect(ja.theory_binary_desc).not.toContain("人間の色覚の帰結です");
    expect(ja.theory_binary_desc).not.toContain("BT.601");
    expect(ja.theory_binary_desc.toLowerCase()).not.toContain("luma");
    expect(ja.theory_binary_desc).not.toContain("明るさ");
    expect(ja.theory_binary_desc).not.toContain("輝度");
    expect(ja.theory_binary_desc).toContain("正整数評価");
    expect(ja.theory_binary_desc).toContain("最小解");
    expect(ja.theory_binary_desc).toContain("7つの非空部分和");
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
    expect(en.theory_conn_limit_tone).toContain("not derived by feeding perceptual lightness");
    expect(en.theory_conn_limit_operations).toContain("not physical additive mixing of light");
    expect(en.theory_conn_limit_operations).toContain("XOR is vector addition on A");
    expect(en.theory_conn_limit_operations).toContain("AND is meet in the Boolean lattice");
    expect(en.theory_conn_boundary).toContain("eight subset sums of positive integer weights fill 0..7 consecutively");
    expect(en.theory_conn_boundary).toContain("rooted, oriented hue cycle");
    expect(en.theory_conn_limit_spaces).toContain("OKLab/OKLCH");
    expect(en.theory_conn_limit_novelty).toContain("no novelty is claimed");

    expect(ja.theory_conn_limit_vertices).toContain("8つの二値RGB頂点");
    expect(ja.theory_conn_limit_tone).toContain("知覚的明度");
    expect(ja.theory_conn_limit_tone).toContain("入力として導いた量ではありません");
    expect(ja.theory_conn_limit_operations).toContain("光の加法混色や顔料の減法混色そのものではありません");
    expect(ja.theory_conn_limit_operations).toContain("XORはA上のベクトル加法");
    expect(ja.theory_conn_limit_operations).toContain("ANDはブール束のmeet");
    expect(ja.theory_conn_boundary).toContain("正の整数重みの8部分和が0..7を重複なく連続して埋める");
    expect(ja.theory_conn_boundary).toContain("根付き・向き付き色相巡回");
    expect(ja.theory_conn_limit_spaces).toContain("OKLab/OKLCH");
    expect(ja.theory_conn_limit_novelty).toContain("新規性は主張しません");
  });

  it("separates algebraic labels from pure-hue-loop display representatives", () => {
    expect(en.theory_intro).toContain("algebraic layer A = GF(2)³");
    expect(en.theory_intro).toContain("Let H be");
    expect(en.theory_intro).toContain("maximum-saturation hue loop");
    expect(en.theory_intro).toContain("hereafter, the pure-hue loop");
    expect(en.theory_intro).toContain("displayed representatives");
    expect(en.theory_conn_limit_vertices).toContain("not additional algebraic elements");
    expect(en.theory_zigzag_desc).toContain("λ(G,R,B)=4G+2R+B");
    expect(en.theory_conn_limit_vertices).toContain("pure-hue loop H");

    expect(ja.theory_intro).toContain("代数層 A = GF(2)³");
    expect(ja.theory_intro).toContain("最大彩度色相環を H");
    expect(ja.theory_intro).toContain("以下、純色相環と呼びます");
    expect(ja.theory_intro).toContain("表示代表元");
    expect(ja.theory_conn_limit_vertices).toContain("代数元の追加ではありません");
    expect(ja.theory_zigzag_desc).toContain("λ(G,R,B)=4G+2R+B");
    expect(ja.theory_conn_limit_vertices).toContain("純色相環 H 上の中間候補");
    expect(ja.theory_conn_limit_vertices).toContain("別の座標層");
  });

  it("derives the continuous hue loop and its radian pitch bridge", () => {
    expect(en.theory_continuous_desc).toContain("cᵢ(t)=(1−t)vᵢ+tvᵢ₊₁");
    expect(en.theory_continuous_desc).toContain("max(G,R,B)−min(G,R,B)=1");
    expect(en.theory_continuous_desc).toContain("L=2+4t");
    expect(en.theory_continuous_desc).toContain("L=6−2t");
    expect(en.theory_continuous_desc).toContain("ℝ/2πℤ≅S¹");
    expect(en.theory_continuous_desc).toContain("p=θ/π mod 2");
    expect(en.theory_continuous_desc).toContain("f(θ̃)=f₀·2^(θ̃/π)");
    expect(en.theory_continuous_desc).toContain("π/12 (15°)");
    expect(en.theory_continuous_desc).not.toContain("six secondary vertices");

    expect(ja.theory_continuous_desc).toContain("六つの有彩頂点（うち三つが二次色）");
    expect(ja.theory_continuous_desc).toContain("θ↦θ+π");
    expect(ja.theory_continuous_desc).toContain("2オクターブを法とするp=θ/π mod 2");
    expect(ja.theory_continuous_desc).toContain("最小角π/12（15°）");
    expect(ja.theory_continuous_desc).not.toContain("六つの二次頂点");
  });

  it("keeps the main narrative positive and moves caveats to the final scope", () => {
    expect(en.theory_xor_desc).toContain("different readings of one three-bit coordinate system");
    expect(en.theory_xor_desc).not.toContain("defines every color relationship");
    expect(en.theory_dice_desc).toContain("standard die whose opposite face labels sum to 7");
    expect(en.theory_dice_desc2).toContain("visible opposite-face arrangement");
    expect(en.theory_cube_desc).not.toContain("schematic layout");
    expect(en.theory_cube_desc2).not.toContain("not a body-diagonal geometric projection");
    expect(en.theory_cube_desc2).not.toContain("physical additive and subtractive mixing");
    expect(en.theory_conn_boundary).toContain("schematic renderings");
    expect(en.theory_conn_limit_operations).toContain("standard face-label convention");
    expect(en.theory_fano_primary).toBe("Basis XOR");

    expect(ja.theory_xor_desc).toContain("一つの3ビット座標系の異なる読み方として現れます");
    expect(ja.theory_xor_desc).not.toContain("全ての色の関係を定義");
    expect(ja.theory_dice_desc).toContain("対面ラベルの和が7になる標準サイコロ");
    expect(ja.theory_dice_desc2).toContain("幾何的な対面配置として可視化");
    expect(ja.theory_cube_desc).not.toContain("模式配置");
    expect(ja.theory_cube_desc2).not.toContain("体対角線方向の幾何投影ではありません");
    expect(ja.theory_cube_desc2).not.toContain("物理的な加法混色と減法混色の等価性ではありません");
    expect(ja.theory_conn_boundary).toContain("模式図");
    expect(ja.theory_conn_limit_operations).toContain("標準面ラベル規約");
    expect(ja.theory_fano_primary).toBe("基底XOR");
  });

  it("keeps the overview accessible while preserving the Map and Music terminology", () => {
    expect(en.about_body_1.toLowerCase()).toContain("brightness");
    expect(en.about_body_1).toContain("primary colors of light");
    expect(en.about_body_1).toContain("primary colors of pigment");
    expect(en.map_map_colorTone).toBe("GRB Code Score");
    expect(en.music_octa_title).toBe("XOR Relation");
    expect(en.music_octa_first_select).toContain("XOR operand");
    expect(en.music_octa_play).toBe("▶ XOR Relation");
    expect(en.music_octa_stop).toBe("⏹ XOR Relation");

    expect(ja.about_body_1).toContain("明るさ");
    expect(ja.about_body_1).toContain("光の三原色");
    expect(ja.about_body_1).toContain("色の三原色");
    expect(ja.map_map_colorTone).toBe("GRBコードスコア");
    expect(ja.music_octa_title).toBe("XOR関係");
    expect(ja.music_octa_first_select).toContain("オペランド");
    expect(ja.music_octa_play).toBe("▶ XOR関係");
    expect(ja.music_octa_stop).toBe("⏹ XOR関係");
  });

  it("keeps reviewed color labels stable where abbreviation changes would alter meaning", () => {
    expect(en.theory_intro).toContain("encoded as 3-bit vectors `[G,R,B]`");
    expect(ja.theory_intro).toContain("3ビットベクトル `[G,R,B]` として符号化します");
    expect(en.theory_tetra_desc).toContain("T0 (even weight: K, M, C, Y)");
    expect(en.theory_tetra_desc).not.toContain("T0 (even weight: Black, M, C, Y)");
    expect(en.theory_dice_tetra_subgroup).toContain("T0 = {K, M, C, Y}");
    expect(ja.theory_tetra_desc).toContain("T0（偶数重み：K, M, C, Y）");
    expect(ja.theory_hamming_desc2).toContain("Blue=1");
    expect(ja.theory_hamming_desc2).not.toContain("青(1)");
  });
});
