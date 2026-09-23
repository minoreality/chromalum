# Theoryタブ — 重要先行研究と改善提案

著者: Doctor Chromaticus
初回調査：2026-04-19
整理方針：2026-04-29
再査読：2026-07-13
文書種別：living research/development note。先行研究整理と、Theory タブ
実装に関するステータス確認を同じ文脈で扱う。

## Related Notes

- 技術定義・定理・実装対応: [離散代数的色彩モデル](./algebraic-color-model.md)
- 先行研究・新規性評価: [離散代数的色彩モデル — 重要先行研究](./prior-art-algebraic-color-model.md)
- Music-Linked Visualization: [Music-Linked Visualization](./music-linked-visualization.md)

## Review Basis

先行研究の検索日、検索語群、確認資料、未調査領域は、上記の「離散代数的色彩モデル — 重要先行研究」にある [Search Record (2026-07-13)](./prior-art-algebraic-color-model.md#search-record-2026-07-13) を本稿でも採用する。本稿はその限定調査を Theory タブの構成へ写した living note であり、独立した網羅的新規性調査ではない。

## Executive Conclusion

Theory タブは、一般的な色彩科学の概説でも、研究ノートにある全派生結果の展示場所でもない。対象を二値 RGB の8状態

```text
A = P({G,R,B})
```

を有限代数の基礎対象とし、生成、順序、valuation、補色、反転作用、Hamming 距離、Fano/Hamming、有限幾何を一つの論脈で示す。その有限的本線を完結させた後に、`C6` と `L` の辺別延長による連続 Tone Zigzag、補色を対面へ置く Color Die、その色相順を保つ展開図、双対八面体を表示層として続ける。立方体による面配置はモデルの選択として明示する。

`A` は包含・join・meet・補元を持つ一つの Boolean 代数である。`(A,⊕)` は加法群・ベクトル空間 `(F2^3,+)` と同型であり、`(A,⊕,∧)` は直積 Boolean 環 `F2 x F2 x F2` と同型である。これを体 `GF(8)` と同一視しない。

純色相環 `H` 全体の派生理論のうち、Theory に置くのは、特性ベクトル埋め込み `iota:A->{0,1}^3`、六つの有彩辺のアフィン補間、`lambda(g,r,b)=4g+2r+b`、アフィン補色 `kappa_bar(x)=1-x` から直接得る Tone Zigzag、14整数交点、補色恒等式までとする。81 sections、等トーン作図、Fourier 解析、音響写像は研究ノート側に残す。外部規格係数、先行研究、新規性評価も Theory 本文には表示せず、この文書と専用ノートで管理する。

残すべき先行研究は、次の 6 系統に絞る。

1. Smith 1978: RGB cube / HSV / hue hexagon。
2. JSSD CMY color cube II: Boolean lattice / Hasse / RGB-CMY duality。
3. Taylor 2013: `Z2^3` color addition / Fano plane coloring。
4. NEC 1981 / Vickers 1982: `0=K, 1=B, 2=R, 3=M, 4=G, 5=C, 6=Y, 7=W` という正確な GRB 4:2:1 色番号。
5. Hamming 1950 / Fano/Hamming 標準資料: Hamming code の原典と `PG(2,2)` / Hamming `[7,4,3]` の既知対応。
6. MathWorld Cube / Tetrahedron 2-Compound: cube nets、tetrahedra、stella octangula。

正確な `4G+2R+B` 色番号も既知なので、番号列そのものは独自性に含めない。この記録は研究上の来歴を管理するためのものであり、Theory タブの説明へは持ち込まない。

## Current Theory Tab Map

| Chapter | Content | Role |
| --- | --- | --- |
| 生成 | `A=P({G,R,B})`, Venn, `Γ` | 三原子から `1+3+3+1` の8状態を生成する |
| 全順序からの順位導出 | 加法的スコアの三条件、8状態の全順序、原子の順位 | 前にある状態を数えて `B=1,R=2,G=4` を得る。無隙間部分和は帰結 |
| valuation と補色 | modular identity、XOR補正式、`L(¬a)=7-L(a)` | `L` が単なる番号表ではないことを示す |
| 反転作用 | `τ_m(x)=x⊕m`, `Q3`, 有彩 `C6`、符号付き順位差 | 生成と状態遷移を分け、差分の符号から包含方向、絶対値から切替チャネルを読む |
| 有限幾何と符号 | 七つの非零マスク、Fano、Hamming `[7,4,3]` demo | 七つの色ベクトルを `H` の列として読み、`ker H` と syndrome に同じ七点構造が現れることを示す |
| `K8` 距離分解 | 距離1・2・3による全28組の分割、T0/T1、Color Star | 距離2の二つのK4、二チャンネル反転による各組の保存、補色による二組の交換を示す |
| 幾何 | Tone Zigzag、色相辺差分表、Color Die、色相順の展開図、双対八面体 | 辺別アフィン延長、補色を対面へ置く立方体モデル、色相順を保つ平面展開、面頂双対を区別して示す |
| 総括と範囲 | 三つの境界、完全作用表は折り畳み | 本線を反復せず対象を限定する |

Theory はこの順序で有限代数を `K8` まで完結させ、その後に連続・立体表示へ進む。音響へは分岐しない。図は文章だけでは関係を把握しにくい場合に限り、色相辺差分表は小さなカードへ埋め込まず Tone Zigzag と同じ節の全幅表として置く。

面の演算については、カラーキューブの四点XOR、テトラの三点からの頂点復元、Hammingの三検査面、八面体と既存のFano・XORの短い対応説明を各節の本文に置く。テトラの本線は距離2と反転・補色の関係とする。図の後には面の三頂点のXORで残る頂点を復元する短い補足を置く。多数決と重心による双対対応は研究ノートに残し、面選択図・GRB表は本文から外す。八面体の八行の混色・XOR表は研究ノートへ置き、混色の操作は専用のGRB・YCMグラフで扱う。Theory の八面体では、有彩色にとどまるXORの入力組を辺として示す。辺の両側の第三頂点がXORとその補色になる規則を、辺選択で確認できるようにする。Fanoの四面による全12辺の被覆、色相六角形とGRB・CMY三角形、カラースターの共通部分を短く説明する。カラーキューブは反転・補色・包含関係を示し、カラーダイスは展開図と同じ節で色相順・順位・対面の関係を示す。14アフィン平面と拡張Hamming符号の詳細は[多面体の面と3ビット演算](./polyhedral-face-algebra.md)に記録する。

## Curated Prior-Art Map

| Layer | Keep | Known part | CHROMALUM synthesis candidate |
| --- | --- | --- | --- |
| RGB cube / hue hexagon | Smith 1978 | RGB cube、black-white axis、hue hexagon | hue path を Gray cycle、tone zigzag、dice adjacency と重ねる |
| Boolean lattice | JSSD CMY color cube II | `B3`、Hasse、補元、join/meet、RGB-CMY 双対 | `B3` を GRB Binary Tone 順、Fano/Hamming、dice に接続する |
| `Z2^3` color addition | Taylor 2013 | 8 色の XOR 群、Fano plane coloring | RGB display primaries、GRB Binary Tone、Hamming labels、K8 分解へ接続する |
| Fano/Hamming | Hamming 1950 / Lavrauw / Error Correction Zoo | Hamming code、Fano 平面と Hamming `[7,4,3]` の対応 | 七つの色ベクトルを `H` の列とし、Fano triples、`ker H`、syndrome / coordinate labels を一つの UI で結ぶ |
| GRB 4:2:1 color code | NEC 1981 / Vickers 1982 | `0=K,1=B,2=R,3=M,4=G,5=C,6=Y,7=W` と Green-Red-Blue bit order | 三条件から全順序と名前付き順位を導き、部分和の無隙間性を帰結として示す |
| Tone | historical color code / CHROMALUM model definition | `level = 4G + 2R + B` | 明るさ順位を表す level を `tone = level / 7` として正規化する |
| Pure-hue representatives | Smith 1978 / CHROMALUM model definition | RGB cube の最大彩度 6 辺、HSV 型では `S=V=1` の hue loop | `λ` の整数 level ファイバーを有限候補として示し、代数ラベルと表示代表元を分離する |
| Cube nets / stella | MathWorld Cube / Tetrahedron 2-Compound | 11 cube nets、2 tetrahedra compound | complement-dice、hue path、K8 Hamming-distance color atlas に統合する |

## Claim Risk Assessment

| Risk | Severity | Recommended handling |
| --- | ---: | --- |
| `色彩理論` が一般色彩科学に見える | High | `離散代数的色彩理論` / `8色代数モデル` として範囲を限定する |
| 二値頂点の明るさ順位を一般色覚全体へ拡張したと読める表現 | High | 加法 RGB の二値8頂点における順序と明記する |
| 順位としての brightness と連続的な測定量の混同 | High | Binary節では順序・順位を中心にし、規格係数の詳細は証拠節に分離する |
| `4G+2R+B` 色番号を新規発見と読まれる | High | NEC 1981 / Vickers 1982 を引用し、初等的な順位導出を新規性の根拠とせず、独自候補を正規化した順位と他の構造との統合に限定する |
| `A` の8ラベルと `H` 上の中間候補の混同 | High | `λ` のファイバーと表示代表元を明記し、XOR を `A` に限定する |
| Boolean lattice の既知性 | High | JSSD を引用し、Hasse 図自体は新規主張しない |
| XOR/OR と AND/XNOR の限定的一致を演算の同一性と誤読される | Medium | 専用のGRB・YCM混色節では `[G,R,B]` ビットと一致条件を示し、演算自体は区別する。二値加法 RGB での対応は明記し、一般の連続色や顔料へは拡張しない |
| dice net 一意性 | Medium | 11 nets の列挙テストに基づく内部補題として扱う |
| 文献が UI から見えない | Medium | 本ノートと必要なら簡潔な References drawer で扱い、各本文に但し書きを重ねない |

## Improvement Proposals

### Integrated Theory interactions (2026-09-06)

The rank chapter follows one derivation: three conditions on an additive score determine the total order; counting preceding states gives the primary ranks `B=1,R=2,G=4` and `L(g,r,b)=4g+2r+b`. A short prose supplement explains gapless subset sums as a consequence. The research note retains uniqueness of unnamed gapless weights as a supplementary characterization. Score weights `w_G,w_R,w_B` are kept distinct from binary state coordinates `g,r,b` and integer ranks.

The cube shows all eight vertices and twelve edges by default. Selecting a vertex highlights its three incident edges; selecting it again or clicking the page background clears the selection. Switching to Hasse preserves the selected vertex. The standalone toggle panel, G/R/B action buttons, and persistent transition readout are removed. State transitions and signed `ΔL` are explored in the linked six-cycle and zigzag, while the complete `K8` display stays in the distance chapter.

The chromatic six-cycle is placed beside Tone Zigzag in the geometry chapter, above their shared six-edge table. Edge index and traversal direction are shared across all three views. Tone-fiber selection remains independent because a single tone can have multiple hue preimages. The diagrams stack on narrow screens.

Hamming DATA and error controls live in their respective flow stages. Parity-generation equations precede ENCODED; the parity-set diagram, three check results, and selected equation occupy the RECEIVED-to-SYNDROME step. Selecting a check highlights its four received positions. The simulator still calculates downstream results at separate times and cancels superseded runs; pending stages show no precomputed result.

### P0: Claim Hygiene

実装済みの方針は維持する。

1. Theory タイトルを `離散代数的色彩理論` にする。
2. Color detail の表示値は `トーン` / `Tone` にする。
3. Binary-level copy は、加法性と三条件から全順序 `K<B<R<M<G<C<Y<W` を導き、0始まりの順位として `B=1,R=2,G=4` を直接得る説明を中心にする。無隙間部分和は帰結へ置き、測定係数や luma 式は持ち込まない。
4. `XOR 混色` ではなく `XOR 演算` と呼ぶ。
5. 一つのブール代数 `A = P({G,R,B})` と、その加法群・ベクトル空間としての `(F2^3,+)`、Boolean 環としての `F2 x F2 x F2` を区別する。
6. Color Die は六有彩色を立方体の六面に対応させ、補色対 R/C、Y/B、G/M を対面へ置くモデルとする。その上で R→Y→G→C→B→M の五つの面接続を残して開くと、六つの正方形の内部が重ならない2-2-2展開図が得られる。閉路を閉じる M–R 接続は切り離され、折り戻すと再びつながる。面番号は既存の順位 L とし、L(κc)=7−L(c) から対面の番号和7を読む。色相順を保つ展開・補色対面・標準ダイスの番号条件の対応を中心に説明する。符号から格子方向を定める構成は用いず、ΔL と切替チャネルは Tone Zigzag の表で扱う。
7. Cube/Hasse はグラフ配置であり、現行 SVG を K-W 軸方向の正確な幾何投影とは呼ばない。
8. Color Die の演算式は `011(M) ∧ 110(Y) = 010(R)` のように `[G,R,B]` ビットを主表示とし、異なるRGB原色での `OR=XOR` と異なるCMY原色での `AND=XNOR` は限定的一致として説明する。

### P1: Provenance Stays Outside the Theory UI

既知部分と CHROMALUM の統合部分の対応表は、この研究ノートに集約する。Theory タブの各節へ同じ但し書きや “Known / CHROMALUM adds” ラベルを反復追加しない。

```text
Known: RGB cube / hue hexagon
Known: historical GRB 4:2:1 color numbering
CHROMALUM candidate contribution: order-derived rank as a shared coordinate + normalization + integration
```

出典、新規性、外部色空間、規格係数は専用文書から参照できる。Theory タブには References drawer も設けず、理論本文を導出に集中させる。

### P1: Cards and Figures

カードは境界を持つこと自体に意味がある中心定理と対話操作に限る。文章の各段階を小カードへ分割せず、表を小カードへ入れない。主要主張のうちカード化する価値があるのは次に限る。

1. `GRB` Binary Tone derivation: three additive-score conditions determine `K<B<R<M<G<C<Y<W`; its zero-based rank gives `B=1,R=2,G=4`, `L(g,r,b)=4g+2r+b`, and `T=L/7`. Gapless subset sums follow from this rank.
2. Complement tone theorem: `T(c) + T(c xor 7) = 1`.
3. `L(a∨b)+L(a∧b)=L(a)+L(b)` と XOR 補正式。
4. Complement theorem: `L(κa)=7-L(a)`.

Fano、Hamming、`Q3`、Tone Zigzag、色相順の2-2-2展開図、Color Die、`K8`、T0/T1、双対八面体は関係を空間的に読む必要があるため図を残す。Tone Zigzag は `C6` の六辺を連続化した区分線形グラフ、14整数交点、その巡回列 `23456545432123`、補色対称だけを表示し、同じ節の全幅表で符号・包含・切替チャネルを対応させる。色相展開図では、補色を対面へ置く立方体がモデルの選択であることを明記し、五つの色相接続を残して開いた展開図を示す。画面では同じ net を約45度回転した横長ジグザグとして読みやすく表示し、別の展開図を導入したとは扱わない。T0/T1 は距離2の同じ図で黄と青に分ける。二四面体の複合を Color Star と呼び、専用の表面表示や個別モードは設けない。「有彩六色の八面体」では正八面体を一つだけ表示する。正立方体の面中心による構成を保持し、剛体回転で上をR・下をC、上段をM/Y・下段をB/Gにする。ノードはコンパクトな色名表示とし、共通辺を白、XORの第三頂点と面を青、その補色側を黄で強調する。辺は直接クリック・フォーカス・Enter/Spaceで選択でき、図の下にも12組の入力ボタンを用意する。ダイスの図、面・頂点の切替、頂点の位置ビットは表示しない。本文は辺のXOR完成則、距離1・2の接続分解、Fano四面の辺被覆を扱い、ダイスの面との双対関係と二つのテトラの共通部分を短い補足にする。正八面体の辺長がビット距離を表さないことを明記し、RGB cube の六頂点凸包との計量の違い、面隣接 `Q3` の導出、八面の混色表は研究ノートで扱う。11自由立方体展開図の列挙、他の切断辺、厳密な同値関係、固定した面配置と切断条件の下での一意性は研究層へ残す。導出順序、範囲、先行研究には図を置かない。Hamming の一ビット誤り訂正デモは、syndrome と位置ラベルの対応を操作で確かめられるため維持する。

### P2: Known vs Added Synthesis Record

次の対応表は研究ノートに維持し、Theory タブ本文へは追加しない。

| Structure | Known | CHROMALUM synthesis candidate |
| --- | --- | --- |
| RGB cube | Standard color geometry | pure-hue representatives and level fibers in the same atlas |
| GRB 4:2:1 code | NEC / ZX Spectrum manuals | rank derived from the conditional total order; normalized tone as a shared coordinate |
| Boolean algebra / Boolean ring | standard term-equivalent presentations | linked to `GF(2)^3` / Fano / dice in one UI |
| `Z2^3` color addition | Taylor prior art | RGB display primaries and Hamming labels |
| Fano/Hamming | standard finite geometry | color-syndrome educational mapping |
| Dice | standard opposite-sum rule | complement tone reversal explanation |
| Stella/K8 | standard graph/polyhedra | Hamming-distance color partition |

## Implementation Status

| Proposal | Status | Notes |
| --- | --- | --- |
| P0: Claim Hygiene | Done | UI distinguishes the Boolean algebra `A`, its XOR vector-space reduct, and its Boolean-ring presentation; restricted OR/XOR and AND/XNOR coincidences retain their conditions. |
| Final scope section | Done | Scope starts directly from the eight binary states, ordinal valuation, and operation boundary. |
| Hue-order net | Done | 補色を対面へ置く Color Die と、五つの色相接続を保つ展開図を同じ節で扱う。展開図には矢印・ΔL バッジ・折り畳み案内を置かず、六色の面とラベルを表示する。補色対・面番号・番号和7の一覧は読みやすい大きさで残し、広い画面では展開図と横並び、狭い画面では縦並びにする。順位差から展開図が必然的に導かれるとは書かない。詳細な列挙は研究ノートと機械検証に残す。 |
| Tone Zigzag | Done | `iota:A->{0,1}^3` 上の辺別アフィン補間、`kappa_bar(x)=1-x`、`T(h+1/2)=1-T(h)`、14整数交点列 `23456545432123`、二つの4-preimage帯を表示し、六辺差分表を同節の全幅表として統合する。 |
| T0/T1 tetrahedra | Done | 「距離2と二つのカラーテトラ」を主題に、T0/T1の偶奇分割と二つのK4を説明する。M/C/Yによる二チャンネル反転は同じテトラ内、G/R/Bと全ビット補色は相手テトラへ移ることを明記する。Color Starは重ね合わせの名称として紹介し、面のXORは図の後の短い補足、多数決・重心は研究ノートに置く。既存の距離1・2・3・全28辺の切替を使う。 |
| Chromatic octahedron | Done | 「有彩六色の八面体」として、上R・下Cの正八面体を一つ表示する。辺選択で二色のXORと補色に当たる第三頂点・二面を強調し、3ビット計算を示す。ダイスの図と面・頂点の切替は置かず、双対関係は短い本文で残す。全12辺のXOR則、Fano四面の辺被覆、距離1・2の分解、カラースターの共通部分を扱う。正則性・向き・選択・キーボード操作を検査する。八面の混色表、面隣接 Q3、RGB cube 六頂点凸包との計量の違いは研究ノートで扱う。 |
| P1: Provenance outside UI | Done | Prior art and novelty remain in docs and are absent from Theory copy. |
| P1: Cards and figures | Done | 本質的な説明文と短い証明は増補し、新しいカードは増やしていない。図は Tone Zigzag、色相路から展開図とダイスを構成する関係、T0/T1、面頂双対のように文章だけでは把握しにくい関係へ限定した。 |
| Continuous hue and Music | Done | Tone Zigzag までを離散から連続への直接橋として Theory に置き、sections、Fourier、Music は研究ノート側に保つ。 |
| P2: Known vs Added Synthesis Record | Done | The curated prior-art map records this split in docs; no extra in-app synthesis panel is planned. |

## Research Priority: Foundational Theory First

研究の主眼は、物理混色を再現する演算表を先に置くことではなく、8色上の離散代数を自律した理論としてどこまで構成・分類できるかに置く。検証順序は次の通りとする。

1. **公理化** — 最小の独立入力、定義、依存関係を固定し、規約と定理を分離する。
2. **内部定理と分類** — 演算、部分構造、自己同型、距離、補色、生成系、普遍性・一意性・反例を有限全探索または証明で確定する。
3. **表現論的接続** — 色名、`[G,R,B]` 順、幾何・符号への写像が準同型、埋め込み、商、section のどれに当たるかを明示する。
4. **適用範囲の拡張** — 二値加法 RGB で成立する色順・順位対応を出発点に、連続色、表示装置差、顔料、知覚、情報符号化へどこまで拡張できるかを別個に検証する。

理想的な加法 RGB の二値頂点では、原色和と明るさ順位がすでに二進 rank と対応する。この対応を理論中核に置きつつ、連続色や一般の物理混色へ同じ構造が保存されるとは先取りしない。この研究順序は、既知のブール代数の色名による再記述を越える定理・分類・予測がどこにあるかを厳密に判定するための方針である。


## Tests To Keep

1. Venn copy defines `A = P({G,R,B})`; the UI states separately that `(A,⊕) ~= (F2^3,+)` and the Boolean ring is `F2 x F2 x F2`, not `GF(8)`.
2. `GRB` Binary Tone makes numeric level order identical to tone order.
3. Complementation `lv xor 7` reverses chromatic tone ranks and die-opposite rank sums are 7.
4. Fano lines satisfy `a⊕b⊕c=0` and are supports of weight-three codewords in `ker H`; with `rank H=3` and seven distinct nonzero columns this yields Hamming `[7,4,3]`.
5. Hamming labels are coordinate positions and parity-check labels, not color codewords; `r=c⊕e` gives `Hrᵀ=Heᵀ`, and the complete interactive demo remains and restores every single-bit error position `1..7`.
6. Gray cycle uses only one-bit flips.
7. K8 edges partition by Hamming distance. The distance controls share a compact mask selector: G/R/B for distance 1 and M/C/Y for distance 2; selecting the active mask again restores that layer. Distance 3 needs no additional mask control. The rank-gap comparison stays as a static three-row table; arbitrary vertex pairs remain selectable in All mode.
8. The main UI explicitly chooses a cube with complementary colors on opposite faces, then unfolds it while preserving R–Y–G–C–B–M. The net and complementary face-number summary share one responsive layout. Keep the six face labels and the opposite-rank sum 7, but remove diagram arrows, delta badges, and the folding banner. The geometric test verifies the nonoverlapping staircase for the chosen cube and five retained connections; it must not treat numerical rank differences as forcing the net.
9. UI copy requires `明るさ順` / brightness order and binary rank while rejecting measurement coefficients, luma formulas, standards tables, provenance, and external color-space lists.
10. UI copy admits only the edgewise affine Tone Zigzag from the continuous layer and rejects pitch, frequency, Music, Fourier analysis, and unproved auxiliary constructions.
11. The modular valuation and XOR correction identities appear in the Theory mainline.
12. The Boolean-color algebra test checks both directions of the term-equivalent presentation formulas on all 64 ordered color pairs and exhausts all 16 channelwise binary Boolean functions, including `011(M) AND 110(Y) = 010(R)`.

## Bottom Line

現段階では、新しい自然科学理論としての成立や新しい代数構造の発見を先取りして主張しない。まず、既知の有限代数からどの色彩構造が最小原理で導けるかを研究する基礎理論候補として、次の形に絞る。

```text
A = one Boolean algebra P({G,R,B})
+ three score conditions -> total order -> named rank L=4G+2R+B -> gapless subset sums
+ modular valuation, complement reversal, toggle action, Q3/C6
+ seven nonzero masks read as Fano incidence and Hamming syndromes
+ K8 distance geometry with the T0/T1 tetrahedra
+ C6 affine Tone Zigzag, the complement-preserving Color Die, and its dual octahedron
```

連続色相のうち Theory に戻すのは、`C6` と `L` から直接導く Tone Zigzag に限る。81 sections、派生作図、Fourier、音響、外部規格、新規性評価は研究文書へ残す。

## Sources Kept

- Smith, Alvy Ray. 1978. “Color Gamut Transform Pairs.” _Computer Graphics_ 12(3), Proceedings of SIGGRAPH 1978, 12–19. [Author PDF](https://alvyray.com/Papers/CG/color78.pdf). [DOI: 10.1145/965139.807361](https://doi.org/10.1145/965139.807361).
- 玉垣庸一・小原康裕・宮崎紀郎. 2000.「CMYカラーキューブに基づく新たなカラーモデル II」『日本デザイン学会研究発表大会概要集』47, 290–291. [DOI: 10.11247/jssd.47.0_290](https://doi.org/10.11247/jssd.47.0_290).
- Taylor, Ron. 2013. “Color Addition Across the Spectrum of Mathematics.” _Gathering 4 Gardner 11 Exchange Book_. [PDF](https://www.gathering4gardner.org/g4g11gift/Taylor_Ron-Color_Addition.pdf).
- Nippon Electric Co. 1981. _PC-8001B N-BASIC Reference Manual_. Table 2-1 “Color Codes,” p. 27. [Archive record](https://oldcrap.org/document/nec-pc8001b-nbasic-reference-manual/). [PDF](https://oldcrap.org/wp-content/uploads/2024/07/nec-pc8001b-nbasic-reference-manual.pdf).
- Vickers, Steven. 1982. _Sinclair ZX Spectrum BASIC Programming_. Edited by Robin Bradbeer. Sinclair Research Ltd. See Chapter 16 “Colours” and Appendix E, “Binary.” [Original-edition scan](https://www.retroisle.com/sinclair/zxspectrum/OriginalDocs/ZXSpectrum48K%20Manual.pdf), [manual index](https://worldofspectrum.org/ZXBasicManual/index.html), [Chapter 16](https://worldofspectrum.org/ZXBasicManual/zxmanchap16.html), [Appendix E](https://worldofspectrum.org/ZXBasicManual/zxmanappe.html).
- Hamming, R. W. 1950. “Error Detecting and Error Correcting Codes.” _Bell System Technical Journal_ 29(2), 147–160. [DOI: 10.1002/j.1538-7305.1950.tb00463.x](https://doi.org/10.1002/j.1538-7305.1950.tb00463.x).
- Lavrauw, Michel. n.d. _Incidence Geometry and Buildings_. Lecture notes, section on projective planes and codes. [PDF](https://osebje.famnit.upr.si/~michel.lavrauw/inc_geom_buildings_notes.pdf).
- Error Correction Zoo. n.d. “Incidence-matrix projective code.” Reference entry, accessed 2026-07-13. <https://errorcorrectionzoo.org/c/incidence_matrix>.
- Weisstein, Eric W. n.d. “Cube.” _MathWorld—A Wolfram Web Resource_, accessed 2026-07-13. <https://mathworld.wolfram.com/Cube.html>.
- Weisstein, Eric W. n.d. “Tetrahedron 2-Compound.” _MathWorld—A Wolfram Web Resource_, accessed 2026-07-13. <https://mathworld.wolfram.com/Tetrahedron2-Compound.html>.
