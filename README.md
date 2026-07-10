# Patent Decision Document Converter

特許庁・各国特許庁の審査関連文書（拒絶理由通知、最終拒絶、補正却下、審査前報告書、PCT 文書など）を、社内の起案・翻訳ワークフロー向けに正規化・変換するブラウザツールです。

サーバーやビルドは不要で、`main.html` をブラウザで開くだけで使えます。

## クイックスタート

1. `main.html` をブラウザで開く
2. **Step 1 · Mode** で文書種別を選択する
3. 左欄に原文を貼り付け、**Convert** を押す（`Ctrl`+`Enter` / Mac: `⌘`+`Enter`）
4. 右欄の結果を **Copy output** でコピーする（`Alt`+`Enter`）

## ドキュメント

| 読む場面 | ドキュメント |
|---|---|
| 変換パイプラインの全体像・モード対応・フィルタの追加 | [filterRegistry/filterRegistry.md](filterRegistry/filterRegistry.md) |
| アプリ本体・モード登録 | `js/app.js` 先頭コメント |
| モード別パイプライン定義 | `js/modeFunctionLists.js` 先頭コメント |
| フィルタ登録と `runTextChains` | `js/textFilterRegistry.js` 先頭コメント |
| ボタン別 関数フロー（UI 操作ごとの通過関数） | [js/flow.md](js/flow.md) |

## プロジェクト構成（概要）

```
main.html                    … UI エントリーポイント
css/
  base.css                   … 基礎スタイル
  layout.css                 … レイアウト
  components.css             … コンポーネント別スタイル
js/
  textUtilsStd.js            … 共通プリミティブ（改行・空白判定・全角半角変換など）
  textUtilsInit.js           … 前処理（init チェーン）
  textUtilsMain.js           … 本文整形（main / main_PCTENG チェーン）
  stripBlankLines.js         … セクション別空行削除
  textUtilsConvertForDoc.js  … 文書末尾の書式変換
  telecomAbbreviations.js    … 通信・3GPP 系略語辞書（純データ）
  textUtilsConvertForCau.js  … 拒絶理由・その他の末尾処理（略語辞書を適用）
  paragraphExtraction.js     … 段落・図番号抽出
  makeHtml.js                … HTML 変換
  textFilterRegistry.js      … フィルタチェーン登録・runTextChains
  modeFunctionLists.js       … モードキー → チェーン名リスト
  app.js                     … アプリ本体（起動・DOM 配線）
filterRegistry/
  filterRegistry.js          … フィルタパイプライン基盤（FilterRegistry クラス）
  filterRegistry.md          … 変換パイプライン設計ドキュメント
tools/
  golden.js                  … 回帰テスト（ゴールデン比較）ハーネス
  smoke.js                   … UI 配線のスモークテスト
  fixtures/                  … テスト入力（実例文＋合成ケース）
  goldens/                   … モードごとの期待出力
```

## 回帰テスト

- `node tools/golden.js verify` … 全 8 モード × 13 fixture の変換結果を `tools/goldens/` とバイト単位で比較する
- `node tools/smoke.js` … 最小 DOM スタブでアプリを起動し、Convert / `Ctrl`+`Enter` / Copy の配線を確認する
- 変換ルールを意図して変えたときだけ `node tools/golden.js capture` でゴールデンを更新し、diff をレビューする

## 技術スタック

HTML / CSS / JavaScript（フレームワークなし・npm 依存なし）

## ライセンス

（未設定）
