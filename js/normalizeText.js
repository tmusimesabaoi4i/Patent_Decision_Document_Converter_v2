/**
 * normalizeText.js
 * ---------------------------------------------------------------------------
 * 特許文書の前処理（"normalize" フィルタチェーン）で使う整形関数をまとめたモジュール。
 *
 * ▼ 目的
 *   - 改行正規化・半角化・空行整理など、入力テキストの初期正規化に使う
 *     関数群を提供する。
 *
 * ▼ 公開するグローバル
 *   - root.normalizeText
 *       nl, hw, clean, rmBlank, squeeze, trim, gap, lead
 *
 * ▼ 依存
 *   - root.textPrimitives（nl / hw を委譲）
 * ---------------------------------------------------------------------------
 */

(function (root) {
  "use strict";

  // ========================================================================
  // 個別ユーティリティ関数
  // ========================================================================

  // 改行正規化 nl と半角化 hw は textPrimitives と実装が同一だったため委譲する。
  const textPrimitives = root.textPrimitives;
  if (!textPrimitives) {
    // eslint-disable-next-line no-console
    console.warn("normalizeText.js: root.textPrimitives が見つかりません。textPrimitives.js を先に読み込んでください。");
    return;
  }
  const nl = textPrimitives.nl;
  const hw = textPrimitives.hw;

  /**
   * 特殊文字・制御文字を除去する
   *
   * - 以下の文字は半角スペース " " に変換する:
   *     - タブ: \t (U+0009)
   *     - 垂直タブ: \v (U+000B)
   *     - 改ページ: \f (U+000C)
   * - 以下の文字は削除する:
   *     - ASCII 制御文字 (U+0000〜U+001F, U+007F) のうち、上記以外と改行以外。
   *     - Unicode カテゴリ Cc（制御文字）、Cf（書式制御文字）、Cs（サロゲート）、Co（私用領域）、Cn（未割り当て）。
   * - 改行 "\n" は保持する（行構造を維持するため）。
   * - 可視文字（日本語や一般的な Unicode 文字、記号など）はそのまま残す。
   * - 将来的にホワイトリスト方式へ拡張しやすいよう、1 文字ずつ走査して判定している。
   *
   * @param {string} str 入力文字列
   * @returns {string} 特殊文字が除去された文字列
   */
  function clean(str) {
    if (str == null || str === "") return "";
    const s = String(str);
    let out = "";
    for (const ch of s) {
      const code = ch.charCodeAt(0);

      // 改行は保持
      if (ch === "\n") {
        out += ch;
        continue;
      }

      // タブ / 垂直タブ / 改ページは半角スペースに変換
      if (ch === "\t" || ch === "\v" || ch === "\f") {
        out += " ";
        continue;
      }

      // ASCII 制御文字 (0x00〜0x1F, 0x7F) は削除
      if ((code >= 0x0000 && code <= 0x001f) || code === 0x007f) {
        continue;
      }

      // Unicode の特殊カテゴリを削除 (Cc, Cf, Cs, Co, Cn)
      if (/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}]/u.test(ch)) {
        continue;
      }

      // その他はそのまま出力
      out += ch;
    }
    return out;
  }

  /**
   * 空行（空白のみの行を含む）を削除する
   *
   * - 改行 "\n" で行分割し、次の条件を満たす行を「空行」とみなして削除する:
   *     - 行内の文字から半角・全角スペースおよびタブ類をすべて取り除いた結果、
   *       長さが 0 の行。
   * - "空白のみ" の行も空行として扱う（推奨設定）。
   * - 非空行同士は 1 本の "\n" で連結されるため、連続する空行は完全に消える。
   *
   * @param {string} str 入力文字列
   * @returns {string} 空行が削除された文字列
   */
  function rmBlank(str) {
    if (str == null || str === "") return "";
    const s = String(str);
    const lines = s.split("\n");
    const outLines = [];

    for (const line of lines) {
      // 半角・全角スペースとタブ類を削除して空かどうか判定
      const trimmed = line.replace(/[ \t\r\f\v\u3000]/g, "");
      if (trimmed.length === 0) {
        // 空行はスキップ
        continue;
      }
      outLines.push(line);
    }

    return outLines.join("\n");
  }

  /**
   * 連続する半角スペースを 1 つに圧縮する
   *
   * - "  "（半角スペース 2 個以上）の連続を、常に 1 個の半角スペース " " に置き換える。
   * - 改行やタブなど、スペース以外の文字は対象外。
   * - 頻繁に登場する余分なスペースのノイズを削減するのに有効。
   *
   * @param {string} str 入力文字列
   * @returns {string} 連続スペースが 1 つに圧縮された文字列
   */
  function squeeze(str) {
    if (str == null || str === "") return "";
    const s = String(str);
    // 半角スペース 2 個以上の連続を 1 個にまとめる
    return s.replace(/ {2,}/g, " ");
  }

  /**
   * 各行の先頭と末尾の半角空白を削除する
   *
   * - 入力文字列を行単位に分割し、それぞれの行の前後にある空白文字
   *   （半角スペース・タブなど）を取り除く。
   * - 改行コードは保持し、行ごとの内容だけをトリミングする。
   * - 全体の前後の空白削除ではなく、行単位で処理する。
   *
   * @param {string} str 入力文字列
   * @returns {string} 各行の前後の空白が削除された文字列
   */
  function trim(str) {
    if (str == null || str === "") return "";
    const s = String(str);
    return s
      .split("\n")
      .map(line => line.trim())
      .join("\n");
  }

  /**
   * 各コンテンツ行の間に「必ず 1 行の空行」を挿入する
   *
   * - 目的: 入力文字列の各行の後に、常に 1 行だけの空行を追加する。
   * - アルゴリズム概要:
   *     1. "\n" で行分割する。
   *     2. 各行をそのまま出力する。
   *     3. コンテンツ行の直後に必ず空行を 1 行追加する。
   *     4. 先頭および末尾の余分な空行は削除しない（仕様上、末尾にも空行が入る）。
   * - 結果として、入力が「行1\n行2」であれば「行1\n\n行2\n\n」となる。
   *
   * @param {string} str 入力文字列
   * @returns {string} 各行の後に 1 行の空行が挿入された文字列
   */
  function gap(str) {
    if (str == null || str === "") return "";
    const s = String(str);
    const lines = s.split("\n");
    const out = [];

    for (const line of lines) {
      out.push(line);
      out.push(""); // 各行の後に必ず空行を挿入
    }

    return out.join("\n");
  }

  /**
   * 先頭に改行を 1 つだけ挿入する
   *
   * - 文字列の先頭に必ず 1 つの "\n" が存在するようにする。
   * - 既に先頭が "\n" の場合は何もしない（重複させない）。
   * - 空文字列の場合は、そのまま空文字列を返す（"\n" は付与しない）。
   *   ※ 空入力に改行を付けるかどうかは運用に依存するため、ここでは付与しない実装。
   *
   * @param {string} str 入力文字列
   * @returns {string} 先頭に改行が 1 つだけ保証された文字列
   */
  function lead(str) {
    if (str == null || str === "") return "";
    const s = String(str);
    if (s[0] === "\n") return s;
    return "\n" + s;
  }

  // ========================================================================
  // グローバルへの公開
  // ========================================================================

  /**
   * ブラウザ環境（ローカル HTML）専用想定:
   * - root は globalThis（≒ window）であり、TextUtils を直にぶら下げる。
   * - 他のスクリプトからは TextUtils.nl(...) などとして利用できる。
   */
  root.normalizeText = {
    nl: nl,
    hw: hw,
    clean: clean,
    rmBlank: rmBlank,
    squeeze: squeeze,
    trim: trim,
    gap: gap,
    lead: lead
  };
})(globalThis);
