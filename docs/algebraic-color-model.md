# 離散代数的色彩モデル

著者: Doctor Chromaticus
初版: 2026-04-19
再査読: 2026-07-18
文書種別: living research note。引用時は commit SHA で版を固定する。

## Related Notes

- 先行研究・新規性評価: [離散代数的色彩モデル — 先行研究](./prior-art-algebraic-color-model.md)
- Theoryタブの改善提案: [Theoryタブ — 先行研究と改善提案](./theory-tab-prior-art-and-improvements.md)
- Music-Linked Visualization: [Music-Linked Visualization](./music-linked-visualization.md)

## Abstract

本ノートは、CHROMALUM の Theory タブで用いている 8 色の代数層と、それとは別に RGB 立方体上で定義する最大彩度色相環 `H`（以下、純色相環）を、離散代数・有限幾何・符号理論・多面体幾何の観点から整理する。代数層の核は、三つの原色生成元 `G,R,B` の部分集合を Boolean join で色状態へ写す生成写像と、同じ3ビットをチャンネル反転マスクとして合成する作用とを区別することである。前者は8色の `1+3+3+1` 生成層を与え、後者の合成と自己相殺から `GF(2)^3`、Fano、Hamming が導かれる。純色相環上の中間候補は、その代数層の新しい元ではなく、同じ level を表示する代表元として別に扱う。

この代数核と番号配列は既知である。RGB 色立方体、`Z2 x Z2 x Z2`、Fano 平面、Hamming `[7,4,3]` の関係は既存文献に現れ、`0=Black, 1=Blue, 2=Red, 3=Magenta, 4=Green, 5=Cyan, 6=Yellow, 7=White`、すなわち `4G+2R+B` と同じ配列も NEC（1981）と Sinclair Research（1982）の一次資料に記録されている。本ノートはこれら個別構造や番号配列の新規性を主張しない。

CHROMALUM のプロジェクト固有の統合候補は、純粋数学が与える無名の最小部分和重み `{1,2,4}` と、二値 RGB 頂点に独立に現れる明るさ順が、同じ名前付き GRB 二進順位へ収束することを明示する点にある。さらに、その順位を補色トーン、純色相環の level ファイバー、Fano/Hamming、多面体、K8 の Hamming 距離分解と結び、単一の 8 ラベルの代数アトラスとして整理する。音響への写像はこの基礎理論には含めず、別ノートで扱う。

研究の優先順位は、`A` 上の演算、順序、補色、距離、自己同型、表現、生成原理と、加法 RGB の二値頂点に現れる明るさ順との対応を、ともに定理化することである。理想的な加法光では、互いに素な原色支持の join `M=R∨B`, `C=G∨B`, `Y=G∨R` に対してスコアの加法が成り立ち、明るさ順位と二進順位の対応を支える。一方、一般の連続色、顔料、色順応、主観的明るさまで同じ演算を拡張することは別の課題として区別する。

## Minimal Generating Principle

### A0--A2 と追加実現: 生成データ、順序、表示層

どの帰結が純粋数学、色の順序、色相座標のどれに依存するかを追跡できるよう、生成データと対応を次の五項へ圧縮する。

**A0 — 名前付き二値生成元。** 三つの区別された生成元

```text
E = {G,R,B}
A = P(E)
```

を取る。`K=empty`、`W=E` とし、各部分集合を対応する RGB/CMY 色名でラベル付けする。同じ冪集合を使うが、色の**生成**と状態の**反転**は次の二つの役割として区別する。

```text
Gamma : P(E) -> A
Gamma(S) = ∨_{c in S} e_c                          (primary generation)

tau_m : A -> A
tau_m(x) = x △ m                                  (state transition)
```

空 join は `Gamma(empty)=K` とし、単一チャンネル反転は `tau_c:=tau_(e_c)` と略記する。生成写像 `Gamma` の原始項は `e_G,e_R,e_B` だけであり、二つの join が `M,C,Y`、三つすべての join が `W` を生成する。これに対して `tau_m` の `m` はすでに生成された状態へ作用する反転マスクである。`M,C,Y,W` という色名を複合マスク `R△B`, `G△B`, `G△R`, `G△R△B` の略号として使うことはできるが、それらを第四以降の原始生成元として加えるわけではない。

OR・AND・NOTによるブール代数表示と、対称差XOR・ANDによる項同値なブール環表示、Hamming 距離は `A` から得る標準構成であり、別の色彩公理として加えない。特に XOR は `Gamma` の代わりとなる一般混色則ではなく、反転作用の合成と相殺を簡潔に記述する演算として用いる。

**A1 — 無名の最小無隙間 valuation。** 三つの原子へ正整数重みを与え、8部分和が重複なく、隙間のない `{0,...,7}` を作る加法的 valuation を考える。この条件は、色名への割当を行う前に無順序の重み集合 `{1,2,4}` を一意に与える。これは任意に比を選ぶ追加公理ではなく、無隙間条件による特徴づけである。

**A2 — 色の明るさ順と名前付き順位。** `M=R∨B` とし、加法 RGB の二値8頂点に対する正の加法的明るさスコアで、`sigma(G)>sigma(M)=sigma(R)+sigma(B)` と `sigma(R)>sigma(B)` が成り立つ順序を取る。この二比較は `K<B<R<M<G<C<Y<W` と必要十分である。各色より暗い二値頂点の個数を `rank_sigma` とすると、`(rank_sigma(B),rank_sigma(R),rank_sigma(G))=(1,2,4)` となる。集合状態を表す `S` と明るさスコアを混同しないため、後者には一貫して `sigma` を用いる。A2 は単独で名前付き順位 `4G+2R+B` を定め、A1 は同じ数値が色名を忘れた最小無隙間 valuation としても特徴づけられることを示す。

**D1 — A0 から導く有彩6-cycle。** `A` から `K,W` を除き、Hamming 距離1の辺を残すと、各辺で1チャンネルだけが反転する無根・無向の有彩 `C6` が得られる。その巡回反転ラベルは、巡回移動と逆順を同一視すれば `[(G,R,B)^2]` であり、各チャンネルは向かい合う2辺で反転する。これは A0 からの標準構成であり、追加公理ではない。

**A3 — D1 の標準アフィン連続実現。** `A` の特性ベクトルを単位立方体 `[0,1]^3` の頂点へ埋め込み、D1 の `C6` の各辺を同じアフィンパラメータで補間した像を最大彩度色相環 `H`（純色相環）とする。これは離散 `C6` に追加する表示上の選択である。

**E1 — ユークリッド計量と座標代表。** 長さ、角度、直交、円を述べる箇所でのみ、標準ユークリッド内積を追加する。向き付き色相角が必要な表示では Red を `0`、`R -> Y` を正とする一つの座標代表を選ぶ。E1 は A1--A2 の順位導出にも D1 の反転構造にも関与しない。

音響への写像は A0--A3 の一部ではない。色相から音程・周波数への追加写像、位相、音色、リズムは [Music-Linked Visualization](./music-linked-visualization.md) で扱う。

### 二経路の収束と感度

本ノートで重視するのは、A1 の純数学的な一意性と A2 の色の順序が同じ名前付き順位へ独立に収束し、そこから複数の規則が個別の色彩公理を足さずに得られることである。D1 は A0 から導かれ、A3 はその離散閉路へ連続表示を追加し、E1 はさらに計量を追加する。

| assumptions | consequences |
| :--- | :--- |
| A0 | Boolean algebra `B3` とその項同値な Boolean ring `F2 x F2 x F2`、加法群 `GF(2)^3`、Hamming cube `Q3`、補集合、無根・無向の有彩 `C6`、Fano/Hamming/K8 構成 |
| A0 + A1 | 無名の重み集合 `{1,2,4}`、levels `0..7` を作る一意な最小部分和 valuation |
| A0 + A2 | 名前付き順位 `(G,R,B)=(4,2,1)`、明るさ順位と二進順位の一致、補色 rank 反転 |
| A0 + A1 + A2 | 名前付き順位が最小無隙間 valuation とも一致する二経路の収束 |
| A0 + A2 + A3 | 純色相環、連続 Tone Zigzag、整数 level の14交点、ファイバー数、section 数 |
| A0 + A2 + A3 + E1 | 交点の15度座標表示、等トーン図形、直角、長さ、円、選択した座標代表における Fourier 係数 |

感度は次の通りである。A1 を外しても A2 から名前付き順位 `4G+2R+B` は得られるが、それが色名を忘れた最小無隙間 valuation と一致するという独立な特徴づけを失う。A2 を外すと A1 は無名の `{1,2,4}` を与えるだけで、B、R、G への割当には原子置換の `S3` 対称性が残る。D1 の有彩 `C6` は A2 に先立つ無根・無向の構造であり、開始点と巡回方向を変えても、各辺の1チャンネル反転と向かい合う同ラベル辺は変わらない。A3 と E1 は離散定理を変更せず、A3 を一般のアフィン実現へ緩めればアフィン不変量だけが、E1 を加えれば直角・円・絶対長が意味を持つ。

したがって、A1 の無名の重み集合と A2 の名前付き割当 `G=4,R=2,B=1` が同じ valuation へ収束することが本モデルの中心である。詳細な導出は Theorem 0--2、有限構成は Derived Finite-Geometric Representations、連続表示の帰結は Theorem 3--5 に一元化する。

### Continuous Representation Boundary

以下は研究ノート上で依存関係を管理するための連続表示境界であり、離散代数の中核定理の前提ではない。A3 では、有彩 `C6` の頂点を標準単位立方体へ置き、各隣接対を一つの規則

```text
c_i(t) = (1-t)v_i + t v_(i+1),  0<=t<=1
```

で補間する。その像

```text
H = {c in [0,1]^3 | min(c)=0 and max(c)=1}
```

が純色相環であり、`lambda=L|H` が離散順位を連続表示層へ移す。`H` 上の候補は `A` の新しい元ではなく、同じ整数 level を表示するファイバーの代表である。交点、section、角度、計量の詳細は後段の Continuous Representation Layer、Theorem 3--5、Appendix Layer に置く。

## Minimal Choices and Derived Definitions

有限な代数層では、名前付き生成元 `{G,R,B}`、無名の最小部分和 valuation、二値頂点の明るさ順、無根・無向の有彩6-cycleを区別する。以下はそれらから用いる派生定義である。

1. 代数ラベルは `A=P({G,R,B})` の8元であり、明るさ順位が選ぶ名前付き桁順 `[G,R,B]` で特性ベクトルを書く。
2. 対称差をXOR、包含をBoolean order、対称差の濃度をHamming距離として読む。
3. 最小部分和評価が無名の `{1,2,4}` を与え、明るさ順位が独立に `level = 4G + 2R + B` を与える。両者を比較すると、無名の重みが B、R、G に対応する。
4. 補色は集合補集合であり、ビット表現では `c' = c xor 7` になる。
5. トーン指標は、派生したlevelを正規化した GRB Binary Tone

   ```text
   T = (4G + 2R + B) / 7
   ```

   とする。
6. 連続表示層は `A` の標準立方体実現 `X=[0,1]^3` から純色相環 `H` を取り、`lambda=L|H` のファイバーを候補集合とする。
7. 向き付き色相角が必要な場合だけ、表示上の代表として Red を0、`R -> Y` を正に選ぶ。この代表選択は離散順位と反転ラベル型を変えない。

具体的な測光・映像係数を整数重みとして置き換えるのではなく、二値8頂点に共通して現れる明るさの順序だけを A2 に用いる。個別係数との比較は本ノートの数学から分離する。

### Algebraic Layer, Pure-Hue Loop, and Level Projection

本ノートでは、同じ「色」という語で異なる構造を混同しないよう、次の二層を区別する。

```text
A = P({G,R,B})
(A, xor) ~= (F2^3, +)
(A, xor, and) ~= F2 x F2 x F2
H = { GRB(g,r,b) in [0,1]^3 | min(g,r,b)=0 and max(g,r,b)=1 }
```

`A` は 8 個の二値 RGB ラベルからなる一つのブール代数である。包含・OR・AND・NOTで読むブール代数表示と、XORを加法、ANDを積として読むブール環表示は同じ `A` の項同値な表示である。Fano、Hamming、Color Cube、K8 の演算と関係も `A` 上で定義する。`H` は RGB cube 上で `min=0, max=1` を満たす純色相環であり、区分線形な六角形として連続的な色相座標を持つが、F2^3 のベクトル空間ではない。

`H` 上の GRB level 座標を、射影

```text
λ : H -> [1,6]
λ(GRB(g,r,b)) = 4g + 2r + b
```

で定義する。整数 level `L in {1,...,6}` に対する候補集合はファイバー

```text
C_L = { c in H | λ(c) = L }
```

である。UI が各 level に表示する候補色は、選択写像 `s(L) in C_L` による代表元であり、`s(L)` 自体を `A` の元とみなして XOR しているわけではない。複数の候補が同じ `L` を持っても、代数ラベルは 1 個のままである。Black `L0` と White `L7` は `H` 上に存在せず、黒白軸の端点として別扱いする。

この区別により、以下では「level `L`」は `A` のラベルまたはその数値座標を、「level `L` の候補」は `C_L` の表示代表元を意味する。`λ` は level 座標を与える写像であって、純色相環へ GF(2)^3 の加法を移す準同型ではない。

## Color Labels

代数層 `A` の 8 元を、次の色名でラベル付けする。

| lv | bits `[G,R,B]` | set | color | short | tone |
| ---: | :---: | :--- | :--- | :---: | ---: |
| 0 | 000 | empty | Black | K | 0/7 |
| 1 | 001 | {B} | Blue | B | 1/7 |
| 2 | 010 | {R} | Red | R | 2/7 |
| 3 | 011 | {R,B} | Magenta | M | 3/7 |
| 4 | 100 | {G} | Green | G | 4/7 |
| 5 | 101 | {G,B} | Cyan | C | 5/7 |
| 6 | 110 | {G,R} | Yellow | Y | 6/7 |
| 7 | 111 | {G,R,B} | White | W | 7/7 |

ここで tone は `level / 7` である。Canvas/PNG への出力では、正準候補座標を表示用 RGB バイトへ写す。画像入力は逆変換ではなく、正規化した gamma-encoded sRGB コード値 `(g_s,r_s,b_s)` に

```text
S_code = (4g_s + 2r_s + b_s) / 7
estimated level = round(7 S_code)
```

を直接適用する、独立した非可逆な内部分類器である。中間の8-bit scoreへ丸めてから再量子化はしない。入力画像から `A` のビットや `H` の色相座標を復元したことにはならず、このスコアも GRB Binary Tone、知覚的明度、測光輝度のいずれでもない。

## Core Theorems

以下を本ノートの中核定理の正本とする。後続節は、これらの定理を既知構造、有限幾何、連続表示へ移した派生である。

### Theorem 0: Unique unnamed gapless subset-sum valuation

三つの正整数重み `a<=b<=c` の8部分和が、重複なく連続整数 `{0,...,7}` を埋めるなら、

```text
{a,b,c} = {1,2,4}.
```

**Proof.** 部分和に1が必要なので `a=1`。`0,1` の次に隙間も衝突も作らないため `b=2`、`0,1,2,3` の次を埋めるため `c=4` である。逆に `{1,2,4}` の8部分和はちょうど `{0,...,7}` になる。QED.

この定理は色名を使わないため、三つの重みを G、R、B のどれへ割り当てるかという Boolean 原子置換の `S3` 対称性を残す。

### Theorem 1: Brightness order and the named GRB binary rank

二値 RGB 頂点上の正の加法的スコアを

```text
sigma(G,R,B) = w_G G + w_R R + w_B B
```

とし、色状態として `M=R∨B` と置く。このとき次は同値である。

1. `sigma(G)>sigma(M)=sigma(R)+sigma(B)` かつ `sigma(R)>sigma(B)`。
2. `w_G>w_R+w_B` かつ `w_R>w_B>0`。
3. `K<B<R<M<G<C<Y<W`。

この全順序に対して `rank_sigma(c)=#{x in A | sigma(x)<sigma(c)}` と定めると、

```text
rank_sigma(K,B,R,M,G,C,Y,W) = (0,1,2,3,4,5,6,7)
rank_sigma(c) = 4G + 2R + B,  where c=(G,R,B).
```

**Proof.** 加法性から `sigma(M)=w_R+w_B` なので最初の比較は `w_G>w_R+w_B`、二つ目は `w_R>w_B` である。この二不等式と正性により

```text
0 < w_B < w_R < w_R+w_B < w_G < w_G+w_B < w_G+w_R < w_G+w_R+w_B
```

が従う。逆に全順序は `G>M` と `R>B` を含む。順位を0から数えれば B、R、G は1、2、4番となり、各二値頂点の順位は `4G+2R+B` である。QED.

Theorem 1 は A2 の順序だけから名前付き順位を与える。Theorem 0 は独立に無名の `{1,2,4}` を与える。両者を比較すると、無名の重みが `B=1,R=2,G=4` と名付けられ、同じ valuation へ収束する。

### Proposition 1.1: Boolean valuation, carry, and order extension

`L(a)=4a_G+2a_R+a_B` とする。任意の `a,b in A` について

```text
L(a∨b) + L(a∧b) = L(a) + L(b)
L(a⊕b) = L(a) + L(b) - 2L(a∧b)
```

が成り立つ。特に `a∧b=K` のときだけ、`L(a∨b)=L(a⊕b)=L(a)+L(b)` となる。各原子重みは正なので、`a⊊b` なら `L(a)<L(b)` であり、`L` の昇順は Boolean 包含順序の linear extension を与える。ただし Boolean rank `rho(a)=|a|` と明るさ順位 `L(a)` は同じではない。

また `L` は通常の整数加法への群準同型ではないが、3ビット整数の bitwise 演算に対して

```text
L(a⊕b) = bitxor(L(a),L(b))
L(a∧b) = bitand(L(a),L(b))
```

を満たす Boolean ring 同型である。

### Corollary 1.2: Cube-edge rank difference and hue-cycle closure

任意の状態 `x in A` とチャンネル `c in {G,R,B}` に対し、

```text
Delta_c L(x) = L(tau_c(x)) - L(x) = (1-2x_c)w_c
|Delta_c L(x)| = w_c
```

が成り立つ。有彩 `C6` の一代表を level 付きで書くと

```text
R₂ -> Y₆ -> G₄ -> C₅ -> B₁ -> M₃ -> R₂
```

であり、その差分列は

```text
+4, -2, +1, -4, +2, -1
```

となる。`L` の原子重みはすべて正なので、差分の符号は包含の向きをそのまま表し、

```text
R ⊂ Y ⊃ G ⊂ C ⊃ B ⊂ M ⊃ R
```

を得る。さらに絶対値列

```text
4, 2, 1, 4, 2, 1
```

は反転した原子の重みであり、切替チャネル列 `G,R,B,G,R,B` を識別する。実際、隣接色を `c_i,c_(i+1)` とすると Hamming 距離1なので、差分マスク

```text
m_i = c_i⊕c_(i+1) in {G,R,B}
```

は単一原子であり、

```text
|L(c_(i+1))-L(c_i)| = L(c_i⊕c_(i+1)) = L(m_i) in {4,2,1}
```

が成り立つ。したがって符号は「原子を加えたか除いたか」を、絶対値は「どの原子を切り替えたか」を記録する。XOR反転と順位差の双方は一周で閉じ、各チャンネルが二度ずつ反転するため総変動は

```text
TV_C6(L) = 2(4+2+1) = 14.
```

### Theorem 2: General normalized linear complement identity

任意の `n>=1`、正の重み `w_i>0`、`Ω=sum_i w_i` に対し、

```text
L_w(x) = sum_i w_i x_i
T_w(x) = L_w(x) / Ω
kappa(x) = 1-x
```

と定めると、全ての `x in [0,1]^n` について

```text
L_w(x) + L_w(kappa(x)) = Ω
T_w(x) + T_w(kappa(x)) = 1
```

が成り立つ。実際、`L_w(kappa(x))=sum_i w_i(1-x_i)=Ω-L_w(x)` である。CHROMALUM は `n=3`, `w=(4,2,1)`, `Ω=7` の場合である。総重みには `Ω` を用い、White の状態記号 `W` と区別する。補色 tone 和1そのものは `4:2:1` 固有ではなく、名前付き順位、整数交点、後続のファイバー構造が本モデル固有の選択に依存する。

## Known Structures

### RGB Color Cube

RGB 色空間を 3 次元立方体として見ることは標準的である。8 頂点は `000` から `111` までの 3 ビットベクトルであり、各辺は 1 チャンネルの切り替えに対応する。

CHROMALUM ではこの立方体を Q3 として扱い、辺を Hamming 距離 1 のペアとして読む。

### Boolean Lattice B3

8 色は `{G,R,B}` の全ての部分集合と同一視できる。

```text
K = empty
B = {B}
R = {R}
G = {G}
M = {R,B}
C = {G,B}
Y = {G,R}
W = {G,R,B}
```

この見方では、OR は集合和、AND は集合共通部分、補色は `{G,R,B}` における集合補集合である。

### GF(2)^3 / Z2 x Z2 x Z2

`GF(2)^3` はここでは色の生成規則ではなく、チャンネル反転の**合成則**である。各マスク `m in A` に状態変換 `tau_m(x)=x△m` を対応させると、

```text
tau_K = id_A
tau_m∘tau_n = tau_(m△n)
tau_m∘tau_m = id_A
tau_m∘tau_n = tau_n∘tau_m
```

が成り立つ。したがって三つの原始反転 `tau_G,tau_R,tau_B` は、可換かつ各々が involution であり、その合成として8個の変換を一意に作る。例えば、

```text
tau_M = tau_R∘tau_B
tau_C = tau_G∘tau_B
tau_Y = tau_G∘tau_R
tau_W = tau_G∘tau_R∘tau_B
```

である。左辺の `M,C,Y,W` は複合**マスク**の色名であって、原始生成元を増やしているのではない。`tau_M` は「Magentaを混ぜる」ことではなく、Red と Blue の二チャンネルを一度ずつ反転する変換を表す。状態 `x` とマスク `m` の双方を同じ3ビットで表示できるため `x△m` という一つの式で書けるが、被作用状態と作用素の役割は異なる。

この反転群は `GF(2)^3 ~= Z2 x Z2 x Z2` の加法群と同型である。既存文献には8色を同じベクトルで表す「色加算」の語法もあるが、本ノートでは一般混色との誤解を避け、CHROMALUM のトーンレベル、Fano/Hamming、多面体構造への接続には、反転の合成と相殺という作用の語法を用いる。

### One Boolean Algebra, Two Term-Equivalent Presentations

最小対象は一つのブール代数 `A=P(E)` である。ブール代数表示 `(A, or, and, not, K, W)` と単位的ブール環表示 `(A, xor, and, K, W)` は項同値（term-equivalent）であり、各シグネチャの演算を他方の項として相互定義できる。これは独立した二つの理論を導入することではない。

```text
Boolean algebra -> Boolean ring
a xor b      = (a or b) and not(a and b)
a *_A b      = a and b

Boolean ring -> Boolean algebra
not a        = a xor W
a or b       = a xor b xor (a and b)

A ~= F2 x F2 x F2
XNOR(a,b)    = a xor b xor W
```

これらの式は互いに逆の翻訳を与えるので、表示を替えても基礎対象と定理体系は変わらない。AND は両表示に共通し、OR と XOR は相互に導出可能だが全域では別の演算である。環表示の加法群は `GF(2)^3`、環そのものは直積環 `F2 x F2 x F2` であり、体 `GF(8)` ではない。XNOR は `W=111` を用いて XOR から導く派生演算である。

3ビットの全64順序対では、次が必要十分条件になる。

```text
a or b = a xor b       iff a and b = K
a and b = XNOR(a,b)    iff a or b = W
```

各座標で前者は入力 `11` を、後者は入力 `00` を禁止する条件なので、どちらの一致領域も `3^3 = 27` 順序対である。「一致」とはこの制限領域で出力値が一致するという意味で、二つの演算の真理値表が同じという意味ではない。例えば、

```text
R or R = R,       R xor R = K
C and C = C,      XNOR(C,C) = W
```

となり、冪等な OR / AND と自己相殺する XOR / Whiteを返す自己XNORは全域で明確に分かれる。

CHROMALUM のビット順は常に `[G,R,B]` である。異なるRGB原色は互いにビットが重ならず `a and b = K` なので、その3組では OR と XOR が同じCMYを返す。異なるCMY原色は二色で全ビットを覆い `a or b = W` なので、その3組では AND と XNOR が同じRGBを返す。要求された例はビットごとに

```text
M and Y = 011 and 110 = 010 = R
XNOR(M,Y) = not(011 xor 110) = not 101 = 010 = R
```

である。したがって、カラーダイスは式を `011(M) ∧ 110(Y) = 010(R)` のようにビットを主、色名を補助として表示する。

理論上の基礎構造を二つに分けない。包含・補集合・冪等な合成にはブール代数シグネチャ、Fano / Hamming / parity / channel toggle にはブール環シグネチャの記述が簡潔だが、これは同じブール代数に対する語彙の選択であって理論の切替ではない。XNORは独立の基本演算にせず `XNOR(a,b)=a xor b xor W` として導出する。この整理により、`GF(2)^3` ベクトル空間表示を保ちながら、限定的一致だけを演算の全域的同一性や混色則へ誤拡張することを避ける。


## Derived Finite-Geometric Representations

### Seven Nonzero Toggle Patterns

三つの原始反転 `tau_G,tau_R,tau_B` を重複なく合成すると、恒等変換を除いて七つの反転パターンが得られる。

```text
one channel:    tau_B, tau_R, tau_G                         (3)
two channels:  tau_M=tau_R∘tau_B, tau_C=tau_G∘tau_B,
               tau_Y=tau_G∘tau_R                           (3)
three channels: tau_W=tau_G∘tau_R∘tau_B                    (1)
```

マスクの Hamming weight ごとの個数は `C(3,1)+C(3,2)+C(3,3)=3+3+1=7` であり、色生成の `1+3+3+1` 層と同じ二項係数を共有する。全反転群を

```text
T = {tau_m | m in A}
```

とすると、Black における評価写像

```text
ev_K : T -> A
ev_K(tau_m) = tau_m(K) = m
```

は全単射であり、`m -> tau_m` は群同型 `(A,△) ~= T` を与える。このため、状態ラベル `1,...,7` と非恒等反転マスクのラベル `1,...,7` は同じビット列を共有する。ただし前者は到達した色状態、後者は状態を動かす変換であり、役割まで同一ではない。以下の Fano と Hamming は、任意の色同士を混ぜる演算からではなく、この七つの非零マスクと三原色反転の合成則から導く。

### Fano Plane PG(2,2)

七つの非恒等反転 `tau_m`、すなわち `F2^3` の非零マスクを射影化すると、Fano 平面 `PG(2,2)` の7点になる。

Fano 線は次の 7 本である。

```text
{1,2,3} = {B,R,M}
{1,4,5} = {B,G,C}
{2,4,6} = {R,G,Y}
{1,6,7} = {B,Y,W}
{2,5,7} = {R,C,W}
{3,4,7} = {M,G,W}
{3,5,6} = {M,C,Y}
```

各線 `{a,b,c}` は、対応する三つの反転を合成すると恒等変換へ戻る三つ組である。

```text
tau_a∘tau_b∘tau_c = id_A
iff a△b△c = K
```

特に CMY 線は、複合マスクを原始反転へ展開すると

```text
tau_M∘tau_C∘tau_Y
  = (tau_R∘tau_B)∘(tau_G∘tau_B)∘(tau_G∘tau_R)
  = id_A

011 △ 101 △ 110 = 000
```

と読める。各原始反転がちょうど二度現れて相殺することが、Fano 線の閉包を三原色の反転から説明する。Black(0) / `K` は零マスク、すなわち恒等変換であり、射影平面の点にはならない。

### Hamming [7,4,3]

上の七つの非零反転マスクは、Hamming 符号のパリティ検査行列 `H` の7本の非零列として読むことができる。色そのものを符号語とは呼ばず、`1..7` を符号語の座標位置ラベルとして扱う。行を固定した `[G,R,B]` 順、列を `L=1..7` 順に取ると、

```text
        B   R   M   G   C   Y   W
        1   2   3   4   5   6   7
H = [   0   0   0   1   1   1   1   ]  s_G
    [   0   1   1   0   0   1   1   ]  s_R
    [   1   0   1   0   1   0   1   ]  s_B
```

となる。列は `001,010,011,100,101,110,111` の七つすべてであり、標準基底を含むので `rank H=3`、したがって階数・退化次数定理から `dim ker H=7-3=4` である。零列がないため重み1の非零符号語はなく、相異なる二列の XOR は零にならないため重み2もない。一方、各 Fano 線の三列は XOR すると零になり、重み3の符号語を与える。よって `ker H` の最小距離は `d_min=3` であり、これは Hamming `[7,4,3]` 符号である。ここで `7` は符号長、`4` は次元、`3` は最小 Hamming 距離を表す。

```text
P1 = Blue  = position bit 001
P2 = Red   = position bit 010
P4 = Green = position bit 100
```

正しい符号語を `c in ker H`、通信誤りを `e`、受信語を `r=c xor e` とする。`Hc^T=000` なので、受信語の syndrome は

```text
s = Hr^T = H(c xor e)^T = Hc^T xor He^T = He^T
```

となり、正しい符号語成分は検査で零になって誤り成分だけが残る。単一位置 `j` の誤りでは `e` が第 `j` 座標だけに1を持つので `s=h_j`、すなわち syndrome は `H` の第 `j` 列そのものである。失敗したパリティ検査の集合を

```text
s = (s_G,s_R,s_B) in {0,1}^3
```

として読むと、非零 syndrome が指す誤り位置は

```text
j = 4s_G + 2s_R + s_B
```

である。例えば `s=110` なら `j=6`、すなわち Yellow と同じビットラベルを持つ第6位置を指す。Fano 線 `{a,b,c}` の条件 `a+b+c=0` は、その三位置を支持とする重み3の Hamming 符号語の条件でもある。したがって Fano の入射関係と Hamming の最小符号語は、同じ三ビット依存関係の二つの表示である。

誤り訂正を成立させるのは `F2^3` 上の線形写像 `H` であり、明るさ順位 `L` ではない。`L(s)=4s_G+2s_R+s_B` は、同じ三ビット syndrome に `B..W` の色名と位置番号 `1..7` を与える読み方として用いる。この役割を区別し、一般の符号率比較、拡張 Hamming 符号、Tanner graph、量子検査回路は本モデルの有限色代数の本線へ含めない。

### K8 Distance Partition

8状態の全28組は差分マスクの Hamming weight により

```text
d=1: 12 edges
d=2: 12 edges
d=3:  4 edges
```

へ分かれる。距離1は cube `Q3`、距離2は偶奇二つの四面体、距離3は四つの補色対である。これは `F2^3` 上の全二点関係を尽くす標準的な距離分解である。

偶奇写像

```text
pi : (A,xor) -> F2
pi(g,r,b) = g xor r xor b
```

は群準同型である。その核

```text
T0 = ker(pi) = {K,M,C,Y}
```

は XOR の下で Klein four-group `V4` と同型である。奇数パリティ集合は

```text
T1 = B xor T0 = {B,R,G,W}
```

という唯一の非自明な剰余類である。同じパリティを持つ異なる三ビット状態の差は必ず重み2なので、距離2グラフは `T0` と `T1` の各4点内の全組を結ぶ。したがって距離2層は `K4 disjoint union K4` であり、二つの四面体として表示される。

各頂点から距離 `d` の頂点が `C(3,d)` 個あり、各無向辺は両端から二度数えられる。したがって距離 `d` の無向辺数は

```text
N_d = 8*C(3,d)/2
```

であり、`N_1=12`, `N_2=12`, `N_3=4`、したがって `12+12+4=28=C(8,2)` を得る。

## Historical and Continuous Representation Layer

### Historical 3-Bit Palette Code Prior Art

GRB の3ビットを通常の二進整数として読む色番号は、CHROMALUM よりはるか以前の一次資料に現れる。

| primary source | date | documented palette code |
| :--- | :---: | :--- |
| NEC, *PC-8001B N-Basic Reference Manual*, Table 2-1 `COLOR Options` | ©1981 | `0 Black, 1 Blue, 2 Red, 3 Magenta, 4 Green, 5 Cyan, 6 Yellow, 7 White` |
| Sinclair Research, *ZX Spectrum BASIC Programming*, Chapter 16 `Colours` | 1982 | `0 black, 1 blue, 2 red, 3 purple/magenta, 4 green, 5 cyan, 6 yellow, 7 white` |

両表は CHROMALUM の level 表と8項すべてで一致し、数式では

```text
code = 4G + 2R + B
```

である。ZX Spectrum の同章は、たとえば Magenta の code `3` が Blue `1` と Red `2` の和であることも説明している。したがって GRB の桁順、`0..7` の番号、RGB/CMY 色名との対応は既知であり、その発明を新規性として主張できない。

CHROMALUM がここで加えるのは、純数学の最小部分和 valuation と、独立な色の明るさ順が同じ既知配列へ収束することを明示し、その順位を正規化 tone、補色 rank、純色相環ファイバー、section、有限幾何へ統合することである。色相角が必要な場合だけ、有彩 `C6` の一つの座標代表を後から選ぶ。歴史的な先後については「遅くとも1981年には一次資料に存在する」とだけ結論し、これら二資料より前の起源までは本ノートでは確定しない。

### Hue Hexagon / Chromatic C6 with Gray-Type Steps

完全飽和色の有彩色 6 頂点は、RGB 色立方体の黒白軸を囲む六角形として現れる。

```text
R -> Y -> G -> C -> B -> M -> R
```

CHROMALUM のレベル順で書くと、

```text
2 -> 6 -> 4 -> 5 -> 1 -> 3 -> 2
```

であり、各ステップは 1 ビットだけを反転する。したがってこれは、立方体 Q3 の有彩色頂点上の `C6` であり、Gray code と同じ1ビット遷移条件を持つ。ただし、8個の3ビット語をすべて一度ずつ通る通常の cyclic 3-bit Gray code ではなく、`K` と `W` を除いた6頂点の巡回であるため、以下では **chromatic C6** または **Gray-type C6** と呼ぶ。

### Pure-Hue-Loop Tone Intersections

上の色相六角形は、純色条件

```text
max(R,G,B) = 1, min(R,G,B) = 0
```

を満たす RGB cube 上の純色相環 `H` でもある。各辺では、RGB 成分のうち 1 成分だけが `0` から `1`、または `1` から `0` へ線形に変化し、他の 2 成分は `0` または `1` に固定される。

CHROMALUM の内部計算では、この閉路 `H` をデバイスRGBのバイト値ではなく、正規化座標 `GRB(g,r,b)`、またはそれを4倍した `0..4` 座標 `GRB(G4,R4,B4)` で表す。任意の色相では成分は実数だが、整数 level の候補交点では `G4,R4,B4` がすべて整数になる。E1 の座標代表で角度を表示すれば、これらは15度刻みになる。GRB順は Binary Tone の重み `4:2:1` と座標成分を一致させる。この整数候補も `A` を拡張する代数元ではなく、`C_L` に属する代表元である。

```text
R  = GRB(0,4,0)   Y = GRB(4,4,0)   G = GRB(4,0,0)
C  = GRB(4,0,4)   B = GRB(0,0,4)   M = GRB(0,4,4)

15deg = GRB(1,4,0)
30deg = GRB(2,4,0)
45deg = GRB(3,4,0)
```

この座標での正確なレベル式は

```text
L = (4G4 + 2R4 + B4) / 4
T = L / 7
```

である。8-bit sRGB、Canvas、PNGはこのモデルの公理ではない。出力アダプターは正準座標からデバイス値を作る。一方、画像入力は sRGB コード値から level ラベルを推定する別の分類器であり、`λ` の逆写像でも正準座標の復元でもない。いずれの経路でも、デバイス量子化によって `A` や `H` の定義を変更しない。

## Appendix Layer: Derived Euclidean Geometry and Periodic Analysis

以下は A3 の標準アフィン実現に E1 のユークリッド計量、特定の座標代表、さらに明示した補助作図を加えた派生層である。これらの結果は計算上の研究成果として保存するが、A0--A2、Theorem 0--2、Fano/Hamming、K8 距離分解の証明には用いない。アフィン不変量、ユークリッド不変量、座標代表に依存する Fourier 係数を区別する。

### GRB Decomposition and Hue Coordinates

正規化した CHROMALUM 座標を

```text
c = GRB(g,r,b),  0 <= g,r,b <= 1
L(c) = 4g + 2r + b
```

とする。正六角形の外接半径を `1`、Red を画面上方向、Green を右下、Blue を左下へ置く 2 次元写像を

```text
V(c) = (x,y)
x = (sqrt(3)/2)(g-b)
y = (g+b)/2-r
```

と定義すると、`R -> (0,-1)`, `G -> (sqrt(3)/2,1/2)`, `B -> (-sqrt(3)/2,1/2)` になる。この写像は中立方向を消去し、

```text
V(c + t*GRB(1,1,1)) = V(c)
V(GRB(1,1,1)-c) = -V(c)
```

を満たす。したがって 2 次元位置だけでは level は一意に決まらない。一方、`V(c)=(x,y)` と `L` を同時に指定すれば、

```text
g = (L + 2y +  4x/sqrt(3)) / 7
r = (L - 5y -  3x/sqrt(3)) / 7
b = (L + 2y - 10x/sqrt(3)) / 7
```

として GRB を一意に復元できる。ゆえに

```text
GRB 3D coordinate  <->  (2D hue vector V, GRB level L)
```

は完全な座標分解である。同じ 2 次元位置へ level `L1`, `L2` を割り当てた 2 つの lift は、正規化座標で

```text
c_L2 - c_L1 = ((L2-L1)/7) GRB(1,1,1)
```

だけ異なる。したがって 2 次元作図上の点だけから level は定まらず、異なる `L` を持つ中立 lift を選べる。特に六角形外の M/G 交点 X/Z は純色相環上の候補ではなく、固有の CHROMALUM level を持たない。

2 次元半径には

```text
|V(c)|^2
  = g^2+r^2+b^2-gr-rb-bg
  = ((g-r)^2 + (r-b)^2 + (b-g)^2) / 2
```

が成り立つ。これは中立成分ではなく 3 チャンネル間の差だけを測る二次形式である。

この付録では次の色相・作図座標を区別する。`theta` と `h` は同じ正準パラメータのラジアン表示と度表示だが、式中の単位を暗黙に混ぜないため別記号を使う。

| symbol | meaning |
| --- | --- |
| `theta` | 純色相環の各辺を線形補間する正準 hue parameter（ラジアン） |
| `h = 180 theta/pi` | UI で表示する同じ hue parameter（度） |
| `phi` | `V(c)` を原点から見た実際のユークリッド偏角。画面上向きの Red 軸（負の y 軸）を0、時計回りを正とする。 |
| `vartheta` | M/G と R/C の指定した作図から生じる構成依存の中心角 |

R-Y 辺を `c(t)=GRB(t,1,0)` とし、`t = h/60deg = 3theta/pi` とすると、

```text
V(c(t)) = (sqrt(3)t/2, -1+t/2)
rho(t)^2 = |V(c(t))|^2 = 1-t+t^2
phi(c) = atan2(x,-y) mod 2pi
phi(t) = atan2(sqrt(3)t, 2-t)
```

である。通常の数学座標の `atan2(y,x)` ではなく `atan2(x,-y)` なのは、画面座標で Red/上方向を0、時計回りを正としたためである。したがって、正準 hue parameter と実偏角は一般には一致しない。

| hue parameter `h` | actual polar angle `phi` | `rho^2` |
| ---: | ---: | ---: |
| `15deg` | `atan(sqrt(3)/7) ~= 13.8979deg` | `13/16` |
| `30deg` | `30deg` | `3/4` |
| `45deg` | `atan(3sqrt(3)/5) ~= 46.1021deg` | `13/16` |

これは矛盾ではない。`h` は GRB の線形補間、整数 level 交点、`15deg` 格子を保存し、`phi` は正六角形埋め込み後の実方向を表す。前者は一様な辺パラメータ、後者は E1 のユークリッド偏角であり、同じ角度概念ではない。

画面複素座標 `z=x+iy` と `zeta=exp(2pi i/3)` を使えば、同じ 2 次元写像は

```text
z = -i (r + g*zeta + b*zeta^2)
```

と書ける。`1+zeta+zeta^2=0` が中立方向の消去を、`z -> -z` が補色半回転を表す。この複素表示は、後述する `Q(sqrt(-3))` のノルム構造と六角形の Fourier 選択則の基礎になる。

GRB Binary Tone

```text
T = (4G + 2R + B) / 7
```

は RGB 成分の線形関数なので、純色相環の各辺上では tone も単調な一次関数として変化する。したがって、隣接する 2 頂点のレベル差が `d` のとき、その辺は端点を含めて `d + 1` 個の離散 tone レベルを横切る。

色相閉路

```text
2 -> 6 -> 4 -> 5 -> 1 -> 3 -> 2
```

を純色相環の各辺における通過レベルとして展開すると、端点を含めて次のようになる。

```text
R -> Y : 2 3 4 5 6
Y -> G : 6 5 4
G -> C : 4 5
C -> B : 5 4 3 2 1
B -> M : 1 2 3
M -> R : 3 2
```

この色相閉路について、閉路の始点 `2` を最後に重複させない形で通過レベルを列挙すると、

```text
2,3,4,5,6,5,4,5,4,3,2,1,2,3
```

となる。対応する hue parameter の角度を度数法とラジアンで書くと次の表になる。

```text
0°     R  = 2  -> 0
15°       = 3  -> π/12
30°       = 4  -> π/6
45°       = 5  -> π/4
60°    Y  = 6  -> π/3
90°       = 5  -> π/2
120°   G  = 4  -> 2π/3
180°   C  = 5  -> π
195°      = 4  -> 13π/12
210°      = 3  -> 7π/6
225°      = 2  -> 5π/4
240°   B  = 1  -> 4π/3
270°      = 2  -> 3π/2
300°   M  = 3  -> 5π/3
```

このラジアン表記は角度単位の換算である。ここでの tone は、純色相環の各辺上で GRB Binary Tone が作る区分線形関数である。

この区分線形関数をラジアン変数で `L(theta) = 7T(theta)` と書くと、三角関数的な座標系に対して次の構造を持つ。ここで `theta` は上で区別した正準 hue parameter であり、六角形点の実偏角 `phi` ではない。

第一に、すべての交点角は `π/12` の格子上にある。純色相環の各辺の角幅は `60° = π/3` であり、各辺の level 変化量は

```text
+4, -2, +1, -4, +2, -1
```

である。したがって、最大変化量 4 の辺では level 交点の最小角度刻みが

```text
(π/3) / 4 = π/12
```

になる。4:2:1 正規化で候補角が 15 度刻みにそろうのは、この `π/12` 格子の帰結である。

第二に、補色半回転に対して

```text
L(theta + π) = 7 - L(theta)
T(theta + π) = 1 - T(theta)
```

が成り立つ。中心化した波形

```text
F(theta) = L(theta) - 7/2
```

で見ると、

```text
F(theta + π) = -F(theta)
```

であり、周期関数として half-wave antisymmetry を持つ。

### Complement Half-Turn and Equitone Chord Symmetry

純色相環 `H` 上の点を、正規化座標を4倍した正準スケール座標

```text
c(h) = GRB(G4,R4,B4),  0 <= G4,R4,B4 <= 4
```

で表す。純色相環では `max(G4,R4,B4) = 4` かつ `min(G4,R4,B4) = 0` である。補色写像

```text
kappa(c) = GRB(4-G4, 4-R4, 4-B4)
```

は、この六角形を中心

```text
m = GRB(2,2,2)
```

のまわりに 180 度回転する中心反転であり、色相角では

```text
kappa(c(h)) = c(h + 180deg)
```

に対応する。この座標上の level を

```text
L(c) = (4G4 + 2R4 + B4) / 4
```

とすると、六角形上の頂点と辺上のすべての点について

```text
L(kappa(c)) = 7 - L(c)
L(h) + L(h + 180deg) = 7
```

が成り立つ。頂点では

```text
R(L2) <-> C(L5)
Y(L6) <-> B(L1)
G(L4) <-> M(L3)
```

であり、15 度刻みの交点でも、たとえば

```text
15deg(L3) <-> 195deg(L4)
30deg(L4) <-> 210deg(L3)
45deg(L5) <-> 225deg(L2)
90deg(L5) <-> 270deg(L2)
```

となる。このため、同一 level の異なる色相点を直線で結んで作る等トーン図形には、次の中心対称な対応が現れる。

```text
L2: {0deg, 225deg, 270deg}   --180deg rotation--> L5: {180deg, 45deg, 90deg}
L3: {15deg, 210deg, 300deg}  --180deg rotation--> L4: {195deg, 30deg, 120deg}
L1: {240deg}                 --180deg rotation--> L6: {60deg}
```

したがって、`L2` と `L5` の 3 点を結ぶ三角形は互いに 180 度回転像であり、`L3` と `L4` の三角形も同じ関係にある。これらの三角形は一般には正三角形ではない。ここで現れるのは、重みなし六角形の全二面体対称性そのものではなく、GRB の `4:2:1` level ラベルを伴う

```text
half-turn + level reversal (L -> 7-L)
```

という中心補色対称性である。

任意の補色対の座標和と中点は

```text
c + kappa(c) = GRB(4,4,4)
(c + kappa(c)) / 2 = GRB(2,2,2) = m
```

で一定になり、その中点 level は

```text
L(m) = (4*2 + 2*2 + 2) / 4 = 7/2 = 3.5
```

となる。画面用の正規化割合では、同じ中点は `GRB(1/2,1/2,1/2)` である。中心化座標

```text
v(c) = c - m
```

を使えば

```text
v(kappa(c)) = -v(c)
v(c) + v(kappa(c)) = 0
```

となるため、「補色同士が打ち消し合う」という記述は、中心化した CHROMALUM ベクトルについて厳密な意味を持つ。一方、中心化していないチャンネル座標の和は `GRB(4,4,4)`、平均は `GRB(2,2,2)` である。この区別により、ベクトル相殺、加法的な白、平均としての中心灰色を同じ補色対称性の異なる表現として整理できる。

#### Equitone Triangle Metric and Area

正準候補から作る等トーン三角形には、補色対称性により `L2` と `L5`、`L3` と `L4` の合同対ができる。正六角形の外接半径を `1` とした辺長二乗と面積は、

| triangle pair | squared side lengths | area |
| --- | --- | ---: |
| `L2 / L5` | `{7,28,49}/16` | `7sqrt(3)/32` |
| `L3 / L4` | `{21,28,49}/16` | `7sqrt(3)/16` |

である。`L3/L4` では

```text
21 + 28 = 49
```

となるため、M と G を直角頂点とする厳密な不等辺直角三角形になる。`L2/L5` では `7+28 != 49` なので直角ではない。また、

```text
Area(L3) = Area(L4) = 2 Area(L2) = 2 Area(L5)
```

が成り立つ。直角性は正六角形へ入れたユークリッド計量に依存するが、すべての図形へ同じアフィン変換を施したときの面積比 `2` は保存される。

2 次元外積 `a cross b = a_x b_y - a_y b_x` を使えば、原点と 2 点 `p,q` が作る三角形の面積は

```text
Area(O,p,q) = abs(p cross q) / 2
```

である。補色変換で両ベクトルを同時に反転しても `(-p) cross (-q) = p cross q` なので、相補三角形の向き付き面積と絶対面積は保存される。

#### L3/L4 Equitone-Ray Rectangle

`L3` の Magenta 頂点から他の `L3` 候補 `15deg`, `210deg` へ引く 2 直線と、`L4` の Green 頂点から他の `L4` 候補 `30deg`, `195deg` へ引く 2 直線を延長する。この 4 直線が作る図形を、Hex タブと同じ正六角形埋め込みで検証する。

六角形の中心を原点、外接円半径を `1`、画面下向きを y 軸の正方向とすると、必要な点は

```text
M    = (-sqrt(3)/2, -1/2)       G    = ( sqrt(3)/2,  1/2)
P15  = ( sqrt(3)/8, -7/8)       P30  = ( sqrt(3)/4, -3/4)
P210 = (-sqrt(3)/4,  3/4)       P195 = (-sqrt(3)/8,  7/8)
```

となる。4 直線を

```text
a = line(M, P15)      b = line(M, P210)
c = line(G, P30)      d = line(G, P195)
```

とすると、180 度中心対称性から

```text
a || d
b || c
```

である。また、M で交わる 2 直線の傾きは

```text
slope(a) = -sqrt(3)/5
slope(b) =  5/sqrt(3)
slope(a) * slope(b) = -1
```

なので直交する。外側の交点を

```text
X = a intersect c = ( 3*sqrt(3)/14, -13/14)
Z = b intersect d = (-3*sqrt(3)/14,  13/14) = -X
```

とすれば、四角形 `M-X-G-Z` の全内角は厳密に `90deg` であり、これは長方形である。

ただし隣接辺長は

```text
|MX| = |GZ| = sqrt(12/7)
|XG| = |ZM| = 4/sqrt(7)
long / short = 2/sqrt(3) ~= 1.1547
```

で等しくないため、正方形ではない。一方、外側 2 頂点について

```text
|X|^2 = (3*sqrt(3)/14)^2 + (13/14)^2 = 1
|Z|^2 = 1
```

となるため、`M`, `X`, `G`, `Z` の 4 頂点はすべて元の六角形と同じ外接円上にある。X 方向の六角形境界は原点から `(7/8)X` の位置にあるので、X と Z は外接半径の `1/8` だけ六角形の外へ出る。

ここには一般定理がある。半径 `r>0` の同じ中心円上の 2 点を `p,q` とし、非退化条件 `p != q` かつ `p != -q` を仮定する。反対点を `-p,-q` とすると、4点は相異なり、四角形 `p-q-(-p)-(-q)` の隣接辺には

```text
(q-p) dot (-p-q) = |p|^2 - |q|^2 = 0
```

が成り立つ。したがって、非退化な同半径の 2 組の反対点から作る中心対称四角形は長方形である。`p=q` では辺が潰れ、`p=-q` では2点しか残らないため、この条件を外して「長方形」とは呼べない。半径 `1` なら辺長二乗は

```text
a^2 = 2 - 2 p dot q
b^2 = 2 + 2 p dot q
a^2 + b^2 = 4 = 2^2
```

となり、直径 `2` に対する三平方の定理が自動的に成立する。面積は

```text
Area = 2 abs(p cross q)
```

である。したがって M/G 構成に固有なのは「単位円上の反対点から長方形ができる」こと自体ではなく、等トーン線の外側交点 `X,Z` が厳密に元の単位円へ戻ること、さらに M/G の等トーン V 字自体が直交することである。

対角点には

```text
M + G = 0
X + Z = 0
```

が成り立ち、長方形の 2 対角線 `MG`, `XZ` はともに長さ `2` の外接円直径として原点で交わる。さらに、色点を結ぶ 3 本の補色対線分

```text
M-G
P15-P195
P210-P30
```

もすべて同じ原点で交わる。各直径の色座標端点は `L3` と `L4` の補色対なので、その中点は共通して

```text
GRB(2,2,2),  L = 3.5
```

である。したがって、正六角形の中心、外接円の中心、長方形の対角線交点、3 本の補色対線分の共点、補色対の平均 `L=3.5` が同一点に一致する。なお、X と Z は 2 次元作図上の交点であって純色相環上の色点ではないため、X と Z 自体には CHROMALUM level を割り当てない。

ここでの `L=3.5` は CHROMALUM の GRB Binary Tone level であり、この中心対称性は離散・区分線形モデル内部の定理である。

![L3/L4 equitone triangles, complement rectangle, and the common L3.5 center](./assets/chromalum-complement-center.svg)

上図では、`L3` と `L4` の等トーン三角形、同一外接円に内接する長方形、3 本の補色対線分が共点となる `GRB(2,2,2)` / `L=3.5` の中心を重ねている。図中の割合表示 `GRB(1/2,1/2,1/2)` は同じ中心の正規化表現である。

#### Complement-Line System and Metric Relations

正準色相閉路上の 14 交点は、180 度回転 `kappa` によって次の 7 本の補色対線分へ分割される。

```text
R-P180(C)        P15-P195        P30-P210        P45-P225
Y-P240(B)        P90-P270        G-P300(M)
```

各線分の GRB 端点を `c`, `kappa(c)` とすると、すべてについて

```text
c + kappa(c) = GRB(4,4,4)
(c + kappa(c)) / 2 = GRB(2,2,2)
L(c) + L(kappa(c)) = 7
L((c + kappa(c)) / 2) = 3.5
```

が成り立つ。したがって、7 本はユークリッド長が同じ線分という意味ではないが、すべて同じ六角形中心を通り、同じ `L3.5` 平均を持つ。7 本という本数は14個の有彩交点を補色反転で2点ずつ組にした結果である。

正六角形の隣接単位頂点を `A,B`、辺上の点を `P(t)=(1-t)A+tB` とすれば、`A dot B=1/2` なので

```text
|P(t)|^2 = 1-t+t^2 = 3/4 + (t-1/2)^2
```

が成り立つ。正準 14 点の半径は `1`, `sqrt(13)/4`, `sqrt(3)/2` の 3 層だけであり、7 本の補色対線分の長さは

| complement segments | length |
| --- | ---: |
| `R-C`, `Y-B`, `G-M` | `2` |
| `P15-P195`, `P45-P225` | `sqrt(13)/2` |
| `P30-P210`, `P90-P270` | `sqrt(3)` |

となる。

同様に、同一 level 上の 2 点 `c1`, `c2` を結ぶ等トーン線と、その補色像を結ぶ線には

```text
kappa(c2) - kappa(c1) = -(c2 - c1)
```

が成り立つ。このため、今回観察した相補的な等トーン線の組を含め、任意の等トーン弦とその補色弦は互いに平行かつ等長である。これは角度や円を使わない中心反転の結果であり、正六角形をアフィン変形しても保存される。

一方、直角、`60deg`、円内接、円周上の等間隔は、正六角形へ導入したユークリッド計量を使う追加構造である。中心反転だけからは導かれないため、次の性質は補色平行性より強い「計量的共鳴」として区別する。

1. 本節で明示した M/G の4支持線作図には、厳密な直角と外接円内接長方形が同時に現れる。
2. 別の L2/L4 組合せでは、正三角形ではない三角形の 1 角として厳密な `60deg` が現れる。
3. M/G 長方形と R/C 垂線長方形を同じ外接円上で比較すると、一方の外側頂点が他方の頂点と R/C 頂点の円弧中点になる。

**検証課題 — M/G 一意性。** 現段階では「この性質を持つのは M/G 組だけ」という定理を置かない。一意性を有限探索で証明するには、少なくとも (i) どの level の候補点を使えるか、(ii) 各 level のどの点を anchor とするか、(iii) 支持線をどの2点から作るか、(iv) 延長・垂線・中点などどの補助作図を許すか、(v) 補色・回転・鏡映を同一視するか、という探索空間と同値関係を先に定義しなければならない。本節が証明するのは上記 M/G 構成の存在と正確な座標だけであり、その探索空間における唯一性は未検証である。実際、後述の R/C 構成でも補助垂線の選び方により複数の円内接長方形が生じる。

##### Exact 60-Degree Intersection from the L2/L4 Construction

Magenta と Blue の中点を

```text
Q = (M + B) / 2 = (-sqrt(3)/2, 0)
```

とする。GRB 座標では `Q = GRB(0,2,4)` なので `L(Q)=2` である。`G-P30` の L4 等トーン線と `Q-R` の L2 等トーン線の外側交点を `W` とすると、

```text
W = line(G, P30) intersect line(Q, R)
  = (sqrt(3)/7, -9/7)
```

となる。三角形 `Q-G-W` の辺長二乗は

```text
|QG|^2 = 13/4
|GW|^2 = 25/7
|WQ|^2 = 81/28
```

で互いに異なるため、これは正三角形ではない。しかし `W` から見た 2 辺には

```text
(G-W) dot (Q-W) = 45/28
|G-W| |Q-W|     = 45/14
cos(angle QWG)  = 1/2
```

が成り立つので、

```text
angle QWG = 60deg
```

である。これは正六角形の見かけから推定した近似値ではなく、`Q(sqrt(3))` 上の厳密な内積恒等式である。180 度回転した補色構成にも同じ `60deg` が現れる。

##### Shared Circumcircle and Exact Arc Bisection

まず、相補平行線と垂線に関する一般定理を分離する。零でない法線 `n != 0` と `h != 0` を取り、原点について対称な相異なる 2 直線を

```text
ell_minus = {p : n dot p = -h}
ell_plus  = {p : n dot p =  h}
```

とし、単位点 `r` が `ell_minus` 上にあるとする。さらに得られる四角形を非退化にするには、鏡映点 `f` が `r` および `-r` と異なることを仮定する。`r` から `ell_plus` へ下ろした垂線の足は

```text
f = r - 2(n dot r)n / |n|^2
```

である。これは中央軸 `n dot p=0` に関する `r` の鏡映なので、

```text
|f| = |r|
```

を満たす。したがって `r-f-(-r)-(-f)` は常に同じ中心円に内接する長方形になる。この円内接性は CHROMALUM 固有ではなく、ユークリッド鏡映がノルムを保存することの一般的帰結である。

R/C 構成では、L2 等トーン線 `R-P225` と、その補色像である L5 等トーン線 `C-P45` がこの相補平行線対になる。`R` から `C-P45` へ下ろした垂線の足を `F` とすると、正確な座標は

```text
R = (0, -1)
C = (0,  1)
F = (39*sqrt(3)/98, -71/98)
```

であり、反対側の足は `-F` である。直接計算すると

```text
|F|^2 = (39*sqrt(3)/98)^2 + (71/98)^2 = 1
```

となるため、`R-F-C-(-F)` は M/G 長方形と同じ単位外接円に内接する長方形である。辺長二乗、三平方、面積は

```text
|R-F|^2 = 27/49
|F-C|^2 = 169/49
27/49 + 169/49 = 4
Area_RC = 39sqrt(3)/49
```

である。辺比は

```text
long / short = 13/(3*sqrt(3)) ~= 2.5019
```

なので、M/G 長方形より細長い。

さらに M/G 長方形の外側頂点

```text
X = (3*sqrt(3)/14, -13/14)
```

を同じ円上で比較する。R から時計回りに測った、この作図に依存する中心角を `vartheta` とすれば、

```text
sin(vartheta) = 3*sqrt(3)/14
cos(vartheta) = 13/14
vartheta ~= 21.786789deg ~= 0.380251207 rad
```

である。倍角公式から

```text
sin(2*vartheta) = 2 sin(vartheta) cos(vartheta) = 39*sqrt(3)/98
cos(2*vartheta) = cos(vartheta)^2 - sin(vartheta)^2 = 71/98
```

となり、これはちょうど `F` の座標に一致する。したがって外接円上の順序は

```text
R(0) -> X(vartheta) -> F(2*vartheta)
C(180deg) -> Z(180deg+vartheta) -> -F(180deg+2*vartheta)
```

であり、`X` と `Z=-X` はそれぞれ隣接する 2 点の厳密な円弧中点である。弦長も

```text
|R-X|^2 = |X-F|^2 = 2 - 2*cos(vartheta) = 1/7
|C-Z|^2 = |Z-(-F)|^2 = 1/7
```

なので、4 区間はすべて

```text
1/sqrt(7) ~= 0.377964
```

に等しい。内積と外積でも

```text
R dot X = X dot F = 13/14
R cross X = X cross F = 3sqrt(3)/14
```

となる。さらに鏡映公式は

```text
F = 2(R dot X)X - R
R + F = (13/7)X
```

と書ける。したがって `OX`、すなわち M/G 長方形の対角線 `XZ` は、R と F、C と `-F` を交換する R/C 長方形の厳密な鏡映軸である。`XZ` は非正方形である M/G 長方形自身の鏡映軸ではないため、一方の図形では対角線、他方の図形では対称軸という二重の役割を持つ。

この `vartheta` は色相閉路の `15deg` 格子や `22.5deg` 分割そのものではなく、指定した二つの等トーン作図を共通外接円上で比較したときに得られる構成依存角である。

もう一方の相補平行線対 `R-P270`, `C-P90` へ同じ垂線作図を適用すると、別の足

```text
J = (4sqrt(3)/7, -1/7)
|J|^2 = 1
```

が得られる。この長方形 `R-J-C-(-J)` には

```text
|R-J|^2 = 12/7
|J-C|^2 = 16/7
```

が成り立ち、M/G 長方形と合同である。したがって補助垂線を許す場合、R/C 垂線長方形は一意ではない。一方、R/C の 4 本の等トーン支持線を垂線なしでそのまま交差させると、長方形ではなく非円内接の平行四辺形になる。ここでは「R/C 等トーン線の四角形」と「R/C 相補平行線へ垂線を加えた長方形」を区別する。

##### Quadratic Norm and Rotation Orbit

`u=x/sqrt(3)` と置けば、単位円方程式は

```text
3u^2 + y^2 = 1
```

になる。`X`, `F`, `J` の単位円恒等式は、それぞれ

```text
13^2 + 3*3^2  = 14^2
71^2 + 3*39^2 = 98^2
 1^2 + 3*4^2  =  7^2
```

という一般化された三平方型の式である。前節までの画面複素座標 `z=x+iy` では `R=-i` である。回転軌道を R を位相 `0` の基準点として記述するため、全点を `90deg` 回転した座標

```text
z_tilde = i z
```

をここで導入する。この共通回転はノルムと点間角を変えず、`z_tilde(R)=1` となる。上の構成依存角に対応する複素数を

```text
q = exp(i*vartheta) = (13 + 3i*sqrt(3)) / 14
```

とすると、

```text
q^2 = (71 + 39i*sqrt(3)) / 98
```

が回転座標上の R/C 点 `F` を与える。すなわち、この座標規約では

```text
z_tilde(R) = 1
z_tilde(X) = q
z_tilde(F) = q^2
```

である。また正六角形の `60deg` 回転を掛ければ、

```text
q * (1+i*sqrt(3))/2 = (1+4i*sqrt(3))/7
```

となり、M/G の 2 直径間角 `delta = vartheta + pi/3` に対する

```text
cos(delta) = 1/7
sin(delta) = 4sqrt(3)/7
```

が得られる。したがって `X`, `F`, M/G の直径角は、二次体 `Q(sqrt(-3))` のノルム

```text
Norm(a+i*sqrt(3)b) = a^2 + 3b^2
```

が `1` になる同じ構造で統一できる。

`z_tilde` 単位円上では

```text
R : 1
X : q
F : q^2
```

という回転軌道になる。`q^n = c_n+i*sqrt(3)s_n` と書けば、

```text
[c_(n+1)]   1  [13 -9] [c_n]
[s_(n+1)] = -- [ 3 13] [s_n]
             14
```

であり、二次形式

```text
c_n^2 + 3s_n^2 = 1
```

を保存する。各成分は

```text
u_(n+1) = (13/7)u_n - u_(n-1)
```

という Chebyshev 型漸化式も満たす。`cos(vartheta)=13/14` から `vartheta/pi` は無理数なので、この回転を数学的に反復した点列は有限正多角形として閉じない。ただし `q^3,q^4,...` は正準 CHROMALUM 色点ではなく、単位円上への数学的外挿である。

![M/G and R/C rectangles on the same circumcircle](./assets/chromalum-shared-circumcircle-rectangles.svg)

上図では、M/G と R/C の 2 長方形、共通外接円、直径となる各対角線、共通中心 `O` を重ねている。「円に接する」とは接線になることではなく、各長方形の 4 頂点が同じ円周上にある、すなわち同じ円に内接することを意味する。

### Periodic and Fourier Representations

正準 hue parameter `theta` をラジアン周期変数として使うと、単位円と六角形境界の違いを Fourier 成分で厳密に表せる。比較対象となる単位円パラメータを

```text
z_U(theta) = -i exp(i theta)
```

なので基本波 `n=1` だけを持つ。一方、正六角形の各辺を `theta` に対して一定速度で進む複素座標 `z_H(theta)` は

```text
z_H(theta + pi/3) = exp(i*pi/3) z_H(theta)
```

を満たし、

```text
z_H(theta) = -(9i/pi^2) sum_(k in Z) exp(i(1+6k)theta)/(1+6k)^2
```

と展開できる。許される Fourier 次数は

```text
n = ..., -11, -5, 1, 7, 13, ...
n = 1 mod 6
```

だけである。係数が `1/n^2` で減衰するのは、六角形経路が連続だが頂点で一次微分が跳ぶ区分線形関数だからである。したがって、単位円は純粋な基本波、正六角形は `6` 回回転共変な高調波を加えて直線辺と角を作った波形として区別できる。

中心化した Tone Zigzag

```text
F(theta) = L(theta) - 7/2
```

には `F(theta+pi)=-F(theta)` があるため、平均値と全偶数高調波が消える。Fourier 級数を

```text
F(theta) = sum_(n>=1) (a_n cos(n theta) + b_n sin(n theta))
```

と書くと、偶数 `n` では `a_n=b_n=0` であり、奇数 `n` では

```text
n = 1 mod 6 : a_n = -3/(pi^2 n^2),  b_n =  9sqrt(3)/(pi^2 n^2)
n = 3 mod 6 : a_n = -84/(pi^2 n^2), b_n =  0
n = 5 mod 6 : a_n = -3/(pi^2 n^2),  b_n = -9sqrt(3)/(pi^2 n^2)
```

となる。ここには、

1. 補色半回転によって偶数高調波が消える。
2. 6 辺構造によって奇数次数が `n mod 6` の 3 系列へ分かれる。
3. 区分線形性によって振幅が `1/n^2` で減衰する。

という選択則がある。Tone Zigzag は単一の正弦波ではないが、補色対称性と `4:2:1` の辺変化を反映した正弦波の厳密な無限和である。偶数次数の消滅、`n mod 6` の選択則、`1/n^2` の減衰は構造的である。一方、個々の `a_n,b_n` の符号と sin/cos への配分は、Red を原点、`R -> Y` を正方向とした E1 の座標代表に依存し、原点移動や向きの反転で変換される。

正準 hue parameter による一周平均は

```text
average(L) = 7/2
average((L-7/2)^2) = 7/4
average(L^2) = 14
average(T) = 1/2
variance(T) = 1/28
```

となる。また一周の level 変化

```text
+4, -2, +1, -4, +2, -1
```

には

```text
total rise = 7
total fall magnitude = 7
total variation = 14 = 2(4+2+1)
```

が成り立つ。これは閉じた周期関数を一周集計した恒等式である。

### Invariants and Symmetry Scope

以上の性質は、依存する構造ごとに次の層へ分かれる。

| layer | structures and invariants |
| --- | --- |
| ordered discrete algebra | A1 と A2 が収束した名前付き GRB `4:2:1`、XOR、Gray-type chromatic `C6`、`L -> 7-L` |
| affine | midpoint, concurrency, parallelism, line ratio, equitone planes, area ratios |
| Euclidean | norm, inner product, outer product, right angle, `60deg`, circle, chord, absolute area |
| periodic representation | Fourier spectrum and harmonic decomposition under the chosen hue parameter |

GRB 空間で `w=(4,2,1)` とすれば、正規化 level は

```text
L(c) = w dot c
```

である。同じ level の変位 `d` は `w dot d=0` を満たすため、等トーン集合は平行平面であり、同じ平面内のアフィン結合は level を保存する。binary cube の辺で G/R/B を切り替えた level 変化は `+/-4`, `+/-2`, `+/-1` なので、level は頂点上の離散スカラーポテンシャルとして

```text
sum_path Delta L = L(end) - L(start)
sum_closed_loop Delta L = 0
```

を満たす。これは経路独立な代数的不変量である。

対称性も対象ごとに異なる。

| object | symmetry |
| --- | --- |
| unit circle without labels | continuous `O(2)` |
| unlabeled regular hexagon | dihedral `D6` |
| canonical 14-point set with level map `lambda` | `C2`-equivariance: point half-turn `kappa` is paired with label reversal `tau(L)=7-L` |
| one nonsquare rectangle | two mirror axes and a half-turn, `D2` |
| overlaid M/G and selected R/C rectangles | generally only the common half-turn `C2` |

`4:2:1` の 3 重みはすべて異なるため、無ラベル六角形の G/R/B 交換対称性と鏡映対称性の多くを破る。CHROMALUM 全体の基本関係は、軸対称よりも

```text
central inversion + level reversal (L -> 7-L)
```

と表す方が正確である。写像としては

```text
lambda(kappa(c)) = tau(lambda(c)),  tau(L)=7-L
```

であり、`lambda` は点集合と level 集合上の二つの `C2` 作用に関して equivariant である。level 名を点ごとに固定して動かさない意味では、`kappa` はラベル保存対称性ではない。指定した部分図形には局所的な鏡映軸が現れ、特に M/G の `XZ` が選択した R/C 長方形の鏡映軸になるが、この軸は level 付き 14 点集合全体の対称軸ではない。

ここまでで、一般数学と CHROMALUM 固有の選択も区別できる。相補平行線への垂足が鏡映点になること、同半径の反対点四角形が長方形になること、単位円射影が正弦波になることは一般定理である。この付録で CHROMALUM に固有なのは、`4:2:1` が選んだ有限候補へ、明示した等トーン線・垂線・座標代表を適用したときに得られる具体的な座標と係数である。これらは中核 valuation の独立な根拠ではない。

## Model Integration and Derived Representations

本節は新規性の一覧ではなく、中核定理からどの統合関係と派生表示が得られるかを階層化する。RGB cube、3-bit GRB palette code、Boolean/F2^3、Fano/Hamming、一般の正規化線形補色恒等式は既知または初等的な構造である。ここで評価するのは個々の構造の発明ではなく、二経路の収束を共通座標として用いた接続である。

### Integration 1: Two-Route Recovery of the Named GRB Rank

GRB Binary Tone は、チャンネルを `[G,R,B]` の 3 ビットとして読み、

```text
level = 4G + 2R + B
T = level / 7
```

と定義する。この名前付き式は、無名の最小部分和重み `{1,2,4}` と、明るさ順位 `K<B<R<M<G<C<Y<W` を0..7で数える順位写像という二経路から得られる。したがって、3 ビット番号 `4G + 2R + B` は、8 つの RGB 頂点の明るさ順位と tone 順の両方に一致する。

この番号付けは NEC 1981 と ZX Spectrum 1982 の一次資料に完全一致するため、番号配列の発明ではない。本モデルの統合点は、数学が無名の重みを与え、色の順序が独立に名前付き順位を与える収束を定理化し、この番号を後続する tone、ファイバー、有限幾何の共通座標として用いることにある。

### Organizing Relation 2: Complement Identity

色 `c = (G,R,B)` の補色を

```text
c' = (1-G, 1-R, 1-B)
```

とすると、

```text
T(c) + T(c') = 1
```

が成り立つ。

```text
T(c') = (4(1-G) + 2(1-R) + (1-B)) / 7
      = 1 - T(c)
```

したがって補色対のトーン和は、正準形では常に `1` である。ただし Core Theorem 2 が示すように、この恒等式は `4:2:1` 固有ではなく、重み和で正規化した任意の線形 score に成り立つ。本モデルでは、この一般恒等式を GRB rank、純色相環の半回転、ファイバー対応、section、サイコロ構成の共通関係として用いる。

この定理は 8 頂点のビット色だけでなく、純色相環の `0..4` スケール座標全体へ区分線形に拡張される。そのとき level 和は常に `7`、補色対の中点は `GRB(2,2,2)`、中点 level は常に `3.5` となる。整数 level の候補交点は、この連続的な対称性の有限部分集合である。詳細は「Complement Half-Turn and Equitone Chord Symmetry」を参照。

### Derived Representation 3: Continuous Tone Zigzag on the Pure-Hue Loop

有限代数の元へ直接実数係数を掛けるのではなく、まず特性ベクトルによる標準埋め込み

```text
iota : A -> {0,1}^3 subset R^3
```

を用いる。頂点列を `c0=R,c1=Y,c2=G,c3=C,c4=B,c5=M` とし、添字を6を法として、各辺を

```text
gamma_i(u) = (1-u)iota(c_i) + u iota(c_(i+1)),  0 <= u <= 1
H = union_i gamma_i([0,1])
```

と補間する。`H` が純色相環である。アフィン汎関数

```text
lambda(x_G,x_R,x_B) = 4x_G + 2x_R + x_B
```

は `iota(A)` 上で `L` に一致するので、

```text
lambda(gamma_i(u)) = (1-u)L(c_i) + u L(c_(i+1))
Delta L = (+4,-2,+1,-4,+2,-1)
```

となる。符号は Boolean 包含の向き、絶対値はその辺で切り替わる一原色ビットの重みを表す。したがって同じ六辺差分表が、区分線形な Tone Zigzag と、次節の符号保存格子実現の両方を支える。

二値補色は、立方体上のアフィン写像

```text
kappa_bar(x) = 1-x
```

として `H` へ延長する。このとき

```text
kappa_bar(gamma_i(u)) = gamma_(i+3)(u)
```

である。純色相環全体を `h in R/Z` で媒介し、`T(h)=lambda(gamma(h))/7` と置けば、

```text
gamma(h+1/2) = kappa_bar(gamma(h))
T(h+1/2) = 1-T(h)
```

が成り立つ。

整数 level `1,...,6` のファイバー数は `1,3,3,3,3,1`、合計14である。半開区間 `0<=h<1` を `h=0` から一周して各交点を読むと、

```text
2,3,4,5,6,5,4,5,4,3,2,1,2,3
```

となる。これが Theory 図上端の14交点列 `23456545432123` である。純色相環 `H` 単独の level `0,...,7` に対するファイバー数は

```text
(0,1,3,3,3,3,1,0)
```

であり、`K,W` は `H` に属さない。端点集合 `D0={K}`, `D7={W}` を別に加えた拡張候補集合ではじめて

```text
(1,1,3,3,3,3,1,1)
```

となる。この二つを同じ「純色相環の候補数」と呼ばない。

### Derived Representation 4: Chromatic C6, Hue-Order Net, and the Folded Die

有彩6-cycle

```text
R -> Y -> G -> C -> B -> M -> R
```

の閉辺 `M--R` を切ると、六色を一度ずつ通る色相路

```text
R -> Y -> G -> C -> B -> M
```

が得られる。ここで離散代数から自動的に従うのは、差分の符号と絶対値がそれぞれ包含方向と切替チャネルを記録するところまでである。平面上の進行方向を得るには、次の追加規則を明示する。

**定義（符号保存格子実現）。** 色相路の各頂点を、整数格子上の単位正方形面へ対応させる。連続する面は一辺全体を共有し、正の level 差を固定した一方の格子方向 `e_+=(1,0)`、負の level 差をそれと直交する固定方向 `e_-=(0,1)` へ対応させる。各ステップの絶対値 `4,2,1` は移動距離ではなく、共有辺に付随する切替チャネル `G,R,B` のラベルとして保存する。

`M -> R` を切り、`R` 面の左下隅を原点に取ると、この規則は六面の左下隅を順に

```text
R₂:(0,0), Y₆:(1,0), G₄:(1,1),
C₅:(2,1), B₁:(2,2), M₃:(3,2)
```

へ置く。したがって次の2-2-2型階段状展開図になる。

```text
R2  Y6
    G4  C5
        B1  M3
```

Theory 図では同じ面集合を横長に読むため、画面座標の下向きを正の `y` として、全体へ約45度の剛体回転を施す。正差分方向と負差分方向はそれぞれ

```text
d_+ = (1,-1)/sqrt(2)   // 右上
d_- = (1, 1)/sqrt(2)   // 右下
```

へ写り、共通の尺度 `1/sqrt(2)` を省けば面の基準点は

```text
R₂:(0,0), Y₆:(1,-1), G₄:(2,0),
C₅:(3,-1), B₁:(4,0), M₃:(5,-1)
```

と左から右へ進むジグザグになる。これは研究用座標で与えた2-2-2展開図全体の平面回転であり、面隣接、折り畳み、handedness を変えた別の cube net ではない。

符号だけがこの二つの平面方向を強制するわけではない。上の座標は、正負それぞれへ固定方向を割り当てること、二方向を非退化に直交させること、単位正方形の内部を重ねずに一辺共有だけで単純な連結面集合を作ること、という条件を加えた実現である。その条件の下では、回転・鏡映・軸交換で同一視される、追加の折れや余分な格子長を持たない自然な最小実現として2-2-2階段形を選ぶ。これは符号列だけから全ての平面埋め込みが一意に決まるという主張ではない。

五つの共有辺に沿って折り畳むと立方体になり、閉路上で三歩隔たる `R/C`, `Y/B`, `G/M` が三組の対面になる。したがって構成の論理順は、完成済みのダイスを展開して色相順を読み取る向きではなく、離散 `C6` の包含・切替データに符号保存格子実現を追加し、その展開図から立方体を折り、面へ順位を記して Color Die を得る向きである。

有彩色 6 色を tone の昇順に 1 から 6 として並べる。

```text
B < R < M < G < C < Y
```

補色は tone 順序を反転するため、補色ペアは必ず順位和 7 になる。

```text
B(1) + Y(6) = 7
R(2) + C(5) = 7
M(3) + G(4) = 7
```

六有彩色を立方体の六面へ、三つの補色対がそれぞれ対面になるよう配置し、色 `c` の面番号を tone 順位 `L(c)` とする。このとき

```text
L(kappa(c)) = 7-L(c)
```

なので、各対面の番号和は自動的に7になる。これは標準的な六面サイコロの対面規則と一致する。したがってサイコロ表示は、標準面番号を先に仮定しただけではなく、「補色を対面へ置く幾何配置」と「補色 rank 反転」が標準ダイスの対面和へ一致する直接的な系である。三補色軸の配置は立方体回転で同一視でき、左右の handedness まで区別する場合は鏡映を追加して比較する。

立方体には8頂点があり、各頂点からは、その頂点に接する三面が一つの局所 view として見える。Color Die の8 view はこの全頂点を尽くす。二つの view は三原色 `R,G,B` と三二次色 `C,M,Y` がそれぞれ会する頂点を示し、残る六つは、異なる二原色とその join、または異なる二次色とその meet を一組として示す。ここで演算の一致は全域の規則ではなく、次の前提を満たす組に限られる。

```text
distinct a,b in {R,G,B}:  a∧b=K  =>  a∨b=a⊕b
distinct a,b in {C,M,Y}:  a∨b=W  =>  a∧b=XNOR(a,b)
```

したがって各 view 上の矢印は、一般的な「XOR混色」や「AND混色」を主張するものではなく、支持が互いに素な原色対と、全ビットを覆う二次色対における限定的一致を可視化する。三入力 view も、`R∨G∨B=R⊕G⊕B=W` と `C∧M∧Y=K` を別々に示し、二入力の XNOR 条件を三入力へ拡張しない。

#### Appendix detail: Classification boundary for the hue-order net

前節で Theory 表示に用いた色相路をサイコロの面隣接木として要求すると、6面の隣接5本がすべて使われるため、面隣接木全体はこの Hamilton path に固定される。しかし、その抽象的な面隣接木だけから平面格子上の向きは決まらない。2-2-2階段形は、前節の符号保存格子実現、すなわち正負ごとの固定方向、直交する非退化な二方向、内部の重ならない単位正方形連結を追加したときの自然な最小代表である。

Theory タブに必要なのは、符号と絶対値の代数的意味、追加した格子規則、研究用階段座標と横長ジグザグ表示が同じ net の平面回転であること、`C6 -> path -> net -> folded die` という構成方向である。11種類の自由立方体展開図の列挙、切断辺を変えた場合の分類、回転・鏡映・軸交換を除く同値関係、上の追加条件の下での最小性・一意性の厳密な証明は研究層の補題として分離し、機械検証で支える。

### Derived Representation 5: Parity Tetrahedra and the Color Star

距離分解そのものと辺数の証明は中核部の `K8 Distance Partition` に置く。ここで追加するのはその表示である。`T0` モードは偶数パリティ部分群 `ker(pi) ~= V4` の4頂点・6辺・4面だけを、`T1` モードはその奇剰余類の4頂点・6辺・4面だけを示す。両者を同じ立方体投影で重ねると、距離2の12辺からなる stella octangula、すなわち Color Star が得られる。

```text
T0 mode -> even-parity tetrahedron
T1 mode -> odd-parity coset tetrahedron
compound -> Tet(T0) union Tet(T1) = distance-2 layer
K8 mode -> distance 1 union distance 2 union distance 3
```

この分離により、「二四面体である」という代数的分解と、「星形八面体に見える」という複合表示を同一視せず、前者から後者を構成できる。

### Derived Representation 6: Color Die--Octahedron Duality

Color Die を立方体セル複体 `D` とし、その組合せ論的双対を `D*` とする。立方体の6面は双対の6頂点へ、12辺は双対の12辺へ、立方体の8頂点は双対の8三角形面へ移る。したがって `D*` は八面体セル複体である。

Color Die では補色対 `R/C`, `G/M`, `B/Y` が対向面なので、双対八面体ではそれらが三本の対頂点軸になる。補色でない有彩面はすべて立方体上で隣接するため、双対の1-skeletonは

```text
K_(2,2,2) = K6 minus {R-C, G-M, B-Y}
```

であり、これは八面体グラフである。

ダイスの各頂点には三補色対から一面ずつ選ばれた三面が接する。選択は `2^3=8` 通りあり、双対八面体の8三角形面に対応する。各軸で原色側を選んだかを三ビットとして面へラベル付けすると、隣接する三角形面は一軸だけが異なるので、

```text
face-adjacency(D*) ~= Q3
```

となる。標準 RGB cube から `K/W` を除いた6頂点の凸包も、中心化すれば独立な三ベクトルの反対対 `{±v_B,±v_R,±v_G}` となるため、同じ面束を持つアフィン八面体である。ただし標準 RGB 計量では非補色辺の長さが `1` と `sqrt(2)` に分かれ、正則ではない。Theory 図は面頂双対を読みやすくする正則 cross-polytope 実現を用い、二つのユークリッド埋め込みを同一視せず、6面と6頂点、12辺と12辺、8頂点と8面、補色軸、面隣接 `Q3` の対応を表示する。

## Derived Theorems for the Continuous Representation

### Theorem 3: Pure-hue integer fibers and the 14 intersections

A0、A2、A3 のもとで、純色相環

```text
H = union_i [v_i,v_(i+1)]
lambda = L|H
C_L = {c in H | lambda(c)=L},  L=1,...,6
```

を取る。このとき整数 level ファイバーは

| `L` | canonical hue parameters in `C_L` | `|C_L|` |
| ---: | :--- | ---: |
| 1 | `240deg` | 1 |
| 2 | `0deg, 225deg, 270deg` | 3 |
| 3 | `15deg, 210deg, 300deg` | 3 |
| 4 | `30deg, 120deg, 195deg` | 3 |
| 5 | `45deg, 90deg, 180deg` | 3 |
| 6 | `60deg` | 1 |

であり、`H` 上の相異なる整数 level 交点は合計14個である。表の角度名は E1 の座標代表を用いた表示であり、交点数とファイバー構造そのものは E1 に依存しない。さらに `D_0={K}`, `D_7={W}`, `D_L=C_L` とすれば、

```text
(|D_0|,...,|D_7|) = (1,1,3,3,3,3,1,1).
```

**Proof.** 六辺を `0<=t<=1` で向き付きにパラメータ化すると、level はそれぞれ

```text
R-Y: 2+4t    Y-G: 6-2t    G-C: 4+t
C-B: 5-4t    B-M: 1+2t    M-R: 3-t
```

である。各式を整数 `L=1,...,6` について解き、共有頂点を一度だけ数えると表の角度を得る。各辺で level は非定数一次関数なので、それ以外の解はない。個数の和は `1+3+3+3+3+1=14`。K と W は H に属さず、それぞれ単元集合として加えるため拡張ファイバー列を得る。QED.

### Theorem 4: The 81 full sections

`D=disjoint union_(L=0)^7 D_L` とし、射影 `pi_D:D->{0,...,7}` を `pi_D(c)=L` for `c in D_L` とする。全 palette section を

```text
s:{0,...,7}->D
pi_D(s(L))=L
```

で定義すると、その総数は81である。

**Proof.** 各 level での選択は独立なので、積の法則と Theorem 3 から

```text
number of sections = product_(L=0)^7 |D_L|
                   = 1*1*3*3*3*3*1*1
                   = 81.
```

QED.

### Theorem 5: The 9 complement-equivariant sections

補色写像を K/W を含む D 全体へ延長すると、Theorem 2 と純色相環の半回転から各 L について全単射

```text
kappa:D_L -> D_(7-L)
```

を得る。補色 equivariant な section、すなわち

```text
s(7-L) = kappa(s(L))
```

を満たす section はちょうど9個である。

**Proof.** `L=0,1,2,3` の値を選べば、式が `L=7,6,5,4` の値を一意に決める。逆に任意の equivariant section はこの形である。したがって

```text
number = |D_0|*|D_1|*|D_2|*|D_3|
       = 1*1*3*3
       = 9.
```

QED. この9という数は palette sections の定理である。

### Theorem 6: Complement rank sum

6有彩色へ制限した `L` は昇順 rank `L(c) in {1,...,6}` を与える。このとき

```text
L(c) + L(c') = 7.
```

**Proof.** Theorem 2 により補色は `T` を `1-T` へ写すため、6元の strict order を反転する。6元 chain の順序反転 involution は rank `k` と `7-k` を対にする。QED.

**Corollary 6.1: Complement-face die construction.** 六有彩色を立方体六面へ補色対が対面になるよう配置し、色 `c` の面へその rank `L(c)` を記す。Theorem 6 により対面番号は `L(c)` と `7-L(c)` なので、各対面和は7となり、標準六面サイコロの規則と一致する。補色対面配置は幾何的な追加実現だが、対面和7はその配置上で rank 反転から自動的に従う。配置は立方体回転で同一視でき、handedness を区別するときは鏡映まで含めて比較する。

## Correspondence Table

| Structure | Objects | Color interpretation |
| :--- | :--- | :--- |
| Boolean lattice B3 | subsets of `{G,R,B}` | channels present in a color |
| GF(2)^3 | 8 toggle masks / transformations | composition and cancellation of the three primary toggles; evaluation at K recovers the 8 state labels |
| Q3 cube | Hamming distance 1 graph | single-channel toggles |
| Gray-type chromatic `C6` | six chromatic vertices with one-bit edges | hue order R -> Y -> G -> C -> B -> M; not a full 8-word Gray code |
| Pure-hue-loop tone intersections | intersections with the pure-hue loop | fiber counts 0,1,3,3,3,3,1,0; adjoining the separate endpoints K/W gives 1,1,3,3,3,3,1,1 |
| Fano plane PG(2,2) | 7 nonzero masks | nonidentity toggles; line triples compose to identity |
| Hamming [7,4,3] | `ker H` for the 7 nonzero columns of `F2^3` | Fano triples give `d_min=3`; a nonzero syndrome `s` labels position `j=4s_G+2s_R+s_B` |
| Octahedron | regular cross-polytope realization of 6 chromatic labels | three complement axes R-C, G-M, B-Y; the six RGB-cube vertices also form an affine but nonregular octahedron |
| Tetrahedra T0/T1 | even/odd parity split | two inscribed tetrahedra |
| Stella octangula | distance 2 edges | two-channel flips |
| K8 | all pairs of 8 colors | distance 1/2/3 decomposition |

## Evidence Boundary

中核定理が使う外部的内容は、正の加法的スコアが `w_G>w_R+w_B` と `w_R>w_B>0` を満たすという順序条件だけである。個別規格の係数値や信号領域との比較は本ノートの数学には不要なので含めない。外部資料との照合と新規性評価は [先行研究ノート](./prior-art-algebraic-color-model.md) に分離する。

## Scope and Open Problem

本モデルの基礎対象は、8個の二値RGBラベルからなる Boolean algebra `A=P({G,R,B})` である。生成 `Gamma(S)=∨_{c in S}e_c` と反転作用 `tau_m(x)=x△m` は同じ3ビット carrier を使うが、前者は三原色から状態を生成し、後者は生成済み状態を動かす。XORは任意色や顔料の混色則ではない。

純色相環 `H` は `A` の標準立方体実現へ加えた連続表示層である。同じ level の複数候補は `lambda` のファイバーに属する表示代表であり、`A` の新しい元でも XOR の被演算子でもない。GRB Binary Tone は二値頂点の明るさ順位と部分和構造を記録する順位座標であり、一般の色知覚全体を記述する尺度ではない。

Fano/Hamming、RGB cube、歴史的なGRB番号列は既知構造である。本ノートの中心は、無名の最小無隙間 valuation と独立な色順序が同じ名前付き順位 `4G+2R+B` へ収束し、その順位を補色、純色相環ファイバー、有限幾何の共通座標として使えることにある。色相の原点と向きは表示座標を決めるが、重みの割当には関与しない。

未解決なのは、付録層の M/G 長方形が、許される補助作図と同値関係を先に定義した探索空間で一意かどうかである。現状は具体的構成の存在と正確な座標だけを主張する。

## Implementation Notes

The current CHROMALUM implementation stores the core data and invariants in:

```text
src/chromalum-color-model.ts
src/color-engine.ts
src/data/theory-data.ts
src/components/TheoryPanel.tsx
src/components/theory/
src/i18n/ja.ts
src/i18n/en.ts
src/data/__tests__/theory-data.test.ts
src/data/__tests__/boolean-color-algebra.test.ts
src/i18n/__tests__/theory-copy.test.ts
src/components/__tests__/TheoryPanel.test.tsx
src/components/theory/__tests__/
src/__tests__/chromalum-color-model.test.ts
src/__tests__/research-note-invariants.test.ts
```

Important invariants currently tested include:

1. The unique unnamed positive subset-sum weights filling `0..7` are `{1,2,4}`.
2. The binary-vertex brightness order `K<B<R<M<G<C<Y<W` independently gives `level=4G+2R+B`; comparison with the unnamed subset-sum theorem identifies the same weights as `B=1,R=2,G=4`. For disjoint primary joins, `L(M)=3,L(C)=5,L(Y)=6,L(W)=7`.
3. On all 12 edges of `Q3`, toggling channel `c` satisfies `Delta L=(1-2x_c)w_c` and `|Delta L|=w_c`. Independently of rank encoding, the raw binary vertices other than `000` and `111` induce a connected `C6` with one channel flip per edge and two opposite edges per channel. Re-rooting rotates the color path and toggle phase together; reversal reverses both. The resulting label class contains all six channel permutations, so the cycle does not choose bit priority. In the displayed representative, `R_2->Y_6->G_4->C_5->B_1->M_3->R_2` has signed differences `(+4,-2,+1,-4,+2,-1)`: the alternating signs record `R⊂Y⊃G⊂C⊃B⊂M⊃R`, while absolute values identify toggles `G,R,B,G,R,B`. The toggles and signed differences both close, and the circuit has total variation 14.
4. The three primary involutions generate exactly seven nonidentity toggle patterns in layers `3+3+1`; Fano lines form a Steiner triple system whose three corresponding toggles compose to `id_A`.
5. Complementation `lv xor 7` reverses the six chromatic tone ranks. Placing complementary colors on opposite cube faces and numbering each face by `L` makes every opposite pair sum to 7, matching the standard-die rule up to cube symmetry and handedness. The eight local three-face views exhaust the cube vertices; their OR/XOR and AND/XNOR coincidences retain the premises `a∧b=K` and `a∨b=W`, respectively.
6. CMY line is treated as an even-parity tetrahedron rather than a literal Euclidean plane slice.
7. The chromatic `C6` uses only one-bit flips and is not asserted to be a full 8-word Gray code.
8. Pure-hue-loop tone intersections use exact `0..4` CHROMALUM channels, land on the 15-degree grid, and have fiber counts `0,1,3,3,3,3,1,0`; adjoining the separate endpoint sets `{K}` and `{W}` gives the extended candidate counts `1,1,3,3,3,3,1,1`. These candidates are representatives in fibers of `λ`, not extra elements of `A`.
9. K8 edges partition by Hamming distance.
10. `T0=ker(pi)={K,M,C,Y}` is closed under XOR and isomorphic to `V4`; `T1=B xor T0={B,R,G,W}` is its odd coset. Their separate 4-vertex, 6-edge, 4-face displays compound to the 12-edge distance-2 layer.
11. The Color Die and octahedron data realize combinatorial duality: six die faces correspond to six octahedral vertices, twelve die edges to twelve octahedral edges, eight die vertices to eight triangular faces, complement pairs to antipodal axes, and octahedral face adjacency to `Q3`.
12. In fixed `[G,R,B]` order, `M=011` and `Y=110` give `M AND Y = R = 010` and also `XNOR(M,Y)=R`; over all 64 ordered pairs, `OR=XOR iff AND=K` and `AND=XNOR iff OR=W`, while enumeration of all 16 channelwise binary Boolean functions leaves exactly XOR/OR for the distinct RGB-primary pairs and AND/XNOR for the distinct CMY-primary pairs.
13. The seven colored nonzero vectors are the columns of a rank-three parity-check matrix `H`; `dim ker H=4`, Fano triples give minimum distance three, and therefore `ker H` is Hamming `[7,4,3]`. Hamming labels are coordinate positions, not color codewords; for `r=c xor e`, syndrome `s=Hr^T=He^T=(s_G,s_R,s_B)` selects position `j=4s_G+2s_R+s_B` for a single error.
14. The sign-preserving lattice rule maps positive and negative level differences to fixed orthogonal unit-grid directions. Cutting `M->R` then places the six faces at `(0,0),(1,0),(1,1),(2,1),(2,2),(3,2)`, producing the displayed 2-2-2 staircase. In screen coordinates, the Theory figure rigidly rotates the same net so the two directions become upper-right and lower-right and the path reads left-to-right; this is not a different cube net. The staircase is the natural minimal representative under fixed-direction, nondegeneracy, and simple unit-square-connectivity conditions, up to rotation, reflection, and axis exchange; the sign sequence alone does not force a planar direction. Cube-face spanning trees separately enumerate the 11 free cube nets.

`src/__tests__/research-note-invariants.test.ts` は、81 個の full section と 9 個の補色 section、等 tone 三角形の計量、M/G 長方形の座標・直交性・共通単位円、Tone Zigzag の統計量と Fourier 係数を数値許容差つきで回帰検査する。これは導出を実装から独立に再計算する保護層だが、形式証明ではない。検証課題に下げた M/G の大域的一意性は、依然として機械検証済みの主張ではない。将来は symbolic / exact-arithmetic 検査を併設すれば、長い幾何恒等式に対する浮動小数点許容差への依存をさらに減らせる。

## References

### Primary historical sources for the 3-bit palette code

- Nippon Electric Co. 1981. *PC-8001B N-BASIC Reference Manual*, PTS-069. Table 2-1 `COLOR Options`, printed p. 2-4 (scan p. 27), gives `0 Black, 1 Blue, 2 Red, 3 Magenta, 4 Green, 5 Cyan, 6 Yellow, 7 White`. [Archived scan](https://archive.org/details/pc-8001b-n-basic-reference-manual-nec-en-1981), [PDF mirror](https://oldcrap.org/wp-content/uploads/2024/07/nec-pc8001b-nbasic-reference-manual.pdf).
- Vickers, Steven. 1982. *Sinclair ZX Spectrum BASIC Programming*. Edited by Robin Bradbeer. Sinclair Research Ltd. Chapter 16 `Colours` gives the same `0..7` sequence and explains additive code composition, including Magenta `3 = Blue 1 + Red 2`; Appendix E identifies the Green, Red, Blue bit order. [Original-edition scan](https://www.retroisle.com/sinclair/zxspectrum/OriginalDocs/ZXSpectrum48K%20Manual.pdf), [Chapter 16](https://worldofspectrum.org/ZXBasicManual/zxmanchap16.html), [Appendix E](https://worldofspectrum.org/ZXBasicManual/zxmanappe.html).

These sources establish prior existence, not the first historical origin of the ordering.

### Color geometry, algebra, coding, and polyhedra

- Smith, Alvy Ray. 1978. “Color Gamut Transform Pairs.” *Computer Graphics* 12(3), Proceedings of SIGGRAPH 1978, 12–19. RGB cube / HSV / hue hexagon. [Author PDF](https://alvyray.com/Papers/CG/color78.pdf). [DOI: 10.1145/965139.807361](https://doi.org/10.1145/965139.807361).
- 玉垣庸一・小原康裕・宮崎紀郎. 2000.「CMYカラーキューブに基づく新たなカラーモデル II」『日本デザイン学会研究発表大会概要集』47, 290–291. Boolean lattice / Hasse / RGB-CMY duality. [DOI: 10.11247/jssd.47.0_290](https://doi.org/10.11247/jssd.47.0_290).
- Taylor, Ron. 2013. “Color Addition Across the Spectrum of Mathematics.” *Gathering 4 Gardner 11 Exchange Book*. `Z2^3` color addition and Fano coloring. [PDF](https://www.gathering4gardner.org/g4g11gift/Taylor_Ron-Color_Addition.pdf).
- Hamming, R. W. 1950. “Error Detecting and Error Correcting Codes.” *Bell System Technical Journal* 29(2), 147–160. [DOI: 10.1002/j.1538-7305.1950.tb00463.x](https://doi.org/10.1002/j.1538-7305.1950.tb00463.x).
- Lavrauw, Michel. n.d. *Incidence Geometry and Buildings*. Lecture notes, section on projective planes and codes. [PDF](https://osebje.famnit.upr.si/~michel.lavrauw/inc_geom_buildings_notes.pdf).
- Error Correction Zoo. n.d. “Incidence-matrix projective code.” Supporting reference for the projective-plane / Hamming correspondence, accessed 2026-07-13. <https://errorcorrectionzoo.org/c/incidence_matrix>.
- Weisstein, Eric W. n.d. “Cube.” *MathWorld—A Wolfram Web Resource*. Includes the 11 free cube nets, accessed 2026-07-13. <https://mathworld.wolfram.com/Cube.html>.
- Weisstein, Eric W. n.d. “Tetrahedron 2-Compound.” *MathWorld—A Wolfram Web Resource*. Stella octangula background, accessed 2026-07-13. <https://mathworld.wolfram.com/Tetrahedron2-Compound.html>.
