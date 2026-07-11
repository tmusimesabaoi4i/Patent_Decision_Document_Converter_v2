# マーカー間の空白行削除 — 構造一覧

この文書は、`js/stripBlankLines.js` における **「開始マーカー ～ 終了マーカー」に挟まれた範囲の空白行を削除する** 仕組みを表形式でまとめた、**空行削除の深掘り正本**です。
コード（`stripBlankLines.js` / `filterChains.js` / `modeFunctionLists.js`）を変更した場合は、この文書も必ず更新してください。

関連: アーキテクチャ全体・モード→チェーン対応の正本は [../filterRegistry/filterRegistry.md](../filterRegistry/filterRegistry.md)、ボタン→関数のフロー正本は [flow.md](flow.md)。

---

## 全体像

```mermaid
flowchart TD
  subgraph engines["共通エンジン（stripBlankLines.js 内）"]
    SB["stripBetween<br>（pad 指定あり）"]
  end

  subgraph stripChain["stripBlankLines チェーン（6 関数）"]
    F1["stripBlankLinesInCorrectionNote"]
    F2["stripBlankLinesInSearchResult"]
    F4["stripBlankLinesInAppendix"]
    F5["stripBlankLinesInPriority"]
    F6["stripBlankLinesInAmendmentSuggestion"]
    F7["stripBlankLinesInSignature"]
  end

  subgraph stripTightChain["stripBlankLinesTight チェーン（7 関数）"]
    F8["stripBlankLinesInClaimsBlock"]
  end

  F1 & F2 & F4 & F5 & F6 --> SB
  F7 --> SIG["独自実装<br>（条件付き行単位 regex）"]
  stripTightChain --> F1 & F2 & F4 & F5 & F6 & F7
  F8 --> CLB["独自実装<br>（lookahead 正規表現）"]
```

| 項目 | 内容 |
|---|---|
| 定義ファイル | `js/stripBlankLines.js` |
| グローバル公開名 | `root.stripBlankLines` |
| 依存 | `root.textPrimitives`（`splitLines` / `joinLines` / `isBlankLine` / `escapeRegExp`）／`root.formatBody`（`isHeadingLine` — 見出し行の前の空行保持に使用） |
| チェーン登録 | `stripBlankLines`（6 関数・末尾に `stripBlankLinesInSignature`）/ `stripBlankLinesTight`（7 関数・末尾に `stripBlankLinesInClaimsBlock`） |
| 実行されるモード | `officeAction` / `finalOfficeAction` → `stripBlankLines`／`officeActionTight` → `stripBlankLinesTight` |
| 対象外モード | `pct` / `pct_eng` / `paragraph` / `html` |

---

## 共通エンジン（3 種）

「？？ ～ ？？」＝開始マーカーと終了マーカーに挟まれた **内部テキスト** を対象に、空白行だけを落とす処理です。実装は 3 系統あります。

| エンジン | 使用する関数 | 空行判定 | マーカー直後・直前の改行（pad） | 内部の trim | 備考 |
|---|---|---|---|---|---|
| `stripBetween` | `stripBlankLinesIn*` 5 関数 | `textPrimitives.isBlankLine` | `pad.before` / `pad.after` で制御 | なし | 正規表現 `(start)([\s\S]*?)(end)` で非貪欲マッチ |
| 独自（条件付き行単位 regex） | `stripBlankLinesInSignature` | `textPrimitives.isBlankLine` | 区切り線直後・署名メール行直前に `\n` を固定で 1 つ挿入 | なし | `(区切り線)(本文)(署名メール行)` を `gm` フラグの 3 キャプチャで一括マッチし、本文（`inner`）に `<`/`＜` 始まりの行が 1 行でもあれば置換をスキップ（`all` をそのまま返す） |
| 独自（lookahead） | `stripBlankLinesInClaimsBlock` | `textPrimitives.isBlankLine` | ヘッダ直後 `\n`、終端行直前に空行 1 行を残す | なし | 終端は `(?=\n(?:・請求項\|●理由\|[<＜]\|[-－]))` で先読み（消費しない） |

### `stripBetween` の処理手順

| 順 | 処理 |
|---|---|
| 1 | 入力を文字列化。`startMarker` / `endMarker` が配列なら全組み合わせ（start × end）を順に適用 |
| 2 | 正規表現で `(開始マーカー)(内部)(終了マーカー)` を検索（`g` フラグ・非貪欲） |
| 3 | 内部を `splitLines` で行分割し、`isBlankLine` が true の行を除去 |
| 4 | `pre + (pad.before ? "\n" : "") + joinLines(outLines) + (pad.after ? "\n" : "") + post` で再結合 |
| 5 | 範囲外のテキストは変更しない。ネスト・複雑な重なりは非対応（簡易実装） |

### pad（改行パディング）の意味

| オプション | `true` のとき | `false` のとき |
|---|---|---|
| `pad.before` | 開始マーカー直後に `\n` を 1 つ挿入 | 開始マーカーと本文を改行なしで直結 |
| `pad.after` | 終了マーカー直前に `\n` を 1 つ挿入 | 本文と終了マーカーを改行なしで直結 |

---

## stripBlankLines チェーン — 関数ごとのマーカー対応

`filterChains.js` に登録された実行順です。いずれも内部で **`stripBetween`** を使用します。

| 順 | 関数名 | 開始マーカー（？？） | 終了マーカー（？？） | pad.before | pad.after | 追加処理 |
|---|---|---|---|---|---|---|
| 1 | `stripBlankLinesInCorrectionNote` | `<補正をする際の注意>` | `(上記「●●●●」に置き換えて、「PA5J」と入力ください。)` | true | false | — |
| 2 | `stripBlankLinesInSearchResult` | `<先行技術文献調査結果の記録>` | `　この先行技術文献調査結果の記録は、拒絶理由を構成するものではありません。` | true | true | — |
| 3 | `stripBlankLinesInAppendix` | `<付記>` | `　この付記は、拒絶理由を構成するものではありません。` | true | true | — |
| 4 | `stripBlankLinesInPriority` | `<優先権の主張の効果について>` | `優先権の主張の効果が認められない。` | true | false | — |
| 5 | `stripBlankLinesInAmendmentSuggestion` | `<補正の示唆>` | `　なお、上記の補正の示唆は、法律的効果を生じさせるものではなく、拒絶理由を解消するための一案である。明細書等についてどのように補正をするかは、出願人が決定すべきものである。` | true | true | — |

---

## stripBlankLines チェーン — 区切り線〜署名メール行（連絡先ブロック）

`stripBetween` は使わず、`gm` フラグの行単位正規表現（`(区切り線)(本文)(署名メール行)` の 3 キャプチャ）＋条件判定で範囲を切り出します。`stripBlankLines` チェーンの 6 番目（末尾）に登録。

| 項目 | 内容 |
|---|---|
| 開始（区切り線） | 行全体がハイフンのみの行。半角 `-` または全角 `－` が **10 文字以上** 連続。行頭・行末の空白（半角/全角スペース）は許容。正規表現: `^[ 　]*[-－]{10,}[ 　]*$` |
| 終了（署名メール行） | 行頭（空白許容）が `※●●●●@jpo.go.jp` で始まる行。正規表現: `^[ 　]*※●●●●@jpo\.go\.jp[^\n]*$` |
| 除外条件 | 区切り線〜署名メール行の間（本文）に `<` または `＜` で始まる行（行頭空白許容。`^[ 　]*[<＜]`）が **1 行でも** あれば、その区間はマッチ全体を変更せずそのまま返す（先行技術文献調査結果の記録など、独自整形を持つセクションが挟まっているケースを巻き込まないため） |
| 空行削除後の形 | 本文の空行（`textPrimitives.isBlankLine`）をすべて除去し、`区切り線 + "\n" + 空行を除いた本文 + "\n" + 署名メール行` の形に固定で再結合（`stripBetween` の `pad.before` / `pad.after` に相当する改行を常に挿入） |
| 対象外 | 除外条件に該当する区間、および区切り線・署名メール行のペアが見つからない箇所 |

---

## stripBlankLinesTight チェーン — 請求項ヘッダブロック

`stripBlankLines` の 6 関数に加え、7 番目として **`stripBlankLinesInClaimsBlock`** が追加されたチェーンです。`officeActionTight` モード専用。

| 順 | 関数名 | 備考 |
|---|---|---|
| 1〜6 | `stripBlankLines` と同じ 6 関数（末尾は `stripBlankLinesInSignature`） | 上表を参照 |
| 7 | `stripBlankLinesInClaimsBlock` | 請求項ヘッダブロック内の空行削除（下表） |

### `stripBlankLinesInClaimsBlock` の範囲定義

`stripBetween` は使わず、行頭一致の正規表現＋先読み（lookahead）で範囲を切り出します。

| 項目 | 内容 |
|---|---|
| 開始（ヘッダ群） | 行頭 `・請求項…` を起点とする次の 4 パターンのいずれか（下表） |
| 終了（終端行の手前） | `(?=\n(?:・請求項\|●理由\|[<＜]\|[-－]))` — 次のいずれかの行の直前まで（終端行は消費しない。いずれも **行頭一致**） |

#### 終端行の 4 種（`<` / `-` は「行頭の記号で始まる行」として同種）

| # | 行頭条件 | 例 |
|---|---|---|
| ① | `・請求項` で始まる | 次の請求項ヘッダ群 |
| ② | `●理由` で始まる | `●理由２（進歩性）について`（`●むすび` 等の他の ● 行は終端にならない） |
| ③ | `<` または `＜` で始まる | `<引用文献等一覧>` / `＜拒絶の理由を発見しない請求項＞` |
| ④ | `-` または `－` で始まる | `------------------------------------`（③ と同種の行頭記号ルール） |
| 対象テキスト | ヘッダ群と終端行の間の **本文** のみ |
| 空行削除後 | ヘッダ直後に `\n`、本文、終端行直前に空行 1 行（`\n`）を残す |
| 見出し行の例外 | 本文中の **見出し行**（`formatBody.isHeadingLine` ＝ `buildHeadingMarkRe` の見出しマーク `(1)` / `(あ)` / `１．` / `1)` / `A.` / `第1章` などで始まる行）の直前には空行を 1 行残す。ただし本文の先頭行が見出しの場合はヘッダ群と直結（空行を入れない）（形式一覧は [buildHeadingMarkRe.md](buildHeadingMarkRe.md) が正本） |
| 本文が空のとき | ヘッダ群と終端行が隣接している等、本文行が 0 行なら改変しない |
| 対象外 | 終端行が見つからない末尾の本文 |

#### ヘッダ群の 4 パターン（`CLAIMS_HEADER_SRC`）

長いパターンから順に alternation でマッチします。

```
(?:・請求項[^\n]*\n・引用文献等[^\n]*\n・備考[^\n]*
|・請求項[^\n]*\n・引用文献等[^\n]*
|・請求項[^\n]*\n・備考[^\n]*
|・請求項[^\n]*)
```

| # | パターン | 行数 | 例 |
|---|---|---|---|
| ① | `・請求項` + `・引用文献等` + `・備考` | 3 行 | `・請求項` / `・請求項　１－３` + `・引用文献等` + `・備考` |
| ② | `・請求項` + `・引用文献等` | 2 行 | `・請求項` + `・引用文献等` / `・引用文献等　１－２` |
| ③ | `・請求項` + `・備考` | 2 行 | `・請求項` + `・備考` |
| ④ | `・請求項` のみ | 1 行 | `・請求項` / `・請求項　１－３` |

---

## 公開 API 一覧

`root.stripBlankLines` にエクスポートされる関数です。

| 公開名 | チェーン | 役割 |
|---|---|---|
| `stripBlankLinesInCorrectionNote` | `stripBlankLines` | 補正の注意ブロック内の空行削除 |
| `stripBlankLinesInSearchResult` | `stripBlankLines` | 先行技術文献調査結果ブロック内の空行削除 |
| `stripBlankLinesInAppendix` | `stripBlankLines` | 付記ブロック内の空行削除 |
| `stripBlankLinesInPriority` | `stripBlankLines` | 優先権ブロック内の空行削除 |
| `stripBlankLinesInAmendmentSuggestion` | `stripBlankLines` | 補正の示唆ブロック内の空行削除 |
| `stripBlankLinesInSignature` | `stripBlankLines` | 区切り線〜署名メール行（連絡先ブロック）内の空行削除（間に `<`・`＜` 始まりの行があれば不変） |
| `stripBlankLinesInClaimsBlock` | `stripBlankLinesTight` | 請求項ヘッダブロック（`・請求項` 群〜終端行（①次の `・請求項` / ②`●理由` / ③`<`・`＜` 行 / ④`-`・`－` 行）手前）内の空行削除 |

---

## パイプライン上の位置（Office Action 系）

| 段 | チェーン名 | 空白行削除に関係する処理 |
|---|---|---|
| 1 | `normalize` | 全文の空行削除（`rmBlank`）・行間挿入（`gap`）— マーカー範囲とは無関係 |
| 2 | `formatBody` | 空白行削除は行わない（見出し整形・全角化のみ） |
| 3 | `stripBlankLines` / `stripBlankLinesTight` | 各セクションのマーカー間の空行削除。Tight は加えて請求項ヘッダブロックも詰める |
| 4 | `formatTail` / `formatBoilerplate` | 末尾ブロックの書式変換（空行削除エンジンは使わない） |

### officeAction と officeActionTight の違い

| モード | 3 段目チェーン | 請求項ヘッダブロック |
|---|---|---|
| `officeAction` | `stripBlankLines`（6 関数） | 処理しない |
| `officeActionTight` | `stripBlankLinesTight`（7 関数） | `stripBlankLinesInClaimsBlock` で空行削除 |

---

## 新しい「？？ ～ ？？」範囲を追加するとき

| 手順 | 触る場所 |
|---|---|
| 1. ヘルパ関数を追加 | `js/stripBlankLines.js`（`stripBetween(s, start, end, pad)` を呼ぶ） |
| 2. 公開オブジェクトに登録 | 同ファイル末尾の `root.stripBlankLines = { ... }` |
| 3. チェーンに追加 | `js/filterChains.js` の `filterChains.register("stripBlankLines", [...])`（必要なら `stripBlankLinesTight` にも） |
| 4. 存在チェックを更新 | 同ファイル先頭付近の `typeof ... !== "function"` 検証 |
| 5. ドキュメント更新 | 本ファイル・`js/flow.md` |
