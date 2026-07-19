# Patent Decision Document Converter

特許庁・各国特許庁の審査関連文書（拒絶理由通知、最終拒絶、PCT 文書など）を、社内の起案・翻訳ワークフロー向けに正規化・変換するブラウザツールです。

サーバーやビルドは不要で、`main.html` をブラウザで開くだけで使えます。

## クイックスタート

1. `main.html` をブラウザで開く
2. **Step 1 · Mode** で文書種別を選択する
3. 左欄に原文を貼り付け、**Convert** を押す（`Ctrl`+`Enter` / Mac: `⌘`+`Enter`）
4. 右欄の結果を **Copy output** でコピーする（`Alt`+`Enter`）

## ドキュメント

| ドキュメント | 役割 |
|---|---|
| [README.md](README.md)（本書） | プロジェクト入口。概要・クイックスタート・プロジェクト構成・回帰テストの回し方・ドキュメント一覧。 |
| [filterRegistry/filterRegistry.md](filterRegistry/filterRegistry.md) | アーキテクチャ正本。6 層構造・`FilterRegistry` API・チェーン一覧（正本）・モード→チェーン対応（正本）・変換ルールの編集ガイド。 |
| [js/flow.md](js/flow.md) | UI 操作起点のフロー正本。ボタン→関数の流れに加え、**モード別にどの関数を実行順で通過するか**（第 0 段 `toHalfWidth` ＋各チェーンの関数を全列挙）と、チェーン別の各関数の処理内容が分かる。 |
| [js/stripBlankLines.md](js/stripBlankLines.md) | 空行削除の深掘り正本。エンジン比較・マーカー表・請求項ヘッダブロック仕様。 |
| [js/formatTail.md](js/formatTail.md) | 末尾ブロック書式変換の深掘り正本。`formatTail` / `formatBoilerplate` チェーン 4 関数（調査結果・ファミリー情報・補正の示唆・定型行）のマーカーと行変換ルール。 |
| [js/buildHeadingMarkRe.md](js/buildHeadingMarkRe.md) | 見出しマーク判定の深掘り正本。`buildHeadingMarkRe` が生成する `HEADING_MARK_RE` の許容 9 形式・設定（`maxDigits` / `maxDepth` / `alphaMax`）・使用箇所。 |
| [js/buildFirstOATemplate.md](js/buildFirstOATemplate.md) | 最初／最後の拒絶理由（ひな形）生成の深掘り正本。`firstOfficeActionTemplate` / `finalOfficeActionTemplate` モードのパース規則・引用文献判定・出力テンプレート構造・両モードの差分・編集可能な固定文（審査官署名・IPC・連絡先）の場所。 |

> コード（モード・チェーン・スクリプト構成）を変えたら、本書のドキュメント一覧・プロジェクト構成・テスト件数も更新してください。設計の詳細は上表の各正本ドキュメントを参照。

アプリ本体・モード登録・チェーン登録の実装メモは、各 `js/*.js` の先頭コメント（`app.js` / `modeFunctionLists.js` / `filterChains.js`）にもあります。

## モード別 処理フロー早見表

Convert を押すと、**全モード共通**でまず `toHalfWidth`（`js/app.js`、NFKC 半角正規化。フィルタチェーンの**外**で実行される第 0 段）が走り、その後モードごとのチェーン列（`js/modeFunctionLists.js`）が実行順に適用されます。

| モード（`value`） | パイプライン（第 0 段 → チェーン列） | 処理の要約 |
|---|---|---|
| `officeAction` | `toHalfWidth` → normalize → formatBody → stripBlankLines → formatTail | 通常の拒絶理由通知。前処理・本文整形・セクション別空行削除・末尾ブロック書式変換までフル実行。 |
| `officeActionTight` | `toHalfWidth` → normalize → formatBody → stripBlankLinesTight → formatTail | officeAction と同じで、3 段目だけ請求項ヘッダブロック内の空行も詰める版に差し替え。 |
| `finalOfficeAction` | `toHalfWidth` → normalize → formatBody → stripBlankLines → formatBoilerplate | 最後の拒絶理由通知。末尾は `formatTail` ではなく定型行整形（`formatBoilerplate`）で締める。 |
| `firstOfficeActionTemplate` | `toHalfWidth` → firstOATemplate | 最初の拒絶理由（ひな形）。理由の柱書きから連番・「記」・`●理由`セクション・末尾定型ブロックまでのひな形を生成。`normalize`/`formatBody` は通らない（全角化はビルダーが自前で実施）。 |
| `finalOfficeActionTemplate` | `toHalfWidth` → finalOATemplate | 最後の拒絶理由（ひな形）。`firstOfficeActionTemplate` とほぼ同じで、＜拒絶の理由を発見しない請求項＞と＜引用文献等一覧＞の間に「＜最後の拒絶理由通知とする理由＞」ブロックを挿入する。 |
| `pct` | `toHalfWidth` → normalize → formatBody | 国際出願。前処理と本文整形のみ（空行削除・末尾書式変換は通らない）。 |
| `pct_eng` | `toHalfWidth` → normalize → formatBody | 原文が主に英語の国際出願。処理内容は `pct` と同一。 |
| `paragraph` | `toHalfWidth` → extractParagraphRefs | 段落番号・図番号を抽出して `(段落…、図…)` を生成。`normalize` は通らない。 |
| `html` | `toHalfWidth` → toHtml | テキストを見出し／段落の HTML に変換。`normalize` は通らない。 |

各モードがどの関数を実行順に通過するかの全列挙・フロー図・チェーン別の関数詳細は [js/flow.md](js/flow.md)、モード→チェーン対応表の正本は [filterRegistry/filterRegistry.md](filterRegistry/filterRegistry.md) を参照してください。

## プロジェクト構成（概要）

```
main.html                    … UI エントリーポイント
css/
  base.css                   … 基礎スタイル
  layout.css                 … レイアウト
  components.css             … コンポーネント別スタイル
js/
  textPrimitives.js          … 共通プリミティブ（改行・空白判定・全角半角変換など）
  normalizeText.js           … 前処理（normalize チェーン）
  formatBody.js              … 本文整形（formatBody チェーン）
  stripBlankLines.js         … セクション別空行削除（stripBlankLinesInClaimsBlock も定義）
  formatSearchResult.js      … 先行技術文献調査結果・ファミリー文献情報ブロックの書式変換
  formatAmendmentNote.js     … 補正の示唆・署名ブロックの書式変換
  formatBoilerplate.js       … 定型行整形（「記」／<引用文献等一覧>／ハイフン線など）
  buildFirstOATemplate.js    … 最初／最後の拒絶理由（ひな形）生成（firstOATemplate / finalOATemplate チェーン）
  paragraphExtraction.js     … 段落・図番号抽出
  makeHtml.js                … HTML 変換
  filterChains.js            … フィルタチェーン登録・runTextChains
  modeFunctionLists.js       … モードキー → チェーン名リスト
  app.js                     … アプリ本体（起動・DOM 配線）
  flow.md                    … ボタン別 関数フロー（フロー正本）
  stripBlankLines.md         … 空行削除の深掘り正本
  formatTail.md              … 末尾ブロック書式変換の深掘り正本
  buildHeadingMarkRe.md      … 見出しマーク判定の深掘り正本
  buildFirstOATemplate.md    … 最初の拒絶理由（ひな形）生成の深掘り正本
filterRegistry/
  filterRegistry.js          … フィルタパイプライン基盤（FilterRegistry クラス）
  filterRegistry.md          … アーキテクチャ正本（変換パイプライン設計）
tools/
  golden.js                  … 回帰テスト（ゴールデン比較）ハーネス
  smoke.js                   … UI 配線のスモークテスト
  test_claimsBlock.js        … 請求項ヘッダブロック空行削除の単体テスト
  test_signature.js          … 署名ブロック（区切り線〜署名メール行）空行削除の単体テスト
  fixtures/                  … テスト入力（実例文＋合成ケース）
  goldens/                   … モードごとの期待出力
```

## 回帰テスト

- `node tools/golden.js verify` … 全 9 モード × 21 fixture（189 ケース）の変換結果を `tools/goldens/` とバイト単位で比較する
- `node tools/test_claimsBlock.js` … `stripBlankLinesInClaimsBlock`（請求項ヘッダブロック内の空行削除、`officeActionTight` モードで使用）の単体テスト（44 ケース）
- `node tools/test_signature.js` … `stripBlankLinesInSignature`（区切り線〜署名メール行の空行削除）の単体テスト（14 ケース）
- `node tools/smoke.js` … 最小 DOM スタブでアプリを起動し、Convert / `Ctrl`+`Enter` / Copy の配線を確認する
- 変換ルールを意図して変えたときだけ `node tools/golden.js capture` でゴールデンを更新し、diff をレビューする

## 技術スタック

HTML / CSS / JavaScript（フレームワークなし・npm 依存なし）

## ライセンス

（未設定）
