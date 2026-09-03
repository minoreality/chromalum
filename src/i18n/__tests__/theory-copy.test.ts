import { describe, expect, it } from "vitest";
import { en } from "../en";
import { ja } from "../ja";

describe("Theory copy", () => {
  it("states the exact structures carried by the same eight-state set", () => {
    expect(en.theory_intro).toContain("A=𝒫(E)");
    expect(en.theory_intro).toContain("S∨T=S∪T");
    expect(en.theory_intro).toContain("S⊕T=S△T");
    expect(en.theory_intro).toContain("reduct (A,⊕)");
    expect(en.theory_intro).toContain("(𝔽₂³,+)");
    expect(en.theory_intro).toContain("(A,⊕,∧)≅𝔽₂×𝔽₂×𝔽₂");
    expect(en.theory_intro).toContain("not the field GF(8)");
    expect(en.theory_intro).toContain("G∧R=K");

    expect(ja.theory_intro).toContain("A=𝒫(E)");
    expect(ja.theory_intro).toContain("S∨T=S∪T");
    expect(ja.theory_intro).toContain("S⊕T=S△T");
    expect(ja.theory_intro).toContain("reduct (A,⊕)");
    expect(ja.theory_intro).toContain("(𝔽₂³,+)");
    expect(ja.theory_intro).toContain("(A,⊕,∧) はブール環 𝔽₂×𝔽₂×𝔽₂");
    expect(ja.theory_intro).toContain("体 GF(8) ではありません");
    expect(ja.theory_intro).toContain("G∧R=K");
  });

  it("keeps mathematical weights and empirical color order as independent paths", () => {
    expect(en.theory_derivation_two_paths_note).toContain("unnamed gapless weights");
    expect(en.theory_derivation_two_paths_note).toContain("s(G)>s(M)=s(R)+s(B)");
    expect(en.theory_empirical_desc).toContain("w_G>w_R+w_B and w_R>w_B>0");
    expect(en.theory_empirical_desc).toContain("K<B<R<M<G<C<Y<W");
    expect(en.theory_empirical_desc).toContain("rank_s(c)=#{x∈A | s(x)<s(c)}");
    expect(en.theory_empirical_desc).toContain("{1,2,4}");
    expect(en.theory_empirical_desc).toContain("Producing 1 forces a=1");
    expect(en.theory_empirical_desc).toContain("forces b=2");
    expect(en.theory_empirical_desc).toContain("forces c=4");
    expect(en.theory_empirical_desc).toContain("Color order alone supplies the named rank");
    expect(en.theory_empirical_desc).toContain("Combining the paths does not create rank for the first time");
    expect(en.theory_empirical_note).toContain("M=R∨B, L(M)=L(R)+L(B)=3");
    expect(en.theory_empirical_note).toContain("W=G∨R∨B, L(W)=L(G)+L(R)+L(B)=7");
    expect(en.theory_empirical_note).not.toContain("M=R+B");

    expect(ja.theory_derivation_two_paths_note).toContain("無名の無隙間重み");
    expect(ja.theory_derivation_two_paths_note).toContain("s(G)>s(M)=s(R)+s(B)");
    expect(ja.theory_empirical_desc).toContain("w_G>w_R+w_B");
    expect(ja.theory_empirical_desc).toContain("K<B<R<M<G<C<Y<W");
    expect(ja.theory_empirical_desc).toContain("rank_s(c)=#{x∈A | s(x)<s(c)}");
    expect(ja.theory_empirical_desc).toContain("{1,2,4}");
    expect(ja.theory_empirical_desc).toContain("1を作るにはa=1");
    expect(ja.theory_empirical_desc).toContain("b=2");
    expect(ja.theory_empirical_desc).toContain("c=4");
    expect(ja.theory_empirical_desc).toContain("色の順序は単独で名前付き順位");
    expect(ja.theory_empirical_desc).toContain("順位を初めて作ることではなく");
    expect(ja.theory_empirical_note).toContain("M=R∨B, L(M)=L(R)+L(B)=3");
    expect(ja.theory_empirical_note).toContain("W=G∨R∨B, L(W)=L(G)+L(R)+L(B)=7");
    expect(ja.theory_empirical_note).not.toContain("M=R+B");
  });

  it("makes valuation, XOR correction, and complement mainline consequences", () => {
    expect(en.theory_valuation_desc).toContain("L(a∨b)+L(a∧b)=L(a)+L(b)");
    expect(en.theory_valuation_desc).toContain("L(a⊕b)=L(a)+L(b)−2L(a∧b)");
    expect(en.theory_valuation_desc).toContain("L(b)−L(a)=Σ_{c∈b∖a}w_c>0");
    expect(en.theory_valuation_desc).toContain("linear extension of Boolean inclusion");
    expect(en.theory_valuation_desc).toContain("Ω=Σ_{c∈E}w_c=7");
    expect(en.theory_valuation_desc).toContain("L(¬a)=Ω−L(a)=7−L(a)");
    expect(en.theory_valuation_xor_note).toContain("doubled intersection");
    expect(en.theory_valuation_xor_note).toContain("not a homomorphism");
    expect(en.theory_valuation_complement_note).toContain("K/W, B/Y, R/C, and M/G");

    expect(ja.theory_valuation_desc).toContain("L(a∨b)+L(a∧b)=L(a)+L(b)");
    expect(ja.theory_valuation_desc).toContain("L(a⊕b)=L(a)+L(b)−2L(a∧b)");
    expect(ja.theory_valuation_desc).toContain("L(b)−L(a)=Σ_{c∈b∖a}w_c>0");
    expect(ja.theory_valuation_desc).toContain("linear extension");
    expect(ja.theory_valuation_desc).toContain("Ω=Σ_{c∈E}w_c=7");
    expect(ja.theory_valuation_desc).toContain("L(¬a)=Ω−L(a)=7−L(a)");
    expect(ja.theory_valuation_xor_note).toContain("共通部分の二倍");
    expect(ja.theory_valuation_xor_note).toContain("群準同型ではありません");
    expect(ja.theory_valuation_complement_note).toContain("K/W、B/Y、R/C、M/G");
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

  it("constructs the die from the hue-order net before applying complement rank", () => {
    expect(en.theory_dice_net_desc).toContain("Cut the closing M–R edge");
    expect(en.theory_dice_net_desc).toContain("R→Y→G→C→B→M");
    expect(en.theory_dice_net_desc).toContain("ΔL=(+4,−2,+1,−4,+2,−1)");
    expect(en.theory_dice_net_desc).toContain("R⊂Y⊃G⊂C⊃B⊂M⊃R");
    expect(en.theory_dice_net_desc).toContain("G,R,B,G,R,B");
    expect(en.theory_dice_net_desc).toContain("sign-preserving square-lattice rule");
    expect(en.theory_dice_net_desc).toContain("sending positive steps upper right and negative steps lower right");
    expect(en.theory_dice_net_desc).toContain("every transition reads from left to right");
    expect(en.theory_dice_net_desc).toContain("same 2–2–2 net under planar rotation");
    expect(en.theory_dice_net_desc).toContain("The signs do not determine planar directions by themselves");
    expect(en.theory_dice_net_desc).toContain("starting construction");
    expect(en.theory_dice_net_desc).toContain("Folding along the five shared edges");
    expect(en.theory_dice_net_desc).toContain("R/C, Y/B, and G/M");
    expect(en.theory_dice_desc2).toContain("L(κ(c))=7−L(c)");
    expect(en.theory_dice_desc2).toContain("(R₂,C₅)");
    expect(en.theory_dice_desc2).toContain("(Y₆,B₁)");
    expect(en.theory_dice_desc2).toContain("(G₄,M₃)");
    expect(en.theory_dice_desc2).toContain("standard die numbering");
    expect(en.theory_dice_views_desc).toContain("eight vertices");
    expect(en.theory_dice_views_desc).toContain("remaining six");
    expect(en.theory_dice_footer_subtractive).toContain("a ∨ b = W");
    expect(en.theory_dice_footer_subtractive).toContain("L(a∧b)=L(a)+L(b)−7");
    expect(en.theory_dice_rgb_col).toBe("Disjoint RGB primaries: ∨=⊕");
    expect(en.theory_dice_cmy_col).toBe("CMY pairs covering all bits: ∧=XNOR");

    expect(ja.theory_dice_net_desc).toContain("M–R辺で切ると");
    expect(ja.theory_dice_net_desc).toContain("R→Y→G→C→B→M");
    expect(ja.theory_dice_net_desc).toContain("ΔL=(+4,−2,+1,−4,+2,−1)");
    expect(ja.theory_dice_net_desc).toContain("R⊂Y⊃G⊂C⊃B⊂M⊃R");
    expect(ja.theory_dice_net_desc).toContain("G,R,B,G,R,B");
    expect(ja.theory_dice_net_desc).toContain("符号保存の格子規則");
    expect(ja.theory_dice_net_desc).toContain("正差を右上、負差を右下");
    expect(ja.theory_dice_net_desc).toContain("全遷移を左から右へ");
    expect(ja.theory_dice_net_desc).toContain("同じ2–2–2展開図の平面回転");
    expect(ja.theory_dice_net_desc).toContain("符号だけが平面方向を決めるのではなく");
    expect(ja.theory_dice_net_desc).toContain("出発点");
    expect(ja.theory_dice_net_desc).toContain("五つの共有辺");
    expect(ja.theory_dice_net_desc).toContain("R/C、Y/B、G/M");
    expect(ja.theory_dice_desc2).toContain("L(κ(c))=7−L(c)");
    expect(ja.theory_dice_desc2).toContain("(R₂,C₅)");
    expect(ja.theory_dice_desc2).toContain("(Y₆,B₁)");
    expect(ja.theory_dice_desc2).toContain("(G₄,M₃)");
    expect(ja.theory_dice_desc2).toContain("標準ダイス番号");
    expect(ja.theory_dice_views_desc).toContain("八つの頂点");
    expect(ja.theory_dice_views_desc).toContain("残る六視点");
    expect(ja.theory_dice_footer_subtractive).toContain("a ∨ b = W");
    expect(ja.theory_dice_footer_subtractive).toContain("L(a∧b)=L(a)+L(b)−7");
    expect(ja.theory_dice_rgb_col).toBe("非重複RGB原色：∨=⊕");
    expect(ja.theory_dice_cmy_col).toBe("全ビットを覆うCMY対：∧=XNOR");
  });

  it("states the Tone Zigzag as the affine extension of the chromatic six-cycle", () => {
    expect(en.theory_zigzag_desc).toContain("ι:A→{0,1}³⊂ℝ³");
    expect(en.theory_zigzag_desc).toContain("γᵢ(u)=(1−u)ι(cᵢ)+uι(cᵢ₊₁)");
    expect(en.theory_zigzag_desc).toContain("λ(γᵢ(u))=(1−u)L(cᵢ)+uL(cᵢ₊₁)");
    expect(en.theory_zigzag_desc).toContain("κ̄(x)=1−x");
    expect(en.theory_zigzag_desc).toContain("T(h+1/2)=1−T(h)");
    expect(en.theory_zigzag_desc).toContain("1,3,3,3,3,1");
    expect(en.theory_zigzag_desc).toContain("23456545432123");
    expect(en.theory_zigzag_desc).toContain("four preimages");
    expect(en.theory_zigzag_desc).toContain("|ΔLᵢ|=|L(cᵢ₊₁)−L(cᵢ)|=L(cᵢ⊕cᵢ₊₁)∈{4,2,1}");
    expect(en.theory_zigzag_desc).toContain("(4,2,1,4,2,1)");
    expect(en.theory_zigzag_desc).toContain("The sign gives the direction of inclusion");
    expect(en.theory_zigzag_desc).toContain("absolute-value sequence");

    expect(ja.theory_zigzag_desc).toContain("ι:A→{0,1}³⊂ℝ³");
    expect(ja.theory_zigzag_desc).toContain("γᵢ(u)=(1−u)ι(cᵢ)+uι(cᵢ₊₁)");
    expect(ja.theory_zigzag_desc).toContain("λ(γᵢ(u))=(1−u)L(cᵢ)+uL(cᵢ₊₁)");
    expect(ja.theory_zigzag_desc).toContain("κ̄(x)=1−x");
    expect(ja.theory_zigzag_desc).toContain("T(h+1/2)=1−T(h)");
    expect(ja.theory_zigzag_desc).toContain("1,3,3,3,3,1");
    expect(ja.theory_zigzag_desc).toContain("23456545432123");
    expect(ja.theory_zigzag_desc).toContain("交点数が4");
    expect(ja.theory_zigzag_desc).toContain("|ΔLᵢ|=|L(cᵢ₊₁)−L(cᵢ)|=L(cᵢ⊕cᵢ₊₁)∈{4,2,1}");
    expect(ja.theory_zigzag_desc).toContain("(4,2,1,4,2,1)");
    expect(ja.theory_zigzag_desc).toContain("符号は包含の向き");
    expect(ja.theory_zigzag_desc).toContain("絶対値列");
  });

  it("states the subgroup, coset, and dual-octahedron structures exactly", () => {
    expect(en.theory_k8_desc).toContain("T0=ker π={K,M,C,Y}");
    expect(en.theory_k8_desc).toContain("Klein four-group V₄");
    expect(en.theory_k8_desc).toContain("T1=B⊕T0={B,R,G,W}");
    expect(en.theory_k8_desc).toContain("unique nontrivial coset");
    expect(en.theory_stella_annotation).toContain("Tet(T0) ∪ Tet(T1)");
    expect(en.theory_octa_dual_desc).toContain("K₂,₂,₂");
    expect(en.theory_octa_dual_desc).toContain("2³=8");
    expect(en.theory_octa_dual_desc).toContain("face-adjacency graph of the octahedron is Q₃");
    expect(en.theory_octa_dual_desc).toContain("also gives an affine octahedron");
    expect(en.theory_octa_dual_desc).toContain("edges have lengths 1 and √2");
    expect(en.theory_octa_dual_edge_edge).toContain("12 die edges");

    expect(ja.theory_k8_desc).toContain("T0=ker π={K,M,C,Y}");
    expect(ja.theory_k8_desc).toContain("クライン四群V₄");
    expect(ja.theory_k8_desc).toContain("T1=B⊕T0={B,R,G,W}");
    expect(ja.theory_k8_desc).toContain("剰余類");
    expect(ja.theory_stella_annotation).toContain("Tet(T0) ∪ Tet(T1)");
    expect(ja.theory_octa_dual_desc).toContain("K₂,₂,₂");
    expect(ja.theory_octa_dual_desc).toContain("2³=8");
    expect(ja.theory_octa_dual_desc).toContain("面隣接グラフはQ₃");
    expect(ja.theory_octa_dual_desc).toContain("同じ組合せ型のアフィン八面体");
    expect(ja.theory_octa_dual_desc).toContain("辺長が1と√2");
    expect(ja.theory_octa_dual_edge_edge).toContain("ダイスの12辺");
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
