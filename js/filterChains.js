/**
 * filterChains.js
 * --------------------------------------------------------------------------
 * 名前付きフィルタチェーン（normalize / formatBody / stripBlankLines / formatTail など）を
 * FilterRegistry インスタンスに登録し、グローバルから利用できるようにする
 * 設定用スクリプト。
 *
 * ▼ 依存（先に読み込まれている前提）
 *   - filterRegistry/filterRegistry.js（root.FilterRegistry）
 *   - normalizeText（root.normalizeText）
 *   - formatBody（root.formatBody）
 *   - stripBlankLines（root.stripBlankLines）
 *   - formatSearchResult（root.formatSearchResult）
 *   - formatAmendmentNote（root.formatAmendmentNote）
 *   - formatBoilerplate（root.formatBoilerplate）
 *   - paragraphExtraction（root.paragraphExtraction）
 *   - makeHtml（root.makeHtml）
 *
 * ▼ 公開されるもの
 *   - root.filterChains
 *       各種フィルタチェーンを登録済みの FilterRegistry インスタンス。
 *   - root.runTextChains(names, str, ...)
 *       複数のフィルタチェーンを順番に実行する汎用ヘルパ。
 *
 * ▼ "normalize" チェーンの実行順
 *   nl → hw → clean → rmBlank → squeeze → trim → gap → lead
 * --------------------------------------------------------------------------
 */

(function (root) {
  "use strict";

  // -------------------------------------------------------------------------
  // 依存オブジェクトの取得
  // -------------------------------------------------------------------------

  /** @type {typeof root.FilterRegistry} */
  var FilterRegistry = root.FilterRegistry;

  if (typeof FilterRegistry !== "function") {
    // FilterRegistry が見つからない場合は何もせず警告だけ出す
    // eslint-disable-next-line no-console
    console.warn("FilterRegistry が見つかりません。filterRegistry.js の読み込み順を確認してください。");
    return;
  }

  /**
   * normalizeText 側のユーティリティオブジェクトを取得
   * - normalizeText.js で root.normalizeText にエクスポートされている前提。
   */
  var Lib_NormalizeText = root.normalizeText || null;

  if (!Lib_NormalizeText) {
    // eslint-disable-next-line no-console
    console.warn("normalizeText が見つかりません。normalizeText.js の中でグローバル名を確認してください。");
    return;
  }

  // 必要なフィルタ関数を取り出す
  var nl = Lib_NormalizeText.nl;
  var hw = Lib_NormalizeText.hw;
  var lead = Lib_NormalizeText.lead;
  var clean = Lib_NormalizeText.clean;
  var rmBlank = Lib_NormalizeText.rmBlank;
  var squeeze = Lib_NormalizeText.squeeze;
  var trim = Lib_NormalizeText.trim;
  var gap = Lib_NormalizeText.gap;

  // どれか 1 つでも欠けている場合は警告を出して終了
  if (
    typeof nl !== "function" ||
    typeof hw !== "function" ||
    typeof clean !== "function" ||
    typeof rmBlank !== "function" ||
    typeof squeeze !== "function" ||
    typeof trim !== "function" ||
    typeof gap !== "function" ||
    typeof lead !== "function"
  ) {
    // eslint-disable-next-line no-console
    console.warn("nl, hw, lead, clean, rmBlank, squeeze, trim, gap のいずれかが定義されていません。normalizeText.js を確認してください。");
    return;
  }

  /**
   * formatBody 側のユーティリティオブジェクトを取得
   * - formatBody.js で root.formatBody にエクスポートされている前提。
   */
  var Lib_FormatBody = root.formatBody || null;

  if (!Lib_FormatBody) {
    // eslint-disable-next-line no-console
    console.warn("formatBody が見つかりません。formatBody.js の中でグローバル名を確認してください。");
    return;
  }

  // 必要なフィルタ関数を取り出す
  var padHead = Lib_FormatBody.padHead;
  var trimHead = Lib_FormatBody.trimHead;
  var tightBelowBullet = Lib_FormatBody.tightBelowBullet;
  var fwHead = Lib_FormatBody.fwHead;
  var fwNumLaw = Lib_FormatBody.fwNumLaw;
  var fwRefLaw = Lib_FormatBody.fwRefLaw;

  /**
   * stripBlankLines 側のユーティリティオブジェクトを取得
   * - stripBlankLines.js で root.stripBlankLines にエクスポートされている前提。
   */
  var Lib_StripBlankLines = root.stripBlankLines || null;

  if (!Lib_StripBlankLines) {
    // eslint-disable-next-line no-console
    console.warn("stripBlankLines が見つかりません。stripBlankLines.js の中でグローバル名を確認してください。");
    return;
  }

  // 必要なフィルタ関数を取り出す
  var stripBlankLinesInCorrectionNote = Lib_StripBlankLines.stripBlankLinesInCorrectionNote;
  var stripBlankLinesInSearchResult = Lib_StripBlankLines.stripBlankLinesInSearchResult;
  var stripBlankLinesInAppendix = Lib_StripBlankLines.stripBlankLinesInAppendix;
  var stripBlankLinesInPriority = Lib_StripBlankLines.stripBlankLinesInPriority;
  var stripBlankLinesInAmendmentSuggestion = Lib_StripBlankLines.stripBlankLinesInAmendmentSuggestion;
  var stripBlankLinesInAddedNewMatter = Lib_StripBlankLines.stripBlankLinesInAddedNewMatter;
  var stripBlankLinesInClaimsBlock = Lib_StripBlankLines.stripBlankLinesInClaimsBlock;

  // どれか 1 つでも欠けている場合は警告を出して終了
  if (
    typeof stripBlankLinesInCorrectionNote !== "function" ||
    typeof stripBlankLinesInSearchResult !== "function" ||
    typeof stripBlankLinesInAppendix !== "function" ||
    typeof stripBlankLinesInPriority !== "function" ||
    typeof stripBlankLinesInAmendmentSuggestion !== "function" ||
    typeof stripBlankLinesInAddedNewMatter !== "function"
  ) {
    // eslint-disable-next-line no-console
    console.warn("stripBlankLinesInCorrectionNote, stripBlankLinesInSearchResult, stripBlankLinesInAppendix, stripBlankLinesInPriority, stripBlankLinesInAmendmentSuggestion, stripBlankLinesInAddedNewMatter のいずれかが定義されていません。stripBlankLines.js を確認してください。");
    return;
  }

  /**
   * formatSearchResult 側のユーティリティオブジェクトを取得
   * - formatSearchResult.js で root.formatSearchResult にエクスポートされている前提。
   */
  var Lib_FormatSearchResult = root.formatSearchResult || null;

  if (!Lib_FormatSearchResult) {
    // eslint-disable-next-line no-console
    console.warn("formatSearchResult が見つかりません。formatSearchResult.js の中でグローバル名を確認してください。");
    return;
  }

  /**
   * formatAmendmentNote 側のユーティリティオブジェクトを取得
   * - formatAmendmentNote.js で root.formatAmendmentNote にエクスポートされている前提。
   */
  var Lib_FormatAmendmentNote = root.formatAmendmentNote || null;

  if (!Lib_FormatAmendmentNote) {
    // eslint-disable-next-line no-console
    console.warn("formatAmendmentNote が見つかりません。formatAmendmentNote.js の中でグローバル名を確認してください。");
    return;
  }

  // 必要なフィルタ関数を取り出す
  var formatSearchResultBlock = Lib_FormatSearchResult.formatSearchResultBlock;
  var formatFamilyInfoBlock = Lib_FormatSearchResult.formatFamilyInfoBlock;
  var formatAmendmentNoteBlock = Lib_FormatAmendmentNote.formatAmendmentNoteBlock;

  /**
   * formatBoilerplate（定型行整形）を取得
   */
  var Lib_FormatBoilerplate = root.formatBoilerplate || null;

  if (!Lib_FormatBoilerplate) {
    // eslint-disable-next-line no-console
    console.warn("formatBoilerplate が見つかりません。formatBoilerplate.js の中でグローバル名を確認してください。");
    return;
  }

  var formatBoilerplateLines = Lib_FormatBoilerplate.formatBoilerplateLines;

  var paragraphExtraction = root.paragraphExtraction || null;
  var makeHtml = root.makeHtml || null;

  var extractParagraphAndFigureRefs = paragraphExtraction.extractParagraphAndFigureRefs;
  var toHtml = makeHtml.toHtml;


  // -------------------------------------------------------------------------
  // FilterRegistry インスタンスの生成
  // -------------------------------------------------------------------------

  /**
   * Text 用の FilterRegistry インスタンス
   * - hooks と defaults は最低限の設定のみを行い、
   *   必要に応じて後から差し替えや上書きができるようにしておく。
   */
  var filterChains = new FilterRegistry({
    hooks: {
      /**
       * apply 実行前フック
       * @param {string} name リスト名
       * @param {string} input 入力文字列
       */
      beforeApply: function (name, input) {
        // 必要であればここにログなどの共通処理を追加する
        // 例: console.log("[beforeApply]", name, input.length);
      },

      /**
       * apply 実行後フック
       * @param {string} name リスト名
       * @param {string} output 出力文字列
       */
      afterApply: function (name, output) {
        // 必要であればここにログなどの共通処理を追加する
        // 例: console.log("[afterApply]", name, output.length);
      },

      /**
       * エラーフック
       * @param {string} name リスト名
       * @param {any} error 発生したエラー
       * @param {"hook"|"step"} stage エラーが発生した段階
       * @param {number} [stepIndex] ステップ実行中の場合のインデックス
       */
      onError: function (name, error, stage, stepIndex) {
        // 本例では単純にコンソールへ出力するのみ。
        // 実運用では、ここで監視連携やユーザー向けログ出力などを実装できる。
        // eslint-disable-next-line no-console
        console.error("[filterChains onError]", {
          name: name,
          stage: stage,
          stepIndex: stepIndex,
          error: error
        });
      }
    },

    defaults: {
      // デフォルトでは、エラー発生時にパイプラインを中断する
      stopOnError: true,
      // 並列実行は現状対応しない（将来拡張用）
      parallel: false
    }
  });

  // -------------------------------------------------------------------------
  // "normalize" パイプラインの登録
  // nl → hw → clean → rmBlank → squeeze → trim → gap → lead
  // -------------------------------------------------------------------------

  /**
   * "normalize" という名前で、特許文書向けの前処理パイプラインを登録する。
   * 実行順:
   *   1. nl      : 改行コードの正規化（CRLF/CR を LF に統一）
   *   2. hw      : 全角→半角への正規化 (NFKC + 補正)
   *   3. clean   : 制御文字・特殊文字の除去／空白置換
   *   4. rmBlank : 空行（空白のみ行を含む）の削除
   *   5. squeeze : 連続する半角スペースの圧縮
   *   6. trim    : 全体の前後空白の削除
   *   7. gap     : 行間の空行を「ちょうど 1 行」に正規化
   *   8. lead    : 先頭に改行を 1 つだけ付与
   */
  filterChains.register("normalize", [
    nl,
    hw,
    clean,
    rmBlank,
    squeeze,
    trim,
    gap,
    lead
  ]);

  filterChains.register("formatBody", [
    padHead,
    trimHead,
    tightBelowBullet, // 下の改行を詰める(箇条書き系は全角になると反応しないので、)
    fwHead,
    fwNumLaw,
    fwRefLaw,
  ]);

  filterChains.register("stripBlankLines", [
    stripBlankLinesInCorrectionNote,
    stripBlankLinesInSearchResult,
    stripBlankLinesInAppendix,
    stripBlankLinesInPriority,
    stripBlankLinesInAmendmentSuggestion,
    stripBlankLinesInAddedNewMatter
  ]);

  // stripBlankLines の全処理 + 請求項ヘッダブロック内の空行詰め（officeActionTight 用）
  filterChains.register("stripBlankLinesTight", [
    stripBlankLinesInCorrectionNote,
    stripBlankLinesInSearchResult,
    stripBlankLinesInAppendix,
    stripBlankLinesInPriority,
    stripBlankLinesInAmendmentSuggestion,
    stripBlankLinesInAddedNewMatter,
    stripBlankLinesInClaimsBlock
  ]);

  filterChains.register("formatTail", [
    formatSearchResultBlock,
    formatFamilyInfoBlock,
    formatAmendmentNoteBlock,
    formatBoilerplateLines,
  ]);

  filterChains.register("formatBoilerplate", [
    formatBoilerplateLines,
  ]);

  filterChains.register("extractParagraphRefs", [
    extractParagraphAndFigureRefs,
  ]);

  filterChains.register("toHtml", [
    toHtml,
  ]);

  // -------------------------------------------------------------------------
  // グローバル公開
  // -------------------------------------------------------------------------

  /**
   * root.filterChains という名前で公開する。
   * - 他のスクリプトから:
   *     filterChains.apply("normalize", text).then(...);
   *   のように利用できる。
   */
  root.filterChains = filterChains;

  // -----------------------------------------------------------------------
  // 複数パイプライン名を順に適用する汎用ヘルパ
  // -----------------------------------------------------------------------

  /**
   * 複数のフィルタリストを順番に適用する汎用ヘルパ関数
   *
   * - names で指定したリスト名を先頭から順に実行する。
   * - 途中でエラーが発生した場合の挙動は options.stopOnError で制御する。
   *   - true  (デフォルト): その時点で中断し、エラーをそのまま投げる。
   *   - false: onError を呼んだあと続行し、current はエラー前の値を維持。
   *
   * @param {string[]} names 実行したいフィルタリスト名の配列（例: ["normalize","exp1","exp2"]）
   * @param {string} str 入力文字列
   * @param {any[]} [invokeArgs] 各ステップに共通で渡す追加引数
   * @param {{ stopOnError?: boolean }} [options] 実行時オプション
   * @returns {Promise<string>} 最終的な変換結果文字列
   */
  root.runTextChains = function (names, str, invokeArgs, options) {
    if (!root.filterChains || typeof root.filterChains.apply !== "function") {
      return Promise.resolve(str == null ? "" : String(str));
    }

    var reg = root.filterChains;
    var listNames = Array.isArray(names) ? names.slice() : [];
    var opts = options || {};
    var stopOnError = opts.stopOnError !== false; // デフォルト true

    // 空配列なら何もせずそのまま返す
    if (listNames.length === 0) {
      return Promise.resolve(str == null ? "" : String(str));
    }

    var current = str == null ? "" : String(str);
    var chain = Promise.resolve(current);

    listNames.forEach(function (name) {
      chain = chain.then(function (prev) {
        current = prev == null ? "" : String(prev);
        return reg
          .apply(name, current, invokeArgs)
          .then(function (out) {
            return out == null ? "" : String(out);
          })
          .catch(function (err) {
            if (typeof console !== "undefined" && console.error) {
              console.error("[runTextChains] フィルタリスト実行中にエラー:", {
                name: name,
                error: err
              });
            }
            if (stopOnError) {
              throw err;
            }
            // 続行する場合は current を維持して次へ
            return current;
          });
      });
    });

    return chain;
  };
})(globalThis);