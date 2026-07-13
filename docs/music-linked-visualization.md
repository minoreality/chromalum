# Music-Linked Visualization

作成日: 2026-04-28

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
2. RGB/HSV/HSY 型の計算色相、純色六角形、色相角による色の整理。
3. 極座標上の点を `sin` / `cos` で画面 x/y へ射影すること。
4. 色相、彩度、明度などをピッチ、音色、音量、定位へ写像する色ソニフィケーション。
5. 位相差に応じて合成振幅が変化する三角関数的干渉式。
6. CHROMALUM、Major、Octatonic、Whole-tone の構造的な色相→音高写像。

特に、色を音へ写す研究・装置には [See ColOr](https://icad.org/Proceedings/2010/BolognaDevillePun2010.pdf)、[Colorophone 2.0](https://www.mdpi.com/1424-8220/21/21/7351)、[Sonifyd:Colormatrics](https://nime.pubpub.org/pub/efyd2zra) などの先行例がある。また、色相と音高の対応は心理物理的に安定した普遍対応として扱うべきではない。この境界線については、色聴・カラーオルガン史を批判的に整理する [Spence & Di Stefano のレビュー](https://doi.org/10.1177/20416695221092802) を主要参考にする。

CHROMALUM 側の固有性は、これらの標準要素を単独で使う点ではなく、GRB Binary Tone 順の 8 頂点 RGB アトラス、L0/L7 補色半径、`alpha0` / `alpha7` 位相、GRB bit order、Fano/Hamming/polyhedral などの代数的色彩構造と、Music タブのピッチ・ゲイン・位相写像を同じ操作系で連動させる点にある。詳細な先行研究と設計上の示唆は [Music-Linked Visualization — 先行研究と設計ノート](./prior-art-music-linked-visualization.md) に分離する。

## Coordinate Model

Music タブは、Theory タブの二層を次のように使い分ける。

```text
A = GF(2)^3                         algebraic level labels L0..L7
H = {GRB(g,r,b) | min=0, max=1}     pure-hue boundary
π : H -> [1,6]                      π(g,r,b) = 4g + 2r + b
C_L = π^-1(L)                       candidates representing level L
```

XOR、Fano、Hamming、K8 などは `A` のラベル上で計算する。Music タブが各有彩 level に表示する色と角度は、候補集合 `C_L` から選んだ代表元 `s(L)` の属性である。候補を切り替えても `A` の元や XOR 結果は変わらず、逆に `A` の XOR を `H` 上の中間座標へ適用することもしない。

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

同じ GRB Binary Tone を持つ候補色を含めた、各有彩レベルの正準座標は次の通りである。これらは `C_L` の表示代表元であり、8 頂点代数 `A` の追加要素ではない。L0 Black と L7 White は無彩色なので色相角を持たない。

| level | exact CHROMALUM integer coordinates: `GRB(G4,R4,B4)` |
| --- | --- |
| L1 | 240deg: `GRB(0,0,4)` |
| L2 | 0deg: `GRB(0,4,0)`, 225deg: `GRB(1,0,4)`, 270deg: `GRB(0,2,4)` |
| L3 | 15deg: `GRB(1,4,0)`, 210deg: `GRB(2,0,4)`, 300deg: `GRB(0,4,4)` |
| L4 | 30deg: `GRB(2,4,0)`, 120deg: `GRB(4,0,0)`, 195deg: `GRB(3,0,4)` |
| L5 | 45deg: `GRB(3,4,0)`, 90deg: `GRB(4,2,0)`, 180deg: `GRB(4,0,4)` |
| L6 | 60deg: `GRB(4,4,0)` |

投影グラフは、無彩色端点のマーカーにも横軸上の配置位置を必要とする。このため現行 UI は、L0 マーカーに現在の L1（Blue level）代表元の角度を、L7 マーカーに現在の L6（Yellow level）代表元の角度を表示上の proxy として借りる。この `proxy hue` はグラフ配置専用であり、L0/L7 に色相を付与せず、`π`、色相→音高写像、補色角の定義にも参加しない。

ここでは「角度」という語を次のように分離する。

| symbol | role |
| --- | --- |
| `h` | CHROMALUM 色相六角形の辺を線形補間する正準 hue parameter。実装の `hueAngleDeg`、既存コード説明の `theta` に対応する。 |
| `phi` | 正準 GRB 点を正六角形へ置いた後、中心から見た実際のユークリッド偏角。 |
| `alpha` | UI が加える色相位相・原点回転角。 |
| `beta` | Music 単位円上の実効角 `normalize(h+alpha)`。 |
| `vartheta` | M/G と R/C の研究作図から生じる約 `21.786789deg` の創発角。Music の通常入力角ではない。 |

`15deg`, `30deg`, `45deg` などの候補ラベルは `h` であり、`phi` とは一般に一致しない。たとえば R-Y 辺では `t=h/60deg` として

```text
hex point H(t) = (sqrt(3)t/2, -1+t/2)
phi(t) = atan2(sqrt(3)t, 2-t)
```

なので、`h=15deg` の実偏角は約 `13.8979deg`、`h=45deg` の実偏角は約 `46.1021deg` になる。一方、Music は候補ラベル `h` をそのまま単位円の位相へ写す。これは、GRB の線形補間と `15deg` 格子を保つ Hex 座標、実際の Hex 偏角、Music 位相を意図的に別の写像として扱う設計である。

正準 hue parameter を `h`、色相位相・原点回転角を `alpha` とする。`alpha` も同じく時計回りを正とし、実効角 `beta` と円上の点を次のように定義する。

```text
beta = normalize(h + alpha)
rad = beta - 90deg
x = cx + r cos(rad)
y = cy + r sin(rad)
```

SVG 画面座標では y 軸が下向きなので、画面上の射影は次の形になる。

```text
screen-x = x - cx =  r sin(beta)
screen-y = y - cy = -r cos(beta)
math-y            =  r cos(beta)
```

したがって Music タブ上のグラフラベルは、画面座標の射影として読む。

```text
right graph  = screen-y projection = -r cos(h + alpha)
bottom graph = screen-x projection =  r sin(h + alpha)
```

## Hue Phase and `alpha`

UI 上ではこの操作を **Hue Phase** / **色相位相** と呼ぶ。ここでの `alpha` は CSS や画像処理でいう透明度ではなく、実装上の内部名である。`LinkedVisualization` では、`alpha0` と `alpha7` は L0 原点系・L7 原点系それぞれの色相位相回転角である。上部の **Hue Phase** / **色相位相** スライダーは両方を同じ量だけ回し、`alpha7 - alpha0 = 180deg` を保つ。

Music タブでは、現在の原点モードに応じて

```text
activeAlpha = alpha0  when L0 is origin
activeAlpha = alpha7  when L7 is origin
```

を選び、音高写像にも `h + activeAlpha` を使う。これにより、視覚上の位相回転と音高の回転が一致する。

## Hue Angle and Color Candidates

CHROMALUM の hue angle は、CIE L\*a\*b\* や Oklab のような知覚均等色空間の hue angle でも、量子化済み sRGB バイトから逆算する HSV hue でもない。RGB 色立方体の有彩色六角形を位相的な土台として、R/G/B を `0deg / 120deg / 240deg`、Y/C/M をその中間点に置いた CHROMALUM 内部座標である。

候補色の正確なモデル値には、デバイスRGBではなく `0..4` の CHROMALUM整数座標 `GRB(G4,R4,B4)` を使う。座標順は Binary Tone の重み順 `4:2:1` と一致する。

```text
max(G4, R4, B4) = 4
min(G4, R4, B4) = 0
level = (4 G4 + 2 R4 + B4) / 4
tone  = level / 7
```

これにより、色相六角形の 15deg 交点はすべて整数で表せる。たとえば `15deg = GRB(1,4,0)`、`30deg = GRB(2,4,0)`、`45deg = GRB(3,4,0)` であり、それぞれ厳密に L3、L4、L5 となる。補色も `GRB(G4,R4,B4) -> GRB(4-G4,4-R4,4-B4)` として厳密に定義できる。

Canvas、PNG、CSSへ渡すRGBバイトは、この正確なモデル座標から作る外部出力アダプターである。そこで発生するデバイス量子化から、角度、tone、補色、音高、pan、位相ゲインを逆算しない。

画像入力だけは別経路である。入力された sRGB コード値へモデル固有の 4:2:1 スコアを適用し、最寄りの `L0..L7` ラベルを推定する。この処理は非可逆な分類器であり、`π` の逆写像でも、`H` 上の候補座標や色相角の復元でもない。Map タブの **GRB Code Score / GRBコードスコア** もこの入力側スコアであり、GRB Binary Tone、知覚的明度、測光輝度のいずれとも同一視しない。

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

Music タブの有彩候補は `(L1,L6)`, `(L2,L5)`, `(L3,L4)` の3組として解決する。自動選択では global hue に最も近い端点を持つ補色軸を選び、片側を手動変更した場合は反対側も正確な補色候補へ同期する。したがって、現在選択中の各組は常に正準 GRB 座標の成分和が4、tone 和が1、色相角差が180度になる。次は初期の正準組である。

| pair | tone | canonical initial hue angles |
| --- | ---: | --- |
| L1 Blue / L6 Yellow | 1/7 + 6/7 = 1 | 240deg / 60deg |
| L2 Red / L5 Cyan | 2/7 + 5/7 = 1 | 0deg / 180deg |
| L3 Magenta / L4 Green | 3/7 + 4/7 = 1 | 300deg / 120deg |

## Phase Difference and Interference

`alpha0` と `alpha7` の差を

```text
deltaAlpha = alpha7 - alpha0
```

とする。色相 `h` の L0 ベクトルと、その補色 `h + 180deg` の L7 ベクトルを画面上で直接足すと、両ベクトル間の角度は `180deg + deltaAlpha` になる。等しい半径 `r` の補色ペアの合成振幅は次の形になる。

```text
amplitude = 2 r abs(sin(deltaAlpha / 2))
phaseFactor = amplitude / (2 r) = abs(sin(deltaAlpha / 2))
```

したがって、`deltaAlpha = 0deg` では表示上の補色ベクトルが逆位相になって相殺し、`deltaAlpha = 180deg` では同位相になって最大になる。UI の **Antiphase** / **逆位相** と **In phase** / **同位相** はこの位相関係を簡潔に示す。Music タブの持続音ゲインも、同じベクトル和から求めた `phaseFactor` を使う。初期値と共通位相操作は `alpha0 = 0deg`, `alpha7 = 180deg` を基準にするため、通常状態では最大ゲインを保ったまま全体が回転する。

同じ 2 ベクトルの差の振幅を併記すると、

```text
sumAmplitude  = 2 r abs(sin(deltaAlpha / 2))
diffAmplitude = 2 r abs(cos(deltaAlpha / 2))
sumAmplitude^2 + diffAmplitude^2 = 4 r^2
```

となる。これは共通位相回転で変わらないフェーザー幾何の厳密な収支式である。実装がゲインへ使うのは二乗前の `phaseFactor` であり、光強度、音響パワー、知覚的明るさの物理保存則を主張するものではない。

## Pitch Mapping

Music タブでは、色相角を音高空間へ写す。UI ではこの選択を音律や音階ではなく **Pitch mapping / 色相→音高** と呼ぶ。基本は

```text
liveAngle = h + activeAlpha
```

である。すべての mapping は `A4 = 440 Hz` から求めた正確な `C4` を共通基準音 `f_C4` とする。

### CHROMALUM

CHROMALUM は正準 hue parameter と 15deg 半音格子の関係を前面に出す固有 mapping で、`liveAngle` を 2 オクターブ分の 12-EDO 半音格子へ量子化する。

```text
semitone = round((liveAngle mod 360) / 15)
freq = f_C4 * 2^(semitone / 12)
```

したがって 15deg が 100 cent、180deg の補色差が正確な 1 オクターブになる。`352.5deg <= liveAngle < 360deg` は上端の `C6` へ丸め、色相の seam である `360deg = 0deg` だけを `C4` へ戻す。

### Conventional pitch collections

残る 3 mapping は 12-EDO 上の 1 オクターブ音集合へ、連続角度を等角度の scale degree としてスナップする。

| UI | semitone set from C | complement relation |
| --- | --- | --- |
| Major | `0,2,4,5,7,9,11` | varies with hue; the six RGB/CMY vertices form fifth/fourth inversion pairs |
| Octatonic | `0,1,3,4,6,7,9,10` (half-whole) | tritone |
| Whole-tone | `0,2,4,6,8,10` | tritone; six hue anchors map one-to-one to six pitches |

主ボタンは `CHROMALUM / Major / Octatonic / Whole-tone` という短い名称だけを表示し、`15deg / C / H-W / 12-EDO` などの定義は tooltip と音高凡例に表示する。これは異なる分類階層を「音律」4択として扱うものではなく、完成した structural / compositional mapping の比較である。

単音バースト、持続音、FM 変調器、音程表示はいずれも `activeAlpha` を含む角度を使う。ステレオ定位を有効にした場合も、同じ実効角の画面 x 座標 `sin(liveAngle)` を pan 値に使う。これにより、色相位相を回転させた後の画面位置・単音・ドローン音高・FM・音程表示・定位が一致する。

Music タブの Zigzag Tone カードの Crossings 再生だけは例外として、色相位相や現在の pitch mapping から独立した、C4 基準の固定 12-EDO を使う。これは、純色エッジ上で tone 水平線と交差する角度

```text
0, 15, 30, 45, 60, 90, 120, 180, 195, 210, 225, 240, 270, 300, 360 deg
```

を、2 オクターブ内の半音列

```text
0, 1, 2, 3, 4, 6, 8, 12, 13, 14, 15, 16, 18, 20, 24
```

として鳴らすためである。ラジアン表記では 15deg = pi/12 なので、Crossings 再生では「角度格子 15deg」と「12 平均律の 1 半音」が一致する。

さらに、Crossings 再生では次の点までの待ち時間も角度差に比例させる。

```text
15deg gap = 200 ms
30deg gap = 400 ms
60deg gap = 800 ms
```

これにより、R-Y 側の密な交点列は短い間隔で進み、C-B や M-R の広い区間は長い間を置いて進む。終端の 360deg は 0deg に巻き戻さず、半音 24 として鳴らすことで、閉じた色相周期と上昇する 2 オクターブ音型を同時に示す。次ループの 0deg へのリセットだけは基準間隔 200 ms を使う。

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
- `Pitch`: Gray traversal melody や GL(3,2) のドローン変換など、色相角・回転・既存ドローンの幾何的配置を聴かせるデモ。
- Dedicated sonification: Fano rhythm, complement/tone canon, tone zigzag, tone crossing, Hamming error marker など、ビット音色でも通常の hue pitch でもなく、その構造固有の時間・トーン・角度格子・誤りマーカーを聴かせるデモ。

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
| sonification command surface | `src/hooks/useMusicEngine.ts` |
| playback runners, schedules, and algebraic sequences | `src/music/music-playback-runner.ts`, `src/music/music-playback-sequences.ts`, `src/music/music-scheduler.ts`, `src/music/music-engine-core.ts` |

## Scope Limits

1. The graph is a trigonometric projection of a tone-radius hue circle; it is not a model of tone varying sinusoidally with hue.
2. The canonical hue parameter `h`, the actual polar angle `phi` of a point embedded on the hexagon, and the Music unit-circle phase `beta` are distinct coordinates. None is recovered from device RGB or claimed to be perceptually uniform.
3. GRB Binary Tone is a discrete model coordinate, not CIE lightness or a WCAG contrast metric.
4. The sonification is a mapping from this discrete color atlas to pitch, gain, and phase behavior. It is not a psychoacoustic model of color-hearing correspondence.
5. The trigonometric and pitch-mapping pieces are mathematically standard. CHROMALUM's contribution is the integration of these pieces with GRB Binary Tone order, complement symmetry, GRB bit order, and the Fano/Hamming/polyhedral color atlas.
6. A simple-harmonic-motion or conserved-energy reading is valid only after an explicit time law such as `beta(t)=omega*t+beta0` and a physical oscillator model are added. Hue and UI phase values alone are not physical time, force, mass, or energy.
