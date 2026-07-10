/**
 * stripBlankLines.js
 * ---------------------------------------------------------------------------
 * 特許文書中の特定ブロック（補正の掲載・調査結果・引用文献・付記・優先権など）
 * 内部に含まれる空行を削除するユーティリティ群。
 *
 * ▼ 公開するグローバル
 *   - root.stripBlankLines
 *       stripBlankLinesInCorrectionNote, stripBlankLinesInSearchResult,
 *       stripBlankLinesInCitation, stripBlankLinesInAppendix,
 *       stripBlankLinesInPriority, stripBlankLinesInAmendmentSuggestion,
 *       stripBlankLinesInAddedNewMatter, stripBlankLinesInClaimsBlock,
 *       tightClaims
 *
 * ▼ 依存
 *   - root.textPrimitives（splitLines / joinLines / isBlankLine / escapeRegExp）
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
   * 「引用文献１(特に段落...)」から
   * 「…ことが記載されている。」または「…が記載されている。」までの
   * 範囲に含まれる空白行を削除します。
   *
   * - 終了マーカーは 2 種類の候補文字列を用意しており、
   *   いずれかにマッチした範囲が処理対象になります。
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInCitation(str) {
    if (str == null || str === "") return "";
    const s = String(str);

    const startMarkers = ["引用文献１(特に", "引用文献２(特に"]; // 必要に応じて他のパターンを追加
    const endMarkers = ["　ことが記載されている。", "　が記載されている。"];

    // 間の空白は、半角/全角スペース・タブ・改行などを許容
    // 「こと」+ 可変空白 + 「が記載されている。」を "A" に置換
    const pattern = /こと[\s\u3000]*が記載されている。/g;

    return stripBetween(s, startMarkers, endMarkers, { before: false, after: true }).replace(pattern, "ことが記載されている。");
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

  function stripBlankLinesInAddedNewMatter(str) {
    if (str == null || str === "") return "";
    const s = String(str);

    const startMarker = "例えば、請求項１は、";
    const endMarker = "」と認める。";

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
  // 『』内の空白行削除（マーカーペア単位の簡易エンジン）
  // ========================================================================

  /**
   * 空行判定（緩和版）
   * - 共有の isBlankLine と異なり、\n も空白類に含み、String() 変換を伴う。
   *   stripBlankLinesBetween の挙動を変えないため、この緩和版を維持する。
   * @param {string} line
   * @returns {boolean}
   */
  function isBlankLineLoose(line) {
    return /^[ \t\r\n\f\v　]*$/.test(String(line || ""));
  }

  /**
   * 開始～終了マーカーに挟まれた範囲の空白行を削除（簡易）
   * - 上記 stripBetween とは別実装（範囲全体を trim する等、挙動が異なる）。
   *   統合すると出力が変わるため並存させている。
   * @param {string} str
   * @param {string|string[]} startMarker
   * @param {string|string[]} endMarker
   * @returns {string}
   */
  function stripBlankLinesBetween(str, startMarker, endMarker) {
    if (str == null || str === "") return "";
    var s = String(str);

    var starts = Array.isArray(startMarker) ? startMarker : [startMarker];
    var ends = Array.isArray(endMarker) ? endMarker : [endMarker];

    var result = s;

    for (var i = 0; i < starts.length; i++) {
      for (var j = 0; j < ends.length; j++) {
        var pattern = new RegExp("(" + escapeRegExp(starts[i]) + ")([\\s\\S]*?)(" + escapeRegExp(ends[j]) + ")", "g");
        result = result.replace(pattern, function (_all, pre, inner, post) {
          var innerLines = splitLines(inner);
          var outLines = [];
          for (var k = 0; k < innerLines.length; k++) {
            if (!isBlankLineLoose(innerLines[k])) outLines.push(innerLines[k]);
          }
          return pre + joinLines(outLines).trim() + post;
        });
      }
    }

    return result;
  }

  /**
   * 『...』内の空白行を削除
   * @param {string} str
   * @returns {string}
   */
  function tightClaims(str) {
    if (str == null || str === "") return "";
    return stripBlankLinesBetween(String(str), "『", "』");
  }

  // ========================================================================
  // 請求項ヘッダブロック内の空白行削除
  // ========================================================================

  /**
   * 請求項ヘッダ群のパターン（正規表現ソース）
   * - 行頭が「・請求項」で始まる行に、任意で「・引用文献等」で始まる行、
   *   「・備考」で始まる行がこの順で続いたものを 1 つの「ヘッダ群」とみなす。
   * - 行頭一致なので「・請求項　１－３」のように後ろに番号等が続いてもよい。
   * @type {string}
   */
  var CLAIMS_HEADER_SRC =
    "・請求項[^\\n]*(?:\\n・引用文献等[^\\n]*)?(?:\\n・備考[^\\n]*)?";

  /**
   * 請求項ヘッダ群（・請求項／・引用文献等／・備考）から
   * ブロック終端までの本文に含まれる空白行を削除します。
   *
   * - ブロック終端とみなすのは次のいずれかの行（いずれも行頭一致）:
   *     1. 次の請求項ヘッダ群（「・請求項」で始まる行）
   *     2. 理由見出し（「●理由」で始まる行。●むすび等、他の●行では終端しない）
   *     3. 山括弧見出し（「<」または「＜」で始まる行。例:「<引用文献等一覧>」。
   *        最終ブロックの終端はこれになることが多い）
   * - stripBetween と同じ「全文正規表現 + 空行フィルタ」構造を基礎とするが、
   *   終端マーカーは次ブロックの開始や後続見出しを兼ねるため、
   *   消費しない先読み（lookahead）で検出する。これにより複数の理由
   *   セクションが連続していても、すべてのブロックが処理される。
   * - 本文の空行を全て削除し、終端行の直前に空行をちょうど 1 行残す。
   * - 本文が空（ヘッダ群と終端行が隣接している等）の場合は何もしない。
   * - 終端行が見つからない末尾の本文は対象外。
   *
   * @param {string} str 入力文字列
   * @returns {string} 該当範囲の空白行が削除された文字列
   */
  function stripBlankLinesInClaimsBlock(str) {
    if (str == null || str === "") return "";
    var s = String(str);

    // (ヘッダ群)(本文)(?=\n終端行: ・請求項 / ●理由 / 山括弧見出し)
    var pattern = new RegExp(
      "(^" + CLAIMS_HEADER_SRC + ")([\\s\\S]*?)(?=\\n(?:・請求項|●理由|[<＜]))",
      "gm"
    );

    return s.replace(pattern, function (_all, header, inner) {
      var innerLines = splitLines(inner);
      var outLines = [];
      for (var i = 0; i < innerLines.length; i++) {
        if (!isBlankLine(innerLines[i])) outLines.push(innerLines[i]);
      }
      // 本文が無い場合（ヘッダ群と終端行が隣接）は改変しない
      if (outLines.length === 0) return header + inner;
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
    stripBlankLinesInCitation: stripBlankLinesInCitation,
    stripBlankLinesInAppendix: stripBlankLinesInAppendix,
    stripBlankLinesInPriority: stripBlankLinesInPriority,
    stripBlankLinesInAmendmentSuggestion: stripBlankLinesInAmendmentSuggestion,
    stripBlankLinesInAddedNewMatter: stripBlankLinesInAddedNewMatter,

    // 請求項ヘッダブロック内の空白行削除（stripBlankLinesTight チェーン用）
    stripBlankLinesInClaimsBlock: stripBlankLinesInClaimsBlock,

    // 『』内の空白行削除（本文整形チェーンから利用）
    tightClaims: tightClaims
  };
})(globalThis);