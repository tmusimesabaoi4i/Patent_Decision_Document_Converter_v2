/**
 * stripBlankLines.js
 * ---------------------------------------------------------------------------
 * 特許文書中の特定ブロック（補正の掲載・調査結果・引用文献・付記・優先権など）
 * 内部に含まれる空行を削除するユーティリティ群。
 *
 * ▼ 公開するグローバル
 *   - root.stripBlankLines
 *       stripBlankLinesInCorrectionNote, stripBlankLinesInSearchResult,
 *       stripBlankLinesInAppendix, stripBlankLinesInPriority,
 *       stripBlankLinesInAmendmentSuggestion, stripBlankLinesInSignature,
 *       stripBlankLinesInClaimsBlock
 *
 * ▼ 依存
 *   - root.textPrimitives（splitLines / joinLines / isBlankLine / escapeRegExp）
 *   - root.formatBody（isHeadingLine — 請求項ヘッダブロック内で見出し行の前に
 *     空行を残す判定に使用）
 * ---------------------------------------------------------------------------
 */

(function (root) {
  "use strict";

  // ========================================================================
  // 依存（textPrimitives）
  // ========================================================================

  var textPrimitives = root.textPrimitives;
  if (!textPrimitives) {
    // eslint-disable-next-line no-console
    console.warn("stripBlankLines.js: root.textPrimitives が見つかりません。textPrimitives.js を先に読み込んでください。");
    return;
  }
  var splitLines = textPrimitives.splitLines;
  var joinLines = textPrimitives.joinLines;
  var isBlankLine = textPrimitives.isBlankLine;
  var escapeRegExp = textPrimitives.escapeRegExp;

  var formatBody = root.formatBody;
  if (!formatBody || typeof formatBody.isHeadingLine !== "function") {
    // eslint-disable-next-line no-console
    console.warn("stripBlankLines.js: root.formatBody.isHeadingLine が見つかりません。formatBody.js を先に読み込んでください。");
    return;
  }
  var isHeadingLine = formatBody.isHeadingLine;

  // ========================================================================
  // 内部共通ユーティリティ
  // ========================================================================

  // 行分割・空行判定などの共通プリミティブは textPrimitives に集約した。
  //（splitLines の空入力の扱いも、全呼び出し箇所（inner は必ず文字列）で等価）

  // ========================================================================
  // マーカー領域内の空白行削除
  // ========================================================================

  /**
   * 指定したマーカーに挟まれた範囲から空白行のみを削除します。
   *
   * - 開始マーカーと終了マーカーに挟まれたテキストを対象とし、
   *   その内部の「空白行」（空文字または空白類のみの行）を削除します。
   * - マーカーは文字列または文字列配列で指定できます。
   *   配列を渡した場合は、すべての組み合わせ（start × end）の範囲に対して処理します。
   * - 対象範囲外のテキストは変更しません。
   * - ネストしたマーカー構造や複雑な重なりには対応しない簡易実装です。
   * - pad は整形後の本文とマーカーの間に改行を入れるかどうかの指定です。
   *   （pad.before: 開始マーカー直後、pad.after: 終了マーカー直前）
   *
   * @param {string} str 入力文字列
   * @param {string|string[]} startMarker 範囲の開始を表すマーカー
   * @param {string|string[]} endMarker   範囲の終了を表すマーカー
   * @param {{before: boolean, after: boolean}} pad 改行パディングの指定
   * @returns {string} 空白行のみが削除された文字列
   */
  function stripBetween(str, startMarker, endMarker, pad) {
    if (str == null || str === "") return "";
    const s = String(str);
    const starts = Array.isArray(startMarker) ? startMarker : [startMarker];
    const ends = Array.isArray(endMarker) ? endMarker : [endMarker];

    let result = s;
    for (const start of starts) {
      for (const end of ends) {
        const pattern = new RegExp(`(${escapeRegExp(start)})([\\s\\S]*?)(${escapeRegExp(end)})`, "g");
        result = result.replace(pattern, (_all, pre, inner, post) => {
          const innerLines = splitLines(inner);
          const outLines = innerLines.filter((line) => !isBlankLine(line));
          return pre + (pad.before ? "\n" : "") + joinLines(outLines) + (pad.after ? "\n" : "") + post;
        });
      }
    }
    return result;
  }

  /**
   * 「<補正をする際の注意>」から
   * 「(上記「●●●●」に置き換えて、「PA5J」と入力ください。)」までの
   * 範囲に含まれる空白行を削除します。
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInCorrectionNote(str) {
    if (str == null || str === "") return "";
    const s = String(str);

    const startMarker = "<補正をする際の注意>";
    const endMarker =
      "(上記「●●●●」に置き換えて、「PA5J」と入力ください。)";

    return stripBetween(s, startMarker, endMarker, { before: true, after: false });
  }

  /**
   * 「<先行技術文献調査結果の記録>」から
   * 「この先行技術文献調査結果の記録は、拒絶理由を構成するものではありません。」までの
   * 範囲に含まれる空白行を削除します。
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInSearchResult(str) {
    if (str == null || str === "") return "";
    const s = String(str);

    const startMarker = "<先行技術文献調査結果の記録>";
    const endMarker =
      "　この先行技術文献調査結果の記録は、拒絶理由を構成するものではありません。";

    return stripBetween(s, startMarker, endMarker, { before: true, after: true });
  }

  /**
   * 「<付記>」から
   * 「この付記は、拒絶理由を構成するものではありません。」までの
   * 範囲に含まれる空白行を削除します。
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInAppendix(str) {
    if (str == null || str === "") return "";
    const s = String(str);

    const startMarker = "<付記>";
    const endMarker =
      "　この付記は、拒絶理由を構成するものではありません。";

    return stripBetween(s, startMarker, endMarker, { before: true, after: true });
  }

  /**
   * 「<優先権の主張の効果について>」から
   * 「優先権の主張の効果が認められない。」までの
   * 範囲に含まれる空白行を削除します。
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInPriority(str) {
    if (str == null || str === "") return "";
    const s = String(str);

    const startMarker = "<優先権の主張の効果について>";
    const endMarker = "優先権の主張の効果が認められない。";

    return stripBetween(s, startMarker, endMarker, { before: true, after: false });
  }

  /**
   * 「<補正の示唆>」から
   * 「なお、上記の補正の示唆は、法律的効果を生じさせるものではなく、拒絶理由を解消するための一案である。明細書等についてどのように補正をするかは、出願人が決定すべきものである。」
   * までの範囲に含まれる空白行を削除します。
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInAmendmentSuggestion(str) {
    if (str == null || str === "") return "";
    const s = String(str);

    const startMarker = "<補正の示唆>";
    const endMarkers = [
      "　なお、上記の補正の示唆は、法律的効果を生じさせるものではなく、拒絶理由を解消するための一案である。明細書等についてどのように補正をするかは、出願人が決定すべきものである。"
    ];

    return stripBetween(s, startMarker, endMarkers, { before: true, after: true });
  }

  // ========================================================================
  // 区切り線〜署名メール行（連絡先ブロック）内の空白行削除
  // ========================================================================

  /**
   * 区切り線（ハイフンのみの行）から署名メール行
   * 「※●●●●@jpo.go.jp (上記「●●●●」に置き換えて、「PA5J」と入力ください。)」
   * までの間に含まれる空白行を削除します。
   *
   * - 区切り線: 行全体がハイフンのみ（半角 - / 全角 －、10 文字以上）の行。
   *   行頭・行末の空白は許容する。パイプライン 3 段目の時点では半角形
   *   「------…----」が主だが、全角形の入力にも備えて両方を対象とする。
   * - 署名メール行: 行頭（空白許容）が「※●●●●@jpo.go.jp」で始まる行。
   * - ただし、両者の間に「<」または「＜」で始まる行（山括弧見出し）が
   *   1 行でも存在する場合、その区間は対象外として何もしない。
   *   （<先行技術文献調査結果の記録> や <補正をする際の注意> など、
   *   独自の整形を持つセクションが挟まっているケースを巻き込まないため）
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInSignature(str) {
    if (str == null || str === "") return "";
    var s = String(str);

    // (区切り線)(本文)(署名メール行) — いずれも行単位で照合（m フラグ）
    var pattern = new RegExp(
      "(^[ 　]*[-－]{10,}[ 　]*$)([\\s\\S]*?)(^[ 　]*※●●●●@jpo\\.go\\.jp[^\\n]*$)",
      "gm"
    );

    return s.replace(pattern, function (all, divider, inner, email) {
      // 間に山括弧見出し行（< / ＜ 始まり。行頭空白許容）があれば対象外
      if (/^[ 　]*[<＜]/m.test(inner)) return all;

      var innerLines = splitLines(inner);
      var outLines = [];
      for (var i = 0; i < innerLines.length; i++) {
        if (!isBlankLine(innerLines[i])) outLines.push(innerLines[i]);
      }
      return divider + "\n" + joinLines(outLines) + "\n" + email;
    });
  }

  // ========================================================================
  // 請求項ヘッダブロック内の空白行削除
  // ========================================================================

  /**
   * 請求項ヘッダ群のパターン（正規表現ソース）
   * - 次の 4 パターンのいずれかを 1 つの「ヘッダ群」とみなす（長いパターンを先に試す）:
   *     1. ・請求項 + ・引用文献等 + ・備考
   *     2. ・請求項 + ・引用文献等
   *     3. ・請求項 + ・備考
   *     4. ・請求項 のみ
   * - 行頭一致なので「・請求項　１－３」のように後ろに番号等が続いてもよい。
   * @type {string}
   */
  var CLAIMS_HEADER_SRC =
    "(?:・請求項[^\\n]*\\n・引用文献等[^\\n]*\\n・備考[^\\n]*" +
    "|・請求項[^\\n]*\\n・引用文献等[^\\n]*" +
    "|・請求項[^\\n]*\\n・備考[^\\n]*" +
    "|・請求項[^\\n]*)";

  var CLAIMS_BLOCK_TERMINAL_SRC = "・請求項|●理由|[<＜]|[-－]";

  /**
   * 請求項ヘッダ群（・請求項／・引用文献等／・備考）から
   * ブロック終端までの本文に含まれる空白行を削除します。
   *
   * - ブロック終端とみなすのは次のいずれかの行（いずれも行頭一致）:
   *     1. 次の請求項ヘッダ群（「・請求項」で始まる行）
   *     2. 理由見出し（「●理由」で始まる行。●むすび等、他の●行では終端しない）
   *     3. 山括弧見出し（「<」または「＜」で始まる行。例:「<引用文献等一覧>」）
   *     4. ハイフン行（「-」または「－」で始まる行。例:「------------------------------------」。
   *        ③ と同種の「行頭の記号で始まる行」として扱う）
   * - stripBetween と同じ「全文正規表現 + 空行フィルタ」構造を基礎とするが、
   *   終端マーカーは次ブロックの開始や後続見出しを兼ねるため、
   *   消費しない先読み（lookahead）で検出する。これにより複数の理由
   *   セクションが連続していても、すべてのブロックが処理される。
   * - 本文の空行を全て削除し、終端行の直前に空行をちょうど 1 行残す。
   *   ただし見出し行（formatBody.isHeadingLine = buildHeadingMarkRe の
   *   見出しマークで始まる行。(1) / (あ) / １． / 第1章 など）の直前には
   *   空行を 1 行残す（tight で詰めた後も見出しの区切りを保つ）。
   * - 本文が空（ヘッダ群と終端行が隣接している等）の場合は何もしない。
   * - 終端行が見つからない末尾の本文は対象外。
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInClaimsBlock(str) {
    if (str == null || str === "") return "";
    var s = String(str);

    // (ヘッダ群)(本文)(?=\n終端行: ・請求項 / ●理由 / <・＜行 / -・－行)
    var pattern = new RegExp(
      "(^" + CLAIMS_HEADER_SRC + ")([\\s\\S]*?)(?=\\n(?:" + CLAIMS_BLOCK_TERMINAL_SRC + "))",
      "gm"
    );

    return s.replace(pattern, function (_all, header, inner) {
      var innerLines = splitLines(inner);
      var outLines = [];
      for (var i = 0; i < innerLines.length; i++) {
        if (isBlankLine(innerLines[i])) continue;
        // 見出し行の前には空行を 1 行入れる（詰めた後も見出しの区切りを保つ）
        if (isHeadingLine(innerLines[i])) outLines.push("");
        outLines.push(innerLines[i]);
      }
      // 本文が無い場合（ヘッダ群と終端行が隣接）は改変しない
      if (outLines.length === 0) return header + inner;
      // 先頭が見出しで空行から始まる場合、ヘッダ直後の "\n" と重複させない
      if (outLines[0] === "") outLines.shift();
      // 末尾の "\n" は、残存する終端行の "\n" と合わせて空行 1 行になる
      return header + "\n" + joinLines(outLines) + "\n";
    });
  }

  // ========================================================================
  // グローバル公開
  // ========================================================================

  /**
   * 空白行削除関連の関数群をまとめた公開オブジェクトです。
   *
   * - 各関数は基本的に (str: string) => string の形で実装されており、
   *   テキスト整形用のフィルタとしてそのまま利用できます。
   */
  root.stripBlankLines = {
    // 用途別のヘルパ
    stripBlankLinesInCorrectionNote: stripBlankLinesInCorrectionNote,
    stripBlankLinesInSearchResult: stripBlankLinesInSearchResult,
    stripBlankLinesInAppendix: stripBlankLinesInAppendix,
    stripBlankLinesInPriority: stripBlankLinesInPriority,
    stripBlankLinesInAmendmentSuggestion: stripBlankLinesInAmendmentSuggestion,

    // 区切り線〜署名メール行（連絡先ブロック）内の空白行削除
    stripBlankLinesInSignature: stripBlankLinesInSignature,

    // 請求項ヘッダブロック内の空白行削除（stripBlankLinesTight チェーン用）
    stripBlankLinesInClaimsBlock: stripBlankLinesInClaimsBlock
  };
})(globalThis);