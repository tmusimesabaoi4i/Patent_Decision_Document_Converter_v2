/**
 * modeFunctionLists.js
 * --------------------------------------------------------------------------
 * README（モード別変換関数リストの追加・編集方法）
 *
 * ▼ 役割
 *   - 各モードに対する「変換関数のリスト（パイプライン）」を定義するファイルです。
 *   - 1 つのモードに対して、複数の関数を順番に適用する構成を想定しています。
 *
 * ▼ データ構造
 *   - ModeFunctionLists は「モードキー → ハンドラ配列」のオブジェクトです。
 *       { modeKey: [ (text) => string | Promise<string> ], ... }
 *   - 各ハンドラは makeChainModeHandler(label, names) で生成されます。
 *     生成されたハンドラは runTextChains を使って複数のフィルタチェーンを順に実行します。
 *   - 値は「1 要素のハンドラ配列」です（消費側 app.js がこの配列からパイプラインを組み立てます）。
 *
 * ▼ キーの決まり
 *   - モードキー（オブジェクトのキー）は HTML ラジオボタンの value と一致させてください。
 *
 * ▼ ハンドラの契約
 *   - 各ハンドラは「文字列を受け取り、string または Promise<string> を返す関数」です。
 *   - root.runTextChains が無い環境では何もせず、そのまま入力を返します（従来挙動を維持）。
 *
 * ▼ 実行するチェーンを増やしたい場合
 *   - makeChainModeHandler の第 2 引数（names 配列）にチェーン名を追加してください。
 *     チェーン名は TextFilterRegistry に登録された名前です。
 *
 * ▼ App との連携（ローカル HTML 前提）
 *   1. main.html で app.js より先に modeFunctionLists.js を読み込む。
 *        <script src="js/modeFunctionLists.js"></script>
 *        <script src="js/app.js"></script>
 *   2. modeFunctionLists.js はグローバル（root）に ModeFunctionLists を公開する。
 *   3. app.js 内の App.init() が起動時に ModeFunctionLists を自動登録する。
 *
 * ▼ 注意
 *   - 本ファイルはローカルでブラウザから直接開いて使うことを前提とし、
 *     モジュールシステム（CommonJS / ES Modules）は考慮していない。
 * --------------------------------------------------------------------------
 */

(function (root) {
  "use strict";

  /**
   * chain 名リストを順に実行するモードハンドラを生成する。
   * - runTextChains 未定義時は入力をそのまま返す（従来挙動を維持）。
   * - エラー時はログを出して元のテキストを返し、UI を壊さない。
   *
   * @param {string} label エラーログに使うモード名
   * @param {string[]} names 実行するフィルタリスト名（TextFilterRegistry 登録名）
   * @returns {(text: string) => string | Promise<string>}
   */
  function makeChainModeHandler(label, names) {
    return function (text) {
      if (typeof root.runTextChains !== "function") {
        return text;
      }
      return root
        .runTextChains(names, text, /* invokeArgs */ undefined, { stopOnError: true })
        .catch(function (err) {
          if (typeof console !== "undefined" && console.error) {
            console.error("[" + label + "] runTextChains 実行中にエラー:", err);
          }
          return text;
        });
    };
  }

  /**
   * モード別変換関数リスト
   * - キー: モードキー（HTML ラジオボタンの value と一致させる）
   * - 値:  (text: string) => string | Promise<string> のハンドラ配列（makeChainModeHandler 生成）
   */
  const ModeFunctionLists = Object.freeze({
    // Office Action: 通常の拒絶理由通知
    officeAction: [makeChainModeHandler("officeAction", ["init", "main", "stripBlankLines", "convertEnd"])],
    // Final Office Action: 最後の拒絶理由通知 / Final Rejection
    finalOfficeAction: [makeChainModeHandler("finalOfficeAction", ["init", "main", "stripBlankLines", "finalAction"])],
    // Amendment Refused / Amendment Not Entered: 補正却下
    amendmentRefused: [makeChainModeHandler("amendmentRefused", ["init", "main", "stripBlankLines", "convertEnd"])],
    // Pre-examination Report / Report to Director: 前置報告
    preExaminationReport: [makeChainModeHandler("preExaminationReport", ["init", "main", "stripBlankLines", "convertEnd"])],
    // PCT: 国際出願
    pct: [makeChainModeHandler("pct", ["init", "main"])],
    // PCT (EN): 原文が主に英語の国際出願
    pct_eng: [makeChainModeHandler("pct_eng", ["init", "main"])],
    // 段落抽出・整形（EN）
    paragraph: [makeChainModeHandler("paragraph", ["parExtract"])],
    // HTML 変換
    html: [makeChainModeHandler("HTML", ["tohtml"])]
  });

  // ------------------------------------------------------------------------
  // グローバル公開（ローカル HTML 前提）
  // ------------------------------------------------------------------------

  /**
   * - 本ファイルは root（globalThis）に ModeFunctionLists をぶら下げるだけ。
   * - ほかのスクリプトからは:
   *     ModeFunctionLists.officeAction
   *   のようにアクセスして利用する。
   */
  root.ModeFunctionLists = ModeFunctionLists;

})(globalThis);
