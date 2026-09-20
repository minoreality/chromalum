# AGENTS.md

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
npm run verify                   # format:check, lint, knip, typecheck:all, build, vitest — no coverage
npm run verify:theory            # typecheck:app + Theory unit tests only
npm run test:e2e -- --workers=2  # default worker count flakes on this machine
npx playwright test e2e/theory.spec.ts -g "<title>"
```

`.husky/pre-push` runs `typecheck:app` and `lint`, about 20 seconds against the 77 a full
`verify` takes. It leaves the tests to you and to `ci.yml`, which runs all of them on the
pull request anyway: the suite is load-sensitive enough that the hook could refuse a push
over a timeout in something the change never touched. Run `npm run verify` yourself before
a push worth trusting. An e2e failure is only real if it survives `--workers=1` in
isolation.

## CI

`ci.yml` runs two jobs side by side: `checks` (`typecheck:all`, `lint`, `deadcode`,
`format:check`, `test:coverage`) and `e2e 1/3` … `e2e 3/3`, which split `test:e2e` across
three runners with `--shard` and run `test:pwa` on the first. Note `test:coverage`, which
`npm run verify` does **not** run, so coverage thresholds are a PR gate you cannot reproduce
with `verify` alone. `ci.yml` triggers on `pull_request` **only**, but a push straight to `main` is not
unchecked: `deploy.yml` runs `typecheck:all`, `lint`, `deadcode`, `format:check` and
`test:coverage` before it builds and publishes to Pages. That is after the fact — a failure
stops the deploy, not the push, so `main` keeps the commit and Pages keeps serving the last
good build. What never runs outside a PR is `test:e2e` and `test:pwa`, so land anything
touching layout, copy, or tests through a PR. `main` is protected — a PR plus the `checks`,
`e2e 1/3`, `e2e 2/3`, `e2e 3/3` and `analyze (javascript-typescript)` checks — but `enforce_admins` is off, so a direct push
succeeds with a bypass notice. That notice is not a failure; it means the protection was
skipped.

## Rejected tooling changes

Each of these is ordinary advice elsewhere, was proposed against this repo, measured, and
dropped. Re-propose one only with a number that contradicts the one recorded here.

- **Turn off `required_status_checks.strict`.** Of the 15 pull requests authored by hand,
  none has ever overlapped another, and the median one stayed open 7 minutes, so `main`
  does not move between a green check and the merge. The one session that did pay for
  `strict` had twelve branches in flight at once; collect those onto a single branch and
  merge that instead.
- **Point `test:e2e` at a production build.** 36 of the suite's 49 `page.goto` targets are
  `theory-dev.html`, which `vite build` does not emit. Adding it to the build inputs would
  publish a development harness to Pages, which Prototypes forbids for the same reason.
- **Cache the Playwright browser between runs.** The install step costs 37 seconds, most of
  it the `apt-get` work behind `--with-deps` that a cache hit still has to repeat.
- **Filter `ci.yml` by path so a docs-only change skips the suite.** Every job is a
  required check: a skipped job never reports, and the pull request can then never merge.
- **`trace: "retain-on-failure"`.** `on-first-retry` is not stale config but the counterpart
  of `retries`, which is unset on purpose: setting `retries` brings the trace with it at no
  cost, while `retain-on-failure` instruments every test on every run. Whether to set
  `retries` is held open until a86016b has had time to show whether it moved a flake rate
  measured at one run in 46 days.

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

## The Windows checkout, and why a local gate can lie

Two things about this machine change what a local run proves. Both are invisible to `verify`
and to CI, so the only signal is checking directly.

**The lockfile carries 26 `"libc": ["glibc"|"musl"]` fields, and an old npm eats them.**
`volta.npm` pins 11.19.1, which keeps them. 11.9.0, pinned from 2026-04-14 until 551bf5a,
deleted all 26 on any install — 78 lines of noise on top of the real change, which landed
unnoticed once in 8fec4ba (2026-06-24) and took Dependabot two months to restore. `libc` is
what picks the `-gnu` against the `-musl` binding on Linux (@oxc-parser 8, @oxc-resolver 8,
@rolldown 6, lightningcss 4), so nothing breaks on glibc and nothing goes red. Do not pin npm
below 11.19.1, and do not reach for `npm@latest` (12.0.2) either: it keeps the fields but
demands `^22.22.2 || ^24.15.0 || >=26.0.0`, the same gap that holds jsdom 30 back. For a
Dependabot pull request, cherry-pick its commit rather than regenerate — its lockfile is
already right. After any lockfile change, `grep -c '"libc"' package-lock.json` must still
print 26.

**`npm i --no-save --no-package-lock <pkg>` silently desyncs `node_modules`.** It re-resolves
every caret range while it is there, so a one-package install moved knip 6.35.1 to 6.37.0 and
oxc-parser 0.148.0 to 0.150.0 on 2026-09-19 without touching `package.json` or the lockfile. A
`verify` run after that measures a tree CI never builds. `npm ci` puts it back.

Smart App Control (`HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy` →
`VerifiedAndReputablePolicyState = 1`) can also block an unsigned native binding with
`An Application Control policy has blocked this file`, which stops `verify` at `deadcode`. It
judges each file by Microsoft's cloud reputation, so it is per-binary and transient — it
blocked `@oxc-parser/binding-win32-x64-msvc` 0.148.0 on 2026-09-18 and no longer did on
2026-09-19. Do not turn Smart App Control off; on Windows that cannot be undone without
reinstalling.

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

## Claim boundaries

Theory prose in `src/i18n/en.ts` and `ja.ts` is scholarly content under `docs/LICENSE.md`
(CC BY 4.0, with its own citation templates), so rewording it edits a published claim, not UI
chrome. `src/i18n/__tests__/theory-copy.test.ts` pins boundary sentences with `toContain`,
which catches a sentence that disappears and not one that oversteps. The boundaries, each with
its section in `docs/algebraic-color-model.md`:

- The eight levels are the **GRB Binary Tone** (`Tone` / `トーン`), a rank coordinate
  `L = 4G + 2R + B` that records the brightness order and subset-sum structure of the binary
  vertices — not a scale of perceived or photometric brightness. "Green is weighted most" means
  green is the most significant bit, never that green is four times brighter
  (§Scope and Open Problem).
- Only the brightness _order_ of the eight binary vertices enters the mathematics:
  `w_G > w_R + w_B` and `w_R > w_B > 0`. Never substitute BT.601 or any photometric coefficient
  as an integer weight, and never imply perceptual uniformity or derivation from an external
  brightness standard (§Minimal Choices and Derived Definitions, §Evidence Boundary).
- Two independent paths converge on the same named rank: the unnamed minimal subset-sum weights
  `{1,2,4}` and the empirical primary order `B < R < G`. Present both; an explanation that
  starts from "a coordinate convention" was rejected by the author as 恣意的
  (§二経路の収束と感度).
- XOR (⊕) is the symmetric difference of the Boolean ring `(A,⊕,∧) ≅ 𝔽₂×𝔽₂×𝔽₂` — not the field
  GF(8), and not physical mixing. Describe it as composition and cancellation of channel
  inversions; the Theory tab's mixing figure is join `∨` / meet `∧`, a different operation
  (§GF(2)^3 / Z2 x Z2 x Z2, §One Boolean Algebra, Two Term-Equivalent Presentations).
- The pure-hue loop `H` is a continuous display layer. Candidates sharing a level are
  representatives in a fiber of `λ`, not new elements of `A` and not XOR operands
  (§Scope and Open Problem; README "Design Intent").
- Image import applies the 4:2:1 weights directly to sRGB input as an independent, lossy
  classifier; its score is none of GRB Binary Tone, perceptual lightness, or photometric
  luminance (§Color Labels).
- The algebraic core and the `4G+2R+B` numbering are prior art (NEC 1981, Sinclair Research
  1982); novelty is claimed only for the synthesis (§Abstract; Pars II).

After a Theory copy change run `npm run test:theory-copy`, then `npm run verify:theory`.

## Commit messages

Work lands through squash-merged PRs. The subject is the PR title, or the lone commit's
subject when the PR holds one; the body is always the commit messages, each subject prefixed
with `* ` once there is more than one. The PR description is discarded, so the commit messages
are the permanent record — a PR may carry several commits without any of their subjects being
lost. Write them under these rules, not as work summaries.

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
docs/                    README.md maps the notes; algebraic-color-model.md is the math, cited by commit SHA
src/styles/global.css    every rule in the app
e2e/                     theory, stella-view, stella-depth, app-flows, accessibility, pwa
```
