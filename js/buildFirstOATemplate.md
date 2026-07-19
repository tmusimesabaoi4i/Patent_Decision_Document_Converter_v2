# buildFirstOATemplate（最初／最後の拒絶理由・ひな形生成）正本

本ドキュメントは、モード **`firstOfficeActionTemplate`（UI ラベル「1st Office Action template」）** と **`finalOfficeActionTemplate`（UI ラベル「Final Office Action template」）**、およびそれぞれのチェーン `firstOATemplate` / `finalOATemplate`（ともに `js/buildFirstOATemplate.js`）の **正本** です。パース規則・引用文献判定・出力テンプレート構造・両モードの差分・編集可能な固定文の場所を扱います。

両モードは共通コア `buildTemplate(text, opts)` を使い、**違いは「＜最後の拒絶理由通知とする理由＞」ブロックの有無だけ**です（`buildFinalOATemplate` は `opts.finalRejectionNote = true`）。

> `js/buildFirstOATemplate.js` を変更したら本書も更新してください。モード→チェーン対応の正本は [../filterRegistry/filterRegistry.md](../filterRegistry/filterRegistry.md)、モード別関数フローの正本は [flow.md](flow.md) です。

## 1. 目的

拒絶理由の「柱書き」（`（進歩性）…`、`（サポート要件）…` 等）を並べただけの入力から、審査官が最初の拒絶理由を起案し始めるための **ひな形** を生成します。既存モードが通知書を **再整形** するのに対し、本モードは柱書きから雛形を **生成** します。

## 2. パイプライン上の位置

- モードキー `firstOfficeActionTemplate` → チェーン `["firstOATemplate"]` → `buildFirstOATemplate`。
- モードキー `finalOfficeActionTemplate` → チェーン `["finalOATemplate"]` → `buildFinalOATemplate`（いずれも `js/modeFunctionLists.js` / `js/filterChains.js`）。
- `normalize` / `formatBody` は **通しません**。第 0 段 `toHalfWidth`（`app.js`、NFKC）の直後にビルダーだけが走ります。
- 理由: `toHalfWidth`（NFKC）で `（`→`(`、全角数字→半角、全角スペース→半角に潰れるため、理由本文は本モジュール内 `fullwidthenAscii` で **自前で全角化** します（`normalize`/`formatBody` は officeAction 用に半角括弧・半角ピリオドを残すので流用できません）。

## 3. 入力のパース（`parseReasons`）

- 入力を行分割し、**前後空白を除いた行頭が `（` または `(` で始まる行**を 1 件の「理由」とみなします。空行・非該当行は無視します（例文はいずれも 1 理由 = 1 行）。
- ラベルは最初の括弧内テキスト（`^[（(]([^）)]*)[）)]`）。例: `進歩性`、`サポート要件`、`新規事項`。
- 理由が 1 件も無い入力は、UI を壊さないよう **入力をそのまま返します**。

## 4. 引用文献判定（`CITATION_KEYWORDS`）

ラベルが `CITATION_KEYWORDS = ["進歩性", "新規性", "先願"]` のいずれかを **部分一致で含む** 理由を「引用文献あり（citation）」とみなします。

- `先願` は「先願（第39条）」と「拡大先願（第29条の2）」の両方を拾います。
- `新規事項` は `新規性` を含まないため citation ではありません。
- citation が 1 件でもあると（`hasCitation`）:
  - 「記」行を注記付き（`KI_WITH_NOTE`）にする、
  - **その理由の**`●理由`セクションに `・引用文献等　Ｘ`（`LINE_CITATION`）と `・備考`（`LINE_NOTE`）を付ける、
  - 末尾に ＜引用文献等一覧＞ ブロックを出す（直前の空行が **2 つ**）。
- citation が 1 件も無い場合はいずれも出さず、＜引用文献等一覧＞ は省略（ハイフン線直前の空行は **1 つ**）、「記」は中央寄せ（`KI_PLAIN`）。

判定対象を増減する場合は `CITATION_KEYWORDS` を編集します。

## 5. 出力テンプレート構造

ブロック順（ブロック間は原則空行 1 つ。★は条件付き）:

1. **連番理由** … `｛全角連番｝．｛全角化した理由本文｝`（理由間に空行 1 つ）
2. **「記」行** … `hasCitation` なら `KI_WITH_NOTE`、そうでなければ `KI_PLAIN`
3. **`●理由` セクション群** … 各理由 `●理由｛全角連番｝（｛ラベル｝）について` ＋ 空行 ＋ `・請求項　`（citation なら続けて `・引用文献等　Ｘ`／`・備考`）
4. **＜拒絶の理由を発見しない請求項＞**（`HAKKEN_HEADER` ＋ `HAKKEN_BODY`）
4.5. ★**＜最後の拒絶理由通知とする理由＞ ブロック**（`finalOfficeActionTemplate` のときだけ。前後は空行 1 つ）… `FINAL_REASON_HEADER` ＋ `FINAL_REASON_BODY`
5. ★**＜引用文献等一覧＞ ブロック**（`hasCitation` のときだけ。直前は空行 2 つ）… `INYOU_ICHIRAN_HEADER` ＋ `INYOU_ICHIRAN_NOTE`
6. **ハイフン線 ＋ ＜先行技術文献調査結果の記録＞**（`HYPHEN_RULE` ＋ `SEARCH_RECORD_LINES`。ハイフン線と記録ヘッダの間に空行なし）
7. **連絡先**（`CONTACT_LINES`）
8. **審査官署名**（`SIGNATURE_LINES`）

先頭に空行は付けず、末尾は改行 1 つで終わります。

## 6. 編集可能な固定文（モジュール冒頭の定数）

以下は当該審査官のひな形固定値です。`js/buildFirstOATemplate.js` 冒頭で編集できます。

| 定数 | 内容 |
|---|---|
| `CITATION_KEYWORDS` | 引用文献ありとみなす理由ラベルのキーワード |
| `KI_WITH_NOTE` / `KI_PLAIN` | 「記」区切り行（注記付き／中央寄せ）。`js/formatBoilerplate.js` の正準表記と一致 |
| `LINE_CLAIM` / `LINE_CITATION` / `LINE_NOTE` | `●理由`セクションの箇条書き（`・請求項　`／`・引用文献等　Ｘ`／`・備考`） |
| `HAKKEN_HEADER` / `HAKKEN_BODY` | ＜拒絶の理由を発見しない請求項＞ |
| `INYOU_ICHIRAN_HEADER` / `INYOU_ICHIRAN_NOTE` | ＜引用文献等一覧＞ ＋ 周知技術の注記 |
| `FINAL_REASON_HEADER` / `FINAL_REASON_BODY` | ＜最後の拒絶理由通知とする理由＞ ＋ 本文（`finalOfficeActionTemplate` 専用の挿入ブロック） |
| `HYPHEN_RULE` | 区切りハイフン線（全角）。`js/formatBoilerplate.js` の正準表記と一致 |
| `SEARCH_RECORD_LINES` | ＜先行技術文献調査結果の記録＞（調査分野 IPC を含む） |
| `CONTACT_LINES` | 問合せ・面接の連絡先案内 |
| `SIGNATURE_LINES` | 審査官署名（`審査第四部伝送システム（PA5J） 飯星 陽平…` ／ TEL ／ メール） |

## 7. テスト

- **最初**: `tools/fixtures/例文_最初_1.txt`（進歩性＋サポート要件＋新規事項）、`例文_最初_2.txt`（新規性＋サポート要件）、`例文_最初_3.txt`（サポート要件のみ・例外形）を入力に、`tools/goldens/firstOfficeActionTemplate/` と `node tools/golden.js verify` でバイト比較します。
- **最後**: `tools/fixtures/例文_最後_1.txt`（進歩性のみ）を入力に、`tools/goldens/finalOfficeActionTemplate/` と比較します。＜最後の拒絶理由通知とする理由＞ブロックが挿入されることを確認します。
- golden は全モード×全 fixture を総当りするため、`finalOfficeActionTemplate` は `例文_最初_1/2/3` に対しても出力が固定され、`hasCitation` の真偽両方（記=注記付き／中央寄せ、＜引用文献等一覧＞の有無、ハイフン線直前の空行 2／1）を押さえています。
