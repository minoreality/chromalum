# Automata CA Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存CA Labの二次元モデルを、Musicの右側に置くAutomataタブへ移植し、一つの盤面と8色パレットで編集・更新・状態復元を行えるようにする。

**Architecture:** DOMに依存しない計算モデル、状態と保存、Canvasの描画と操作、Reactパネルの順に組み立てる。初期配置・規則・時刻から結果を計算し、選択セルと配置色の変更では結果を再利用する。パネルは初回に遅延読み込みし、その後は非表示でも編集状態を保持する。

**Tech Stack:** 既存のReact、TypeScript、Vite、Canvas 2D、Pointer Events、localStorage、Vitest、Testing Library、Playwright。新しい依存パッケージは追加しない。

**Spec:** [承認済み設計書](C:/dev/chromalum/docs/superpowers/specs/2026-10-04-automata-ca-design.md)（承認時のコミット `01631eb`）。この計画は同書を実装する。計画書の作成段階ではプロダクトコードを変更しない。

## Global Constraints

- タブ名は日英ともに **Automata**、IDとURLハッシュは `automata`、順序は `Gallery, Hex, Source, Glaze, Map, Theory, Music, Automata`。
- 49×49セル、時刻 `t=0..20`。範囲外はK。全セルを同時に更新する。
- 色とコードは `K=000, B=001, R=010, M=011, G=100, C=101, Y=110, W=111`。表示は常に8色。
- 規則は `4, 5, diagonal, diagonal-center, 8, 9, life, rug`。LifeはチャンネルごとにB3/S23、rugはB234/Sなし。
- 初期配置は `rosette, diamond, corolla, luminous, clock, phase-clock, pulse, fireworks, weave, rgb, white, black` の12種類。
- 初回は十字4セル、`rosette`、時刻0、選択座標(24,24)、配置色G。
- 盤面は一つ。時刻0で直接編集し、時刻1〜20では選択と読み取りを行う。
- パレット順は `K, B, R, M, G, C, Y, W`。広い画面では8色一列、狭い画面では4色ずつ二列。
- 保存キーは `chromalum-automata-state-v1`。Source／GlazeのIndexedDBと、移植元のwidgetStateに接続しない。
- 新規スタイルはすべて `src/styles/global.css`。コンテナークエリーと `clamp()`／`cqw` を使う。
- ステップによるレイアウトの位置・寸法の変化を許容しない。明示的なステップ操作にモーションを追加しない。
- 一次元、G／R／B表示、列・行入力、配置色のプルダウン、独立した配置ボタンは追加しない。
- CHROMALUMの絵を初期配置に使う機能、Boolean Network、Sourceへの模様送付、自動再生は保留。
- 既存Theoryの文章、研究ノート、依存関係、ビルドエントリー、バックエンドは変更しない。XORを物理的混色やGF(8)として説明しない。
- 旧タブ番号の互換表は旧順序のまま保つ。push・PR・mergeは別の明示的指示を受けて行う。

## Review Focus

1. localStorageのプロパティ取得・読み書き自体が失敗する場合、および保存値の0・不正項目：妥当な項目とメモリー内の編集を保つ（Task 2）。
2. 追加の指、盤面外への移動、捕捉喪失・設定変更：主ポインターだけが操作を所有し、中断後の移動では編集を再開しない（Task 3）。
3. 小数DPR、右端・下端、非表示の幅0：CSS座標を正しくセルへ変換し、非表示では計測・描画を行わない（Task 3）。
4. `#automata`からの初回表示と遅延読み込み中のタブ移動：保存拒否でも同一起動中の状態を保ち、旧Music番号7をAutomataへ読み替えない（Tasks 4–5）。
5. 日英、MS Gothic、座標48・時刻20、320px幅：ラベルを切らず、時刻の往復で盤面・操作部・パレット・読み取り欄を動かさない（Task 5）。

---

## Files and responsibilities

以下のパスはすべて `C:/dev/chromalum/` を基点とする。

| 作成するファイル                                                                           | 責務                                               |
| :----------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `src/automata/model.ts`                                                                    | 色・規則・寸法の型と定数、二次元の純粋な更新関数   |
| `src/automata/presets.ts`                                                                  | 12プリセットのIDと配置生成                         |
| `src/automata/state.ts`                                                                    | 初期状態、復元値の検証、状態reducer                |
| `src/automata/persistence.ts`                                                              | 専用キーの読み書きと保存失敗の検出                 |
| `src/automata/useAutomataState.ts`                                                         | 即時の状態参照、描画操作中の保存集約               |
| `src/automata/geometry.ts`                                                                 | CSS座標のセル変換、整数格子の線補間                |
| `src/automata/render.ts`                                                                   | DPRを考慮した盤面と選択枠の描画                    |
| `src/automata/useAutomataInteraction.ts`                                                   | ポインターの所有・終了とキーボード入力             |
| `src/automata/AutomataCanvas.tsx`                                                          | 一つのCanvas、表示中のResizeObserverと描画         |
| `src/automata/AutomataPalette.tsx`                                                         | 8色ボタンと選択色の表示                            |
| `src/components/AutomataPanel.tsx`                                                         | 規則・プリセット・時間・読み取り欄をまとめる画面   |
| `src/automata/__tests__/fixtures/ca-golden.ts`                                             | 移植元から固定した配置・更新結果、比較元のハッシュ |
| `src/automata/__tests__/{model,presets,state,persistence,geometry}.test.ts`                | 純粋関数と保存のテスト                             |
| `src/automata/__tests__/{useAutomataState,useAutomataInteraction,AutomataCanvas}.test.tsx` | 操作・保存集約・表示停止のテスト                   |
| `src/components/__tests__/AutomataPanel.test.tsx`                                          | UI・パレット・読み取り・計算再利用のテスト         |
| `src/i18n/__tests__/automata-copy.test.ts`、`e2e/automata.spec.ts`                         | 日英の文言と実ブラウザーの受け入れテスト           |

| 変更する既存ファイル                                                                                                                 | 変更範囲                                               |
| :----------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| `src/tabs.ts`、`src/hooks/useUIState.ts`、`src/App.tsx`                                                                              | 末尾のタブ、初回表示記録、遅延読み込みと表示保持       |
| `src/components/AppTabBar.tsx`、`src/styles/global.css`                                                                              | 8タブの折り返しとAutomataの全スタイル                  |
| `src/shortcuts.ts`、`src/hooks/useKeyboardShortcuts.ts`                                                                              | タブ切り替えをAlt+1〜8へ拡張                           |
| `src/i18n/en.ts`、`src/i18n/ja.ts`                                                                                                   | Automataの操作ラベル・規則・プリセット・色名           |
| `src/components/__tests__/AppTabBar.test.tsx`、`src/hooks/__tests__/useUIState.test.ts`、`src/__tests__/App.test.tsx`                | タブ順、復元、履歴、初回読み込み、保持                 |
| `src/__tests__/shortcuts.test.ts`、`src/hooks/__tests__/useKeyboardShortcuts.test.ts`、`src/components/__tests__/HelpModal.test.tsx` | Alt+8、ヘルプ表記、Sourceへ入力が漏れないこと          |
| `e2e/accessibility.spec.ts`、`e2e/shortcuts-layout.spec.ts`、`e2e/pwa.spec.ts`、`e2e/app-flows.spec.ts`                              | 対象タブ追加、狭幅、遅延チャンクの復旧とオフライン表示 |

## Task 1: 二次元モデルとプリセットを固定値から移植する

**Files:** `model.ts`、`presets.ts`、`__tests__/model.test.ts`、`__tests__/presets.test.ts`、`__tests__/fixtures/ca-golden.ts`（すべて `src/automata/` 内）。

**Interfaces:**

- Produces: `CAColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7`、`Cell = { x: number; y: number }`、`AutomataRule = 4 | 5 | "diagonal" | "diagonal-center" | 8 | 9 | "life" | "rug"`。
- Produces: `PLANE_SIZE = 49`、`MAX_TIME = 20`、`CA_RULES: readonly AutomataRule[]`、`CA_LABELS: readonly string[]`、`CA_COLORS: readonly string[]`。ラベル順はGlobal Constraints、色は `#000000,#0000ff,#ff0000,#ff00ff,#00ff00,#00ffff,#ffff00,#ffffff`。
- Produces: `evolvePlane(seed: Uint8Array, size: number, steps: number, rule: AutomataRule): Uint8Array`。配列は行優先、入力不変、時刻0もコピーを返す。正の整数寸法・寸法に合う0〜7の配列・時刻0〜20を受け付け、範囲違反はRangeError。
- Produces: `AutomataPreset`（Global Constraintsの12IDのunion）、`AUTOMATA_PRESETS: readonly AutomataPreset[]`、`makePlaneSeed(preset: AutomataPreset): Uint8Array`（49×49、毎回新しい配列）。

- [x] 移植元の2ファイルのSHA-256を設計書の値と照合する。違っていたら比較元の変更点を確認し、未確認の値を基準にしない。
- [x] 一時ディレクトリの生成スクリプトで、12初期配置と12×8規則×時刻1・7・20の結果を移植元の`ca-model.cjs`から生成し、`ca-golden.ts`へ49文字×49行の0〜7文字列として固定する。`GOLDEN_SEEDS`、`GOLDEN_CASES`、`decodeRows(rows: readonly string[]): Uint8Array`をexportし、比較元の2ハッシュを記録する。生成スクリプトはリポジトリへ追加しない。
- [x] `model.test.ts`／`presets.test.ts`へ失敗するテストを書く。`matches all reference planes`では全固定値と配列全体を比較する。`updates synchronously with black exterior`、`preserves every input`、`keeps Life still lifes and period-two oscillators`、`kills occupied rug cells`、`rejects invalid dimensions and states`を小さい盤面と独立したチャンネル別二値oracleで検証する。

```ts
const seed = Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]);
expect([...evolvePlane(seed, 3, 1, 4)]).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0]);
expect([...seed]).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]);
expect(evolvePlane(seed, 3, 0, 4)).not.toBe(seed);
expect(makePlaneSeed("black")).toEqual(new Uint8Array(2401));
expect(makePlaneSeed("white")[24 * 49 + 24]).toBe(7);
expect(() => evolvePlane(seed, 3, 21, 4)).toThrow(RangeError);
```

- [x] `npm test -- src/automata/__tests__/model.test.ts src/automata/__tests__/presets.test.ts`を実行する。未作成のモデル／プリセットのimportで失敗することを確認する。
- [x] `model.ts`に型・定数と`evolvePlane`を実装する。2枚のバッファで同期更新し、Life／rugは3ビットを別々に更新して再結合する。
- [x] `presets.ts`に`makePlaneSeed`を移植する。花時計等の位相・回転も移植元に合わせ、退役済み`carpets`と一次元コードを取り込まない。表示文言は含めない。
- [x] 同じテストコマンドを実行する。全固定値・二値oracle・境界・入力不変性がPASSすることを確認する。
- [x] Task 1の明示的な5ファイルだけをstageし、`Port the two-dimensional Automata model`でコミットする。外部プレビューと依存ファイルに差分がないことを確認する。

## Task 2: 編集状態と保存・復元を実装する

**Files:** `src/automata/{state,persistence,useAutomataState}.ts`と対応する`__tests__/{state,persistence}.test.ts`、`__tests__/useAutomataState.test.tsx`。

**Interfaces:**

- Consumes: Task 1の`Cell`、`CAColor`、`AutomataRule`、`AutomataPreset`、定数、`makePlaneSeed`。
- Produces: `AutomataState = { seed: Uint8Array; preset: AutomataPreset; rule: AutomataRule; time: number; x: number; y: number; color: CAColor }`。
- Produces: `AutomataAction`は`{type:"set-rule"; rule:AutomataRule} | {type:"set-preset"; preset:AutomataPreset} | {type:"set-time"; time:number} | {type:"set-color"; color:CAColor} | {type:"select-cell"; x:number; y:number} | {type:"paint-cells"; cells:readonly Cell[]; color:CAColor}`。
- Produces: `createAutomataState(): AutomataState`、`restoreAutomataState(raw: unknown): AutomataState`、`automataReducer(state: AutomataState, action: AutomataAction): AutomataState`。
- Produces: `serializeAutomataState(state: AutomataState): string`、`loadAutomataState(storage?: Pick<Storage,"getItem">): {state: AutomataState; persistenceUnavailable: boolean}`、`saveAutomataState(state: AutomataState, storage?: Pick<Storage,"setItem">): boolean`。
- Produces: `AutomataController`は`state`、`revision:number`、`interacting:boolean`、`persistenceUnavailable:boolean`、`dispatch(action: AutomataAction):void`、`getSnapshot():{state:AutomataState;revision:number}`、`beginInteraction():void`、`finishInteraction():void`。`useAutomataState(): AutomataController`が返す。

- [x] `state.test.ts`へ既定値、時刻の往復、t>0の描画拒否、プリセット再選択での再生成、黒消去、無変更時の配列再利用のテストを書く。プリセット変更はt0・中央に戻り、rule／colorを保つ。

```ts
const initial = createAutomataState();
expect([initial.rule, initial.preset, initial.time, initial.x, initial.y, initial.color]).toEqual([4, "rosette", 0, 24, 24, 4]);
const painted = automataReducer(initial, { type: "paint-cells", cells: [{ x: 0, y: 0 }], color: 7 });
const advanced = automataReducer(painted, { type: "set-time", time: 20 });
expect(automataReducer(advanced, { type: "paint-cells", cells: [{ x: 1, y: 0 }], color: 2 }).seed).toBe(painted.seed);
expect(automataReducer(advanced, { type: "set-time", time: 0 }).seed).toBe(painted.seed);
expect(automataReducer(painted, { type: "set-color", color: 0 }).seed).toBe(painted.seed);
```

- [x] `persistence.test.ts`へ往復、項目ごとの不正値、2401以外の配列、セルの小数・負数・8、unknown version、壊れたJSONのテストを書く。`0 is valid`ではtime／x／y／color=0を保持する。`storage access may throw`ではlocalStorageのgetter、getItem、setItemをそれぞれ失敗させ、例外を外へ出さず失敗フラグを返すことを確認する。
- [x] `useAutomataState.test.tsx`へ`saves the last edit once on release or cancel`を書く。20回のpaint dispatch中の保存呼び出しは0、終了後は1で最後のセルを含む。終了を2回呼んでも増えない。保存拒否後もpaintとtime変更を続けられる。テストファイルにはjsdom指定を付ける。
- [x] `npm test -- src/automata/__tests__/state.test.ts src/automata/__tests__/persistence.test.ts src/automata/__tests__/useAutomataState.test.tsx`を実行し、未作成のexportでFAILすることを確認する。
- [x] `state.ts`の3関数を実装する。paintはt0限定・盤面内の整数座標のみ、変更がある場合だけseedを一度コピーし、最後の有効セルを選択する。設定値の整数範囲はtime=0..20、x/y=0..48、color=0..7。不正項目のみ既定値に戻し、不正seedでも他の妥当な設定を保つ。
- [x] `persistence.ts`を実装する。形式は`{version:1,seed:number[],preset,rule,time,x,y,color}`。window.localStorageの取得をtry内で行う。形式破損は既定値へ戻し、実際の保存APIの失敗だけを通知対象にする。
- [x] `useAutomataState`を実装する。最新stateとrevisionのrefをReact表示状態と同期し、React updaterの中では保存しない。設定コマンドは操作を終了してrevisionを増やす。選択／paintはrevisionを変えない。操作中の変更はdirtyだけ記録し、終了時に最新refを保存する。
- [x] 同じテストコマンドを実行し、全テストがPASSすることを確認する。
- [x] Task 2の6ファイルだけをstageし、`Persist Automata edits independently of Source`でコミットする。

## Task 3: 一つのCanvasに描画と直接操作を組み込む

**Files:** `src/automata/{geometry,render,useAutomataInteraction}.ts`、`AutomataCanvas.tsx`、`__tests__/geometry.test.ts`、`__tests__/{useAutomataInteraction,AutomataCanvas}.test.tsx`。

**Interfaces:**

- Consumes: Tasks 1–2のモデル・`Cell`・`AutomataController`。Canvasは完成した`board:Uint8Array`を受け取り、計算・保存を担当しない。
- Produces: `PlaneGeometry = {cssSize:number;cellSize:number;dpr:number}`、`getPlaneGeometry(cssSize:number,dpr:number):PlaneGeometry`、`hitTestCell(clientX:number,clientY:number,rect:Pick<DOMRect,"left"|"top"|"width"|"height">):Cell|null`、`cellsOnLine(from:Cell,to:Cell):Cell[]`。
- Produces: `drawPlane(ctx:CanvasRenderingContext2D,board:Uint8Array,geometry:PlaneGeometry,selection:Cell):void`。
- Produces: `useAutomataInteraction(input:{canvasRef:RefObject<HTMLCanvasElement|null>;active:boolean;controller:AutomataController;geometry:PlaneGeometry|null}):Pick<CanvasHTMLAttributes<HTMLCanvasElement>,"onPointerDown"|"onPointerMove"|"onPointerUp"|"onPointerCancel"|"onLostPointerCapture"|"onKeyDown"> & {cancelInteraction:()=>void}`。
- Produces: `AutomataCanvas({active,controller,board,label,description}:{active:boolean;controller:AutomataController;board:Uint8Array;label:string;description:string}):React.JSX.Element`。Canvasのtest IDは`automata-board`、座標はCanvasのCSS矩形で測る。翻訳済みのlabel／descriptionを受け取り、Task 4で追加する翻訳キーには依存しない。

- [x] `geometry.test.ts`へ右端・下端の除外、幅0、DPR1／1.25／2で同じCSS座標が同じセルになるテストを書く。`fills every grid cell between pointer events`は水平・垂直・斜め・逆向きの整数点列を検証する。全点が49×49内にある入力を使う。

```ts
const rect = { left: 10, top: 20, width: 245, height: 245 };
expect(hitTestCell(254.99, 264.99, rect)).toEqual({ x: 48, y: 48 });
expect(hitTestCell(255, 30, rect)).toBeNull();
expect(hitTestCell(30, 265, rect)).toBeNull();
expect(hitTestCell(30, 30, { ...rect, width: 0 })).toBeNull();
expect(cellsOnLine({ x: 0, y: 0 }, { x: 4, y: 0 })).toEqual([0, 1, 2, 3, 4].map((x) => ({ x, y: 0 })));
```

- [x] `useAutomataInteraction.test.tsx`へt0クリック／黒消去／速いドラッグ／t>0読み取り／盤面外と再入場をテストする。`only the owning pointer ends a stroke`ではid1で開始、id2の開始・終了・cancel・捕捉喪失を無視してid1で続けられることを確認する。`never resumes after interruption`はrelease、cancel、捕捉喪失、blur、inactive、rule／preset／time／color変更、寸法変更の各ケースで、後続moveのseed不変と終了時保存を確認する。
- [x] 同テストで矢印の0..48クランプ、t0 Enter／Space配置、t>0不変、修飾キー付き矢印の非横取りを検証する。canvasをフォーカス可能にし、テストのPointerEventに`isPrimary:true`とowner IDを明記する。捕捉APIはこのテスト内だけでmockする。
- [x] `AutomataCanvas.test.tsx`へ`does not measure or draw while hidden`を書く。active=falseでobserverを切断し、幅0を描画に使わない。active=trueで再接続・再描画する。timeだけの変更でCanvasのDOM同一性とbacking sizeが変わらないことも確認する。
- [x] `npm test -- src/automata/__tests__/geometry.test.ts src/automata/__tests__/useAutomataInteraction.test.tsx src/automata/__tests__/AutomataCanvas.test.tsx`を実行し、未作成のexportでFAILすることを確認する。
- [x] `geometry.ts`の3関数を実装する。hit testはDPRを掛けずCSS矩形からfloorでセルへ変換し、半開区間を使う。補間は両端を含むBresenhamで全格子点を訪れる。
- [x] `render.ts`の`drawPlane`を実装する。Canvas backing sizeは`round(cssSize*dpr)`、変換はDPR、色はTask 1の固定色。白黒の二重枠で全8色上の選択を示す。時刻変更ではCanvas属性を設定し直さない。
- [x] `useAutomataInteraction`を実装する。主ボタン・primary pointerだけを捕捉し、開始色とrevisionを保持する。各イベントで最新snapshotを見て、revision違い・非active・マウス／ペンの主ボタンなしでは終了する。盤面外では補間起点を消し、再入場を単独のセルから始める。終了はowner IDで判定し冪等にする。blur等のlistenerはcleanupで外す。
- [x] `AutomataCanvas`を実装する。表示中のみResizeObserverを接続し、寸法変更は操作を終了させる。role=application、tabIndex=0、受け取ったlabelとdescriptionへのaria-describedbyを付ける。Canvasのタッチ操作は`touch-action:none`、周囲は通常のスクロールとする（CSSはTask 4）。
- [x] 同じテストコマンドを実行し、補間・owner・全中断条件・非表示停止がPASSすることを確認する。
- [x] Task 3の7ファイルだけをstageし、`Add direct painting to the Automata canvas`でコミットする。

## Task 4: パレット・日英UI・Music右側のタブを接続する

**Files:** `src/automata/AutomataPalette.tsx`、`src/components/AutomataPanel.tsx`、上記「変更する既存ファイル」のうち`e2e/`以外、新規`src/components/__tests__/AutomataPanel.test.tsx`と`src/i18n/__tests__/automata-copy.test.ts`。

**Interfaces:**

- Consumes: `useAutomataState():AutomataController`、`evolvePlane(seed,size,steps,rule)`、`AutomataCanvas({active,controller,board,label,description})`、既存`useTranslation`／翻訳関数。
- Produces: `AutomataPalette({color,onSelect}:{color:CAColor;onSelect:(color:CAColor)=>void}):React.JSX.Element`、named export `AutomataPanel({active}:{active:boolean}):React.JSX.Element`。本体のpixelsやSource編集関数をpropsに取らない。
- Produces: `useUIState`の戻り値に`hasOpenedAutomata:boolean`を追加する。初期hash／保存ID、setter、popstate、hashchangeから一度でも開けばtrueを保持する。

- [x] `AutomataPanel.test.tsx`にt0編集、t20でstep disabled、t0でreturn disabled、presetでt0に戻る、8パレットの順序とaria-pressed、初期と現在の同座標readout、ドラッグ中のlive通知集約を検証するテストを書く。`reuses the plane for color and selection changes`はevolvePlaneの呼び出し回数が増えず、seed／rule／time変更では増えることを確認する。
- [x] 既存のタブ・UI state・App・shortcutテストへ末尾Automata、End→Automata、Home→Gallery、両端の矢印循環、Alt+8、`#automata`、タイトル、back／forward、既存history stateの保持を追加する。旧v2番号7はMusicのまま。lazy import解決前に離れても、初回表示後の状態と保存拒否時の状態を保持する。`hasDrawingShortcuts("automata")`はfalseのまま。
- [x] `automata-copy.test.ts`へ日英のキー一致と下表の固定文言、規則8件・プリセット12件・色名8件のラベルを検証するテストを書く。動的キーはliteralの型付き対応表で参照する。

| キー                              | ja                                                              | en                                                                             |
| :-------------------------------- | :-------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `tab_automata` / `automata_title` | Automata                                                        | Automata                                                                       |
| `automata_subtitle`               | Cellular Automaton                                              | Cellular Automaton                                                             |
| `automata_rule`                   | 規則                                                            | Rule                                                                           |
| `automata_preset`                 | 初期配置                                                        | Initial pattern                                                                |
| `automata_palette`                | パレット                                                        | Palette                                                                        |
| `automata_time`                   | 時間：t = {0}                                                   | Time: t = {0}                                                                  |
| `automata_step`                   | 1ステップ進む                                                   | Advance one step                                                               |
| `automata_return`                 | 初期配置に戻る                                                  | Return to initial pattern                                                      |
| `automata_edit_mode`              | 初期配置を編集                                                  | Edit initial pattern                                                           |
| `automata_result_mode`            | 現在の配置                                                      | Current pattern                                                                |
| `automata_canvas_label`           | セル・オートマトンの盤面                                        | Cellular automaton board                                                       |
| `automata_keyboard_hint`          | 矢印キーでセルを選択。時刻0ではEnterまたはSpaceで色を置きます。 | Arrow keys select a cell. At time 0, Enter or Space places the selected color. |
| `automata_selected`               | セル({0}, {1})：初期 {2} → t={3} {4}                            | Cell ({0}, {1}): initial {2} → t={3} {4}                                       |
| `automata_selected_color`         | 選択色：{0}                                                     | Selected color: {0}                                                            |
| `automata_storage_unavailable`    | Automataの編集は再読み込み後に復元できません。                  | Automata edits cannot be restored after reloading.                             |

日本語の規則・プリセット名は移植元UIの全8件・12件をそのまま対応付ける。英語は規則をCross XOR (4 cells)、Cross + center XOR (5 cells)、Diagonal XOR (4 cells)、Diagonal + center XOR (5 cells)、Surrounding XOR (8 cells)、Surrounding + center XOR (9 cells)、Life、Persian rugとする。プリセットはThree-color rosette (9 cells)、Diamond ring (12 cells)、Three-color corolla (12 cells)、Luminous weave (25 cells)、Color clock、Three-phase color clock、Three-color pulsar、Symmetric fireworks、Color weave (24 cells)、Three points: G, R, B、One white cell、All black。色名は黒／青／赤／マゼンタ／緑／シアン／黄／白とBlack／Blue／Red／Magenta／Green／Cyan／Yellow／White。色の表示は記号・色名・3桁GRBを組み合わせる。

- [x] `npm test -- src/components/__tests__/AutomataPanel.test.tsx src/i18n/__tests__/automata-copy.test.ts src/components/__tests__/AppTabBar.test.tsx src/hooks/__tests__/useUIState.test.ts src/__tests__/App.test.tsx src/__tests__/shortcuts.test.ts src/hooks/__tests__/useKeyboardShortcuts.test.ts`を実行し、新タブ／export／文言がまだなくFAILすることを確認する。
- [x] `AutomataPalette`と`AutomataPanel`を実装する。規則・プリセットだけをnative selectにし、時間はrange 0..20、stepはmin(20,time+1)、returnはset-time=0。結果はseed／rule／timeを依存にmemo化する。表示readoutは毎回更新し、別のpolite live領域は操作終了時に更新する。
- [x] `en.ts`／`ja.ts`へ操作・規則・プリセット・色名のキーを追加する。`automata_selected`の{2}／{4}は記号・色名・GRBを含む文字列とし、既存Theoryの文章は編集しない。
- [x] `global.css`へAutomataのnamed containerとスタイルを追加する。正方形Canvas、44px以上のパレットボタン、gap=6px、4列を基本にcontainer幅400px以上で8列（8×44+7×6=394px）。幅・文字・余白は既存トークンとclamp／cqwで調整する。modeの2文言は同じgrid cellで非activeをvisibility:hiddenにして高さを予約し、readoutと保存通知も最大文言で領域を予約する。
- [x] `tabs.ts`と`useUIState`を接続する。末尾に`{id:"automata",key:"tab_automata"}`を追加し、`LEGACY_TAB_IDS`は変更しない。`App.tsx`では既存の`loadLazyChunk`を使いnamed exportをlazyのdefaultへ包み、activeまたはhasOpenedAutomataで一度mountしたパネルをdisplay:noneとactive propで保持する。
- [x] `AppTabBar`に`app-tablist` classとラベルspanを付け、global.cssのscoped container queryで狭幅のラベルを折り返す。選択で文字の太さ・padding・行高が変わって高さが動かないようラベルspanを共通にする。タブのキーボード処理は既存の循環仕様を使う。
- [x] `useKeyboardShortcuts.ts`の`Digit([1-7])`を`Digit([1-8])`へ、`shortcuts.ts`の`Alt+1-7`を`Alt+1-8`へ変更する。AutomataをSource／Glaze用の描画ショートカット集合へ追加しない。Canvasの処理済みキーはpreventDefault＋stopPropagationで終える。
- [x] 同じテストコマンドと`npm run typecheck:all`を実行し、UI・コピー・互換・型チェックがPASSすることを確認する。
- [x] Task 4の列挙済みファイルだけをstageし、`Add Automata after Music with an eight-color palette`でコミットする。

## Task 5: ブラウザーで操作・寸法・本体との分離を確認する

**Files:** `e2e/automata.spec.ts`、`e2e/accessibility.spec.ts`、`e2e/shortcuts-layout.spec.ts`、`e2e/pwa.spec.ts`、`e2e/app-flows.spec.ts`。実証した不具合の修正は担当Taskのファイルへ限定する。

**Interfaces:**

- Consumes: `#automata`、`CHROMALUM - Automata`、`automata-board`、翻訳したrole／label、専用localStorage形式。テスト用の本番exportやwindow上の状態APIを追加しない。
- Produces: マウス・タッチ・キーボード、保存と復元、矩形不変、オフライン、既存タブへの影響のブラウザー証拠。`e2e/automata.spec.ts`内の`readSavedRecord(page:Page):Promise<string>`は、`e2e/app-flows.spec.ts`の同名helperと同じくDB `chromalum`・store `state`・key `current`をreadonlyで読みJSONを返す。

- [x] 新規`automata.spec.ts`に受け入れテストを書く。black preset＋Wで単セル配置、K消去、水平／垂直／斜めドラッグを行い、終了後の保存seedを全対象セルと比較する。マウスと、タッチcontextのCDP `Input.dispatchTouchEvent`による実際のtouch sequenceで検証する。
- [x] 同ファイルへ時間0→1→20→0のseed不変、t>0の読み取り、タブ移動中のドラッグ中断、盤面外でrelease・再入場、blur、規則／色変更、second fingerの開始・終了を追加する。後続のボタンなしmoveではseedが変わらない。盤面外の縦スワイプはページをスクロールできる。
- [x] 保存拒否を注入したcontextで、編集→別タブ→Automataが同じ編集を保つことを確認する。通常contextではreload後にseed／rule／time／座標／colorを比較する。言語切り替え後も同じ状態とする。Source／Glazeを編集してもAutomata seedは変わらず、`readSavedRecord`でAutomata操作前後のSource／Glaze保存を比較する。初期描画の保存完了を待ってから基準を取り、width／height／levelData／pixelCandidateOverrideMap／candidateIndexByLevel／lockedLevelsを比較対象にする。
- [x] 日英×viewport 1280×900／390×844／320×900で、MS Gothicを強制したケースも検証する。板・操作部・パレット・readoutの矩形をstep前／後／t0復帰で比較する。最大座標(48,48)・時刻20・全プリセット名で横はみ出しと操作対象の重なりがなく、広幅8列／狭幅4列を満たす。

```ts
expect(afterStep).toEqual(beforeStep);
expect(afterReturn).toEqual(beforeStep); // DOMRectのx/y/width/heightを同じ配列へ正規化
expect(await page.locator('[data-testid="automata-board"]').count()).toBe(1);
expect(await palette.getByRole("button").count()).toBe(8);
expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
```

- [x] タブ順・End／Home・両端矢印・Alt+8・hash／履歴を実ブラウザーで確認する。palette→Canvas→stepまでキーボードだけで操作し、Canvasの矢印やSpaceがページ移動やSource操作に漏れないことを検証する。列・行入力、配置色select、配置ボタン、チャンネル切り替えがないことも確認する。
- [x] `accessibility.spec.ts`と`shortcuts-layout.spec.ts`の対象リストへAutomataを追加する。`pwa.spec.ts`ではAutomataのlazy chunk復旧を既存パターンへ追加し、precache内のchunk存在と、初回に未表示のAutomataをofflineで開いてstep操作できることを検証する。
- [x] `npx playwright test e2e/automata.spec.ts --workers=2`を実行する。失敗は該当ケースを`--workers=1`で再現して原因を確認し、担当コードを修正する。仕様を弱めるassertion変更で通さない。
- [x] `npm run verify`を実行し、format・lint・knip・全typecheck・build・unit testsがPASSすることを確認する。
- [x] `npm run test:e2e -- --workers=2`を実行する。失敗があれば該当ケースを1 workerで再確認し、解消する。
- [x] `npm run test:pwa`を実行し、本番ビルドの遅延チャンク復旧・offlineのテストがPASSすることを確認する。
- [x] `npm run test:coverage`を実行し、既存しきい値lines／statements=80、functions=70、branches=65を満たすことを確認する。検証コマンドは負荷を重ねず順番に実行する。
- [x] 既存の絵を残した本体タブを操作せず、新しい確認用タブで`http://127.0.0.1:5173/chromalum/#automata`を開く。日本語でパレット・ドラッグ・stepを確認し、広幅と狭幅のスクリーンショットを保存する。コンソールに新しいエラーがないことを確認し、ローカル統合版をユーザーへ提示する。
- [x] Task 5の5ファイルと実証した修正だけをstageし、`Verify Automata input and layout across browsers`でコミットする。変更したCSS定数があれば、コミット本文に判断した寸法を記す。

## Execution handoff

この計画の確認と実行方法の選択を受けてから実装に入る。5つのTaskは同じモデル・状態・操作のinterfaceに依存するため、推奨は**Native**（このセッションで順番に実装し、最後に独立したレビューを受ける）。Subagent-drivenを選ぶ場合は、Taskごとの新しい実装担当とレビュー担当を使う。

実装開始時に作業ツリーと未コミット変更を確認し、実行方法のskillに従ってcheckout／既存worktreeの利用を決める。現在の`codex/automata-ca`の設計コミットを引き継ぎ、ユーザーの指示なしに新しいworktreeを作らない。各コミット前にそのTaskのテストと`git diff --check`を確認し、stageは列挙したファイルだけとする。

完了報告ではローカルURL、実装した操作、実際に通した検証、残したプロセスと保存した画像の場所を示す。保留した絵の取り込みは引き続き保留とし、push・PR・mergeはこの計画の実行に含めない。
