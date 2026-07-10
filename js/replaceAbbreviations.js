// ファイル名: replaceAbbreviations.js
//
// 通信・3GPP 系略語を正式表記へ置換するエンジン。
// 辞書データは telecomAbbreviations.js（純データ）に分離されており、
// 本ファイルは正規化・Trie 構築・最長一致のロジックのみを持つ。
// Trie はモジュール読み込み時に一度だけ構築する。
//
// 公開グローバル: root.replaceAbbreviations
// 依存: root.telecomAbbreviations（先に読み込むこと）

(function (root) {
  "use strict";

  // ============================================================
  // 依存（telecomAbbreviations：純データ辞書）
  // ============================================================
  var telecomAbbreviations = root.telecomAbbreviations;
  if (!telecomAbbreviations) {
    // eslint-disable-next-line no-console
    console.warn("replaceAbbreviations.js: root.telecomAbbreviations が見つかりません。telecomAbbreviations.js を先に読み込んでください。");
    return;
  }

  // ============================================================
  // 柔軟な略語置換（3GPP / 無線系）
  // ============================================================

  /**
   * 柔軟なマッチングで置換を行う（-/_/大文字小文字を無視）
   *
   * 置換辞書は telecomAbbreviations.js（純データ）に分離した。
   * 正規化・Trie 構築・最長一致のエンジンはモジュール読み込み時に一度だけ実行し、
   * replaceAbbreviations() は事前構築済みの Trie を使う短いドライバとする。
   */

  // 正規化関数：空白 / ハイフン / アンダースコア除去＋小文字化
  function normalizeAbbrKey(s) {
    return String(s).replace(/[\s\-_]/g, "").toLowerCase();
  }

  // ---- ここからロジック（空白対応 + 最長一致 + boundarySensitive + conditionalShort） ----

  function createTrieNode() {
    return { next: Object.create(null), entry: null };
  }

  function isAsciiWordChar(ch) {
    return !!ch && /[A-Za-z0-9]/.test(ch);
  }

  function hasAsciiTokenBoundary(chunk, startOrig, endOrigExcl) {
    const prev = startOrig > 0 ? chunk[startOrig - 1] : "";
    const next = endOrigExcl < chunk.length ? chunk[endOrigExcl] : "";
    return !isAsciiWordChar(prev) && !isAsciiWordChar(next);
  }

  /**
   * telecomAbbreviations（純データ）から正規化キーごとのエントリ表を作り、
   * 最長一致用の Trie を構築して返す。モジュール読み込み時に一度だけ呼ぶ。
   * ※ normalize衝突を検出（重複防止）
   */
  function buildAbbreviationTrie() {
    const replaceMap = telecomAbbreviations.replaceMap;
    const conditionalShortMap = telecomAbbreviations.conditionalShortMap;
    const boundarySensitiveKeys = telecomAbbreviations.boundarySensitiveKeys;

    // 正規化後キーごとのエントリを統合（通常/条件付きを区別）
    const entryMap = Object.create(null);

    function putEntry(srcType, rawKey, value, options) {
      const nk = normalizeAbbrKey(rawKey);
      if (!nk) return;

      if (Object.prototype.hasOwnProperty.call(entryMap, nk)) {
        throw new Error(
          "[replaceAbbreviations] normalized key collision: '" +
            rawKey +
            "' (" +
            nk +
            ") conflicts with existing key from " +
            entryMap[nk].srcType
        );
      }

      entryMap[nk] = {
        key: nk,
        value: value,
        srcType: srcType, // "normal" | "conditionalShort"
        boundarySensitive: !!options.boundarySensitive,
        conditionalShort: !!options.conditionalShort,
      };
    }

    for (const key in replaceMap) {
      if (!Object.prototype.hasOwnProperty.call(replaceMap, key)) continue;
      putEntry("normal", key, replaceMap[key], {
        boundarySensitive: boundarySensitiveKeys.has(normalizeAbbrKey(key)),
        conditionalShort: false,
      });
    }

    for (const key in conditionalShortMap) {
      if (!Object.prototype.hasOwnProperty.call(conditionalShortMap, key)) continue;
      putEntry("conditionalShort", key, conditionalShortMap[key], {
        boundarySensitive: true, // 短語は境界必須
        conditionalShort: true,
      });
    }

    // Trie 構築（最長一致）
    const trieRoot = createTrieNode();
    for (const nk in entryMap) {
      if (!Object.prototype.hasOwnProperty.call(entryMap, nk)) continue;
      let node = trieRoot;
      for (let i = 0; i < nk.length; i++) {
        const ch = nk[i];
        if (!node.next[ch]) node.next[ch] = createTrieNode();
        node = node.next[ch];
      }
      node.entry = entryMap[nk];
    }

    return trieRoot;
  }

  // Trie はモジュール読み込み時に一度だけ構築する（呼び出しごとに作り直さない）
  var abbreviationTrieRoot = buildAbbreviationTrie();

  // chunk（英数字+空白+_- の連続）内で、正規化位置 i からの「適用可能な最長一致」を返す
  function findLongestApplicableMatch(chunk, norm, normToOrig, i) {
    let node = abbreviationTrieRoot;
    let best = null;

    for (let j = i; j < norm.length; j++) {
      node = node.next[norm[j]];
      if (!node) break;

      if (node.entry) {
        const end = j + 1;
        const startOrig = normToOrig[i];
        const endOrigExcl = normToOrig[end - 1] + 1;

        // 境界制御（nr, 条件付き短語など）
        if (node.entry.boundarySensitive) {
          if (!hasAsciiTokenBoundary(chunk, startOrig, endOrigExcl)) {
            continue;
          }
        }

        // 条件付き短語は、さらに「元表記スパンの中に空白/ハイフン/アンダースコアを含まない」制約を入れる
        // （例: "H O" を "HO" にしない、"R-A" を "RA" にしない）
        if (node.entry.conditionalShort) {
          const rawSpan = chunk.slice(startOrig, endOrigExcl);
          if (/[\s\-_]/.test(rawSpan)) {
            continue;
          }
        }

        best = {
          value: node.entry.value,
          end: end,
        };
      }
    }

    return best;
  }

  // 英数字/空白/_/- を含む chunk を左→右に最長一致で置換（部分置換あり）
  // ※ 部分置換時も boundarySensitive / conditionalShort で誤爆抑制
  function replaceChunkByOrder(chunk) {
    const chars = String(chunk);
    let norm = "";
    const normToOrig = []; // norm[k] -> chars index

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "-" || c === "_") {
        continue;
      }
      norm += c.toLowerCase();
      normToOrig.push(i);
    }

    if (!norm) return chunk;

    let out = "";
    let origCursor = 0;
    let i = 0;

    while (i < norm.length) {
      const m = findLongestApplicableMatch(chars, norm, normToOrig, i);

      if (!m) {
        // この正規化文字1文字だけ元のまま出す（間の区切りも保持）
        const nextOrigExcl = normToOrig[i] + 1;
        out += chars.slice(origCursor, nextOrigExcl);
        origCursor = nextOrigExcl;
        i += 1;
        continue;
      }

      const startOrig = normToOrig[i];
      const endOrigExcl = normToOrig[m.end - 1] + 1;

      // マッチ前の生文字列（区切り等を含む）を保持
      if (origCursor < startOrig) {
        out += chars.slice(origCursor, startOrig);
      }

      out += m.value;
      origCursor = endOrigExcl;
      i = m.end;
    }

    // chunk末尾の残り
    if (origCursor < chars.length) {
      out += chars.slice(origCursor);
    }

    return out;
  }

  /**
   * 柔軟なマッチングで置換を行う（-/_/大文字小文字を無視）
   * @param {string} str - 入力文字列
   * @returns {string} - 置換後の文字列
   */
  function replaceAbbreviations(str) {
    // 文字列全体から「英数字で始まる、英数字/空白/_/- の連続塊」を抽出して処理
    // 空白を含む句（例: "rrc setup request"）にも対応
    return String(str).replace(/[A-Za-z0-9][A-Za-z0-9\s_-]*/g, function (chunk) {
      return replaceChunkByOrder(chunk);
    });
  }

  // ----------------------------------------
  // グローバルへのエクスポート
  // ----------------------------------------
  root.replaceAbbreviations = {
    replaceAbbreviations: replaceAbbreviations,
  };
})(globalThis);
