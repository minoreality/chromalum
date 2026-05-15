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
6. 12 平均律、純正律、ダイアトニック、オクタトニックなどの既存音階への角度写像。

特に、色を音へ写す研究・装置には [See ColOr](https://icad.org/Proceedings/2010/BolognaDevillePun2010.pdf)、[Colorophone 2.0](https://www.mdpi.com/1424-8220/21/21/7351)、[Sonifyd:Colormatrics](https://nime.pubpub.org/pub/efyd2zra) などの先行例がある。また、色相と音高の対応は心理物理的に安定した普遍対応として扱うべきではない。この境界線については、色聴・カラーオルガン史を批判的に整理する [Spence & Di Stefano のレビュー](https://doi.org/10.1177/20416695221092802) を主要参考にする。

CHROMALUM 側の固有性は、これらの標準要素を単独で使う点ではなく、GRB Binary Tone 順の 8 頂点 RGB アトラス、L0/L7 補色半径、`alpha0` / `alpha7` 位相、GRB bit order、Fano/Hamming/polyhedral などの代数的色彩構造と、Music タブのピッチ・ゲイン・位相写像を同じ操作系で連動させる点にある。詳細な先行研究と設計上の示唆は [Music-Linked Visualization — 先行研究と設計ノート](./prior-art-music-linked-visualization.md) に分離する。

## Coordinate Model

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

色相角を `theta`、色相位相・原点回転角を `alpha` とすると、実装上の円上の点は次の角度で置かれる。

```text
rad = theta - alpha - 90deg
x = cx + r cos(rad)
y = cy + r sin(rad)
```

SVG 画面座標では y 軸が下向きなので、標準的な数学座標で `beta = theta - alpha` と読むと、画面上の射影は次の形になる。

```text
screen-x = x - cx =  r sin(beta)
screen-y = y - cy = -r cos(beta)
math-y            =  r cos(beta)
```

したがって Music タブ上のグラフラベルは、画面座標の射影として読む。

```text
right graph  = screen-y projection = -r cos(theta - alpha)
bottom graph = screen-x projection =  r sin(theta - alpha)
```

## Hue Phase and `alpha`

UI 上ではこの操作を **Hue Phase** / **色相位相** と呼ぶ。ここでの `alpha` は CSS や画像処理でいう透明度ではなく、実装上の内部名である。`LinkedVisualization` では、`alpha0` と `alpha7` は L0 原点系・L7 原点系それぞれの色相位相回転角である。

Music タブでは、現在の原点モードに応じて

```text
activeAlpha = alpha0  when L0 is origin
activeAlpha = alpha7  when L7 is origin
```

を選び、音高写像にも `theta + activeAlpha` を使う。これにより、視覚上の位相回転と音高の回転が一致する。

## Hue Angle and Color Candidates

CHROMALUM の hue angle は、CIE L*a*b* や Oklab のような知覚均等色空間の hue angle ではない。RGB/HSV 型の純色六角形上の計算色相である。

各有彩レベルの候補色は、次の条件を満たす RGB 純色として求められる。

1. 1 つのチャンネルが `1`。
2. 1 つのチャンネルが `0`。
3. 残り 1 チャンネルを調整して、そのレベルの GRB Binary Tone に一致させる。

したがって、点群は単なる装飾ではなく、同一 tone を持つ純色候補の集合である。ただし、これは知覚的な等明度集合を意味しない。

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

デフォルトの有彩色候補では、補色ペアは tone 和が 1 で、色相角も 180 度離れる。

| pair | tone | default hue angles |
| --- | ---: | --- |
| L1 Blue / L6 Yellow | 1/7 + 6/7 = 1 | 240deg / 60deg |
| L2 Red / L5 Cyan | 2/7 + 5/7 = 1 | 0deg / 180deg |
| L3 Magenta / L4 Green | 3/7 + 4/7 = 1 | 300deg / 120deg |

## Phase Difference and Interference

`alpha0` と `alpha7` の差を

```text
deltaAlpha = alpha7 - alpha0
```

とすると、補色ペアの合成曲線は三角関数の和積公式に従う。等しい半径 `r` の同型ペアを足すと、有効振幅は概念的に次の形になる。

```text
amplitude = 2 r cos(deltaAlpha / 2)
```

したがって、`deltaAlpha = 0deg` では同位相で強調され、`deltaAlpha = 180deg` では逆位相でキャンセルされる。Music タブの持続音ゲインも、この関係を反映して `abs(cos(deltaAlpha / 2))` を位相係数として使う。

## Pitch Mapping

Music タブでは、色相角を音高空間へ写す。基本は

```text
liveAngle = theta + activeAlpha
```

である。12 平均律モードでは、`liveAngle` を 2 オクターブ分の連続的な指数写像へ送る。

```text
freq = 220 * 2^((liveAngle mod 360) / 360 * 2)
```

純正律、オクタトニック、ダイアトニックの各モードでは、連続角度をそれぞれのスケール度数へスナップする。したがって、これらは連続的な三角関数音高ではなく、角度から離散音階への量子化である。

単音バースト、持続音、音程表示はいずれも `activeAlpha` を含む角度を使う。これにより、色相位相を回転させた後にクリックした単音と、画面上の音程表示・ドローン音高が一致する。

Music タブの Zigzag Tone カードの Crossings 再生だけは例外として、色相位相や現在の音律選択から独立した固定 12 平均律を使う。これは、純色エッジ上で tone 水平線と交差する角度

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

代数的デモで使う `Bit Spectrum` では、色相角そのものを音高へ写すのではなく、Theory タブと同じ `GF(2)^3` のビット構造を音色成分へ写す。

レベル `lv` を

```text
lv = 4G + 2R + B
```

として読むと、音色は次のようなビット基底の合成として定義する。

```text
T(lv) = B * tau_B + R * tau_R + G * tau_G
```

ここで `tau_B`, `tau_R`, `tau_G` は Web Audio 上の倍音成分である。したがって、Black `000` は成分なし、White `111` は全成分、有彩色の Gray cycle は音色成分が 1 つずつ切り替わる巡回として聴こえる。

このモードは、音響ミックスそのものが XOR を実装する、という意味ではない。XOR はコード側で `a xor b` として計算し、その結果のレベルを `Bit Spectrum` として鳴らす。通常の音響加算は GF(2) 加法ではないため、同じ音を 2 回足しても Black には戻らない。

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
| GRB Binary Tone, hue candidates, default candidates | `src/color-engine.ts` |
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
2. The hue angle is RGB/HSV-style computational hue, not a perceptually uniform hue angle.
3. GRB Binary Tone is a discrete model coordinate, not CIE lightness or a WCAG contrast metric.
4. The sonification is a mapping from this discrete color atlas to pitch, gain, and phase behavior. It is not a psychoacoustic model of color-hearing correspondence.
5. The trigonometric and pitch-mapping pieces are mathematically standard. CHROMALUM's contribution is the integration of these pieces with GRB Binary Tone order, complement symmetry, GRB bit order, and the Fano/Hamming/polyhedral color atlas.
