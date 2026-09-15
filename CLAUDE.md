# CLAUDE.md

Chromalum: a pixel-art tool built on a 3-bit RGB color model, with a Theory tab that
visualizes the algebra behind it (GF(2)³, PG(2,2), Hamming [7,4,3], S(2,3,7)).
React + TypeScript + Vite, deployed to GitHub Pages at base `/chromalum/`.

The math is written up in `docs/algebraic-color-model.md` — a 1,900-line living research
note in Japanese, whose header asks that citations pin a commit SHA. It is the source of
truth when code and intuition disagree. The app stays a static site with no backend; setup
and the Volta-pinned toolchain are in `CONTRIBUTING.md` and are not restated here.

## Commands

```bash
npm run dev                      # vite on 5173
npm run dev:theory               # theory-dev.html — use this for Theory work
npm run verify                   # format:check, lint, knip, typecheck:all, build, vitest
npm run verify:theory            # typecheck:app + Theory unit tests only
npm run test:e2e -- --workers=2  # default worker count flakes on this machine
npx playwright test e2e/theory.spec.ts -g "<title>"
```

`.husky/pre-push` runs `npm run verify`, so a push takes minutes — that is the hook, not
a hang. An e2e failure is only real if it survives `--workers=1` in isolation.

## CI

`ci.yml` triggers on `pull_request` **only**: a push straight to `main` is never
type-checked, linted, or run against e2e. Land anything touching layout, copy, or tests
through a PR. `main` is protected — a PR plus the `validate` and `analyze
(javascript-typescript)` checks — but `enforce_admins` is off, so a direct push succeeds with
a bypass notice. That notice is not a failure; it means the protection was skipped.
`deploy.yml` publishes `main` to Pages on push.

## Fonts, and why layout tests fail only on CI

No webfonts are bundled — `--font-mono` and `--font-sans` are system stacks. Ubuntu CI
has none of the named mono faces and falls back to DejaVu Sans Mono (0.6023em advance
against Consolas' 0.55em), and any glyph the resolved face lacks (`→`, subscript digits)
comes from a full-width CJK fallback — a discrete jump, not a few percent of drift.

So an assertion whose threshold sits within a few percent of a text-derived measurement
passes locally and fails on CI, and Playwright on Windows will not reproduce it. To
reproduce a wide-glyph stack, force `font-family: "MS Gothic"` on the element and measure.

Write layout and assertions to be correct by construction:

- let text wrap (`overflow-wrap: anywhere`) rather than sizing it to fit a box
- derive thresholds from layout geometry (viewBox scale × authored font-size), never from
  a magic px value that matches today's rendering
- stack mutually exclusive strings in one grid cell, inactive ones `visibility: hidden`,
  so the row reserves the tallest whatever the font measures

When a layout check fails only on CI, suspect the font stack before the browser version.

## Prototypes

Experiments that you might want to look at again live in `prototypes/<name>/` with their own
`tsconfig.json` and `playwright.config.ts`, as `prototypes/hue-euler/` does. The isolation is
deliberate and already holds: the production build never sees them (`vite.config.ts` sets no
`rollupOptions.input`, so only `index.html` is an entry), `typecheck:app` covers `src` only,
and `lint` covers `src e2e scripts` only. Register new prototype entrypoints in the `knip`
block of `package.json` or `verify` fails on dead code, and do not add them to the build
inputs — that would publish them to Pages.

The consequence is that CI never touches a prototype: `ci.yml` runs `test:e2e` and `test:pwa`,
not a prototype's own config. That is the intended trade, not an oversight — a broken
prototype must not block the app. Run its checks by hand.

Genuinely throwaway scripts belong in a temp directory, not in the repo.

## Conventions

- **No version numbers, CHANGELOG, tags, or releases.** Git history is the release record.
- Layout shift is a bug, not a cosmetic issue.
- Responsive work uses container queries with `clamp()` / `cqw`, scoped to the breakpoint
  it belongs to. Verify desktop and narrow-vertical, not just one.
- All CSS lives in `src/styles/global.css`. There is no second stylesheet.
- Math notation stays exact: no simplifying `PG(2,2)`, `S(2,3,7)`, `GF(2)³`, or subscripted
  bit labels for readability. English stays for math and audio terms inside Japanese UI.
- Audio is a consequence of the math: a visual invariance must have an audible one.
- Animation honours `prefers-reduced-motion` (see `ColorCube`, `useStellaView`); e2e runs
  with it emulated, so an animation that ignores it passes the suite and fails the user.
- `localStorage.chromalum_lang` selects the UI language; tests set it before the app loads.
- Copy is a test fixture. e2e asserts exact strings and `src/i18n/__tests__` locks wording, so
  an en.ts/ja.ts edit lands with its test updates in the same commit — a copy change alone can
  turn a layout check red.
- New entrypoints must be registered in the `knip` block of `package.json` (it already lists
  `src/theory-main.tsx` and the `prototypes/hue-euler/` files), or `verify` fails on dead code.

## Commit messages

Work lands through squash-merged PRs, so the PR title becomes the permanent subject and the PR
description becomes the permanent body. Write both under these rules, not as work summaries.

**Subject.** Sentence-case imperative, no prefix, no trailing period, at most 65 characters —
the squash appends ` (#NN)`. Name something a later `git log --grep` could find: a component,
file, symbol, constant, tab, or math object, in its in-app casing (`Theory`, `Music`, `GRB`,
`ToneZigzag`). `Refine`, `Improve`, `Update` and `Polish` are not banned verbs, but they carry
no information on their own: 79 of 386 subjects open with one, and they are the ones that are
unreadable today. If the rest of the subject does not name a specific thing, the subject is not
finished. `and` may join two facets of one change, never two changes.

**Body.** None by default — subject-only is the settled style and nothing is lost for a
three-file change. Write one when the information cannot be recovered from the diff:

1. a constant, threshold, or tolerance moved — give the measurement that justified it
2. something was removed, reverted, or deliberately left alone — give the reason, so it is not
   relitigated later
3. a rename or move — list `old → new`, one per line
4. `docs/*.md` changed — state the claim added, changed, or retracted; that SHA is the citation
   unit for the mathematics
5. the change continues or reverses an earlier commit — cite its SHA

Prose, in symptom → mechanism → fix order, carrying real identifiers and numbers. Never a file
list (`git show --stat` says it better), a test count, "all checks pass", or a paragraph that
restates the subject with more nouns.

Dependabot's `chore(deps):` / `chore(ci):` subjects are the bot's format and out of scope.

## Structure

```
src/components/theory/   Theory figures and explorers (29 files)
src/data/                theory-data.ts, color model tables
src/i18n/                en.ts, ja.ts, LanguageContext — key parity covered by tests
src/music/               audio engine
docs/                    algebraic-color-model.md — the math, cited by commit SHA
src/styles/global.css    every rule in the app
e2e/                     theory, stella-view, stella-depth, app-flows, accessibility, pwa
```
