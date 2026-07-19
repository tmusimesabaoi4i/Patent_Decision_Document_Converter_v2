// ファイル名: buildFirstOATemplate.js
//
// モード「1st Office Action template（最初の拒絶理由・ひな形）」および
// 「Final Office Action template（最後の拒絶理由・ひな形）」のビルダー。
// 両者は共通コア buildTemplate() を使い、違いは
// ＜最後の拒絶理由通知とする理由＞ ブロックの有無（opts.finalRejectionNote）だけ。
//
// 入力（理由の柱書きを並べただけの短いテキスト。例: 「（進歩性）…」「（サポート要件）…」）を、
// 連番付与・「記」区切り・「●理由Ｎ（…）について」セクション・
// ＜拒絶の理由を発見しない請求項＞／＜引用文献等一覧＞／＜先行技術文献調査結果の記録＞／
// 連絡先／審査官署名 までを含む定型の“ひな形”に展開する。
//
// 進歩性・新規性・拡大先願・先願（＝引用文献ベースの理由）が 1 件でもあると、
//   - 「記」行を注記付きにし、
//   - 該当理由の●理由セクションに「・引用文献等　Ｘ」「・備考」を付け、
//   - 末尾に＜引用文献等一覧＞ブロックを出す（前に空行 2 つ）。
// 引用文献ベースの理由が無い場合は上記を出さない（＜引用文献等一覧＞の前は空行 1 つ）。
//
// 注意: 本モードは app.toHalfWidth（NFKC）通過後のテキストを受け取るため、
//   全角括弧・全角数字・全角スペースは半角に潰れている。そこで理由本文は自前で全角化する
//   （既存 formatBody / normalize は officeAction 用に半角括弧・半角ピリオドを残すため通さない）。
//
// 公開グローバル: root.buildFirstOATemplate
// 依存: root.textPrimitives（splitLines）

(function (root) {
  "use strict";

  // ============================================================
  // 依存（textPrimitives）
  // ============================================================
  var textPrimitives = root.textPrimitives;
  if (!textPrimitives) {
    // eslint-disable-next-line no-console
    console.warn("buildFirstOATemplate.js: root.textPrimitives が見つかりません。textPrimitives.js を先に読み込んでください。");
    return;
  }
  var splitLines = textPrimitives.splitLines;

  // ============================================================
  // 編集可能な設定・固定文（ユーザー個別のひな形値）
  // ============================================================

  // 「引用文献あり」とみなす理由ラベルのキーワード（部分一致）。
  // - 「先願」は「先願」「拡大先願（29条の2）」の両方を拾う。
  // - 「新規事項」は「新規性」を含まないため引用文献扱いにはならない。
  var CITATION_KEYWORDS = ["進歩性", "新規性", "先願"];

  // 「記」の区切り行（js/formatBoilerplate.js の正準表記と一致）
  var KI_WITH_NOTE = "　　　　　記　　　（引用文献等については引用文献等一覧参照）";
  var KI_PLAIN = "　　　　　　　　　　　　　　　　　記";

  // ●理由セクションの箇条書き
  var LINE_CLAIM = "・請求項　";
  var LINE_CITATION = "・引用文献等　Ｘ";
  var LINE_NOTE = "・備考";

  // ＜拒絶の理由を発見しない請求項＞
  var HAKKEN_HEADER = "＜拒絶の理由を発見しない請求項＞";
  var HAKKEN_BODY = "　請求項（　　　）に係る発明については、現時点では、拒絶の理由を発見しない。拒絶の理由が新たに発見された場合には拒絶の理由が通知される。";

  // ＜引用文献等一覧＞（引用文献ありのときだけ出力）
  var INYOU_ICHIRAN_HEADER = "　　　　　　　　　　　　　＜引用文献等一覧＞";
  var INYOU_ICHIRAN_NOTE = "（周知技術を示す文献；新たに引用した文献）";

  // ＜最後の拒絶理由通知とする理由＞（finalOfficeActionTemplate モードだけ、
  //  ＜拒絶の理由を発見しない請求項＞ と ＜引用文献等一覧＞ の間に挿入）。
  // ヘッダは js/formatBoilerplate.js の正準表記と一致。
  var FINAL_REASON_HEADER = "　　　　　　　　　　＜最後の拒絶理由通知とする理由＞";
  var FINAL_REASON_BODY = "　この拒絶理由通知は、最初の拒絶理由通知に対する応答時の補正によって通知することが必要になった拒絶理由のみを通知するものである。";

  // 区切りハイフン線（js/formatBoilerplate.js の正準表記と一致）
  var HYPHEN_RULE = "－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－";

  // ＜先行技術文献調査結果の記録＞（固定）
  var SEARCH_RECORD_LINES = [
    "　　　　　　　　　　＜先行技術文献調査結果の記録＞",
    "・調査した分野　　ＩＰＣ　　Ｈ０４Ｂ　７／　２４－　　７／　２６",
    "　　　　　　　　　　　　　　Ｈ０４Ｗ　４／　００－　９９／　００",
    "　この先行技術文献調査結果の記録は、拒絶理由を構成するものではありません。"
  ];

  // 連絡先（固定）
  var CONTACT_LINES = [
    "　この拒絶理由通知の内容に関するお問合せ又は面接のご希望がありましたら、次の連絡先までご連絡ください。補正案等の送付を希望される際は、その旨を事前にご連絡ください。",
    "　電子メールにて連絡する際は、氏名、所属、出願番号、電話番号、下記審査官（補）名を記載していただき、下記メールアドレス（※）までご連絡ください。電子メールの連絡内容について不明な点等がある場合、電話で確認させていただく場合があります。"
  ];

  // 審査官署名（固定）
  var SIGNATURE_LINES = [
    "審査第四部伝送システム（PA5J） 飯星 陽平（いいほし ようへい）",
    "TEL.03-3581-1101 内線3534",
    "※●●●●@jpo.go.jp （上記「●●●●」に置き換えて、「PA5J」と入力ください。）"
  ];

  // ============================================================
  // 小関数
  // ============================================================

  /**
   * 半角 ASCII(0x21-0x7E) を全角へ、半角スペース(0x20) を全角スペース(U+3000) へ変換する。
   * それ以外の文字はそのまま返す。
   * - NFKC で潰れた「（」「）」「２９」「／」「　」などを元の全角表記へ戻す用途。
   * @param {string} s
   * @returns {string}
   */
  function fullwidthenAscii(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (code === 0x20) {
        out += "　";
      } else if (code >= 0x21 && code <= 0x7e) {
        out += String.fromCharCode(code + 0xfee0);
      } else {
        out += s.charAt(i);
      }
    }
    return out;
  }

  /**
   * 数値を全角数字の文字列にする（例: 12 -> "１２"）。
   * @param {number} n
   * @returns {string}
   */
  function fwNum(n) {
    return fullwidthenAscii(String(n));
  }

  /**
   * ラベルが引用文献ベースの理由かどうか（部分一致）。
   * @param {string} label
   * @returns {boolean}
   */
  function isCitationLabel(label) {
    for (var i = 0; i < CITATION_KEYWORDS.length; i++) {
      if (label.indexOf(CITATION_KEYWORDS[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  /**
   * 入力から理由を抽出する。
   * - 前後の空白を除いた行頭が「（」または「(」で始まる行を 1 件の理由とみなす。
   * - 空行・非該当行は無視する（例文はいずれも 1 理由 = 1 行）。
   * @param {string} text
   * @returns {Array<{label:string, body:string, citation:boolean}>}
   */
  function parseReasons(text) {
    var lines = splitLines(text);
    var reasons = [];
    for (var i = 0; i < lines.length; i++) {
      var trimmed = String(lines[i]).trim();
      if (!trimmed) {
        continue;
      }
      var m = trimmed.match(/^[（(]([^）)]*)[）)]/);
      if (!m) {
        continue;
      }
      var label = m[1];
      reasons.push({
        label: label,
        body: fullwidthenAscii(trimmed),
        citation: isCitationLabel(label)
      });
    }
    return reasons;
  }

  /**
   * ●理由セクションを 1 件ぶん組み立てる。
   * @param {{label:string, citation:boolean}} reason
   * @param {number} index 0 始まりの通し番号
   * @returns {string}
   */
  function renderReasonSection(reason, index) {
    var lines = [
      "●理由" + fwNum(index + 1) + "（" + fullwidthenAscii(reason.label) + "）について",
      "",
      LINE_CLAIM
    ];
    if (reason.citation) {
      lines.push(LINE_CITATION);
      lines.push(LINE_NOTE);
    }
    return lines.join("\n");
  }

  // ============================================================
  // 本体
  // ============================================================

  /**
   * 拒絶理由（ひな形）を組み立てる共通コア。
   * first / final の違いは opts.finalRejectionNote だけ。
   * @param {string} text app.toHalfWidth 通過後の入力
   * @param {{finalRejectionNote?: boolean}} [opts]
   * @returns {string}
   */
  function buildTemplate(text, opts) {
    if (typeof text !== "string") {
      return text;
    }
    opts = opts || {};

    var reasons = parseReasons(text);
    if (reasons.length === 0) {
      // 理由が 1 つも無い場合は入力をそのまま返す（誤操作時に UI を壊さない）。
      return text;
    }

    var hasCitation = reasons.some(function (r) {
      return r.citation;
    });

    // 1. 連番理由（各理由の間に空行 1 つ）
    var numbered = reasons
      .map(function (r, i) {
        return fwNum(i + 1) + "．" + r.body;
      })
      .join("\n\n");

    // 3. ●理由セクション群（セクション間は空行 1 つ）
    var sections = reasons
      .map(function (r, i) {
        return renderReasonSection(r, i);
      })
      .join("\n\n");

    // 4. ＜拒絶の理由を発見しない請求項＞
    var hakken = HAKKEN_HEADER + "\n" + HAKKEN_BODY;

    // 6. ハイフン線 + ＜先行技術文献調査結果の記録＞（間に空行なし）
    var recordBlock = HYPHEN_RULE + "\n" + SEARCH_RECORD_LINES.join("\n");

    // ---- 組み立て ----
    var out = numbered;
    out += "\n\n" + (hasCitation ? KI_WITH_NOTE : KI_PLAIN);
    out += "\n\n" + sections;
    out += "\n\n" + hakken;

    if (opts.finalRejectionNote) {
      // 最後の拒絶理由（ひな形）だけ、発見しない請求項ブロックの後に
      // ＜最後の拒絶理由通知とする理由＞ ブロックを挿入する（前後は空行 1 つ）。
      out += "\n\n" + FINAL_REASON_HEADER + "\n\n" + FINAL_REASON_BODY;
    }

    if (hasCitation) {
      // 直前ブロックの後、空行 2 つ → ＜引用文献等一覧＞ → （空行なし）→ ハイフン線
      out += "\n\n\n" + INYOU_ICHIRAN_HEADER + "\n" + INYOU_ICHIRAN_NOTE + "\n" + recordBlock;
    } else {
      // 空行 1 つ → ハイフン線
      out += "\n\n" + recordBlock;
    }

    out += "\n\n" + CONTACT_LINES.join("\n");
    out += "\n\n" + SIGNATURE_LINES.join("\n");
    out += "\n";

    return out;
  }

  /**
   * 最初の拒絶理由（ひな形）を組み立てる（firstOfficeActionTemplate モード）。
   * @param {string} text app.toHalfWidth 通過後の入力
   * @returns {string}
   */
  function buildFirstOATemplate(text) {
    return buildTemplate(text, {});
  }

  /**
   * 最後の拒絶理由（ひな形）を組み立てる（finalOfficeActionTemplate モード）。
   * first との違いは ＜最後の拒絶理由通知とする理由＞ ブロックの挿入のみ。
   * @param {string} text app.toHalfWidth 通過後の入力
   * @returns {string}
   */
  function buildFinalOATemplate(text) {
    return buildTemplate(text, { finalRejectionNote: true });
  }

  // ============================================================
  // グローバルへのエクスポート
  // ============================================================
  root.buildFirstOATemplate = {
    buildFirstOATemplate: buildFirstOATemplate,
    buildFinalOATemplate: buildFinalOATemplate
  };
})(globalThis);
