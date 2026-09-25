# Color De Morgan prototype

Theoryとは独立した試作。共通の二入力から「演算の結果を補色にする」経路と「各入力を補色にして双対の演算を取る」経路が同じ色へ至る様子を示す。論理回路版は [de-morgan-circuit](../de-morgan-circuit/README.md) に保存している。

- ORから始める場合の初期入力はGとR。Yの補色と、M・CのANDはともにB。
- ANDから始める場合の初期入力はMとC。Bの補色と、G・RのORはともにY。
- 上部のボタンで二つの法則を切り替える。それぞれの入力選択を保ち、リセットで各モードの初期入力に戻る。
- 二つの入力は八状態から選べる。ラジオボタンは矢印キーでも切り替えられる。
- 各状態を色名・3ビット・部分集合で表示する。
- Theoryのコンポーネント、状態、スタイルを読み込まない。専用のHTML・スクリプト・スタイルだけを使う。
- 本番ビルドの入口には追加しない。アプリからのリンクも追加しない。

Vite起動後、`/chromalum/prototypes/de-morgan/` を開く。AND版を直接開くには `?operation=and` を付ける。

```sh
npm run dev -- --host 127.0.0.1 --port 4173
npx tsc --noEmit -p prototypes/de-morgan/tsconfig.json
npx playwright test -c prototypes/de-morgan/playwright.config.ts --workers=1
```

ブラウザ検証は両モードの初期経路、それぞれ全64入力組の結果、切り替えとリセット、キーボード操作、320〜1186pxでの表示を対象とする。期待する原色集合は集合の所属から求め、画面実装のビット演算とは独立に確認する。
