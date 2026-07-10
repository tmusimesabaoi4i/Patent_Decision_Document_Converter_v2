(function (root) {
  "use strict";

  /**
   * textUtilsMain.js
   * ------------------------------------------------------------------------
   * 特許文書向けテキスト整形ユーティリティ（拡張性重視・過剰変換抑制版）。
   *
   * ▼ 役割
   *   - 見出し・箇条書き・条文番号などを対象とした整形／全角化処理を提供する。
   *   - 過剰変換を避けるため、技術用語トークン（IEEE802.11 / WPA-PSK 等）は
   *     保護したうえで変換する。
   *
   * ▼ 公開するグローバル
   *   - root.textUtilsMain
   *       padHead, trimHead, tightBelowBullet, fwHead,
   *       fwNumLaw, fwRefLaw, alphaCase, tightClaims
   *
   * ▼ 依存
   *   - root.textUtilsStd（joinLines / splitLines / fwNum / fwAlnum / fw / escapeRegExp ほか）
   * ------------------------------------------------------------------------
   */

  // ======================================================================
  // 依存（textUtilsStd）
  // ======================================================================

  var textUtilsStd = root.textUtilsStd || null;
  if (!textUtilsStd) {
    // eslint-disable-next-line no-console
    console.warn("textUtilsMain.js: root.textUtilsStd が見つかりません。textUtilsStd を先に読み込んでください。");
    return;
  }

  var joinLines = textUtilsStd.joinLines;
  var splitLines = textUtilsStd.splitLines;
  var fwNum = textUtilsStd.fwNum;     // 数字のみ全角化
  var fwAlnum = textUtilsStd.fwAlnum; // 英数字を全角化
  var escapeRegExp = textUtilsStd.escapeRegExp; // 正規表現メタ文字のエスケープ

  // ======================================================================
  // 内部ユーティリティ
  // ======================================================================

  /**
   * 空行判定：空白類のみなら空行
   * @param {string} line
   * @returns {boolean}
   */
  // intentionally local: textUtilsStd.isBlankLine とは挙動が異なる（\n も空白類に含み、String() 変換を伴う）
  function isBlankLine(line) {
    return /^[ \t\r\n\f\v\u3000]*$/.test(String(line || ""));
  }

  /**
   * すべての空白文字（半角/全角スペース、タブ、改行等）を削除
   * @param {string} s
   * @returns {string}
   */
  function removeWS(s) {
    return String(s || "").replace(/[ \u3000\t\r\n\v\f]+/g, "");
  }

  /**
   * padLeftZero（左ゼロ詰め）
   * - ゼロは半角 "0" を使用（後段で fwNum する運用が多く、ここで全角にしない）
   * @param {number|string} y
   * @param {number} n
   * @returns {string}
   */
  function padLeftZero(y, n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n <= 0) return String(y);

    var s = String(y);
    var sign = "";
    if (s.charAt(0) === "-" || s.charAt(0) === "+") {
      sign = s.charAt(0);
      s = s.slice(1);
    }
    if (s.length >= n) return sign + s;

    if (typeof String.prototype.padStart === "function") {
      return sign + s.padStart(n, "　");
    }
    var zeros = new Array(n - s.length + 1).join("　");
    return sign + zeros + s;
  }

  /**
   * 正規表現用エスケープ
   * @param {string} s
   * @returns {string}
   */
  // intentionally local: textUtilsStd.escapeRegExp とは挙動が異なる（- と / も追加でエスケープする）
  function escapeForRegExp(s) {
    return String(s || "").replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  /**
   * RegExp.flags が無い環境向け：フラグ文字列を復元
   * @param {RegExp} re
   * @returns {string}
   */
  function getRegExpFlags(re) {
    if (re.flags != null) return re.flags;
    var f = "";
    if (re.global) f += "g";
    if (re.ignoreCase) f += "i";
    if (re.multiline) f += "m";
    if (re.unicode) f += "u";
    if (re.sticky) f += "y";
    if (re.dotAll) f += "s";
    return f;
  }

  /**
   * 「必ず global で置換したい」用途のため、g フラグを強制付与して複製
   * @param {RegExp} re
   * @returns {RegExp}
   */
  function ensureGlobal(re) {
    var flags = getRegExpFlags(re);
    if (flags.indexOf("g") === -1) flags += "g";
    return new RegExp(re.source, flags);
  }

  // ======================================================================
  // 過剰変換防止：技術用語トークン保護
  // ======================================================================

  /**
   * 変換から除外したい “技術用語トークン” の既定セット
   * - 追加したい場合は root.textUtilsMainConfig.keepTechReList で拡張できる。
   * @type {RegExp[]}
   */
  var DEFAULT_KEEP_TECH_RE_LIST = [
    /IEEE\s*802\.\d+(?:\.\d+)*(?:[a-z])?/gi,
    /\b802\.\d+(?:\.\d+)*(?:[a-z])?\b/gi,
    /\bWPA(?:\d+)?-PSK\b/gi,
    /\b[A-Z]{2,}(?:[0-9]{0,3})?(?:[-\/][A-Z0-9]{2,})+\b/g,
    /\bWi-?Fi\b/gi
  ];

  /**
   * 正規表現リストに一致する箇所を番兵に置換して保護
   * @param {string} text
   * @param {RegExp[]} reList
   * @returns {{ text: string, map: string[] }}
   */
  function protectByRegexList(text, reList) {
    var out = String(text || "");
    var map = [];

    for (var i = 0; i < reList.length; i++) {
      var re = ensureGlobal(reList[i]);
      out = out.replace(re, function (m) {
        var idx = map.length;
        map.push(m);
        // Private Use Area を番兵として使用（通常入力に現れにくい）
        return "\uE000" + idx + "\uE001";
      });
    }
    return { text: out, map: map };
  }

  /**
   * 番兵を元に戻す
   * @param {string} text
   * @param {string[]} map
   * @returns {string}
   */
  function restoreProtected(text, map) {
    return String(text || "").replace(/\uE000(\d+)\uE001/g, function (_m, n) {
      var idx = Number(n);
      return map && map[idx] != null ? map[idx] : _m;
    });
  }

  /**
   * 技術トークン保護付きで変換関数を適用
   * @param {string} text
   * @param {(s:string)=>string} fn
   * @param {RegExp[]} keepList
   * @returns {string}
   */
  function applyWithTechProtection(text, fn, keepList) {
    var p = protectByRegexList(text, keepList);
    var changed = fn(p.text);
    return restoreProtected(changed, p.map);
  }

  // ======================================================================
  // 設定（拡張ポイント）
  // ======================================================================

  /**
   * 呼び出し側で拡張できる設定
   * 例）
   *   root.textUtilsMainConfig = {
   *     dotMarks: ["・","●",...],
   *     heading: { maxDigits: 2, maxDepth: 3, alphaMax: 2 },
   *     keepTechReList: [ /.../g, ... ]
   *   };
   */
  var CFG = root.textUtilsMainConfig || {};

  // ======================================================================
  // 箇条書き・見出し判定（RegExp ビルダー方式）
  // ======================================================================

  /**
   * ドット箇条書き候補
   * @type {string[]}
   */
  var DOT_MARKS = Array.isArray(CFG.dotMarks) && CFG.dotMarks.length
    ? CFG.dotMarks.slice()
    : ["・", "●", "○", "◆", "◇", "■", "□"];


    
  /**
   * tightBelowBullet 用に “形状で扱う” 記号
   * @type {string[]}
   */
  var DASH_AND_ANGLE_MARKS = ["-", "<"];

  /**
   * 見出しマーク用 RegExp を生成する（拡張性重視）
   *
   * - JS には /x が無いので「読みやすい複数行リテラル」を使わない。
   * - パターン要素を parts[] に積み、最後に join("|") して RegExp を作る。
   *
   * @param {{maxDigits?:number, maxDepth?:number, alphaMax?:number}} opts
   * @returns {RegExp} ^([空白])([見出しマーク])
   */
  function buildHeadingMarkRe(opts) {
    opts = opts || {};
    var maxDigits = Number(opts.maxDigits);
    var maxDepth = Number(opts.maxDepth);
    var alphaMax = Number(opts.alphaMax);

    // デフォルト（実務での誤爆を避ける安全側）
    if (!isFinite(maxDigits) || maxDigits <= 0) maxDigits = 2; // 1〜2桁
    if (!isFinite(maxDepth) || maxDepth < 0) maxDepth = 3;    // 1.2.3 くらいまで
    if (!isFinite(alphaMax) || alphaMax <= 0) alphaMax = 2;    // A / AB 程度

    // 過度に広げると誤爆しやすいので上限を設ける（保守しやすさ）
    if (maxDigits > 4) maxDigits = 4;
    if (maxDepth > 6) maxDepth = 6;
    if (alphaMax > 4) alphaMax = 4;

    var SP0 = "[ \\u3000]*";
    var NUM = "[0-9０-９]";
    var ALPHA = "[A-Za-zＡ-Ｚａ-ｚ]";
    var OPEN_P = "[\\(\\（]";
    var CLOSE_P = "[\\)\\）]";
    var DOT = "[\\.．]";
    var CLOSE_ONLY = "[\\)\\）]";

    // “番号チェーン” (例: 8 / 8.2 / 8.2.3)
    var seg = NUM + "{1," + maxDigits + "}";
    var chain = seg + "(?:" + DOT + seg + "){0," + maxDepth + "}";

    // 数字が単独で来るケースは “後続が区切り” のときだけ拾う（誤爆抑制）
    var delimAfterNum = "(?:[\\s\\u3000]|$|[、,，．。\\.：:;；\\)\\）])";

    // 「第1」系は “後続がそれっぽい語” のときだけ拾う
    var suffixAfterDai = "(?:[\\s\\u3000]|$|[、,，．。\\.：:;；]|[章節条項号編部款頁回図表])";

    var parts = [];

    // (1) (1) / （１）
    parts.push(OPEN_P + seg + CLOSE_P);

    // (2) (A) / （AB）
    parts.push(OPEN_P + ALPHA + "{1," + alphaMax + "}" + CLOSE_P);

    // (3) 1. / 1.2. / 1.2.3.
    parts.push(chain + DOT);

    // (4) 1) / 2） など
    parts.push(seg + CLOSE_ONLY);

    // (5) A. / AB.
    parts.push(ALPHA + "{1," + alphaMax + "}" + DOT);

    // (6) A) / AB）
    parts.push(ALPHA + "{1," + alphaMax + "}" + CLOSE_ONLY);

    // (7) 1 / 1.2.3（ただし後続が区切りのとき）
    parts.push(chain + "(?=" + delimAfterNum + ")");

    // (8) 第1（ただし後続が章/節/条等に続く “らしい” とき）
    parts.push("第" + seg + "(?=" + suffixAfterDai + ")");

    var inner = "(?:" + parts.join("|") + ")";

    // キャプチャ方針：
    //  m[1] = 行頭空白（半角/全角）
    //  m[2] = 見出しマーク本体
    return new RegExp("^(" + SP0 + ")(" + inner + ")");
  }

  /**
   * DOT_MARKS から “行頭ドット箇条書き” 判定用 RegExp を生成
   * @param {string[]} marks
   * @returns {RegExp}
   */
  function buildDotBulletRe(marks) {
    var cls = (marks || []).map(escapeForRegExp).join("");
    return new RegExp("^[ \\u3000]*([" + cls + "])");
  }

  // 見出しマーク判定（拡張可能）
  var HEADING_MARK_RE = buildHeadingMarkRe(CFG.heading || {});

  // tightBelowBullet 用（● を除外したい運用がある場合の互換）
  var DOT_MARKS_FOR_TIGHT = DOT_MARKS.filter(function (ch) { return ch !== "●"; });
  var DOT_BULLET_RE_FOR_TIGHT = buildDotBulletRe(DOT_MARKS_FOR_TIGHT);

  // - / < の行頭判定
  var DASH_ANGLE_RE = new RegExp("^[ \\u3000]*([" + DASH_AND_ANGLE_MARKS.map(escapeForRegExp).join("") + "])");

  // 技術トークン保護リスト（設定で追加可能）
  var KEEP_TECH_RE_LIST = (function () {
    var extra = Array.isArray(CFG.keepTechReList) ? CFG.keepTechReList : [];
    return DEFAULT_KEEP_TECH_RE_LIST.concat(extra);
  })();

  // ======================================================================
  // 1. 空白挿入（先頭）
  // ======================================================================

  /**
   * 行頭に “全角スペース” を count 個挿入
   * @param {string} str
   * @param {number} [count=1]
   * @returns {string}
   */
  function padHead(str, count) {
    var lines = splitLines(String(str || ""));
    var c = typeof count === "number" && count > 0 ? count : 1;
    var pad = new Array(c + 1).join("　");
    for (var i = 0; i < lines.length; i++) {
      if (lines[i] === "") continue;
      lines[i] = pad + lines[i];
    }
    return joinLines(lines);
  }

  // ======================================================================
  // 2. 空白削除（条件付き）
  // ======================================================================

  /**
   * 行頭空白を条件付きで削除
   * @param {string} str
   * @param {string|string[]} [mode] 未指定なら ["dot","head","lt"]
   * @returns {string}
   */
  function trimHead(str, mode) {
    var lines = splitLines(String(str || ""));
    var modes;

    if (mode == null) {
      modes = ["dot", "head", "lt"];
    } else if (Array.isArray(mode)) {
      modes = mode.slice();
    } else {
      modes = [mode];
    }

    var useAll = modes.indexOf("all") !== -1;
    var useDot = modes.indexOf("dot") !== -1;
    var useHead = modes.indexOf("head") !== -1;
    var useLt = modes.indexOf("lt") !== -1;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (useAll) {
        lines[i] = line.replace(/^[ \t\u3000]+/, "");
        continue;
      }

      var trimmed = line;

      if (useDot && /^[ \u3000]/.test(trimmed)) {
        for (var d = 0; d < DOT_MARKS.length; d++) {
          var mark = DOT_MARKS[d];
          if (trimmed.indexOf(" " + mark) === 0 || trimmed.indexOf("　" + mark) === 0) {
            trimmed = trimmed.slice(1);
            break;
          }
        }
      }

      if (useHead && /^[ \u3000]/.test(trimmed) && HEADING_MARK_RE.test(trimmed.slice(1))) {
        trimmed = trimmed.slice(1);
      }

      if (useLt && (trimmed.indexOf(" <") === 0 || trimmed.indexOf("　<") === 0)) {
        trimmed = trimmed.slice(1);
      }
      if (useLt && (trimmed.indexOf(" -") === 0 || trimmed.indexOf("　-") === 0)) {
        trimmed = trimmed.slice(1);
      }

      lines[i] = trimmed;
    }

    return joinLines(lines);
  }

  // ======================================================================
  // 10. 箇条書き直下の空行削除
  // ======================================================================

  /**
   * 箇条書き行の直下が空行なら、その空行を1行だけ削除
   * @param {string} str
   * @param {"dot"|"head"|"both"} [mode="both"]
   * @returns {string}
   */
  function tightBelowBullet(str, mode) {
    var lines = splitLines(String(str || ""));
    var n = lines.length;
    var m = mode || "both";
    var useDot = m === "both" || m === "dot";
    var useHead = m === "both" || m === "head";

    var out = [];
    var i = 0;

    while (i < n) {
      var line = lines[i];
      out.push(line);

      var isDotBullet = useDot && DOT_BULLET_RE_FOR_TIGHT.test(line);
      var isHeadBullet = useHead && HEADING_MARK_RE.test(line);
      var isDashOrAngle = DASH_ANGLE_RE.test(line);

      if ((isDotBullet || isHeadBullet || isDashOrAngle) && i + 1 < n) {
        if (isBlankLine(lines[i + 1])) {
          i += 2;
          continue;
        }
      }
      i += 1;
    }

    return joinLines(out);
  }

  // ======================================================================
  // 3. 全角化（条件付き）
  // ======================================================================

  /**
   * 見出し・箇条書き条件に応じて全角化
   *
   * 重要：
   * - デフォルトは "head"（見出しマークのみ変換）
   * - "dot"/"both" で行全体 fw() をする場合でも、技術トークンは保護して戻す
   *
   * @param {string} str
   * @param {"head"|"dot"|"both"} [mode="head"]
   * @returns {string}
   */
  function fwHead(str) {
    var lines = splitLines(String(str || ""));
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line === "") continue;
        var mh = HEADING_MARK_RE.exec(line);
        if (mh) {
          var pre = mh[1];
          var mark = mh[2];
          var after = line.slice(pre.length + mark.length);
          lines[i] = pre + fwAlnum(mark) + after;
        }
    }

    return fwLineStartsWithSmallDot(fwLineStartsWithBlackDot(joinLines(lines)));
  }

  /**
   * 行頭が「●」で始まる行だけを全角化する
   * - 「文頭」とは「文字列先頭」または「改行 \n の直後」を指す（= 行の先頭 ^）。
   * - 行頭に空白がある「　●...」「 ●...」は対象外（※必要なら後で拡張可能）。
   * - 変換は textUtilsStd.fw（文字列全体を全角化する関数）に委譲する想定。
   *
   * @param {string} str 入力文字列
   * @returns {string} 「●」行のみ全角化された文字列
   */
  function fwLineStartsWithBlackDot(str) {
    var s = String(str || "");
    var fw = root.textUtilsStd && root.textUtilsStd.fw ? root.textUtilsStd.fw : null;
    var splitLines = root.textUtilsStd && root.textUtilsStd.splitLines ? root.textUtilsStd.splitLines : null;
    var joinLines = root.textUtilsStd && root.textUtilsStd.joinLines ? root.textUtilsStd.joinLines : null;

    if (!fw || !splitLines || !joinLines) {
      // textUtilsStd が無い場合は安全側でそのまま返す
      return s;
    }

    var lines = splitLines(s);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line && line.charAt(0) === "●") {
        lines[i] = fw(line);
      }
    }
    return joinLines(lines);
  }
  function fwLineStartsWithSmallDot(str) {
    var s = String(str || "");
    var fw = root.textUtilsStd && root.textUtilsStd.fw ? root.textUtilsStd.fw : null;
    var splitLines = root.textUtilsStd && root.textUtilsStd.splitLines ? root.textUtilsStd.splitLines : null;
    var joinLines = root.textUtilsStd && root.textUtilsStd.joinLines ? root.textUtilsStd.joinLines : null;

    if (!fw || !splitLines || !joinLines) {
      // textUtilsStd が無い場合は安全側でそのまま返す
      return s;
    }

    var lines = splitLines(s);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line && line.charAt(0) === "・") {
        lines[i] = fw(line);
      }
    }
    return joinLines(lines);
  }

  // ======================================================================
  // 5. 番号全角化（条文番号など）
  // ======================================================================

  /**
   * 条文系番号を全角化（過剰変換抑制）
   * @param {string} str
   * @returns {string}
   */
  function fwNumLaw(str) {
    var s = String(str || "");
    var DIGS_WS = "[0-9０-９\\s\\u3000]+";

    // 第◯条の◯第◯項第◯号
    s = s.replace(new RegExp("第(" + DIGS_WS + ")条の(" + DIGS_WS + ")第(" + DIGS_WS + ")項第(" + DIGS_WS + ")号", "g"),
      function (_all, j, n, k, g) {
        j = removeWS(j); n = removeWS(n); k = removeWS(k); g = removeWS(g);
        return "第" + fwNum(j) + "条の" + fwNum(n) + "第" + fwNum(k) + "項第" + fwNum(g) + "号";
      }
    );

    // 第◯条の◯第◯項
    s = s.replace(new RegExp("第(" + DIGS_WS + ")条の(" + DIGS_WS + ")第(" + DIGS_WS + ")項", "g"),
      function (_all, j, n, k) {
        j = removeWS(j); n = removeWS(n); k = removeWS(k);
        return "第" + fwNum(j) + "条の" + fwNum(n) + "第" + fwNum(k) + "項";
      }
    );

    // 第◯条の◯
    s = s.replace(new RegExp("第(" + DIGS_WS + ")条の(" + DIGS_WS + ")", "g"),
      function (_all, j, n) {
        j = removeWS(j); n = removeWS(n);
        return "第" + fwNum(j) + "条の" + fwNum(n);
      }
    );

    // 第◯条第◯項第◯号
    s = s.replace(new RegExp("第(" + DIGS_WS + ")条第(" + DIGS_WS + ")項第(" + DIGS_WS + ")号", "g"),
      function (_all, j, k, g) {
        j = removeWS(j); k = removeWS(k); g = removeWS(g);
        return "第" + fwNum(j) + "条第" + fwNum(k) + "項第" + fwNum(g) + "号";
      }
    );

    // 第◯条第◯項
    s = s.replace(new RegExp("第(" + DIGS_WS + ")条第(" + DIGS_WS + ")項", "g"),
      function (_all, j, k) {
        j = removeWS(j); k = removeWS(k);
        return "第" + fwNum(j) + "条第" + fwNum(k) + "項";
      }
    );

    // PCT第◯条（出力は ＰＣＴ に統一）
    s = s.replace(new RegExp("(?:PCT|ＰＣＴ)第(" + DIGS_WS + ")条", "g"),
      function (_all, j) {
        j = removeWS(j);
        return "ＰＣＴ第" + fwNum(j) + "条";
      }
    );

    // 第◯条
    s = s.replace(new RegExp("第(" + DIGS_WS + ")条", "g"),
      function (_all, j) {
        j = removeWS(j);
        return "第" + fwNum(j) + "条";
      }
    );

    // 特許法施行規則様式第◯備考◯、◯
    s = s.replace(/特許法施行規則様式第([0-9０-９\s\u3000]+)備考([0-9０-９\s\u3000、,，]+)/g,
      function (_all, j, n) {
        j = removeWS(j); n = removeWS(n);
        return "特許法施行規則様式第" + fwNum(j) + "備考" + fwNum(n);
      }
    );

    // 第◯節/頁/章（英数字）
    s = s.replace(/第([0-9０-９A-Za-zＡ-Ｚａ-ｚ\.．\s\u3000]+)(節|頁|章|段落|行目)/g,
      function (_all, j, suffix) {
        j = removeWS(j);
        return "第" + fwAlnum(j) + suffix;
      }
    );

    // JPGL第◯部
    s = s.replace(/(?:JPGL|ＪＰＧＬ)第([0-9０-９A-Za-zＡ-Ｚａ-ｚ\.．\s\u3000]+)(部)/g,
      function (_all, j, suffix) {
        j = removeWS(j);
        return "ＪＰＧＬ第" + fwAlnum(j) + suffix;
      }
    );

    // 令和YY年MM月DD日
    s = s.replace(/令和([0-9０-９\s\u3000]+)年([0-9０-９\s\u3000]+)月([0-9０-９\s\u3000]+)日/g,
      function (_all, y, m, d) {
        y = padLeftZero(removeWS(y).trim(), 2);
        m = padLeftZero(removeWS(m).trim(), 2);
        d = padLeftZero(removeWS(d).trim(), 2);
        return "令和" + fwNum(y) + "年" + fwNum(m) + "月" + fwNum(d) + "日";
      }
    );

    // 平成YY年MM月DD日
    s = s.replace(/平成([0-9０-９\s\u3000]+)年([0-9０-９\s\u3000]+)月([0-9０-９\s\u3000]+)日/g,
      function (_all, y, m, d) {
        y = padLeftZero(removeWS(y).trim(), 2);
        m = padLeftZero(removeWS(m).trim(), 2);
        d = padLeftZero(removeWS(d).trim(), 2);
        return "平成" + fwNum(y) + "年" + fwNum(m) + "月" + fwNum(d) + "日";
      }
    );

    s = repKW(s,["引用文献", "文献", "相違点", "主張", "理由","構成"],
      kw("[0-9]+","","","[、]|[-]|及び|又は"),fwAlnum);

    s = repKW(s,["請求項", "前記", "上記", "記載"],
      kw("[0-9]+","\\(","\\)","[、]|[-]|[\\(\\)]|及び|又は"),fwAlnum);

    s = repKW(s,["claims", "claim"],
      kw("[0-9]+","\\(","\\)","[,]|[、]|[-]|[\\(\\)]|及び|又は"),fwAlnum);

    s = repKW(s,["段落"],
      kw("[0-9]+","\\[","\\]","[、]|[-]|[\\[\\]]|及び|又は"),fwAlnum);

    s = repKW(s,["paragraphs", "paragraph"],
      kw("[0-9]+","\\[","\\]","[,]|[、]|[-]|[\\[\\]]|及び|又は"),fwAlnum);

    s = repKW(s,["図"],
      kw("[0-9a-zA-z]+","","","[、]|[-]|及び|又は"),fwAlnum);

    s = repKW(s,["fig."],
      kw("[0-9a-zA-z]+","","","[,]|[、]|[-]|及び|又は"),fwAlnum);

    s = repKW(s,["式"],
      kw("[0-9a-zA-z]+","\\(","\\)","[、]|[-]|[\\(\\)]|及び|又は"),fwAlnum);
    return s;
  }

    /**
   * 「STAR_WORD + KEYWORD」のうち、KEYWORD 部分だけを f で変換して置換する。
   *
   * 例: "引用文献1-3" の "1-3" だけを変換したい、など。
   *
   * @param {string} str                  入力テキスト
   * @param {string|string[]} stars       STAR_WORD（例: "引用文献" / ["引用文献","段落"]）
   * @param {string|RegExp} kwPattern     KEYWORD のパターン（RegExp でも source 文字列でもOK）
   *                                     例: "[0-9０-９、,\\-－及び又は]+"
   * 数字列（全角/半角）を、「、」「,」「-」「－」「及び」「又は」で連結したものvar KEYWORD = String.raw`(?:[0-9０-９]+(?:[ \t\u3000]*(?:[、,]|[\-－]|及び|又は)[ \t\u3000]*[0-9０-９]+)*)`;
   * @param {(kwd:string, star:string, all:string)=>string} f
   *                                     KEYWORD部分(kwd)に適用する関数
   * @returns {string}
   */
  function repKW(str, stars, kwPattern, f) {
    str = String(str ?? "");

    // STAR_WORD を配列化
    var starList = Array.isArray(stars) ? stars : [stars];
    starList = starList.filter(function (s) { return s != null && String(s) !== ""; });
    if (!starList.length) return str;

    // kwPattern を source 文字列化（/.../ ではなく source を想定）
    var kwSrc = (kwPattern instanceof RegExp) ? kwPattern.source : String(kwPattern ?? "");
    if (!kwSrc) return str;

    // STAR_WORD を正規表現化（長い語を優先して誤マッチを減らす）
    var starSrc = starList
      .map(function (s) { return escapeRegExp(String(s)); })
      .sort(function (a, b) { return b.length - a.length; })
      .join("|");

    // STAR_WORD の直後の空白は任意（半角/タブ/全角スペース）
    var re = new RegExp("(" + starSrc + ")([ \\t\\u3000]*)(" + kwSrc + ")", "g");

    var fn = (typeof f === "function") ? f : function (x) { return x; };

    // _all / star / between / kwd で受けて、kwd だけ変換して戻す
    return str.replace(re, function (_all, star, between, kwd) {
      var kwd2 = fn(kwd, star, _all);
      return star + between + kwd2;
    });
  }

  /**
   * KEYWORD パターンを生成して返す（文字列）
   *
   * 例: １−３及び５ / （１）−３及び５ にマッチ
   *
   * @param {string} dig   [0-9] 相当（例: "[0-9０-９]" や "\\d" や "[0-9０-９]+" など）
   * @param {string} pL    "(" 相当（例: "[（(]" や "\\("）。"" の場合は括弧付き数字なし
   * @param {string} pR    ")" 相当（例: "[）)]" や "\\)"）。"" の場合は括弧付き数字なし
   * @param {string} sep   連結語/記号（例: "[、,]|及び|又は" など）
   * @returns {string} KEYWORD 用の正規表現 source
   */
  function kw(dig, pL, pR, sep) {
    dig = String(dig ?? "");
    pL  = String(pL  ?? "");
    pR  = String(pR  ?? "");
    sep = String(sep ?? "");

    if (!dig) return ""; // 最低限

    // dig に 1回以上の量指定が無いなら + を足す（例: "[0-9]" -> "[0-9]+", "\d" -> "\d+"）
    var DIG = addPlus(dig);

    // 括弧付き数字を使うか（どちらかが "" なら無効）
    var useParen = !!(pL && pR);

    // NUM: 通常数字 or 括弧付き数字
    var NUM = useParen
      ? String.raw`(?:${DIG}|(?:${pL}${DIG}${pR}))`
      : String.raw`(?:${DIG})`;

    // 許容するダッシュ（固定：必要ならここを外出ししてもOK）
    var DASH = String.raw`(?:-|－|−)`;

    // TERM: NUM または NUM−NUM
    var TERM = String.raw`(?:${NUM}(?:\s*${DASH}\s*${NUM})?)`;

    // 連結（sep は "A|B|C" を想定。こちらで (?:...) に包む）
    var SEP = sep ? String.raw`(?:${sep})` : String.raw`(?:[、,]|及び|又は)`;

    // KEYWORD
    return String.raw`(?:${TERM}(?:\s*${SEP}\s*${TERM})*)`;

    function addPlus(src) {
      src = String(src);
      // 末尾が量指定っぽいならそのまま（+,*,?,{...}）
      if (/[+*?]$/.test(src) || /\}\s*$/.test(src)) return src;
      return src + "+";
    }
  }


  // ======================================================================
  // 6. 引用箇所番号全角化（安全側：数字開始のみ）
  // ======================================================================

  /**
   * 図/表/式/段落の参照番号を全角化（安全側）
   * - 「特表(...)」は除外（従来互換）
   * - “数字開始” の参照列のみ対象（WPA-PSK 等の誤爆防止）
   * @param {string} str
   * @returns {string}
   */
  function fwRefLaw(str) {
    var s = String(str || "");

    var DIG = "[0-9０-９]";
    var ALPHA = "[A-Za-zＡ-Ｚａ-ｚ]";
    var TOKEN = "(?:[\\[\\【]?" + DIG + "+(?:" + ALPHA + "+)?[\\]\\】]?)";
    var SEP = "(?:[\\s\\u3000]*(?:及び|又は|[、,，]|[-‐-–—−]|[\\.．])[\\s\\u3000]*)";
    var TAIL = "(" + TOKEN + "(?:" + SEP + TOKEN + ")*)";

    // 表：直前が「特」なら “特表” なのでスキップ
    var reTable = new RegExp("(表)([\\s\\u3000:：]*?)" + TAIL, "g");
    s = s.replace(reTable, function (match, kw, sep2, tail, offset, whole) {
      if (offset > 0 && whole.charAt(offset - 1) === "特") return match;
      return kw + sep2 + fwAlnum(removeWS(tail));
    });

    return s;
  }

  // ======================================================================
  // 4. 英字大小（技術トークン保護あり）
  // ======================================================================

  /**
   * 英単語の先頭1文字のみ大文字化（ただし技術トークンは保護）
   * @param {string} str
   * @returns {string}
   */
  function alphaCase(str) {
    var s = String(str || "");

    return applyWithTechProtection(s, function (t) {
      return t.replace(/[a-zA-Z]+/g, function (word) {
        // 既に先頭が大文字なら変更しない（過剰な大小変換を避ける）
        var c0 = word.charAt(0);
        if (c0 >= "A" && c0 <= "Z") return word;
        return c0.toUpperCase() + word.slice(1);
      });
    }, KEEP_TECH_RE_LIST);
  }

  // ======================================================================
  // 8. 『』内の空白行削除
  // ======================================================================

  /**
   * 開始～終了マーカーに挟まれた範囲の空白行を削除（簡易）
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
            if (!isBlankLine(innerLines[k])) outLines.push(innerLines[k]);
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

  // ======================================================================
  // 公開
  // ======================================================================

  root.textUtilsMain = {
    // 空白系
    padHead: padHead,
    trimHead: trimHead,

    // 箇条書き直下の空行詰め
    tightBelowBullet: tightBelowBullet,

    // 全角化・番号処理
    fwHead: fwHead,
    fwNumLaw: fwNumLaw,
    fwRefLaw: fwRefLaw,

    // 大小変換（技術トークン保護あり）
    alphaCase: alphaCase,

    // 行構造
    tightClaims: tightClaims
  };
})(globalThis);
