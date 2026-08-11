# Music-Linked Visualization

著者: Doctor Chromaticus
作成日: 2026-04-28
再査読: 2026-07-13
文書種別: living research note。引用時は commit SHA で版を固定する。

## Related Notes

- 技術定義・定理・実装対応: [離散代数的色彩モデル](./algebraic-color-model.md)
- 先行研究・新規性評価: [離散代数的色彩モデル — 先行研究](./prior-art-algebraic-color-model.md)
- Theoryタブの改善提案: [Theoryタブ — 先行研究と改善提案](./theory-tab-prior-art-and-improvements.md)
- Music-Linked Visualization の先行研究と設計ノート: [Music-Linked Visualization — 先行研究と設計ノート](./prior-art-music-linked-visualization.md)

## Purpose

本ノートは、CHROMALUM の `LinkedVisualization` と Music タブで使う、色相角・tone 半径・色相位相（実装上の `alpha`）・音高写像の関係を整理する。

これは「色彩の明るさそのものが三角関数で変化する」という主張ではない。GRB Binary Tone によって決まる各レベルの半径を固定し、その点を RGB 色相環上で回転させ、画面上の x/y 射影をグラフ化している、という意味で三角関数が現れる。

## Prior-Art Boundary

このレイヤーは、既存の色彩工学、ソニフィケーション、音楽理論、Web Audio 実装を組み合わせた可視化・音響化レイヤーである。したがって、次の要素それ自体は新規性として主張しない。

1. GRB Binary Tone `level = 4G + 2R + B` による離散レベルの正規化。
2. RGB/HSV/HSY 型の計算色相、最大彩度色相環（純色相環）、色相角による色の整理。
3. 極座標上の点を `sin` / `cos` で画面 x/y へ射影すること。
4. 色相、彩度、明度などをピッチ、音色、音量、定位へ写像する色ソニフィケーション。
5. 位相差に応じて合成振幅が変化する三角関数的干渉式。
6. CHROMALUM の色相→音高写像、および比較用の Major、Octatonic、Whole-tone 写像。

特に、色を音へ写す研究・装置には [See ColOr](https://icad.org/Proceedings/2010/BolognaDevillePun2010.pdf)、[Colorophone 2.0](https://www.mdpi.com/1424-8220/21/21/7351)、[Sonifyd:Colormatrics](https://nime.pubpub.org/pub/efyd2zra) などの先行例がある。また、色相と音高の対応は心理物理的に安定した普遍対応として扱うべきではない。この境界線については、色聴・カラーオルガン史を批判的に整理する [Spence & Di Stefano のレビュー](https://doi.org/10.1177/20416695221092802) を主要参考にする。

CHROMALUM 側の固有性は、これらの標準要素を単独で使う点ではなく、GRB Binary Tone 順の 8 頂点 RGB アトラス、L0/L7 補色半径、`alpha0` / `alpha7` 位相、GRB bit order、Fano/Hamming/polyhedral などの代数的色彩構造と、Music タブのピッチ・ゲイン・位相写像を同じ操作系で連動させる点にある。詳細な先行研究と設計上の示唆は [Music-Linked Visualization — 先行研究と設計ノート](./prior-art-music-linked-visualization.md) に分離する。

## Coordinate Model

Music タブは、Theory タブの二層を次のように使い分ける。

```text
A = GF(2)^3                         algebraic level labels L0..L7
H = {GRB(g,r,b) | min=0, max=1}     maximum-saturation hue loop (pure-hue loop)
λ : H -> [1,6]                      λ(g,r,b) = 4g + 2r + b
D_L = λ^-1(L)                       candidates representing chromatic level L
D_0 = {K}, D_7 = {W}                achromatic endpoint fibers
```

XOR、Fano、Hamming、K8 などは `A` のラベル上で計算する。Music タブが各有彩 level に表示する色と角度は、候補ファイバー `D_L` から section `s` が選ぶ代表元 `s(L)` の属性である。Music の section は

```text
s : {0,...,7} -> disjoint_union_L D_L
s(L) in D_L
s(7-L) = κ(s(L))                    κ(c) = 1-c
```

を満たす補色可換 section である。候補を切り替えても `A` の元や XOR 結果は変わらず、逆に `A` の XOR を `H` 上の中間座標へ適用することもしない。

Theory から通常の hue pitch へ至る写像は、次の順序を持つ。

```text
candidate fiber D_L
  -> section s with s(L) in D_L
  -> representative hue h_L = h(s(L))
  -> effective hue β_L = normalize_360(h_L + α*)
  -> selected pitch map P(β_L)
```

ここで `α*` は現在の原点モードが選ぶ色相位相である。上部の **Hue Angle** / **色相角度** は section を選ぶ selector `γ` であり、代表元の色相 `h_L` や音高入力 `β_L` そのものではない。この区別は後で厳密に定義する。

## Minimal Music Axioms and Emergent Structure

Theory は純色相環、向き、補色半回転、候補ファイバーまでは与えるが、周波数をまだ含まない。Music レイヤーで絶対周波数写像まで一意にするため、円周角の持ち上げ `θ_tilde in R` と2進対数音程

```text
I(θ_tilde) = log2(f(θ_tilde) / f_0)
```

を導入し、次を追加公理として明示する。

1. `I` は `θ_tilde` に関して連続である。
2. 純色相環の既定の向きを保ち、正方向の持ち上げを上向きの音程へ写す。
3. 対数周波数差 `I(θ_tilde + δ) - I(θ_tilde)` は始点ではなく角度差 `δ` だけで決まる。
4. 補色半回転を上向き1オクターブへ写す: `I(θ_tilde + pi) - I(θ_tilde) = 1`。
5. lift の基点を R とし、その周波数を `f_0 = f_C4` に固定する。ここで `f_C4 = 440 * 2^(-9/12) Hz` である。

第3公理により角度差から音程差への写像は加法的になり、第1公理が不連続な加法解を除く。第2・第4公理が符号と尺度を固定し、第5公理が周波数全体の倍率を固定する。したがって

```text
I(θ_tilde) = θ_tilde / pi
q(θ_tilde) = 12 θ_tilde / pi                 semitones above C4
f(θ_tilde) = f_C4 * 2^(θ_tilde / pi)
```

が一意に定まる。度数表記 `h_tilde = 180 θ_tilde / pi` を使えば `q = h_tilde / 15deg` である。`15deg = 1 semitone` は経験的な色明るさから選んだ係数ではなく、補色半回転を12半音とする追加公理と Theory が導く15度交点格子との合成結果である。この尺度を Theory の `C_6 ⊂ H` へ適用すると、次が得られる。

1. 六頂点 `R,Y,G,C,B,M` は `0,4,8,12,16,20` 半音へ写る。したがって各60度辺は長3度となり、C–E–G♯の増三和音が2オクターブに反復する。
2. 14個の整数 level 交点は `0,1,2,3,4,6,8,12,13,14,15,16,18,20` 半音へ写り、オクターブ同値では `{0,1,2,3,4,6,8}` の7音集合になる。
3. 補色可換 section は `D_1 × D_2 × D_3` の選択で決まり、候補数 `1 × 3 × 3 = 9` から9個の three-note sonorities が生じる。各音をオクターブ同値で読むと、その音高クラスの因子は `{E} × {C,D♯,F♯} × {C♯,D,G♯}` である。
4. 六頂点の間を `H` の辺で埋め、その円周角を実数へ持ち上げれば、同じ式を離散音列から seam のない連続 glissando へ延長できる。これは数学的 lift 上の帰結であり、現行の主音声経路が winding number を保持するという意味ではない。

Music タブの CHROMALUM mapping はこの導出を一回転の半開区間へ制限して用いる。Major、Octatonic、Whole-tone は導出結果ではなく、同じ代表元色相を入力に取る比較用の作曲的写像として分離する。数学的 lift と現行実装の seam は [Pitch Mapping](#pitch-mapping) で区別する。

レベル `L` の tone 値を `T_L = L / 7`、表示最大半径を `R` とする。`LinkedVisualization` は L0 原点系と L7 原点系を次の半径で扱う。

```text
r0(L) = T_L R
r7(L) = (1 - T_L) R
```

ここで `T_L` は GRB Binary Tone

```text
T = (4G + 2R + B) / 7
```

を RGB 頂点へ適用した値である。この tone は CIE 明度や WCAG 相対輝度ではない。

色相角の正準座標は、12 時方向を `0deg`、時計回りを正とする。基準となる純色は次の通りである。

| color | hue angle |
| --- | ---: |
| Red | 0deg |
| Yellow | 60deg |
| Green | 120deg |
| Cyan | 180deg |
| Blue | 240deg |
| Magenta | 300deg |

同じ GRB Binary Tone を持つ候補色を含めた、各有彩レベルの正準座標は次の通りである。これらは `D_L` の候補元であり、8 頂点代数 `A` の追加要素ではない。L0 Black と L7 White は無彩色なので色相角を持たない。

| level | exact CHROMALUM integer coordinates: `GRB(G4,R4,B4)` |
| --- | --- |
| L1 | 240deg: `GRB(0,0,4)` |
| L2 | 0deg: `GRB(0,4,0)`, 225deg: `GRB(1,0,4)`, 270deg: `GRB(0,2,4)` |
| L3 | 15deg: `GRB(1,4,0)`, 210deg: `GRB(2,0,4)`, 300deg: `GRB(0,4,4)` |
| L4 | 30deg: `GRB(2,4,0)`, 120deg: `GRB(4,0,0)`, 195deg: `GRB(3,0,4)` |
| L5 | 45deg: `GRB(3,4,0)`, 90deg: `GRB(4,2,0)`, 180deg: `GRB(4,0,4)` |
| L6 | 60deg: `GRB(4,4,0)` |

投影グラフは、無彩色端点のマーカーにも横軸上の配置位置を必要とする。このため現行 UI は、L0 マーカーに現在の L1（Blue level）代表元の角度を、L7 マーカーに現在の L6（Yellow level）代表元の角度を表示上の proxy として借りる。この `proxy hue` はグラフ配置専用であり、L0/L7 に色相を付与せず、`λ`、色相→音高写像、補色角の定義にも参加しない。

ここでは「角度」という語を次のように分離する。`R` の ray をゼロ軸、純色相環の `R -> Y -> G -> C -> B -> M` の向きを正とする。UI の度数座標では、この向きは12時方向から時計回りに対応する。

| symbol | role |
| --- | --- |
| `γ` | 上部 **Hue Angle** / **色相角度** の section selector。無向補色軸を選ぶため `γ ∈ R / (180deg Z)` であり、実装状態名 `hueAngleDeg` に対応する。音高変数ではない。 |
| `h_L` | section の代表元 `s(L)` を純色相環 `H` の各辺で線形補間した正準 hue parameter `h(s(L))`。有彩 level ごとに異なる。 |
| `θ_L` | 実効色相の弧度角類 `θ_L = [pi (h_L + α*) / 180deg] ∈ R / (2pi Z)`。`β_L` の弧度表現である。 |
| `φ_L` | 正準 GRB 点を正六角形へ埋め込んだ後、中心から見て R 軸をゼロ、同じ正方向に測る実際のユークリッド偏角。 |
| `α0`, `α7` | L0 原点系・L7 原点系へ UI の **Hue Phase** / **色相位相** が加える回転角。 |
| `α*` | 現在の原点モードが選ぶ `activeAlpha`。 |
| `θ_rot` | L0 を基準に `α0`, `α7` の共通回転を追跡する角度。裸の `θ` や `θ_L` と衝突させないため添字を付ける。独立な第3位相ではない。 |
| `ε` | `α7 - α0 = 180deg` という基準関係からの相対位相ずれ。共通回転では変わらない。 |
| `β_L` | 現行の可視化と主音声経路が使う実効度数角 `normalize_360(h_L + α*)`。 |
| `θ_tilde` | 円周角を cut でほどいて winding number を保持した実数上の持ち上げ。絶対周波数を seam なく連続化するときに使う。 |
| `vartheta` | M/G と R/C の研究作図から生じる約 `21.786789deg` の創発角。Music の通常入力角ではない。 |

`15deg`, `30deg`, `45deg` などの候補ラベルは `h_L` であり、`φ_L` とは一般に一致しない。たとえば R-Y 辺では `t=h_L/60deg` とする。正六角形を、画面中心を原点、右向きを `v_x`、下向きを `v_y` として置けば

```text
v(t) = (v_x(t), v_y(t)) = (sqrt(3)t/2, -1+t/2)
φ(t) = atan2(v_x(t), -v_y(t))
     = atan2(sqrt(3)t, 2-t)
```

なので、`h_L=15deg` の実偏角は約 `13.8979deg`、`h_L=45deg` の実偏角は約 `46.1021deg` になる。一方、Music は候補ラベル `h_L` を単位円の位相へ写す。これは、GRB の線形補間と `15deg` 格子を保つ Hex 座標、実際の Hex 偏角 `φ_L`、Music の実効角 `β_L` を意図的に別の写像として扱う設計である。

有彩 level `L` の正準 hue parameter を `h_L`、現在の原点回転角を `α*` とする。`α*` も同じく時計回りを正とし、現行実装の実効角 `β_L` と円上の点を次のように定義する。

```text
β_L = normalize_360(h_L + α*)
rad_L = β_L - 90deg
x = cx + r cos(rad_L)
y = cy + r sin(rad_L)
```

SVG 画面座標では y 軸が下向きなので、画面上の射影は次の形になる。

```text
screen-x = x - cx =  r sin(β_L)
screen-y = y - cy = -r cos(β_L)
math-y            =  r cos(β_L)
```

したがって Music タブ上のグラフラベルは、画面座標の射影として読む。

```text
right graph  = screen-y projection = -r cos(β_L)
bottom graph = screen-x projection =  r sin(β_L)
```

## Hue Phase and `alpha`

UI 上ではこの操作を **Hue Phase** / **色相位相** と呼ぶ。実装上の内部名は `alpha` であり、CSS や画像処理でいう透明度ではない。`LinkedVisualization` では、`alpha0` と `alpha7` は L0 原点系・L7 原点系それぞれの色相位相回転角である。上部の **Hue Phase** / **色相位相** スライダーは両方を同じ量だけ回し、`alpha7 - alpha0 = 180deg` を保つ。

Music タブでは、現在の原点モードに応じて

```text
α* = activeAlpha = alpha0  when L0 is origin
α* = activeAlpha = alpha7  when L7 is origin
```

を選ぶ。有彩 level `L` の視覚配置と通常の hue pitch は、どちらも `h_L + α*` から作る `β_L` を使う。これにより、視覚上の位相回転と音高入力の回転が一致する。

### Common Rotation `theta_rot` and Relative Phase Offset `epsilon`

`alpha0`, `alpha7` は度数で実装された2つの円周位相である。UI 値をラジアン角類へ移したものを

```text
a0 = [pi * alpha0 / 180deg] in R / (2pi Z)
a7 = [pi * alpha7 / 180deg] in R / (2pi Z)
```

とすると、

```text
theta_rot = a0
epsilon   = a7 - a0 - pi

a0 = theta_rot
a7 = theta_rot + pi + epsilon
epsilon_deg = 180deg * epsilon / pi
```

である。`theta_rot` は対称平均ではなく、L0 を基準に対角方向の共通回転を追跡する大域座標である。この変換は `(a0,a7) in S1 x S1` の情報を共通回転と相対位相へ分けるだけで、状態を追加しない。既存の `a0,a7` を残したまま第3の独立角を実効角へ足すと、同じ配置を重複表現するため採用しない。

上部の **Hue Phase** スライダーは `alpha0 = v`, `alpha7 = v + 180deg` とするので、`epsilon = 0` を設定しながら `theta_rot` だけを動かす。両 alpha へ同じ増分を加える自動回転も `epsilon` を保存する。逆に `epsilon` は L0/L7 間の相対配置だけを表すため、`detuning` のような位相速度差や周波数差を意味しない。

origin `m in {0,7}` の実効角を `theta_L^(m) = [pi (h_L + alpha_m) / 180deg]`、画面単位ベクトルを `U(q) = (sin q,-cos q)` とすると、`p_m(L) = r_m(L) U(theta_L^(m))` である。両 alpha へ任意のラジアン角 `q` を加える共通回転に対して

```text
p_m(L; theta_rot + q, epsilon)
  = R_screen(q) p_m(L; theta_rot, epsilon)

R_screen(q) = [ cos q  -sin q ]
              [ sin q   cos q ]
```

となる。複素画面座標では `z_m(theta_rot + q) = exp(i q) z_m(theta_rot)` である。したがって共通回転は全点への厳密な `SO(2)` 剛体作用であり、半径、相対角、全点間距離、面積、同じ原点系の補色定距離、`epsilon`、位相ゲインを保存する。一方、絶対画面位置、投影グラフ、stereo pan、hue-derived pitch は変化する。section selector `gamma` はこの回転より前に代表元 `h_L` を選ぶため、`theta_rot` は section や候補 identity を変えない。

補色可換 section では `theta_(7-L)^(7) - theta_L^(0) = epsilon mod 2pi` かつ `r_7(7-L) = r_0(L)` なので、異なる原点系の等半径対応について

```text
|p_7(7-L) - p_0(L)|
  = 2 r_0(L) abs(sin(epsilon / 2))
```

を得る。これは後述する `epsilon = 0` での座標一致を、任意の相対位相へ拡張した距離則である。共通回転 `theta_rot` は式から消え、原点間の不整合だけが `epsilon` に残る。

## Hue Angle as a Section Selector

上部の **Hue Angle** / **色相角度** の値を `γ` と書く。直接 override されていない各補色 level pair について、実装は `γ` に最も近い端点を持つ無向補色軸を選び、その軸の両端を section の代表元にする。軸は向きを持たないため

```text
s_{γ + 180deg} = s_γ
```

であり、selector の本来の定義域は `γ ∈ R / (180deg Z)` である。UI は操作の連続性のため `0..360deg` を表示するが、後半一周は同じ section 遷移を反復する。したがって `γ` は section selector であって音高変数ではない。音高に入るのは、選ばれた代表元ごとの `h_L` と色相位相から作る `β_L` である。

ここで使う hue 座標は、CIE L\*a\*b\* や Oklab のような知覚均等色空間の hue angle でも、量子化済み sRGB バイトから逆算する HSV hue でもない。RGB 色立方体の有彩色六角形を位相的な土台として、R/G/B を `0deg / 120deg / 240deg`、Y/C/M をその中間点に置いた CHROMALUM 内部座標である。

候補色の正確なモデル値には、デバイスRGBではなく `0..4` の CHROMALUM整数座標 `GRB(G4,R4,B4)` を使う。座標順は Binary Tone の重み順 `4:2:1` と一致する。

```text
max(G4, R4, B4) = 4
min(G4, R4, B4) = 0
level = (4 G4 + 2 R4 + B4) / 4
tone  = level / 7
```

これにより、純色相環 `H` の 15deg 交点はすべて整数で表せる。たとえば `15deg = GRB(1,4,0)`、`30deg = GRB(2,4,0)`、`45deg = GRB(3,4,0)` であり、それぞれ厳密に L3、L4、L5 となる。補色も `GRB(G4,R4,B4) -> GRB(4-G4,4-R4,4-B4)` として厳密に定義できる。

補色可換 section の全空間では、L1/L6 の軸は一意、L2/L5 と L3/L4 の軸はそれぞれ3候補なので `1 * 3 * 3 = 9` 通りを手動候補グリッドから選べる。一方、単一の `γ` で両方の3候補を同時に nearest-axis 選択する自動 selector `γ -> s_γ` は、この9通りすべてを通らない。直接 override がない場合、その像は次の5 section である。表の tuple は lower levels `(h_1,h_2,h_3)` を示す。

| `γ mod 180deg` | selected undirected axes for L2/L5, L3/L4 | `(h_1,h_2,h_3)` |
| --- | --- | --- |
| `[0deg,22.5deg] union (157.5deg,180deg)` | `0deg, 15deg` | `(240deg,0deg,15deg)` |
| `(22.5deg,67.5deg]` | `45deg, 30deg` | `(240deg,225deg,210deg)` |
| `(67.5deg,75deg)` | `90deg, 30deg` | `(240deg,270deg,210deg)` |
| `[75deg,135deg)` | `90deg, 120deg` | `(240deg,270deg,300deg)` |
| `[135deg,157.5deg]` | `0deg, 120deg` | `(240deg,0deg,300deg)` |

境界値では等距離候補に対する実装の canonical tie-break が働く。この5状態は9 section の代替定義ではなく、2つの独立な3択を1次元 selector へ射影したときの像である。手動 override は残り4 section にも到達でき、片側を選べば補色側が同期する。

Canvas、PNG、CSSへ渡すRGBバイトは、この正確なモデル座標から作る外部出力アダプターである。そこで発生するデバイス量子化から、角度、tone、補色、音高、pan、位相ゲインを逆算しない。

画像入力だけは別経路である。入力された sRGB コード値へモデル固有の 4:2:1 スコアを適用し、最寄りの `L0..L7` ラベルを推定する。この処理は非可逆な分類器であり、`λ` の逆写像でも、`H` 上の候補座標や色相角の復元でもない。Map タブの **GRB Code Score / GRBコードスコア** もこの入力側スコアであり、GRB Binary Tone、知覚的明度、測光輝度のいずれとも同一視しない。

候補テーブルと選択候補の内部計算では正準整数座標 `GRB(G4,R4,B4)` を使う。任意の連続 hue では同じ `0..4` スケール上の実数座標を使う。一方、Glazeなどの共有可視化凡例では、選択候補の各成分をチャンネル最大値4で割った正確な割合を表示する。たとえば内部の `GRB(3,4,0)` は画面では `GRB(3/4,1,0)` と表示される。この正規化もCHROMALUM内部の厳密な変換であり、sRGBバイトへの変換ではない。

## Complement Symmetry

GRB Binary Tone は `0..7` のレベルを `0..1` に正規化したものなので、RGB 頂点の補色 `c' = c xor 7` について

```text
T(c) + T(c') = 1
```

が成り立つ。このため

```text
r0(L) = r7(7 - L)
```

となり、L0 原点系と L7 原点系は補色対に対して反転対称になる。

Music タブの有彩候補は `(L1,L6)`, `(L2,L5)`, `(L3,L4)` の3組として解決する。自動選択では selector `γ` に最も近い端点を持つ補色軸を選び、片側を手動変更した場合は反対側も正確な補色候補へ同期する。したがって、現在選択中の各組は常に正準 GRB 座標の成分和が4、tone 和が1、色相角差が180度になる。

### Same-Origin Complement Geometry

上の `r0(L) = r7(7-L)` は異なる原点系の等半径対応を表す。これとは別に、同じ原点系の内部で補色候補対を比較すると、Music 単位円への埋め込みに固有の定距離則が得られる。画面単位ベクトルを

```text
U(beta_deg) = (sin(pi * beta_deg / 180deg), -cos(pi * beta_deg / 180deg))
p_m(L,h) = r_m(L) U(h + alpha_m)       m in {0,7}
```

とする。補色可換 section では `h_(7-L) = h_L + 180deg mod 360deg` なので、

```text
U(beta_deg + 180deg) = -U(beta_deg)
r_m(L) + r_m(7-L) = R
```

が成り立つ。したがって、任意の有彩補色候補対について

```text
|p_m(L,h_L) - p_m(7-L,h_(7-L))| = R
```

である。補色点を結ぶ線分は常に表示中心を通り、長さは level、候補色相、共通位相によらず最大表示半径 `R`、現行 SVG では `58` になる。中心から両端までの長さの比は、L0 原点では `L : (7-L)`、L7 原点では `(7-L) : L` である。ここでいう長さは Music の tone-radius hue circle 上の表示距離であり、純色相六角形 `H` 上の GRB ユークリッド距離ではない。

さらに初期状態と共通位相操作が保つ

```text
alpha7 = normalize_360(alpha0 + 180deg)
```

の下では、

```text
p_7(7-L, h_L + 180deg) = p_0(L,h_L)
```

となる。このため、補色可換 section の L0 / L7 原点表示は、補色 level のラベルを交換すれば同じ無標識座標集合を持つ。

次の表は、8つの二値頂点だけを代表元に選ぶ **binary-vertex section** である。補色可換な9 section のうちの一つを参照用に示すものであり、現行 Music タブの初期自動 section ではない。

| pair | tone | binary-vertex reference hues |
| --- | ---: | --- |
| L1 Blue / L6 Yellow | 1/7 + 6/7 = 1 | 240deg / 60deg |
| L2 Red / L5 Cyan | 2/7 + 5/7 = 1 | 0deg / 180deg |
| L3 Magenta / L4 Green | 3/7 + 4/7 = 1 | 300deg / 120deg |

現行の初期状態と Reset は `γ=0deg`、direct override なしである。このとき nearest-axis selector が選ぶ代表元は、L1/L6 が `240deg/60deg`、L2/L5 が `0deg/180deg`、L3/L4 が `15deg/195deg` になる。最後の組が binary-vertex section と異なる。

## Phase Difference and Interference

`alpha0` と `alpha7` の差を

```text
deltaAlpha = alpha7 - alpha0
deltaAlpha = 180deg + epsilon_deg  mod 360deg
```

とする。代表元色相 `h_L` の L0 ベクトルと、その補色 `h_{7-L} = h_L + 180deg mod 360deg` の L7 ベクトルを画面上で直接足すと、両ベクトル間の角度は `180deg + deltaAlpha` になる。等しい半径 `r` の補色ペアの合成振幅は次の形になる。

```text
amplitude = 2 r abs(sin(pi * deltaAlpha / 360deg))
phaseFactor = amplitude / (2 r)
            = abs(sin(pi * deltaAlpha / 360deg))
            = abs(cos(pi * epsilon_deg / 360deg))
```

したがって、`deltaAlpha = 0deg` では表示上の補色ベクトルが逆位相になって相殺し、`deltaAlpha = 180deg` では同位相になって最大になる。UI の **Antiphase** / **逆位相** と **In phase** / **同位相** はこの位相関係を簡潔に示す。Music タブの持続音ゲインも、同じベクトル和から求めた `phaseFactor` を使う。初期値と共通位相操作は `alpha0 = 0deg`, `alpha7 = 180deg` を基準にするため、通常状態では最大ゲインを保ったまま全体が回転する。

同じ 2 ベクトルの差の振幅を併記すると、

```text
sumAmplitude  = 2 r abs(sin(pi * deltaAlpha / 360deg))
diffAmplitude = 2 r abs(cos(pi * deltaAlpha / 360deg))
sumAmplitude^2 + diffAmplitude^2 = 4 r^2
```

となる。これは共通位相回転で変わらないフェーザー幾何の厳密な収支式である。実装がゲインへ使うのは二乗前の `phaseFactor` であり、光強度、音響パワー、知覚的明るさの物理保存則を主張するものではない。

## Pitch Mapping

Music タブでは、section が選んだ代表元色相を音高空間へ写す。UI ではこの選択を音律や音階ではなく **Pitch mapping / 色相→音高** と呼ぶ。有彩 level ごとの入力は

```text
D_L -> s(L) -> h_L -> β_L = normalize_360(h_L + α*) -> P_m(β_L)
```

である。selector `γ` は最初の `D_L -> s(L)` だけを制御し、`P_m` へ直接は入らない。すべての mapping は `A4 = 440 Hz` から求めた正確な `C4` を共通基準音 `f_C4` とする。

### Circle interval class, continuous lift, and the implemented seam

純色相環そのものは `S1 = R / (2pi Z)` なので、円周上で一価なのは絶対周波数ではなく、2オクターブを法とする対数音程類である。`θ_L = [θ]` の代表値を `θ` とすると

```text
p(θ_L) = θ / pi mod 2
```

となる。`θ` と `θ+2pi` は同じ色相点であり、`p` では2オクターブ差を法として同じ類へ戻る。補色半回転は `p -> p+1 mod 2` である。

seam のない絶対周波数には、cut を選び、回転数を保持する持ち上げ `θ_tilde in R` が必要である。追加公理から導いた写像は

```text
f_lift(θ_tilde) = f_C4 * 2^(θ_tilde / pi)
```

であり、実数直線上では連続である。1周後の値は元の4倍なので、この絶対周波数関数を色相円周そのものの一価な連続関数として定義することはできない。

現行の主音声経路は winding number を保持せず、まず

```text
β_L = normalize_360(h_L + α*)       0deg <= β_L < 360deg
P_CHROMALUM(β_L) = f_C4 * 2^(β_L / 180deg)
```

とする。したがって `[0deg,360deg)` の内部では連続し、`15deg` が100 cent、`180deg` が1オクターブである一方、Rを cut とする seam を持つ。補色が cut をまたがなければ周波数は上向きに2倍、またげば下向きに1/2倍となり、どちらも2オクターブ音程類では同じ `+1 mod 2` を表す。`β_L -> 360deg` の左極限は `4 f_C4` だが、正規化後の `360deg` は `0deg` なので値は `f_C4` に戻る。色相位相の自動回転も同じく `0..360deg` へ正規化される。この記述は数学的 lift と現行再生を区別するものであり、別の UI モードを仮定しない。

### Joint Log-Polar Coordinate and Pitch Relation

有彩点について中心化画面座標を `X = x-cx`, `Y = y-cy`、tone 半径を `r > 0` とする。実数 lift `theta_tilde` は円上で `beta_L` を代表し、三角関数は回転数を法として同じ値を取るので、

```text
X/r =  sin(theta_tilde)
Y/r = -cos(theta_tilde)
f_lift(theta_tilde) = f_C4 * 2^(theta_tilde/pi)
```

を同じ `theta_tilde` で結べる。周波数式から角度を消去すると、

```text
X/r =  sin(pi * log2(f_lift / f_C4))
Y/r = -cos(pi * log2(f_lift / f_C4))
```

となる。現行主音声経路でも、`0deg <= beta_L < 360deg` の固定 branch 内で `f_lift` を `P_CHROMALUM(beta_L)` と読めば同じ恒等式が成り立つ。seam を越えると winding number が失われるため、円上の座標だけから lift 上の絶対周波数を一意に復元することはできない。この関係は CHROMALUM mapping に固有であり、Major、Octatonic、Whole-tone、`toneToFreq` へは拡張しない。

中心化複素座標を `z = X + iY = -i r exp(i theta_tilde)` とすると、固定 level の正方向位相増分と lift 上の音高増分は次のように対応する。

| hue / phase increment | visual coordinate | lifted frequency |
| ---: | --- | --- |
| `15deg = pi/12` | `z -> exp(i*pi/12) z` | `f -> 2^(1/12) f` |
| `180deg = pi` | `z -> -z` | `f -> 2 f` |
| `360deg = 2pi` | `z -> z` | `f -> 4 f` |

同じ実数 lift 上では、共通回転 `q` は同一原点系の全 CHROMALUM 周波数を `2^(q/pi)` 倍する。したがって表示上の剛体回転は lift 上の一様移調に対応するが、現行の半開 branch と比較用 pitch mappings には上で述べた seam と量子化の制約が残る。

正準候補色相は `pi/12` 格子上にあるため、位相が同じ格子上にあるとき、その方向は24乗根の部分集合になる。ただし候補は正24角形の全24点ではなく、純色相環の整数 level 交点から得る14方向だけである。表の最後の行は、表示座標が一周で閉じる一方、絶対周波数には lift または seam が必要になる理由を同じ式で示す。これは標準的な極座標と対数音高を CHROMALUM の共通実効角へ結合した恒等式であり、色相と音高の普遍的・心理物理的対応を主張するものではない。

### CHROMALUM and comparative mappings

CHROMALUM は正準 hue parameter と `15deg = pi/12` 半音格子の関係を使う、Theory から導出された structural mapping である。15度格子は量子化境界ではなく、任意角では連続式を使いながら、整数 level 交点が正確な12-EDO音高へ着地するアンカーである。

Major、Octatonic、Whole-tone は Theory から導出されない比較用の作曲的 preset である。同じ `β_L` を12-EDO上の1オクターブ音集合へ、等角度の scale degree としてスナップする。

| UI | semitone set from C | complement relation |
| --- | --- | --- |
| CHROMALUM | continuous `β_L/15deg` in the half-open two-octave branch | one octave in the interval class; up or down at the implemented cut |
| Major | `0,2,4,5,7,9,11` | varies with hue; the six RGB/CMY vertices form fifth/fourth inversion pairs |
| Octatonic | `0,1,3,4,6,7,9,10` (half-whole) | tritone |
| Whole-tone | `0,2,4,6,8,10` | tritone; six hue anchors map one-to-one to six pitches |

主ボタンは `CHROMALUM / Major / Octatonic / Whole-tone` という短い名称だけを表示するが、4項目は同じ理論的地位ではない。最初は上の追加公理と CHROMALUM の15度格子の合成、残る3項目は比較対象として選んだ scale presets である。共通するのは入力 `β_L`、基準音 C4、Web Audio の出力経路である。

選択中の pitch mapping が適用されるのは、候補色の単音バースト、L1..L6 の持続音と GL target pitch、FM の chromatic target、音高凡例など、通常の hue-derived pitch 経路である。これらは `α*` を含む `β_L` を共有する。ステレオ定位を有効にした場合も同じ実効角の `sin(β_L)` を pan 値に使うが、pan の式自体は pitch mapping の4択では変わらない。

一方、Bit Spectrum、補色 canon、Fano rhythm、誤り marker などの dedicated sonification はこの4択の適用外である。Tone Zigzag と Crossings も選択中の mapping を使わず、次に示す固定された CHROMALUM lift を使う。

Music タブの Zigzag Tone カードは、色相位相や比較用 pitch mapping から独立した、同じC4基準の `f_lift` を使う。Vertices は

```text
0, 60, 120, 180, 240, 300, 360 deg
0,  4,   8,  12,  16,  20,  24 semitones
```

を鳴らし、Crossings は同じ写像を14個の整数level交点で細分する。純色相環の各辺で tone 水平線と交差する角度は

```text
0, 15, 30, 45, 60, 90, 120, 180, 195, 210, 225, 240, 270, 300, 360 deg
```

を、2 オクターブ内の半音列

```text
0, 1, 2, 3, 4, 6, 8, 12, 13, 14, 15, 16, 18, 20, 24
```

として鳴らすためである。ラジアン表記では `15deg = pi/12` なので、Crossings 再生では「角度格子15度」と「12平均律の1半音」が一致する。

さらに、Crossings 再生では次の点までの待ち時間も角度差に比例させる。

```text
15deg gap = 200 ms
30deg gap = 400 ms
60deg gap = 800 ms
```

これにより、R-Y 側の密な交点列は短い間隔で進み、C-B や M-R の広い区間は長い間を置いて進む。ここでは専用の unwrapped helper を使うため、終端の `360deg` は右端の別のR点として描き、`0deg` に巻き戻さず半音24として鳴らす。これは、主音声経路の半開区間・seam と、構造デモの有限 lift path が意図的に異なる箇所である。

## Tone-to-Frequency Adapter

色相を持たない K/W や、色相ではなく tone 対称性そのものを聴かせるデモには、hue-derived pitch と別の adapter を使う。現行実装は `T in [0,1]` に対して

```text
P_T(T) = toneToFreq(T)
       = 220 Hz + 660 Hz * clamp(T, 0, 1)
```

と定義する。これは Hz 上の線形写像であり、`T=0` を220 Hz、`T=1` を880 Hzへ置く。この選択から `P_T(T) + P_T(1-T) = 1100 Hz` は従うが、補色間の周波数比は一定ではない。純色相環、4:2:1 valuation、補色半回転から導出される式ではなく、tone 順序を可聴域の一範囲へ単調に配置するための表現上の adapter である。したがって、対数音程差を保存する CHROMALUM pitch map と同じ理論的地位には置かない。

現行の用途は、補色／tone canon の `T_L` と `1-T_L`、Gray traversal に含まれる K/W、GL/FM の target-frequency 計算が L7 を指す場合、extended Hamming sequence の level 0 marker である。通常の GL carrier が target L7 へ写ると正弦波は mute され、noise が鳴るため、その場合の880 Hzは可聴 carrier にはならない。Gray traversal の L1..L6 は選択中の hue pitch mapping を使うため、この巡回は有彩点の `P_m(β_L)` と無彩端点の `P_T(T)` を接続する hybrid sonification になる。

## Algebraic Timbre / Bit Spectrum

代数的デモで使う `Bit Spectrum` では、色相角そのものを音高へ写すのではなく、Theory タブと同じ `A = GF(2)^3` のビットラベルを、選択される音色成分へ写す。

レベル `lv` を

```text
lv = 4G + 2R + B
```

として読み、`n = B + R + G` を立っているビット数、`f0` を基準周波数、`e(t)` をバースト包絡とする。現行実装の出力信号は、定数とパンを除けば次である。

```text
s_lv(t) = e(t) * 0.42 * (lv/7) / sqrt(n)
          * [0.72 B sin(2 pi (3 f0)t)
             + 1.00 R sin(2 pi (1 f0)t)
             + 0.86 G sin(2 pi (2 f0)t)]        (n > 0)

s_0(t) = 0
```

ビットは倍音成分の有無を選ぶが、実際の振幅は固定基底の単純な線形和だけではない。`lv/7` が level-dependent gain を与え、`1/sqrt(n)` が同時発音成分数を正規化し、成分ごとの係数 `0.72, 1.00, 0.86` も異なる。したがって Black `000` は成分なし、White `111` は全成分、有彩色の Gray cycle は選択成分が 1 つずつ切り替わる巡回として聴こえる、というのが正確な主張である。

このモードは、音響ミックスそのものが XOR を実装する、という意味ではない。XOR はコード側で `a xor b` として計算し、その結果のレベルを `Bit Spectrum` として鳴らす。通常の音響加算は GF(2) 加法ではないため、同じ音を 2 回足しても Black には戻らない。

## GL(3,2) Audio Scope

GL(3,2) 操作は、非零7点の現在の順列をドローンの target pitch と pan へ写す。L1..L6 を通常の正弦波、target L7 を noise として鳴らし、source L7 が有彩 target へ移る場合だけ専用の補助正弦波を使う。gain と hover/Fano 強調は source level に付随するため、これは7点のラベル移動を聴かせるデモであり、GRB tone を保存する変換ではない。

FM スイッチとの同時使用では、3本の chromatic carrier/modulator 結線自体は source level に固定した付加音色として残り、modulator pitch だけが現在の target label に追従する。carrier が L7 noise へ写る場合、その source oscillator は無音になるのでFM効果も聴こえず、source L7 用の補助 oscillator に新しいFM結線は作らない。したがって本実装は GL(3,2) がFMグラフ全体へ作用するとは主張せず、GLデモの保証範囲をドローンの7点 pitch/pan 順列に限定する。

## Routing of Structural Sonifications

Music タブの手動バーストは `Pitch` 固定にする。一方で、Fano Sequences と Structural Sonification の各デモでは、ユーザー選択ではなく、デモの数学的役割に合わせて音響写像を固定する。

- `Bit Spectrum`: XOR, Fano incidence, line/coset, Hamming labels, Boolean operations, Cayley rows, K8/tetra/octahedron など、`GF(2)^3` の点・部分集合・演算を聴かせるデモ。
- `Pitch`: Gray traversal melody や GL(3,2) のドローン変換など、代表元色相 `h_L`・位相 `α*`・既存ドローンの幾何的配置を聴かせるデモ。ただし色相を持たない K/W と target L7 は `P_T(T)` へ fallback する。
- Dedicated sonification: Fano rhythm, complement/tone canon, tone zigzag, tone crossing, Hamming error marker など、ビット音色でも通常の hue pitch でもなく、その構造固有の時間・tone adapter・unwrapped angle grid・誤り marker を聴かせるデモ。

この分離により、代数的構造を説明するデモでは `Pitch` による色相写像を混ぜず、幾何的・トーン的・リズム的なデモでは `Bit Spectrum` を無理に適用しない。

## Implementation Map

このレイヤーは、離散代数的色彩モデル本体の上に置かれた可視化・音響化レイヤーである。主な実装対応は次の通り。

| responsibility | implementation |
| --- | --- |
| exact CHROMALUM hue anchors, 0..4 channels, GRB level, complement cycle | `src/chromalum-color-model.ts` |
| Canvas/PNG RGB adapters and level candidate output colors | `src/color-engine.ts` |
| canonical hue-phase normalization, screen vectors, pan, complement gain | `src/music/music-phase.ts` |
| bit-spectrum timbre basis, tone zigzag, and tone crossing constants | `src/data/music-data.ts` |
| tone radii, hue-phase (`alpha`) rotation, x/y projections, complement curves | `src/components/linked-visualization-geometry.ts`, `src/components/LinkedVisualization.tsx`, `src/components/LinkedVisualizationWheel.tsx`, `src/components/LinkedVisualizationProjectionGraphs.tsx`, `src/components/LinkedVisualizationGuides.tsx`, `src/components/LinkedVisualizationLegend.tsx` |
| Music-specific wrapper, candidate grid, transport, interval overlay, and algebra panels | `src/components/music/` |
| angle-to-frequency mapping | `src/data/music-frequency.ts` |
| Music tab composition and controller | `src/components/MusicPanel.tsx`, `src/hooks/useMusicPanelController.ts` |
| Music tab state partitions | `src/hooks/useMusicPanelState.ts` |
| Music tab handler partitions | `src/hooks/useMusicTransportHandlers.ts`, `src/hooks/useMusicHuePaletteHandlers.ts`, `src/hooks/useMusicFanoHandlers.ts`, `src/hooks/useMusicStopAllHandler.ts`, `src/hooks/useMusicResetDefaultsHandler.ts` |
| Music tab derived data | `src/music/music-panel-derived.ts` |
| Web Audio lifecycle, graph updates, bursts, and teardown | `src/hooks/useMusicAudioSession.ts`, `src/music/music-audio-graph.ts` |
| tone-to-frequency adapter for achromatic/tone sonification | `src/music/music-engine-core.ts` |
| sonification command surface | `src/hooks/useMusicEngine.ts` |
| playback runners, schedules, and algebraic sequences | `src/music/music-playback-runner.ts`, `src/music/music-playback-sequences.ts`, `src/music/music-scheduler.ts`, `src/music/music-engine-core.ts` |

## Scope Limits

1. The graph is a trigonometric projection of a tone-radius hue circle; it is not a model of tone varying sinusoidally with hue.
2. The section selector `γ`, representative hue `h_L`, circle class `θ_L`, Euclidean hexagon angle `φ_L`, implemented effective angle `β_L`, and lifted angle `θ_tilde` are distinct variables. None is recovered from device RGB or claimed to be perceptually uniform.
3. GRB Binary Tone is a discrete model coordinate, not CIE lightness or a WCAG contrast metric.
4. The CHROMALUM pitch map requires the stated Music axioms in addition to the finite color model. Major, Octatonic, Whole-tone, `toneToFreq`, gain, timbre, and rhythm choices are comparison or expressive mappings, not theorems of the color algebra.
5. The circle determines a two-octave interval class. Seam-free absolute frequency requires a lifted real angle; the current main hue-audio path instead normalizes to `[0deg,360deg)` and therefore has an R-rooted seam.
6. The sonification is a mapping from this discrete color atlas to pitch, gain, and phase behavior. It is not a psychoacoustic model of color-hearing correspondence.
7. The trigonometric and pitch-mapping pieces are mathematically standard. CHROMALUM's project-specific synthesis candidate is the integration of these pieces with GRB Binary Tone order, complement symmetry, GRB bit order, and the Fano/Hamming/polyhedral color atlas.
8. A simple-harmonic-motion or conserved-energy reading is valid only after an explicit time law such as `β_L(t)=omega*t+β_L(0)` and a physical oscillator model are added. Hue and UI phase values alone are not physical time, force, mass, or energy.
