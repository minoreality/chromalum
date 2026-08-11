# Scholarly Content License

The scholarly and explanatory content of this repository is licensed under the
**Creative Commons Attribution 4.0 International License** (CC BY 4.0).

This CC BY 4.0 content includes:

- the research and explanatory documents listed below;
- the authored prose, labels, and section text displayed in the Theory tab;
- the rendered explanatory diagrams and theory visualizations displayed in
  the Theory tab.

The research-document set currently includes the core corpus and Music
Appendix listed below:

- `algebraic-color-model.md`
- `prior-art-algebraic-color-model.md`
- `theory-tab-prior-art-and-improvements.md`
- `music-linked-visualization.md`
- `prior-art-music-linked-visualization.md`

This is separate from the [MIT License](../LICENSE), which covers the
application source code, tests, build configuration, and non-scholarly app
assets. The React/TypeScript implementation of the Theory tab (component
logic, hooks, styles, and rendering algorithms) remains MIT-licensed. The
CC BY 4.0 license covers the expressive content surfaced by that
implementation: authored prose, section labels, and the rendered diagrams
when reused as visual artifacts (e.g., screenshots, embedded images).

Technical project documentation in this directory, such as `user-guide.md` and
`architecture.md`, follows the repository's MIT-licensed project documentation
unless a document states otherwise.

## Summary (human-readable)

You are free to:

- **Share** — copy and redistribute the material in any medium or format.
- **Adapt** — remix, transform, and build upon the material for any
  purpose, even commercially.

Under the following terms:

- **Attribution** — You must give appropriate credit, provide a link to
  the license, and indicate if changes were made. You may do so in any
  reasonable manner, but not in any way that suggests the licensor
  endorses you or your use.
- **No additional restrictions** — You may not apply legal terms or
  technological measures that legally restrict others from doing anything
  the license permits.

## Full Legal Code

The full text of CC BY 4.0 is available at:
<https://creativecommons.org/licenses/by/4.0/legalcode>

The human-readable deed is at:
<https://creativecommons.org/licenses/by/4.0/>

## Author

The CC BY 4.0 content is attributed to:

> **Doctor Chromaticus**

This is a pseudonymous attribution. Citations should use the name
verbatim — it is a mononym (no first/last name split), which has
implications for BibTeX entries (see the double-brace handling in the
template below).

## Core Corpus: _Tractatus Chromaticus_

The following three documents are collectively known as the _Tractatus
Chromaticus_ ("Chromatic Treatise"). They are read as three parts of a
single unified treatise on the discrete algebraic color model that underlies
the CHROMALUM application:

- **Pars I**: `algebraic-color-model.md`
  English title: Algebraic Color Model
  日本語タイトル: 離散代数的色彩モデル
- **Pars II**: `prior-art-algebraic-color-model.md`
  English title: Algebraic Color Model — Prior Art
  日本語タイトル: 離散代数的色彩モデル — 先行研究
- **Pars III**: `theory-tab-prior-art-and-improvements.md`
  English title: Theory Tab — Prior Art and Improvement Proposals
  日本語タイトル: Theoryタブ — 先行研究と改善提案

When citing the corpus as a whole, _Tractatus Chromaticus_ is the
collective title. When citing a specific part, use the document title
above and identify the corpus with _in Tractatus Chromaticus_.

## Music Appendix

The following two documents are companion notes to the core corpus. They
extend the same discrete algebraic color model into LinkedVisualization and
sonification, but they are not additional parts of _Tractatus Chromaticus_:

- **Appendix A**: `music-linked-visualization.md`
  English title: Music-Linked Visualization
  日本語タイトル: Music-Linked Visualization
- **Appendix B**: `prior-art-music-linked-visualization.md`
  English title: Music-Linked Visualization — Prior Art and Design Notes
  日本語タイトル: Music-Linked Visualization — 先行研究と設計ノート

When citing a Music Appendix note, use the document title above and identify
it as a CHROMALUM Music Appendix note.

## Theory Tab Content

The Theory tab is the interactive presentation layer of the same scholarly
content. Its authored prose, labels, explanatory annotations, and rendered
theory diagrams are licensed under CC BY 4.0 when reused as content. The
software implementation that renders them remains under the repository's MIT
License.

When citing the Theory tab as a whole, use **CHROMALUM Theory Tab** as the
title. When citing a specific section or figure, use that section or figure
title and identify it as part of the CHROMALUM Theory Tab.

## How to Cite

CC BY 4.0 §3(a) requires, to the extent the information was supplied and as
reasonably practicable for the medium, appropriate creator attribution,
retention of the specified copyright/license notices and source link, a link
or URI to CC BY 4.0, and an indication of modifications. It also prohibits
implying endorsement. See the
[legal code, §3(a)](https://creativecommons.org/licenses/by/4.0/legalcode#s3a)
for the controlling wording.

Creative Commons recommends **TASL** as a practical attribution mnemonic. It
is a best-practice format, not a separate four-element legal test and not an
additional restriction imposed by this repository:

- **T**itle of the work (use the specific document title from the lists
  above; _Tractatus Chromaticus_ for the core corpus; _CHROMALUM Music
  Appendix_ for the Music companion notes; _CHROMALUM Theory Tab_ for the
  interactive Theory tab)
- **A**uthor: Doctor Chromaticus
- **S**ource URL: <https://github.com/minoreality/chromalum>
- **L**icense: CC BY 4.0,
  <https://creativecommons.org/licenses/by/4.0/>

If you adapt, translate, abridge, or otherwise modify the material,
you must also indicate that changes were made.

The templates below cover the most common cases. Use whichever fits
your medium. Equivalent attribution is acceptable when it satisfies CC BY
4.0 §3(a); following TASL is recommended because it makes compliance and
source tracing clear.

### Versioned citations for living research notes

The research notes can change after publication. For reproducible scholarly
citation, cite the exact revision you consulted:

1. use a release tag or commit SHA rather than only the moving default branch;
2. link to the specific file at that revision, for example
   `https://github.com/minoreality/chromalum/blob/<commit-sha>/docs/algebraic-color-model.md`;
3. record the revision identifier and access date; and
4. identify the relevant section, figure, table, or line anchor when practical.

When discussing the corpus as an evolving project, the repository root may be
cited in addition to—not instead of—the versioned file. This versioning policy
is a scholarly reproducibility recommendation, not an extra condition of CC BY
4.0.

### Academic paper / journal (reference list)

```text
Doctor Chromaticus, "Algebraic Color Model,"
in Tractatus Chromaticus, 2026.
Revision <commit-sha>, accessed <YYYY-MM-DD>.
https://github.com/minoreality/chromalum/blob/<commit-sha>/docs/algebraic-color-model.md,
licensed under
CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
```

BibTeX (note the double braces — they prevent BibTeX from splitting
the mononym into "first name / last name"):

```bibtex
@incollection{chromalum_acm_2026,
  author    = {{Doctor Chromaticus}},
  title     = {Algebraic Color Model},
  booktitle = {Tractatus Chromaticus},
  year      = {2026},
  url       = {https://github.com/minoreality/chromalum/blob/<commit-sha>/docs/algebraic-color-model.md},
  urldate   = {<YYYY-MM-DD>},
  note      = {Revision <commit-sha>. Licensed under CC BY 4.0,
               \url{https://creativecommons.org/licenses/by/4.0/}}
}
```

In-text citation: `Doctor Chromaticus (2026)`.

For Music Appendix notes, replace `booktitle` / corpus wording with
`CHROMALUM Music Appendix` and use the specific appendix title.

### Blog post / web article (after a quoted block)

```markdown
> "<quoted text>"

Source: "Algebraic Color Model," in
[Tractatus Chromaticus](https://github.com/minoreality/chromalum),
by Doctor Chromaticus, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
```

### Book / textbook (footnote or end-note)

```text
Adapted from "Algebraic Color Model," in
Tractatus Chromaticus by Doctor Chromaticus, CC BY 4.0.
Source: https://github.com/minoreality/chromalum
```

### Slide deck (footer or final credits slide)

```text
Adapted from: Tractatus Chromaticus by Doctor Chromaticus,
CC BY 4.0, github.com/minoreality/chromalum
```

### Translation or summary (adaptation marker required)

```text
This document is a <translation | summary | abridgment> of
"Algebraic Color Model" in Tractatus Chromaticus
by Doctor Chromaticus, CC BY 4.0
(https://github.com/minoreality/chromalum).
Changes: <e.g. translated from Japanese to English; sections 3-4 abridged>.
```

### Figure or table only (caption credit)

```text
Figure N. <caption>. Adapted from Tractatus Chromaticus
by Doctor Chromaticus, CC BY 4.0.
```

### Social media or short-form (where space is constrained)

```text
via Doctor Chromaticus · Tractatus Chromaticus · CC BY 4.0
github.com/minoreality/chromalum
```

### Japanese-language template (日本語の標準形)

```text
出典: 「離散代数的色彩モデル」
（Tractatus Chromaticus, Doctor Chromaticus 作）
版: <commit-sha>（参照日: <YYYY-MM-DD>）
ライセンス: CC BY 4.0
https://github.com/minoreality/chromalum/blob/<commit-sha>/docs/algebraic-color-model.md
```

改変（翻訳・要約・抜粋）を行った場合は、上記に加えて改変内容を
明記してください。例:

```text
（原典を日本語から英語へ翻訳。§3-4 を要約。）
```

## Things You Must Not Do

The license does not allow:

- Suggesting that Doctor Chromaticus or CHROMALUM endorses you, your
  work, or your use of the material.
- Failing to retain the attribution, copyright, license, disclaimer, and
  source information supplied with the material to the extent required by
  CC BY 4.0 §3(a). The license still permits attribution in any reasonable
  manner suited to the medium.
- Reusing material without the attribution required by §3(a). A failure can
  terminate the license, subject to the reinstatement provisions and 30-day
  cure mechanism in CC BY 4.0 §6(b).
- Applying additional legal or technological restrictions (e.g. DRM)
  that prevent downstream users from exercising the same CC BY 4.0
  rights.

Trademarks, logos, and product names (including "CHROMALUM") are not
covered by this license.

---

Copyright (c) 2026 Doctor Chromaticus.
