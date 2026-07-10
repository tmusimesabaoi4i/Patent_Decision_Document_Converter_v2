// ファイル名: formatBoilerplate.js
//
// 文書共通の定型行（「記」／<引用文献等一覧>／<最後の拒絶理由通知とする理由>／
// SA WG・CT WG 行／区切りハイフン線など）を所定レイアウトへ置換し、
// 最後に残った < / > を全角化する汎用整形モジュール。
//
// 公開グローバル: root.formatBoilerplate
// 依存: root.textUtilsStd（splitLines / joinLines）

(function (root) {
  "use strict";

  // ============================================================
  // 依存（textUtilsStd）
  // ============================================================
  var textUtilsStd = root.textUtilsStd;
  if (!textUtilsStd) {
    // eslint-disable-next-line no-console
    console.warn("formatBoilerplate.js: root.textUtilsStd が見つかりません。textUtilsStd.js を先に読み込んでください。");
    return;
  }
  var splitLines = textUtilsStd.splitLines;
  var joinLines = textUtilsStd.joinLines;

  /**
   * 「取得先 <http:...>」で囲まれたURL部分だけをすべて小文字化して返す
   * - 文字列中に複数あっても全件処理（/g）
   * - 「取得先 < ... >」の外側は一切変更しない
   *
   * @param {string} str
   * @returns {string}
   */
  function lcKenshuSakiUrl(str) {
    if (typeof str !== "string" || str.length === 0) return str;

    // 「取得先 <」 + URL(http/https) + 「>」 を検出
    // front : 「取得先 <」側（空白含む）
    // __all  : マッチ全体
    // rear  : 「>」側（空白含む）
    const re = /(取得先\s*<)([\S]+)(>)/g;

    return str.replace(re, function (__all, front, url, rear) {
      // URL部分だけ小文字化して、元の文字列（front/rear）に戻す
      return front + url.toLowerCase() + rear;
    });
  }

  /**
   * その他（「記」や <引用文献等一覧> 等）の整形。
   *
   * - 行頭の空白（半角/全角）は無視してパターン判定する。
   * - 該当行は所定のレイアウトに置換。
   * - 最後に < / > を全角に変換する。
   */
  function convertForOther(text) {
    var lines = splitLines(lcKenshuSakiUrl(text));
    var outLines = lines.map(function (line) {
      var raw = String(line);
      // 行頭の空白を除いた版
      var headTrimmed = raw.replace(/^[ \u3000]+/, "");

      if (headTrimmed === "SA WG1-4、6") {
        return "　　　　　　　　　　　　　　　SA  WG1-4、6";
      }

      if (headTrimmed === "CT WG1、4") {
        return "　　　　　　　　　　　　　　　CT  WG1、4";
      }

      if (headTrimmed === "記 (引用文献等については引用文献等一覧参照)") {
        return "　　　　　記　　　（引用文献等については引用文献等一覧参照）";
      }

      if (headTrimmed === "記") {
        return "　　　　　　　　　　　　　　　　　記";
      }

      if (headTrimmed === "------------------------------------") {
        return "－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－";
      }

      if (headTrimmed === "<最後の拒絶理由通知とする理由>") {
        return "　　　　　　　　　　＜最後の拒絶理由通知とする理由＞";
      }

      if (headTrimmed === "<引用文献等一覧>") {
        return "　　　　　　　　　　　　　<引用文献等一覧>";
      }

      return raw;
    });

    // （句読点正規化のフックがここにあったが、恒等変換だったため削除）
    return joinLines(outLines)
      .replace(/[<>]/g, function (c) {
        return c === "<" ? "＜" : "＞";
      });
  }

  // ----------------------------------------
  // グローバルへのエクスポート
  // ----------------------------------------
  root.formatBoilerplate = {
    convertForOther: convertForOther,
  };
})(globalThis);
