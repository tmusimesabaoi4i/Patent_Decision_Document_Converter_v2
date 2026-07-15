// ファイル名: formatAmendmentNote.js

(function (root) {
  "use strict";

  // ============================================================
  // 依存（textPrimitives）
  // ============================================================
  var textPrimitives = root.textPrimitives;
  if (!textPrimitives) {
    // eslint-disable-next-line no-console
    console.warn("formatAmendmentNote.js: root.textPrimitives が見つかりません。textPrimitives.js を先に読み込んでください。");
    return;
  }
  // 行分割・行結合・全角半角変換などの共通プリミティブは textPrimitives に集約した。
  var splitLines = textPrimitives.splitLines;
  var joinLines = textPrimitives.joinLines;
  var hwAlnum = textPrimitives.hwAlnum;
  var fwNum = textPrimitives.fwNum;

  // ============================================================
  // ＜補正の示唆＞ ブロック用
  // ============================================================

  /**
   * 「<補正の示唆>」以降に現れる
   *   "(１)fewofwKAoefwp"
   * のような行を変換する。
   *
   * 仕様：
   *   - 行頭の "(数字)" / "（数字）" を検出し、
   *       * 数字は全角数字に統一
   *       * 括弧は半角 "(" ")" に統一
   *   - それ以降のテキストについて：
   *       * 全角英数字は半角に
   *       * 行頭、またはカンマの直後の英字を大文字化
   *
   * 例：
   *   (１)fewofwKAoefwp  → (１)FewofwKAoefwp
   *   (２)geijgjiOas,f   → (２)GeijgjiOas,F
   *   (３)あああＡ      → (３)あああA
   *
   * @param {string} line
   * @returns {string}
   */
  function convertSuggestionNumberLineToFullWidth(line) {
    var s = String(line);

    // 先頭の空白＋括弧数字括弧をキャプチャ
    var m = /^([ \t\u3000]*)([（(])([0-9０-９]+)([)）])(.*)$/.exec(s);
    if (!m) {
      return s;
    }

    var indent = m[1] || "";
    var digits = m[3] || "";
    var rest = m[5] || "";

    // 数字は全角に統一
    var fullDigits = fwNum(digits);

    // 後半部はまず全角英数字を半角に
    var normalizedRest = hwAlnum(rest);

    // 行頭およびカンマの直後の英字を大文字化
    normalizedRest = normalizedRest.replace(
      /(^|[,\s])([a-zA-Z])/g,
      function (_all, sep, ch) {
        return sep + ch.toUpperCase();
      }
    );

    // 括弧は半角 "(" ")" に統一
    return indent + "(" + fullDigits + ")" + normalizedRest;
  }

  /**
   * 「補正の示唆番号行」かどうか簡易判定。
   * 行頭に "(数字)" もしくは "（数字）" があれば true。
   */
  function isSuggestionNumberLine(line) {
    var s = String(line);
    return /^[ \t\u3000]*[（(][0-9０-９]+[)）]/.test(s);
  }

  // ============================================================
  // ＜ファミリー文献情報＞ ブロック用
  // ============================================================

  /**
   * ファミリー文献情報ブロック内の「番号行」かどうかを判定。
   * 例： "１.GこれKご" / "1.Gtext"
   */
  function isFamilyInfoHeadLine(line) {
    return /^[ 　]*[0-9０-９]+[\.．]/.test(String(line));
  }

  /**
   * ファミリー文献情報ブロック内の「本文行（番号行の次以降）」かどうかを判定。
   * 例： "　FgkrこけおR" （文頭は半角スペース想定だが、全角も許容）
   */
  function isFamilyInfoBodyLine(line) {
    // 行頭に空白があり、そのあとに何か非空白文字が続く行
    return /^[ 　\t]+.*\S.*$/.test(String(line));
  }

  /**
   * ファミリー文献情報ブロックの「番号行」を整形する。
   *
   * 仕様：
   *   - 行頭の「数字＋ドット」部分は
   *       * 数字のみ全角に統一（ドットは元のまま）
   *   - それ以降の文字列は英数字のみ半角に変換（日本語はそのまま）
   *
   * 例：
   *   "1.GこれKご"   → "１.GこれKご"
   *   "１．ｇらえｊ" → "１．gらえj"
   *
   * @param {string} line
   * @returns {string}
   */
  function convertFamilyInfoHeadLine(line) {
    var s = String(line);
    var m = /^([ 　]*)([0-9０-９]+)([\.．])(.*)$/.exec(s);
    if (!m) return s;

    var indent = m[1] || "";
    var nums = m[2] || "";
    var dot = m[3] || "";
    var rest = m[4] || "";

    // 数字は全角に揃える
    var fullNums = fwNum(nums);

    // 本文部は英数字のみ半角に
    var normalizedRest = hwAlnum(rest);

    return indent + fullNums + dot + normalizedRest;
  }

  /**
   * ファミリー文献情報ブロックの「本文行（番号行の次以降）」を整形する。
   *
   * 仕様：
   *   - 行頭にある空白の個数・種別（半角/全角）にかかわらず、
   *     一律「全角スペース3個」のインデントに揃える
   *   - 本文部は英数字のみ半角に変換する
   *
   * 例：
   *   "　FgkrこけおR" → "　　　FgkrこけおR"
   *
   * @param {string} line
   * @returns {string}
   */
  function convertFamilyInfoBodyLine(line) {
    var s = String(line);

    // 行頭の空白（全角/半角/タブ）をすべて取り除く
    var body = s.replace(/^[ 　\t]+/, "");

    // 英数字のみ半角化
    var normalizedBody = hwAlnum(body);

    // ファミリー文献情報の本文行の標準インデント（全角スペース3つ）
    var INDENT = "　　　";

    return INDENT + normalizedBody;
  }

  // ============================================================
  // 行単位の共通変換
  // ============================================================

  /**
   * 単一行をルールベースで整形する。
   *
   * 処理の流れ：
   *   1. 行が完全空行ならそのまま返す
   *   2. 特定の固定文言（署名・TEL・メールアドレス）は、行頭空白も含めて完全一致で置換
   *   3. それ以外は全角英数字→半角化 → 数字だけ全角に戻す
   *
   * @param {string} str - 1 行分の文字列
   * @returns {string} 整形済みの 1 行分の文字列
   */
  function formatAmendmentNoteLine(str) {
    var raw = str == null ? "" : String(str);

    // 完全な空行はそのまま空行として返す
    if (raw === "") {
      return "";
    }

    // ------------------------------
    // 固定文言に対する完全一致マッチ
    // （元データは行頭に全角スペース付きで入ってくる想定）
    // ------------------------------
    if (raw === "　審査第四部伝送システム(PA5J) 飯星 陽平(いいほし ようへい)") {
      // 行頭インデント無し＋前に 1 行改行を付与
      return "\n審査第四部伝送システム(PA5J) 飯星 陽平(いいほし ようへい)";
    }

    if (raw === "　TEL.03-3581-1101 内線3534") {
      // 行頭の空白はすべて削除して返す
      return "TEL.03-3581-1101 内線3534";
    }

    if (raw === "　※●●●●@jpo.go.jp (上記「●●●●」に置き換えて、「PA5J」と入力ください。)") {
      // 行頭空白を削除して返す
      return "※●●●●@jpo.go.jp (上記「●●●●」に置き換えて、「PA5J」と入力ください。)";
    }

    // ------------------------------
    // 上記以外の行は、まず全角英数字を半角に正規化
    // ------------------------------
    var s = hwAlnum(raw);

    // （ここに DB 名や IPC 行など追加ルールがあれば挿入）

    // ------------------------------
    // デフォルト：数字だけ全角に戻す
    // ------------------------------
    return fwNum(s);
  }

  // ============================================================
  // メイン：<補正をする際の注意> ブロック全体の変換
  // ============================================================

  /**
   * 「<補正をする際の注意>」ブロックを対象に、
   *   - ＜補正の示唆＞ ブロック
   *   - ＜ファミリー文献情報＞ ブロック
   * を行単位で整形する。
   *
   * 終了条件：
   *   行頭に空白（半角/全角）があり、
   *   「この拒絶理由通知の内容に関するお問合せ」で始まる行を
   *   「＜補正の示唆＞／＜ファミリー文献情報＞ブロックの終端」とみなす。
   *
   * この終端行自体および、それ以降の行（メール案内・署名など）は
   * ブロック外として通常の行処理（formatAmendmentNoteLine）に通す。
   *
   * 実装方針：
   *   - 「pre + <補正をする際の注意> + tail」の 3 分割でテキストを扱う
   *   - tail 部分のみ formatAmendmentNoteTail() に通して整形する
   *   - 「<補正をする際の注意>」が存在しない場合は全文を formatAmendmentNoteTail() に通す
   *
   * @param {string} text - 全文テキスト
   * @returns {string} 整形済みテキスト
   */
  function formatAmendmentNoteBlock(text) {
    var input = String(text);

    // ([\s\S]*?)             → pre: 先頭〜最初の "<補正をする際の注意>" 直前まで
    // (<補正をする際の注意>) → marker
    // ([\s\S]*)              → tail: マーカー直後〜全文末尾まで（変換対象）
    var pattern = /([\s\S]*?)(<補正をする際の注意>)([\s\S]*)/;

    if (pattern.test(input)) {
      return input.replace(pattern, function (_all, pre, marker, tail) {
        var convertedTail = formatAmendmentNoteTail(marker, tail);
        return pre + marker + convertedTail;
      });
    }

    // 「<補正をする際の注意>」自体が無い場合のフォールバック。
    // 全文を通すと本文中の数字まで全角化されるため、連絡先（署名）ブロックだけを対象にする。
    //   1. 先行技術文献調査結果ブロックの終端文行があれば、その直後から末尾まで
    //   2. 無ければ、区切り線行（stripBlankLinesInSignature と同一定義）のうち最後の 1 本の直後から末尾まで
    //   3. どちらも無ければ無変換で返す
    var fbLines = splitLines(input);
    var TERM_RE = /^[ 　\t]*この先行技術文献調査結果の記録は、拒絶理由を構成するものではありません。/;
    var DIV_RE = /^[ 　]*[-－]{10,}[ 　]*$/;

    var startIdx = -1;
    for (var fi = 0; fi < fbLines.length; fi++) {
      if (TERM_RE.test(fbLines[fi])) { startIdx = fi + 1; break; }
    }
    if (startIdx < 0) {
      for (var di = fbLines.length - 1; di >= 0; di--) {
        if (DIV_RE.test(fbLines[di])) { startIdx = di + 1; break; }
      }
    }
    if (startIdx < 0 || startIdx >= fbLines.length) {
      return input; // 連絡先ブロックが特定できない場合は無変換
    }

    return fbLines.slice(0, startIdx).join("\n") + "\n" +
      formatAmendmentNoteTail("", fbLines.slice(startIdx).join("\n"));
  }

  /**
   * 実際の行ごとの処理本体。
   *
   * - ＜補正の示唆＞／＜ファミリー文献情報＞の開始を検出して
   *   inSuggestion / inFamilyInfo フラグを切り替え
   * - inSuggestion 中の番号行は convertSuggestionNumberLineToFullWidth() で整形
   * - inFamilyInfo 中の番号行／本文行は専用整形関数で処理
   * - 行頭に「この拒絶理由通知の内容に関するお問合せ…」を含む行を
   *   ブロックの終端とみなし、inSuggestion / inFamilyInfo を解除。
   *   もし inFamilyInfo → false に切り替わる場合は、その直前に空行を 1 行挿入。
   * - 上記いずれにも該当しない行は formatAmendmentNoteLine() に委譲。
   *
   * @param {string} _marker - 未使用（将来拡張用）
   * @param {string} tail    - 処理対象部分
   * @returns {string}
   */
  function formatAmendmentNoteTail(_marker, tail) {
    var lines = splitLines(tail);
    var outLines = [];

    var inSuggestion = false;   // ＜補正の示唆＞ ブロック内かどうか
    var inFamilyInfo = false;   // ＜ファミリー文献情報＞ ブロック内かどうか

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var headTrimmed = line.replace(/^[ \t\u3000]+/, "");

      // ------------------------------------
      // ブロック開始行の検出
      // （ASCII "<補正の示唆>" と全角 "＜補正の示唆＞" の両方を許容）
      // ------------------------------------
      if (
        headTrimmed.indexOf("<補正の示唆>") === 0 ||
        headTrimmed.indexOf("＜補正の示唆＞") === 0
      ) {
        inSuggestion = true;
        inFamilyInfo = false;
        outLines.push(formatAmendmentNoteLine(line));
        continue;
      }

      if (
        headTrimmed.indexOf("<ファミリー文献情報>") === 0 ||
        headTrimmed.indexOf("＜ファミリー文献情報＞") === 0
      ) {
        inSuggestion = false;
        inFamilyInfo = true;
        outLines.push(formatAmendmentNoteLine(line));
        continue;
      }

      // ------------------------------------
      // ブロック終端行の検出：
      // 「この拒絶理由通知の内容に関するお問合せ…」で始まる行
      // ------------------------------------
      if (/^この拒絶理由通知の内容に関するお問合せ/.test(headTrimmed)) {
        // ＜ファミリー文献情報＞ から抜ける場合は、その直前に空行を 1 行挿入
        if (inFamilyInfo) {
          inFamilyInfo = false;
          if (outLines.length > 0 && outLines[outLines.length - 1] !== "") {
            outLines.push(""); // 空行を挿入
          }
        } else {
          outLines.push(""); // 空行を挿入
        }
        // ＜補正の示唆＞ もここで終了
        inSuggestion = false;

        // この行自体は通常行として変換（インデントや数字整形のみ）
        outLines.push(formatAmendmentNoteLine(line));
        continue;
      }

      // ------------------------------------
      // ＜補正の示唆＞ ブロック内の "(数字)" 行を変換
      // ------------------------------------
      if (inSuggestion && isSuggestionNumberLine(line)) {
        outLines.push(convertSuggestionNumberLineToFullWidth(line));
        continue;
      }

      // ------------------------------------
      // ＜ファミリー文献情報＞ ブロック内の整形
      // ------------------------------------
      if (inFamilyInfo) {
        // ブロック内の空行は削除
        if (line.trim() === "") {
          continue;
        }

        if (isFamilyInfoHeadLine(line)) {
          // 「１.GこれKご」などの番号行
          outLines.push(convertFamilyInfoHeadLine(line));
          continue;
        } else if (isFamilyInfoBodyLine(line)) {
          // インデントつき本文行
          outLines.push(convertFamilyInfoBodyLine(line));
          continue;
        }
        // それ以外（想定外の行）は通常処理へフォールバック
      }

      // ------------------------------------
      // 上記いずれにも該当しない行は従来どおり行単位整形
      // ------------------------------------
      outLines.push(formatAmendmentNoteLine(line));
    }

    return joinLines(outLines);
  }

  // ============================================================
  // その他の後処理（記・引用文献等一覧など）
  // ============================================================


  // ----------------------------------------
  // グローバルへのエクスポート
  // ----------------------------------------
  root.formatAmendmentNote = {
    formatAmendmentNoteBlock: formatAmendmentNoteBlock,
  };
})(globalThis);
