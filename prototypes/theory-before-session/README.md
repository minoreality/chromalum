# Six-chapter Theory prototype

2026-09-27の会話で組み直した六章構成のTHEORYを保存した試作ページ。
ユーザーの指定により、通常のTHEORYは会話開始時の
コミット `e2cba60b259be600d3c278f736e67c5a64ab449d` の版へ戻し、
入れ替え直前の六章構成版をこちらへ移した。

Vite起動後、`/chromalum/prototypes/theory-before-session/` を開く。
既存のリンクを保つため、URLとディレクトリ名はそのまま使用している。
ページ冒頭の「通常のTHEORY」から、会話開始時の構成へ戻した開発ページを開ける。

## 保存した内容

主な導出は次の六章。後半にはK₈、Fano・Hamming、多面体、結論、対応表が続く。

1. 三原色と八状態
2. 集合演算と包含関係
3. 反転・距離・有彩六閉路
4. 全順序と二進重み
5. 順位と演算の関係
6. 有彩六閉路の連続拡張

日本語・英語の本文、二入力のOR・AND、初期表示がハッセ図の切り替え図、
その他の図と操作、スタイルを保存している。

`snapshot/src/` には、入れ替え直前の `src/theory-main.tsx` とその参照先51ファイル、
関連する四つの単体テスト、テストの共通設定がある。
`snapshot/docs/` は当時の理論ノート二本と実装計画。
`snapshot/e2e/theory.spec.ts.txt` は当時のブラウザテストの参照用コピー。
これら60ファイルは改行をLFへ統一し、その他の内容は保存時のまま保っている。
保存元のパスとGit形式のblob IDは `snapshot.json` に記録している。
保存元には当時の未コミットの編集を含むため、`baseCommit` だけではこの内容を再現できない。

現在の `src/` は読み込まない。スタイルも `snapshot/src/styles/global.css` に固定している。
元の共有モジュールに残る未使用export・型については、この保存ディレクトリ内に限り
knipの該当する指摘を除外している。
React・Viteなどの実行環境はリポジトリの依存関係を共有する。

## 確認方法

本番のビルド入口には追加していない。関連単体テストは `.check.ts` / `.check.tsx` に
名前を変え、通常のテスト探索から外している。試作専用の設定で手動実行する。

```sh
npm run dev:theory
npx tsc --noEmit -p prototypes/theory-before-session/tsconfig.json
npx vitest run --config prototypes/theory-before-session/vitest.config.ts
npx playwright test -c prototypes/theory-before-session/playwright.config.ts --workers=1
```

単体テストは全64入力組のOR・AND、章構成、本文の境界、カラーキューブを確認する。
ブラウザ検証は、保存ファイルの一致、原色選択、二入力とOR図のキーボード操作、
ハッセ図とカラーキューブの切り替え、言語切り替え、320px・1280pxでの表示、
通常のTHEORYへ戻るリンクと入れ替え後の構成を確認する。

本文と図の著作者はDoctor Chromaticus。
実装はリポジトリの [MIT License](../../LICENSE)、本文・ラベル・図の内容は
[CC BY 4.0](../../docs/LICENSE.md) に従う。
