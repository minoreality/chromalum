# 離散代数的色彩モデル — 重要先行研究

著者: Doctor Chromaticus
初回調査：2026-04-19
整理方針：2026-04-29
再査読：2026-07-13

## Related Notes

- 技術定義・定理・実装対応: [離散代数的色彩モデル](./algebraic-color-model.md)
- Theoryタブの改善提案: [Theoryタブ — 先行研究と改善提案](./theory-tab-prior-art-and-improvements.md)
- Music-Linked Visualization: [Music-Linked Visualization](./music-linked-visualization.md)

## Purpose

このノートは、Theory タブの研究・開発に本当に必要な先行研究だけを残す。2026-07-13 時点の限定調査であり、網羅的な新規性調査や最先の優先権判定ではない。次のどちらかに該当する文献を保持する。

1. CHROMALUM が新規主張してはいけない既知構造を明確にする文献。
2. 実装・説明・UI 設計の判断に直接効く文献。

## Search Record (2026-07-13)

再現可能性のため、今回の検索範囲を次のように固定した。

- 対象: RGB 立方体と色相六角形、3-bit RGB 色番号、`GF(2)^3` / Boolean lattice / Fano / Hamming、cube nets と複合多面体、およびこれらの色彩への統合。
- 検索面: 公開 Web 全文検索、ACM/CiNii/J-STAGE/DOI landing pages、機器マニュアルの公開アーカイブ、既知文献の参考文献欄。
- 検索語群: `3-bit RGB color code GRB 4 2 1`、`0 black 1 blue 2 red 3 magenta 4 green 5 cyan 6 yellow 7 white`、`PC-8001 color code`、`ZX Spectrum colour code binary green red blue`、`RGB cube hue hexagon`、`color addition Z2^3 Fano plane`、`CMY cube Boolean lattice Hasse`、`Hamming Fano color`、`cube net stella octangula color`。
- 確認資料: 機器メーカーのマニュアル、論文・会議録、DOI 登録資料、数学リファレンス、および各資料の引用先。
- 未調査・不完全: 特許データベースの系統調査、英語・日本語以外の文献、1970年代以前の全端末・映像機器マニュアル、学位論文・展覧会資料・未デジタル化資料、全引用ネットワーク、ソースコード・ROM の網羅的比較。

したがって「見つからなかった」はこの検索日・検索語・資料集合の内部だけを意味する。独立した体系的レビューまたは特許・アーカイブ調査なしに、世界初・唯一・未発表とは表現しない。

## Executive Summary

Theory タブの核にある次の構造は既知である。

- RGB cube と hue hexagon。
- 8 色を `Z2^3` / `GF(2)^3` として扱う色加算。
- 8 頂点を Boolean lattice `B3` / Hasse diagram として読むこと。
- 非零 7 点を Fano 平面 `PG(2,2)` として扱うこと。
- Fano 平面と Hamming(7,4) 符号の対応。
- cube nets、cube-octahedron duality、tetrahedra、stella octangula。
- `0=K, 1=B, 2=R, 3=M, 4=G, 5=C, 6=Y, 7=W` という `4G+2R+B` の 3-bit 色番号。

最後の色番号は、少なくとも NEC の 1981 年版 PC-8001B N-BASIC Reference Manual と Sinclair Research の 1982 年版 ZX Spectrum BASIC Programming に同じ形で現れる。したがって、番号列・ビット重み・その明暗順そのものを CHROMALUM の発見とはしない。

一方、この限定調査で、次の全体を同一の導出鎖と UI に統合した先行例は確認できなかった。

1. 無名の最小部分和 valuation `{1,2,4}` と、二値 RGB 頂点の明るさ順が、名前付き `4G+2R+B` へ収束することを明示し、正規化 tone として使うこと。
2. 補色 tone 反転を、標準サイコロの対面和 7 と接続すること。
3. hue Gray cycle、tone zigzag、dice net を同じ 6 色構造として重ねること。
4. `K8` の Hamming 距離分解を、cube / stella octangula / complement matching の色彩アトラスとして提示すること。
5. 上記を Theory タブの単一 UI に統合していること。

これは新規性の確定ではなく、限定調査から得た**プロジェクト固有性の候補**である。現時点で安全な位置づけは次である。

> CHROMALUM は、既知の `GF(2)^3` 色加算、RGB cube、Boolean lattice、Fano 平面、Hamming 符号、多面体構造、および既知の `4G+2R+B` 色番号について、無名の最小部分和数学と独立な色の明るさ順が同じ GRB 二進順位へ収束することを明示し、正規化 tone、補色-dice 定理、hue/tone/dice/polyhedra の対応へ統合する、8 頂点 RGB 色集合の離散代数的色彩アトラスである。

## Essential Prior Art

| Keep | Source | Why it matters |
| --- | --- | --- |
| 必須 | Alvy Ray Smith, "Color Gamut Transform Pairs" | RGB cube、HSV/hexcone、hue hexagon の標準的背景。Theory タブは RGB cube 自体を新規主張できない。 |
| 必須 | 玉垣庸一・小原康裕・宮崎紀郎「CMYカラーキューブに基づく新たなカラーモデル II」 | Boolean lattice、Hasse diagram、RGB/CMY 双対、join/meet による理想化混色の直接的先行研究。 |
| 必須 | Ron Taylor, "Color Addition Across the Spectrum of Mathematics" | 8 色を `Z2 x Z2 x Z2` として扱い、Fano plane coloring に接続する最重要先行例。 |
| 必須 | NEC, _PC-8001B N-BASIC Reference Manual_ (1981) | Table 2-1 が `0=BLACK, 1=BLUE, 2=RED, 3=MAGENTA, 4=GREEN, 5=CYAN, 6=YELLOW, 7=WHITE` を掲載する。正確な GRB 4:2:1 色番号の先行例。 |
| 必須 | Steven Vickers, _Sinclair ZX Spectrum BASIC Programming_ (1982) | Chapter 16 が同じ 8 色順、Appendix E が 3 bit を Green, Red, Blue の順と明記する。Chapter 16 は白黒 TV 上で番号順が明るさ順になるとも述べる。 |
| 必須 | Hamming 1950 / Fano/Hamming 標準資料 | Hamming code の原典と、Fano 平面と Hamming(7,4) の対応が既知であることを示す。色は符号語ではなく座標位置ラベルとして扱う。 |
| 重要 | MathWorld: Cube / Tetrahedron 2-Compound | 11 種類の cube nets、cube 内の 2 つの tetrahedra、stella octangula の幾何背景。 |

## Prior-Art Boundaries

### RGB Cube / Hue Hexagon

Smith 1978 により、RGB 色空間を cube として扱い、黒白軸まわりの有彩 6 色を hue hexagon として読むことは既知である。

CHROMALUM 側の差分候補は hue hexagon 自体ではなく、同じ 6 色経路を `GF(2)^3` の 1-bit Gray cycle、GRB Binary Tone zigzag、dice face adjacency として同時に読む統合である。

実装上の `0..4` CHROMALUM チャンネルも、新しい知覚色空間の発見を主張するものではない。既知の hue hexagon を GRB 4:2:1 の 15度交点格子と厳密に結び、sRGBバイト量子化をモデルの外へ追い出すための内部代数座標である。

### Boolean Lattice / RGB-CMY Duality

JSSD の CMY color cube II は、Theory タブの Hasse diagram 説明にかなり近い。8 元の Boolean lattice、補元、join `U`、meet `∩`、RGB/CMY 双対は既知として扱う。

限定調査における CHROMALUM 側の差分候補は、`B3` を GRB Binary Tone レベル順序、補色-dice、Fano/Hamming、K8 分解へ接続する点にある。

### `Z2^3` / Fano

Taylor 2013 は、色加算を `Z2 x Z2 x Z2` として扱い、Fano plane coloring へ接続する。したがって「8 色は XOR 群になる」「Fano 線は XOR-zero triples である」は新規主張にしない。

限定調査における CHROMALUM 側の差分候補は、Taylor の色加算遊びを RGB display primaries、GRB Binary Tone、Hamming syndrome labels、多面体分解と同じ UI に統合する点である。

### Hamming(7,4)

Hamming 1950 は error-detecting / error-correcting code の原典であり、Fano 平面の 7 点を Hamming(7,4) 符号の parity-check matrix の 7 列として読むことは標準的である。Theory タブでは、色そのものを符号語とは呼ばず、`1..7` を座標位置 / syndrome label として扱う。この区別は維持する。

### Historical GRB 4:2:1 Color Codes

NEC の _PC-8001B N-BASIC Reference Manual_ (1981) Table 2-1 と、Vickers の _Sinclair ZX Spectrum BASIC Programming_ (1982) Chapter 16 は、どちらも次の色番号を掲載する。

```text
0 Black, 1 Blue, 2 Red, 3 Magenta,
4 Green, 5 Cyan, 6 Yellow, 7 White
```

ZX Spectrum manual の Appendix E は、3 bit の先頭から Green, Red, Blue であると明記しており、これは整数として `4G+2R+B` である。Chapter 16 はさらに、通常輝度の 8 色が白黒 TV 上ではこの番号順の明るさになると説明する。

今回直接確認した最古の完全一致資料は 1981 年版 NEC manual である。ただし、これは優先権の確定ではない。それ以前の版・機器・実装に同じ表があった、あるいは NEC が最初だった、とは今回の資料だけから判断しない。

### GRB Binary Tone

GRB Binary Tone の整数番号は歴史的に既知である。CHROMALUM は、三つの無名の正整数重みの部分和が0..7を埋める数学から `{1,2,4}` を得て、独立な明るさ順 `K<B<R<M<G<C<Y<W` がそれらを B、R、G へ割り当てる、二経路の収束としてこの番号を再解釈する。

```text
level = 4G + 2R + B
tone = level / 7
```

この対応により、bit significance は `G,R,B` の順になり、`lv = 4G + 2R + B` が明るさ順位と tone 順の両方に一致する。CHROMALUM 側の候補的な差分は番号列ではなく、純粋数学と色の順序が同じ名前付き valuation へ収束することの明示、`tone=level/7` という正規化、および他の代数・幾何構造との統合にある。

### Dice / Cube Net / Stella

標準サイコロの対面和 7、cube nets、stella octangula は既知である。CHROMALUM 側の差分候補は、補色 tone 反転から die rank sum 7 を導き、さらに hue Gray path を 2-2-2 staircase net へ結びつける統合である。

K8 分解も、個別の graph / polyhedra は既知である。限定調査における CHROMALUM 側の差分候補は次の色彩アトラス化である。

```text
distance 1 = Q3 cube edges
distance 2 = stella octangula edges
distance 3 = complement matching
```

## Citation Strategy

論文・README・UI で引用するなら、次の役割分担にする。

1. Smith 1978: RGB cube / hue hexagon。
2. JSSD CMY color cube II: Boolean lattice / Hasse / RGB-CMY duality。
3. Taylor 2013: `Z2^3` color addition / Fano coloring。
4. NEC 1981 / Vickers 1982: 正確な GRB 4:2:1 色番号とその歴史的実装。
5. Hamming 1950 / Fano/Hamming 標準資料: Hamming code の原典、`PG(2,2)` と Hamming(7,4) の既知対応。
6. MathWorld Cube / Tetrahedron 2-Compound: cube nets と stella 背景。

## References

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
