# Music-Linked Visualization — 先行研究と設計ノート

著者: Doctor Chromaticus
作成日: 2026-04-28
整理方針: 2026-04-29
再査読: 2026-07-13

## Purpose

このノートは、CHROMALUM の `LinkedVisualization` と Music タブにとって、研究・開発上の判断に直接効く先行研究だけを残す。2026-07-13 時点の限定調査であり、網羅的な色音対応史、感覚代行システム一覧、または新規性判定ではない。次のどちらかに該当するものを保持する。

1. `hue -> pitch`、`tone/brightness -> gain`、`hue -> timbre` などが既知であることを示す文献。
2. Music タブの設計、聴取負荷、安全性、Web Audio 実装に直接効く文献。

## Search Record (2026-07-13)

- 対象: color sonification、視覚-聴覚感覚代行、parameter-mapping sonification、色音対応の批判的レビュー、Web Audio 実装。
- 検索面: 公開 Web 全文検索、ICAD Proceedings、MDPI Sensors、PLOS ONE、NIME Proceedings、_The Sonification Handbook_、W3C 仕様、および DOI landing pages。
- 検索語群: `color sonification hue pitch brightness amplitude`、`color to sound sensory substitution usability`、`hue timbre saturation pitch`、`sonification mapping systematic review pitch evaluation`、`color sound correspondence review`、`Web Audio sonification gain panner analyser`、および既知システム名 `See ColOr`、`Colorophone`、`Sonifyd Colormatrics`。
- 確認資料: 査読論文、会議録、書籍の章目次、公開された installation record、W3C 仕様、および訂正記事。
- 未調査・不完全: 全 color organ 史、音楽理論・作曲実践の全系譜、特許・製品、非英語文献、未公刊作品、全ての視覚障害当事者研究、長期臨床評価、聴覚安全規格の体系調査、全引用ネットワーク。

否定的な検索結果はこの範囲だけに限定する。「先行例がない」「唯一である」とは表現しない。

## Executive Summary

Music タブの次の個別要素は既知であり、新規性として主張しない。

- 色相・彩度・明度などを音高、音色、音量、定位へ写す色ソニフィケーション。
- `hue -> pitch` と `brightness/tone -> amplitude` の組み合わせ。
- 音響パラメータ mapping の一般原則。
- ブラウザで Web Audio API を使って oscillator / gain / panner / analyser を構成すること。
- 色相と音高に普遍的な心理物理対応がある、という主張の危うさ。

CHROMALUM 側のプロジェクト固有性の候補は、これらの既知要素そのものではなく、GRB Binary Tone 順の 8 頂点 RGB アトラス、L0/L7 補色半径、`alpha0` / `alpha7` 位相、GRB bit order、Fano/Hamming/K8/polyhedra などの代数的色彩構造と、音響写像を同じ操作体系で結合している点である。これは限定調査に基づく位置づけであり、確定した新規性主張ではない。

## Essential Prior Art

| Keep | Source | Why it matters |
| --- | --- | --- |
| 必須 | See ColOr | 色ソニフィケーションの代表例。特に hue を直接 pitch ではなく timbre/instrument family へ写す設計が、Music タブの `Bit Spectrum` 方針に効く。 |
| 必須 | Colorophone 2.0 | 感覚過負荷を避ける設計原則、START/STOP、空間対応、短時間監査での不快症状、および評価対象の限界を示す実践的参考。 |
| 必須 | Sonifyd:Colormatrics | `hue -> musical pitch`、`brightness -> amplitude` が CHROMALUM に近い直接比較対象。 |
| 必須 | The Sonification Handbook | パラメータ mapping、聴取可能性、評価設計の基礎。 |
| 重要 | Dubus & Bresin systematic review + 2014 correction | 物理量の sonification で使われた mapping の頻度と、個別 mapping の評価が稀だったことを示す。人気と有効性を区別する根拠。 |
| 重要 | Spence & Di Stefano review | 色音対応や color organ 史を批判的に整理し、普遍的 hue-pitch 対応を強く主張しないための境界線になる。 |
| 必須 | Web Audio API | Music タブの実装基盤。音響エンジン自体は標準技術であることを示す。 |

## Direct Prior Art

### See ColOr

[See ColOr](https://icad.org/Proceedings/2010/BolognaDevillePun2010.pdf) は、HSL 色空間を使った色ソニフィケーションの代表例である。

文献が直接報告すること:

- 色相を楽器音色、彩度を音高、明度を声またはダブルベース系の音へ割り当てる。
- 著者らは、色相と楽器音色の対応は pitch 周波数との対応より学習しやすいという設計理由を述べる。
- 2010 年論文の深度実験は、十分に訓練した 1 名の blindfolded participant を中心とする進行中研究であり、一般的な有効性を確立する比較試験ではない。

CHROMALUM への設計推論:

- CHROMALUM では、単純な hue -> timbre よりも `GF(2)^3` の bit basis を音色成分へ写す `Bit Spectrum` の方がモデルに合う。
- この推論は See ColOr が検証した結論ではない。

### Colorophone 2.0

[Colorophone 2.0](https://www.mdpi.com/1424-8220/21/21/7351) は、色をリアルタイムにステレオ音景へ変換するウェアラブル装置である。

文献が直接報告すること:

- 設計原則として、感覚過負荷を避けるため環境情報のうち重要部分だけを伝えることを挙げる。
- 視覚障害者向け UI に sonification の START / STOP 操作を備える。
- Colorophone 2.0 の usability audit は、UX、認知科学、質的研究の**晴眼者 3 名**による専門家監査であり、視覚障害当事者による効果検証ではない。
- 3 名全員が約 2 時間後に頭痛と吐き気を報告した。著者らは空間変換、カメラ位置、白色音の不快さを原因候補として挙げ、視覚位置と聴覚空間を一致させるよう推奨した。

CHROMALUM への設計推論:

- 音量の低い初期値、明確なミュート・停止、同時発音数の制限は、上記を受けた CHROMALUM の予防的な設計判断である。低疲労プリセットは評価を伴う将来候補であり、現行実装の機能要件とはしない。
- これら個別機能の安全性や有効性を Colorophone 論文が直接検証したわけではない。
- 代数構造をモードごとに分ける方針も CHROMALUM 側の推論であり、当事者を含む評価が別途必要である。

### Sonifyd:Colormatrics

[Sonifyd:Colormatrics](https://nime.pubpub.org/pub/efyd2zra) は、Woohun Joo による NIME 2022 installation であり、画像やピクセルの色を音へ写す NIME 系の実践である。hue を musical pitch、saturation を detune、brightness を amplitude に対応させる。

文献が直接報告すること:

- `hue -> pitch` と `brightness -> amplitude` は既存例があるため、CHROMALUM の新規性にはしない。

CHROMALUM への設計推論:

- CHROMALUM では、どの色集合を鳴らすか、どの対称性を操作できるかを差別化点にする。
- saturation の代わりに、補色ペア、位相差、Hamming distance、Fano line membership を音響パラメータへ写す。

## Design References

### The Sonification Handbook

[The Sonification Handbook](https://sonification.de/handbook/downloads/) は、聴覚表示、パラメータ mapping、聴取可能性、評価設計の基礎資料である。本ノートでは特に Chapter 2 “Theory of Sonification”、Chapter 4 “Perception, Cognition and Action in Auditory Displays”、Chapter 6 “Evaluation of Auditory Display”、Chapter 15 “Parameter Mapping Sonification”、Chapter 17 “Auditory Display in Assistive Technology” を参照する。

文献から採る設計原則:

- 数式対応より、ユーザーが識別できる音の差を優先する。
- 音量、周波数範囲、同時発音数、聴取疲労を最初から設計に入れる。
- デモ用途と分析用途では、同じ mapping でも音の密度を変える。

### Systematic Review of Mapping Strategies

[A Systematic Review of Mapping Strategies for the Sonification of Physical Quantities](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0082491) は、60 projects から物理量と音響次元の mapping 495 件を抽出した systematic review である。Table 9 は [2014 年の correction](https://doi.org/10.1371/journal.pone.0096018) で訂正されているため、訂正版を参照する。

文献が直接支持すること:

- 対象文献集合では pitch が最も多く使われた auditory dimension だった。
- 使用頻度は成功・有効性の証明ではない、と著者ら自身が限定する。
- 個別 mapping に assessment label があったのは 60 projects 中 7 件（11.7%）で、mapping 評価は稀だった。
- 調査範囲は physical quantities の sonification であり、色彩構造や CHROMALUM の mapping を直接評価していない。

CHROMALUM への設計推論:

- `tone mode`、`complement mode`、`Fano line mode`、`Hamming mode` のように目的別に分け、個別 mapping を評価可能にする。
- 「複数パラメータを同時割当すると認知負荷が必ず上がる」という命題を、この review の直接結論として引用しない。モード分割は Handbook の知覚・評価上の原則も踏まえた CHROMALUM の設計仮説である。

### Spence & Di Stefano Review

[Coloured hearing, colour music, colour organs, and the search for perceptually meaningful correspondences between colour and sound](https://doi.org/10.1177/20416695221092802) は、Spence と Di Stefano による i-Perception 2022 年論文であり、色聴、カラーオルガン、色と音の対応史を批判的に整理している。

文献が直接支持すること:

- `hue -> pitch` を心理物理的な普遍対応として主張しない。

CHROMALUM への設計推論:

- CHROMALUM では「色を音で正しく再現する」ではなく、「離散代数的な色彩構造を音でも操作・比較できる」と表現する。
- CHROMALUM、Major、Octatonic、Whole-tone は、知覚的真理や同格の「音律」分類ではなく、完成した作曲的・構造的 pitch mapping preset として扱う。

## Implementation Reference

### Web Audio API

[Web Audio API](https://www.w3.org/TR/webaudio/) は、ブラウザで OscillatorNode、GainNode、StereoPannerNode、AnalyserNode、DynamicsCompressorNode などを使って音を生成・処理する標準仕様である。

仕様が直接定めること:

- oscillator、gain、panner、analyser、compressor などを AudioNode graph として構成・処理する標準モデルを定める。

CHROMALUM への設計推論:

- Web Audio の使用自体は CHROMALUM の新規性に含めない。
- 現行実装は gain ramp、compressor、全停止を備え、持続 drone は初期 mute、master は音量 `0.7`・unmuted で開始する。より低い master 初期値、全体 mute、同時発音数上限を安全要件にするかは、実測と当事者評価を経て決める。
- `deltaAlpha` の `abs(sin(deltaAlpha / 2))` は実際の音波干渉ではなく、画面上の補色ベクトル和に由来する symbolic / phase-derived gain として説明する。

## Development Positioning

Music タブの中心的な位置づけは、色音対応の発見ではなく、Theory タブの離散代数構造を音響操作へ接続したことである。

実装・説明では次を守る。

1. `hue -> pitch` は structural / compositional mapping と呼ぶ。
2. `tone -> radius/gain` は GRB Binary Tone に基づく写像であり、知覚明度ではない。
3. `Bit Spectrum` は `GF(2)^3` の bit basis を音色成分へ写すモードとして扱う。
4. Fano、Hamming、K8、tetra、octahedron は、pitch ではなく structure-specific sonification で分けて鳴らす。
5. 初期状態、音量、停止操作、長時間聴取の安全性を UI 設計に含める。

## References

- Bologna, Guido, Benoît Deville, and Thierry Pun. 2010. “Sonification of Color and Depth in a Mobility Aid for Blind People.” _Proceedings of the 16th International Conference on Auditory Display (ICAD 2010)_, Washington, D.C., 9–15 June 2010. [PDF](https://icad.org/Proceedings/2010/BolognaDevillePun2010.pdf). See especially §§3.2, 4–6.
- Osiński, Dominik, Marta Łukowska, Dag Roar Hjelme, and Michał Wierzchoń. 2021. “Colorophone 2.0: A Wearable Color Sonification Device Generating Live Stereo-Soundscapes—Design, Implementation, and Usability Audit.” _Sensors_ 21(21): 7351. [DOI: 10.3390/s21217351](https://doi.org/10.3390/s21217351). See especially §§2, 6.3.5, 7.
- Joo, Woohun. 2022. “Sonifyd:Colormatrics: Real-time sonification for abstract visual patterns in an immersive projection space.” _NIME 2022 Installations_. [DOI: 10.21428/92fbeb44.e0105d02](https://doi.org/10.21428/92fbeb44.e0105d02).
- Hermann, Thomas, Andy Hunt, and John G. Neuhoff, eds. 2011. _The Sonification Handbook_. Berlin: Logos Verlag. [Book and chapter downloads](https://sonification.de/handbook/downloads/). Relevant chapters: 2, 4, 6, 15, 17.
- Dubus, Gaël, and Roberto Bresin. 2013. “A Systematic Review of Mapping Strategies for the Sonification of Physical Quantities.” _PLOS ONE_ 8(12): e82491. [DOI: 10.1371/journal.pone.0082491](https://doi.org/10.1371/journal.pone.0082491). See Abstract, §§2.1, 5.1, 5.2, 6.
- The PLOS ONE Staff. 2014. “Correction: A Systematic Review of Mapping Strategies for the Sonification of Physical Quantities.” _PLOS ONE_ 9(4): e96018. Corrected Table 9. [DOI: 10.1371/journal.pone.0096018](https://doi.org/10.1371/journal.pone.0096018).
- Spence, Charles, and Nicola Di Stefano. 2022. “Coloured hearing, colour music, colour organs, and the search for perceptually meaningful correspondences between colour and sound.” _i-Perception_ 13(3). [DOI: 10.1177/20416695221092802](https://doi.org/10.1177/20416695221092802).
- W3C. _Web Audio API_. W3C Recommendation, living specification. <https://www.w3.org/TR/webaudio/>. Accessed 2026-07-13.
