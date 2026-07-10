# Patent Decision Document Converter

特許庁・各国特許庁の審査関連文書（拒絶理由通知、最終拒絶、補正却下、審査前報告書、PCT 文書など）を、社内の起案・翻訳ワークフロー向けに正規化・変換するブラウザツールです。

サーバーやビルドは不要で、`main.html` をブラウザで開くだけで使えます。

## クイックスタート

1. `main.html` をブラウザで開く
2. **Step 1 · Mode** で文書種別を選択する
3. 左欄に原文を貼り付け、**Convert** を押す（`Ctrl`+`Enter` / Mac: `⌘`+`Enter`）
4. 右欄の結果を **Copy output** でコピーする（`Alt`+`Enter`）

`sample/` に変換前後の例文があります。動作確認に使えます。

## ドキュメント

| 読む場面 | ドキュメント |
|---|---|
| 変換パイプラインの全体像・モード対応・フィルタの追加 | [filterRegistry/filterRegistry.md](filterRegistry/filterRegistry.md) |
| アプリ本体・モード登録 | `js/app.js` 先頭コメント |
| モード別パイプライン定義 | `js/modeFunctionLists.js` 先頭コメント |
| フィルタ登録と `runTextChains` | `js/textFilterRegistry.js` 先頭コメント |

## プロジェクト構成（概要）

```
main.html          … UI エントリーポイント
js/                … アプリ本体・変換ロジック
filterRegistry/    … フィルタパイプライン基盤（→ filterRegistry.md）
css/               … スタイル
sample/            … 変換例文
```

## 技術スタック

HTML / CSS / JavaScript（フレームワークなし・npm 依存なし）

## ライセンス

（未設定）
