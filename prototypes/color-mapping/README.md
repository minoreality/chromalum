# Color mapping list prototype

Colorタブから保存した、L0〜L7のレベル別配色一覧。
色候補の直接選択、前後への切替、基準色相からの差分表示、選択レベルの表示を残している。
狭い画面では、元の一覧レイアウトを保ったまま一覧内を横スクロールできる。

開発サーバー起動後、次を開く。

`http://127.0.0.1:5173/chromalum/prototypes/color-mapping/`

## 保存元と再利用

削除前の `src/components/ColorMappingList.tsx` を、このディレクトリの
`ColorMappingList.tsx` へ移した。コンポーネント本体はそのままで、相対importの参照先だけを変更している。
対応する四つの単体テストも `ColorMappingList.unit.tsx` へ移した。

色モデル、候補色、リデューサー、デザイントークン、共通の操作ラベルは、現在の `src/` を共有する。
保存時の「前の色候補」「次の色候補」の日本語・英語ラベルは、`i18n.ts` に保存している。
Hexの別表示には、この一覧をもとにした `src/components/HexPaletteList.tsx` を組み込んでいる。
Hex版は配色の固定に対応し、この保存版は元のUIを保持する。
削除前の完全な依存関係は、コミット `50bd6f1eb6baed4f3a5cb63dca54e54cea67049f` の
`src/components/ColorMappingList.tsx` から参照できる。

配色と選択レベルはこのページ内のメモリーだけに保持する。
本体の作品データや保存済み配色を読み書きしない。
通常アプリからはimportせず、本番ビルドの入口にも追加していない。

## 確認方法

リポジトリのルートから実行する。

```powershell
npx tsc --noEmit -p prototypes/color-mapping/tsconfig.json
npx vitest run -c prototypes/color-mapping/vitest.config.ts
npx playwright test -c prototypes/color-mapping/playwright.config.ts --workers=1
```

単体テストは専用設定で実行し、アプリのVitest対象には入らない。
ブラウザーテストも専用設定で、デスクトップと320px幅で候補色の切替を確認する。
