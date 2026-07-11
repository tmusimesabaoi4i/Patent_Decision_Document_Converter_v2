/**
 * test_signature.js
 * --------------------------------------------------------------------------
 * stripBlankLinesInSignature の関数単体テスト（Node.js 標準ライブラリのみ）。
 *
 * 仕様: 区切り線（ハイフンのみの行）から署名メール行
 * 「※●●●●@jpo.go.jp (…PA5J…)」までの間の空白行を削除する。
 * ただし間に「<」「＜」で始まる行が 1 行でもあれば、その区間は対象外。
 *
 * 使い方: node tools/test_signature.js   （失敗時は exit 1）
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
// formatBody.js は stripBlankLines.js の依存（isHeadingLine）のために必要
for (const src of ["js/textPrimitives.js", "js/formatBody.js", "js/stripBlankLines.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, src), "utf8"), { filename: src });
}

const fn = globalThis.stripBlankLines.stripBlankLinesInSignature;
assert.strictEqual(typeof fn, "function", "stripBlankLinesInSignature がエクスポートされていない");

const DIV = "------------------------------------";
const DIV_FW = "－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－";
const MAIL = "※●●●●@jpo.go.jp (上記「●●●●」に置き換えて、「PA5J」と入力ください。)";

let passed = 0;
function check(name, input, expected) {
  const actual = fn(input);
  try {
    assert.strictEqual(actual, expected);
    passed++;
  } catch (_e) {
    console.error(`FAIL: ${name}`);
    console.error("--- 入力 ---\n" + JSON.stringify(input));
    console.error("--- 期待 ---\n" + JSON.stringify(expected));
    console.error("--- 実際 ---\n" + JSON.stringify(actual));
    process.exit(1);
  }
}

// 基本形: 区切り線（半角）〜※行の間の空行を削除
check(
  "半角区切り線〜※行の空行削除",
  DIV + "\n　問い合わせ文\n\n　審査第四部伝送システム(PA5J)\n\n　TEL.03-3581-1101 内線3534\n\n　" + MAIL,
  DIV + "\n　問い合わせ文\n　審査第四部伝送システム(PA5J)\n　TEL.03-3581-1101 内線3534\n　" + MAIL
);

// 全角区切り線（ユーザー例示の形）も対象
check(
  "全角区切り線でも対象",
  DIV_FW + "\nAAA\n\nBBB\n\n" + MAIL,
  DIV_FW + "\nAAA\nBBB\n" + MAIL
);

// 間に < で始まる行がある場合は不変
check(
  "<行が挟まる場合は不変",
  DIV + "\nAAA\n\n<補正をする際の注意>\n\nBBB\n\n　" + MAIL,
  DIV + "\nAAA\n\n<補正をする際の注意>\n\nBBB\n\n　" + MAIL
);

// 全角＜でも同様に不変
check(
  "＜行が挟まる場合も不変",
  DIV + "\nAAA\n\n＜付記＞\n\nBBB\n\n" + MAIL,
  DIV + "\nAAA\n\n＜付記＞\n\nBBB\n\n" + MAIL
);

// 行頭空白つきの < 行も「<で始まる行」として扱う（不変）
check(
  "行頭空白つき<行でも不変",
  DIV + "\nAAA\n\n　<引用文献等一覧>\n\nBBB\n\n" + MAIL,
  DIV + "\nAAA\n\n　<引用文献等一覧>\n\nBBB\n\n" + MAIL
);

// 行の途中に < がある場合は除外条件に該当しない（削除される）
check(
  "行途中の<は除外条件にならない",
  DIV + "\n数式 a<b を含む行\n\nBBB\n\n" + MAIL,
  DIV + "\n数式 a<b を含む行\nBBB\n" + MAIL
);

// ※行が無い場合は不変
check(
  "※行が無ければ不変",
  DIV + "\nAAA\n\nBBB",
  DIV + "\nAAA\n\nBBB"
);

// 区切り線が無い場合は不変
check(
  "区切り線が無ければ不変",
  "AAA\n\nBBB\n\n" + MAIL,
  "AAA\n\nBBB\n\n" + MAIL
);

// 短いハイフン行（10文字未満）は区切り線とみなさない
check(
  "短いハイフン行は区切り線ではない",
  "-----\nAAA\n\nBBB\n\n" + MAIL,
  "-----\nAAA\n\nBBB\n\n" + MAIL
);

// 前後のテキストは不変
check(
  "対象範囲外は不変",
  "前文\n\n前文\n" + DIV + "\nAAA\n\nBBB\n\n　" + MAIL + "\n後文\n\n後文",
  "前文\n\n前文\n" + DIV + "\nAAA\nBBB\n　" + MAIL + "\n後文\n\n後文"
);

// 複数の区間があればそれぞれ独立に判定・処理
check(
  "複数区間の独立処理（片方だけ<行あり）",
  DIV + "\nAAA\n\nBBB\n\n" + MAIL + "\n中間\n" + DIV + "\nCCC\n\n<付記>\n\nDDD\n\n" + MAIL,
  DIV + "\nAAA\nBBB\n" + MAIL + "\n中間\n" + DIV + "\nCCC\n\n<付記>\n\nDDD\n\n" + MAIL
);

// 全角スペースのみの行も空行として削除
check(
  "全角スペース行も空行扱い",
  DIV + "\nAAA\n　\nBBB\n\n" + MAIL,
  DIV + "\nAAA\nBBB\n" + MAIL
);

// 空文字・null
check("空文字は空文字", "", "");
assert.strictEqual(fn(null), "", "null は空文字を返す");
passed++;

console.log(`test_signature: OK（${passed} ケース全て一致）`);
