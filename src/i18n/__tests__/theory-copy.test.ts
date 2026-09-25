import { describe, expect, it } from "vitest";
import { en } from "../en";
import { ja } from "../ja";

describe("Theory copy", () => {
  it("states the exact structures carried by the same eight-state set", () => {
    for (const copy of [en, ja]) {
      expect(copy.theory_generation_title).not.toMatch(/Boolean|ブール/);
      expect(copy.theory_states_desc).toContain("A=𝒫(E)");
      expect(copy.theory_states_desc).not.toMatch(/Boolean|ブール|⊕|reduct/);
      expect(copy.theory_venn_desc).toContain("(g,r,b)∈{0,1}³");
      expect(copy.theory_venn_desc).toContain("2³=8");
      expect(copy.theory_derivation_count_note).not.toMatch(/Boolean|ブール|⊕/);
      for (const complement of ["¬G=M", "¬R=C", "¬B=Y"]) {
        expect(copy.theory_complement_desc).toContain(complement);
      }
      expect(copy.theory_mixing_desc).toContain("¬(∨ᵢaᵢ)=∧ᵢ¬aᵢ");
      expect(copy.theory_generation_desc).not.toMatch(/Boolean|atoms|ブール|原子|XOR|⊕/);
    }
    expect(en.theory_venn_desc).toContain("no numerical weights have been assigned");
    expect(ja.theory_venn_desc).toContain("数値の重みはまだ与えていません");
    expect(en.theory_venn_title).toBe("Venn Diagram");
    expect(ja.theory_venn_title).toBe("ベン図");
    expect(en.theory_venn_desc).toContain("Each region of the Venn diagram represents one combination of present and absent primaries.");
    expect(en.theory_venn_desc).toContain("Inside a circle means that primary is present; outside means it is absent.");
    expect(ja.theory_venn_desc).toContain("ベン図の各領域は、原色の有無の一つの組合せを表します。");
    expect(ja.theory_venn_desc).toContain("円の内側はその原色を含むこと、外側は含まないことを表します。");
    expect(en.theory_algebra_definition).toContain("A=𝒫(E)");
    expect(en.theory_algebra_definition).toContain("S∨T=S∪T");
    expect(en.theory_mixing_operations_desc).toContain("S⊕T=S△T");
    expect(en.theory_algebra_structures).toContain("reduct (A,⊕)");
    expect(en.theory_algebra_structures).toContain("(𝔽₂³,+)");
    expect(en.theory_algebra_structures).toContain("(A,⊕,∧)≅𝔽₂×𝔽₂×𝔽₂");
    expect(en.theory_algebra_structures).toContain("not the field GF(8)");
    expect(en.theory_algebra_structures).toContain("e_c∧e_d=K");

    expect(ja.theory_algebra_definition).toContain("A=𝒫(E)");
    expect(ja.theory_algebra_definition).toContain("S∨T=S∪T");
    expect(ja.theory_mixing_operations_desc).toContain("S⊕T=S△T");
    expect(ja.theory_algebra_structures).toContain("reduct (A,⊕)");
    expect(ja.theory_algebra_structures).toContain("(𝔽₂³,+)");
    expect(ja.theory_algebra_structures).toContain("(A,⊕,∧) はブール環 𝔽₂×𝔽₂×𝔽₂");
    expect(ja.theory_algebra_structures).toContain("体 GF(8) ではありません");
    expect(ja.theory_algebra_structures).toContain("e_c∧e_d=K");
  });

  it("derives ranks from the score order before characterizing their unique subset-sum weights", () => {
    for (const copy of [en, ja]) {
      for (const comparison of ["K < B", "B < R", "M < G"]) {
        expect(copy.theory_empirical_order_intro.replace(/\u00a0/g, " ")).toContain(comparison);
      }
      expect(copy.theory_empirical_desc).toContain("E={G,R,B}");
      expect(copy.theory_empirical_desc).toContain("𝒫(E)");
      expect(copy.theory_binary_tone_formula).toContain("T = (4G + 2R + B) / 7 = level / 7");
      expect(copy.theory_binary_tone_complement).toContain("Tₖ + T₇₋ₖ = 1");
      const theoryCopy = Object.entries(copy)
        .filter(([key]) => key.startsWith("theory_") && !key.startsWith("theory_binary_") && key !== "theory_zigzag_complement_desc")
        .map(([, value]) => value)
        .join(" ");
      expect(theoryCopy).not.toMatch(/T=L\/7|T\(h|正規化|normaliz/i);
      expect(copy.theory_derivation_count_note).toContain("|S|=g+r+b");
      expect(copy.theory_derivation_count_note).toContain("L=4g+2r+b");
      expect(`${copy.theory_intro} ${copy.theory_empirical_desc} ${copy.theory_conn_order}`).not.toMatch(
        /two independent|two-path|converg|二経路|二つの独立|合流/i,
      );
    }
    expect(en.theory_empirical_desc).toContain("Three conditions on an additive score define a total order");
    expect(en.theory_empirical_desc).toContain("ranks 0–7");
    expect(en.theory_derivation_rank_definition).toContain("zero-based rank L");
    expect(en.theory_derivation_named_ranks_note).toContain("ranks of the primaries themselves");
    expect(en.theory_order_proof).toContain("necessary and sufficient");
    expect(en.theory_derivation_weights_intro).toContain("three positive weights in ascending order");
    expect(en.theory_derivation_weights_intro).toContain("0–7 without repetition or gaps");
    expect(en.theory_derivation_weights_intro).toContain("positive integers");
    expect(en.theory_derivation_weight_one).toContain("the first weight is 1");
    expect(en.theory_derivation_weight_two).toContain("The next weight must therefore be 2");
    expect(en.theory_derivation_weight_four).toContain("The final weight must therefore be 4");
    expect(en.theory_derivation_rank_note).toContain("weights whose eight subset sums reproduce 0–7 must be 1,2,4, up to permutation");
    expect(en.theory_derivation_bits_note).toContain("three bits (g,r,b)");
    expect(en.theory_derivation_bits_note).toContain("primary numbers 4,2,1 of G,R,B become the respective bit weights");
    expect(en.theory_derivation_bits_note).toContain("reproduces the rank of every one of the eight states");
    expect(en.theory_derivation_supplement).toContain("original score σ are not fixed at 1,2,4");
    expect(en.theory_derivation_subset_order).toContain("score σ");
    expect(en.theory_derivation_subset_note).toContain("Color names label the subsets");
    expect(en.theory_derivation_subset_note).toContain("not set inclusion");
    expect(ja.theory_empirical_desc).toContain("加法的スコアの三条件によって全順序を定めます");
    expect(ja.theory_empirical_desc).toContain("八状態に0〜7の順位");
    expect(ja.theory_derivation_rank_definition).toContain("0始まりの順位 L");
    expect(ja.theory_derivation_named_ranks_note).toContain("原色そのものの順位");
    expect(ja.theory_order_proof).toContain("必要十分条件");
    expect(ja.theory_derivation_weights_intro).toContain("三つの正の重みを小さい順");
    expect(ja.theory_derivation_weights_intro).toContain("0〜7を重複も隙間もなく再現");
    expect(ja.theory_derivation_weights_intro).toContain("正の整数");
    expect(ja.theory_derivation_weight_one).toContain("最初の重みは1");
    expect(ja.theory_derivation_weight_two).toContain("次の重みは2に定まります");
    expect(ja.theory_derivation_weight_four).toContain("最後の重みは4に定まります");
    expect(ja.theory_derivation_rank_note).toContain("重みは、順序を除いて1・2・4に限られます");
    expect(ja.theory_derivation_bits_note).toContain("3ビット (g,r,b)");
    expect(ja.theory_derivation_bits_note).toContain("G・R・B の原色番号4・2・1が、そのまま各ビットの重みになります");
    expect(ja.theory_derivation_bits_note).toContain("八状態すべての順位を再現");
    expect(ja.theory_derivation_supplement).toContain("元のスコア σ の実数重みが1・2・4に決まるわけではありません");
    expect(ja.theory_derivation_subset_order).toContain("スコアσ");
    expect(ja.theory_derivation_subset_note).toContain("色名は各部分集合のラベル");
    expect(ja.theory_derivation_subset_note).toContain("集合の包含関係");
  });

  it("explains rank correction and connects complement to the later toggle action", () => {
    expect(en.theory_derivation_monotonicity_note).toContain("L(a)<L(b)");
    expect(en.theory_valuation_xor_note).toContain("For any two colors a and b");
    expect(en.theory_valuation_xor_note).toContain("once for OR and twice for XOR");
    expect(en.theory_action_desc).toContain("κ=τ_W");
    expect(en.theory_action_desc).toContain("κ(a)=¬a=a⊕W");
    expect(en.theory_action_desc).toContain("L(¬a)=7−L(a)");
    expect(en.theory_valuation_complement_note).toContain("their ranks also sum to 7");
    expect(ja.theory_derivation_monotonicity_note).toContain("L(a)<L(b)");
    expect(ja.theory_valuation_xor_note).toContain("任意の二色a,b");
    expect(ja.theory_valuation_xor_note).toContain("ORでは一度、XORでは二度");
    expect(ja.theory_action_desc).toContain("κ=τ_W");
    expect(ja.theory_action_desc).toContain("κ(a)=¬a=a⊕W");
    expect(ja.theory_action_desc).toContain("L(¬a)=7−L(a)");
    expect(ja.theory_valuation_complement_note).toContain("順位の和も7");
  });

  it("states the exact Fano-Hamming incidence correspondence", () => {
    expect(en.theory_structures_desc).toContain("not merely a shared count of seven");
    expect(en.theory_hamming_bridge).toContain("Hxᵀ=h_i⊕h_j⊕h_k");
    expect(en.theory_hamming_bridge).toContain("rank H=3");
    expect(en.theory_hamming_bridge).toContain("dim ker H=7−3=4");
    expect(en.theory_hamming_bridge).toContain("minimum distance d_min=3");
    expect(en.theory_hamming_title).toBe("Hamming [7,4,3] Code");
    expect(en.theory_hamming_desc).toContain("adds three parity bits to four data bits, producing a seven-bit codeword");
    expect(en.theory_hamming_desc).toContain("length 7, dimension 4, and minimum Hamming distance 3");
    expect(en.theory_hamming_desc).toContain("syndrome 000");
    expect(en.theory_hamming_desc).toContain("single-error positions");

    expect(ja.theory_structures_desc).toContain("七という個数の一致ではなく");
    expect(ja.theory_hamming_bridge).toContain("Hxᵀ=h_i⊕h_j⊕h_k");
    expect(ja.theory_hamming_bridge).toContain("rank H=3");
    expect(ja.theory_hamming_bridge).toContain("dim ker H=7−3=4");
    expect(ja.theory_hamming_bridge).toContain("最小距離d_min=3");
    expect(ja.theory_hamming_title).toBe("Hamming [7,4,3] 符号");
    expect(ja.theory_hamming_desc).toContain("4ビットのデータに3つのパリティビットを加え、7ビットの符号語へ変換");
    expect(ja.theory_hamming_desc).toContain("符号長、4は次元、3は符号語間の最小Hamming距離");
    expect(ja.theory_hamming_desc).toContain("syndromeは000");
    expect(ja.theory_hamming_desc).toContain("単一誤り位置");
  });

  it("names a codeword-shaped error pattern as undetected, never as a flip at position 0", () => {
    expect(en.theory_hamming_operation_correction_undetected).toContain("j=0 → Keep RECEIVED unchanged");
    expect(en.theory_hamming_status_undetected).toContain("itself a codeword");
    expect(en.theory_hamming_status_undetected).toContain("s=Heᵀ=000");
    expect(en.theory_hamming_status_undetected).toContain("cannot detect");
    expect(ja.theory_hamming_operation_correction_undetected).toContain("j=0 → 反転しない");
    expect(ja.theory_hamming_status_undetected).toContain("それ自体符号語");
    expect(ja.theory_hamming_status_undetected).toContain("s=Heᵀ=000");
    expect(ja.theory_hamming_status_undetected).toContain("検出できません");
    for (const copy of [en, ja]) {
      expect(copy.theory_hamming_operation_correction_undetected).not.toMatch(/position 0|位置0/);
      expect(copy.theory_hamming_status_undetected).not.toMatch(/position 0|位置0/);
    }
  });

  it("keeps the conditional operation identities in the dedicated mixing explanation", () => {
    for (const copy of [en, ja]) {
      const text = copy.theory_mixing_operations_desc;
      expect(copy.theory_hamming_weight_desc).toContain("wt(g,r,b)=g+r+b=|S|");
      expect(copy.theory_parity_desc).toContain("π=wt mod 2=g⊕r⊕b");
      expect(text).not.toContain("Hamming");
      for (const formula of ["[G,R,B]", "a∧b=000", "a∨b=a⊕b", "a∨b=111", "a∧b=XNOR(a,b)", "XNOR(a,b)=¬(a⊕b)"]) {
        expect(text).toContain(formula);
      }
    }
  });

  it("distinguishes the chosen cube model from the hue-order and complement correspondences", () => {
    expect(en.theory_dice_net_desc).toContain("cube is a chosen model");
    expect(en.theory_dice_net_desc).toContain("preserving the five connections");
    expect(en.theory_dice_net_desc).toContain("without overlapping squares");
    expect(ja.theory_dice_net_desc).toContain("選んだモデル");
    expect(ja.theory_dice_net_desc).toContain("五つの接続を保って");
    expect(ja.theory_dice_net_desc).toContain("正方形を重ねずに");
    for (const copy of [en, ja]) {
      expect(copy.theory_dice_net_desc).not.toContain("ΔL");
      for (const formula of ["L(κ(c))=7−L(c)", "L(c)+L(κ(c))=7"]) {
        expect(copy.theory_dice_desc2).toContain(formula);
      }
    }
    expect(en.theory_dice_desc2).toContain("standard die numbering");
    expect(ja.theory_dice_desc2).toContain("標準ダイス番号");
  });

  it("states the Tone Zigzag as the affine extension of the chromatic six-cycle", () => {
    const englishZigzag = [
      en.theory_zigzag_desc,
      en.theory_zigzag_intersections_desc,
      en.theory_zigzag_fibers_desc,
      en.theory_zigzag_complement_desc,
    ].join(" ");
    const japaneseZigzag = [
      ja.theory_zigzag_desc,
      ja.theory_zigzag_intersections_desc,
      ja.theory_zigzag_fibers_desc,
      ja.theory_zigzag_complement_desc,
    ].join(" ");
    for (const copy of [en, ja]) {
      expect(copy.theory_zigzag_intersections_desc).toContain("0≤u<1");
      expect(copy.theory_zigzag_intersections_desc).toContain("Σᵢ|ΔLᵢ|=2(1+2+4)=14");
      expect(copy.theory_action_distance_desc).toContain("(1−2x_c)L({c})");
      expect(copy.theory_action_distance_desc).not.toContain("±w_c");
    }
    expect(englishZigzag).toContain("ι:A→{0,1}³⊂ℝ³");
    expect(englishZigzag).toContain("γᵢ(u)=(1−u)ι(cᵢ)+uι(cᵢ₊₁)");
    expect(englishZigzag).toContain("λ(γᵢ(u))=(1−u)L(cᵢ)+uL(cᵢ₊₁)");
    expect(englishZigzag).toContain("κ̄(x)=1−x");
    expect(englishZigzag).toContain("T(h)=λ(γ(h))/7");
    expect(englishZigzag).toContain("T(h+1/2)=1−T(h)");
    expect(englishZigzag).toContain("T=1/2 (level 7/2)");
    expect(englishZigzag).toContain("1,3,3,3,3,1");
    expect(englishZigzag).toContain("N(7−ℓ)=N(ℓ)");
    expect(englishZigzag).toContain("four preimages");
    expect(englishZigzag).toContain("|ΔLᵢ|=|L(cᵢ₊₁)−L(cᵢ)|=L(cᵢ⊕cᵢ₊₁)∈{4,2,1}");
    expect(englishZigzag).toContain("ΣᵢΔLᵢ=0");
    expect(englishZigzag).toContain("The sign gives the direction of inclusion");
    expect(englishZigzag).toContain("weight of the toggled primary");

    expect(japaneseZigzag).toContain("ι:A→{0,1}³⊂ℝ³");
    expect(japaneseZigzag).toContain("γᵢ(u)=(1−u)ι(cᵢ)+uι(cᵢ₊₁)");
    expect(japaneseZigzag).toContain("λ(γᵢ(u))=(1−u)L(cᵢ)+uL(cᵢ₊₁)");
    expect(japaneseZigzag).toContain("κ̄(x)=1−x");
    expect(japaneseZigzag).toContain("T(h)=λ(γ(h))/7");
    expect(japaneseZigzag).toContain("T(h+1/2)=1−T(h)");
    expect(japaneseZigzag).toContain("T=1/2（level 7/2）");
    expect(japaneseZigzag).toContain("1,3,3,3,3,1");
    expect(japaneseZigzag).toContain("N(7−ℓ)=N(ℓ)");
    expect(japaneseZigzag).toContain("交点数が4");
    expect(japaneseZigzag).toContain("|ΔLᵢ|=|L(cᵢ₊₁)−L(cᵢ)|=L(cᵢ⊕cᵢ₊₁)∈{4,2,1}");
    expect(japaneseZigzag).toContain("ΣᵢΔLᵢ=0");
    expect(japaneseZigzag).toContain("符号は包含の向き");
    expect(japaneseZigzag).toContain("絶対値は反転する原色の重み");
  });

  it("states the subgroup, coset, and dual-octahedron structures exactly", () => {
    expect(en.theory_stella_desc).toContain("T0=ker π={K,M,C,Y}");
    expect(en.theory_stella_desc).toContain("Klein four-group V₄");
    expect(en.theory_stella_desc).toContain("T1={x∈A | π(x)=1}={B,R,G,W}");
    expect(en.theory_stella_desc).toContain("unique nontrivial coset");
    expect(en.theory_stella_desc).toContain("T1=t⊕T0 for every t∈T1");
    expect(en.theory_stella_desc).toContain("Their compound in the same cube arrangement is called the Color Star (Stella Octangula)");
    expect(en.theory_stella_toggle_desc).toContain("preserve parity and move within the same tetrahedron");
    expect(en.theory_stella_toggle_desc).toContain("¬T0=T1");
    expect(en.theory_stella_toggle_desc).toContain("¬T1=T0");
    expect(en.theory_chromatic_octa_desc).toContain("six distance-1 edges");
    expect(en.theory_chromatic_octa_desc).toContain("six distance-2 edges");
    expect(en.theory_chromatic_octa_desc).toContain("do not represent bit-distance values");
    expect(en.theory_octa_fano_note).toContain("switching the XOR between 000 and 111");
    expect(en.theory_octa_duality_note).toContain("each die face corresponds to a vertex");

    expect(ja.theory_stella_desc).toContain("T0=ker π={K,M,C,Y}");
    expect(ja.theory_stella_desc).toContain("クライン四群V₄");
    expect(ja.theory_stella_desc).toContain("T1={x∈A | π(x)=1}={B,R,G,W}");
    expect(ja.theory_stella_desc).toContain("剰余類");
    expect(ja.theory_stella_desc).toContain("任意のt∈T1に対してT1=t⊕T0");
    expect(ja.theory_stella_desc).toContain("同じ立方体配置で二つを重ねたものを、カラースター（星形八面体）と呼びます");
    expect(ja.theory_stella_toggle_desc).toContain("偶奇を保ち、同じテトラの中を移動");
    expect(ja.theory_stella_toggle_desc).toContain("¬T0=T1");
    expect(ja.theory_stella_toggle_desc).toContain("¬T1=T0");
    expect(ja.theory_chromatic_octa_desc).toContain("距離1の6辺");
    expect(ja.theory_chromatic_octa_desc).toContain("距離2の6辺");
    expect(ja.theory_chromatic_octa_desc).toContain("辺の長さは、ビット距離の値を表しません");
    expect(ja.theory_octa_fano_note).toContain("XORは000と111の間で切り替わります");
    expect(ja.theory_octa_duality_note).toContain("各面を頂点に対応させた双対");
  });

  it("ends with exact boundaries between A, H, rank, and operations", () => {
    expect(en.theory_conn_limit_vertices).toContain("A contains exactly the eight binary states");
    expect(en.theory_conn_limit_vertices).toContain("points of H∖ι(A) are not additional elements of A");
    expect(en.theory_conn_limit_tone).toContain("L(g,r,b)=4g+2r+b");
    expect(en.theory_conn_limit_tone).toContain("affine extension λ");
    expect(en.theory_conn_limit_operations).toContain("XOR composes toggles");
    expect(en.theory_conn_limit_operations).toContain("not extended as a continuous operation");
    expect(en.theory_conn_limit_operations).toContain("affine complement κ̄(x)=1−x");
    expect(en.theory_conn_limit_operations).toContain("OR=XOR holds exactly for disjoint supports");

    expect(ja.theory_conn_limit_vertices).toContain("八つの二値状態だけ");
    expect(ja.theory_conn_limit_vertices).toContain("H∖ι(A)の点はAへ追加された色状態ではありません");
    expect(ja.theory_conn_limit_tone).toContain("L(g,r,b)=4g+2r+b");
    expect(ja.theory_conn_limit_tone).toContain("アフィン延長λ");
    expect(ja.theory_conn_limit_operations).toContain("XORは反転を合成");
    expect(ja.theory_conn_limit_operations).toContain("連続演算として拡張しません");
    expect(ja.theory_conn_limit_operations).toContain("アフィン補色 κ̄(x)=1−x");
    expect(ja.theory_conn_limit_operations).toContain("支持が重ならない場合に限ります");
  });

  it("does not restore acoustic, standards, novelty, extended-code, or superseded component copy", () => {
    const removedKeys = [
      "theory_continuous_title",
      "theory_continuous_desc",
      "theory_conn_extended",
      "theory_conn_limit_spaces",
      "theory_conn_limit_novelty",
      "theory_octa_title",
      "theory_tetra_title",
      "theory_dice_tetra",
      "theory_dice_desc3",
      "theory_dice_hint",
      "theory_scope_desc",
      "theory_conn_boundary_title",
    ];
    for (const key of removedKeys) {
      expect(key in en).toBe(false);
      expect(key in ja).toBe(false);
    }

    const englishTheory = Object.entries(en)
      .filter(([key]) => key.startsWith("theory_"))
      .map(([, value]) => value)
      .join("\n");
    const japaneseTheory = Object.entries(ja)
      .filter(([key]) => key.startsWith("theory_"))
      .map(([, value]) => value)
      .join("\n");
    for (const excluded of ["OKLab", "[8,4,4]", "1981", "absolute frequency", "pitch map", "11 free cube nets"]) {
      expect(englishTheory).not.toContain(excluded);
    }
    for (const excluded of ["OKLab", "[8,4,4]", "1981年", "絶対周波数", "音高写像", "11種類"]) {
      expect(japaneseTheory).not.toContain(excluded);
    }
  });
});
