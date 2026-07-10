/**
 * test_claimsBlock.js
 * --------------------------------------------------------------------------
 * stripBlankLinesInClaimsBlock の関数単体テスト（Node.js 標準ライブラリのみ）。
 *
 * 仕様: 「・請求項（／・引用文献等／・備考）」のヘッダ群から次の同型ヘッダ群
 * までの本文の空行を全削除し、次のヘッダ群の直前に空行をちょうど 1 行残す。
 *
 * 使い方: node tools/test_claimsBlock.js   （失敗時は exit 1）
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
for (const src of ["js/textPrimitives.js", "js/stripBlankLines.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, src), "utf8"), { filename: src });
}

const fn = globalThis.stripBlankLines.stripBlankLinesInClaimsBlock;
assert.strictEqual(typeof fn, "function", "stripBlankLinesInClaimsBlock がエクスポートされていない");

let passed = 0;
function check(name, input, expected) {
  const actual = fn(input);
  try {
    assert.strictEqual(actual, expected);
    passed++;
  } catch (_e) {
    console.error(`FAIL: ${name}`);
    console.error("--- 入力 ---");
    console.error(JSON.stringify(input));
    console.error("--- 期待 ---");
    console.error(JSON.stringify(expected));
    console.error("--- 実際 ---");
    console.error(JSON.stringify(actual));
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// ユーザー仕様の4パターン（逐語）
// ---------------------------------------------------------------------------

// ① 請求項 + 引用文献等 + 備考
check(
  "パターン①: 3行ヘッダ群",
  "・請求項\n・引用文献等\n・備考\nXXX\n\nXXX\n\nXXX\n\n・請求項\n・引用文献等\n・備考",
  "・請求項\n・引用文献等\n・備考\nXXX\nXXX\nXXX\n\n・請求項\n・引用文献等\n・備考"
);

// ② 請求項 + 引用文献等
check(
  "パターン②: 2行ヘッダ群（引用文献等）",
  "・請求項\n・引用文献等\nXXX\n\nXXX\n\nXXX\n\n・請求項\n・引用文献等",
  "・請求項\n・引用文献等\nXXX\nXXX\nXXX\n\n・請求項\n・引用文献等"
);

// ③ 請求項 + 備考
check(
  "パターン③: 2行ヘッダ群（備考）",
  "・請求項\n・備考\nXXX\n\nXXX\n\nXXX\n\n・請求項\n・備考",
  "・請求項\n・備考\nXXX\nXXX\nXXX\n\n・請求項\n・備考"
);

// ④ 請求項のみ
check(
  "パターン④: 1行ヘッダ群",
  "・請求項\nXXX\n\nXXX\n\nXXX\n\n・請求項",
  "・請求項\nXXX\nXXX\nXXX\n\n・請求項"
);

// ---------------------------------------------------------------------------
// エッジケース
// ---------------------------------------------------------------------------

// 番号付きヘッダ（行頭一致）
check(
  "番号付きヘッダ行も対象（行頭一致）",
  "・請求項　１－３\n・引用文献等　１－２\n・備考\n本文Ａ\n\n本文Ｂ\n\n・請求項　４\n・引用文献等　３",
  "・請求項　１－３\n・引用文献等　１－２\n・備考\n本文Ａ\n本文Ｂ\n\n・請求項　４\n・引用文献等　３"
);

// 3ブロック連続 → 両方の間隙が処理される
check(
  "3ブロック連続で全間隙を処理",
  "・請求項\nAAA\n\nAAA\n\n・請求項\nBBB\n\nBBB\n\n・請求項",
  "・請求項\nAAA\nAAA\n\n・請求項\nBBB\nBBB\n\n・請求項"
);

// 閉じヘッダの無い末尾本文は不変
check(
  "最後のヘッダ群の後ろは対象外",
  "・請求項\nXXX\n\nXXX\n\n・請求項\n末尾本文\n\n末尾本文",
  "・請求項\nXXX\nXXX\n\n・請求項\n末尾本文\n\n末尾本文"
);

// ヘッダ群が隣接（本文なし）→ 不変
check(
  "本文なしの隣接ヘッダ群は不変",
  "・請求項\n・備考\n・請求項\n・備考",
  "・請求項\n・備考\n・請求項\n・備考"
);

// ヘッダ群の間が空行のみ → 不変（空行だけの本文に余計な変更をしない）
check(
  "空行のみの本文は不変",
  "・請求項\n\n\n・請求項",
  "・請求項\n\n\n・請求項"
);

// 前後に無関係のテキストがあっても対象範囲のみ処理
check(
  "対象範囲外は不変",
  "前文\n\n前文\n・請求項\nXXX\n\nXXX\n\n・請求項\n・備考\n後文\n\n後文",
  "前文\n\n前文\n・請求項\nXXX\nXXX\n\n・請求項\n・備考\n後文\n\n後文"
);

// 全角スペースのみの行も空行として削除される
check(
  "全角スペースのみの行も空行扱い",
  "・請求項\nXXX\n　\nXXX\n\n・請求項",
  "・請求項\nXXX\nXXX\n\n・請求項"
);

// ヘッダ群が1つも無い / 空入力
check("ヘッダ無しは不変", "ただの本文\n\nただの本文", "ただの本文\n\nただの本文");
check("空文字は空文字", "", "");
assert.strictEqual(fn(null), "", "null は空文字を返す");
passed++;

console.log(`test_claimsBlock: OK（${passed} ケース全て一致）`);
