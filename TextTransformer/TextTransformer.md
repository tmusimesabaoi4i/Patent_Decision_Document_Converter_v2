# TextTransformer 使い方ガイド

行単位でテキストを変換する `TextTransformer` クラスのドキュメントです。

- アプリの使い方 → [README.md](../README.md)
- 変換パイプライン全体 → [filterRegistry.md](../filterRegistry/filterRegistry.md)

---

## 1. プロジェクト内での位置づけ

| 項目 | 内容 |
|---|---|
| 実装 | `TextTransformer.js` |
| 読み込み | `main.html` から `<script>` で読み込み |
| グローバル名 | `root.TextTransformer`（`globalThis`） |
| 本番パイプライン | **未使用** — 現行の変換は `textUtils*` 系 + `FilterRegistry` で構成 |

`TextTransformer` は同梱ライブラリとして独立しており、新規ルールの試作や別スクリプトからの利用を想定しています。本番パイプラインへの組み込みは [filterRegistry.md](../filterRegistry/filterRegistry.md) の拡張ガイドを参照してください。

### textUtils* との使い分け

| | `TextTransformer` | `textUtils*` 系 |
|---|---|---|
| 単位 | 行 | 文字列全体 |
| 範囲指定 | マーカー行の上下・範囲・行頭など | セクション検出・正規表現ベース |
| パイプライン | 単体利用 or 自前で組み立て | `FilterRegistry` 経由で登録・実行 |
| 本番利用 | なし（現状） | あり |

---

## 2. 読み込み方法

本プロジェクトの `TextTransformer.js` は IIFE 形式で `globalThis` に公開します。CommonJS / ES Modules の `export` はありません。

```html
<!-- main.html と同じ方式 -->
<script src="TextTransformer/TextTransformer.js"></script>
<script>
  const tt = new TextTransformer("line1\nline2");
  console.log(tt.toString());
</script>
```

---

## 3. 基本コンセプト

テキスト全体を **行単位** に分割して処理します。

行の「上／下」や「a〜b の範囲」「行頭が特定文字」「マーカー以降＋区切りあり」など、ルールに合致する行に対して変換関数 F を適用します。

対応する改行コード:

- `\r\n`（Windows）
- `\r`（古い Mac）
- `\n`（Unix / Linux / macOS）

### 変換関数 F

任意の「行 → 行」変換関数を受け取ります。

```javascript
function F(str) {
  return str + " ★";
}
```

複数の変換を順番に適用する場合は配列で渡せます。

```javascript
const Flist = [F1, F2];
```

---

## 4. 基本的な使い方

### インスタンススタイル（メソッドチェーン）

```javascript
const text = [
  "# HEADER",
  "line1",
  "line2",
  "# FOOTER",
  "line3"
].join("\n");

function toLower(s) { return s.toLowerCase(); }

const result = new TextTransformer(text)
  .aboveInc("# HEADER", toLower)
  .belowExc("# FOOTER", toLower)
  .toString();
```

- `new TextTransformer(text)` で元テキストを渡す
- `aboveInc`, `belowExc`, `rangeInc`, `head`, `fwNumMark` などをチェーン
- 最後に `toString()` で結果を取得

### 関数スタイル（static メソッド）

```javascript
const result = TextTransformer.aboveInc(text, "# HEADER", toLower);
```

内部で `new TextTransformer(text)` → メソッド 1 回 → `toString()` を実行します。

---

## 5. メソッドリファレンス

### 上下方向

| メソッド | 適用範囲 |
|---|---|
| `aboveInc(a, F)` | マーカー行 a **を含む**上側すべて |
| `aboveExc(a, F)` | マーカー行 a **を除く**上側 |
| `belowInc(a, F)` | マーカー行 a **を含む**下側すべて |
| `belowExc(a, F)` | マーカー行 a **を除く**下側 |

`a` は文字列または文字列配列。配列の場合、各要素について判定・適用が行われます。

```javascript
new TextTransformer(text).aboveInc(["[BLOCK1]", "[BLOCK2]"], toLower).toString();
```

### 範囲指定（ペア）

| メソッド | 適用範囲 |
|---|---|
| `rangeInc(a, b, F)` | a, b **を含む**範囲 |
| `rangeExc(a, b, F)` | a, b **を除く**間 |

`a` と `b` はペアで指定します（`|a| = |b|` を想定）。

```javascript
new TextTransformer(text)
  .rangeInc(["[SEC1_START]", "[SEC2_START]"],
            ["[SEC1_END]",   "[SEC2_END]"],
            wrap)
  .toString();
```

### 行頭マッチ

`head(ch, F)` — 行の先頭文字が `ch` の行に F を適用します。

```javascript
new TextTransformer(text).head("#", toLower).toString();
```

### マーカー以降の全角化

| メソッド | 動作 |
|---|---|
| `fwNumMark(mark, sep)` | `mark` 以降に `sep` がある行のみ、数字を全角化 |
| `fwAlnumMark(mark, sep)` | 同上、数字＋英字を全角化 |

`mark` / `sep` は文字列または配列。行内で最も左に現れる `mark` を基準に `tail` を決定します。

```javascript
new TextTransformer(text)
  .fwNumMark([":", "="], [",", ";"])
  .toString();
```

### static メソッド一覧

`TextTransformer.aboveInc`, `aboveExc`, `belowInc`, `belowExc`, `rangeInc`, `rangeExc`, `head`, `fwNumMark`, `fwAlnumMark`

---

## 6. よくあるパターン

### 見出し間の中身だけ加工

```javascript
const result = new TextTransformer(text)
  .rangeExc(["# SECTION1", "# SECTION2"],
            ["# SECTION2", "# SECTION3"],
            (s) => "★ " + s)
  .toString();
```

### 設定行の右側の数字だけ全角化

```javascript
const result = new TextTransformer(configText)
  .fwNumMark([":", "="], [","])
  .toString();
```

---

## 7. 実装挙動に関する注意

- 行の境界（a, b, mark の検索）は **常に元テキスト行配列（`_origLines`）** を基準に行われる
- 途中で F によって内容を変えても、境界の検索位置は変わらない
- 実際の書き換えは `_lines`（編集用）のみ
- `a` / `b` / `mark` / `sep` が配列のとき、同じ行に F が **複数回適用される** ケースがある
- F は **冪等**（何度適用しても結果が変わらない）になるよう設計すると安全
